const {chromium,webkit,devices}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const engine=process.env.WINTER_ENGINE || 'webkit';
const out=process.env.WINTER_RELIEF_RESULTS || '/tmp/winter-relief-test';
const url=new URL(process.env.WINTER_PREVIEW_URL || 'http://127.0.0.1:4261/');
const entry=new URL(url);
entry.searchParams.set('debug','relief');
entry.hash='home';
const wpe=engine==='webkit';
fs.mkdirSync(out,{recursive:true});

async function swipe(send, x, from, to) {
  await send('touchStart',[{x,y:from,id:1}]);
  for(let i=1;i<=12;i++){
    await new Promise(resolve=>setTimeout(resolve,24));
    await send('touchMove',[{x,y:Math.round(from+(to-from)*i/12),id:1}]);
  }
  await send('touchEnd',[]);
}

async function run(browser, name, viewport) {
  const context=await browser.newContext({
    ...(wpe?devices['iPad (gen 7)']:{}),viewport,
    hasTouch:true,deviceScaleFactor:wpe?2:1,ignoreHTTPSErrors:true,
  });
  try {
    await context.addInitScript(()=>{
      window.reliefTouch={moves:0,scrolls:0};
      document.addEventListener('touchmove',()=>window.reliefTouch.moves++,{passive:true,capture:true});
      document.addEventListener('scroll',event=>{
        if(event.target.id==='panel-home')window.reliefTouch.scrolls++;
      },{passive:true,capture:true});
    });
    const page=await context.newPage();
    page.setDefaultTimeout(25000);
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    if(!wpe)await page.goto(url.href,{waitUntil:'domcontentloaded'});
    if(!wpe)assert.equal(await page.locator('#relief-debug').count(),0);
    await page.goto(entry.href,{waitUntil:'domcontentloaded'});
    const debug=page.locator('#relief-debug');
    const home=page.locator('#panel-home');
    await page.locator('#relief-rail[data-sculpture="live"] .relief-stage canvas').waitFor({timeout:45000});
    await page.waitForFunction(()=>Number(document.getElementById('relief-debug').textContent.match(/FPS ([\d.]+)/)?.[1])>1);
    await page.evaluate(()=>document.fonts.ready);
    const record=await debug.textContent();
    assert.match(record,/WebGL WebGL 2/);
    assert.match(record,/2\/2 摄影原图已加载/);
    assert.match(record,/Shader 无编译错误/);
    assert.match(record,/8 组实体雕塑 \+ WINTER/);
    const shot=async key=>page.screenshot({path:out+'/'+name+'-'+key+'.jpg',quality:92,scale:'css',timeout:35000});
    await shot('diagnostics');
    await page.evaluate(()=>document.getElementById('relief-debug').style.visibility='hidden');
    const stillA=await shot('cover');
    await page.waitForTimeout(2900);
    const stillB=await shot('idle-light');
    assert.notDeepEqual(stillA,stillB,'Stationary light changes are visible');

    const scrollMethod=wpe?'native touch on chapter button':'native touch swipe';
    if(wpe)await page.locator('#relief-enter').tap();
    else {
      const cdp=await context.newCDPSession(page);
      const send=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
      await swipe(send,Math.floor(viewport.width*.77),Math.floor(viewport.height*.79),Math.floor(viewport.height*.20));
    }
    await page.waitForFunction(()=>document.getElementById('panel-home').scrollTop>40);
    const touch=await page.evaluate(()=>({...window.reliefTouch,top:document.getElementById('panel-home').scrollTop}));
    assert.ok(touch.top>40);
    const toward=await debug.textContent();
    if(wpe)console.log(name,scrollMethod,Math.round(touch.top),'CSS px',touch.moves,'touch moves');

    await home.evaluate(node=>node.scrollTo({top:document.getElementById('relief-prints').offsetTop,behavior:'smooth'}));
    await page.waitForFunction(()=>{
      const text=document.getElementById('relief-debug').textContent;
      const z=Number(text.match(/Camera XYZ [-.\d]+, [-.\d]+, ([-.\d]+)/)?.[1]);
      return Math.abs(z-11.35)<.1 && document.querySelectorAll('.relief-print[data-projected=true]').length===2;
    });
    await shot('exhibition');
    const photograph=page.locator('.relief-print-sea');
    await photograph.tap();
    await page.locator('#relief-viewer[open]').waitFor();
    await page.waitForFunction(()=>document.querySelector('#relief-viewer img').naturalWidth===624);
    await page.locator('.relief-viewer-close').tap();
    await page.locator('.relief-to-dedication').tap();
    await page.waitForFunction(()=>document.getElementById('relief-debug').textContent.includes('100.0%'));
    await page.waitForFunction(()=>{
      const pose=document.getElementById('relief-debug').textContent.match(/Camera XYZ [-.\d]+, ([-.\d]+), ([-.\d]+)/);
      return pose && Number(pose[1]) < -24.7 && Math.abs(Number(pose[2])-12.43)<.35;
    });
    await shot('dedication');

    await page.locator('#living-night').tap();
    assert.equal(await page.locator('#main').getAttribute('data-living-time'),'night');
    await page.locator('#living-morning').tap();
    assert.equal(await page.locator('#main').getAttribute('data-living-time'),'morning');
    await page.locator('#view-toggle').tap();
    assert.equal(await page.locator('#main').getAttribute('data-view'),'scenery');
    await page.locator('#view-toggle').tap();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));

    if(name!=='ipad-tall'){
      await page.locator('#motion-toggle').tap();
      await page.locator('#relief-rail[data-sculpture="still"]').waitFor();
      assert.match(await debug.textContent(),/用户暂停动效/);
      assert.equal(await page.evaluate(()=>localStorage.getItem('winter-ambient-motion-paused')),'true');
      await page.locator('#motion-toggle').tap();
      await page.locator('#relief-rail[data-sculpture="live"]').waitFor({timeout:40000});
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.locator('#relief-rail[data-sculpture="still"]').waitFor();
      assert.match(await debug.textContent(),/状态 static · prefers-reduced-motion/);
      assert.equal(await page.locator('#relief-stage canvas').count(),0);
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(out+'/'+name+'.json',JSON.stringify({engine,viewport,debug:record,scrollMethod,touch,toward,errors},null,2));
    console.log(name,record.split('\n')[3],scrollMethod,'PASS');
  } finally {await context.close();}
}

