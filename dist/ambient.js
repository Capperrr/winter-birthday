(() => {
  'use strict';
  const shell = document.getElementById('main');
  const cosmos = document.getElementById('winter-cosmos-dialog');
  if (!shell || !cosmos) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 640px)');
  const visited = new Set();
  let scene = '';
  let cosmosStage = '';

  function set(element, name, value) {
    if (element.dataset[name] !== value) element.dataset[name] = value;
  }
  function sync() {
    const wanted = shell.dataset.page === 'destination'
      ? shell.dataset.destination
      : shell.dataset.page;
    const next = wanted === 'about' && shell.dataset.aboutTheme === 'paper' ? 'notes' : wanted;
    const disabled = reduced.matches || shell.dataset.motion === 'off';
    const limited = compact.matches || (navigator.hardwareConcurrency || 8) <= 4 ||
      (navigator.deviceMemory || 8) <= 4;
    const backgrounded = document.hidden;
    const paused = backgrounded || shell.dataset.motionPaused === 'true';

    if (next && next !== scene) {
      scene = next;
      set(shell, 'entrance', !disabled && !visited.has(scene) ? scene : '');
      visited.add(scene);
    }
    set(shell, 'ambient', disabled ? 'off' : paused ? 'paused' : limited ? 'limited' : 'on');

    // The modal gallery is the foreground while its original cosmos dialog is open.
    // Pause it under the lightbox, and keep the canvas sky out of the photo stage.
    const hasGallery = cosmos.open && cosmosStage === 'cosmos-gallery';
    const lightbox = document.getElementById('cosmos-photo-lightbox');
    set(cosmos, 'ambient', disabled || !hasGallery ? 'off'
      : backgrounded || !lightbox?.hidden ? 'paused' : limited ? 'limited' : 'on');

    if (disabled) {
      set(shell, 'entrance', '');
      set(cosmos, 'entrance', '');
    }
  }

  new MutationObserver(sync).observe(shell, {
    attributes:true,
    attributeFilter:['data-page','data-destination','data-about-theme','data-motion','data-motion-paused']
  });
  const lightbox = document.getElementById('cosmos-photo-lightbox');
  if (lightbox) new MutationObserver(sync).observe(lightbox,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('winter:cosmos-stage', event => {
    cosmosStage = event.detail?.stage || '';
    const gallery = cosmosStage === 'cosmos-gallery';
    set(cosmos,'entrance',gallery && !reduced.matches && shell.dataset.motion !== 'off' && !visited.has(cosmosStage)
      ? 'memories' : '');
    if (gallery) visited.add(cosmosStage);
    sync();
  });
  cosmos.addEventListener('close',sync);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
  compact.addEventListener('change',sync);

  const journey = document.getElementById('journey-page');
  const about = document.getElementById('panel-about');
  if (journey && 'IntersectionObserver' in window) {
    const reader = new IntersectionObserver(entries => {
      entries.forEach(({target,isIntersecting}) => {
        if (!isIntersecting || about.hidden) return;
        target.dataset.arrived = 'true';
        reader.unobserve(target);
      });
    }, {root:about, threshold:.18});
    journey.querySelectorAll('.journey-story-card, .journey-heading, .journey-visual').forEach(chapter => reader.observe(chapter));
  }
  sync();
})();
