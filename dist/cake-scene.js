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
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
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
    setPhase('lighting');
    lighter.disabled = true;
    later(() => {
      setPhase('lit'); lighter.hidden = true;
      status.textContent = '蜡烛点亮了。';
      later(() => { if (phase === 'lit' && !dialog.open) dialog.showModal(); }, calm() ? 0 : 380);
    }, calm() ? 0 : 760);
  }
  function stopResources() {
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
  }
  function activate(value) {
    if (disposed || Boolean(value) === active) return;
    active = Boolean(value);
    reset();
    if (active) resize?.observe(page);
    else resize?.disconnect();
  }
  function visibilityChange() {
    if (document.hidden) cancelFrame();
    else if (active && phase === 'fireworks' && frame === null) { lastFrame = 0; frame = requestAnimationFrame(draw); }
  }
  function reducedChange() {
    page.dataset.reduced = String(calm());
    if (active && phase === 'fireworks' && calm()) staticFinish();
  }
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
    if (!active || !['fireworks','finished'].includes(phase)) return;
    if (!fitCanvas()) { staticFinish(); return; }
    if (phase === 'finished') stillFestival();
  }) : null;
  listen(lighter, 'click', lightCake);
  listen(confirm, 'click', confirmBlow);
  listen(dialog, 'cancel', event => { event.preventDefault(); confirmBlow(); });
  listen(next, 'click', () => { if (active && ready) document.dispatchEvent(new CustomEvent('winter:celebration-complete')); });
  listen(document, 'winter:celebration-route', event => activate(Boolean(event.detail?.active)));
  listen(document, 'visibilitychange', visibilityChange);
  listen(reduce, 'change', reducedChange);
  const motionObserver = typeof MutationObserver === 'function' ? new MutationObserver(reducedChange) : null;
  motionObserver?.observe(shell, { attributes: true, attributeFilter: ['data-motion'] });
  listen(window, 'pagehide', event => {
    if (event.persisted) { cancelFrame(); return; }
    active = false; stopResources(); disposed = true;
    resize?.disconnect(); motionObserver?.disconnect(); removers.forEach(remove => remove());
  });
  listen(window, 'pageshow', visibilityChange);
  if (shell?.dataset.destination === 'cake') activate(true);
})();
