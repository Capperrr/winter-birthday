import * as THREE from './vendor/three.module.mjs';
import {ShenzhenGame,HOTSPOTS,SAVE_KEY} from './game-core.mjs';
import {createWorld} from './world.mjs';
import {InputController} from './input.mjs';
import {MaterialAudio} from './audio.mjs';

export async function startGame({rendererFactory=options=>new THREE.WebGLRenderer(options),worldFactory=createWorld}={}) {
  const byId=id=>document.getElementById(id),canvas=byId('world');
  let saved=null,storageOK=true;
  try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch(_){storageOK=false;}
  const core=new ShenzhenGame(saved),audio=new MaterialAudio();
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),coarse=window.matchMedia('(pointer: coarse)');
  const manager=new THREE.LoadingManager(),failedAssets=[];
  let renderer;
  try{renderer=rendererFactory({canvas,antialias:true,alpha:false,powerPreference:'low-power'});}catch(error){throw new Error('WebGL 2 unavailable: '+error.message);}
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const camera=new THREE.PerspectiveCamera(62,1,.06,180);camera.rotation.order='YXZ';
  const world=worldFactory({manager});world.scene.add(camera);
  let playing=false,paused=false,disposed=false,ready=false,contextLost=false;
  let raf=null,last=null,clock=0,toastUntil=0,saveClock=0,footClock=0,pickClock=0;
  let inspection=null,focus=null,lastHit=null,lastTarget='',lastObjective='',lastZone='';
  let yaw=core.yaw,targetYaw=core.yaw,pitch=core.pitch,targetPitch=core.pitch;
  let touchVisible=coarse.matches,quality='auto',lastSaved='',slowFrames=0,pixelLimit=coarse.matches?1.25:1.5;
  const raycaster=new THREE.Raycaster();raycaster.far=10;
  const center=new THREE.Vector2(0,0),direction=new THREE.Vector3(),pointVec=new THREE.Vector3();
  const removers=[];
  const listen=(t,e,f,o)=>{t.addEventListener(e,f,o);removers.push(()=>t.removeEventListener(e,f,o));};
  const damp=(speed,dt)=>1-Math.exp(-speed*dt);
  const angle=(to,from)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
  const zoneNames={street:'深圳街道',lobby:'C 座大堂',elevator:'电梯轿厢',corridor:'9F · 启德教育'};
  byId('new-game-button').hidden=!saved;byId('start-button').textContent=saved?'继续探索 ↗':'开始探索 ↗';
  byId('touch-toggle').checked=touchVisible;

  function toast(text,seconds=3) {byId('toast').textContent=text;byId('toast').hidden=false;toastUntil=clock+seconds;}
  function persist() {
    try {const value=JSON.stringify(core.snapshot());if(value!==lastSaved){localStorage.setItem(SAVE_KEY,value);lastSaved=value;}storageOK=true;return true;}catch(_){storageOK=false;return false;}
  }
  function resize(resetInput=true) {
    if(resetInput!==false)input?.reset();const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
    renderer.setPixelRatio(quality==='low'?1:Math.min(window.devicePixelRatio||1,pixelLimit));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    if(!playing||paused)renderStill();
  }
  function renderStill() {
    if(disposed||contextLost)return;
    core.yaw=yaw;core.pitch=pitch;camera.position.set(core.player.x,core.player.y+1.62,core.player.z);camera.rotation.set(pitch,yaw,0,'YXZ');
    world.update(0,core,camera,input?.hand);world.scene.updateMatrixWorld(true);renderer.render(world.scene,camera);
  }
  function markReady() {
    if(disposed||ready)return;ready=true;byId('load-label').textContent=failedAssets.length?'场景就绪 · 部分表面使用内置材质':'三维场景就绪';byId('load-count').textContent='';byId('start-button').disabled=contextLost;renderStill();
  }
  manager.onProgress=(url,loaded,total)=>{byId('load-label').textContent='正在准备空间与材质';byId('load-count').textContent=loaded+' / '+total;};
  manager.onError=url=>failedAssets.push(url);
  manager.onLoad=markReady;

  function hitAt(point=null,assist=true) {
    world.scene.updateMatrixWorld(true);
    if(point){const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((point.x-r.left)/r.width*2-1,1-(point.y-r.top)/r.height*2),camera);}
    else raycaster.setFromCamera(center,camera);
    const direct=world.pick(raycaster);if(direct||point||!assist)return direct;
    camera.getWorldDirection(direction);
    let best=null,bestDot=.90;
    for(const id of Object.keys(HOTSPOTS)) {
      if(!core.near(id)||id==='leaf'&&(core.held||core.flags.leafPlaced))continue;
      pointVec.set(...core.point(id)).sub(camera.position);const dot=pointVec.clone().normalize().dot(direction);if(dot<bestDot)continue;
      raycaster.set(camera.position,pointVec.normalize());const hit=world.pick(raycaster);
      if(hit?.id===id){best=hit;bestDot=dot;}
    }return best;
  }
  function focusAt(id) {focus={id,until:clock+(reduced.matches ? .05 : 1.6)};}
  function closeInspection(resetInput=true){inspection=null;byId('inspection').hidden=true;focus=null;if(resetInput)input.reset();}
  function openInspection(kind,id) {
    inspection=kind;core.velocity={x:0,z:0};input.reset();focusAt(id);byId('inspection').hidden=false;
    const title=byId('inspection-title'),body=byId('inspection-body');body.replaceChildren();
    const paragraph=(text,strong=false)=>{const p=document.createElement('p');if(strong){const b=document.createElement('strong');b.textContent=text;p.appendChild(b);}else p.textContent=text;body.appendChild(p);};
    if(kind==='sign'){title.textContent='C 座入口在前方';paragraph('天利中央广场 · 二期',true);paragraph('你已经确认导向牌：往前走，找到挂着 C 座标识的玻璃门。门要亲手打开，再步行进入大堂。');}
    if(kind==='directory'){title.textContent='启德教育 · 9F';paragraph('09F  启德教育',true);paragraph('楼层已经确认。关上索引，走近大堂尽头的电梯呼叫键。等门打开后再进入轿厢。');}
    if(kind==='puzzle'){title.textContent='留给走到这里的你';paragraph('窗边的黄铜叶片，请放回接待台的叶形凹槽。',true);paragraph('先把叶片拿起来，再带到接待台。对准凹槽放入后，信封的机关才会解开。');}
    if(kind==='letter'){title.textContent='Winter，生日快乐。';paragraph('这一次，终于走到我认识你的地方。');paragraph('我没有参与过的日子，想以后慢慢听你讲。从相遇这一页开始，最想珍惜的，是与你一起的那些平常时刻。');paragraph('愿你永远平安、自由，继续热爱天空和远方。');paragraph('— Gwen');byId('inspection-close').textContent='把信收好，继续走走 ↗';}
    else byId('inspection-close').textContent='记住了，返回观察 ↗';
  }
  function handleEvents() {
    for(const e of core.drainEvents()) {
      if(e.type==='entry:opening'){audio.cue('click');focusAt('c-entry');toast('玻璃门打开了。继续往前走进大堂。');}
      if(e.type==='directory:read')toast('已记住：启德教育在 9F。');
      if(e.type==='lift:called'){world.press('call-lift');audio.cue('ding');toast('电梯正在开门，等门完全打开后走进去。');}
      if(e.type==='lift:nine-pressed'){world.press('nine');audio.cue('click');focus={door:true,until:clock+(reduced.matches ? .05 : 2.1)};toast('9F 已按下。门正在关闭。');}
      if(e.type==='lift:arrived'){audio.cue('ding');toast('九楼到了。等门打开，再走进走廊。',4);}
      if(e.type==='lift:doors-closed')audio.cue('click');
      if(e.type==='item:picked'){audio.cue('metal');toast('叶片在手里了。可以继续走到接待台。');}
      if(e.type==='item:returned'){audio.cue('metal');toast('叶片已放回窗台。');}
      if(e.type==='puzzle:solved'){audio.cue('metal');toast('叶片已经吸附进凹槽。那封信可以拆开了。',4);}
      if(e.type==='letter:opened')audio.cue('paper');
      if(e.type==='zone:changed'&&e.zone==='elevator'&&!core.flags.ninePressed)toast('9F 按钮在轿厢右侧，转动视角找找。',4);
      persist();
    }
  }
  function interact(point=null) {
    if(!playing||paused||contextLost)return;
    if(inspection){closeInspection();return;}
    const hit=point?hitAt(point,false):hitAt();
    if(!hit){toast('看向近处的指示牌、按钮或物件，再调查。',2.5);return;}
    const result=core.interact(hit.id,{visible:true});
    if(!result.ok){toast(result.reason);audio.cue('click');return;}
    audio.cue('click');handleEvents();if(result.inspect)openInspection(result.inspect,hit.id);updateHUD(true);persist();
  }
  function drop(point) {
    if(!core.held||paused)return;
    const hit=hitAt(point,false);
    if(hit?.id==='socket'){const result=core.interact('socket');if(result.ok){handleEvents();updateHUD(true);persist();return;}toast(result.reason);}
    else toast('还没有放入凹槽，叶片仍在手中。');
    audio.cue('metal');
  }
  function cancel() {if(inspection){closeInspection();return;}if(core.cancelCarry()){handleEvents();updateHUD(true);return;}pause();}
  const input=new InputController({canvas,stick:byId('move-stick'),knob:byId('stick-knob'),carry:byId('carry-leaf'),onInteract:interact,onLook:(dx,dy)=>{focus=null;if(inspection)closeInspection(false);targetYaw-=dx*.0032;targetPitch=Math.max(-.72,Math.min(.72,targetPitch-dy*.0032));},onDrop:drop,onCancel:cancel,onPause:()=>pause()});

  function updateHUD(force=false) {
    const objective=core.objective();if(force||objective!==lastObjective){byId('objective').textContent=objective;lastObjective=objective;}
    if(force||lastZone!==core.zone){lastZone=core.zone;byId('place-name').textContent=zoneNames[core.zone];document.querySelectorAll('[data-stage]').forEach(el=>{if(el.dataset.stage===core.zone)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});}
    byId('carry-controls').hidden=!core.held;byId('carry-leaf').hidden=!core.held;
    const riding=['closing','rising','arriving','opening'].includes(core.lift.phase);byId('ride-hud').hidden=!riding;
    byId('floor-number').textContent=core.lift.floor+'F';byId('ride-label').textContent=core.lift.phase==='closing'?'电梯关门中':core.lift.phase==='rising'?'正在上升':core.lift.phase==='arriving'?'已到九楼':'电梯开门中';
    byId('skip-ride').hidden=!['closing','rising'].includes(core.lift.phase);byId('touch-controls').hidden=!touchVisible;
    byId('context').hidden=Boolean(inspection||riding);
  }
  function updateTarget() {
    lastHit=inspection?null:hitAt();const near=Boolean(lastHit&&core.near(lastHit.id));
    world.setHighlight(lastHit,camera,near);byId('reticle').dataset.near=String(near);
    const key=(lastHit?.id||'')+near+Boolean(core.held);if(key===lastTarget)return;lastTarget=key;
    byId('target-label').textContent=lastHit?(near?HOTSPOTS[lastHit.id].title:'走近 · '+HOTSPOTS[lastHit.id].title):'观察四周，走近物件';
    byId('interact-button').disabled=!near;byId('action-label').textContent=lastHit?.id==='nine'?'按下 9F':lastHit?.id==='socket'&&core.held?'放入叶片':lastHit?.id==='leaf'?'拿起':'调查';
  }
  function run(now) {
    raf=null;if(!playing||paused||disposed||contextLost||document.hidden)return;
    const realDt=last===null?1/60:Math.max(0,(now-last)/1000),dt=Math.min(.05,realDt);last=now;clock+=dt;
    const movement=input.movement();
    if(Math.abs(movement.forward)+Math.abs(movement.strafe)+Math.abs(movement.turn)>.03){focus=null;if(inspection)closeInspection(false);}
    targetYaw+=movement.turn*1.65*dt;
    if(focus&&focus.until>clock){const p=focus.door?[0,core.lift.y+1.65,-11.8]:core.point(focus.id);if(p){targetYaw=Math.atan2(-(p[0]-core.player.x),-(p[2]-core.player.z));targetPitch=Math.atan2(p[1]-(core.player.y+1.62),Math.hypot(p[0]-core.player.x,p[2]-core.player.z));}}
    else focus=null;
    yaw+=angle(targetYaw,yaw)*damp(18,dt);pitch+=(targetPitch-pitch)*damp(17,dt);pitch=Math.max(-.72,Math.min(.72,pitch));core.yaw=yaw;core.pitch=pitch;
    core.update(dt,inspection?{}:movement);handleEvents();
    const moving=Math.hypot(core.velocity.x,core.velocity.z),bob=reduced.matches?0:Math.sin(core.time*9)*.012*Math.min(1,moving);
    const dolly=focus&&!reduced.matches ? .10 : 0,dx=core.player.x-Math.sin(yaw)*dolly,dz=core.player.z-Math.cos(yaw)*dolly;
    const safe=core.canOccupy(dx,dz);camera.position.x+=( (safe?dx:core.player.x)-camera.position.x)*damp(30,dt);camera.position.z+=( (safe?dz:core.player.z)-camera.position.z)*damp(30,dt);
    camera.position.y=core.player.y+1.62+bob;camera.rotation.set(pitch,yaw,0,'YXZ');const fov=focus?55:62;camera.fov+=(fov-camera.fov)*damp(6,dt);camera.updateProjectionMatrix();
    world.update(dt,core,camera,input.hand);world.scene.updateMatrixWorld(true);
    pickClock+=dt;if(pickClock>.055){updateTarget();pickClock=0;}
    updateHUD();renderer.render(world.scene,camera);
    audio.setMotor(core.lift.phase==='rising');footClock+=dt;
    if(moving>.3&&footClock>.43&&core.lift.phase!=='rising'){audio.cue('step');footClock=0;}
    if(clock>toastUntil)byId('toast').hidden=true;
    saveClock+=dt;if(saveClock>2){persist();saveClock=0;}
    if(realDt>.04)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
    if(slowFrames>80&&pixelLimit>1){pixelLimit=1;slowFrames=0;resize(false);}
    raf=requestAnimationFrame(run);
  }
  function schedule() {if(raf===null&&!paused&&playing&&!document.hidden&&!contextLost&&!disposed){last=null;raf=requestAnimationFrame(run);}}
  function stopFrame(){if(raf!==null)cancelAnimationFrame(raf);raf=null;last=null;input.reset();core.velocity={x:0,z:0};audio.setMotor(false);}
  async function begin() {if(!ready||disposed||contextLost)return;byId('start-button').disabled=true;await audio.unlock();playing=true;paused=false;byId('start-screen').hidden=true;byId('hud').hidden=false;byId('objective-panel').hidden=false;byId('reticle').hidden=false;input.enabled=true;updateHUD(true);updateTarget();canvas.focus({preventScroll:true});schedule();}
  function pause(dialog=byId('pause-dialog')) {
    if(!playing||disposed)return;paused=true;stopFrame();input.enabled=false;persist();audio.suspend();
    byId('save-status').textContent=contextLost?'图形上下文暂时中断；恢复后可继续。':storageOK?'探索位置已保存在当前浏览器。':'当前浏览器无法保存；刷新后进度可能丢失。';
    if(!dialog.open)dialog.showModal();
  }
  async function resume() {if(contextLost||disposed)return;for(const id of ['pause-dialog','help-dialog','reset-dialog'])if(byId(id).open)byId(id).close();await audio.unlock();paused=false;input.enabled=true;canvas.focus({preventScroll:true});schedule();}
  function askReset(){if(byId('pause-dialog').open)byId('pause-dialog').close();if(!byId('reset-dialog').open)byId('reset-dialog').showModal();}
  function restart(){try{localStorage.removeItem(SAVE_KEY);}catch(_){}location.reload();}
  listen(byId('start-button'),'click',begin);
  listen(byId('new-game-button'),'click',askReset);
  listen(byId('pause-button'),'click',()=>pause());
  listen(byId('resume-button'),'click',resume);
  listen(byId('help-button'),'click',()=>pause(byId('help-dialog')));
  listen(byId('help-close'),'click',resume);
  listen(byId('pause-restart'),'click',askReset);
  listen(byId('reset-confirm'),'click',restart);
  listen(byId('reset-cancel'),'click',()=>{byId('reset-dialog').close();if(playing)pause();});
  for(const id of ['pause-dialog','help-dialog'])listen(byId(id),'cancel',e=>{e.preventDefault();resume();});
  listen(byId('reset-dialog'),'cancel',e=>{e.preventDefault();byId('reset-dialog').close();if(playing)pause();});
  listen(byId('sound-button'),'click',async()=>{await audio.unlock();audio.mute(audio.enabled);byId('sound-button').textContent=audio.enabled?'声音 开':'声音 关';byId('sound-button').setAttribute('aria-pressed',String(!audio.enabled));});
  listen(byId('interact-button'),'click',()=>interact());
  listen(byId('return-leaf'),'click',()=>{if(core.cancelCarry()){handleEvents();updateHUD(true);persist();}});
  listen(byId('inspection-close'),'click',()=>closeInspection());
  listen(byId('skip-ride'),'click',()=>{if(core.skipRide()){handleEvents();updateHUD(true);persist();}});
  listen(byId('touch-toggle'),'change',()=>{touchVisible=byId('touch-toggle').checked;byId('touch-controls').hidden=!touchVisible;});
  listen(byId('quality'),'change',()=>{quality=byId('quality').value;resize();});
  listen(window,'resize',resize,{passive:true});
  listen(canvas,'contextmenu',e=>e.preventDefault());
  listen(canvas,'webglcontextlost',e=>{e.preventDefault();if(disposed)return;contextLost=true;byId('resume-button').disabled=true;if(playing)pause();else{byId('load-label').textContent='图形上下文中断，等待恢复';byId('start-button').disabled=true;}});
  listen(canvas,'webglcontextrestored',()=>{if(disposed)return;contextLost=false;byId('resume-button').disabled=false;byId('start-button').disabled=!ready;byId('save-status').textContent='图形已恢复，继续探索会回到刚才的位置。';renderStill();});
  listen(document,'visibilitychange',()=>{if(document.hidden&&playing&&!paused)pause();});
  listen(byId('exit-link'),'click',()=>{persist();stopFrame();audio.suspend();});
  listen(window,'pagehide',event=>{persist();stopFrame();audio.suspend();if(!event.persisted){disposed=true;input.destroy();removers.forEach(f=>f());world.dispose();renderer.dispose();audio.dispose();}});
  listen(window,'pageshow',event=>{if(event.persisted&&playing){paused=true;input.enabled=false;if(!byId('pause-dialog').open)byId('pause-dialog').showModal();renderStill();}});
  Object.defineProperty(window,'shenzhenDiagnostics',{value:()=>Object.freeze({version:1,renderer:'Three.js r169 / WebGL2',ready,playing,paused,zone:core.zone,position:{...core.player},flags:{...core.flags},lift:{...core.lift},held:core.held,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,canvas:{width:canvas.width,height:canvas.height},pendingFrame:raf!==null,artStatus:'mechanics-prototype-not-surveyed',browserValidation:'not-verified-by-author'}),configurable:true});
  resize();renderStill();
  // LoadingManager callbacks cover textures; this also handles cached/no-texture builds.
  if(world.textureCount===0)markReady();
  return {dispose:()=>{disposed=true;stopFrame();input.destroy();world.dispose();renderer.dispose();audio.dispose();}};
}
