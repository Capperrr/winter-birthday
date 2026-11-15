const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');
const source = readFileSync(require('node:path').join(__dirname,'../dist/app.js'), 'utf8');

function start({ hash = '', storage = {}, session = {}, rejectSave = false, reducedMotion = false } = {}) {
  const elements = new Map();
  const animations = [];
  const timers = new Map();
  let nextTimer = 0;
  class Element {
    constructor(id = '') { this.id = id; this.dataset = {}; this.attributes = {}; this.handlers = {}; this.style = { setProperty: (k, v) => { this.style[k] = v; } }; this.hidden = false; this.open = false; this.value = ''; this.textContent = ''; this.classes = []; this.classList = { contains: x => this.classes.includes(x) }; if (id) elements.set(id, this); }
    addEventListener(name, handler) { (this.handlers[name] ||= []).push(handler); }
    fire(name, props = {}) { const event = { target: this, preventDefault() {}, ...props }; (this.handlers[name] || []).forEach(handler => handler(event)); }
    dispatchEvent(event) { this.fire(event.type, event); return true; }
    setAttribute(k, v) { this.attributes[k] = v; }
    removeAttribute(k) { delete this.attributes[k]; }
    focus() { focused = this; }
    showModal() { this.open = true; }
    close() { this.open = false; this.fire('close'); }
    setSelectionRange() {}
    getBoundingClientRect() { return this.id === 'gift-envelope' ? { left: 310, top: 260, width: 540, height: 342 } : { left: 16, top: 16, width: 1200, height: 800 }; }
    animate(keyframes, options) { const animation = { cancelled: false, cancel() { this.cancelled = true; } }; animations.push({ target: this, keyframes, options, animation }); return animation; }
  }
  let focused;
  for (const id of ['main', 'page-tabs', 'view-toggle', 'view-label', 'view-status', 'scene-footer', 'scene-photo', 'dream-photo', 'note-editor', 'note-status', 'note-input', 'editor-title', 'character-count', 'editor-close', 'editor-cancel', 'note-form', 'birthday-dialog', 'envelope-stage', 'open-envelope', 'letter-page', 'letter-page-title', 'memory-wall', 'memory-china', 'memory-uk', 'birthday-okay-one', 'back-to-envelope', 'gift-envelope', 'unfold-sheet', 'unlock-page', 'unlock-page-title', 'birthday-word', 'unlock-error', 'cake-dialog', 'birthday-cake', 'birthday-unlock-form', 'cake-dialog-close', 'cake-page', 'journey-page', 'journey-title', 'open-journey', 'journey-return', 'journey-afterword', 'afterword-back', 'afterword-home']) new Element(id);
  const tabs = ['about', 'home', 'destination'].map(page => { const e = new Element('tab-' + page); e.dataset.page = page; return e; });
  const panels = ['about', 'home', 'destination'].map(page => new Element('panel-' + page));
  const notes = Array.from({ length: 22 }, (_, i) => { const e = new Element(); e.dataset.noteId = String(i + 1); e.classes = ['sticky-note', i % 2 ? 'sage' : 'butter']; e.noteText = new Element(); e.querySelector = () => e.noteText; return e; });
  const countries = ['uk', 'china'].map(country => { const e = new Element('country-' + country); e.dataset.country = country; return e; });
  const sceneCopy = [new Element('brand'), elements.get('page-tabs'), new Element('cover-copy'), elements.get('scene-footer')];
  elements.get('page-tabs').querySelectorAll = () => tabs;
  const document = new Element();
  document.getElementById = id => { assert.ok(elements.has(id), 'Known element ' + id); return elements.get(id); };
  document.querySelectorAll = selector => ({ '[role="tabpanel"]': panels, '.scene-copy': sceneCopy, '[data-note-id]': notes, '[data-country]': countries })[selector];
  document.querySelector = () => ({});
  const window = new Element();
  window.matchMedia = () => ({ matches: reducedMotion });
  const location = { hash };
  const history = { pushState(a, b, next) { location.hash = next; }, replaceState(a, b, next) { location.hash = next; } };
  const localStorage = { getItem: key => storage[key] || null, setItem: (key, value) => { if (rejectSave) throw new Error('Storage blocked'); storage[key] = value; } };
  const sessionStorage = { getItem: key => session[key] || null, setItem: (key, value) => { session[key] = value; } };
  class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
  runInNewContext(source, { document, window, history, location, localStorage, sessionStorage, CustomEvent, setTimeout: (callback, delay) => { const id = nextTimer++; timers.set(id, { callback, delay }); return id; }, clearTimeout: id => timers.delete(id), requestAnimationFrame: callback => callback() });
  return { elements, tabs, panels, notes, sceneCopy, countries, document, window, location, storage, session, timers, animations, runTimers: () => { const pending = Array.from(timers.values()); timers.clear(); pending.forEach(timer => timer.callback()); }, focused: () => focused };
}

