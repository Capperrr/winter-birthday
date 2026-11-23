const {chromium,webkit,devices}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const engine=process.env.WINTER_ENGINE || 'chromium';
const out=process.env.WINTER_RELIEF_RESULTS || '/tmp/winter-relief-test';
const base=new URL(process.env.WINTER_PREVIEW_URL || 'http://127.0.0.1:4261/');
const entry=new URL(base);
entry.searchParams.set('debug','relief');
entry.hash='home';
const study=new URL(entry);
study.searchParams.set('study','relief');
const wpe=engine==='webkit';
fs.mkdirSync(out,{recursive:true});

async function swipe(client, start, end, id) {
  const send=(type,touchPoints)=>client.send('Input.dispatchTouchEvent',{type,touchPoints});
  await send('touchStart',[{x:start.x,y:start.y,id}]);
  for(let i=1;i<=10;i++){
    await new Promise(resolve=>setTimeout(resolve,48));
    await send('touchMove',[{x:start.x+(end.x-start.x)*i/10,y:start.y+(end.y-start.y)*i/10,id}]);
  }
  await new Promise(resolve=>setTimeout(resolve,140));
  await send('touchEnd',[]);
}

async function run(browser, name, viewport, touch) {
  const context=await browser.newContext({
    ...(touch?devices['iPad (gen 7)']:{}),viewport,hasTouch:touch,
    deviceScaleFactor:wpe?2:1,ignoreHTTPSErrors:true
  });
  try {
    await context.addInitScript(()=>{
      window.testTouch={starts:0,moves:0,ends:0};
      for(const [event,count] of [['touchstart','starts'],['touchmove','moves'],['touchend','ends']]){
        document.addEventListener(event,()=>window.testTouch[count]++,{passive:true,capture:true});
      }
    });
    const page=await context.newPage();
    page.setDefaultTimeout(33000);
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(study.href,{waitUntil:'domcontentloaded'});
    const debug=page.locator('#relief-debug');
    const home=page.locator('#panel-home');
    const canvas=page.locator('#relief-stage canvas');
    const shot=key=>page.screenshot({path:out+'/'+name+'-'+key+'.jpg',quality:92,scale:'css',timeout:35000});
    const read=()=>page.evaluate(()=>window.WINTER_RELIEF_PROBE.frame());
    const sample=point=>page.evaluate(p=>window.WINTER_RELIEF_PROBE.sample(...p),point);
    const getMotifs=()=>page.evaluate(()=>window.WINTER_RELIEF_PROBE.motifs());
    await page.locator('#relief-rail[data-sculpture="live"] .relief-stage canvas').waitFor({timeout:45000});
    assert.equal(await page.locator('.relief-cover-content').isVisible(),false);
    const info=await debug.textContent();
    assert.match(info,/WebGL WebGL 2/);
    assert.match(info,/Shader 无编译错误/);
    assert.match(info,/256 × 256 GPU 双缓冲/);
    await page.evaluate(()=>document.getElementById('relief-debug').style.visibility='hidden');
    const rest=await shot('study-rest');
    await page.waitForFunction(()=>window.WINTER_RELIEF_PROBE.frame().trace==='auto');
    const ambient=await shot('study-auto');
    assert.notDeepEqual(rest,ambient);
    const idle=await read();
    const motifs=await getMotifs();
    assert.ok(motifs.length>=2);
    const point=motifs.at(-1).screen;
    const control=motifs[0].screen;
    const before=await sample(point);
    const otherBefore=await sample(control);
    const position=await canvas.boundingBox();
    const end={x:position.x+position.width*point[0],y:position.y+position.height*point[1]};
    const offset=position.width*.055;
    let client;
    if(touch && !wpe){
      client=await context.newCDPSession(page);
      await swipe(client,{x:end.x-offset,y:end.y},end,1);
    }else if(touch){
      await page.touchscreen.tap(end.x,end.y);
      await page.waitForFunction(({point,height})=>window.WINTER_RELIEF_PROBE.sample(...point).height>height+.046,
        {point,height:before.height},{polling:100});
    }else{
      await page.mouse.move(end.x-offset,end.y);
      await page.mouse.move(end.x,end.y,{steps:8});
      await page.waitForTimeout(580);
    }
    const lifted=await sample(point);
    const otherAfter=await sample(control);
    assert.ok(lifted.height>before.height+.046,name+' GPU height: '+JSON.stringify({before,lifted}));
    assert.ok(lifted.shadow>before.shadow+.0009,name+' projected shadow: '+JSON.stringify({before,lifted}));
    assert.ok(Math.abs(otherAfter.height-otherBefore.height)<lifted.height*.76,'Lift stays local to the stroke');
    await shot('study-lift');
    if(!touch)await page.mouse.move(end.x,4);
    await page.waitForTimeout(1600);
    const released=await sample(point);
    assert.ok(released.height<lifted.height*.84,JSON.stringify({lifted,released}));
    assert.ok(released.shadow<lifted.shadow,JSON.stringify({lifted,released}));
    if(client){
      await swipe(client,{x:position.x+position.width*.66,y:position.y+position.height*.80},
        {x:position.x+position.width*.66,y:position.y+position.height*.24},2);
      await page.waitForFunction(()=>document.getElementById('panel-home').scrollTop>40);
    }
    const native=await page.evaluate(()=>({...window.testTouch,top:document.getElementById('panel-home').scrollTop}));
    if(client)assert.ok(native.moves>=5&&native.top>40);
    if(touch)assert.ok(native.starts>=1&&native.ends>=1);
    console.log(name,'GPU brush',JSON.stringify({idle:idle.fps,before,lifted,released,native}));

    const captions=[];
    const poses=[];
    await page.goto(entry.href,{waitUntil:'domcontentloaded'});
    await page.locator('#relief-rail[data-sculpture="live"] canvas').waitFor({timeout:45000});
    await shot('diagnostics');
    await page.evaluate(()=>document.getElementById('relief-debug').style.visibility='hidden');
    await page.evaluate(()=>document.fonts.ready);
    await shot('cover');
    assert.equal(await page.locator('.relief-panel[data-current="true"] .relief-print').count(),0);
    assert.deepEqual(await page.locator('.relief-poem span').allTextContents(),['像阵风掠过就无踪影','像束光温暖地照耀你']);
    const navigate=locator=>touch?locator.tap():locator.click();
    await navigate(page.locator('.relief-next'));
    await page.waitForFunction(()=>window.WINTER_RELIEF_PROBE.frame().goal>.30);
    for(const [at,key,act] of [[.38,'bay',1],[.57,'road',1],[.74,'couple',2],[.97,'sand',2]]){
      await home.evaluate((node,p)=>node.scrollTop=(node.scrollHeight-node.clientHeight)*p,at);
      await page.waitForFunction(p=>Math.abs(window.WINTER_RELIEF_PROBE.frame().progress-p)<.012,at);
      assert.equal(await page.locator('#relief-rail').getAttribute('data-relief-chapter'),String(act));
      assert.equal(await page.locator('.relief-panel[data-current="true"]').count(),1);
      const photo=page.locator('[data-photo="'+key+'"]');
      const exhibit=await photo.evaluate(node=>{
        const img=node.querySelector('img'), box=node.getBoundingClientRect();
        return {fit:getComputedStyle(img).objectFit,source:img.getAttribute('src'),width:img.naturalWidth,
          height:img.naturalHeight,hidden:node.inert,top:box.top,bottom:box.bottom};
      });
      assert.equal(exhibit.fit,'contain');
      assert.equal(exhibit.hidden,false);
      assert.ok(exhibit.top>=0&&exhibit.bottom<=viewport.height+1,JSON.stringify(exhibit));
      if(exhibit.source){
        assert.ok(exhibit.width>0&&exhibit.height>0);
        await navigate(photo);
        await page.locator('#relief-viewer[open]').waitFor();
        await navigate(page.locator('.relief-viewer-close'));
      }else assert.equal(await photo.isDisabled(),true);
      captions.push({key,...exhibit});
      poses.push((await read()).camera);
      await shot(key);
    }
    assert.ok(Math.abs(poses[3][1]-poses[0][1])>12,'Camera travels along the continuous wall');
    await navigate(page.locator('#living-night'));
    assert.equal(await page.locator('#main').getAttribute('data-living-time'),'night');
    await navigate(page.locator('#living-morning'));
    await navigate(page.locator('#view-toggle'));
    assert.equal(await page.locator('#main').getAttribute('data-view'),'scenery');
    await navigate(page.locator('#view-toggle'));
    assert.equal(await page.locator('#main').getAttribute('data-view'),'cover');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(!wpe){
      await navigate(page.locator('#motion-toggle'));
      await page.locator('#relief-rail[data-sculpture="still"]').waitFor();
      assert.match(await debug.textContent(),/用户暂停动效/);
      await navigate(page.locator('#motion-toggle'));
      await page.locator('#relief-rail[data-sculpture="live"]').waitFor({timeout:40000});
    }
    await navigate(page.locator('#relief-enter'));
    await page.locator('#main[data-page="destination"]').waitFor();
    await canvas.waitFor({state:'detached'});
    await page.emulateMedia({reducedMotion:'reduce'});
    const standard=new URL(base);
    standard.hash='home';
    await page.goto(standard.href,{waitUntil:'domcontentloaded'});
    await page.locator('#relief-rail[data-sculpture="still"]').waitFor();
    assert.equal(await canvas.count(),0);
    assert.equal(await debug.count(),0);
    assert.deepEqual(errors,[]);
    fs.writeFileSync(out+'/'+name+'.json',JSON.stringify({engine,viewport,info,captions,poses,idle,
      brush:{before,lifted,released},native,errors},null,2));
    console.log(name,'PASS');
  } finally{await context.close();}
}

