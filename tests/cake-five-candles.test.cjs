const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'dist/cake-five-candles.js'),'utf8');
const desktop=[[680,200],[723,197],[768,195],[813,197],[856,200]];
const portrait=[[430,567],[471,565],[513,563],[555,565],[596,567]];
function harness(camera=true, aspect='wide'){
  const listeners=new Map();
  let now=0,done=0;
  class Event{constructor(type,opts={}){this.type=type;this.detail=opts.detail||{}}}
  const cls=()=>({lit:false,add(){this.lit=true},remove(){this.lit=false}});
  const box=()=>({
    dataset:{},hidden:false,style:{setProperty(){}},classList:cls(),
    setAttribute(){},removeAttribute(){},appendChild(){},remove(){},addEventListener(){},
    querySelector(){return {textContent:''}},
    getBoundingClientRect(){return {left:0,top:0,width:1000,height:600,right:1000,bottom:600}}
  });
  const wide=desktop.map(([x,y])=>({style:{transformOrigin:x+'px '+y+'px'},classList:cls()}));
  const tall=portrait.map(([x,y])=>({style:{transformOrigin:x+'px '+y+'px'},classList:cls()}));
  const canvasWidth = aspect === 'wide' ? 1536 : 1024;
  const page=box(),shell=box(),lighter=box(),anchor=box(),plane=box();
  plane.dataset.aspect = aspect;
  plane.viewBox = {baseVal: {width: canvasWidth}};
  plane.querySelectorAll = selector => (selector.includes('candles-wide') ? desktop : portrait)
    .map(([x, y]) => ({getAttribute: name => name === 'x2' ? x : y}));
  page.dataset.cakeState='unlit';
  page.dataset.sceneReady='true';
  page.querySelectorAll = selector => selector.includes('candles-wide') ? wide : tall;
  shell.dataset.destination='cake';shell.dataset.cakeCamera=camera?'on':'off';
  shell.dataset.cakeHandReady=camera?'true':'false';
  anchor.getBoundingClientRect=()=>({left:11,top:11,width:2,height:2});
  const elements={'cake-page':page,'main':shell,'grand-lighter':lighter,'lighter-flame-anchor':anchor,'cake-art-slot':plane};
  const document={
    hidden:false,getElementById:id=>elements[id],
    createElement:()=>box(),
    addEventListener(name,listener){const a=listeners.get(name)||[];a.push(listener);listeners.set(name,a)},
    dispatchEvent(event){for(const listener of listeners.get(event.type)||[])listener(event)}
  };
  const window={WINTER_GESTURES:{active:camera},setTimeout(fn){fn();return 1},addEventListener(){}};
  vm.runInNewContext(script,{document,window,innerWidth:1000,innerHeight:600,CustomEvent:Event,MutationObserver:class{observe(){}},performance:{now(){return now}},requestAnimationFrame(){return 1},cancelAnimationFrame(){},setTimeout(fn){fn();return 1}});
  document.addEventListener('winter:air-five-complete',e=>{assert.equal(e.detail.litCount,5);done++});
  const send=(x,y,pinching=true)=>{
    now+=100;
    document.dispatchEvent(new Event('winter:hand-frame',{detail:{hands:[{visible:true,hand:'Right',pinching,x:x/1000,y:y/600}]}}));
  };
  const hold=(wick,frames=15)=>{
    const [x,y] = (aspect === 'wide' ? desktop : portrait)[wick];
    for(let i=0;i<frames;i++)send(x / canvasWidth * 1000, y / canvasWidth * 1000);
  };
  return {send,hold,page,shell,wide,tall,window, stop: () => {
    shell.dataset.cakeCamera = 'off';
    window.WINTER_GESTURES.active = false;
    document.dispatchEvent(new Event('winter:camera-stopped'));
  },get count(){return wide.filter(x=>x.classList.lit).length},get completed(){return done}};
}
test('without camera and hand recogniser, pinch cannot light any candle',()=>{
 const a=harness(false);for(let i=0;i<5;i++)a.hold(i,15);assert.equal(a.count,0);assert.equal(a.completed,0);
});
test('lighter hovers at the same wick without lighting other nearby wicks',()=>{
 const a=harness();a.hold(0,50);assert.equal(a.count,1);assert.equal(a.completed,0);
});
test('the 5 independent wick collisions light one at a time and complete once',()=>{
 const a=harness();
 for(let i=0;i<5;i++){a.hold(i);assert.equal(a.count,i+1);assert.equal(a.completed,i===4?1:0)}
 assert.ok(a.wide.every(f=>f.classList.lit));assert.ok(a.tall.every(f=>f.classList.lit));
 a.hold(4,40);assert.equal(a.completed,1);
});
test('releasing the pinch does not erase the already lit candles',()=>{
 const a=harness();
 a.hold(0);for(let i=0;i<5;i++)a.send(200,260,false);
 assert.equal(a.count,1);
 a.hold(1,17);assert.equal(a.count,2);
});
test('artwork readiness gates ignition even when a camera is live', () => {
 const a = harness();
 a.page.dataset.sceneReady = 'false';
 a.hold(0);
 assert.equal(a.count, 0);
});
test('portrait wick geometry and camera restart preserve partial progress', () => {
 const a = harness(true, 'portrait');
 a.hold(0); a.hold(1);
 a.stop();
 a.hold(2);
 assert.equal(a.count, 2);
 a.shell.dataset.cakeCamera = 'on';
 a.window.WINTER_GESTURES.active = true;
 for (let i=2; i<5; i++) a.hold(i);
 assert.equal(a.completed, 1);
});
test('the old instant-ignite code path must stay disconnected',()=>{
 const cake=fs.readFileSync(path.join(root,'dist/cake-scene.js'),'utf8');
 const creator=fs.readFileSync(path.join(root,'dist/creator-studio.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
 assert.ok(cake.includes('winter:air-five-complete'));
 assert.ok(!cake.includes("listen(document, 'winter:air-ignite'"));
 assert.ok(!creator.includes("new CustomEvent('winter:air-ignite')"));
 assert.ok(!html.includes('candle-ignition-target'));
 assert.ok(!html.includes('cake-cutout.js'));
 assert.ok(html.includes('cake-five-candles.js?'));
 assert.ok(html.includes('cake-five-candles.css?'));
});
