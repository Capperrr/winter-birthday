import { THREE, shell, state, canvas, loadModel, animate, route, calm, paused, damp, clamp, failure, observeRoute, wake } from './core.js';

export function cakeChapter() {
  observeRoute(async () => {
    try { await Promise.all([cake(), lighter()]); } catch (error) { failure('cake', error); }
  }, () => route('cake'));
}

async function cake() {
  const page = document.getElementById('cake-page');
  const view = canvas(document.getElementById('grand-cake-tableau'), 'cake');
  const gltf = await loadModel('birthday-cake');
  const model = gltf.scene; view.scene.add(model);
  view.renderer.toneMappingExposure = 1.0;
  view.scene.environmentIntensity = .30;
  view.scene.children.find(o => o.isHemisphereLight).intensity = .65;
  const lights = view.scene.children.filter(o => o.isDirectionalLight);
  lights[0].intensity = 1.65; lights[0].color.set('#c7d8eb'); lights[1].intensity = 1.05;
  const pivot = new THREE.Group(); view.scene.remove(model); pivot.add(model); view.scene.add(pivot);
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    if (/flower|leaf/i.test(o.material.name)) o.material.side = THREE.DoubleSide;
    if (/Ivory cream/.test(o.material.name)) o.material.color.set('#d6cfbc');
    if (/Ivory flower/.test(o.material.name)) { o.material.color.set('#d1cbb9'); o.material.roughness = .75; }
    o.material.envMapIntensity = /silver/i.test(o.material.name) ? .8 : .35;
  });
  view.renderer.shadowMap.enabled = true; view.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const sun = view.scene.children.find(o => o.isDirectionalLight);
  sun.castShadow = true; sun.shadow.mapSize.set(512, 512); sun.shadow.camera.left = -4; sun.shadow.camera.right = 4; sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -4; sun.shadow.bias = -.001;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.ShadowMaterial({ opacity: .29 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.005; floor.receiveShadow = true; pivot.add(floor);
  // When the real camera replaces the lake, keep the long stone surface beneath
  // the cake. Its grain comes from the existing photographed foreground.
  const stoneMap = stoneTexture();
  const stone = new THREE.Mesh(new THREE.BoxGeometry(10, .13, 3.7), new THREE.MeshStandardMaterial({
    color: '#75818b', map: stoneMap, bumpMap: stoneMap, bumpScale: .018, roughness: .94, transparent: true, opacity: 0
  }));
  stone.position.set(0, -.09, .05); stone.receiveShadow = true; stone.visible = false; view.scene.add(stone);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 70);
  const tips = Array.from({ length: 5 }, (_, i) => model.getObjectByName(`CandleTip_${i}`));
  if (tips.some(tip => !tip)) throw new Error('Missing five physical wicks');
  const roots = [...document.querySelectorAll('.grand-candles-overlay')];
  const proxies = roots.map(root => [...root.querySelectorAll('.grand-candle-flame')]);
  const originalOrigins = proxies.map(list => list.map(flame => flame.style.transformOrigin));
  view.element.addEventListener('webglcontextlost', () => proxies.forEach((list, n) => list.forEach((flame, i) => { flame.style.transformOrigin = originalOrigins[n][i]; })));
  new MutationObserver(wake).observe(page, { attributes: true, attributeFilter: ['data-cake-state', 'data-lighter'] });
  proxies.flat().forEach(flame => new MutationObserver(wake).observe(flame, { attributes: true, attributeFilter: ['class'] }));
  const flames = tips.map(tip => {
    const group = new THREE.Group(); tip.add(group);
    const outer = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffb85c, transparent: true, opacity: .82, depthWrite: false }));
    outer.scale.set(.025, .092, .023); outer.position.y = .077; group.add(outer);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff4d3 }));
    inner.scale.set(.012, .047, .013); inner.position.set(0, .045, .01); group.add(inner);
    const light = new THREE.PointLight(0xffc475, .18, 2.1, 2); light.position.y = .14; group.add(light);
    group.visible = false; return { group, outer, light };
  });
  let width = 0, height = 0, angle = .13, targetAngle = .13, drag = null, shift = 0, settleUntil = 0;
  const point = new THREE.Vector3(); const projected = [];
  const resize = () => {
    const rect = page.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    width = rect.width; height = rect.height; view.size(width, height);
    settleUntil = performance.now() + 550;
    const portrait = width < 761 || width / height < .8;
    const h = portrait ? (height < 650 ? 8.8 : 8.0) : 6.1;
    const w = h * width / height;
    camera.left = -w / 2; camera.right = w / 2; camera.top = h / 2; camera.bottom = -h / 2;
    camera.position.set(0, portrait ? 3.4 : 3.0, 12);
    camera.lookAt(0, portrait ? 2.95 : 2.02, 0); camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(page); resize();
  new MutationObserver(() => { settleUntil = performance.now() + 550; wake(); }).observe(document.getElementById('cake-art-slot'), { attributes: true, attributeFilter: ['style'] });
  const onDown = e => {
    if (shell.dataset.cakeCamera === 'on' || e.target.closest('button, dialog') || page.dataset.cakeState !== 'unlit') return;
    drag = { id: e.pointerId, x: e.clientX, angle: targetAngle }; view.element.setPointerCapture(e.pointerId);
    wake();
  };
  view.element.addEventListener('pointerdown', onDown);
  view.element.addEventListener('pointermove', e => { if (drag?.id === e.pointerId) { targetAngle = clamp(drag.angle + (e.clientX - drag.x) * .004, -.32, .32); wake(); } });
  const release = () => { drag = null; targetAngle = .13; wake(); };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) view.element.addEventListener(name, release);
  function render(dt, time) {
    if (!width) resize();
    const cameraOn = shell.dataset.cakeCamera === 'on';
    shift = damp(shift, cameraOn ? 1 : 0, calm() ? 100 : 4.5, dt);
    stone.visible = shift > .01; stone.material.opacity = shift; floor.visible = shift < .5;
    angle = damp(angle, targetAngle, 10, dt); pivot.rotation.y = angle;
    const portrait = width < 761 || width / height < .8;
    const span = camera.right - camera.left;
    pivot.position.x = span * (portrait ? .10 + shift * .12 : .08 + shift * .19);
    pivot.scale.setScalar(portrait ? 1 - .19 * shift : 1 - .08 * shift);
    pivot.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    // Read layout once, before changing any flame styles. This prevents ten
    // synchronous layout/CTM flushes per frame on touch browsers.
    const pageRect = page.getBoundingClientRect();
    const inverseScreens = roots.map(root => { const matrix = root.getScreenCTM(); return matrix && root.getBoundingClientRect().width ? matrix.inverse() : null; });
    projected.length = 0;
    tips.forEach((tip, i) => {
      tip.getWorldPosition(point); point.project(camera);
      const x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2;
      projected.push({ x, y });
      roots.forEach((root, n) => {
        if (!inverseScreens[n]) return;
        const raw = new DOMPoint(x + pageRect.left, y + pageRect.top).matrixTransform(inverseScreens[n]);
        proxies[n][i].style.transformOrigin = `${Math.max(.01, raw.x).toFixed(3)}px ${Math.max(.01, raw.y).toFixed(3)}px`;
      });
      const lit = proxies.some(list => list[i].classList.contains('candle-is-lit')) || ['lighting', 'lit', 'waiting'].includes(page.dataset.cakeState);
      const flame = flames[i]; flame.group.visible = lit && !['thanks', 'fireworks', 'finished'].includes(page.dataset.cakeState);
      const flicker = calm() ? 1 : 1 + .065 * Math.sin(time * 8 + i * 2) + .026 * Math.sin(time * 17 + i);
      flame.group.scale.set(1, flicker, 1); flame.outer.rotation.z = calm() ? 0 : .09 * Math.sin(time * 4.5 + i);
      flame.light.intensity = .26 * flicker;
    });
    view.renderer.render(view.scene, camera);
  }
  render(.05, 0); shell.dataset.livingCake = 'ready'; state.cake = 'ready';
  const hint = document.createElement('p'); hint.className = 'living-cake-hint'; hint.textContent = '轻轻拖动，看看为你做的蛋糕'; page.append(hint);
  // A modal paints one final snapshot (including all five lit flames), then
  // sleeps. Otherwise a paused frame could retain only four visible flames.
  animate(() => !view.lost && route('cake') && !['fireworks', 'finished'].includes(page.dataset.cakeState), render,
    () => !paused() && (!calm() || performance.now() < settleUntil || Math.abs(angle - targetAngle) > .001 || Math.abs(shift - (shell.dataset.cakeCamera === 'on' ? 1 : 0)) > .001));
  state.cakeWicks = () => projected.map(p => ({ ...p }));
  state.cakeGeometry = () => ({ meshes: count(model), angle, width, height, visibleFlames: flames.filter(f => f.group.visible).length, cameraOn: shell.dataset.cakeCamera === 'on', calls: view.renderer.info.render.calls });
}
function count(object) { let result = 0; object.traverse(o => { if (o.isMesh) result++; }); return result; }
function stoneTexture() {
  const image = document.querySelector('.cake-backdrop img');
  if (!image?.complete || !image.naturalWidth) return null;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const ctx = c.getContext('2d');
  ctx.drawImage(image, image.naturalWidth * .35, image.naturalHeight * .77, image.naturalWidth * .30, image.naturalHeight * .15, 0, 0, 512, 256);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(3, 1.5); return map;
}

