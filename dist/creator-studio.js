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
 let color='#232323',size=8,eraser=false,drawing=false,last=null,firstDraw=0,helloTimer=0;
 let fingerPos={Right:null,Left:null},leftPalmStart=0,leftPalmDone=false,handDrawLast=0;
 const colors=[...controls.querySelectorAll('[data-colour]')];
 const toolsToggle=$('creator-tools-toggle'),toolsPanel=$('creator-tools-panel');
 const narrow=window.matchMedia('(max-width:760px)');
 let toolsExpanded=false;
 function showTools(expanded){
   toolsExpanded=expanded;toolsPanel.hidden=narrow.matches&&!expanded;
   toolsToggle.hidden=!narrow.matches;toolsToggle.setAttribute('aria-expanded',String(!toolsPanel.hidden));
   $('winter-creator-toolbar').dataset.expanded=String(!toolsPanel.hidden);
 }
 toolsToggle.addEventListener('click',()=>showTools(!toolsExpanded));
 narrow.addEventListener('change',()=>showTools(false));
 showTools(false);
 const maxDpr=()=>Math.min(2,window.devicePixelRatio||1);
 const active=()=>stage.classList.contains('is-active')&&$('winter-cosmos-dialog')?.open;
 const activeCake=()=>shell?.dataset.destination==='cake';
 const stopFinger=()=>{fingerPos={Right:null,Left:null};leftPalmStart=0;leftPalmDone=false};
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
  cakeNote.textContent='正在准备识别…';
  creatorEnable.textContent='镜头已开启 · 点击关闭';
  creatorStatus.textContent='镜头已开启；手势识别加载后即可隔空绘画。';
 });
 document.addEventListener('winter:hand-model-ready',()=>{if(shell?.dataset.destination==='cake')cakeNote.textContent='';});
 document.addEventListener('winter:camera-stopped',()=>{
  stopVideos();creatorStatus.textContent='镜头已关闭。还可以继续触摸画画。';
 });
 async function activateCamera(source){
  const api=window.WINTER_GESTURES;
  const btn=source==='cake'?cakeEnable:creatorEnable;
  const label=source==='cake'?cakeNote:creatorStatus;
  if(api?.active){
   if(source==='creator'){api.stop('已关闭摄像头；触摸仍可绘画');return}
   if(shell?.dataset.cakeHandReady==='true'){label.textContent='';return;}
   api.stop('重新准备识别');
  }
  if(!api?.enableCamera){label.textContent='当前浏览器不支持摄像头手势识别';return}
  btn.disabled=true;label.textContent='正在申请摄像头权限…';
  try{await api.enableCamera();if(source==='cake'&&!api.active)label.textContent='摄像头未能开启，请检查权限后重试'}catch(_){label.textContent='摄像头未能开启，请检查权限后重试'}
  finally{btn.disabled=false}
 }
 cakeEnable?.addEventListener('click',()=>activateCamera('cake'));
 creatorEnable?.addEventListener('click',()=>activateCamera('creator'));
 /* A clear export preview prevents claiming the image was saved when an iPad browser blocked a download. */
 const exportDialog=document.createElement('dialog');
 exportDialog.id='winter-art-export';
 exportDialog.className='creator-export-dialog';
 exportDialog.innerHTML='<div class="creator-export-sheet"><button type="button" id="winter-art-export-close" aria-label="关闭保存预览">×</button><h3>这一张，送给自己。</h3><p class="creator-export-subtitle">你的画作已经生成，选择一种保存方式。</p><img id="winter-art-export-preview" alt="刚才创作的 WINTER 25 岁画作预览"><div class="creator-export-actions"><button type="button" id="winter-art-export-share">分享 / 存入相册</button><a id="winter-art-export-download" download="WINTER-25-my-little-creation.png">下载 PNG 到文件</a></div><p class="creator-export-tip">iPad：推荐点「分享 / 存入相册」，在系统菜单中选「存储图像」。点「下载 PNG」则到「文件」App → 下载项查找（可能位于 iCloud Drive 或“我的 iPad”）。</p><p id="winter-art-export-status" class="creator-export-status" role="status" aria-live="polite"></p></div>';
 document.body.appendChild(exportDialog);
 const exportImage=$('winter-art-export-preview'),exportLink=$('winter-art-export-download'),exportShare=$('winter-art-export-share'),exportStatus=$('winter-art-export-status');
 let exportUrl='',exportBlob=null,exportFile=null;
 $('winter-art-export-close').addEventListener('click',()=>exportDialog.close());
 exportDialog.addEventListener('click',e=>{if(e.target===exportDialog)exportDialog.close()});
 exportDialog.addEventListener('close',()=>{exportImage.removeAttribute('src')});
 window.addEventListener('pagehide',()=>{if(exportUrl)URL.revokeObjectURL(exportUrl)},{once:true});
 exportLink.addEventListener('click',()=>{exportStatus.textContent='已请求下载：打开「文件」App 的下载项查看；网页无法自动确认文件已保存。';});
 exportShare.addEventListener('click',async()=>{
   if(!exportFile||!navigator.share)return;
   try{
     await navigator.share({files:[exportFile],title:'WINTER · 25 岁的画作'});
     exportStatus.textContent='若刚才选择了「存储图像」，请打开「照片」App 查看。';
   }catch(err){
     if(err?.name!=='AbortError')exportStatus.textContent='分享未成功，可以改用「下载 PNG」，或长按上面的预览图存储。';
   }
 });
 async function save(){
  const w=canvas.width,h=canvas.height;
  if(!w||!h){creatorStatus.textContent='画布还未准备好，请再画一笔。';return;}
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
  try{
   const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));
   if(!blob)throw Error('PNG rendering failed');
   if(exportUrl)URL.revokeObjectURL(exportUrl);
   exportBlob=blob;exportUrl=URL.createObjectURL(blob);
   exportFile=new File([blob],'WINTER-25-my-little-creation.png',{type:'image/png'});
   exportImage.src=exportUrl;exportLink.href=exportUrl;
   let canShare=false;try{canShare=Boolean(navigator.share&&navigator.canShare?.({files:[exportFile]}));}catch(_){}
   exportShare.hidden=!canShare;
   exportStatus.textContent='已生成 PNG 预览；尚未保存到设备。';
   if(!exportDialog.open)exportDialog.showModal();
   creatorStatus.textContent='画作预览已生成，请选择保存方式。';
  }catch(e){
   creatorStatus.textContent='生成图片失败，请重试保存。';
   console.warn('WINTER artwork export:',e);
  }
 }
 saveButton.addEventListener('click',save);
 document.addEventListener('winter:cosmos-stage',e=>{
  const on=e.detail?.stage==='cosmos-creator';
  $('winter-cosmos-dialog').dataset.creatorActive=String(on);
  if(on){requestAnimationFrame(fit);creatorStatus.textContent=window.WINTER_GESTURES?.active?'镜头已开启 · 可以开始创作':'先用手指画画，或点「开启摄像头」进行隔空互动';}
  else{stopFinger();drawing=false;if(window.WINTER_GESTURES?.active && !activeCake())window.WINTER_GESTURES.stop('已离开绘画章节，摄像头自动关闭');}
 });
 document.addEventListener('winter:celebration-route',e=>{
  if(!e.detail?.active&&window.WINTER_GESTURES?.active)window.WINTER_GESTURES.stop('生日蛋糕章节结束，摄像头已关闭');
 });
 document.addEventListener('winter:hand-frame',e=>{
  const detail=e.detail||{},hands=detail.hands||[];
  // The cake chapter is owned by cake-five-candles.js. A pinch must
  // pick up the lighter, not automatically ignite every candle.
  if(activeCake()&&!active())return;
  if(!active()||!context)return;
  const now=performance.now(),rect=canvas.getBoundingClientRect();
  const screenPoint=h=>({x:h.x*window.innerWidth-rect.left,y:h.y*window.innerHeight-rect.top});
  const visibleHands=hands.filter(h=>h.visible);
  // One raised index finger should draw without forcing a second hand into frame.
  const bothHands=visibleHands.length===1 && visibleHands[0].hand==='Left' && visibleHands[0].pose!=='open'
    ? [{...visibleHands[0],hand:'Right'}] : visibleHands;
  for(const type of ['Right','Left']){
   const h=bothHands.find(h=>h.hand===type);
   const key=type==='Right'?'Right':'Left';
   if(!h){fingerPos[key]=null;if(type==='Left')leftPalmStart=0;continue}
   const p=screenPoint(h);
   if(type==='Left'){
    // Hold an open left hand for 1.2s before clearing: prevents accidental wipes.
    if(h.pose==='open'){
     if(!leftPalmStart)leftPalmStart=now;
     if(!leftPalmDone && now-leftPalmStart>1200){clearDrawing();leftPalmDone=true;creatorStatus.textContent='左手张掌：清空画布。';}
     fingerPos.Left=null;continue;
    }else{leftPalmStart=0;leftPalmDone=false}
    // Colour selection is touch-only; difficult two-second pinching is intentionally removed.
    if(h.pinching){fingerPos.Left=null;continue;}
   }
   const draw=h.isIndexExtended&&!h.pinching&&h.pose!=='open'&&p.x>=0&&p.x<=rect.width&&p.y>=0&&p.y<=rect.height;
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
  cakeNote.textContent='识别未就绪，检查网络后重新开启摄像头';
  creatorStatus.textContent='隔空识别未就绪，仍可触摸画画。';
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopFinger()});
})();