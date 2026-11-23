(() => {
  'use strict';
  const shell = document.getElementById('main');
  const morning = document.getElementById('living-morning');
  const night = document.getElementById('living-night');
  if (!shell || !morning || !night) return;

  function setTime(value) {
    shell.dataset.livingTime = value;
    morning.setAttribute('aria-pressed', String(value === 'morning'));
    night.setAttribute('aria-pressed', String(value === 'night'));
  }
  morning.addEventListener('click', () => setTime('morning'));
  night.addEventListener('click', () => setTime('night'));
  setTime('morning');
})();
