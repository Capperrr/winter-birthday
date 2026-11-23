/* The film world is decorative. All story controls stay in their original DOM. */
(() => {
  'use strict';
  const shell = document.getElementById('main');
  const cosmos = document.getElementById('winter-cosmos-dialog');
  const cosmosRoot = document.getElementById('cosmos-root');
  const cake = document.getElementById('cake-page');
  const cakeSlot = document.getElementById('cake-art-slot');
  if (!shell || !cosmosRoot || !cosmos) return;

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
  const sky = layout('cosmos','61% 49%','stars_sparse');
  const scenes = {
    unlock:layout('unlock','52% 49%','fog_far_silver'),
    cake:layout('cake','54% 54%','stars_sparse'),
    universe:sky
  };
  scenes.universe.planes.push(['near-fog','air/fog_near_blue',139,.92]);

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
    if (page !== 'destination') return page || 'home';
    const chapter = shell.dataset.destination;
    return ['greeting','envelope','untying','opening'].includes(chapter) ? 'envelope' : chapter || 'envelope';
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
    plane.dataset.depth = String(depth);
    plane.dataset.pan = String(pan);
    plane.style.setProperty('--plane-order',String(depth+220));
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
    if (active?.key === 'journey') return [0,0,0];
    const strength = active?.budget === 'quiet' ? .7 : 1;
    return [pointer[0]*strength,pointer[1],active?.key==='home'?17:9];
  }

  function project() {
    if (active.budget === 'still') return;
    const [x,y,z] = position;
    const horizontal = Math.max(-innerWidth*.035,Math.min(innerWidth*.035,x));
    // Project each flat photographic plane through the same focal distance.
    // Explicit projected matrices keep Safari from flattening a fading scene.
    active.planes.forEach(({element,depth,pan})=>{
      const projection = perspective/(perspective-depth-z);
      const widthFit = ((perspective-depth)/perspective)*1.115;
      element.style.transform = 'translate3d(' + (horizontal*pan*projection).toFixed(2) + 'px,' +
        (y*pan*projection).toFixed(2) + 'px,0) scale(' + (widthFit*projection).toFixed(5) + ')';
    });
    active.frame.style.setProperty('--camera-x',horizontal.toFixed(2)+'px');
  }

  function render(now) {
    cameraFrame = 0;
    if (!active || suspended || active.budget === 'still' || document.hidden) return;
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
    project();
    if (needsFrame) cameraFrame = requestAnimationFrame(render);
  }

  function wake() {
    if (!cameraFrame && active?.budget !== 'still' && !suspended) {
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
    const mode = config ? 'projection' : 'plaster';
    shell.dataset.filmMode = mode;
    cosmosRoot.dataset.filmMode = mode;
    if (!config) {
      retire(active?.frame);
      active = null;
      shell.dataset.filmReady = key;
      cosmosRoot.dataset.filmReady = key;
      return;
    }

    const parent = cosmos.open ? skybox : ground;
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
    position = [0, 0, -24];
    pointer = [0,0];
    const planes = Array.from(world.children, element=>({element,depth:Number(element.dataset.depth),pan:Number(element.dataset.pan)}));
    active = {frame,key,budget:frame.dataset.quality,planes};
    project();
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
    const camera = ((targetKey === 'cake' || targetKey === 'creator') && shell.dataset.cakeCamera === 'on') ||
      (targetKey === 'cake' && cake.dataset.filmCameraPending === 'true');
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
    if (key !== visible) {
      visible = key;
      shell.dataset.filmScene = key;
      cosmosRoot.dataset.filmScene = key;
    }
    if (key === 'cake') assembleCake();
    setShot(key,quality());
    updateFreeze();
  }

  document.addEventListener('pointermove',event=>{
    if (!active || suspended || active.budget === 'still' || active.key==='journey' || event.pointerType!=='mouse') return;
    if (event.target.closest('input, textarea, .is-dragging, dialog[open] canvas')) return;
    pointer = [(event.clientX/innerWidth-.5)*-62,(event.clientY/innerHeight-.5)*-25];
    wake();
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{
    pointer=[0,0];
    wake();
  },{passive:true});
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
  document.addEventListener('visibilitychange',sync);
  [reduce,compact,portrait,tallCake].forEach(query=>query.addEventListener('change',sync));
  new MutationObserver(sync).observe(shell,{
    attributes:true,attributeFilter:['data-page','data-destination','data-about-theme','data-motion','data-motion-paused','data-cake-camera','data-living-time']
  });
  new MutationObserver(updateFreeze).observe(document.getElementById('cosmos-photo-lightbox'),{attributes:true,attributeFilter:['hidden']});
  const exportDialog = document.getElementById('winter-art-export');
  if (exportDialog) new MutationObserver(updateFreeze).observe(exportDialog,{attributes:true,attributeFilter:['open']});
  sync();
})();
