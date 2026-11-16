/* For WINTER · five real candle ignitions with air-dragging a lighter.
   Important: no synthetic click or pinch-to-complete shortcuts.
   Camera and hand-recognition are mandatory until all five candles are lit. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const page=$('cake-page'),shell=$('main'),lighter=$('grand-lighter'),anchor=$('lighter-flame-anchor');
if(!page||!shell||!lighter||!anchor)return;
const flamesWide=[...page.querySelectorAll('.candles-wide .grand-candle-flame')];
const flamesTall=[...page.querySelectorAll('.candles-tall .grand-candle-flame')];
if(flamesWide.length!==5||flamesTall.length!==5){console.warn('WINTER: expected exactly five candle wicks per aspect ratio');return;}
const progress=document.createElement('div');
progress.className='winter-candle-progress';
progress.setAttribute('role','status');
progress.setAttribute('aria-live','polite');
progress.setAttribute('aria-label','已点燃的生日蜡烛');
progress.innerHTML='<span class="winter-candle-count">0 / 5</span>';
page.appendChild(progress);
const text=progress.querySelector('.winter-candle-count');
const lit=new Set();
let held=false,handName=null,started=0,handWasPinching=false,releaseFrames=0,missedFrames=0;
let base={x:0,y:0},tip={x:0,y:0},lastDX=0,lastDY=0,candidate=-1,dwellStart=0;
let ignitionTime=0,lastWick=null,lastSpacing=28,exitRequired=false,finished=false;
let sparkleTimer=0,trail=null;
const clock=()=>performance.now();
const current=()=>shell.dataset.destination==='cake'&&!page.hidden && page.dataset.cakeState==='unlit';
const canIgnite=()=>current()&&shell.dataset.cakeCamera==='on'&&shell.dataset.cakeHandReady==='true'&&window.WINTER_GESTURES?.active===true;
const clearCandidate=()=>{candidate=-1;dwellStart=0;};
function updateProgress(){
 text.textContent=lit.size+' / 5';
 progress.dataset.complete=String(lit.size===5);
 progress.hidden=!current()&&lit.size===0;
}
function reset(){
 lit.clear();finished=false;release();exitRequired=false;lastWick=null;ignitionTime=0;clearCandidate();
 for(const flame of [...flamesWide,...flamesTall])flame.classList.remove('candle-is-lit');
 updateProgress();
}
function release(){
 held=false;handName=null;handWasPinching=false;releaseFrames=0;missedFrames=0;
 lighter.style.setProperty('--lighter-dx','0px');
 lighter.style.setProperty('--lighter-dy','0px');
 lighter.setAttribute('aria-pressed','false');
 if(current())page.dataset.lighter='resting';
 clearCandidate();
}
function screenWicks(){
 const root=[...page.querySelectorAll('.grand-candles-overlay')].find(el=>getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>1);
 if(!root)return [];
 const rect=root.getBoundingClientRect(),view=root.viewBox.baseVal;
 if(!view?.width||!view?.height)return [];
 const elements=[...root.querySelectorAll('.grand-candle-flame')];
 return elements.map((flame,i)=>{
  const match=flame.style.transformOrigin.match(/([\d.]+)px\s+([\d.]+)px/);
  if(!match)return null;
  // getScreenCTM includes CSS layout/translation where supported. In Safari,
  // the geometry fallback uses the SVG element's final bounding rectangle.
  const rawX=+match[1],rawY=+match[2];
  let x=rect.left+(rawX-view.x)/view.width*rect.width;
  let y=rect.top+(rawY-view.y)/view.height*rect.height;
  try{
   const point=root.createSVGPoint();point.x=rawX;point.y=rawY;
   const matrix=root.getScreenCTM();
   if(matrix){const pos=point.matrixTransform(matrix);if(Number.isFinite(pos.x)&&Number.isFinite(pos.y)){x=pos.x;y=pos.y;}}
  }catch(_){}
  return {x,y,index:i};
 }).filter(Boolean);
}
function positionLighter(point){
 if(!held)return;
 // Stable low-pass filter prevents camera hand jitter from flickering the tool.
 tip.x+=(point.x-tip.x)*.55;
 tip.y+=(point.y-tip.y)*.55;
 const r=page.getBoundingClientRect();
 tip.x=Math.min(r.right-5,Math.max(r.left+5,tip.x));
 tip.y=Math.min(r.bottom-15,Math.max(r.top+55,tip.y));
 lastDX=tip.x-base.x;
 lastDY=tip.y-base.y;
 lighter.style.setProperty('--lighter-dx',lastDX.toFixed(1)+'px');
 lighter.style.setProperty('--lighter-dy',lastDY.toFixed(1)+'px');
 checkIgnition();
}
function pickUp(hand){
 if(!canIgnite()||held||finished)return;
 const frame=anchor.getBoundingClientRect();
 if(!frame.width&&!frame.height)return;
 base={x:frame.left+frame.width/2,y:frame.top+frame.height/2};
 tip={x:base.x,y:base.y};
 held=true;handName=hand.hand;releaseFrames=0;missedFrames=0;
 started=clock();page.dataset.lighter='dragging';lighter.setAttribute('aria-pressed','true');
 positionLighter({x:hand.x*innerWidth,y:hand.y*innerHeight});
}
function flash(pos){
 const spark=document.createElement('i');
 spark.className='winter-wick-spark';spark.setAttribute('aria-hidden','true');
 const r=page.getBoundingClientRect();
 spark.style.left=(pos.x-r.left)+'px';spark.style.top=(pos.y-r.top)+'px';
 page.appendChild(spark);
 spark.addEventListener('animationend',()=>spark.remove(),{once:true});
 setTimeout(()=>spark.remove(),900);
}
function lightOne(index,location){
 if(lit.has(index)||finished||!canIgnite())return;
 lit.add(index);clearCandidate();exitRequired=true;lastWick=location;ignitionTime=clock();
 for(const root of [flamesWide,flamesTall])root[index].classList.add('candle-is-lit');
 updateProgress();
 flash(location);
 if(lit.size===5){
  finished=true;
  page.dataset.lighter='igniting';
  release();
  // Complete ONLY after five independent wick collisions.
  window.setTimeout(()=>{
   if(shell.dataset.destination==='cake'&&page.dataset.cakeState==='unlit'&&shell.dataset.cakeCamera==='on')
    document.dispatchEvent(new CustomEvent('winter:air-five-complete',{detail:{litCount:5}}));
  },360);
 }
}
function checkIgnition(){
 if(!held||!canIgnite()||finished)return;
 const wicks=screenWicks();
 if(wicks.length!==5)return;
 const spacing=Math.min(...wicks.slice(1).map((p,i)=>Math.hypot(p.x-wicks[i].x,p.y-wicks[i].y)));
 lastSpacing=Number.isFinite(spacing)?spacing:28;
 // A wick is counted only when the lighter's flame is the nearest to it.
 const nearest=wicks.map(p=>({...p,d:Math.hypot(tip.x-p.x,tip.y-p.y)})).sort((a,b)=>a.d-b.d)[0];
 if(!nearest){clearCandidate();return;}
 const radius=Math.min(27,Math.max(11,lastSpacing*.40));
 if(exitRequired){
  if(lastWick&&Math.hypot(tip.x-lastWick.x,tip.y-lastWick.y)>Math.max(15,lastSpacing*.68))exitRequired=false;
  else return;
 }
 if(lit.has(nearest.index)||nearest.d>radius){clearCandidate();return;}
 const t=clock();
 if(candidate!==nearest.index){candidate=nearest.index;dwellStart=t;return;}
 // Intentional proximity for >= 130ms: not an accidental frame of jitter.
 if(t-dwellStart>=130&&t-ignitionTime>=470)lightOne(nearest.index,nearest);
}
document.addEventListener('winter:hand-frame',event=>{
 if(!canIgnite()||finished)return;
 const hands=(event.detail?.hands||[]).filter(h=>h.visible);
 if(!hands.length){
  if(held&&++missedFrames>9)release();
  return;
 }
 missedFrames=0;
 const hand=held?(hands.find(h=>h.hand===handName)||hands[0]):(hands.find(h=>h.hand==='Right')||hands[0]);
 if(!hand)return;
 if(hand.pinching){
  releaseFrames=0;
  if(!held)pickUp(hand);
  else positionLighter({x:hand.x*innerWidth,y:hand.y*innerHeight});
 }else if(held){
  if(++releaseFrames>=3)release();
 }
 handWasPinching=hand.pinching;
});
document.addEventListener('winter:camera-stopped',()=>{if(held)release()});
document.addEventListener('winter:celebration-route',()=>reset());
document.addEventListener('visibilitychange',()=>{if(document.hidden)release()});
window.addEventListener('resize',()=>{if(held)release()},{passive:true});
new MutationObserver(()=>{if(page.dataset.cakeState==='unlit'&&lit.size===5)reset();else updateProgress();})
 .observe(page,{attributes:true,attributeFilter:['data-cake-state','hidden']});
updateProgress();
})();