async function lighter() {
  try {
    const button = document.getElementById('grand-lighter'), page = document.getElementById('cake-page');
    button.setAttribute('aria-label', '轻触翻开打火机，或拖动拿起查看；开启镜头后用手势逐根点亮蜡烛');
    const view = canvas(button, 'lighter'); const gltf = await loadModel('lighter'); const model = gltf.scene;
    view.scene.add(model); const camera = gltf.cameras[0]; if (!camera) throw new Error('Missing calibrated tool camera');
    const lid = model.getObjectByName('LighterLid'), wheel = model.getObjectByName('LighterWheel');
    const original = lid.quaternion.clone(); const axis = new THREE.Vector3(0, 0, 1);
    let open = true, amount = 0, wheelAngle = 0, wheelTarget = 0, drag = null, dx = 0, dy = 0, tx = 0, ty = 0;
    let width = 0, height = 0;
    const resize = () => { const r = button.getBoundingClientRect(); if (r.width) { width = r.width; height = r.height; view.size(width, height); } };
    new ResizeObserver(resize).observe(button); resize();
    button.addEventListener('pointerdown', e => {
      if (shell.dataset.cakeCamera === 'on' || page.dataset.cakeState !== 'unlit') return;
      e.preventDefault(); drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
      button.setPointerCapture(e.pointerId); button.dataset.inspect = 'held'; wake();
    });
    button.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId || shell.dataset.cakeCamera === 'on') return;
      tx = clamp(e.clientX - drag.x, -110, 110); ty = clamp(e.clientY - drag.y, -130, 65);
      if (Math.hypot(tx, ty) > 6) drag.moved = true;
      wake();
    });
    const release = e => {
      if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.id)) return;
      if (!drag.moved && e.type !== 'pointercancel') { open = !open; wheelTarget += Math.PI * 1.8; }
      drag = null; tx = ty = 0; button.dataset.inspect = 'resting'; wake();
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, release);
    button.addEventListener('keydown', e => { if (['Enter', ' '].includes(e.key) && shell.dataset.cakeCamera !== 'on') { e.preventDefault(); open = !open; wheelTarget += Math.PI * 1.8; } if (e.key === 'Escape') { drag = null; tx = ty = 0; open = true; } wake(); });
    function render(dt) {
      const on = shell.dataset.cakeCamera === 'on';
      if (on) { drag = null; tx = ty = dx = dy = 0; }
      else { dx = damp(dx, tx, drag ? 22 : 13, dt); dy = damp(dy, ty, drag ? 22 : 13, dt); button.style.setProperty('--lighter-dx', dx.toFixed(2) + 'px'); button.style.setProperty('--lighter-dy', dy.toFixed(2) + 'px'); }
      amount = damp(amount, on || open ? 0 : 1, 12, dt);
      lid.quaternion.copy(original).multiply(new THREE.Quaternion().setFromAxisAngle(axis, -1.77 * amount));
      wheelAngle = damp(wheelAngle, wheelTarget, 10, dt); wheel.rotation.x = wheelAngle;
      if (!width) resize(); view.renderer.render(view.scene, camera);
    }
    render(.05); shell.dataset.livingLighter = 'ready'; state.lighter = 'ready';
    animate(() => !view.lost && route('cake') && !paused() && page.dataset.cakeState === 'unlit', render,
      () => !calm() || Math.abs(dx - tx) > .1 || Math.abs(dy - ty) > .1 || Math.abs(amount - (shell.dataset.cakeCamera === 'on' || open ? 0 : 1)) > .001 || Math.abs(wheelAngle - wheelTarget) > .01);
    state.lighterPose = () => ({ open, lid: amount, wheel: wheelAngle, x: dx, y: dy, handOwnsMovement: shell.dataset.cakeCamera === 'on' });
  } catch (error) { failure('lighter', error); }
}