async function fallback(browser, flag, expected) {
  const context=await browser.newContext({viewport:{width:1150,height:830},ignoreHTTPSErrors:true});
  try {
    await context.addInitScript(flag=>{
      if(flag==='save')Object.defineProperty(navigator,'connection',{value:{saveData:true}});
      if(flag==='shader'){
        const shaderSource=WebGL2RenderingContext.prototype.shaderSource;
        WebGL2RenderingContext.prototype.shaderSource=function(shader,source){
          return shaderSource.call(this,shader,source.includes('float inkAt(')?source+'\ninvalid_glsl_syntax':source);
        };
      }
      if(flag==='context'){
        const getContext=HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext=function(type,...args){
          return type==='webgl2'?null:getContext.call(this,type,...args);
        };
      }
    },flag);
    const page=await context.newPage();
    if(flag==='model')await page.route('**/winter-herbarium.glb',route=>route.fulfill({status:503}));
    await page.goto(entry.href,{waitUntil:'domcontentloaded'});
    await page.locator('#relief-rail[data-sculpture="still"]').waitFor({timeout:35000});
    assert.match(await page.locator('#relief-debug').textContent(),expected);
    assert.equal(await page.locator('.relief-fallback-status').isVisible(),flag!=='save');
    await page.locator('.relief-next').click();
    await page.waitForFunction(()=>document.getElementById('panel-home').scrollTop>40);
    console.log('Fallback',flag,'PASS');
  } finally{await context.close();}
}

(async()=>{
  const browser=await (wpe?webkit:chromium).launch(wpe?{headless:true}:{
    headless:true,executablePath:'/usr/bin/chromium',
    args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']
  });
  try {
    if(wpe){
      await run(browser,'ipad-landscape',{width:1376,height:1032},true);
      await run(browser,'ipad-portrait',{width:1032,height:1376},true);
    }else{
      await run(browser,'desktop',{width:1280,height:900},false);
      await run(browser,'touch-scroll',{width:1080,height:810},true);
      await fallback(browser,'save',/static · Save-Data/);
      await fallback(browser,'context',/无法创建 WebGL 2 context/);
      await fallback(browser,'model',/浮雕模型 HTTP 503/);
      await fallback(browser,'shader',/Shader 编译失败/);
    }
  } finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
