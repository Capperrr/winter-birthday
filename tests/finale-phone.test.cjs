const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const { runInNewContext } = require('node:vm');
const dist = path.join(__dirname, '../dist');

// Deterministic DOM/state checks. This harness does not render or emulate Safari.
function start({ celebrated = true, reduced = false, holdImages = false } = {}) {
  let document, focused, clock = 0, id = 0, imageHeld = holdImages;
  const timers = new Map(), frames = new Map(), pendingImages = [], observers = [];
  const elements = new Map(), cosmosEvents = [], draws = [];
  class Element {
    constructor(name = '') {
      this.id = name; this.handlers = {}; this.children = []; this.dataset = {};
      this.hidden = false; this.disabled = false; this.open = false; this.attributes = {};
      this.style = { setProperty(k, v) { this[k] = v; } };
      const classes = new Set();
      this.classList = { add: (...v) => v.forEach(x => classes.add(x)), remove: (...v) => v.forEach(x => classes.delete(x)), contains: x => classes.has(x), toggle(x, v) { if (v) classes.add(x); else classes.delete(x); } };
      if (name) elements.set(name, this);
    }
    addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); }
    fire(type, props = {}) {
      const event = { type, target: this, preventDefault() { this.prevented = true; }, stopPropagation() {}, ...props };
      return Promise.all((this.handlers[type] || []).map(fn => fn(event)));
    }
    click() { if (!this.disabled) { focused = this; return this.fire('click'); } }
    dispatchEvent(event) { this.fire(event.type, event); }
    setAttribute(k, v) { this.attributes[k] = v; }
    focus() { focused = this; }
    append(...children) { this.children.push(...children); }
    querySelector() { return this.title ||= new Element(); }
    showModal() { this.open = true; }
    close() { this.open = false; this.fire('close'); }
    getBoundingClientRect() { return { left: 300, top: 100, width: 320, height: 600 }; }
    getContext() { return context; }
    toDataURL() { return 'data:image/png;base64,birthday'; }
  }
  const context = new Proxy({
    measureText: text => ({ width: text.length * 12 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    drawImage: image => draws.push(image.src),
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  const el = name => elements.get(name) || new Element(name);
  document = new Element();
  document.getElementById = el;
  document.createElement = () => new Element();
  document.querySelector = () => el('phone-preview');
  const wishes = Array.from({ length: 4 }, (_, i) => { const b = new Element(); b.dataset.wish = String(i); return b; });
  document.querySelectorAll = () => wishes;
  Object.defineProperty(document, 'activeElement', { get: () => focused });
  const window = new Element();
  window.matchMedia = () => ({ matches: reduced });
  window.innerWidth = 1000; window.innerHeight = 800; window.navigator = { vibrate() {} };
  const setTimer = (fn, delay) => { const timer = ++id; timers.set(timer, { fn, at: clock + delay }); return timer; };
  const clearTimer = timer => timers.delete(timer);
  window.setTimeout = setTimer;
  class Image {
    constructor() { this.width = 720; this.height = 1000; this.naturalWidth = 720; this.complete = false; }
    set src(value) { this._src = value; if (imageHeld) pendingImages.push(this); else { this.complete = true; this.onload?.(); } }
    get src() { return this._src; }
  }
  class MutationObserver { constructor(fn) { this.fn = fn; observers.push(this); } observe(target) { this.target = target; } }
  class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
  const globals = { document, window, Image, MutationObserver, CustomEvent, location: { hash: '#finale' },
    setTimeout: setTimer, clearTimeout: clearTimer,
    requestAnimationFrame: fn => { const frame = ++id; frames.set(frame, fn); return frame; },
    cancelAnimationFrame: frame => frames.delete(frame) };
  el('finale-newspaper').dataset.joined = String(celebrated);
  el('finale-surprise').hidden = !celebrated;
  el('winter-phone-lockscreen').hidden = true;
  el('cosmos-photo-lightbox').hidden = true;
  el('main').dataset.motion = 'on';
  focused = el('finale-phone-start');
  runInNewContext(readFileSync(path.join(dist, 'gwen-handwriting-phone.js'), 'utf8'), globals);
  runInNewContext(readFileSync(path.join(dist, 'cosmos-chapter.js'), 'utf8'), globals);
  document.addEventListener('winter:cosmos-open', event => cosmosEvents.push(event));
  function advance(ms) {
    const end = clock + ms;
    while (true) {
      const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      timers.delete(next[0]); clock = next[1].at; next[1].fn();
    }
    clock = end;
  }
  function releaseImages() { imageHeld = false; pendingImages.splice(0).forEach(image => { image.complete = true; image.onload?.(); }); }
  async function ready() {
    await el('finale-phone-start').click();
    await el('winter-shutter').click();
    advance(reduced ? 180 : 1700);
  }
  return { el, document, advance, ready, cosmosEvents, timers, frames, draws, releaseImages, focused: () => focused, wishes, renderFrame() { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(1000)); }, motionChanged() { observers.filter(observer => observer.target === el('main')).forEach(observer => observer.fn()); } };
}

(async () => {
  const blocked = start({ celebrated: false });
  await blocked.el('finale-phone-start').click();
  assert.equal(blocked.el('winter-phone-dialog').open, false, 'Birthday completion remains required');

  for (const activation of ['key', 'hint']) {
    const app = start();
    await app.el('finale-phone-start').click();
    assert.equal(app.el('winter-shutter').disabled, false);
    assert.equal(app.el('winter-phone-power').disabled, true);
    await app.el('winter-phone-power').fire('click');
    assert.equal(app.cosmosEvents.length, 0);
    await app.el('winter-shutter').click();
    app.advance(600);
    assert.equal(app.el('winter-phone-lockscreen').hidden, false);
    assert.equal(app.el('winter-lock-notification').hidden, true);
    assert.equal(app.el('phone-power-guide').hidden, true);
    app.advance(1100);
    assert.equal(app.el('winter-lock-notification').hidden, false);
    assert.equal(app.el('phone-power-guide').hidden, false);
    assert.equal(app.el('winter-phone-power').disabled, false);
    assert.equal(app.focused(), app.el('winter-phone-power'));
    assert.equal(app.el('winter-lock-wallpaper').src, app.el('phone-preview').src, 'The captured picture becomes the wallpaper');
    assert.ok(app.draws.includes('assets/handwriting/gwen-birthday.png'));
    assert.ok(app.draws.includes('assets/finale-duo-cutout.avif'));
    if (activation === 'key') await app.el('winter-phone-power').click();
    else await app.el('winter-phone-power').fire('click', { target: app.el('phone-power-guide') });
    await app.el('winter-phone-power').fire('click');
    assert.ok(app.el('winter-phone-shell').classList.contains('is-powered-off'));
    app.advance(559); assert.equal(app.cosmosEvents.length, 0);
    app.advance(1); assert.equal(app.cosmosEvents.length, 1, 'One transition, including rapid double taps');
    assert.equal(app.el('winter-phone-dialog').open, false);
    assert.equal(app.el('winter-cosmos-dialog').open, true);
    assert.equal(app.el('cosmos-root').style['--cosmos-origin-x'], '46%');
    assert.equal(app.el('cosmos-root').style['--cosmos-origin-y'], '50%');
  }

  for (const interruption of ['winter-phone-reset', 'winter-phone-close', 'route']) {
    const app = start(); await app.ready();
    await app.el('winter-phone-power').click();
    if (interruption === 'route') await app.document.fire('winter:finale-enter');
    else await app.el(interruption).click();
    app.advance(5000);
    assert.equal(app.cosmosEvents.length, 0, interruption + ' cancels pending navigation');
    assert.equal(app.el('winter-cosmos-dialog').open, false);
  }

  const rephoto = start();
  await rephoto.el('finale-phone-start').click(); await rephoto.el('winter-shutter').click();
  rephoto.advance(600); await rephoto.el('winter-phone-reset').click(); rephoto.advance(5000);
  assert.equal(rephoto.el('phone-power-guide').hidden, true, 'No stale notification after retaking');
  assert.equal(rephoto.el('winter-camera-screen').hidden, false);
  await rephoto.el('winter-shutter').click(); rephoto.advance(1700);
  assert.equal(rephoto.el('phone-power-guide').hidden, false);

  const loading = start({ holdImages: true });
  const pending = loading.el('finale-phone-start').click();
  assert.equal(loading.el('winter-shutter').disabled, true);
  await loading.el('winter-phone-close').click(); loading.releaseImages(); await pending;
  assert.equal(loading.el('winter-phone-dialog').open, false);
  assert.equal(loading.el('phone-preview').src, undefined, 'An old image task cannot mutate a closed phone');
  await loading.ready(); assert.equal(loading.el('phone-power-guide').hidden, false, 'Reopening recovers cleanly');

  const reduced = start({ reduced: true }); await reduced.ready();
  await reduced.el('winter-phone-power').click(); reduced.advance(110);
  assert.equal(reduced.cosmosEvents.length, 1);

  const gallery = start(); await gallery.ready(); await gallery.el('winter-phone-power').click(); gallery.advance(560);
  assert.equal(gallery.el('cosmos-intro').dataset.sequence, 'playing');
  gallery.document.hidden = true; await gallery.document.fire('visibilitychange');
  assert.equal(gallery.el('winter-cosmos-dialog').dataset.paused, 'true');
  assert.equal(gallery.frames.size, 0, 'Hidden tabs stop star frames and pause the text sequence');
  gallery.document.hidden = false; await gallery.document.fire('visibilitychange');
  assert.equal(gallery.el('winter-cosmos-dialog').dataset.paused, 'false');
  assert.equal(gallery.frames.size, 1);
  gallery.el('main').dataset.motion = 'off'; gallery.motionChanged(); gallery.renderFrame();
  assert.equal(gallery.el('winter-cosmos-dialog').dataset.motion, 'off');
  assert.equal(gallery.frames.size, 0, 'Motion off paints once and keeps every sentence readable');
  gallery.el('main').dataset.motion = 'on'; gallery.motionChanged();
  assert.equal(gallery.frames.size, 1);
  const tiles = gallery.el('cosmos-photo-wall').children;
  assert.equal(tiles.length, 19, 'All 19 supplied originals remain, awaiting the next user photo');
  const paths = new Set();
  tiles.forEach(tile => {
    const image = tile.children[0]; paths.add(image.src);
    assert.ok(existsSync(path.join(dist, image.src)), image.src);
    assert.equal(image.loading, 'lazy'); assert.ok(image.alt);
  });
  assert.equal(paths.size, tiles.length, 'Every tile uses an individual image');
  await gallery.el('cosmos-to-stars').click(); assert.equal(gallery.el('cosmos-intro').dataset.sequence, 'idle', 'Continuing interrupts the text sequence'); await gallery.wishes[0].click();
  assert.ok(gallery.el('cosmos-wish-text').textContent.includes('我会为你点灯'));
  await gallery.el('cosmos-to-apod').click(); await gallery.el('cosmos-to-gallery').click();
  await tiles.at(-1).click();
  assert.ok(gallery.el('cosmos-lightbox-photo').src.endsWith('memory-19.webp'));
  await gallery.document.fire('keydown', { key: 'ArrowRight' });
  assert.ok(gallery.el('cosmos-lightbox-photo').src.endsWith('memory-01.webp'));
  await gallery.el('winter-cosmos-dialog').fire('cancel');
  assert.equal(gallery.el('cosmos-photo-lightbox').hidden, true);
  assert.equal(gallery.el('winter-cosmos-dialog').open, true);
  assert.equal(gallery.focused(), tiles.at(-1), 'Closing after image navigation restores the original tile focus');
  await gallery.el('cosmos-close').click(); assert.equal(gallery.frames.size, 0);
  await gallery.document.fire('winter:cosmos-open');
  assert.equal(gallery.el('cosmos-intro').dataset.sequence, 'playing', 'Reopening restarts the reading sequence');
  await gallery.el('cosmos-close').click();
  const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
  assert.ok(!html.includes('winter-phone-next'), 'The extra below-phone action is removed');
  assert.match(html, /id="winter-phone-power"[\s\S]*id="phone-power-guide"[\s\S]*?<\/button>/, 'The hint is part of the physical key, not a second panel');

  console.log('PASS: Captured wallpaper and original handwriting; notification-before-power gate; side key and its inline hint; one cosmos transition; retake/close/route/load interruption and recovery; reduced motion; interrupted/restarted cosmos reading, visibility and motion lifecycle; all 19 photos, wrap navigation and focus restoration. DOM/state checks, not browser or iPad rendering.');
})().catch(error => { console.error(error); process.exitCode = 1; });
