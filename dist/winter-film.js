/* The film world is decorative. All story controls stay in their original DOM. */
(() => {
  'use strict';
  const shell = document.getElementById('main');
  const hero = document.querySelector('.home-art');
  const cosmos = document.getElementById('winter-cosmos-dialog');
  const cosmosRoot = document.getElementById('cosmos-root');
  const journey = document.getElementById('journey-page');
  const cake = document.getElementById('cake-page');
  const cakeSlot = document.getElementById('cake-art-slot');
  const archButton = document.getElementById('film-cross-arch');
  if (!shell || !hero || !cosmosRoot || !archButton) return;

  const assets = 'assets/winter-v2/';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 650px)');
  const portrait = matchMedia('(max-aspect-ratio: 4/5)');
  const tallCake = matchMedia('(max-width: 760px), (max-aspect-ratio: 4/5)');
  const perspective = 1200;

  const artwork = path => assets + path + '.webp';
  const layout = (folder, focus, weather = 'fog_far_silver') => ({
    folder, focus,
    planes: [
      ['background', folder + '/far', -185, .23],
      ['midground', folder + '/middle', 20, .56],
      ['foreground', folder + '/near', 166, 1.06],
      ['atmosphere', 'air/' + weather, 105, .72]
    ]
  });
  const home = {
    folder:'home', focus:'62% 48%',
    planes:[
      ['background','home/far',-198,.20],
      ['far-fog','air/fog_far_silver',-113,.39],
      ['midground','home/arch',-21,.49],
      ['terrace','home/terraces',63,.72],
      ['water','home/water',66,.72],
      ['cliff','home/cliff',158,1.02],
      ['foreground','home/canopy',220,1.25],
      ['atmosphere','air/fog_near_blue',124,.93],
      ['light','air/light_shafts_amber',89,.54]
    ]
  };
  const sky = layout('cosmos','61% 49%','stars_sparse');
  const scenes = {
    home,
    about:layout('about','48% 52%','fog_near_blue'),
    envelope:layout('letter','45% 59%','light_shafts_amber'),
    unlock:layout('unlock','52% 49%','fog_far_silver'),
    cake:layout('cake','54% 54%','stars_sparse'),
    letter:layout('lake','58% 48%','fog_far_silver'),
    journey:layout('journey','53% 62%','fog_near_blue'),
    afterword:layout('closing','70% 46%','fog_low_gold'),
    finale:layout('childhood','50% 58%','dust_glints'),
    universe:sky,
    gallery:layout('closing','46% 61%','fog_near_blue'),
    creator:layout('studio','49% 58%','dust_glints'),
    closing:layout('closing','64% 60%','fog_low_gold')
  };
  scenes.about.planes.push(['light','air/light_shafts_amber',94,.66]);
  scenes.envelope.planes.push(['near-fog','air/fog_near_blue',153,.91]);
  scenes.universe.planes.push(['near-fog','air/fog_near_blue',92,.71]);

  function node(tag, className, parent) {
    const item = document.createElement(tag);
    item.className = className;
    parent.append(item);
    return item;
  }

  function viewport(parent, className) {
    const element = node('div','film-viewport ' + className,parent);
    element.setAttribute('aria-hidden','true');
    parent.prepend(element);
    return element;
  }

  const ground = viewport(shell,'film-ground');
  const proscenium = viewport(hero,'film-proscenium');
  const skybox = viewport(cosmosRoot,'film-skybox');
  let active;
  let targetKey = '';
  let targetQuality = '';
  let visible = '';
  let globeStage = 'cosmos-intro';
  let mountRequest = 0;
  let cameraFrame = 0;
  let localFrameTime = 0;
  let position = [0, 0, 0];
  let pointer = [0, 0];
  let drag;
  let pass;
  let slate;
  let suspended = false;

  const motionOn = () => !reduce.matches && shell.dataset.motion !== 'off' && !document.hidden;
  const quality = () => !motionOn() || navigator.connection?.saveData || (navigator.deviceMemory || 8) <= 2
    ? 'still' : compact.matches || (navigator.hardwareConcurrency || 8) <= 4 ? 'quiet' : 'full';

  function id() {
    if (cosmos.open) {
      return ({'cosmos-gallery':'gallery','cosmos-creator':'creator','cosmos-closing':'closing'})[globeStage] || 'universe';
    }
    const page = shell.dataset.page;
    return page === 'destination' ? shell.dataset.destination || 'envelope' : page || 'home';
  }

  function image(parent, source) {
    const im = node('img','film-texture',parent);
    im.alt = '';
    im.decoding = 'async';
    im.draggable = false;
    im.src = source;
    return im;
  }

  function plate(world,[role,path,depth,pan]) {
    const plane = node('div','film-plane',world);
    plane.dataset.role = role;
    plane.style.setProperty('--plane-z',depth+'px');
    plane.style.setProperty('--plane-pan',String(pan));
    plane.style.setProperty('--plane-fit',((perspective-depth)/perspective).toFixed(5));
    return image(plane,artwork(path)).decode();
  }

  function lightSelection(key,budget,config) {
    const usePortrait = key === 'universe' && portrait.matches;
    if (budget === 'still') return [['background',config.folder + (usePortrait ? '/portrait' : '/still'),0,0]];
    if (usePortrait) {
      return [
        ['background','cosmos/portrait-far',-172,.20],
        ['midground','cosmos/portrait-middle',44,.56],
        ['foreground','cosmos/portrait-near',150,.91],
        ['atmosphere','air/stars_sparse',103,.70],
        ['near-fog','air/fog_near_blue',139,.92]
      ];
    }
    if (budget === 'quiet') return config.planes.filter(([role])=>!['light','near-fog','water'].includes(role));
    return config.planes;
  }

  function pose() {
    const drift = active?.key === 'journey' ? Math.min(1,journey.scrollTop/Math.max(1,journey.scrollHeight-journey.clientHeight)) : 0;
    // The same small optical push is shared by the scene cuts and scroll rail.
    return [pointer[0]*(active?.budget === 'quiet' ? .7 : 1) - drift*17,
      pointer[1] + drift*5, active?.key === 'home' ? 17 : 9 + drift*35];
  }

  function render(now) {
    cameraFrame = 0;
    if (!active || suspended || active.budget === 'still' || document.hidden || pass) return;
    const fraction = 1 - Math.exp(-Math.min(42,now-(localFrameTime||now-16))/153);
    localFrameTime = now;
    const goal = pose();
    let needsFrame = false;
    position = position.map((value,index) => {
      const difference = goal[index]-value;
      if (Math.abs(difference)<.045) return goal[index];
      needsFrame = true;
      return value+difference*fraction;
    });
    ['x','y','z'].forEach((axis,index) => active.frame.style.setProperty('--camera-' + axis,position[index].toFixed(2)+'px'));
    if (needsFrame) cameraFrame = requestAnimationFrame(render);
  }

  function wake() {
    if (!cameraFrame && active?.budget !== 'still' && !suspended && !pass) {
      localFrameTime = 0;
      cameraFrame = requestAnimationFrame(render);
    }
  }

  function retire(previous) {
    if (!previous) return;
    previous.dataset.exposure = 'out';
    setTimeout(()=>previous.remove(),850);
  }

  async function setShot(key,budget) {
    const variant = key === 'universe' && portrait.matches ? '-portrait' : '';
    const qualityKey = budget + variant;
    if (targetKey === key && targetQuality === qualityKey) return;
    targetKey = key;
    targetQuality = qualityKey;
    const request = ++mountRequest;
    const config = scenes[key];
    if (!config) return;

    const parent = key === 'home' ? proscenium : cosmos.open ? skybox : ground;
    parent.querySelectorAll('.film-shot[data-exposure="loading"]').forEach(frame=>frame.remove());
    const frame = node('div','film-shot',parent);
    frame.dataset.shot = key;
    frame.dataset.exposure = 'loading';
    frame.dataset.quality = budget;
    frame.style.setProperty('--photo-focus',config.focus);
    const world = node('div','film-planes',frame);
    try {
      await Promise.all(lightSelection(key,budget,config).map(entry=>plate(world,entry)));
    } catch (_) {
      if (request !== mountRequest) {frame.remove();return;}
      world.replaceChildren();
      try {
        await plate(world,['background',config.folder + (variant ? '/portrait' : '/still'),0,0]);
        frame.dataset.quality = 'still';
      } catch (_) {
        frame.remove();
        return;
      }
    }
    if (request !== mountRequest) {frame.remove();return;}
    const previous = active?.frame;
    position = [0, 0, key === 'home' ? -36 : -24];
    pointer = [0,0];
    frame.style.setProperty('--camera-z', position[2]+'px');
    active = {frame,key,budget:frame.dataset.quality};
    frame.dataset.exposure = 'in';
    shell.dataset.filmReady = key;
    cosmosRoot.dataset.filmReady = key;
    retire(previous);
    updateFreeze();
  }

  function updateFreeze() {
    const wasSuspended = suspended;
    const isReader = cosmos.open;
    const lightbox = document.getElementById('cosmos-photo-lightbox');
    const camera = targetKey === 'cake' && (
      shell.dataset.cakeCamera === 'on' || cake.dataset.filmCameraPending === 'true'
    );
    suspended = camera || document.hidden || !motionOn() ||
      (isReader ? !lightbox.hidden || document.getElementById('winter-art-export')?.open : shell.dataset.motionPaused === 'true');
    shell.dataset.filmPaused = String(suspended);
    cosmosRoot.dataset.filmPaused = String(suspended);
    if (suspended) {
      cancelAnimationFrame(cameraFrame);
      cameraFrame = 0;
    } else {
      if (wasSuspended) pointer = [0,0];
      wake();
    }
  }

  function assembleCake() {
    const variant = tallCake.matches ? 'portrait' : 'wide';
    if (slate?.dataset.aspect === variant) return;
    const slot = node('div','film-cake-assembly',cakeSlot);
    slot.dataset.aspect = variant;
    slot.setAttribute('aria-hidden','true');
    const rock = image(slot,artwork('cake/slab-' + variant));
    rock.classList.add('film-stone');
    const dessert = image(slot,'assets/birthday-render/cake-' + variant + '.webp');
    dessert.classList.add('film-pastry');
    slate?.remove();
    slate = slot;
    Promise.all([rock.decode(),dessert.decode()]).then(()=>{slot.dataset.exposure='in';}).catch(()=>slot.remove());
  }

  function sync() {
    const key = id();
    if (pass && !motionOn()) endPass();
    if (key !== visible) {
      if (visible === 'home') endPass();
      visible = key;
      shell.dataset.filmScene = key;
      cosmosRoot.dataset.filmScene = key;
    }
    if (key === 'cake') assembleCake();
    setShot(key,quality());
    updateFreeze();
  }

  function pointerMove(event) {
    if (!active || suspended || active.budget === 'still' || pass) return;
    if (event.pointerType === 'mouse') {
      if (event.target.closest('input, textarea, .is-dragging, dialog[open] canvas')) return;
      pointer = [(event.clientX/innerWidth-.5)*-62,(event.clientY/innerHeight-.5)*-25];
    } else if (drag?.id === event.pointerId) {
      const dx = event.clientX-drag.x, dy = event.clientY-drag.y;
      if (Math.abs(dy)>17 && Math.abs(dy)>Math.abs(dx)) {drag=null;return;}
      if (Math.abs(dx)<9) return;
      pointer = [Math.max(-37,Math.min(37,dx*.36)),Math.max(-14,Math.min(14,dy*.28))];
    } else return;
    wake();
  }
  function resetPointer() { drag=null;pointer=[0,0];wake(); }

  // A background drag is optional. Gesture surfaces for portraits, the photos,
  // the paper puzzle and painting keep all of their own input and pan handling.
  document.addEventListener('pointermove',pointerMove,{passive:true});
  hero.addEventListener('pointerdown',e=>{
    if (e.pointerType!=='mouse' && e.isPrimary && visible==='home' && !suspended) drag={id:e.pointerId,x:e.clientX,y:e.clientY};
  },{passive:true});
  document.addEventListener('pointercancel',resetPointer,{passive:true});
  document.addEventListener('pointerup',e=>{if (drag?.id===e.pointerId) resetPointer();},{passive:true});
  document.documentElement.addEventListener('pointerleave',resetPointer,{passive:true});
  journey.addEventListener('scroll',wake,{passive:true});

  function endPass() {
    if (!pass) return;
    pass.abort();
    pass = null;
    hero.removeAttribute('data-film-crossing');
    proscenium.querySelectorAll('.arch-camera,.arch-still').forEach(item=>item.remove());
    archButton.setAttribute('aria-pressed','false');
    archButton.querySelector('span').textContent = '穿过石拱';
    resetPointer();
  }

  async function crossArch() {
    if (pass) {endPass();return;}
    if (visible!=='home') return;
    const controller = new AbortController();
    pass = controller;
    const signal = controller.signal;
    hero.dataset.filmCrossing = 'loading';
    archButton.setAttribute('aria-pressed','true');
    archButton.querySelector('span').textContent = '回到山谷';
    try {
      if (quality()==='still' || navigator.connection?.saveData) throw new Error('Static camera');
      const {crossArch:animate} = await import('./winter-arch.js?v=2');
      if (signal.aborted) return;
      await animate(proscenium,signal,{
        night:shell.dataset.livingTime==='night',
        start:()=>{hero.dataset.filmCrossing='travelling';}
      });
      if (!signal.aborted) hero.dataset.filmCrossing='arrived';
    } catch (_) {
      if (signal.aborted) return;
      const still = node('img','arch-still',proscenium);
      still.alt = '';
      still.src = artwork('home/through');
      hero.dataset.filmCrossing = 'still';
    }
  }

  archButton.addEventListener('click',crossArch);
  window.addEventListener('keydown',e=>{if (e.key==='Escape' && pass) endPass();});
  document.addEventListener('click',e=>{
    if (targetKey!=='cake' || !e.target.closest('#winter-cake-camera-enable,#winter-gesture-start')) return;
    cake.dataset.filmCameraPending='true';
    updateFreeze();
  },true);
  document.addEventListener('winter:camera-stopped',()=>{
    cake.dataset.filmCameraPending='false';
    if (visible!=='cake') return;
    updateFreeze();
  });
  document.addEventListener('winter:camera-ready',()=>{cake.dataset.filmCameraPending='false';updateFreeze();});
  document.addEventListener('winter:cosmos-stage',e=>{globeStage=e.detail?.stage || 'cosmos-intro';sync();});
  cosmos.addEventListener('close',sync);
  document.addEventListener('visibilitychange',()=>{
    if (document.hidden) {if(pass)endPass();updateFreeze();}
    else sync();
  });
  [reduce,compact,portrait,tallCake].forEach(query=>query.addEventListener('change',()=>{
    if (reduce.matches && pass) endPass();
    sync();
  }));
  new MutationObserver(sync).observe(shell,{
    attributes:true,attributeFilter:['data-page','data-destination','data-about-theme','data-motion','data-motion-paused','data-cake-camera']
  });
  new MutationObserver(updateFreeze).observe(document.getElementById('cosmos-photo-lightbox'),{attributes:true,attributeFilter:['hidden']});
  const exportDialog = document.getElementById('winter-art-export');
  if (exportDialog) new MutationObserver(updateFreeze).observe(exportDialog,{attributes:true,attributeFilter:['open']});
  sync();
})();