const app = start();
const el = id => app.elements.get(id);
assert.equal(el('main').dataset.page, 'home');
el('view-toggle').fire('click');
assert.equal(el('main').dataset.view, 'scenery');
app.document.fire('keydown', { key: 'Escape' });
assert.equal(el('main').dataset.view, 'cover');
app.tabs[0].fire('click');
app.notes[0].fire('click');
el('note-input').value = '25岁的我，你好。<script>只显示文字</script>';
el('note-form').fire('submit');
assert.equal(app.notes[0].noteText.textContent, '25岁的我，你好。<script>只显示文字</script>');
const resumed = start({ hash: '#about', storage: app.storage });
assert.equal(resumed.notes[0].noteText.textContent, app.notes[0].noteText.textContent);
resumed.notes[0].fire('click');
resumed.elements.get('note-input').value = '';
resumed.elements.get('note-form').fire('submit');
assert.equal(resumed.notes[0].noteText.textContent, '');
app.tabs[0].fire('keydown', { key: 'ArrowLeft' });
assert.equal(el('birthday-dialog').open, true);
assert.equal(el('main').dataset.destination, 'greeting');
el('birthday-okay-one').fire('click');
assert.equal(el('main').dataset.destination, 'envelope');
el('open-envelope').fire('click');
assert.equal(el('main').dataset.destination, 'untying');
assert.equal(el('open-envelope').disabled, true);
el('open-envelope').fire('click');
assert.equal(app.timers.size, 1);
app.runTimers();
assert.equal(el('main').dataset.destination, 'opening');
assert.equal(el('unfold-sheet').hidden, true);
app.runTimers();
assert.equal(el('unfold-sheet').hidden, false);
assert.equal(app.animations.length, 1);
assert.equal(app.animations[0].options.duration, 900);
app.runTimers();
assert.equal(el('main').dataset.destination, 'unlock');
assert.equal(app.location.hash, '#unlock');
assert.equal(el('unlock-page').hidden, false);
assert.equal(el('letter-page').hidden, true);
assert.equal(el('unfold-sheet').hidden, true);
assert.equal(app.animations[0].animation.cancelled, true);
assert.equal(app.focused(), el('unlock-page-title'));
el('birthday-cake').fire('click');
assert.equal(el('cake-dialog').open, true);
assert.equal(el('main').dataset.destination, 'unlock', 'Cake blessing does not skip the word puzzle');
el('cake-dialog-close').fire('click');
assert.equal(el('cake-dialog').open, false);
assert.equal(app.focused(), el('birthday-cake'));
el('birthday-word').value = 'wrong';
el('birthday-unlock-form').fire('submit');
assert.equal(el('main').dataset.destination, 'unlock');
assert.equal(el('birthday-word').attributes['aria-invalid'], 'true');
el('birthday-word').fire('input');
assert.equal(el('unlock-error').textContent, '');
el('birthday-word').value = 'bIrThDaY';
el('birthday-unlock-form').fire('submit');
assert.equal(el('main').dataset.destination, 'cake');
assert.equal(el('cake-page').hidden, false);
assert.equal(el('letter-page').hidden, true, 'Memories follow the candle/fireworks scene');
app.document.fire('winter:celebration-complete');
assert.equal(el('main').dataset.destination, 'letter');
assert.equal(app.location.hash, '#letter');
assert.equal(el('letter-page').hidden, false);
assert.equal(el('unlock-page').hidden, true);
assert.equal(app.session['winter-birthday-word-solved'], 'true');
assert.equal(app.session['winter-birthday-celebrated'], 'true');
assert.equal(el('memory-china').hidden, false, 'China opens by default on the centered memory page');
assert.equal(el('memory-uk').hidden, true);
el('country-uk').fire('click');
assert.equal(el('memory-china').hidden, true);
assert.equal(el('memory-uk').hidden, false);
assert.equal(el('country-uk').attributes['aria-pressed'], 'true');
assert.equal(el('dream-photo').attributes['aria-hidden'], 'true');
el('back-to-envelope').fire('click');
assert.equal(el('main').dataset.destination, 'envelope');
assert.equal(el('birthday-dialog').open, false);
app.location.hash = '#home'; app.window.fire('popstate');
app.tabs[2].fire('click');
assert.equal(el('birthday-dialog').open, true);
el('birthday-okay-one').fire('click');
assert.equal(el('main').dataset.destination, 'envelope');
for (const word of ['birthday', 'BIRTHDAY', 'Birthday', 'bIrThDaY', ' birthday ']) {
  const test = start({ hash: '#unlock' });
  test.elements.get('birthday-word').value = word;
  test.elements.get('birthday-unlock-form').fire('submit');
  assert.equal(test.elements.get('main').dataset.destination, 'cake', word);
  test.document.fire('winter:celebration-complete');
  assert.equal(test.elements.get('main').dataset.destination, 'letter');
}
const locked = start({ hash: '#letter' });
assert.equal(locked.elements.get('main').dataset.destination, 'unlock');
assert.equal(locked.location.hash, '#unlock');
const restored = start({ hash: '#letter', session: app.session });
assert.equal(restored.elements.get('main').dataset.destination, 'letter');
const reduced = start({ hash: '#destination', reducedMotion: true });
reduced.elements.get('birthday-okay-one').fire('click');
reduced.elements.get('open-envelope').fire('click');
assert.equal(reduced.elements.get('main').dataset.destination, 'unlock');
assert.equal(reduced.timers.size, 0);
for (let phase = 0; phase < 3; phase++) {
  const cancel = start({ hash: '#destination' });
  cancel.elements.get('birthday-okay-one').fire('click');
  cancel.elements.get('open-envelope').fire('click');
  for (let i=0; i<phase; i++) cancel.runTimers();
  cancel.tabs[1].fire('click');
  assert.equal(cancel.timers.size, 0, 'Cancelled at phase '+phase);
  cancel.runTimers();
  assert.equal(cancel.elements.get('main').dataset.page, 'home');
  assert.equal(cancel.elements.get('unfold-sheet').hidden, true);
  assert.ok(cancel.animations.every(a=>a.animation.cancelled));
}
const blocked = start({ hash: '#about', rejectSave: true });
blocked.notes[21].fire('click');
blocked.elements.get('note-input').value = '留给自己';
blocked.elements.get('note-form').fire('submit');
assert.match(blocked.elements.get('note-status').textContent, /无法保存/);
assert.equal(start({ hash: '#unexpected' }).elements.get('main').dataset.page, 'home');
console.log('PASS: Single birthday thank-you confirmation; knot untying, flap and expanding paper; case-insensitive puzzle and guarded routes; cake blessing; default China and UK switching; cancellation at every phase; reduced motion; original note storage. DOM logic, not browser rendering.');

