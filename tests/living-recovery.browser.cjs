const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.WINTER_PREVIEW_URL||'http://127.0.0.1:4173';
const output=process.env.WINTER_REVIEW_DIR||'/tmp/winter-living-recovery';
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({viewport:{width:1000,height:740},hasTouch:true,reducedMotion:'reduce',ignoreHTTPSErrors:true});
  await context.addInitScript(()=>{sessionStorage.setItem('winter-birthday-word-solved','true');sessionStorage.setItem('winter-birthday-celebrated','true')});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/#cake',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.WINTER_LIVING?.status().cake==='ready',null,{timeout:90000});
  await page.waitForFunction(()=>window.WINTER_LIVING.status().lighter==='ready');
  await page.evaluate(()=>{window.winterTestLoss=document.querySelector('.living-cake').getContext('webgl2').getExtension('WEBGL_lose_context');window.winterTestLoss.loseContext()});
  await page.waitForFunction(()=>document.querySelector('#main').dataset.livingCake==='fallback');
  assert.equal(await page.locator('.candles-wide .flame-0').evaluate(e=>e.style.transformOrigin),'680px 200px','Losing 3D restores original photo-wick hit targets');
  await page.waitForTimeout(1300);
  assert.equal(await page.locator('.grand-cake-photograph').evaluate(e=>getComputedStyle(e).opacity),'1');
  await page.screenshot({path:path.join(output,'context-fallback.png')});
  await page.evaluate(()=>window.winterTestLoss.restoreContext());
  await page.waitForFunction(()=>document.querySelector('#main').dataset.livingCake==='ready',null,{timeout:60000});
  await page.waitForFunction(()=>document.querySelector('.candles-wide .flame-0').style.transformOrigin!=='680px 200px');
  const geometry=await page.evaluate(()=>{
   const root=document.querySelector('.candles-wide'),r=document.querySelector('#cake-page').getBoundingClientRect(),matrix=root.getScreenCTM(),status=window.WINTER_LIVING.status();
   return [...root.querySelectorAll('.grand-candle-flame')].map((flame,i)=>{const[x,y]=flame.style.transformOrigin.split(' ').map(parseFloat),p=new DOMPoint(x,y).matrixTransform(matrix),wick=status.cakeWicks[i];return Math.hypot(p.x-r.left-wick.x,p.y-r.top-wick.y)});
  });
  assert.ok(geometry.every(error=>error<1));
  assert.equal(await page.evaluate(()=>window.WINTER_GESTURES.active),false);
  await page.screenshot({path:path.join(output,'context-restored.png')});
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'recovery.json'),JSON.stringify({geometry,errors,passed:true},null,2));
  console.log('PASS: Actual WebGL context loss restores the photographic fallback and original five hit targets; context recovery rebuilds lighting, geometry and aligned 3D targets without starting a camera.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
