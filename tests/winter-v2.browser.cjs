const {chromium,webkit,devices}=require('playwright');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const fs=require('node:fs');
const base=process.env.WINTER_V2_URL||'http://127.0.0.1:4230/';
const out=process.env.WINTER_V2_REVIEW_DIR||'/tmp/winter-v2-review';
const wpe=process.env.WINTER_ENGINE==='webkit';
const run=process.env.WINTER_V2_RUN||'wide';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await (wpe?webkit:chromium).launch(wpe?{headless:true}:{
   headless:true,executablePath:'/usr/bin/chromium',
   args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']
 });
 try{
 const [width,height] = run==='portrait'?[1032,1376]:run==='phone'?[390,844]:[1376,1032];
 const c=await browser.newContext({...devices['iPad (gen 7)'],viewport:{width,height},hasTouch:true,
   deviceScaleFactor:1,ignoreHTTPSErrors:true,reducedMotion:'no-preference'});
 await c.addInitScript(()=>{
   sessionStorage.setItem('winter-birthday-word-solved','true');
   sessionStorage.setItem('winter-birthday-celebrated','true');
 });
 const p=await c.newPage();p.setDefaultTimeout(14000);
 const errors=[]; const assetErrors=[];
 p.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message)});
 p.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base)){assetErrors.push(r.url());console.log('HTTP',r.status(),r.url());}});
 let shots = 0;
 async function shot(key,extra='') {
  const active=p.locator('.film-shot[data-shot="'+key+'"][data-exposure="in"]');
  await active.waitFor({state:'attached'});
  await p.waitForFunction(name=>!!document.querySelector('.film-shot[data-exposure="in"][data-shot="'+name+'"] img') &&
   [...document.querySelectorAll('.film-shot[data-exposure="in"][data-shot="'+name+'"] .film-texture')].every(x=>x.naturalWidth>0),key);
  const roles=await active.locator('.film-plane').evaluateAll(els=>els.map(x=>x.dataset.role));
  const fits=await active.evaluate(e=>[...e.querySelectorAll('.film-plane')].every(layer=>
    layer.getBoundingClientRect().width+1>=e.getBoundingClientRect().width));
  assert.ok(fits,key+' perspective covers the viewport');
  for(const role of ['background','midground','foreground','atmosphere'])assert.ok(roles.includes(role),key+': '+role);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),key+' no horizontal overflow');
  await p.waitForTimeout(1050);
  await p.screenshot({path:out+'/'+key+extra+'-'+run+(wpe?'-webkit':'')+'.jpg',quality:89});
  console.log('SCENE',key,roles.join(' '));shots++;
 }
 async function go(route) {
  await p.goto(base+'#'+route,{waitUntil:'domcontentloaded'});
 }
 const tap=sel=>p.locator(sel).tap();
 await go('home');
 await shot('home');
 await tap('#living-night');
 assert.equal(await p.locator('#main').getAttribute('data-living-time'),'night');
 if(run==='wide')await shot('home','-night');
 await tap('#living-morning');
 const worldState=await p.locator('.home-art').getAttribute('data-film-world');
 console.log('HOME',worldState);
 if (!wpe&&run==='wide'){
   await p.locator('.home-art[data-film-world="live"] .arch-camera').waitFor({timeout:45000});
   const cdp=await c.newCDPSession(p);
   const box=await p.locator('.home-art').boundingBox();
   const x = Math.floor(box.width*.42), y = Math.floor(box.y+box.height*.35);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
   for (let dx=15;dx<=105;dx+=15)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y,id:1}]});
   await p.waitForFunction(()=>parseFloat(document.querySelector('.film-shot[data-shot="home"]').style.getPropertyValue('--camera-x'))>8);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await tap('#film-cross-arch');
   const phases=[];
   for (const phase of ['approach','threshold','beyond']){
     await p.locator('.home-art[data-film-crossing="'+phase+'"] .arch-camera').waitFor({timeout:14000});
     const frame=await p.screenshot({path:out+'/arch-'+phase+'.jpg',quality:90});
     phases.push(createHash('sha256').update(frame).digest('hex'));
   }
   assert.equal(new Set(phases).size,3,'The visible framebuffer changes while moving through the stone');
   await p.waitForURL('**/#about');
   await p.locator('.arch-camera').waitFor({state:'detached',timeout:8000});
   console.log('ARCH touch input, three visible passage stages, arrival in About, and WebGL release');
 }
 await tap('#tab-about');await shot('about');
 assert.equal(await p.locator('.winter-about-card').count(),7);
 await tap('.winter-about-next');await p.waitForFunction(()=>document.querySelector('.winter-about-stage-status').textContent.includes('05 / 07'));
 await tap('.winter-about-to-notes');assert.equal(await p.locator('[data-note-id]').count(),22);
 await p.waitForTimeout(1500);
 await p.screenshot({path:out+'/notes-'+run+(wpe?'-webkit':'')+'.jpg',quality:89});
 await tap('#tab-destination');await tap('#birthday-okay-one');await shot('envelope');
 await p.evaluate(()=>{
   const shell=document.getElementById('main');
   const card=document.getElementById('gift-envelope');
   const sample=()=>{
     const r=card.getBoundingClientRect();
     window.envelopeTrace.push([shell.dataset.destination,r.x+r.width/2,r.y+r.height/2]);
   };
   window.envelopeTrace=[];
   window.envelopeObserver = new MutationObserver(sample);
   window.envelopeObserver.observe(shell,{attributes:true,attributeFilter:['data-destination']});
   sample();
 });
 await tap('#open-envelope');await shot('unlock');
 const envelope=await p.evaluate(()=>{
   window.envelopeObserver.disconnect();
   return window.envelopeTrace.filter(sample=>['envelope','untying','opening'].includes(sample[0]));
 });
 assert.deepEqual(envelope.map(row=>row[0]),['envelope','untying','opening']);
 for (const [,x,y] of envelope)assert.ok(Math.hypot(x-envelope[0][1],y-envelope[0][2])<1,'Envelope moved between phases');
 console.log('ENVELOPE stable centre',JSON.stringify(envelope));
 await go('cake');await shot('cake');
 assert.equal(await p.locator('.grand-candle-flame.candle-is-lit').count(),0);
 assert.equal(await p.locator('.film-cake-assembly[data-exposure="in"] img').count(),2);
 assert.equal(await p.locator('.grand-cake-photograph').evaluate(el=>getComputedStyle(el).opacity),'0');
 await go('letter');await shot('letter');await tap('#country-china');await tap('#memory-china');
 assert.match(await p.locator('#china-note-counter').textContent(),/2 \/ 3/);
 await tap('#open-journey');await shot('journey');
 assert.equal(await p.locator('.journey-story-card').count(),5);
 for (const sel of ['.journey-story-card','.journey-visual','.journey-frame','.journey-navigation']){
   const visualStyle=await p.locator(sel).first().evaluate(el=>{
     const s=getComputedStyle(el);
     return [s.backgroundColor,s.backgroundImage,s.backdropFilter||s.webkitBackdropFilter||'none'];
   });
   assert.deepEqual(visualStyle,['rgba(0, 0, 0, 0)','none','none'],sel+' has no backing panel');
 }
 await tap('[data-journey-stop="2"]');
 await p.locator('.journey-photo[data-photo-key="chongqing"][data-active="true"]').waitFor();
 const visual=p.locator('.journey-visual');
 await p.waitForFunction(()=>document.getElementById('journey-page').scrollTop>600);
 await p.waitForTimeout(960);
 const first=await visual.boundingBox();
 await p.evaluate(()=>document.getElementById('journey-page').scrollTop+=140);
 await p.waitForTimeout(100);
 const next=await visual.boundingBox();
 if(run!=='phone')assert.ok(Math.abs(first.y-next.y)<4,'Sticky rail moved from '+first.y+' to '+next.y);
 await go('afterword');await shot('afterword');
 await go('finale');await shot('finale');
 await tap('#finale-piece-left');await tap('#finale-piece-right');
 assert.equal(await p.locator('.finale-newspaper').getAttribute('data-joined'),'true');
 await p.evaluate(()=>document.dispatchEvent(new CustomEvent('winter:cosmos-open')));
 await shot('universe');
 assert.equal(await p.locator('.cosmos-particle-pair i').count(),2);
 await p.locator('#cosmos-to-stars').waitFor({timeout:28000});
 await tap('#cosmos-to-stars');await tap('#cosmos-to-apod');await tap('#cosmos-to-gallery');
 await shot('gallery');await tap('.memory-expand');await p.waitForTimeout(1150);
 assert.equal(await p.locator('.photo-memory').count(),19);
 await tap('.photo-memory:nth-child(9)');await p.locator('#cosmos-photo-lightbox:not([hidden])').waitFor();
 await tap('#cosmos-lightbox-close');
 await p.screenshot({path:out+'/gallery-open-'+run+(wpe?'-webkit':'')+'.jpg',quality:89});
 await tap('#cosmos-gallery-to-creator');await shot('creator');
 const draw=await p.locator('#winter-creator-canvas').boundingBox();
 await p.mouse.move(draw.x+draw.width*.44,draw.y+draw.height*.53);await p.mouse.down();
 await p.mouse.move(draw.x+draw.width*.56,draw.y+draw.height*.57,{steps:8});await p.mouse.up();
 assert.equal(await p.locator('#winter-creator-canvas').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((value,i)=>i%4===3&&value>0)),true);
 await tap('#cosmos-to-closing');await shot('closing');
 await tap('#cosmos-closing-home');assert.equal(await p.locator('#main').getAttribute('data-page'),'home');
 await p.emulateMedia({reducedMotion:'reduce'});
 await p.locator('.film-shot[data-shot="home"][data-quality="still"][data-exposure="in"]').waitFor({state:'attached'});
 assert.equal(await p.locator('.film-shot[data-shot="home"][data-quality="still"] .film-plane').count(),1);
 assert.deepEqual(errors,[]);
 assert.deepEqual(assetErrors,[]);
 console.log('PASS',run,wpe?'WebKit':'Chromium',shots,'visual scenes with verified source assets');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
