(() => {
  'use strict';

  const shell = document.getElementById('main');
  const chapter = document.getElementById('journey-page');
  const journey = document.querySelector('.journey-frame');
  const portraits = document.querySelector('.winter-about-stage');
  const cosmos = document.getElementById('winter-cosmos-dialog');
  const memories = document.getElementById('cosmos-photo-wall');
  const lightbox = document.getElementById('cosmos-photo-lightbox');
  if (!shell || !chapter || !journey || !cosmos || !memories) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 640px)');
  const perspective = 1200;
  const supportsDepth = CSS.supports('transform-style', 'preserve-3d');
  const controllers = new Map();
  const journeyShots = [
    {key:'dazhou',      aspect:4/3,       pose:[-5, 1, 5]},
    {key:'school',      aspect:1200/820,  pose:[ 3,-2,10]},
    {key:'chongqing',   aspect:1800/1013, pose:[-4, 0,12]},
    {key:'southampton', aspect:3/2,       pose:[ 6,-1, 8]},
    {key:'together',    aspect:1200/820,  pose:[-3, 2,11]}
  ];
  let active = '';
  let scrollModule;
  let storyTrack;
  let storyProgress = 0;

  function enabled() {
    return supportsDepth && !reduced.matches && shell.dataset.motion !== 'off' &&
      !navigator.connection?.saveData && (navigator.deviceMemory || 8) > 2;
  }

  function mode() {
    return compact.matches || (navigator.hardwareConcurrency || 8) <= 4 ? 'quiet' : 'full';
  }

  function element(tag, className, parent) {
    const result = document.createElement(tag);
    result.className = className;
    parent.append(result);
    return result;
  }

  function plate(parent, role, z, movement, src) {
    const layer = element('div', 'depth-plane', parent);
    layer.dataset.depthRole = role;
    layer.style.setProperty('--plane-z', z + 'px');
    layer.style.setProperty('--plane-pan', movement);
    layer.style.setProperty('--plane-fit', ((perspective - z) / perspective).toFixed(5));
    if (!src) return {layer, ready:Promise.resolve()};
    const img = element('img', 'depth-texture', layer);
    img.alt = '';
    img.decoding = 'async';
    img.src = src;
    return {layer, ready:img.decode()};
  }

  function loadJourneyPhoto({key,aspect}) {
    const photo = journey.querySelector('[data-photo-key="' + key + '"]');
    if (!photo || photo.dataset.depthReady) return;
    photo.dataset.depthReady = 'loading';
    const stage = element('div','depth-stage journey-depth-stage',photo);
    stage.setAttribute('aria-hidden','true');
    stage.style.setProperty('--journey-aspect',aspect);
    const world = element('div','depth-world',stage);
    const asset = 'assets/scenes/journey-' + key;
    const far = plate(world,'background',-92,.24,asset+'-far.webp');
    const near = plate(world,'foreground',79,.71,asset+'-near.webp');
    Promise.all([far.ready,near.ready]).then(() => {
      photo.dataset.depthReady = 'true';
    }).catch(() => {
      stage.remove();
      photo.dataset.depthReady = 'failed';
    });
  }

  function camera(surface, host, {drag = false, amplitude = 1, suppressClick = false} = {}) {
    let pose = [0,0,0];
    let point = [0,0];
    let path = [0,0,0];
    let step = 0;
    let previous = 0;
    let grab = null;
    let clickUntil = 0;

    function draw(now) {
      step = 0;
      if (host.dataset.depthMode === 'off' || host.dataset.depthMode === 'locked' || document.hidden) return;
      const fraction = 1 - Math.exp(-Math.min(45,now - (previous || now - 16)) / 132);
      previous = now;
      const budget = host.dataset.depthMode === 'quiet' ? .64 : 1;
      const goal = [
        (point[0] * amplitude + path[0]) * budget,
        (point[1] * amplitude + path[1]) * budget,
        path[2] * budget
      ];
      let moved = false;
      pose = pose.map((value,index) => {
        const delta = goal[index] - value;
        if (Math.abs(delta) <= .035) return goal[index];
        moved = true;
        return value + delta * fraction;
      });
      host.style.setProperty('--depth-camera-x',pose[0].toFixed(3) + 'px');
      host.style.setProperty('--depth-camera-y',pose[1].toFixed(3) + 'px');
      host.style.setProperty('--depth-camera-z',pose[2].toFixed(3) + 'px');
      host.style.setProperty('--depth-camera-yaw',(pose[0] * .038).toFixed(3) + 'deg');
      if (moved) step = requestAnimationFrame(draw);
    }

    function wake() {
      if (!step && ['quiet','full'].includes(host.dataset.depthMode)) {
        previous = 0;
        step = requestAnimationFrame(draw);
      }
    }

    surface.addEventListener('pointermove', event => {
      if (event.pointerType === 'mouse') {
        if (surface.dataset.dragging === 'true' || surface.classList.contains('is-dragging')) return;
        const box = surface.getBoundingClientRect();
        if (!box.width || !box.height) return;
        point = [
          Math.max(-1,Math.min(1,(event.clientX-box.left)/box.width*2-1)) * -19,
          Math.max(-1,Math.min(1,(event.clientY-box.top)/box.height*2-1)) * -9
        ];
      } else if (grab && event.pointerId === grab.id) {
        const dx = event.clientX - grab.x, dy = event.clientY - grab.y;
        if (!grab.moving && Math.abs(dy) >= 10 && Math.abs(dy) > Math.abs(dx)) { grab = null; return; }
        if (!grab.moving && Math.abs(dx) >= 11) {
          grab.moving = true;
          try { surface.setPointerCapture(event.pointerId); } catch (_) {}
        }
        if (!grab.moving) return;
        point = [Math.max(-23,Math.min(23,dx*.32)),Math.max(-9,Math.min(9,dy*.18))];
      } else return;
      wake();
    }, {passive:true});

    surface.addEventListener('pointerleave', () => { if (!grab) { point = [0,0]; wake(); } }, {passive:true});
    if (drag) {
      surface.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse' || event.isPrimary === false || !['quiet','full'].includes(host.dataset.depthMode)) return;
        grab = {id:event.pointerId,x:event.clientX,y:event.clientY,moving:false};
      }, {passive:true});
      const release = event => {
        if (grab?.id !== event.pointerId) return;
        if (grab.moving) clickUntil = performance.now() + 320;
        grab = null;
        point = [0,0];
        wake();
      };
      surface.addEventListener('pointerup',release,{passive:true});
      surface.addEventListener('pointercancel',release,{passive:true});
      if (suppressClick) {
        cosmos.addEventListener('click',event => {
          if (!surface.contains(event.target) || performance.now() >= clickUntil) return;
          event.preventDefault();
          event.stopPropagation();
        },true);
      }
    }
    return {
      set(state) {
        if (host.dataset.depthMode === state) return;
        host.dataset.depthMode = state;
        if (!['quiet','full'].includes(state)) {
          cancelAnimationFrame(step);
          step = 0;
          point = [0,0];
          pose = [0,0,0];
          grab = null;
          ['x','y','z','yaw'].forEach(prop => host.style.removeProperty('--depth-camera-' + prop));
        } else wake();
      },
      track(next) { path = next; wake(); }
    };
  }

  function loadScript(path) {
    return new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = path;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }

  function followJourney() {
    if (active !== 'journey') return;
    const index = Math.max(0,Math.min(journeyShots.length-1,Number(chapter.dataset.stop)||0));
    const shot = journeyShots[index];
    const [x,y,z] = shot.pose;
    loadJourneyPhoto(shot);
    controllers.get('journey').track([x+(storyProgress-.5)*6,y,z+storyProgress*3]);
  }

  function startScrollTrack() {
    if (storyTrack || active !== 'journey') return;
    if (!scrollModule) {
      scrollModule = loadScript('assets/vendor/gsap/gsap.min.js')
        .then(() => loadScript('assets/vendor/gsap/ScrollTrigger.min.js'))
        .then(() => window.gsap.registerPlugin(window.ScrollTrigger));
    }
    scrollModule.then(() => {
      if (active !== 'journey' || storyTrack || !enabled()) return;
      storyTrack = window.ScrollTrigger.create({
        scroller:chapter, start:0, end:'max',
        onUpdate(self) { storyProgress = self.progress; followJourney(); }
      });
    }).catch(() => {
      // The native Journey still pages and scrolls if the optional camera library fails.
    });
  }

  controllers.set('journey',camera(journey,journey,{amplitude:.62}));
  controllers.set('memories',camera(memories,memories,{drag:true,amplitude:.78,suppressClick:true}));
  if (portraits) controllers.set('about',camera(portraits,portraits,{amplitude:.38}));
  memories.querySelectorAll('.photo-memory').forEach((photo,index) => {
    const z = -126 + (index%6)*39;
    photo.style.setProperty('--camera-photo-z',z + 'px');
    photo.style.setProperty('--camera-photo-fit',((perspective-z)/perspective).toFixed(5));
    photo.style.setProperty('--camera-photo-pan',(.38+(index%6)*.137).toFixed(3));
  });

  function sync() {
    const gallery = cosmos.open && document.getElementById('cosmos-gallery').classList.contains('is-active');
    const selected = gallery ? 'memories' : cosmos.open ? '' : shell.dataset.page === 'destination' ? shell.dataset.destination : shell.dataset.page;
    active = enabled() && !document.hidden ? selected : '';
    if (active !== 'journey' && storyTrack) { storyTrack.kill(); storyTrack = null; storyProgress = 0; }

    controllers.forEach((controller,key) => {
      const paused = key === 'memories' ? !lightbox?.hidden : shell.dataset.motionPaused === 'true';
      controller.set(active === key && !paused ? mode() : 'off');
    });
    if (active === 'journey') { followJourney(); startScrollTrack(); }
  }

  chapter.addEventListener('winter:journey-stop',followJourney);
  document.addEventListener('winter:cosmos-stage',sync);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
  compact.addEventListener('change',sync);
  new MutationObserver(sync).observe(shell,{
    attributes:true,attributeFilter:['data-page','data-destination','data-motion','data-motion-paused']
  });
  new MutationObserver(sync).observe(cosmos,{attributes:true,attributeFilter:['open']});
  if (lightbox) new MutationObserver(sync).observe(lightbox,{attributes:true,attributeFilter:['hidden']});
  sync();
})();
