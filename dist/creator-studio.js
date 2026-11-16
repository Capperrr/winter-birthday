(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const stage=$('cosmos-creator'),canvas=$('winter-creator-canvas');
 const cakeEnable=$('winter-cake-camera-enable'),cakeNote=$('winter-cake-camera-note');
 const creatorEnable=$('winter-creator-camera-enable'),creatorStatus=$('winter-creator-camera-status');
 if(!stage||!canvas)return;
 const shell=$('main'),controls=$('winter-creator-colours');
 const context=canvas.getContext('2d',{alpha:true});
 const brush=$('winter-creator-brush'),brushSize=$('winter-creator-brush-size');
 const eraseButton=$('winter-creator-erase'),clearButton=$('winter-creator-clear');
 const saveButton=$('winter-creator-save'),hello=$('creator-hello');
 const cakeVideo=$('winter-cake-video'),creatorVideo=$('winter-creator-video');
 let color='#ffffff',size=8,eraser=false,drawing=false,last=null,firstDraw=0,helloTimer=0;
 let fingerPos={Right:null,Left:null},leftPalmStart=0,leftPalmDone=false,swatchHold=null,handDrawLast=0;
 const colors=[...controls.querySelectorAll('[data-colour]')];
 const maxDpr=()=>Math.min(2,window.devicePixelRatio||1);
 const active=()=>stage.classList.contains('is-active')&&$('winter-cosmos-dialog')?.open;
 const activeCake=()=>shell?.dataset.destination==='cake';
 const stopFinger=()=>{fingerPos={Right:null,Left:null};leftPalmStart=0;leftPalmDone=false;swatchHold=null};
 const point=(x,y)=>{const r=canvas.getBoundingClientRect();return{x:x-r.left,y:y-r.top}};
 function fit(){
  if(!active())return;
  const rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const image=document.createElement('canvas');image.width=canvas.width;image.height=canvas.height;
  if(canvas.width&&canvas.height)image.getContext('2d').drawImage(canvas,0,0);
  const scale=maxDpr();canvas.width=Math.floor(rect.width*scale);canvas.height=Math.floor(rect.height*scale);
  context.setTransform(scale,0,0,scale,0,0);
  if(image.width&&image.height)context.drawImage(image,0,0,image.width,image.height,0,0,rect.width,rect.height);
 }
 function selected(hex){
  color=hex;eraser=false;eraseButton.setAttribute('aria-pressed','false');
  for(const b of colors)b.setAttribute('aria-pressed',String(b.dataset.colour===hex));
 }
 for(const button of colors)button.addEventListener('click',()=>selected(button.dataset.colour));
 brush.addEventListener('input',()=>{size=Number(brush.value)||8;brushSize.textContent=size+' px'});
 eraseButton.addEventListener('click',()=>{
  eraser=!eraser;eraseButton.setAttribute('aria-pressed',String(eraser));
 });
 function clearDrawing(){
  context.clearRect(0,0,canvas.width/maxDpr(),canvas.height/maxDpr());
  stopFinger();creatorStatus.textContent='画布已清空，再画一笔吧。';
 }
 clearButton.addEventListener('click',clearDrawing);
 function writeLine(a,b,erase){
  if(!a||!b)return;
  context.save();
  context.globalCompositeOperation=erase?'destination-out':'source-over';
  context.strokeStyle=erase?'rgba(0,0,0,1)':color;
  context.lineWidth=erase?Math.max(18,size*3):size;
  context.lineJoin='round';context.lineCap='round';
  context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);context.stroke();
  if(a.x===b.x&&a.y===b.y){context.beginPath();context.arc(b.x,b.y,context.lineWidth/2,0,Math.PI*2);context.fillStyle=erase?'rgba(0,0,0,1)':color;context.fill()}
  context.restore();
  if(!firstDraw){
   firstDraw=Date.now();
   helloTimer=setTimeout(()=>{if(active()){hello.hidden=false;hello.style.animation='cosmos-write .7s ease both'}},5000);
  }
 }
 function pointerStart(event){
  if(!active()||event.button!==0&&event.pointerType==='mouse')return;
  if(event.cancelable)event.preventDefault();
  drawing=true;last=point(event.clientX,event.clientY);
  writeLine(last,last,eraser);
  canvas.setPointerCapture?.(event.pointerId);
 }
 function pointerMove(event){
  if(!drawing||!active())return;
  if(event.cancelable)event.preventDefault();
  const next=point(event.clientX,event.clientY);
  writeLine(last,next,eraser);last=next;
 }
 canvas.addEventListener('pointerdown',pointerStart);
 canvas.addEventListener('pointermove',pointerMove);
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,()=>{drawing=false;last=null});
 function stopVideos(){
  for(const vid of [creatorVideo,cakeVideo]){
   if(!vid)continue;
   vid.pause();vid.srcObject=null;
  }
  shell.dataset.cakeCamera='off';stage.dataset.camera='off';
  creatorEnable.textContent='开启摄像头 · 隔空画画';
  cakeNote.textContent='';
 }
 document.addEventListener('winter:camera-ready',e=>{
  const stream=e.detail?.stream;
  if(!stream)return;
  if(cakeVideo){cakeVideo.srcObject=stream;cakeVideo.play().catch(()=>{});}
  if(creatorVideo){creatorVideo.srcObject=stream;creatorVideo.play().catch(()=>{});}
  shell.dataset.cakeCamera='on';stage.dataset.camera='on';
  cakeNote.textContent='镜头已开启。轻点打火机，或使用手势点亮蜡烛。';
  creatorEnable.textContent='镜头已开启 · 点击关闭';
  creatorStatus.textContent='镜头已开启；手势识别加载后即可隔空绘画。';
 });
 document.addEventListener('winter:camera-stopped',()=>{
  stopVideos();creatorStatus.textContent='镜头已关闭。还可以继续触摸画画。';
 });
 async function activateCamera(source){
  const api=window.WINTER_GESTURES;
  const btn=source==='cake'?cakeEnable:creatorEnable;
  const label=source==='cake'?cakeNote:creatorStatus;
  if(api?.active){
   if(source==='creator'){api.stop('已关闭摄像头；触摸仍可绘画');return}
   label.textContent='镜头已经开启';return;
  }
  if(!api?.enableCamera){label.textContent='当前浏览器不支持手势模块，仍可直接触摸体验。';return}
  btn.disabled=true;label.textContent='正在申请摄像头权限…';
  try{await api.enableCamera()}catch(_){label.textContent='摄像头不可用，请继续使用触摸操作。'}
  finally{btn.disabled=false}
 }
 cakeEnable?.addEventListener('click',()=>activateCamera('cake'));
 creatorEnable?.addEventListener('click',()=>activateCamera('creator'));
 function save(){
  const w=canvas.width,h=canvas.height;
  if(!w||!h)return;
  const output=document.createElement('canvas');output.width=w;output.height=h;
  const cx=output.getContext('2d');
  cx.fillStyle='#172633';cx.fillRect(0,0,w,h);
  if(creatorVideo?.srcObject&&creatorVideo.readyState>=2){
   const vw=creatorVideo.videoWidth,vh=creatorVideo.videoHeight;
   if(vw&&vh){
    const scale=Math.max(w/vw,h/vh),sw=w/scale,sh=h/scale;
    cx.save();cx.translate(w,0);cx.scale(-1,1);
    cx.drawImage(creatorVideo,(vw-sw)/2,(vh-sh)/2,sw,sh,0,0,w,h);cx.restore();
   }
  }
  cx.drawImage(canvas,0,0);
  cx.fillStyle='#fff5e8';cx.textAlign='right';cx.font=Math.max(15,Math.round(w*.014))+'px Georgia';
  cx.fillText('For WINTER · 25',w-24,h-24);
  const a=document.createElement('a');a.href=output.toDataURL('image/png');a.download='WINTER-25-my-little-creation.png';
  document.body.appendChild(a);a.click();a.remove();
  creatorStatus.textContent='画作已保存到你的设备。';
 }
 saveButton.addEventListener('click',save);
 document.addEventListener('winter:cosmos-stage',e=>{
  const on=e.detail?.stage==='cosmos-creator';
  if(on){requestAnimationFrame(fit);creatorStatus.textContent=window.WINTER_GESTURES?.active?'镜头已开启 · 可以开始创作':'先用手指画画，或点「开启摄像头」进行隔空互动';}
  else{stopFinger();drawing=false;if(window.WINTER_GESTURES?.active && !activeCake())window.WINTER_GESTURES.stop('已离开绘画章节，摄像头自动关闭');}
 });
 document.addEventListener('winter:celebration-route',e=>{
  if(!e.detail?.active&&window.WINTER_GESTURES?.active)window.WINTER_GESTURES.stop('生日蛋糕章节结束，摄像头已关闭');
 });
 document.addEventListener('winter:hand-frame',e=>{
  const detail=e.detail||{},hands=detail.hands||[];
  if(activeCake()&&!active()){
   const cake=$('cake-page');
   if(cake?.dataset.cakeState==='unlit'){
    const hand=hands.find(h=>h.hand==='Right')||hands[0];
    if(hand?.pinchStarted && !handDrawLast){handDrawLast=Date.now();$('grand-lighter')?.click();}
    if(!hand?.pinching)handDrawLast=0;
   }
   return;
  }
  if(!active()||!context)return;
  const now=performance.now(),rect=canvas.getBoundingClientRect();
  const screenPoint=h=>({x:h.x*rect.width,y:h.y*rect.height});
  const visibleHands=hands.filter(h=>h.visible);
  // One raised index finger should draw without forcing a second hand into frame.
  const bothHands=visibleHands.length===1 && visibleHands[0].hand==='Left' && visibleHands[0].pose!=='open'
    ? [{...visibleHands[0],hand:'Right'}] : visibleHands;
  for(const type of ['Right','Left']){
   const h=bothHands.find(h=>h.hand===type);
   const key=type==='Right'?'Right':'Left';
   if(!h){fingerPos[key]=null;if(type==='Left'){leftPalmStart=0;swatchHold=null;}continue}
   const p=screenPoint(h);
   if(type==='Left'){
    // Hold an open left hand for 1.2s before clearing: prevents accidental wipes.
    if(h.pose==='open'){
     if(!leftPalmStart)leftPalmStart=now;
     if(!leftPalmDone && now-leftPalmStart>1200){clearDrawing();leftPalmDone=true;creatorStatus.textContent='左手张掌：清空画布。';}
     fingerPos.Left=null;continue;
    }else{leftPalmStart=0;leftPalmDone=false}
    // Pinch at one of the palette dots for two seconds to select it.
    if(h.pinching){
     const px=h.x*window.innerWidth,py=h.y*window.innerHeight;
     const under=colors.find(b=>{const r=b.getBoundingClientRect();return px>=r.left-14&&px<=r.right+14&&py>=r.top-14&&py<=r.bottom+14});
     if(under){
      if(!swatchHold||swatchHold.color!==under.dataset.colour)swatchHold={color:under.dataset.colour,start:now};
      else if(now-swatchHold.start>=2000){selected(under.dataset.colour);creatorStatus.textContent='已选取 '+under.getAttribute('aria-label')+' 画笔';swatchHold=null;}
     }else swatchHold=null;
     fingerPos.Left=null;continue;
    }else swatchHold=null;
   }
   const draw=h.isIndexExtended&&!h.pinching&&h.pose!=='open';
   if(draw){
    if(fingerPos[key])writeLine(fingerPos[key],p,key==='Left');
    else writeLine(p,p,key==='Left');
    fingerPos[key]=p;
   }else fingerPos[key]=null;
  }
 });
 window.addEventListener('resize',()=>{if(active())fit()},{passive:true});
 $('winter-cosmos-dialog')?.addEventListener('close',()=>{
   stopFinger();drawing=false;
   if(window.WINTER_GESTURES?.active)window.WINTER_GESTURES.stop('已离开创作页面，摄像头自动关闭');
 });
 document.addEventListener('winter:hand-model-unavailable',()=>{
  creatorStatus.textContent='镜头已开启，但隔空识别暂不可用。可以直接在镜头上用手指画画。';
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopFinger()});
})();