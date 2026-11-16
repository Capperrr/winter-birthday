// Real Chromium/WebGL DOM and geometry checks. Hand positions below are a detector
// fixture, not a claim of testing a physical hand or an iPad running Safari.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.WINTER_PREVIEW_URL || 'http://127.0.0.1:4173';
const output = process.env.WINTER_REVIEW_DIR || '/tmp/winter-living-review';
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const errors = [], missing = [], checks = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) missing.push([response.status(), response.url()]); });
    const status = () => page.evaluate(() => window.WINTER_LIVING.status());
    const ready = async name => { await page.waitForFunction(name => ['ready', 'fallback'].includes(window.WINTER_LIVING?.status()[name]), name, { timeout: 90000 }); assert.equal((await status())[name], 'ready'); console.log('READY ' + name); };
    const shot = name => page.screenshot({ path: path.join(output, name + '.png'), timeout: 60000 });
    await page.goto(base + '/#home', { waitUntil: 'domcontentloaded' }); await ready('home');
    assert.ok((await status()).homeGeometry.vertices > 6000);
    assert.equal((await status()).homeGeometry.dogs.length, 2);
    assert.equal(await page.evaluate(() => !!window.WINTER_GESTURES?.active), false);
    await page.mouse.move(1080, 310);
    await page.waitForFunction(() => Math.abs(window.WINTER_LIVING.status().homeGeometry.parallax[0]) > .05);
    const before = (await status()).homeGeometry.dogs;
    await page.waitForFunction(old => Math.abs(window.WINTER_LIVING.status().homeGeometry.dogs[0].x - old[0].x) > .002, before);
    await page.locator('#motion-toggle').click(); await page.waitForTimeout(250);
    const stopped = (await status()).homeGeometry.time; await page.waitForTimeout(300);
    assert.equal((await status()).homeGeometry.time, stopped, 'The motion switch freezes actual geometry');
    await shot('home-desktop'); checks.push('Photographic relief, two articulated moving puppies, pointer depth and motion freeze');
    // Keep ambient motion paused during the remaining software-GPU layout checks;
    // deliberate touch interactions still animate and the original state gates run.
    await page.locator('#tab-destination').tap();
    await page.locator('#birthday-dialog').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#birthday-dialog button').count(), 1);
    await page.locator('#birthday-okay-one').tap(); await ready('envelope'); await shot('envelope');
    await page.locator('#open-envelope').tap();
    await page.waitForFunction(() => document.querySelector('#main').dataset.destination === 'opening');
    await page.waitForFunction(() => window.WINTER_LIVING.status().envelopePose.flap < -.1);
    checks.push('Touch bow activation and actual hinged flap before the original guarded puzzle');
    await page.waitForFunction(() => document.querySelector('#main').dataset.destination === 'unlock');
    await page.locator('#birthday-word').fill('bIrThDaY');
    await page.locator('#birthday-unlock-form button[type="submit"]').tap();
    await ready('cake'); await ready('lighter');
    console.log('CHECK lighter interaction');
    await page.waitForFunction(() => window.WINTER_LIVING.status().cakeGeometry.width > 900);
    assert.ok((await status()).cakeGeometry.meshes >= 8);
    assert.equal(await page.locator('.grand-candle-flame.candle-is-lit').count(), 0);
    const lighter = page.locator('#grand-lighter'); await lighter.tap();
    await page.waitForFunction(() => window.WINTER_LIVING.status().lighterPose.lid > .8);
    await lighter.tap(); await page.waitForFunction(() => window.WINTER_LIVING.status().lighterPose.lid < .2);
    // Actual touch pointer capture, pointer following, release and return.
    const cdp = await context.newCDPSession(page);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 3, radiusX: 3, radiusY: 3, force: 1 }] });
    const box = await lighter.boundingBox();
    await touch('touchStart', box.x + box.width / 2, box.y + box.height / 2);
    await touch('touchMove', box.x + box.width / 2 - 45, box.y + box.height / 2 - 60);
    await page.waitForFunction(() => window.WINTER_LIVING.status().lighterPose.y < -10);
    await touch('touchEnd'); await page.waitForFunction(() => Math.abs(window.WINTER_LIVING.status().lighterPose.y) < .5);
    assert.equal(await page.locator('.grand-candle-flame.candle-is-lit').count(), 0, 'Inspection cannot bypass hand ignition');
    const cakeCanvas = page.locator('.living-cake'); const cb = await cakeCanvas.boundingBox();
    console.log('CHECK cake touch rotation');
    await touch('touchStart', cb.x + cb.width * .55, cb.y + cb.height * .52);
    await touch('touchMove', cb.x + cb.width * .55 + 45, cb.y + cb.height * .52);
    await page.waitForFunction(() => window.WINTER_LIVING.status().cakeGeometry.angle > .20);
    await touch('touchCancel'); await page.waitForFunction(() => Math.abs(window.WINTER_LIVING.status().cakeGeometry.angle - .13) < .01);
    checks.push('3D cake rotation and cancellable touch lighter lid, following and return; zero shortcut ignitions');
    // Frame/layout assertions at the four deployed device budgets, including all
    // projected wick targets. These exercise the real imported scene, not a stub.
    for (const [name, width, height] of [['desktop', 1440, 1000], ['ipad', 1180, 820], ['phone', 390, 844], ['small', 320, 568]]) {
      console.log('CHECK viewport ' + name);
      await page.setViewportSize({ width, height });
      await page.waitForFunction(w => Math.abs(window.WINTER_LIVING.status().cakeGeometry.width - document.querySelector('#cake-page').clientWidth) < 1 && innerWidth === w, width);
      // The original photographic scene plane has an independent ResizeObserver;
      // wait for both coordinate systems to finish settling before checking them.
      await page.waitForFunction(() => {
        const r = document.querySelector('#cake-page').getBoundingClientRect();
        const root = [...document.querySelectorAll('.grand-candles-overlay')].find(root => getComputedStyle(root).display !== 'none');
        const matrix = root.getScreenCTM();
        return [...root.querySelectorAll('.grand-candle-flame')].every((flame, i) => {
          const [x, y] = flame.style.transformOrigin.split(' ').map(parseFloat), mapped = new DOMPoint(x, y).matrixTransform(matrix), point = window.WINTER_LIVING.status().cakeWicks[i];
          return Math.hypot(point.x - (mapped.x - r.left), point.y - (mapped.y - r.top)) < 1;
        });
      });
      const result = await page.evaluate(() => {
        const page = document.querySelector('#cake-page').getBoundingClientRect();
        const status = window.WINTER_LIVING.status();
        const matrix = [...document.querySelectorAll('.grand-candles-overlay')].find(root => getComputedStyle(root).display !== 'none').getScreenCTM();
        const root = [...document.querySelectorAll('.grand-candles-overlay')].find(root => getComputedStyle(root).display !== 'none');
        const mapped = [...root.querySelectorAll('.grand-candle-flame')].map(flame => { const [x, y] = flame.style.transformOrigin.split(' ').map(parseFloat); const p = new DOMPoint(x, y).matrixTransform(matrix); return { x: p.x - page.left, y: p.y - page.top }; });
        return { width: page.width, height: page.height, overflow: document.body.scrollWidth > innerWidth + 1, wicks: status.cakeWicks, mapped };
      });
      assert.equal(result.overflow, false);
      result.wicks.forEach((wick, i) => {
        assert.ok(wick.x > 0 && wick.x < result.width && wick.y > 110 && wick.y < result.height - 40, 'Reachable wick: ' + name);
        assert.ok(Math.hypot(wick.x - result.mapped[i].x, wick.y - result.mapped[i].y) < 1, 'Visible 3D wick and hand hit target coincide: ' + name + JSON.stringify({wick,mapped:result.mapped[i]}));
      });
      await shot('cake-' + name); checks.push({ name, geometry: result });
    }
    await page.setViewportSize({ width: 1180, height: 820 });
    await page.locator('#winter-cake-camera-enable').tap();
    await page.waitForFunction(() => document.querySelector('#main').dataset.cakeCamera === 'on');
    await page.waitForFunction(() => document.querySelector('#main').dataset.cakeHandReady === 'true', null, { timeout: 90000 });
    await page.waitForTimeout(1300);
    // Stop repeated ML work on the synthetic green video and inject detector
    // coordinate frames. The actual stream/permission gate and five-wick collision
    // handler stay in charge; no completion events or lit classes are fabricated.
    await page.evaluate(() => document.querySelectorAll('video').forEach(v => v.pause()));
    const send = async (x, y, frames = 10) => {
      for (let i = 0; i < frames; i++) {
        await page.evaluate(({ x, y }) => document.dispatchEvent(new CustomEvent('winter:hand-frame', { detail: { hands: [{ visible: true, hand: 'Right', pinching: true, x: x / innerWidth, y: y / innerHeight }] } })), { x, y });
        await page.waitForTimeout(70);
      }
    };
    for (let i = 0; i < 5; i++) {
      const wick = await page.evaluate(i => { const p = window.WINTER_LIVING.status().cakeWicks[i], r = document.querySelector('#cake-page').getBoundingClientRect(); return { x: p.x + r.left, y: p.y + r.top }; }, i);
      await send(wick.x, wick.y + 48, 5); await send(wick.x, wick.y, 12);
      assert.equal(await page.locator('.candles-wide .candle-is-lit').count(), i + 1, 'Only the contacted wick lights');
      await page.waitForFunction(n => window.WINTER_LIVING.status().cakeGeometry.visibleFlames === n, i + 1);
      if (i === 3) await shot('four-lit-wicks');
    }
    await page.locator('#grand-blow-dialog').waitFor({ state: 'visible' }); await shot('five-lit-wicks');
    checks.push('Real camera gate with synthetic video and detector-coordinate fixture: 1/5 → 5/5, then original blow dialog');
    await page.locator('#grand-blow-confirm').tap();
    await page.waitForFunction(() => ['thanks', 'fireworks', 'finished'].includes(document.querySelector('#cake-page').dataset.cakeState));
    await page.locator('#tab-home').tap(); await ready('home');
    assert.equal(await page.evaluate(() => window.WINTER_GESTURES.active), false, 'Camera stops on leaving the birthday scene');
    assert.equal(await page.locator('.living-home').isVisible(), true);
    checks.push('Original blow sequence and navigation return; camera cleanup');
    const fallback = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce', ignoreHTTPSErrors: true });
    await fallback.route('**/assets/living/home-terrain.glb', request => request.abort());
    const fp = await fallback.newPage(); await fp.goto(base + '/#home', { waitUntil: 'domcontentloaded' });
    await fp.waitForFunction(() => document.querySelector('#main').dataset.livingHome === 'fallback', null, { timeout: 60000 });
    assert.equal(await fp.locator('#scene-photo').evaluate(e => getComputedStyle(e).opacity), '1');
    await fp.locator('#tab-about').tap(); assert.equal(await fp.locator('[data-note-id]').count(), 22);
    checks.push('Failed GLB download retains original photography and usable original notes');
    await fallback.close();
    assert.deepEqual(errors, []); assert.deepEqual(missing, []);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ checks, errors, missing, limitations: 'Chromium touch emulation; synthetic video and detector coordinates. No physical iPad/Safari or real-hand accuracy claim.' }, null, 2));
    console.log('PASS: ' + checks.length + ' living-birthday checks, four viewport layouts and original gated candle sequence.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
