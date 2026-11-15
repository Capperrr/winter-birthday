(() => {
  const shell = document.getElementById('main');
  const toggle = document.getElementById('motion-toggle');
  if (!shell || !toggle || shell.dataset.motionReady === 'true') return;
  shell.dataset.motionReady = 'true';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const dialogs = Array.from(document.querySelectorAll('dialog'));
  const notes = Array.from(document.querySelectorAll('[data-note-id]'));
  const preferenceKey = 'winter-ambient-motion-paused';
  let manuallyPaused = false;
  try { manuallyPaused = localStorage.getItem(preferenceKey) === 'true'; } catch (_) {}
  let visible = true;
  let pageHidden = false;
  let stopped = false;
  let pointerAllowed = false;
  let frame = null;
  let targetX = 0;
  let targetY = 0;
  let bounds = shell.getBoundingClientRect();
  const removers = [];

  const atmosphere = document.createElement('div');
  atmosphere.className = 'motion-atmosphere';
  atmosphere.setAttribute('aria-hidden', 'true');
  const positions = [[8,62],[92,72],[5,42],[95,35],[12,82],[87,56],[7,25],[94,87]];
  const lights = positions.map(([x,y], index) => {
    const light = document.createElement('span');
    const values = { '--light-x': x + '%', '--light-y': y + '%', '--light-size': (index % 3 === 0 ? 3 : 2) + 'px', '--light-drift': (index % 2 ? -8 : 9) + 'px', '--light-duration': (11 + index % 5) + 's', '--light-delay': (-index * 1.7) + 's' };
    Object.entries(values).forEach(([name, value]) => light.style.setProperty(name, value));
    atmosphere.appendChild(light);
    return light;
  });
  shell.appendChild(atmosphere);
  notes.forEach((note, index) => note.style.setProperty('--motion-order', String(index)));

  function listen(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    removers.push(() => target.removeEventListener(event, handler, options));
  }

  function resetPointer() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    targetX = targetY = 0;
    shell.style.setProperty('--scene-x', '0px');
    shell.style.setProperty('--scene-y', '0px');
  }

  function refreshBounds() {
    if (stopped) return;
    bounds = shell.getBoundingClientRect();
    const count = Math.max(2, Math.min(lights.length, Math.round(bounds.width * bounds.height / 120000)));
    lights.forEach((light, index) => { light.hidden = index >= count; });
  }

  function sync() {
    if (stopped) return;
    const enabled = !reduce.matches && !manuallyPaused;
    const modalOpen = dialogs.some(dialog => dialog.open);
    const paused = !visible || document.hidden || pageHidden || modalOpen;
    const scene = shell.dataset.page === 'home' ? 'home' : shell.dataset.page === 'destination' && shell.dataset.destination === 'envelope' ? 'envelope' : 'still';
    shell.dataset.motion = enabled ? 'on' : 'off';
    shell.dataset.motionPaused = String(paused);
    shell.dataset.motionScene = scene;
    shell.dataset.motionState = reduce.matches ? 'reduced' : manuallyPaused ? 'disabled' : paused ? 'paused' : 'active';
    toggle.hidden = reduce.matches;
    toggle.setAttribute('aria-pressed', String(manuallyPaused));
    toggle.setAttribute('aria-label', manuallyPaused ? '开启动态效果' : '暂停动态效果');
    toggle.title = manuallyPaused ? '开启动态效果' : '暂停动态效果';
    atmosphere.hidden = !enabled;
    dialogs.forEach(dialog => { dialog.dataset.motion = enabled ? 'on' : 'off'; });
    pointerAllowed = enabled && !paused && finePointer.matches && scene !== 'still';
    if (!pointerAllowed) resetPointer();
  }

  function onPointerMove(event) {
    if (!pointerAllowed || event.pointerType !== 'mouse') return;
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / (bounds.width || 1) - .5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / (bounds.height || 1) - .5) * 2));
    targetX = -x * 4;
    targetY = -y * 3;
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (!pointerAllowed || stopped) return;
      shell.style.setProperty('--scene-x', targetX.toFixed(2) + 'px');
      shell.style.setProperty('--scene-y', targetY.toFixed(2) + 'px');
    });
  }

  function toggleMotion() {
    manuallyPaused = !manuallyPaused;
    try { localStorage.setItem(preferenceKey, String(manuallyPaused)); } catch (_) {}
    sync();
  }

  const mutation = new MutationObserver(sync);
  mutation.observe(shell, { attributes: true, attributeFilter: ['data-page', 'data-destination', 'data-view'] });
  dialogs.forEach(dialog => mutation.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(refreshBounds) : null;
  if (resize) resize.observe(shell);
  else listen(window, 'resize', refreshBounds, { passive: true });
  const intersection = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.target === shell) visible = entry.isIntersecting; });
    sync();
  }, { threshold: .01 }) : null;
  if (intersection) intersection.observe(shell);

  function destroy() {
    if (stopped) return;
    stopped = true;
    resetPointer();
    mutation.disconnect();
    if (resize) resize.disconnect();
    if (intersection) intersection.disconnect();
    removers.forEach(remove => remove());
    atmosphere.remove();
    toggle.hidden = true;
    shell.dataset.motion = 'off';
    delete shell.dataset.motionReady;
  }

  listen(toggle, 'click', toggleMotion);
  listen(shell, 'pointermove', onPointerMove, { passive: true });
  listen(shell, 'pointerleave', resetPointer, { passive: true });
  listen(document, 'visibilitychange', sync);
  listen(reduce, 'change', sync);
  listen(finePointer, 'change', sync);
  listen(window, 'pagehide', event => {
    if (event.persisted) { pageHidden = true; sync(); }
    else destroy();
  });
  listen(window, 'pageshow', () => { pageHidden = false; refreshBounds(); sync(); });
  refreshBounds();
  sync();
})();
