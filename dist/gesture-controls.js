(()=>{
'use strict';
const dock=document.getElementById('winter-gesture-dock');
if(!dock)return;
const $=id=>document.getElementById(id);
const panel=$('winter-gesture-panel'),toggle=$('winter-gesture-toggle');
const touchButton=$('winter-touch-mode'),airButton=$('winter-air-mode');
const cameraTools=$('winter-gesture-camera-tools'),video=$('winter-gesture-video');
const startButton=$('winter-gesture-start'),stopButton=$('winter-gesture-stop');
const status=$('winter-gesture-status'),instructions=$('winter-gesture-instructions');
const cursor=$('winter-gesture-cursor');
const cosmos=$('winter-cosmos-dialog'),phone=$('winter-phone-dialog'),finale=$('birthday-finale');
const lightbox=$('cosmos-photo-lightbox'),photo=$('cosmos-lightbox-photo');
const portrait=$('portrait-lightbox');
let mode='touch',stream=null,detector=null,frame=0,loaded=null,lastVideoTime=-1,lastDetect=0;
let pinchWas=false,stablePose='',poseFrames=0,poseFired=false,lastAction=0,lastSwipe=0,swipeStart=null;
let galleryIndex=0,zoom=1,pinchBase=null,gestureBusy=false,cameraRequest=0;
const clock=()=>performance.now(),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function tell(s){status.textContent=s}
function setPanel(open){panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));}
toggle.addEventListener('click',()=>setPanel(panel.hidden));
$('winter-gesture-minimise').addEventListener('click',()=>setPanel(false));
function relocate(){
 const host=(cosmos?.open&&cosmos)||(phone?.open&&phone)||document.body;
 if(dock.parentElement!==host)host.appendChild(dock);
 const visible=$('main')?.dataset.destination==='cake'||Boolean(cosmos?.open&&$('cosmos-creator')?.classList.contains('is-active'));
 dock.classList.toggle('gesture-visible',visible);
 const cakeLocked=shell?.dataset.destination==='cake' && $('cake-page')?.dataset.cakeState==='unlit';
 dock.dataset.cakeLocked=String(cakeLocked);
 touchButton.disabled=Boolean(cakeLocked);
 if(cakeLocked&&mode!=='camera')selectMode('camera');
}
const shell=$('main');
if(shell)new MutationObserver(relocate).observe(shell,{attributes:true,attributeFilter:['data-destination']});
document.addEventListener('winter:cosmos-stage',relocate);
const dialogs=[cosmos,phone].filter(Boolean);
for(const dialog of dialogs){
 const observer=new MutationObserver(relocate);
 observer.observe(dialog,{attributes:true,attributeFilter:['open']});
 dialog.addEventListener('close',()=>{relocate();resetZoom()});
}
function selectMode(next){
 if(next==='touch' && shell?.dataset.destination==='cake' && $('cake-page')?.dataset.cakeState==='unlit')return;
 mode=next;dock.dataset.mode=next;
 touchButton.setAttribute('aria-pressed',String(next==='touch'));
 airButton.setAttribute('aria-pressed',String(next==='camera'));
 cameraTools.hidden=next!=='camera';
 instructions.textContent='';
 if(next==='touch'){
  // Keep the live camera as the background after candle ignition.
  if(shell?.dataset.destination==='cake' && shell.dataset.cakeTouchUnlocked==='true' && stream){if(frame){cancelAnimationFrame(frame);frame=0;}cursor.hidden=true;}
  else stopCamera();
 }
}
touchButton.addEventListener('click',()=>selectMode('touch'));
airButton.addEventListener('click',()=>selectMode('camera'));
async function getDetector(){
 if(detector)return detector;
 if(!loaded){
  loaded=(async()=>{
   const base='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3';
   const mp=await import(base+'/vision_bundle.mjs');
   const files=await mp.FilesetResolver.forVisionTasks(base+'/wasm');
   const options={baseOptions:{
      modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      delegate:'GPU'
     },runningMode:'VIDEO',numHands:2,
     minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.5};
   try{return await mp.HandLandmarker.createFromOptions(files,options)}
   catch(_){options.baseOptions.delegate='CPU';return await mp.HandLandmarker.createFromOptions(files,options)}
  })().catch(e=>{loaded=null;throw e});
 }
 detector=await loaded;return detector;
}
function stopCamera(message){
 cameraRequest++;gestureBusy=false;
 if(frame){cancelAnimationFrame(frame);frame=0}
 if(stream){for(const track of stream.getTracks())track.stop();stream=null}
 video.pause();video.srcObject=null;
 document.dispatchEvent(new CustomEvent('winter:camera-stopped'));
 cursor.hidden=true;dock.dataset.camera='off';
 stopButton.hidden=true;startButton.hidden=false;startButton.disabled=false;
 lastVideoTime=-1;pinchWas=false;stablePose='';poseFrames=0;poseFired=false;swipeStart=null;
 if(shell) shell.dataset.cakeHandReady='false';
 if(message)tell(message);
 else if(mode==='camera')tell('摄像头已关闭。随时可以重新开启，触摸仍可使用。');
}
async function startCamera(){
 if(gestureBusy||mode!=='camera')return;
 const request=++cameraRequest;
 gestureBusy=true;startButton.disabled=true;
 tell('正在请求摄像头权限…');
 try{
  if(!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)throw new Error('请在 HTTPS 页面及受支持的浏览器中开启摄像头');
  const feed=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:20,max:30}},audio:false});
  if(request!==cameraRequest||mode!=='camera'){feed.getTracks().forEach(t=>t.stop());return}
  stream=feed;video.srcObject=stream;await video.play();
  if(request!==cameraRequest)return;
  if(shell?.dataset.destination==='cake')shell.dataset.cakeHandReady='false';
  dock.dataset.camera='on';startButton.hidden=true;stopButton.hidden=false;
  document.dispatchEvent(new CustomEvent('winter:camera-ready',{detail:{stream}}));
  tell('镜头已经开启，正在准备隔空手势识别…');
  try{
    await getDetector();
    if(request!==cameraRequest||!stream||mode!=='camera')return;
    if(shell?.dataset.destination==='cake')shell.dataset.cakeHandReady='true';
    document.dispatchEvent(new CustomEvent('winter:hand-model-ready'));
    tell('已准备好');
    frame=requestAnimationFrame(track);
  }catch(_){
    if(request!==cameraRequest)return;
    stopCamera('手势识别暂不可用。请检查网络后重新开启镜头。');
    document.dispatchEvent(new CustomEvent('winter:hand-model-unavailable'));
  }
 }catch(err){
  if(request!==cameraRequest)return;
  const msg=err?.name==='NotAllowedError'?'没有获得摄像头权限，请在浏览器设置里允许访问。':
   err?.name==='NotFoundError'?'设备上没有找到可用摄像头。':
   '摄像头/识别模型加载失败，请检查网络，或继续使用触摸模式。';
  stopCamera(msg);
 }finally{if(request===cameraRequest){gestureBusy=false;startButton.disabled=false}}
}
startButton.addEventListener('click',startCamera);
stopButton.addEventListener('click',()=>stopCamera());
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera('摄像头已暂停')});
document.addEventListener('winter:cake-lit',()=>{selectMode('touch');relocate()});
window.addEventListener('pagehide',()=>stopCamera());
function stageActive(id){return cosmos?.open && !$(id)?.hidden && $(id)?.classList.contains('is-active')}
function emitParticle(action){document.dispatchEvent(new CustomEvent('winter:gesture-particle',{detail:{action}}))}
function findTarget(info){
 if(stageActive('cosmos-blessings')){
  const map=document.querySelector('.constellation-map');
  if(map){const box=map.getBoundingClientRect();return {x:box.left+info.x*box.width,y:box.top+info.y*box.height}}
 }
 return {x:info.x*innerWidth,y:info.y*innerHeight};
}
function processPinch(info,t){
 if(t-lastAction<650)return;
 if(cosmos?.open){
  if(!lightbox.hidden){const close=$('cosmos-lightbox-close');close?.click();lastAction=t;return}
  if(stageActive('cosmos-blessings')){
   const buttons=[...document.querySelectorAll('.cosmos-star')],p=findTarget(info);
   let nearest=null,min=Infinity;
   for(const button of buttons){const r=button.getBoundingClientRect(),d=Math.hypot(p.x-(r.left+r.width/2),p.y-(r.top+r.height/2));if(d<min){min=d;nearest=button}}
   if(nearest){nearest.click();lastAction=t;tell('已点亮一颗祝福星星 ✦');}
   return;
  }
 }
 if(finale && !finale.hidden && $('finale-surprise')?.hidden){
  const left=$('finale-piece-left'),right=$('finale-piece-right');
  const target=info.x<.5?left:right;
  const other=target===left?right:left;
  if(target&&!target.disabled&&!target.classList.contains('is-found'))target.click();
  else if(other&&!other.disabled&&!other.classList.contains('is-found'))other.click();
  lastAction=t;return;
 }
 if(phone?.open && $('winter-phone-shell')?.dataset.mode==='camera'){
  $('winter-shutter')?.click();lastAction=t;
 }else if(phone?.open && $('winter-phone-shell')?.dataset.mode==='lock'){
  $('winter-phone-power')?.click();lastAction=t;
 }
}
function processPose(pose,t){
 if(pose===stablePose){poseFrames++}else{stablePose=pose;poseFrames=1;poseFired=false}
 if(poseFrames<4 || poseFired || t-lastAction<1250)return;
 if(finale && !finale.hidden && !$('finale-surprise')?.hidden){
  if(pose==='open'){emitParticle('scatter');lastAction=t;poseFired=true}
  if(pose==='fist'){emitParticle('gather');lastAction=t;poseFired=true}
 }
}
function processSwipe(x,t,pose){
 if(pose==='pinch'){swipeStart=null;return}
 if(!swipeStart){swipeStart={x,t};return}
 if(t-swipeStart.t>650){swipeStart={x,t};return}
 const delta=x-swipeStart.x;
 if(Math.abs(delta)<.25 || t-lastSwipe<1100)return;
 swipeStart=null;lastSwipe=t;
 if(cosmos?.open && !lightbox.hidden){
  $(delta>0?'cosmos-lightbox-prev':'cosmos-lightbox-next')?.click();
  tell(delta>0?'上一张回忆照片':'下一张回忆照片');
 }else if(stageActive('cosmos-gallery')){
  const photos=[...document.querySelectorAll('#cosmos-photo-wall .photo-memory')];
  galleryIndex=(galleryIndex+(delta>0?-1:1)+photos.length)%photos.length;
  photos[galleryIndex]?.click();
  tell('挥手已打开一张回忆照片');
 }
}
function classify(hand){
 const w=hand[0],palmWidth=Math.max(.04,distance(hand[5],hand[17]));
 const pinching=distance(hand[4],hand[8])<palmWidth*.42;
 const fingertips=[8,12,16,20],pips=[6,10,14,18];
 const extended=fingertips.reduce((n,id,i)=>n+(distance(hand[id],w)>distance(hand[pips[i]],w)*1.16?1:0),0);
 const isIndexExtended=distance(hand[8],w)>distance(hand[6],w)*1.10;
 return {pinching,pose:pinching?'pinch':extended>=3?'open':extended<=1?'fist':'neutral',isIndexExtended};
}
function track(t){
 if(!stream || mode!=='camera'){frame=0;return}
 frame=requestAnimationFrame(track);
 if(t-lastDetect<85 || video.readyState<2 || video.currentTime===lastVideoTime)return;
 lastDetect=t;lastVideoTime=video.currentTime;
 let result;
 try{result=detector.detectForVideo(video,t)}catch(_){stopCamera('识别暂时中断，已关闭摄像头；触摸操作仍可继续。');return}
 const allHands=(result.landmarks||[]).map((marks,i)=>{
  const state=classify(marks);
  const label=result.handednesses?.[i]?.[0]?.categoryName||(i?'Left':'Right');
  return {hand:label,visible:true,x:Math.max(0,Math.min(1,1-marks[8].x)),y:Math.max(0,Math.min(1,marks[8].y)),
    pose:state.pose,pinching:state.pinching,isIndexExtended:state.isIndexExtended,
    pinchStarted:state.pinching&&!pinchWas};
 });
 document.dispatchEvent(new CustomEvent('winter:hand-frame',{detail:{hands:allHands}}));
 const hand=result.landmarks?.[0];
 if(!hand){cursor.hidden=true;pinchWas=false;stablePose='';poseFrames=0;poseFired=false;swipeStart=null;return}
 const state=classify(hand);
 if(stageActive('cosmos-creator')||shell?.dataset.destination==='cake'){
  cursor.hidden=true;pinchWas=state.pinching;return;
 }
 const info={x:Math.max(0,Math.min(1,1-hand[8].x)),y:Math.max(0,Math.min(1,hand[8].y))};
 const pt=findTarget(info);
 cursor.hidden=false;cursor.style.left=pt.x+'px';cursor.style.top=pt.y+'px';
 cursor.classList.toggle('is-pinching',state.pinching);
 if(state.pinching&&!pinchWas)processPinch(info,t);
 pinchWas=state.pinching;
 processPose(state.pose,t);
 processSwipe(1-(hand[0].x+hand[9].x)*.5,t,state.pose);
}
function resetZoom(){
 zoom=1;pinchBase=null;
 if(photo){photo.style.transform='';photo.style.transformOrigin='center center';}
}
let swipeOrigin=null;
const lightboxButtons=['cosmos-lightbox-prev','cosmos-lightbox-next'];
function triggerSwipe(delta){
 if(cosmos?.open&&!lightbox.hidden){$(delta>0?lightboxButtons[0]:lightboxButtons[1])?.click()}
 else if(portrait?.open){$(delta>0?'portrait-prev':'portrait-next')?.click()}
}
for(const lb of [lightbox,portrait].filter(Boolean)){
 lb.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch')return;
  if(!swipeOrigin)swipeOrigin={x:e.clientX,y:e.clientY,target:lb,t:Date.now()};
 },{passive:true});
 lb.addEventListener('pointerup',e=>{
  if(!swipeOrigin||swipeOrigin.target!==lb)return;
  const dx=e.clientX-swipeOrigin.x,dy=e.clientY-swipeOrigin.y;
  swipeOrigin=null;
  if(zoom===1&&Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.35)triggerSwipe(dx);
 },{passive:true});
 lb.addEventListener('pointercancel',()=>{swipeOrigin=null},{passive:true});
}
if(photo){
 photo.style.touchAction='pan-y';
 photo.addEventListener('touchstart',e=>{
  if(e.touches.length===2){
   const a=e.touches[0],b=e.touches[1];
   pinchBase={distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),zoom};
  }
 },{passive:true});
 photo.addEventListener('touchmove',e=>{
  if(e.touches.length!==2||!pinchBase)return;
  if(e.cancelable)e.preventDefault();
  const a=e.touches[0],b=e.touches[1];
  const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  zoom=Math.max(1,Math.min(3.5,pinchBase.zoom*d/Math.max(1,pinchBase.distance)));
  photo.style.transform='scale('+zoom.toFixed(3)+')';
 },{passive:false});
 photo.addEventListener('touchend',e=>{if(e.touches.length<2)pinchBase=null},{passive:true});
 photo.addEventListener('dblclick',resetZoom);
}
$('cosmos-lightbox-close')?.addEventListener('click',resetZoom);
for(const id of lightboxButtons)$(id)?.addEventListener('click',resetZoom);
relocate();
window.WINTER_GESTURES={
 get mode(){return mode},
 get active(){return !!stream},
 get stream(){return stream},
 async enableCamera(){selectMode('camera');return startCamera()},
 stop:stopCamera
};
})();