(() => {
  const page = document.getElementById('cake-page');
  const shell = document.getElementById('main');
  if (!page || page.dataset.cakeReady === 'true') return;
  page.dataset.cakeReady = 'true';
  const lighter = document.getElementById('grand-lighter');
  const dialog = document.getElementById('grand-blow-dialog');
  const confirm = document.getElementById('grand-blow-confirm');
  const next = document.getElementById('cake-continue');
  const status = document.getElementById('cake-scene-status');
  const lines = Array.from(document.querySelectorAll('#cake-thanks-lines > p'));
  const canvas = document.getElementById('cake-fireworks');
  const scenePlane = document.getElementById('cake-art-slot');
  const candleTarget = document.getElementById('candle-ignition-target');
  const flameAnchor = document.getElementById('lighter-flame-anchor');
  const instruction = document.getElementById('lighter-instruction-copy');
  const instructionBox = document.getElementById('lighter-instructions');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const portraitQuery = window.matchMedia('(max-width:760px), (max-aspect-ratio:4/5)');
  const palette = ['#e9d6a5', '#dce8dc', '#b7d1b5', '#a8cdd2', '#d3af7d'];
  const timers = new Set();
  const removers = [];
  let active = false;
  let ready = false;
  let phase = 'unlit';
  let frame = null;
  let lastFrame = 0;
  let elapsed = 0;
  let nextRocket = .65;
  let width = 1;
  let height = 1;
  let ctx = null;
  let particles = [];
  let rockets = [];
  let disposed = false;
  let geometry = null;
  let grip = null;
  let dragFrame = null;
  let heatTimer = null;
  let pointerClick = false;

  // The same map sizes the photograph, wicks, touch target and tool landing.
  function layoutScene() {
    if (!active) return;
    const rect = page.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const tall = portraitQuery.matches;
    const map = tall
      ? { width: 1024, height: 1536, lighter: [750, 1365], target: [400, 525, 226, 88] }
      : { width: 1536, height: 1024, lighter: [1075, 840], target: [650, 157, 236, 80] };
    const contain = !tall && rect.width / rect.height > 1.92;
    const scale = (contain ? Math.min : Math.max)(rect.width / map.width, rect.height / map.height);
    const x = (rect.width - map.width * scale) / 2;
    const y = (rect.height - map.height * scale) * (tall ? .5 : contain ? 0 : .14);
    scenePlane.style.width = map.width * scale + 'px';
    scenePlane.style.height = map.height * scale + 'px';
    scenePlane.style.left = x + 'px';
    scenePlane.style.top = y + 'px';
    const landingX = Math.max(tall ? 44 : 56, Math.min(rect.width - (tall ? 44 : 56), x + map.lighter[0] * scale));
    lighter.style.left = (landingX - x) / (map.width * scale) * 100 + '%';
    lighter.style.top = map.lighter[1] / map.height * 100 + '%';
    if (tall) {
      instructionBox.style.left = instructionBox.style.top = instructionBox.style.width = '';
    } else {
      const labelWidth = Math.min(220, rect.width * .23);
      const right = landingX + 65;
      instructionBox.style.left = (right + labelWidth < rect.width - 18 ? right : landingX - labelWidth - 65) + 'px';
      instructionBox.style.top = y + map.lighter[1] * scale - 72 + 'px';
      instructionBox.style.width = labelWidth + 'px';
    }
    const [tx, ty, tw, th] = map.target;
    const target = { left: rect.left + x + tx * scale, top: rect.top + y + ty * scale, width: tw * scale, height: Math.max(44, th * scale) };
    candleTarget.style.left = target.left - rect.left + 'px';
    candleTarget.style.top = target.top - rect.top + 'px';
    candleTarget.style.width = target.width + 'px';
    candleTarget.style.height = target.height + 'px';
    shell.dataset.sceneFit = contain ? 'contain' : 'cover';
    geometry = { rect, target };
  }

  function clearHeat() {
    if (heatTimer !== null) { clearTimeout(heatTimer); timers.delete(heatTimer); }
    heatTimer = null;
    page.dataset.nearCandles = 'false';
  }
  function releaseGrip() {
    const previous = grip;
    grip = null;
    if (dragFrame !== null) cancelAnimationFrame(dragFrame);
    dragFrame = null;
    try { if (previous && lighter.hasPointerCapture?.(previous.id)) lighter.releasePointerCapture(previous.id); } catch (_) {}
  }
  function putBack(animate = true) {
    clearHeat(); releaseGrip();
    page.dataset.lighter = animate && !calm() ? 'returning' : 'resting';
    lighter.style.setProperty('--lighter-dx', '0px');
    lighter.style.setProperty('--lighter-dy', '0px');
    lighter.setAttribute('aria-pressed', 'false');
    candleTarget.disabled = true; candleTarget.tabIndex = -1;
    instruction.textContent = '轻点打火机直接点亮，也可以拖向蜡烛';
  }
  function nearCandles(x, y, padding = 8) {
    const t = geometry?.target;
    return Boolean(t && x >= t.left - padding && x <= t.left + t.width + padding && y >= t.top - padding && y <= t.top + t.height + padding);
  }
  function paintGrip() {
    dragFrame = null;
    if (!grip || !active || phase !== 'unlit') return;
    const g = grip;
    const rect = geometry.rect;
    const dx = Math.max(rect.left + 4 - g.box.left, Math.min(rect.left + rect.width - 4 - (g.box.left + g.box.width), g.lastX - g.startX));
    const dy = Math.max(rect.top + 76 - g.box.top, Math.min(rect.top + rect.height - 8 - (g.box.top + g.box.height), g.lastY - g.startY));
    lighter.style.setProperty('--lighter-dx', dx + 'px');
    lighter.style.setProperty('--lighter-dy', dy + 'px');
    g.near = nearCandles(g.flameX + dx, g.flameY + dy, g.type === 'touch' ? 12 : 8);
    page.dataset.nearCandles = String(g.near);
    if (g.near && heatTimer === null) heatTimer = later(() => { heatTimer = null; if (grip?.near) lightCake(); }, 180);
    else if (!g.near) clearHeat();
  }
  function pickUp(event) {
    if (!active || phase !== 'unlit' || document.hidden || grip || event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
    event.preventDefault(); pointerClick = true;
    layoutScene();
    const box = lighter.getBoundingClientRect();
    const flame = flameAnchor.getBoundingClientRect();
    const wasHeld = page.dataset.lighter === 'held';
    grip = { id: event.pointerId, type: event.pointerType, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, box, flameX: flame.left + flame.width / 2, flameY: flame.top + flame.height / 2, moved: false, near: false, wasHeld };
    page.dataset.lighter = 'dragging';
    lighter.setAttribute('aria-pressed', 'true');
    candleTarget.disabled = false; candleTarget.tabIndex = 0;
    instruction.textContent = '正在移动火焰，靠近蜡烛就会点亮';
    try { lighter.setPointerCapture?.(event.pointerId); } catch (_) {}
  }
  function moveTool(event) {
    if (!grip || event.pointerId !== grip.id || !active || phase !== 'unlit') return;
    grip.lastX = event.clientX; grip.lastY = event.clientY;
    if (Math.hypot(event.clientX - grip.startX, event.clientY - grip.startY) > 8) grip.moved = true;
    if (event.cancelable) event.preventDefault();
    if (dragFrame === null) dragFrame = requestAnimationFrame(paintGrip);
  }
  function dropTool(event) {
    if (!grip || event.pointerId !== grip.id) return;
    grip.lastX = event.clientX ?? grip.lastX; grip.lastY = event.clientY ?? grip.lastY;
    if (Math.hypot(grip.lastX - grip.startX, grip.lastY - grip.startY) > 8) grip.moved = true;
    if (dragFrame !== null) cancelAnimationFrame(dragFrame);
    paintGrip();
    if (grip?.near) { lightCake(); return; }
    if (grip && !grip.moved) {
      // One-tap fallback for iPads and phones; dragging remains fully supported.
      lightCake();
    } else putBack();
  }

  function listen(target, name, handler, options) {
    target.addEventListener(name, handler, options);
    removers.push(() => target.removeEventListener(name, handler, options));
  }
  function later(callback, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      if (active && !disposed) callback();
    }, ms);
    timers.add(id);
    return id;
  }
  function setPhase(value) { phase = value; page.dataset.cakeState = value; }
  function calm() { return reduce.matches || shell?.dataset.motion === 'off'; }
  function cancelFrame() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastFrame = 0;
  }
  function fitCanvas() {
    if (!active) return false;
    const rect = page.getBoundingClientRect();
    const oldWidth = width;
    const oldHeight = height;
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, width < 600 ? 1.25 : 1.7);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    try { ctx = canvas.getContext('2d'); } catch (_) { ctx = null; }
    if (!ctx) return false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (phase === 'fireworks' && oldWidth > 1 && oldHeight > 1) {
      particles.forEach(p => { p.x *= width / oldWidth; p.y *= height / oldHeight; });
      rockets.forEach(p => { p.x *= width / oldWidth; p.y *= height / oldHeight; p.tx *= width / oldWidth; p.ty *= height / oldHeight; p.sx *= width / oldWidth; p.sy *= height / oldHeight; });
    }
    return true;
  }
  function showContinue() {
    if (!active) return;
    ready = true;
    next.hidden = false;
    status.textContent = '祝福已经化作花火。你可以继续，看看我们的故事。';
  }
  function stillFestival() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    [[.2,.31,60],[.78,.24,85],[.6,.62,47]].forEach(([x,y,r], index) => {
      for (let i=0; i<30; i++) {
        const angle = i / 30 * Math.PI * 2;
        const radius = r * Math.min(1, width / 700);
        ctx.beginPath();
        ctx.strokeStyle = palette[index];
        ctx.globalAlpha = .23;
        ctx.lineWidth = .8;
        ctx.moveTo(x * width + Math.cos(angle) * radius * .65, y * height + Math.sin(angle) * radius * .65);
        ctx.lineTo(x * width + Math.cos(angle) * radius, y * height + Math.sin(angle) * radius);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }
  function staticFinish() {
    cancelFrame();
    setPhase('finished');
    page.dataset.reduced = 'true';
    if (fitCanvas()) stillFestival();
    showContinue();
  }
  function burst(x, y, color) {
    const count = width < 600 ? 56 : 82;
    for (let i=0; i<count; i++) {
      const angle = i / count * Math.PI * 2 + Math.random() * .04;
      const speed = 45 + Math.random() * Math.min(170, width * .22);
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, life: 1.2 + Math.random() * 1.6, radius: .85 + Math.random() * 1.25, color, letter: false });
    }
    if (particles.length > 1600) particles.splice(0, particles.length - 1600);
  }
  function sampleWords() {
    const mask = document.createElement('canvas');
    mask.width = Math.round(width); mask.height = Math.round(height);
    const ink = mask.getContext('2d', { willReadFrequently: true });
    if (!ink) return false;
    const pageRect = page.getBoundingClientRect();
    ink.fillStyle = '#fff'; ink.textAlign = 'center'; ink.textBaseline = 'middle';
    lines.forEach(line => {
      const style = getComputedStyle(line);
      const rect = line.getBoundingClientRect();
      const size = parseFloat(style.fontSize) || 25;
      const lineHeight = parseFloat(style.lineHeight) || size * 1.3;
      ink.font = style.font || size + 'px Georgia';
      const words = line.textContent.trim().split(/\s+/);
      const wrapped = [];
      let row = '';
      words.forEach(word => {
        const candidate = row ? row + ' ' + word : word;
        if (row && ink.measureText(candidate).width > rect.width - 4) { wrapped.push(row); row = word; }
        else row = candidate;
      });
      if (row) wrapped.push(row);
      wrapped.forEach((text, index) => ink.fillText(text, rect.left - pageRect.left + rect.width / 2, rect.top - pageRect.top + lineHeight * (index + .5)));
    });
    const image = ink.getImageData(0, 0, mask.width, mask.height);
    const points = [];
    const step = width < 600 ? 4 : 5;
    for (let y=0; y<image.height; y+=step) for (let x=0; x<image.width; x+=step) {
      if (image.data[(y * image.width + x) * 4 + 3] > 100) points.push({ x, y });
    }
    if (!points.length) return false;
    const stride = Math.max(1, Math.ceil(points.length / 1050));
    points.forEach((point, index) => {
      if (index % stride) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = 22 + Math.random() * 115;
      particles.push({ x: point.x, y: point.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 20, age: 0, life: 1.8 + Math.random() * 1.5, radius: 1.25, color: '#e3e5cf', letter: true });
    });
    mask.width = mask.height = 1;
    return true;
  }
  function draw(now) {
    frame = null;
    if (!active || phase !== 'fireworks' || document.hidden) { lastFrame = 0; return; }
    if (calm()) { staticFinish(); return; }
    const dt = lastFrame ? Math.min(.04, Math.max(0, (now - lastFrame) / 1000)) : 0;
    lastFrame = now;
    elapsed += dt;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    if (elapsed >= nextRocket && elapsed < 10.5) {
      const x = width * (.15 + Math.random() * .7);
      rockets.push({ x, y: height + 10, sx: x, sy: height + 10, tx: width * (.16 + Math.random() * .68), ty: height * (.14 + Math.random() * .42), age: 0, life: .8 + Math.random() * .45, color: palette[Math.floor(Math.random() * palette.length)] });
      nextRocket = elapsed + .6 + Math.random() * .32;
    }
    rockets = rockets.filter(rocket => {
      rocket.age += dt;
      const p = Math.min(1, rocket.age / rocket.life);
      const oldX = rocket.x, oldY = rocket.y;
      const t = 1 - (1 - p) * (1 - p);
      rocket.x = rocket.sx + (rocket.tx - rocket.sx) * t;
      rocket.y = rocket.sy + (rocket.ty - rocket.sy) * t;
      ctx.globalAlpha = .8; ctx.strokeStyle = rocket.color; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(oldX, oldY + 10); ctx.lineTo(rocket.x, rocket.y); ctx.stroke();
      if (p >= 1) { burst(rocket.x, rocket.y, rocket.color); return false; }
      return true;
    });
    particles = particles.filter(p => {
      p.age += dt;
      if (p.age >= p.life) return false;
      const oldX = p.x, oldY = p.y;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= Math.pow(.985, dt * 60); p.vy = p.vy * Math.pow(.99, dt * 60) + 22 * dt;
      ctx.globalAlpha = Math.pow(1 - p.age / p.life, .85) * (p.letter ? .98 : 1);
      ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
      if (!p.letter) { ctx.lineWidth = .75; ctx.beginPath(); ctx.moveTo(oldX - p.vx * .025, oldY - p.vy * .025); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      return true;
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (elapsed >= 2.5 && !ready) showContinue();
    if (elapsed >= 13) { setPhase('finished'); cancelFrame(); stillFestival(); showContinue(); return; }
    frame = requestAnimationFrame(draw);
  }
  function startFireworks() {
    if (!active || phase !== 'thanks') return;
    if (calm()) { staticFinish(); return; }
    try {
      if (!fitCanvas() || !sampleWords()) { staticFinish(); return; }
    } catch (_) { staticFinish(); return; }
    page.dataset.reduced = 'false';
    setPhase('fireworks');
    elapsed = 0; nextRocket = .65; lastFrame = 0;
    if (!document.hidden) frame = requestAnimationFrame(draw);
  }
  function extinguish() {
    if (!active || phase !== 'waiting') return;
    setPhase('thanks');
    status.textContent = '蜡烛熄灭了。这些话，想认真地说给你听。';
    later(startFireworks, 10000);
  }
  function confirmBlow() {
    if (!active || phase !== 'lit') return;
    if (dialog.open) dialog.close();
    setPhase('waiting');
    status.textContent = '轻轻吹一下，1.5 秒后，愿望会被收好。';
    later(extinguish, 1500);
  }
  function lightCake() {
    if (!active || phase !== 'unlit') return;
    clearHeat(); releaseGrip();
    page.dataset.lighter = 'igniting';
    candleTarget.disabled = true; candleTarget.tabIndex = -1;
    setPhase('lighting');
    lighter.disabled = true;
    later(() => {
      setPhase('lit'); lighter.hidden = true;
      status.textContent = '蜡烛点亮了。';
      later(() => { if (phase === 'lit' && !dialog.open) dialog.showModal(); }, calm() ? 0 : 380);
    }, calm() ? 0 : 760);
  }
  function stopResources() {
    putBack(false);
    timers.forEach(id => clearTimeout(id)); timers.clear();
    cancelFrame(); particles = []; rockets = [];
    if (dialog.open) dialog.close();
    if (ctx) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.clearRect(0, 0, width, height); }
    canvas.width = canvas.height = 1;
    ctx = null;
  }
  function reset() {
    stopResources(); ready = false;
    next.hidden = true; lighter.hidden = false; lighter.disabled = false;
    status.textContent = '';
    page.dataset.reduced = String(calm());
    setPhase('unlit'); elapsed = 0;
    pointerClick = false;
  }
  function activate(value) {
    if (disposed || Boolean(value) === active) return;
    active = Boolean(value);
    reset();
    if (active) { layoutScene(); resize?.observe(page); }
    else resize?.disconnect();
  }
  function visibilityChange() {
    if (document.hidden) { cancelFrame(); if (phase === 'unlit') putBack(false); }
    else if (active && phase === 'fireworks' && frame === null) { lastFrame = 0; frame = requestAnimationFrame(draw); }
  }
  function reducedChange() {
    page.dataset.reduced = String(calm());
    if (active && phase === 'fireworks' && calm()) staticFinish();
  }
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
    if (!active) return;
    if (grip || page.dataset.lighter === 'held') putBack(false);
    layoutScene();
    if (!['fireworks','finished'].includes(phase)) return;
    if (!fitCanvas()) { staticFinish(); return; }
    if (phase === 'finished') stillFestival();
  }) : null;
  listen(lighter, 'pointerdown', pickUp);
  listen(window, 'pointermove', moveTool, { passive: false });
  listen(window, 'pointerup', dropTool);
  listen(lighter, 'pointercancel', () => { if (grip) putBack(); });
  listen(lighter, 'touchmove', event => { if (grip && event.cancelable) event.preventDefault(); }, { passive: false });
  listen(window, 'pointercancel', event => { if (grip && event.pointerId === grip.id) putBack(); });
  listen(lighter, 'lostpointercapture', () => { if (grip) putBack(); });
  listen(window, 'keydown', event => { if (event.key === 'Escape' && phase === 'unlit' && active) putBack(); });
  listen(lighter, 'click', event => {
    // Clicking, Enter/Space and older browsers all have a direct ignition path.
    if (event.detail === 0 || typeof window.PointerEvent !== 'function') { lightCake(); return; }
    if (pointerClick) { pointerClick = false; return; }
    if (phase === 'unlit') lightCake();
  });
  listen(candleTarget, 'click', () => { if (['held','dragging'].includes(page.dataset.lighter)) lightCake(); });
  listen(portraitQuery, 'change', () => { if (active) { putBack(false); layoutScene(); } });
  if (!resize) listen(window, 'resize', () => { if (active) { putBack(false); layoutScene(); } });
  listen(confirm, 'click', confirmBlow);
  listen(dialog, 'cancel', event => { event.preventDefault(); confirmBlow(); });
  listen(next, 'click', () => { if (active && ready) document.dispatchEvent(new CustomEvent('winter:celebration-complete')); });
  listen(document, 'winter:celebration-route', event => activate(Boolean(event.detail?.active)));
  listen(document, 'visibilitychange', visibilityChange);
  listen(reduce, 'change', reducedChange);
  const motionObserver = typeof MutationObserver === 'function' ? new MutationObserver(reducedChange) : null;
  motionObserver?.observe(shell, { attributes: true, attributeFilter: ['data-motion'] });
  listen(window, 'pagehide', event => {
    if (event.persisted) { cancelFrame(); if (phase === 'unlit') putBack(false); return; }
    active = false; stopResources(); disposed = true;
    resize?.disconnect(); motionObserver?.disconnect(); removers.forEach(remove => remove());
  });
  listen(window, 'pageshow', () => { if (active) layoutScene(); visibilityChange(); });
  if (shell?.dataset.destination === 'cake') activate(true);
})();
