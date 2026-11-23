// Serve dist/ locally or set WINTER_PREVIEW_URL to the PR's HTTPS preview.
// Set WINTER_ENGINE=webkit for both 13-inch iPad orientations.
const {chromium, webkit, devices} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const useWebKit = process.env.WINTER_ENGINE === 'webkit';
const touch = useWebKit ? devices['iPad (gen 7)'] : {};
const url = new URL('#cake', process.env.WINTER_PREVIEW_URL || 'http://127.0.0.1:4261/');
const output = process.env.WINTER_REVIEW_DIR || '/tmp/winter-cake-scene';
const cases = useWebKit
  ? [['webkit-ipad-landscape', 1376, 1032], ['webkit-ipad-portrait', 1032, 1376]]
  : [['chromium', 1376, 1032]];
fs.mkdirSync(output, {recursive: true});

async function layout(page) {
  return page.evaluate(() => {
    const box = element => {
      const {x, y, width, height} = element.getBoundingClientRect();
      return {x, y, width, height};
    };
    const plane = document.getElementById('cake-art-slot');
    const candles = plane.dataset.aspect === 'portrait' ? '.candles-tall' : '.candles-wide';
    const wicks = Array.from(plane.querySelectorAll(candles + ' .grand-candle-wick'));
    const rects = {};
    const sources = {};
    for (const [name, selector] of Object.entries({
      scene: '#cake-art-slot', background: '#cake-setting', slab: '#cake-slab',
      cake: '#cake-pastry', lighter: '#grand-lighter', flameAnchor: '#lighter-flame-anchor'
    })) {
      const element = document.querySelector(selector);
      rects[name] = box(element);
      const source = element.getAttribute('src') || element.getAttribute('href');
      if (source) sources[name] = source;
    }
    const controls = {};
    for (const selector of [
      '#winter-cake-camera-enable', '#winter-cake-camera-note', '#winter-cake-preview',
      '.winter-candle-pinch-hint', '.winter-candle-progress', '#winter-gesture-toggle'
    ]) {
      const element = document.querySelector(selector);
      const style = getComputedStyle(element);
      const rect = box(element);
      if (rect.width && rect.height && style.visibility !== 'hidden' && Number(style.opacity) > 0) {
        controls[selector] = rect;
      }
    }
    return {
      aspect: plane.dataset.aspect, rects, sources,
      wicks: wicks.map(box),
      candles: wicks.map(wick => box(wick.parentElement.querySelector('rect'))),
      controls
    };
  });
}

