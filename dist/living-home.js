(() => {
  'use strict';
  const shell = document.getElementById('main');
  const sky = shell?.querySelector('.living-stars');
  const morning = document.getElementById('living-morning');
  const night = document.getElementById('living-night');
  if (!sky || !morning || !night) return;

  // A fixed constellation in the upper sky. Only its luminosity changes.
  const points = [
    [40, 13, 1.2], [48, 18, 1.05], [52, 9, 1.8], [55, 22, 1.1],
    [59, 14, 1], [64, 29, 1.3], [67, 21, 1.6], [68, 9, 1],
    [71, 16, 1.15], [76, 11, 1.65], [79, 26, 1], [83, 19, 1.2],
    [87, 8, 1.3], [90, 24, 1.25], [93, 14, 1.7], [45, 27, 1.35]
  ];
  points.forEach(([x, y, size], index) => {
    const star = document.createElement('i');
    star.className = 'living-star';
    star.style.cssText = '--sx:' + x + '%;--sy:' + y + '%;--size:' + size +
      'px;--cycle:' + (13 + index % 5 * 4) + 's;--phase:-' + (index * 3.1 % 19).toFixed(1) + 's';
    sky.append(star);
  });

  function setTime(value) {
    shell.dataset.livingTime = value;
    morning.setAttribute('aria-pressed', String(value === 'morning'));
    night.setAttribute('aria-pressed', String(value === 'night'));
  }
  morning.addEventListener('click', () => setTime('morning'));
  night.addEventListener('click', () => setTime('night'));
  setTime('morning');
})();
