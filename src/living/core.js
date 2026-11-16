import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export { THREE };
export const shell = document.getElementById('main');
export const reduced = matchMedia('(prefers-reduced-motion: reduce)');
export const state = { home: 'waiting', cake: 'waiting', lighter: 'waiting', envelope: 'waiting', papers: 'waiting' };
const loader = new GLTFLoader();
const models = new Map();
export const loadModel = name => {
  if (!models.has(name)) models.set(name, loader.loadAsync(`assets/living/${name}.glb`).catch(error => { models.delete(name); throw error; }));
  return models.get(name);
};
export const texture = url => new THREE.TextureLoader().loadAsync(url).then(map => { map.colorSpace = THREE.SRGBColorSpace; return map; });
export const damp = (a, b, rate, dt) => THREE.MathUtils.damp(a, b, rate, dt);
export const clamp = THREE.MathUtils.clamp;
export const smooth = n => { const x = clamp(n, 0, 1); return x * x * (3 - 2 * x); };
export const calm = () => reduced.matches || shell.dataset.motion === 'off';
export const paused = () => document.hidden || shell.dataset.motionPaused === 'true';
export const route = name => name === 'home' ? shell.dataset.page === 'home' : shell.dataset.page === 'destination' && shell.dataset.destination === name;

export function canvas(parent, name, lit = true) {
  const element = document.createElement('canvas');
  element.className = `living-canvas living-${name}`;
  element.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas: element, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 761 ? 1.5 : 1.35));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  parent.append(element);
  const scene = new THREE.Scene();
  let environment;
  function refreshEnvironment() {
    const pmrem = new THREE.PMREMGenerator(renderer);
    // Small local studio cubemap: soft reflection strips without an expensive second scene bake.
    const cube = studioCube();
    environment?.dispose(); environment = pmrem.fromCubemap(cube); scene.environment = environment.texture;
    cube.dispose(); pmrem.dispose();
  }
  if (lit) {
    refreshEnvironment(); scene.environmentIntensity = .45;
    scene.add(new THREE.HemisphereLight(0xc2d9ef, 0x29333e, 1.7));
    const key = new THREE.DirectionalLight(0xffedce, 3.1); key.position.set(-3, 6, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0x7fa5dd, 2.0); rim.position.set(4, 4, -3); scene.add(rim);
  }
  let width = 1, height = 1, lost = false;
  function size(w, h) { width = w; height = h; renderer.setSize(w, h, false); }
  element.addEventListener('webglcontextlost', event => {
    event.preventDefault(); lost = true; shell.dataset[`living${name[0].toUpperCase() + name.slice(1)}`] = 'fallback'; state[name] = 'context-lost';
  });
  element.addEventListener('webglcontextrestored', () => {
    if (lit) refreshEnvironment();
    lost = false; shell.dataset[`living${name[0].toUpperCase() + name.slice(1)}`] = 'ready'; state[name] = 'ready'; wake();
  });
  return { element, renderer, scene, size, get lost() { return lost; }, get width() { return width; }, get height() { return height; } };
}

// One sleeping scheduler for all views. No hidden-route animation or background timers.
const jobs = [];
let raf = 0, previous = 0, lastPaint = 0;
export function animate(active, update, continuous = () => !calm()) { jobs.push({ active, update, continuous, elapsed: 0 }); wake(); }
export function wake() { if (!raf && !document.hidden) raf = requestAnimationFrame(tick); }
function tick(now) {
  raf = 0;
  const first = !previous;
  const dt = Math.min(.05, Math.max(.001, (now - (previous || now)) / 1000)); previous = now;
  const running = jobs.filter(job => job.active());
  if (!running.length || document.hidden) { previous = 0; return; }
  if (first || now - lastPaint >= 1000 / 30 - 1) {
    const step = Math.max(dt, (now - (lastPaint || now)) / 1000);
    for (const job of running) { job.elapsed += Math.min(.08, step); job.update(Math.min(.08, step), job.elapsed); }
    lastPaint = now;
  }
  if (running.some(job => job.continuous())) raf = requestAnimationFrame(tick);
  else previous = 0;
}
function studioCube() {
  const faces = Array.from({ length: 6 }, (_, i) => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const ctx = c.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 64, 64);
    gradient.addColorStop(0, i === 2 ? '#ced9e5' : '#1e3043'); gradient.addColorStop(.5, i === 3 ? '#25312b' : '#687482'); gradient.addColorStop(1, '#152332');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
    if ([0, 1, 4].includes(i)) {
      const strip = ctx.createLinearGradient(4, 0, 36, 0);
      strip.addColorStop(0, '#e9e3d700'); strip.addColorStop(.3, '#e9e3d7'); strip.addColorStop(.7, '#e9e3d7'); strip.addColorStop(1, '#e9e3d700');
      ctx.fillStyle = strip; ctx.fillRect(4, 3, 32, 54);
    }
    return c;
  });
  const cube = new THREE.CubeTexture(faces); cube.colorSpace = THREE.SRGBColorSpace; cube.needsUpdate = true; return cube;
}
new MutationObserver(wake).observe(shell, { attributes: true, attributeFilter: ['data-page', 'data-destination', 'data-motion', 'data-motion-paused', 'data-cake-camera', 'data-view'] });
document.addEventListener('visibilitychange', wake);
window.addEventListener('resize', wake, { passive: true });
window.addEventListener('pageshow', wake);

export function failure(name, error) {
  state[name] = 'fallback'; shell.dataset[`living${name[0].toUpperCase() + name.slice(1)}`] = 'fallback';
  console.warn(`WINTER ${name}: original artwork retained.`, error.message);
}

export function observeRoute(start, active) {
  let loading = false;
  const check = () => { if (!loading && active()) { loading = true; start(); } };
  new MutationObserver(check).observe(shell, { attributes: true, attributeFilter: ['data-page', 'data-destination'] });
  check();
}