const travel = start({hash:'#letter',session:{'winter-birthday-word-solved':'true','winter-birthday-celebrated':'true'}});
const routes=[];travel.document.addEventListener('winter:journey-route',event=>routes.push(event.detail.active));
travel.elements.get('open-journey').fire('click');
assert.equal(travel.location.hash,'#journey');assert.equal(travel.elements.get('main').dataset.destination,'journey');assert.equal(travel.elements.get('main').dataset.page,'destination');assert.equal(travel.elements.get('journey-page').hidden,false);assert.equal(travel.elements.get('letter-page').hidden,true);assert.equal(travel.focused(),travel.elements.get('journey-title'));
travel.window.fire('hashchange');assert.deepEqual(routes,[true],'Duplicate route does not restart journey');
travel.elements.get('journey-return').fire('click');assert.equal(travel.location.hash,'#letter');assert.equal(travel.elements.get('memory-china').hidden,false);assert.deepEqual(routes,[true,false]);assert.equal(travel.focused(),travel.elements.get('open-journey'));
travel.document.fire('winter:journey-afterword');
assert.equal(travel.location.hash,'#afterword');
assert.equal(travel.elements.get('main').dataset.destination,'afterword');
assert.equal(travel.elements.get('journey-afterword').hidden,false);
assert.equal(travel.elements.get('journey-page').hidden,true);
travel.elements.get('afterword-back').fire('click');
assert.equal(travel.location.hash,'#journey');
travel.document.fire('winter:journey-afterword');
travel.elements.get('afterword-home').fire('click');
assert.equal(travel.location.hash,'#home');
const afterwordLocked=start({hash:'#afterword'});
assert.equal(afterwordLocked.location.hash,'#unlock');
const afterwordRestored=start({hash:'#afterword',session:{'winter-birthday-word-solved':'true','winter-birthday-celebrated':'true'}});
assert.equal(afterwordRestored.elements.get('main').dataset.destination,'afterword');
const travelLocked=start({hash:'#journey'});assert.equal(travelLocked.location.hash,'#unlock');
const travelCake=start({hash:'#journey',session:{'winter-birthday-word-solved':'true'}});assert.equal(travelCake.location.hash,'#cake');
const travelRestored=start({hash:'#journey',session:{'winter-birthday-word-solved':'true','winter-birthday-celebrated':'true'}});assert.equal(travelRestored.elements.get('main').dataset.destination,'journey');travelRestored.tabs[1].fire('click');assert.equal(travelRestored.elements.get('journey-page').hidden,true);
console.log('PASS: Journey entry/return, inherited birthday gates, restored deep link, focus and single activation/deactivation events.');
