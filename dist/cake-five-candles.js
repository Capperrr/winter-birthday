/* For WINTER · five real candle ignitions with air-dragging a lighter.
   Important: no synthetic click or pinch-to-complete shortcuts.
   Camera and hand-recognition are mandatory until all five candles are lit. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const page=$('cake-page'),shell=$('main'),plane=$('cake-art-slot');
const lighter=$('grand-lighter'),anchor=$('lighter-flame-anchor');
if(!page||!shell||!plane||!lighter||!anchor)return;
const flamesWide=[...page.querySelectorAll('.candles-wide .grand-candle-flame')];
const flamesTall=[...page.querySelectorAll('.candles-tall .grand-candle-flame')];
const wickMaps = {
 wide: readWicks('wide'),
 portrait: readWicks('tall')
};
if(flamesWide.length!==5||flamesTall.length!==5){console.warn('WINTER: expected exactly five candle wicks per aspect ratio');return;}
const progress=document.createElement('div');
progress.className='winter-candle-progress';
progress.setAttribute('role','status');
progress.setAttribute('aria-live','polite');
progress.setAttribute('aria-label','已点燃的生日蜡烛');
progress.innerHTML='<span class="winter-candle-count">0 / 5</span>';
page.appendChild(progress);
// Small invitation above the REAL wick positions, not over their flames.
// This is an air-camera pinch cue; it never receives taps or blocks the tool.
const pinchHint=document.createElement('div');
pinchHint.className='winter-candle-pinch-hint';
pinchHint.setAttribute('aria-hidden','true');
pinchHint.innerHTML='<span class="winter-pinch-glyph" aria-hidden="true">✧</span><span>手指在此处捏合即可<small>开启镜头后，捏合手指移动打火机</small></span>';
pinchHint.hidden=true;
page.appendChild(pinchHint);
let hintFrame=0;
function placeHint(){
 if(hintFrame)cancelAnimationFrame(hintFrame);
 hintFrame=requestAnimationFrame(()=>{
  hintFrame=0;
  if(page.hidden||!current())return;
  const view = sceneView();
  if(!view)return;
  const wicks = wickMaps[plane.dataset.aspect].map(wick => toScreen(wick, view));
  if(wicks.length!==5)return;
  const bounds=page.getBoundingClientRect();
  const centerX=wicks.reduce((sum,p)=>sum+p.x,0)/wicks.length-bounds.left;
  const wickTop=Math.min(...wicks.map(p=>p.y))-bounds.top;
  // The *bottom* of the hint stays at least 27px above the first wick.
  pinchHint.style.left=Math.min(bounds.width-95,Math.max(95,centerX)).toFixed(1)+'px';
  pinchHint.style.top=Math.max(72,wickTop-30).toFixed(1)+'px';
 });
}
function updateHint(){
 const visible=current()&&lit.size===0&&!held;
 pinchHint.hidden=!visible;
 if(visible)placeHint();
}
const text=progress.querySelector('.winter-candle-count');
const lit=new Set();
let held=false,handName=null,releaseFrames=0,missedFrames=0;
let base={x:0,y:0},tip={x:0,y:0},candidate=-1,dwellStart=0;
let ignitionTime=0,lastWick=null,exitRequired=false,finished=false;
const clock=()=>performance.now();
const current=()=>shell.dataset.destination==='cake'&&!page.hidden && page.dataset.cakeState==='unlit';
const canIgnite=()=>current()&&page.dataset.sceneReady==='true'&&shell.dataset.cakeCamera==='on'&&shell.dataset.cakeHandReady==='true'&&window.WINTER_GESTURES?.active===true;
const clearCandidate=()=>{candidate=-1;dwellStart=0;};
function updateProgress(){
 text.textContent=lit.size+' / 5';
 progress.dataset.complete=String(lit.size===5);
 progress.hidden=!current()&&lit.size===0;
 updateHint();
}
function reset(){
 lit.clear();finished=false;release();exitRequired=false;lastWick=null;ignitionTime=0;clearCandidate();
 for(const flame of [...flamesWide,...flamesTall])flame.classList.remove('candle-is-lit');
 updateProgress();
}
function release(){
 held=false;handName=null;releaseFrames=0;missedFrames=0;
 lighter.removeAttribute('transform');
 if(current())page.dataset.lighter='resting';
 clearCandidate();
 updateHint();
}
function readWicks(aspect) {
 return [...plane.querySelectorAll('.candles-' + aspect + ' .grand-candle-wick')]
  .map((line, index) => ({x: Number(line.getAttribute('x2')), y: Number(line.getAttribute('y2')), index}));
}
function sceneView() {
 if (page.dataset.sceneReady !== 'true') return null;
 const bounds = plane.getBoundingClientRect();
 if (!bounds.width) return null;
 return {x: bounds.left, y: bounds.top, scale: bounds.width / plane.viewBox.baseVal.width};
}
function toScene(point, view) {
 return {x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale};
}
function toScreen(point, view) {
 return {x: view.x + point.x * view.scale, y: view.y + point.y * view.scale};
}
function positionLighter(hand) {
 const view = sceneView();
 if (!held || !view) return;
 const rect = page.getBoundingClientRect();
 const point = toScene({
  x: Math.min(rect.right - 5, Math.max(rect.left + 5, hand.x * innerWidth)),
  y: Math.min(rect.bottom - 15, Math.max(rect.top + 55, hand.y * innerHeight))
 }, view);
 // Smooth the hand position in the same SVG units used by the physical wicks.
 tip.x += (point.x - tip.x) * .55;
 tip.y += (point.y - tip.y) * .55;
 lighter.setAttribute('transform', 'translate(' + (tip.x - base.x) + ' ' + (tip.y - base.y) + ')');
 checkIgnition(view);
}
function pickUp(hand) {
 if (!canIgnite() || held || finished) return;
 const view = sceneView();
 if (!view) return;
 const frame = anchor.getBoundingClientRect();
 if (!frame.width && !frame.height) return;
 base = toScene({x: frame.left + frame.width / 2, y: frame.top + frame.height / 2}, view);
 tip = {...base};
 held = true; handName = hand.hand; releaseFrames = 0; missedFrames = 0;
 page.dataset.lighter = 'dragging';
 updateHint();
 positionLighter(hand);
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
function lightOne(wick, view) {
 if (lit.has(wick.index) || finished || !canIgnite()) return;
 lit.add(wick.index);
 clearCandidate();
 exitRequired = true;
 lastWick = wick.index;
 ignitionTime = clock();
 for (const root of [flamesWide, flamesTall]) root[wick.index].classList.add('candle-is-lit');
 updateProgress();
 flash(toScreen(wick, view));
 if (lit.size === 5) {
  finished = true;
  held = false;
  // Completing on the fifth contact avoids losing it if the camera stops immediately.
  document.dispatchEvent(new CustomEvent('winter:air-five-complete', {detail: {litCount: 5}}));
 }
}
function checkIgnition(view) {
 if (!held || !canIgnite() || finished) return;
 const wicks = wickMaps[plane.dataset.aspect];
 if (wicks.length !== 5) return;
 const spacing = Math.min(...wicks.slice(1).map((point, index) => Math.hypot(point.x - wicks[index].x, point.y - wicks[index].y)));
 const nearest = wicks.map(wick => ({...wick, distance: Math.hypot(tip.x - wick.x, tip.y - wick.y)}))
  .sort((a, b) => a.distance - b.distance)[0];
 const radius = Math.min(27 / view.scale, Math.max(11 / view.scale, spacing * .40));
 if (exitRequired) {
  const previous = wicks[lastWick];
  if (Math.hypot(tip.x - previous.x, tip.y - previous.y) <= Math.max(15 / view.scale, spacing * .68)) return;
  exitRequired = false;
 }
 if (lit.has(nearest.index) || nearest.distance > radius) { clearCandidate(); return; }
 const time = clock();
 if (candidate !== nearest.index) { candidate = nearest.index; dwellStart = time; return; }
 // A stationary contact for 130 ms filters out camera jitter.
 if (time - dwellStart >= 130 && time - ignitionTime >= 470) lightOne(nearest, view);
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
  else positionLighter(hand);
 }else if(held){
  if(++releaseFrames>=3)release();
 }
});
document.addEventListener('winter:camera-stopped',()=>{if(held)release()});
document.addEventListener('winter:celebration-route',()=>reset());
document.addEventListener('visibilitychange',()=>{if(document.hidden)release()});
window.addEventListener('resize',()=>{if(held)release()},{passive:true});
new MutationObserver(()=>{if(page.dataset.cakeState==='unlit'&&lit.size===5)reset();else updateProgress();})
 .observe(page,{attributes:true,attributeFilter:['data-cake-state','data-scene-ready','hidden']});
window.addEventListener('resize',placeHint,{passive:true});
window.addEventListener('orientationchange',placeHint,{passive:true});
updateProgress();
})();