async function exercise(browser, [name, width, height]) {
  const context = await browser.newContext({
    ...touch, viewport: {width, height}, deviceScaleFactor: 1,
    ignoreHTTPSErrors: true
  });
  try {
    await context.grantPermissions(['camera']);
    await context.addInitScript(() => {
      sessionStorage.setItem('winter-birthday-word-solved', 'true');
      window.cameraFrameCount = 0;
      document.addEventListener('winter:hand-frame', () => { ++window.cameraFrameCount; });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(url.origin + '/assets/') && response.status() >= 400) {
        errors.push(response.status() + ' ' + response.url());
      }
    });
    async function tap(selector) {
      const element = page.locator(selector);
      await element.waitFor();
      const bounds = await element.boundingBox();
      assert.ok(bounds, selector + ' can be tapped');
      const x = bounds.x + bounds.width / 2;
      const y = bounds.y + bounds.height / 2;
      if (useWebKit) await page.touchscreen.tap(x, y);
      else await page.mouse.click(x, y);
    }
    const capture = label => page.screenshot({path: path.join(output, name + '-' + label + '.png'), animations: 'disabled'});
    const progress = page.locator('.winter-candle-count');
    const phase = () => page.locator('#cake-page').getAttribute('data-cake-state');

    // Hold the cake resource long enough to verify permission is gated on scene readiness.
    const cakeAsset = width > height ? 'cake-wide' : 'cake-portrait';
    let unblockArtwork;
    const blocked = new Promise(resolve => { unblockArtwork = resolve; });
    await page.route('**/assets/birthday-render/' + cakeAsset + '.webp', async route => {
      await blocked;
      await route.continue();
    });
    try {
      await page.goto(url.href, {waitUntil: 'domcontentloaded'});
      await page.locator('#cake-page[data-scene-ready="false"]').waitFor();
      assert.ok(await page.locator('#winter-cake-camera-enable').isDisabled());
      // Check the alternative entry in the gesture panel has the same guard.
      await tap('#winter-gesture-toggle');
      await tap('#winter-gesture-start');
      assert.match(await page.locator('#winter-gesture-status').textContent(), /等蛋糕场景载入完成/);
      assert.equal(await page.evaluate(() => window.WINTER_GESTURES.active), false);
      await tap('#winter-gesture-minimise');
    } finally {
      unblockArtwork();
    }

    await page.locator('#cake-page[data-scene-ready="true"]').waitFor();
    await page.locator('#main[data-film-ready="cake"]').waitFor({state: 'attached'});
    await page.evaluate(() => document.fonts.ready);
    await capture('camera-off');
    const off = await layout(page);
    assert.equal(off.aspect, width > height ? 'wide' : 'portrait');
    assert.equal(off.wicks.length, 5);
    assert.equal(Object.keys(off.sources).length, 3);
    assert.ok(off.wicks.every(wick => wick.x > 0 && wick.x < width && wick.y > 70 && wick.y < height));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

    function sameGeometry(current, label) {
      for (const key of ['aspect', 'rects', 'sources', 'wicks', 'candles']) {
        assert.deepEqual(current[key], off[key], name + ' ' + label + ' changed ' + key);
      }
    }
    async function openCamera() {
      const lastFrameCount = await page.evaluate(() => window.cameraFrameCount);
      await tap('#winter-cake-camera-enable');
      await page.locator('#main[data-cake-camera="on"]').waitFor({state: 'attached', timeout: 45000});
      sameGeometry(await layout(page), 'camera stream initialization');
      await page.waitForFunction(count => {
        const shell = document.getElementById('main');
        return shell.dataset.cakeHandReady === 'true' && window.cameraFrameCount > count;
      }, lastFrameCount, {timeout: 60000});
      await page.waitForFunction(() => document.getElementById('winter-cake-video').readyState >= 2);
    }
    await openCamera();
    await capture('camera-on');
    const on = await layout(page);
    sameGeometry(on, 'camera after real MediaPipe frames');
    const cameraDevice = await page.evaluate(() => window.WINTER_GESTURES.stream.getVideoTracks()[0].label);
    const preview = on.controls['#winter-cake-preview'];
    assert.ok(preview && preview.width <= 175);

    await tap('#winter-gesture-toggle');
    const previewFrameCount = await page.evaluate(() => window.cameraFrameCount);
    await tap('#winter-cake-preview-toggle');
    await page.locator('#winter-cake-preview[data-visible="false"]').waitFor();
    await page.waitForFunction(count => window.cameraFrameCount > count + 1, previewFrameCount);
    assert.equal(await page.evaluate(() => window.WINTER_GESTURES.active), true);
    sameGeometry(await layout(page), 'small preview hidden');
    await tap('#winter-cake-preview-toggle');
    await page.locator('#winter-cake-preview[data-visible="true"]').waitFor();
    await tap('#winter-gesture-minimise');

    const directTap = useWebKit ? page.touchscreen.tap.bind(page.touchscreen) : page.mouse.click.bind(page.mouse);
    await directTap(on.rects.lighter.x + on.rects.lighter.width / 2, on.rects.lighter.y + on.rects.lighter.height / 2);
    await directTap(on.wicks[0].x, on.wicks[0].y);
    assert.equal((await progress.textContent()).trim(), '0 / 5', 'Neither tapping the lighter nor a wick ignites it');

    async function light(index) {
      // The MediaPipe pipeline is already running on the browser's test camera.
      // Pause its empty frames and replay measured pinch coordinates to test actual wick contact.
      await page.locator('#winter-cake-video').evaluate(video => video.pause());
      return page.evaluate(async ({wick, index}) => {
        const progress = document.querySelector('.winter-candle-count');
        const pause = () => new Promise(resolve => setTimeout(resolve, 25));
        const target = {x: wick.x + wick.width / 2, y: wick.y};
        for (let frame = 0; frame < 38; frame++) {
          document.dispatchEvent(new CustomEvent('winter:hand-frame', {detail: {hands: [{
            hand: 'Right', visible: true, pinching: true,
            x: target.x / innerWidth, y: target.y / innerHeight
          }]}}));
          if (progress.textContent.trim() === (index + 1) + ' / 5') {
            const rect = document.getElementById('lighter-flame-anchor').getBoundingClientRect();
            const tip = {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2};
            return {candle: index + 1, target, tip, distance: Math.hypot(tip.x - target.x, tip.y - target.y)};
          }
          await pause();
        }
        throw new Error('The flame did not reach wick ' + (index + 1) + ' (' + progress.textContent + ')');
      }, {wick: on.wicks[index], index});
    }

    const contacts = [];
    let stopped, restarted;
    for (let index = 0; index < 5; index++) {
      const sample = await light(index);
      assert.ok(sample.distance < 3, 'Rendered flame anchor should reach the physical wick: ' + JSON.stringify(sample));
      contacts.push(sample);
      assert.equal((await progress.textContent()).trim(), (index + 1) + ' / 5');
      if (index < 4) assert.equal(await phase(), 'unlit', 'The celebration must wait for the fifth wick');
      if (index !== 1) continue;
      await tap('#winter-gesture-toggle');
      await tap('#winter-gesture-stop');
      await tap('#winter-gesture-minimise');
      await page.locator('#main[data-cake-camera="off"]').waitFor({state: 'attached'});
      stopped = await layout(page);
      sameGeometry(stopped, 'camera stopped after 2/5');
      assert.equal((await progress.textContent()).trim(), '2 / 5');
      await openCamera();
      restarted = await layout(page);
      sameGeometry(restarted, 'camera restarted after 2/5');
      assert.equal((await progress.textContent()).trim(), '2 / 5');
    }
    await page.locator('#grand-blow-dialog[open]').waitFor();
    await capture('five-lit');
    await tap('#grand-blow-confirm');
    await page.locator('#cake-page[data-cake-state="thanks"]').waitFor();
    await page.locator('#cake-continue').waitFor({timeout: 20000});
    await tap('#cake-continue');
    await page.locator('#main[data-destination="letter"]').waitFor({state: 'attached'});
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, name + '-layout.json'), JSON.stringify({
      engine: browser.browserType().name(), viewport: [width, height], url: url.href,
      off, on, stopped, restarted, contacts, cameraDevice, modelFrames: true, errors
    }, null, 2));
    console.log(name + ' PASS: exact camera-toggle geometry, 5 wick contacts under 3 px, restart at 2/5, blow-out and continuation');
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await (useWebKit ? webkit : chromium).launch(useWebKit ? {headless: true} : {
    headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
      '--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  try {
    for (const options of cases) await exercise(browser, options);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
