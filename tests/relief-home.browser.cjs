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
const originals={bay:[1525,1016],road:[2048,1152],couple:[1920,1080],sand:[2048,1152]};
fs.mkdirSync(out,{recursive:true});

async function swipe(send, start, end, id) {
  const point=(x,y)=>({x:Math.round(x),y:Math.round(y),id});
  await send('touchStart',[point(start.x,start.y)]);
  for(let i=1;i<=10;i++){
    await new Promise(resolve=>setTimeout(resolve,48));
    await send('touchMove',[point(start.x+(end.x-start.x)*i/10,start.y+(end.y-start.y)*i/10)]);
  }
  await new Promise(resolve=>setTimeout(resolve,140));
  // WebKit releases contacts by identifier. Chromium releases its current contacts with an empty list.
  await send('touchEnd',wpe?[point(end.x,end.y)]:[]);
}

function coverContrast(canvas) {
  const poem=document.querySelector('.relief-poem');
  const area=poem.getBoundingClientRect(), stage=canvas.getBoundingClientRect();
  const scale=canvas.width/stage.width;
  const x=Math.floor((area.left-stage.left)*scale);
  const y=Math.floor((stage.bottom-area.bottom)*scale);
  const width=Math.floor(area.width*scale), height=Math.floor(area.height*scale);
  const pixels=new Uint8Array(width*height*4);
  const gl=canvas.getContext('webgl2');
  gl.readPixels(x,y,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  const color=document.createElement('canvas').getContext('2d');
  color.fillStyle=getComputedStyle(poem).color;
  color.fillRect(0,0,1,1);
  const ink=color.getImageData(0,0,1,1).data;
  const linear=Array.from({length:256},(_,i)=>i<11 ? i/3294.6 : ((i/255+.055)/1.055)**2.4);
  const luma=(r,g,b)=>.2126*linear[r]+.7152*linear[g]+.0722*linear[b];
  let brightest=0;
  for(let i=0;i<pixels.length;i+=4){
    if(pixels[i+3]!==255)throw new Error('Missing pixels behind the cover text');
    brightest=Math.max(brightest,luma(pixels[i],pixels[i+1],pixels[i+2]));
  }
  return (luma(...ink)+.05)/(brightest+.05);
}

async function checkPrintMotion(page, send, viewport) {
  const home=page.locator('#panel-home');
  const gallery=home.locator('.relief-window');
  const viewer=home.locator('#relief-viewer');
  const photo=key=>home.locator(`[data-photo="${key}"]`);
  const go=async p=>{
    await home.evaluate((node,progress)=>node.scrollTop=(node.scrollHeight-node.clientHeight)*progress,p);
    await page.waitForFunction(p=>Math.abs(window.WINTER_RELIEF_PROBE.frame().progress-p)<.005,p);
  };
  const center=async key=>{
    const {x,y,width,height}=await photo(key).boundingBox();
    return {x:Math.round(x+width/2),y:Math.round(y+height/2),id:1};
  };
  const select=key=>page.waitForFunction(key=>document.querySelector('.relief-window').dataset.activePhoto===key,key);
  const position=surface=>surface.evaluate(el=>parseFloat(el.style.getPropertyValue('--print-x'))||0);
  const released=surface=>surface.evaluate(el=>new Promise(resolve=>{
    function check(){
      if(parseFloat(el.style.getPropertyValue('--print-x'))) requestAnimationFrame(check);
      else resolve();
    }
    check();
  }));
  const hold=async (key, dx)=>{
    const start=await center(key);
    const end={...start,x:start.x+dx};
    if(send){
      await send('touchStart',[start]);
      for(let step=1;step<=8;step++){
        await send('touchMove',[{...start,x:start.x+Math.round(dx*step/8)}]);
        await page.waitForTimeout(18);
      }
      return ()=>send('touchEnd',wpe?[end]:[]);
    }
    await page.mouse.move(start.x,start.y);
    await page.mouse.down();
    await page.mouse.move(end.x,end.y,{steps:8});
    return ()=>page.mouse.up();
  };

  await go(.36);
  const arrival=await photo('bay').boundingBox();
  await go(.45);
  const nearer=await photo('bay').boundingBox();
  assert.ok(arrival.y-nearer.y>viewport.height*.12,'The arriving photograph takes its own scroll path');
  assert.ok(nearer.width>arrival.width*1.035,'The print has a small scroll-driven depth change');
  await go(.39);
  const base=await photo('bay').boundingBox();
  const letGo=await hold('bay',53);
  const dragged=await photo('bay').boundingBox();
  assert.ok(await position(gallery)>28 && dragged.x>base.x+28,'A short drag moves the print while held');
  await letGo();
  await released(gallery);
  const restored=await photo('bay').boundingBox();
  assert.ok(Math.abs(restored.x-base.x)<1,'The short drag springs back to its starting point');
  assert.equal(await gallery.getAttribute('data-active-photo'),'bay');
  assert.equal(await viewer.getAttribute('open'),null,'Releasing a drag cannot open the original');

  await (await hold('bay',-148))();
  await select('road');
  await released(gallery);
  await (await hold('road',148))();
  await select('bay');
  await released(gallery);
  assert.equal(await viewer.getAttribute('open'),null);
  if(send&&!wpe){
    const start=await center('bay');
    const top=await home.evaluate(el=>el.scrollTop);
    await swipe(send,start,{x:start.x+9,y:start.y-216},1);
    await page.waitForFunction(top=>document.getElementById('panel-home').scrollTop>top+65,top);
    assert.equal(await viewer.getAttribute('open'),null,'A vertical swipe scrolls the Home panel');
  }

  await go(.94);
  for(const key of ['couple','sand']){
    const surface=home.locator('.relief-'+key+'-frame');
    const original=await photo(key).boundingBox();
    const release=await hold(key,key==='couple'?-61:53);
    const moved=await photo(key).boundingBox();
    assert.ok(Math.abs(await position(surface))>20,`${key} follows the pointer`);
    assert.ok(Math.abs(moved.width/moved.height-original.width/original.height)<.004,`${key} keeps its aspect ratio`);
    assert.ok(moved.x>=0&&moved.x+moved.width<=viewport.width+1,`${key} stays fully in the viewport`);
    await release();
    await released(surface);
    assert.equal(await viewer.getAttribute('open'),null);
  }
}

async function run(browser, name, viewport, touch) {
  const context=await browser.newContext({
    ...(touch?devices['iPad (gen 7)']:{}),viewport,hasTouch:touch,
    deviceScaleFactor:wpe?2:1,ignoreHTTPSErrors:true
  });
  try {
    await context.addInitScript(()=>{
      window.testTouch={starts:0,moves:0,ends:0,prevented:0};
      for(const [event,count] of [['touchstart','starts'],['touchmove','moves'],['touchend','ends']]){
        document.addEventListener(event,e=>{if(e.isTrusted)window.testTouch[count]++;},{passive:true,capture:true});
      }
      document.addEventListener('touchmove',e=>{if(e.defaultPrevented)window.testTouch.prevented++;},{passive:true});
    });
    const page=await context.newPage();
    page.setDefaultTimeout(33000);
    const errors=[];
    const responses={};
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{
      const match=new URL(response.url()).pathname.match(/\/assets\/home\/(\w+)-original\.jpeg$/);
      if(match)responses[match[1]]=response.status();
    });
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
    assert.match(info,/A Secret Winter Garden · 33 组实体浮雕贯穿 Home/);
    assert.match(info,/2720 × 1800 Cycles 法线与环境遮蔽/);
    assert.match(info,/896 × 704 局部投影/);
    const fullScreen=()=>canvas.evaluate(canvas=>{
      const {left,top,right,bottom}=canvas.getBoundingClientRect();
      const style=getComputedStyle(document.querySelector('.site-header'));
      return {left,top,right,bottom,width:innerWidth,height:innerHeight,header:style.backgroundColor};
    });
    const wall=await fullScreen();
    assert.deepEqual(wall,{left:0,top:0,right:viewport.width,bottom:viewport.height,
      width:viewport.width,height:viewport.height,header:'rgba(0, 0, 0, 0)'});
    const resolution=[viewport.width,viewport.height].map(size=>size*(wpe?2:1));
    assert.deepEqual((await read()).resolution,resolution,'The drawing buffer starts at display pixel density');
    await page.evaluate(()=>document.getElementById('relief-debug').style.visibility='hidden');
    const rest=await shot('study-rest');
    const motifs=await getMotifs();
    assert.ok(motifs.some(({name})=>name==='Hellebore_below_the_wagtails'));
    assert.ok(motifs.some(({name})=>name==='Winter_crystal_between_the_wings'));
    assert.ok(motifs.some(({name})=>name==='Snow_above_the_left_bird'));
    assert.ok(motifs.some(({name})=>name==='Small_snowflake_between_the_birds'));
    const quiet=await page.evaluate(motifs=>motifs.map(({screen})=>window.WINTER_RELIEF_PROBE.sample(...screen)),motifs);
    assert.ok(quiet.every(({height,shadow})=>height===0&&shadow===0),'The initial wall has no raised motifs or cast shadows');
    await page.waitForFunction(()=>window.WINTER_RELIEF_PROBE.frame().trace==='auto');
    const firstAuto=await read();
    assert.ok(firstAuto.seconds>=5,'The first automatic stroke follows five quiet seconds');
    await page.waitForFunction(motifs=>motifs.some(({screen})=>window.WINTER_RELIEF_PROBE.sample(...screen).height>.10),motifs);
    const animated=await page.evaluate(motifs=>motifs.filter(({screen})=>window.WINTER_RELIEF_PROBE.sample(...screen).height>.10).length,motifs);
    assert.ok(animated>0&&animated<motifs.length/2,'The automatic stroke stays local');
    const ambient=await shot('study-auto');
    assert.notDeepEqual(rest,ambient);
    const idle=await read();
    const point=motifs.find(motif=>motif.name==='Bird_on_the_branch').screen;
    const control=motifs.find(motif=>motif.name==='The_arriving_bird').screen;
    const feathers=motifs.find(motif=>motif.name==='Primary_flight_feathers').screen;
    assert.ok(point[0]>.13&&point[0]<.49&&control[0]>.51&&control[0]<.87,'Both birds stay in the frame');
    assert.ok(feathers[1]<control[1]-.10,'The high wing is in frame above the arriving bird');
    await page.waitForFunction(points=>{
      const probe=window.WINTER_RELIEF_PROBE;
      return probe.frame().trace==='decay'&&points.every(point=>{
        const {height,shadow}=probe.sample(...point);
        return height===0&&shadow===0;
      });
    },[point,control],{polling:130});
    const before=await sample(point);
    const otherBefore=await sample(control);
    const position=await canvas.boundingBox();
    const end={x:position.x+position.width*point[0],y:position.y+position.height*point[1]};
    const offset=position.width*.055;
    let send;
    if(touch){
      const client=wpe?page._connection.toImpl(page).delegate._pageProxySession:await context.newCDPSession(page);
      send=(type,touchPoints)=>client.send('Input.dispatchTouchEvent',{type,touchPoints,modifiers:0});
      await swipe(send,{x:end.x-offset,y:end.y},end,1);
    }else{
      await page.mouse.move(end.x-offset,end.y);
      await page.mouse.move(end.x,end.y,{steps:8});
      await page.waitForTimeout(580);
    }
    const lifted=await sample(point);
    const aspect=viewport.width/viewport.height;
    const wallWidth=2*Math.tan(19*Math.PI/180)*(await read()).camera[2]*aspect;
    const previousRadius=1.36*Math.max(.77,Math.min(1,aspect/1.05));
    const wider=await sample([point[0]+previousRadius/wallWidth,point[1]]);
    const otherAfter=await sample(control);
    assert.equal(before.shadow,0);
    assert.ok(lifted.height>before.height+.38,name+' GPU height: '+JSON.stringify({before,lifted}));
    assert.ok(lifted.shadow>before.shadow+.08,name+' projected shadow: '+JSON.stringify({before,lifted}));
    assert.ok(wider.height>.18,'The wider brush lifts the plaster at the previous stroke radius');
    assert.equal(otherAfter.height,otherBefore.height,'The untouched arriving bird stays flat');
    assert.equal(otherAfter.shadow,otherBefore.shadow,'The untouched arriving bird casts no new shadow');
    await shot('study-lift');
    if(!touch)await page.mouse.move(end.x,4);
    await page.waitForTimeout(2350);
    const released=await sample(point);
    assert.ok(released.height<lifted.height*.28,JSON.stringify({lifted,released}));
    assert.ok(released.shadow<.035,JSON.stringify({lifted,released}));
    await shot('study-release');
    if(send){
      await page.waitForFunction(p=>{
        const probe=window.WINTER_RELIEF_PROBE;
        return probe.frame().trace==='decay'&&probe.sample(...p).height<.08;
      },point,{polling:100});
      await page.touchscreen.tap(position.width*control[0],position.height*control[1]);
      await page.waitForFunction(p=>window.WINTER_RELIEF_PROBE.sample(...p).height>.18,control,{polling:100});
      assert.ok((await sample(point)).height<.10,'A tap on the right leaves the left bird at rest');
      await swipe(send,{x:position.x+position.width*.66,y:position.y+position.height*.80},
        {x:position.x+position.width*.66,y:position.y+position.height*.24},2);
      if(!wpe)await page.waitForFunction(()=>document.getElementById('panel-home').scrollTop>40);
    }
    const native=await page.evaluate(()=>({...window.testTouch,top:document.getElementById('panel-home').scrollTop}));
    if(send)assert.ok(native.moves>=5&&native.prevented===0);
    if(send&&!wpe)assert.ok(native.top>40);
    if(touch)assert.ok(native.starts>=1&&native.ends>=1);
    console.log(name,'GPU brush',JSON.stringify({idle:idle.fps,before,lifted,released,native}));

    const captions=[];
    const poses=[];
    await page.goto(entry.href,{waitUntil:'domcontentloaded'});
    await page.locator('#relief-rail[data-sculpture="live"] canvas').waitFor({timeout:45000});
    await shot('diagnostics');
    await page.evaluate(()=>document.getElementById('relief-debug').style.visibility='hidden');
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForFunction(()=>document.querySelectorAll('.relief-print[data-photo-state="ready"]').length===4);
    assert.deepEqual(await fullScreen(),wall);
    assert.doesNotMatch(await home.textContent(),/原图待接入/);
    await shot('cover');
    assert.equal(await page.locator('.relief-panel[data-current="true"] .relief-print').count(),0);
    assert.deepEqual(await page.locator('.relief-poem span').allTextContents(),['像阵风掠过就无踪影','像束光温暖地照耀你']);
    const navigate=locator=>touch?locator.tap():locator.click();
    await navigate(page.locator('#living-night'));
    assert.equal(await page.locator('#main').getAttribute('data-living-time'),'night');
    await page.waitForFunction(()=>window.WINTER_RELIEF_PROBE.frame().night===1);
    assert.ok((await read()).light[0]>.8,'Moonlight reverses the direction of the key light');
    assert.deepEqual((await read()).resolution,resolution,'Night and touch keep the same sharp drawing buffer');
    const nightContrast=await canvas.evaluate(coverContrast);
    assert.ok(nightContrast>=4.5,`Night cover text needs a 4.5:1 contrast ratio, received ${nightContrast}`);
    assert.deepEqual(await home.locator('.relief-print img').evaluateAll(images=>images.map(image=>getComputedStyle(image).filter)),
      ['none','none','none','none'],'Night lighting never tints the original photographs');
    await shot('cover-night');
    await navigate(page.locator('#living-morning'));
    await page.waitForFunction(()=>window.WINTER_RELIEF_PROBE.frame().night===0);
    assert.ok((await read()).light[0]<-.65);
    await navigate(page.locator('.relief-next'));
    await page.waitForFunction(()=>window.WINTER_RELIEF_PROBE.frame().goal>.30);
    await checkPrintMotion(page,send,viewport);
    for(const [at,key,act] of [[.38,'bay',1],[.57,'road',1],[.74,'couple',2],[.97,'sand',2]]){
      await home.evaluate((node,p)=>node.scrollTop=(node.scrollHeight-node.clientHeight)*p,at);
      await page.waitForFunction(p=>Math.abs(window.WINTER_RELIEF_PROBE.frame().progress-p)<.012,at);
      assert.deepEqual(await fullScreen(),wall);
      assert.equal(await page.locator('#relief-rail').getAttribute('data-relief-chapter'),String(act));
      assert.equal(await page.locator('.relief-panel[data-current="true"]').count(),1);
      assert.ok((await getMotifs()).length>=2,`The stone cast persists under ${key}`);
      if(at===.38||at===.74){
        const start=(await read()).renderedFrames;
        await page.waitForFunction(({p,start})=>{
          const frame=window.WINTER_RELIEF_PROBE.frame();
          return Math.abs(frame.progress-p)<.012 && frame.renderedFrames>start && frame.automaticStroke;
        },{p:at,start});
      }
      const photo=page.locator('[data-photo="'+key+'"]');
      const exhibit=await photo.evaluate(node=>{
        const img=node.querySelector('img'), box=node.getBoundingClientRect();
        return {fit:getComputedStyle(img).objectFit,source:img.getAttribute('src'),width:img.naturalWidth,
          height:img.naturalHeight,hidden:node.inert,top:box.top,bottom:box.bottom};
      });
      assert.equal(exhibit.fit,'contain');
      assert.equal(exhibit.hidden,false);
      assert.ok(exhibit.top>=0&&exhibit.bottom<=viewport.height+1,JSON.stringify(exhibit));
      const asset='assets/home/'+key+'-original.jpeg';
      assert.equal(exhibit.source,asset);
      assert.deepEqual([exhibit.width,exhibit.height],originals[key]);
      assert.equal(await photo.isEnabled(),true);
      await shot(key);
      await navigate(photo);
      const opened=page.locator('#relief-viewer[open] img');
      await opened.waitFor();
      const detail=await opened.evaluate(async image=>{
        await image.decode();
        const {width,height}=image.getBoundingClientRect();
        return {url:image.currentSrc,dimensions:[image.naturalWidth,image.naturalHeight],ratio:width/height};
      });
      assert.equal(detail.url,new URL(asset,base).href);
      assert.deepEqual(detail.dimensions,originals[key]);
      assert.ok(Math.abs(detail.ratio-exhibit.width/exhibit.height)<.004);
      if(key==='sand'||key==='couple')await shot(key+'-detail');
      await navigate(page.locator('.relief-viewer-close'));
      await page.locator('#relief-viewer[open]').waitFor({state:'hidden'});
      captions.push({key,...exhibit});
      poses.push((await read()).camera);
    }
    for(const key of Object.keys(originals))assert.ok([200,304].includes(responses[key]),'Photo HTTP response '+key);
    assert.ok(Math.abs(poses[3][1]-poses[0][1])>12,'Camera travels along the continuous wall');
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
    fs.writeFileSync(out+'/'+name+'.json',JSON.stringify({engine,viewport,info,wall,nightContrast,captions,responses,poses,idle,
      quiet,firstAuto,animated,brush:{before,lifted,wider,released,otherBefore,otherAfter},native,errors},null,2));
    console.log(name,'PASS');
  } finally{await context.close();}
}

