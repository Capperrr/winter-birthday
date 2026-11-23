(() => {
  'use strict';
  const shell = document.getElementById('main');
  const morning = document.getElementById('living-morning');
  const night = document.getElementById('living-night');
  if (!shell || !morning || !night) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let light = 0;
  let frame = 0;

  function publish(value) {
    light = value;
    shell.style.setProperty('--home-night', value.toFixed(4));
  }

  function setTime(value, animate = true) {
    cancelAnimationFrame(frame);
    frame = 0;
    shell.dataset.livingTime = value;
    morning.setAttribute('aria-pressed', String(value === 'morning'));
    night.setAttribute('aria-pressed', String(value === 'night'));
    const to = value === 'night' ? 1 : 0;
    if (!animate || light === to || reduced.matches || shell.dataset.motion === 'off') {
      publish(to);
      return;
    }
    const from = light;
    const start = performance.now();
    function crossfade(now) {
      const t = reduced.matches || shell.dataset.motion === 'off' ? 1 : Math.min(1, (now - start) / 1800);
      publish(from + (to - from) * t * t * (3 - 2 * t));
      frame = t < 1 ? requestAnimationFrame(crossfade) : 0;
    }
    frame = requestAnimationFrame(crossfade);
  }
  morning.addEventListener('click', () => setTime('morning'));
  night.addEventListener('click', () => setTime('night'));
  setTime('morning', false);
})();