async function fallback(browser, flags, expected) {
  const context=await browser.newContext({viewport:{width:1150,height:830},ignoreHTTPSErrors:true});
  try {
    await context.addInitScript(flags=>{
      if(flags.save)Object.defineProperty(navigator,'connection',{value:{saveData:true}});
      if(flags.memory)Object.defineProperty(navigator,'deviceMemory',{value:2});
      if(flags.shader){
        const original=WebGL2RenderingContext.prototype.shaderSource;
        WebGL2RenderingContext.prototype.shaderSource=function(shader,source){
          return original.call(this,shader,source.includes('litStone') ? source+'\ninvalid_glsl_syntax' : source);
        };
      }
      if(flags.disable){
        const get=HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext=function(type,...options){
          return type==='webgl2'?null:get.call(this,type,...options);
        };
      }
    },flags);
    const page=await context.newPage();
    if(flags.asset)await page.route('**/winter-herbarium.glb',route=>route.fulfill({status:503}));
    if(flags.photo)await page.route('**/memory-17.webp',route=>route.abort());
    await page.goto(entry.href,{waitUntil:'domcontentloaded'});
    await page.locator('#relief-rail[data-sculpture="'+(flags.memory?'live':'still')+'"]').waitFor({timeout:35000});
    const value=await page.locator('#relief-debug').textContent();
    assert.match(value,expected);
    if(flags.asset||flags.disable||flags.photo||flags.shader)assert.equal(await page.locator('.relief-fallback-status').isVisible(),true);
    console.log('Fallback',Object.keys(flags).join(','),'PASS');
  } finally {await context.close();}
}

(async()=>{
  const browser=await (wpe?webkit:chromium).launch(wpe?{headless:true}:{
    headless:true,executablePath:'/usr/bin/chromium',
    args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']
  });
  try {
    if (wpe) {
      await run(browser,'ipad-wide',{width:1376,height:1032});
      await run(browser,'ipad-tall',{width:1032,height:1376});
    } else {
      await run(browser,'chromium',{width:1376,height:1032});
      await fallback(browser,{save:true},/static · Save-Data/);
      await fallback(browser,{memory:true},/状态 live/);
      await fallback(browser,{disable:true},/无法创建 WebGL 2 context/);
      await fallback(browser,{asset:true},/浮雕模型 HTTP 503/);
      await fallback(browser,{photo:true},/无法读取摄影纹理/);
      await fallback(browser,{shader:true},/Shader 编译失败/);
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