async function fallback(browser, flag, expected) {
  const context=await browser.newContext({viewport:{width:1150,height:830},deviceScaleFactor:flag==='context'?2:1,
    ignoreHTTPSErrors:true});
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
    if(flag==='model')await page.route('**/winter-herbarium.glb*',route=>route.fulfill({status:503}));
    if(flag==='photo'){
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.route('**/bay-original.jpeg',route=>route.fulfill({status:503}));
    }
    await page.goto(entry.href,{waitUntil:'domcontentloaded'});
    await page.locator('#relief-rail[data-sculpture="still"]').waitFor({timeout:35000});
    assert.match(await page.locator('#relief-debug').textContent(),expected);
    assert.equal(await page.locator('.relief-fallback-status').isVisible(),flag!=='save'&&flag!=='photo');
    if(flag==='context'){
      const dimensions=await page.locator('.relief-garden-poster img').evaluateAll(images=>Promise.all(images.map(async img=>{
        await img.decode();
        const full=new Image();
        full.src=img.currentSrc;
        await full.decode();
        return [full.naturalWidth,full.naturalHeight];
      })));
      assert.deepEqual(dimensions,[[3840,2160],[3840,2160]],'Both resting modes load the Retina posters');
    }
    await page.locator('.relief-next').click();
    await page.waitForFunction(()=>document.getElementById('panel-home').scrollTop>40);
    if(flag==='context'){
      const home=page.locator('#panel-home');
      const gallery=page.locator('.relief-window');
      const plates=await page.locator('.relief-archive-wall').evaluateAll(elements=>Promise.all(
        elements.flatMap(el=>['::before','::after'].map(async side=>{
          const src=getComputedStyle(el,side).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
          const img=new Image();
          img.src=src;
          await img.decode();
          return img.naturalWidth;
        }))));
      assert.ok(plates.every(width=>width>=1170),'Morning and Night retain a rendered wall across all three acts');
      const pose=async delta=>{
        await home.evaluate(async (el,offset)=>{
          el.scrollTo({top:el.scrollTop+el.querySelector('#relief-landscapes').getBoundingClientRect().top+offset,
            behavior:'instant'});
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        },delta);
        return gallery.evaluate(el=>({width:el.getBoundingClientRect().width,
          travel:parseFloat(getComputedStyle(el).getPropertyValue('--landscape-travel'))||0}));
      };
      const approaching=await pose(-300);
      const centered=await pose(0);
      assert.ok(centered.travel-approaching.travel>29,'The photographic window has its own scroll position without WebGL');
      assert.ok(centered.width-approaching.width>4,'A flat plaster wall still allows a small photo depth change');
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.waitForFunction(()=>!document.querySelector('#relief-rail').style.getPropertyValue('--landscape-travel'));
      const quiet=await pose(-300);
      assert.equal(quiet.travel,0,'Reduced motion keeps the window in its natural flow');
      assert.equal(quiet.width,(await pose(0)).width);
    }
    if(flag==='photo'){
      const bay=page.locator('[data-photo="bay"]');
      assert.equal(await bay.isDisabled(),true);
      assert.equal(await bay.locator('.relief-photo-error').isVisible(),true);
      await page.locator('[data-photo="road"][data-photo-state="ready"]').waitFor();
    }
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
      await fallback(browser,'context',/无法创建 WebGL 2 context/);
    }else{
      await run(browser,'desktop',{width:1280,height:900},false);
      await run(browser,'touch-scroll',{width:1080,height:810},true);
      await fallback(browser,'save',/static · Save-Data/);
      await fallback(browser,'context',/无法创建 WebGL 2 context/);
      await fallback(browser,'model',/浮雕模型 HTTP 503/);
      await fallback(browser,'shader',/Shader 编译失败/);
      await fallback(browser,'photo',/prefers-reduced-motion/);
    }
  } finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
