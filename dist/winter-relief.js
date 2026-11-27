import { setupReliefPrints } from './winter-relief-prints.js?v=photographic-flow';

(() => {
  'use strict';
  const shell=document.getElementById('main');
  const scroller=document.getElementById('panel-home');
  const rail=document.getElementById('relief-rail');
  const stage=document.getElementById('relief-stage');
  const viewer=document.getElementById('relief-viewer');
  if(!shell||!scroller||!rail||!stage||!viewer)return;
  const panels=[...rail.querySelectorAll('.relief-panel')];
  const prints=[...rail.querySelectorAll('.relief-print')];
  const postscript=rail.querySelector('.relief-postscript');
  const enter=document.getElementById('relief-enter');
  const title=document.getElementById('relief-title');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const query=new URLSearchParams(location.search);
  const debug=query.get('debug')==='relief';
  const wallStudy=query.get('study')==='relief';
  if(wallStudy)scroller.dataset.wallStudy='true';
  const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));
  const scrollRange=()=>Math.max(1,scroller.scrollHeight-scroller.clientHeight);
  const fade=(value,start,end)=>{
    const t=clamp((value-start)/(end-start));
    return t*t*(3-2*t);
  };

  const fallbackStatus=document.createElement('p');
  fallbackStatus.className='relief-fallback-status';
  fallbackStatus.setAttribute('role','status');
  fallbackStatus.textContent='3D 浮雕暂时无法启动，现使用静态墙面。运行详情见 ?debug=relief。';
  fallbackStatus.hidden=true;
  scroller.append(fallbackStatus);
  const diagnostic=debug?document.createElement('pre'):null;
  if(diagnostic){
    diagnostic.className='relief-diagnostics';
    diagnostic.id='relief-debug';
    diagnostic.setAttribute('aria-label','Home 浮雕诊断');
    scroller.append(diagnostic);
  }
  const resources={webgl:'未启动',device:'—',model:'未请求',textures:'未建立',shaderError:'',error:''};
  const pendingContacts=[];
  let active=false,failure='',reason='',controller=null,wall=null,frame=null,input=null;
  let progress=0,goal=0,lastInput=-Infinity,seconds=0,previousTime=0,raf=0;
  let fps=0,startSample=0,samples=0,lastReport=0;
  let renderedFrames=0;
  let chapter=-1;
  const exhibits=setupReliefPrints(rail,{
    reducedMotion:()=>Boolean(blocked()),
    onInput(){ input=null; pendingContacts.length=0; lastInput=seconds; }
  });

  function blocked(){
    if(reduce.matches)return 'prefers-reduced-motion';
    if(shell.dataset.motion==='off')return '用户暂停动效';
    if(navigator.connection?.saveData)return 'Save-Data';
    return '';
  }

  function canPlay(){
    return !document.hidden && !viewer.open && shell.dataset.motionPaused!=='true';
  }

  function diagnose(){
    if(!diagnostic)return;
    let stored=null;
    try{stored=localStorage.getItem('winter-ambient-motion-paused');}catch(_){}
    diagnostic.textContent=[
      'WINTER / 动态浮雕',
      '状态 '+(rail.dataset.sculpture==='still'?'static':rail.dataset.sculpture || 'static')+(reason?' · '+reason:''),
      'WebGL '+resources.webgl+' · '+resources.device,
      '实测 FPS '+fps.toFixed(1)+' · Scroll '+(goal*100).toFixed(1)+'%',
      'Camera XYZ '+(frame?.camera.map(x=>x.toFixed(2)).join(', ')??'—'),
      '画布 '+(frame?.resolution.join(' × ')??'—')+' · '+(frame?.trace??'—'),
      '模型 '+resources.model,
      '位移场 '+resources.textures,
      '照片 '+prints.filter(item=>item.querySelector('img').naturalWidth>0).length+'/4',
      'reduced-motion '+reduce.matches+' · data-motion '+(shell.dataset.motion??'—'),
      '暂停 '+(shell.dataset.motionPaused??'—')+' · localStorage '+(stored??'未设置'),
      'Save-Data '+Boolean(navigator.connection?.saveData)+' · 内存 '+(navigator.deviceMemory??'未公开'),
      'Shader '+(resources.shaderError||'无编译错误'),
      resources.error?'错误 '+resources.error:''
    ].filter(Boolean).join('\n');
  }
  if(debug){
    window.WINTER_RELIEF_PROBE={
      motifs:()=>wall?.visibleMotifs() || [],
      sample:(x,y)=>wall?.probe(x,y)??null,
      frame:()=>({progress,goal,seconds,fps,renderedFrames,...frame})
    };
  }

  function setStatus(state,why=''){
    rail.dataset.sculpture=state;
    rail.dataset.sculptureReason=why;
    reason=why;
    fallbackStatus.hidden=!failure || !active || Boolean(blocked());
    diagnose();
  }

  function resetFrameStats(){
    previousTime=fps=startSample=samples=0;
  }
  function stop(why){
    const wasLive=rail.dataset.sculpture==='live';
    const previousProgress=goal;
    controller?.abort();
    controller=null;
    wall=frame=input=null;
    pendingContacts.length=0;
    resetFrameStats();
    chapter=-1;
    panels.forEach(panel=>{panel.inert=wallStudy;panel.removeAttribute('data-current');panel.removeAttribute('data-in-view');});
    rail.style.removeProperty('--cover-travel');
    if(wasLive||!active)exhibits.reset();
    enter.inert=postscript.inert=false;
    if(!failure)Object.assign(resources,{webgl:'未启动',device:'—',model:'未请求',textures:'未建立'});
    setStatus('still',why);
    if(wasLive&&active)scroller.scrollTop=previousProgress*scrollRange();
    if(active)scroll();
  }
  function fail(message){
    failure=message;
    resources.error=message;
    stop('3D 启动失败');
  }

  function updateChapters(p){
    const index=p<.30?0:p<.65?1:2;
    if(index!==chapter){
      panels.forEach((panel,i)=>{panel.inert=wallStudy||i!==index;panel.dataset.current=String(i===index);});
      rail.dataset.reliefChapter=String(index);
      chapter=index;
    }
    const handoff=fade(p,.262,.336);
    const reunion=fade(p,.616,.694);
    [1-handoff,handoff*(1-reunion),reunion].forEach((opacity,i)=>{
      panels[i].style.setProperty('--act-opacity',opacity.toFixed(3));
      panels[i].toggleAttribute('data-in-view',opacity>.002);
    });
    rail.style.setProperty('--cover-travel',`${(-26*handoff).toFixed(2)}px`);
    exhibits.project(p,index,scroller.clientHeight);
    const details=fade(p,.783,.887);
    rail.style.setProperty('--postscript',details.toFixed(3));
    postscript.inert=details<.23;
    const finalLink=fade(p,.878,.954);
    rail.style.setProperty('--final-link',finalLink.toFixed(3));
    enter.inert=finalLink<.25;
  }

  function scroll(event){
    if(!active)return;
    const next=clamp(scroller.scrollTop/scrollRange());
    if(event?.type==='scroll'&&next!==goal)lastInput=seconds;
    goal=next;
    if(wall&&rail.dataset.sculpture==='live')updateChapters(goal);
    else {
      const coverTravel=scroller.scrollTop/Math.max(1,scroller.clientHeight);
      stage.style.setProperty('--gallery-poster',fade(coverTravel,.04,.78).toFixed(3));
      stage.style.setProperty('--moment-poster',fade(coverTravel,1.16,1.97).toFixed(3));
      if(!wallStudy)exhibits.projectFlow(scroller.clientHeight);
    }
    if(!wall)diagnose();
    wake();
  }

  function paint(now){
    raf=0;
    if(!active||!wall||!canPlay())return;
    const elapsed=previousTime?Math.max(1,now-previousTime):16.67;
    previousTime=now;
    seconds+=elapsed*.001;
    progress=Math.abs(goal-progress)<.00025?goal:progress+(goal-progress)*(1-Math.exp(-elapsed/76));
    const night=Number(shell.style.getPropertyValue('--home-night'))||0;
    const held=input&&(input.touch||seconds-lastInput<.4)?input:null;
    const drawn=wall.draw({progress,seconds,night,input:held,contacts:pendingContacts,lastInput,
      view:wallStudy?'scenery':shell.dataset.view});
    if(drawn){frame=drawn;renderedFrames++;pendingContacts.length=0;}
    if(resources.shaderError){fail('Shader 编译失败');return;}
    if(drawn&&rail.dataset.sculpture==='loading'){
      const previousProgress=goal;
      setStatus('live');
      scroller.scrollTop=previousProgress*scrollRange();
      scroll();
      wall.resize();
    }
    if(drawn){
      if(!startSample)startSample=now;
      samples++;
      const windowTime=now-startSample;
      if(windowTime>1120){
        fps=(samples-1)*1000/windowTime;
        startSample=now;samples=1;
      }
    }
    if(debug&&now-lastReport>240){lastReport=now;diagnose();}
    wake();
  }
  function wake(){
    if(active&&wall&&canPlay()&&!raf)raf=requestAnimationFrame(paint);
  }
  function boot(){
    if(controller||failure)return;
    const run=new AbortController();
    controller=run;
    seconds=0;
    lastInput=-Infinity;
    Object.assign(resources,{webgl:'正在启动',device:'—',model:'未请求',textures:'未建立',shaderError:'',error:''});
    setStatus('loading');
    import('./winter-relief-wall.js?v=carved-snow').then(({mountReliefWall})=>mountReliefWall(stage,{
      signal:run.signal,title,
      report(data){if(!run.signal.aborted){Object.assign(resources,data);diagnose();}},
      onContextLost:fail
    })).then(next=>{
      if(!next||run.signal.aborted)return;
      wall=next;
      wake();
      document.fonts.ready.then(()=>{if(!run.signal.aborted){next.resize();wake();}});
    }).catch(error=>{
      if(run.signal.aborted)return;
      if(resources.webgl==='正在启动')resources.webgl='不可用';
      fail(error.message);
    });
  }

  function sync(){
    const open=shell.dataset.page==='home'&&!scroller.hidden;
    if(open!==active){
      active=open;
      if(active){failure='';scroller.scrollTop=progress=goal=0;lastInput=-Infinity;}
    }
    const reason=blocked();
    if(!active||reason)stop(active?reason:'已离开 Home');
    else if(!document.hidden)boot();
    if(!active||!canPlay()){
      cancelAnimationFrame(raf);raf=0;
      resetFrameStats();
      input=null;
      pendingContacts.length=0;
    }
    diagnose();
    wake();
  }

  function contact(x,y,touch,begin=false){
    if(!active||!canPlay()||(!wall&&rail.dataset.sculpture!=='loading'))return;
    const box=stage.getBoundingClientRect();
    if(!box.width||!box.height||x<box.left||x>box.right||y<box.top||y>box.bottom)return;
    const nx=(x-box.left)/box.width,ny=(y-box.top)/box.height;
    const join=!begin&&input?.touch===touch&&(touch||seconds-lastInput<.4);
    input={x:nx,y:ny,touch,join,point:frame?wall.contactAt(nx,ny):null};
    pendingContacts.push(input);
    if(pendingContacts.length>32)pendingContacts.shift();
    lastInput=seconds;
    wake();
  }
  function release(){
    if(input)lastInput=seconds;
    input=null;
    wake();
  }

  for(const print of prints){
    const image=print.querySelector('img');
    const message=print.querySelector('.relief-photo-error');
    function showImageState(){
      const loaded=image.complete&&image.naturalWidth>0;
      const failed=image.complete&&!loaded;
      print.disabled=!loaded;
      print.dataset.photoState=failed?'error':loaded?'ready':'loading';
      message.hidden=!failed;
      diagnose();
    }
    image.addEventListener('load',showImageState);
    image.addEventListener('error',showImageState);
    showImageState();
  }
  title.querySelector('.relief-lettering').decode().then(()=>{
    title.dataset.raised='true';
    wall?.resize();
  }).catch(()=>{});
  rail.addEventListener('click',event=>{
    const jump=event.target.closest('[data-relief-progress]');
    if(jump){
      const top=wall?scrollRange()*Number(jump.dataset.reliefProgress):
        document.getElementById(jump.getAttribute('aria-controls')).offsetTop;
      scroller.scrollTo({top,behavior:blocked()?'instant':'smooth'});
    }
    const route=event.target.closest('[data-relief-route]');
    if(route)document.getElementById('tab-'+route.dataset.reliefRoute)?.click();
    const print=event.target.closest('.relief-print');
    if(!print||print.disabled||print.inert||!exhibits.permitsClick(event,print)||typeof viewer.showModal!=='function')return;
    const painted=print.querySelector('img');
    const full=viewer.querySelector('img');
    full.src=painted.currentSrc||painted.src;
    full.alt=painted.alt;
    viewer.showModal();
  });
  viewer.querySelector('button').addEventListener('click',()=>viewer.close());
  viewer.addEventListener('close',sync);
  scroller.addEventListener('scroll',scroll,{passive:true});
  scroller.addEventListener('pointerdown',event=>{
    if(event.pointerType==='touch'||event.button!==0||event.isPrimary===false||
      event.target.closest?.('button,a,dialog,[data-print-surface]'))return;
    contact(event.clientX,event.clientY,false,true);
  },{passive:true});
  scroller.addEventListener('pointermove',event=>{
    if(event.target.closest?.('[data-print-surface]'))return;
    if(event.pointerType==='mouse'&&!input?.touch)contact(event.clientX,event.clientY,false);
  },{passive:true});
  scroller.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'&&!input?.touch)release();},
    {passive:true});
  for(const name of ['touchstart','touchmove'])scroller.addEventListener(name,event=>{
    const point=event.touches[0];
    if(point&&event.touches.length===1){
      if(event.target.closest?.('button,a,dialog'))return;
      contact(point.clientX,point.clientY,true,event.type==='touchstart');
    }
    else release();
  },{passive:true});
  for(const name of ['touchend','touchcancel'])scroller.addEventListener(name,release,{passive:true});
  document.getElementById('tab-home').addEventListener('click',()=>scroller.scrollTo({top:0,behavior:'instant'}));
  new ResizeObserver(()=>{wall?.resize();scroll();}).observe(scroller);
  new MutationObserver(sync).observe(shell,{attributes:true,
    attributeFilter:['data-page','data-living-time','data-motion','data-motion-paused','data-view']});
  document.addEventListener('visibilitychange',sync);
  reduce.addEventListener('change',sync);
  navigator.connection?.addEventListener?.('change',sync);
  sync();
})();
