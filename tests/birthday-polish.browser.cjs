// Run against an isolated static preview: WINTER_PREVIEW_URL=http://127.0.0.1:4173 node tests/birthday-polish.browser.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.WINTER_PREVIEW_URL||'http://127.0.0.1:4173';
const output=process.env.WINTER_REVIEW_DIR||'/tmp/winter-birthday-polish';
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const errors=[];const checks=[];
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true,ignoreHTTPSErrors:true});
 await context.addInitScript(()=>{sessionStorage.setItem('winter-birthday-word-solved','true');sessionStorage.setItem('winter-birthday-celebrated','true')});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const screenshot=name=>page.screenshot({path:path.join(output,name+'.png'),timeout:45000});
 const goto=async route=>{await page.goto(base+'/#'+route,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForTimeout(1100);};
 await goto('cake');await page.waitForFunction(()=>document.querySelector('#main').dataset.cakeCutout==='ready');
 await page.locator('#winter-cake-camera-enable').click();
 await page.waitForFunction(()=>document.querySelector('#main').dataset.cakeCamera==='on');
 await page.waitForTimeout(1000);await page.locator('#grand-lighter').dispatchEvent('click');await page.evaluate(()=>document.querySelectorAll('video').forEach(video=>video.pause()));
 for(const [name,width,height] of [['desktop',1440,1000],['ipad',1180,820],['phone',390,844],['small',320,568]]){
  await page.setViewportSize({width,height});await page.waitForFunction(()=>document.querySelector('#main').dataset.cakeCutout==='ready');await page.waitForTimeout(250);
  const geometry=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect().toJSON();return{bodyWidth:document.body.scrollWidth,viewport:innerWidth,nav:r('.glass-nav'),button:r('#winter-cake-camera-enable'),canvas:r('.grand-cake-cutout'),resolution:[document.querySelector('.grand-cake-cutout').width,document.querySelector('.grand-cake-cutout').height],phase:document.querySelector('#cake-page').dataset.cakeState,progress:document.querySelector('.winter-candle-progress').textContent}});
  assert.ok(geometry.bodyWidth<=width+1,'No horizontal document overflow: '+name);
  // When model loading has completed the camera button is hidden, so inspect its placement on the initial view below.
  assert.equal(geometry.phase,'unlit');assert.equal(geometry.progress.trim(),'0 / 5');
  assert.deepEqual(geometry.resolution,width<=760?[1024,1536]:[1536,1024]);
  await screenshot(name+'-camera');checks.push({name,geometry});
 }
 await page.setViewportSize({width:390,height:844});await goto('home');await goto('cake');await page.locator('#winter-cake-camera-enable').waitFor();
 const button=await page.locator('#winter-cake-camera-enable').boundingBox(),nav=await page.locator('.glass-nav').boundingBox();
 assert.ok(button.y>=nav.y+nav.height+8,'Camera button clears the phone navigation');assert.ok(button.height>=44);
 await screenshot('phone-cake');
 await goto('about');
 assert.equal(await page.locator('[data-note-id]').count(),22);
 const title=await page.locator('.about-heading').boundingBox(),board=await page.locator('.notes-board').boundingBox(),rail=await page.locator('.rail-left').boundingBox();
 assert.ok(board.y>=title.y+title.height,'About title precedes the notes');assert.ok(rail.y>=board.y+board.height-2,'Mobile photos follow the notes');
 await page.locator('[data-note-id="1"]').click();await page.locator('#note-input').fill('25岁的我，愿你仍然热爱生活。');await page.locator('#note-form button[type="submit"]').click();
 assert.ok((await page.locator('[data-note-id="1"] .note-text').textContent()).includes('愿你仍然热爱生活'));
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(1200);assert.ok((await page.locator('[data-note-id="1"] .note-text').textContent()).includes('愿你仍然热爱生活'));
 await screenshot('phone-about');
 await page.setViewportSize({width:1440,height:1000});await goto('about');await screenshot('desktop-about');
 const signatures=await page.locator('.gwen-note-signatures').boundingBox(),notes=await page.locator('.notes-board').boundingBox();assert.ok(signatures.y>=notes.y+notes.height,'Ink never covers note content');
 await goto('finale');await page.locator('#finale-piece-left').click();await page.locator('#finale-piece-right').click();await page.locator('#finale-phone-start').waitFor({state:'visible',timeout:12000});
 await page.locator('#finale-phone-start').click();await page.locator('#winter-shutter').click();
 await page.locator('#winter-lock-notification').waitFor({state:'visible',timeout:12000});
 assert.ok((await page.locator('#winter-lock-notification').textContent()).includes('Gwen'));
 assert.ok((await page.locator('#winter-lock-notification').textContent()).includes('生日快乐，以后的每一个生日都想陪你过。'));
 const key=await page.locator('#winter-phone-power').boundingBox();assert.ok(key.width>=44&&key.height>=44);
 assert.equal(await page.locator('#main').getAttribute('data-phone'),'open');assert.equal(await page.locator('.finale-balloons').evaluate(e=>getComputedStyle(e).opacity),'0');
 await screenshot('desktop-phone');
 await page.setViewportSize({width:390,height:844});await screenshot('phone-lock');
 await page.locator('#winter-phone-reset').click();await page.waitForTimeout(1300);assert.equal(await page.locator('#winter-lock-notification').isVisible(),false);
 await page.locator('#winter-shutter').click();await page.locator('#winter-lock-notification').waitFor({state:'visible'});
 await page.locator('#winter-phone-power .phone-power-cursor').click();await page.locator('#winter-cosmos-dialog').waitFor({state:'visible'});
 await page.locator('#cosmos-to-stars').click({timeout:45000});await page.locator('#cosmos-to-apod').click();await page.locator('#cosmos-to-gallery').click();
 assert.equal(await page.locator('.photo-memory').count(),19);
 await page.locator('#cosmos-gallery-to-creator').click();
 assert.equal(await page.locator('#creator-tools-panel').isVisible(),false);
 assert.equal(await page.locator('#creator-tools-toggle').getAttribute('aria-expanded'),'false');
 const draw=await page.locator('#winter-creator-canvas').boundingBox();assert.ok(draw.width>=388,'Mobile canvas uses full width');
 await page.mouse.move(90,300);await page.mouse.down();await page.mouse.move(230,360,{steps:10});await page.mouse.up();
 const hasDrawing=await page.locator('#winter-creator-canvas').evaluate(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return data.some((v,i)=>i%4===3&&v>0)});assert.ok(hasDrawing);
 await page.locator('#creator-tools-toggle').click();assert.equal(await page.locator('#creator-tools-panel').isVisible(),true);
 await page.locator('[data-colour="#e98a73"]').click();assert.equal(await page.locator('[data-colour="#e98a73"]').getAttribute('aria-pressed'),'true');
 await page.locator('#winter-creator-save').click();await page.locator('#winter-art-export-preview').waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('#winter-art-export-preview').naturalWidth>0);
 await screenshot('phone-export');await page.locator('#winter-art-export-close').click();
 await page.locator('#creator-tools-toggle').click();await screenshot('phone-drawing');
 await page.setViewportSize({width:1440,height:1000});assert.equal(await page.locator('#creator-tools-panel').isVisible(),true);await screenshot('desktop-drawing');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({checks,errors},null,2));
 console.log('PASS: Native-resolution camera layers, four viewport budgets, no touch ignition shortcut, phone navigation clearance, 22 editable/persisted notes, author ink clearance, Gwen notification, side-key target and transition, retake cancellation, 19 photos, responsive tool drawer, real canvas drawing and PNG export. Camera input uses a synthetic test video, not real hands.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
