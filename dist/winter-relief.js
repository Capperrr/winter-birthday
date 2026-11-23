(() => {
  'use strict';
  const shell = document.getElementById('main');
  const scroller = document.getElementById('panel-home');
  const rail = document.getElementById('relief-rail');
  const stage = document.getElementById('relief-stage');
  const viewer = document.getElementById('relief-viewer');
  if (!shell || !scroller || !rail || !stage || !viewer) return;
  const panels = [...rail.querySelectorAll('.relief-panel')];
  const prints = [...rail.querySelectorAll('.relief-print')];
  const title = document.getElementById('relief-title');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const debug = new URLSearchParams(location.search).get('debug') === 'relief';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const fallbackStatus = document.createElement('p');
  fallbackStatus.className = 'relief-fallback-status';
  fallbackStatus.setAttribute('role', 'status');
  fallbackStatus.hidden = true;
  fallbackStatus.textContent = '3D 浮雕暂时无法启动，已显示静态作品。详见 ?debug=relief';
  scroller.append(fallbackStatus);
  const diagnostics = debug ? document.createElement('pre') : null;
  if (diagnostics) {
    diagnostics.className = 'relief-diagnostics';
    diagnostics.id = 'relief-debug';
    diagnostics.setAttribute('aria-label', 'Home 浮雕运行诊断');
    scroller.append(diagnostics);
  }

  const resources = {webgl:'未启动', device:'—', model:'未请求', textures:'未请求', shaderError:'', error:''};
  const look = {x:0, y:0};
  const pointer = {x:0, y:0};
  let offsets = [];
  let scrollTop = 0;
  let progress = 0, goal = 0, night = 0, seconds = 0, last = 0, raf = 0;
  let cameraFrame = null, printBounds = null, controller = null, wall = null;
  let active = false, failure = '', reason = '';
  let fps = 0, sampleStart = 0, sampleFrames = 0, slowSamples = 0, fastSamples = 0, lastReport = 0;

  function blockedBy() {
    if (reduce.matches) return 'prefers-reduced-motion';
    if (shell.dataset.motion === 'off') return '用户暂停动效';
    if (navigator.connection?.saveData) return 'Save-Data';
    return '';
  }

  function ambient() {
    return shell.dataset.motionPaused !== 'true' && !viewer.open && !document.hidden;
  }

  function drawDiagnostics() {
    if (!diagnostics) return;
    let stored = null;
    try { stored = localStorage.getItem('winter-ambient-motion-paused'); } catch (_) {}
    const mode = rail.dataset.sculpture === 'still' ? 'static' : rail.dataset.sculpture;
    const camera = cameraFrame?.camera.map(value => value.toFixed(2)).join(', ') ?? '—';
    diagnostics.textContent = [
      'WINTER / Home relief',
      `状态 ${mode || 'static'}${reason ? ' · ' + reason : ''}`,
      `WebGL ${resources.webgl} · ${resources.device}`,
      `实测 FPS ${fps.toFixed(1)} · Scroll ${(goal * 50).toFixed(1)}%`,
      `Camera XYZ ${camera}`,
      `画布 ${cameraFrame?.resolution.join(' × ') ?? '—'} · 三角面 ${cameraFrame?.triangles ?? '—'}`,
      `reduced-motion ${reduce.matches} · data-motion ${shell.dataset.motion ?? '—'}`,
      `暂停 ${shell.dataset.motionPaused ?? '—'} · localStorage ${stored ?? '未设置'}`,
      `Save-Data ${Boolean(navigator.connection?.saveData)} · 内存 ${navigator.deviceMemory ?? '未公开'}`,
      `模型 ${resources.model}`,
      `纹理 ${resources.textures}`,
      `Shader ${resources.shaderError || '无编译错误'}`,
      resources.error ? '错误 ' + resources.error : ''
    ].filter(Boolean).join('\n');
  }

  function showStatus(state, why = '') {
    rail.dataset.sculpture = state;
    rail.dataset.sculptureReason = why;
    reason = why;
    fallbackStatus.hidden = !failure || !active || Boolean(blockedBy());
    drawDiagnostics();
  }

  function resetSample() {
    last = sampleStart = sampleFrames = slowSamples = fastSamples = fps = 0;
  }

  function report(partial) {
    Object.assign(resources, partial);
    drawDiagnostics();
  }

  function stopWall(why) {
    controller?.abort();
    controller = null;
    wall = null;
    cameraFrame = printBounds = null;
    prints.forEach(print => {
      print.removeAttribute('data-projected');
      print.removeAttribute('tabindex');
    });
    resetSample();
    if (!failure) Object.assign(resources,{webgl:'未启动',device:'—',model:'未请求',textures:'未请求'});
    showStatus('still', why);
  }

  function failWall(message) {
    failure = message;
    resources.error = message;
    stopWall('3D 启动失败');
  }

  function bootWall() {
    if (controller || failure) return;
    const run = new AbortController();
    controller = run;
    report({webgl:'正在启动', device:'—', model:'未请求', textures:'未请求', shaderError:'', error:''});
    showStatus('loading');
    import('./winter-relief-wall.js?v=herbarium-3d').then(({mountReliefWall}) => mountReliefWall(stage, {
      signal:run.signal,
      report: info => { if (!run.signal.aborted) report(info); },
      onContextLost: failWall,
      title, scroller, prints,
      onPrintBounds: (bounds, width, height) => {
        printBounds = {bounds, width, height};
        alignPrints();
      }
    })).then(next => {
      if (run.signal.aborted || !next) return;
      if (resources.shaderError) {failWall('Shader 编译失败');return;}
      wall = next;
      cameraFrame = wall.draw(progress, look, night, seconds, shell.dataset.view);
      if (resources.shaderError) {failWall('Shader 编译失败');return;}
      showStatus('live');
      document.fonts.ready.then(() => { if (!run.signal.aborted) {next.resize();wake();} });
      wake();
    }).catch(error => {
      if (run.signal.aborted) return;
      if (resources.webgl === '正在启动') resources.webgl = '不可用';
      if (resources.textures === 'loading') resources.textures = '加载中断';
      failWall(error.message);
    });
  }

  function alignPrints() {
    if (!printBounds || offsets.length !== 3) return;
    const {bounds, width, height} = printBounds;
    const chapterY = offsets[1] - scrollTop;
    bounds.forEach((box, index) => {
      const anchor = prints[index];
      const visible = box && box.right > 0 && box.left < width && box.bottom > Math.max(0, chapterY) &&
        box.top < Math.min(height, chapterY + panels[1].offsetHeight);
      anchor.dataset.projected = String(Boolean(visible));
      if (!visible) {anchor.tabIndex = -1;return;}
      anchor.removeAttribute('tabindex');
      anchor.style.setProperty('--print-left', box.left.toFixed(2) + 'px');
      anchor.style.setProperty('--print-top', (box.top - chapterY).toFixed(2) + 'px');
      anchor.style.setProperty('--print-width', (box.right - box.left).toFixed(2) + 'px');
      anchor.style.setProperty('--print-height', (box.bottom - box.top).toFixed(2) + 'px');
    });
  }

  function measure() {
    offsets = panels.map(panel => panel.offsetTop);
    scroll();
  }

  function scroll() {
    if (!active || offsets.length !== 3) return;
    scrollTop = scroller.scrollTop;
    const section = scrollTop < offsets[1] ? 0 : 1;
    goal = section + clamp((scrollTop - offsets[section]) / Math.max(1, offsets[section + 1] - offsets[section]), 0, 1);
    rail.dataset.reliefChapter = String(Math.round(goal));
    alignPrints();
    if (wall) wake();
    else drawDiagnostics();
  }

  function sample(now) {
    if (!sampleStart) sampleStart = now;
    sampleFrames++;
    const elapsed = now - sampleStart;
    if (elapsed < 1150) return;
    fps = (sampleFrames - 1) * 1000 / elapsed;
    sampleStart = now;
    sampleFrames = 1;
    slowSamples = fps < 47 ? slowSamples + 1 : 0;
    fastSamples = fps > 56 ? fastSamples + 1 : 0;
    if (slowSamples === 2) {
      wall.scaleResolution(fps < 29 ? .81 : .92);
      slowSamples = 0;
    } else if (fastSamples === 5) {
      wall.scaleResolution(1.065);
      fastSamples = 0;
    }
  }

  function paint(now) {
    raf = 0;
    if (!active || !wall || !ambient()) return;
    const delta = last ? clamp(now - last, 1, 125) : 16.67;
    last = now;
    seconds += delta * .001;
    const weight = 1 - Math.exp(-delta / 75);
    progress = Math.abs(goal - progress) < .00012 ? goal : progress + (goal - progress) * weight;
    night += ((shell.dataset.livingTime === 'night' ? 1 : 0) - night) * (1 - Math.exp(-delta / 440));
    look.x += (pointer.x - look.x) * weight;
    look.y += (pointer.y - look.y) * weight;
    cameraFrame = wall.draw(progress, look, night, seconds, shell.dataset.view);
    if (resources.shaderError) {failWall('Shader 编译失败');return;}
    if (cameraFrame) sample(now);
    if (diagnostics && now - lastReport > 260) {
      lastReport = now;
      drawDiagnostics();
    }
    wake();
  }

  function wake() {
    if (active && wall && ambient() && !raf) raf = requestAnimationFrame(paint);
  }

  function sync() {
    const open = shell.dataset.page === 'home' && !scroller.hidden;
    if (open !== active) {
      active = open;
      if (open) {
        failure = '';
        scroller.scrollTop = progress = goal = 0;
        measure();
      }
    }
    const blocked = blockedBy();
    if (!active || blocked) stopWall(active ? blocked : '已离开 Home');
    else if (!document.hidden) bootWall();
    if (!ambient() || !active) {
      cancelAnimationFrame(raf);
      raf = 0;
      resetSample();
    }
    drawDiagnostics();
    wake();
  }

  title.querySelector('.relief-lettering').decode().then(() => {
    title.dataset.raised = 'true';
    wall?.resize();
  }).catch(() => {});

  rail.addEventListener('click', event => {
    const jump = event.target.closest('[data-relief-target]');
    if (jump) {
      const chapter = document.getElementById(jump.dataset.reliefTarget);
      scroller.scrollTo({top:chapter.offsetTop, behavior:blockedBy() ? 'instant' : 'smooth'});
      const heading = chapter.querySelector('h2');
      heading.tabIndex = -1;
      heading.focus({preventScroll:true});
    }
    const route = event.target.closest('[data-relief-route]');
    if (route) document.getElementById('tab-' + route.dataset.reliefRoute)?.click();
    const print = event.target.closest('.relief-print');
    if (!print || typeof viewer.showModal !== 'function') return;
    event.preventDefault();
    const image = viewer.querySelector('img');
    image.src = print.href;
    image.alt = print.querySelector('img').alt;
    viewer.showModal();
  });
  viewer.querySelector('button').addEventListener('click', () => viewer.close());
  viewer.addEventListener('close', sync);
  scroller.addEventListener('scroll', scroll, {passive:true});
  const recenter = () => {pointer.x = pointer.y = 0;wake();};
  scroller.addEventListener('pointermove', event => {
    if (!wall || !ambient() || !event.isPrimary) return;
    const bounds = scroller.getBoundingClientRect();
    const strength = event.pointerType === 'touch' ? .38 : 1;
    pointer.x = clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1) * strength;
    pointer.y = clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1) * strength;
    wake();
  }, {passive:true});
  for (const name of ['pointerleave','pointerup','pointercancel']) {
    scroller.addEventListener(name, recenter, {passive:true});
  }
  document.getElementById('tab-home').addEventListener('click', () => scroller.scrollTo({top:0, behavior:'instant'}));
  new ResizeObserver(measure).observe(rail);
  new MutationObserver(sync).observe(shell, {attributes:true,
    attributeFilter:['data-page','data-living-time','data-motion','data-motion-paused','data-view']});
  document.addEventListener('visibilitychange', sync);
  navigator.connection?.addEventListener?.('change', sync);
  reduce.addEventListener('change', sync);
  sync();
})();
