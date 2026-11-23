/* Paper exhibits keep native scrolling. The light and camera share its measured progress. */
(() => {
  'use strict';
  const shell=document.getElementById('main');
  const scroller=document.getElementById('panel-home');
  const rail=document.getElementById('relief-rail');
  const stage=document.getElementById('relief-stage');
  const viewer=document.getElementById('relief-viewer');
  if (!shell || !scroller || !rail || !stage || !viewer) return;
  const panels=[...rail.querySelectorAll('.relief-panel')];
  const still=matchMedia('(prefers-reduced-motion: reduce)');
  const lettering=rail.querySelector('.relief-lettering');
  let offsets=[];
  let progress=0,goal=0,night=0,seconds=0,last=0,raf=0;
  let lag=0;
  let pointer={x:0,y:0};
  const look={x:0,y:0};
  let controller=null, wall=null;
  let fallback=false;
  let active=false;
  let drawnProgress;

  function enabled() {
    return !still.matches && shell.dataset.motion!=='off' &&
      !navigator.connection?.saveData && (navigator.deviceMemory || 8)>2;
  }
  const ambient=()=>shell.dataset.motionPaused!=='true' && !viewer.open;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const ease=value=>value*value*(3-2*value);

  function stopWall() {
    controller?.abort();
    controller=null;
    wall=null;
    rail.dataset.sculpture='still';
  }

  function bootWall() {
    if (controller || fallback) return;
    const run=new AbortController();
    controller=run;
    rail.dataset.sculpture='loading';
    import('./winter-relief-wall.js?v=alabaster-1').then(({mountReliefWall})=>{
      return mountReliefWall(stage,run.signal,()=>{
        fallback=true;
        stopWall();
      });
    }).then(next=>{
      if (run.signal.aborted || !next) return;
      wall=next;
      wall.draw(progress,look,night,seconds);
      rail.dataset.sculpture='live';
      wake();
    }).catch(()=>{
      if (run.signal.aborted) return;
      fallback=true;
      stopWall();
    });
  }

  function measure() {
    offsets=panels.map(panel=>panel.offsetTop);
    scroll();
  }

  function scroll() {
    if (!active || offsets.length!==3) return;
    const y=scroller.scrollTop;
    const chapter=y<offsets[1] ? 0 : 1;
    const start=offsets[chapter], end=offsets[chapter+1];
    goal=chapter+clamp((y-start)/Math.max(1,end-start),0,1);
    rail.dataset.reliefChapter=String(Math.round(goal));
    wake();
  }

  function paint(now) {
    raf=0;
    if (!active || document.hidden) return;
    const interval=1000/27;
    if (last && now-last<interval-4) {wake();return;}
    const delta=last ? Math.min(120,now-last) : interval;
    last=now;
    if (ambient()) seconds+=delta*.001;
    const weight=1-Math.exp(-delta/120);
    progress+=(goal-progress)*weight;
    const targetNight=shell.dataset.livingTime==='night' ? 1 : 0;
    night+=(targetNight-night)*(1-Math.exp(-delta/360));
    look.x+=(pointer.x-look.x)*weight;
    look.y+=(pointer.y-look.y)*weight;
    const motion=enabled();
    const p=motion ? Math.round(progress*1200)/1200 : -1;
    if (p!==drawnProgress) {
      drawnProgress=p;
      const pull=motion ? ease(clamp(1-p,0,1)) : 0;
      rail.style.setProperty('--relief-cover-offset',String(clamp(p,0,1)*28));
      rail.style.setProperty('--relief-sea-offset',String(pull*125));
      rail.style.setProperty('--relief-sunset-offset',String(pull*59));
      rail.style.setProperty('--relief-poem-offset',String(motion ? ease(clamp(2-p,0,1))*57 : 0));
    }
    if (wall) {
      lag=delta>=68 ? lag+1 : Math.max(0,lag-2);
      if (lag===9) {wall.reduce();lag=0;}
      wall.draw(progress,look,night,seconds);
    }
    const easing=Math.abs(goal-progress)>.001 || Math.abs(targetNight-night)>.006;
    if ((wall && ambient()) || easing) wake();
  }

  function wake() {
    if (active && !document.hidden && !raf) raf=requestAnimationFrame(paint);
  }

  function sync() {
    const open=shell.dataset.page==='home' && !scroller.hidden;
    if (open!==active) {
      active=open;
      if (open) {
        scroller.scrollTop=0;
        goal=progress=0;
        measure();
      }
    }
    if (!active || !enabled()) stopWall();
    else if (!document.hidden) bootWall();
    if (!active || document.hidden) {cancelAnimationFrame(raf);raf=0;last=0;}
    wake();
  }

  lettering.decode().then(()=>{
    lettering.closest('.relief-title').dataset.raised='true';
  }).catch(()=>{});

  rail.addEventListener('click',event=>{
    const jump=event.target.closest('[data-relief-target]');
    if (jump) {
      const chapter=document.getElementById(jump.dataset.reliefTarget);
      scroller.scrollTo({top:chapter.offsetTop,behavior:enabled() ? 'smooth' : 'instant'});
      const title=chapter.querySelector('h2');
      title.tabIndex=-1;
      title.focus({preventScroll:true});
    }
    const route=event.target.closest('[data-relief-route]');
    if (route) document.getElementById('tab-'+route.dataset.reliefRoute)?.click();
    const print=event.target.closest('.relief-print');
    if (!print || typeof viewer.showModal!=='function') return;
    event.preventDefault();
    const image=viewer.querySelector('img');
    image.src=print.href;
    image.alt=print.querySelector('img').alt;
    viewer.showModal();
  });
  viewer.querySelector('button').addEventListener('click',()=>viewer.close());
  viewer.addEventListener('close',wake);
  scroller.addEventListener('scroll',scroll,{passive:true});
  scroller.addEventListener('pointermove',event=>{
    if (event.pointerType!=='mouse' || !ambient()) return;
    const bounds=scroller.getBoundingClientRect();
    pointer={x:clamp((event.clientX-bounds.left)/bounds.width*2-1,-1,1),
      y:clamp((event.clientY-bounds.top)/bounds.height*2-1,-1,1)};
    wake();
  },{passive:true});
  scroller.addEventListener('pointerleave',()=>{pointer={x:0,y:0};wake();},{passive:true});
  document.getElementById('tab-home').addEventListener('click',()=>scroller.scrollTo({top:0,behavior:'instant'}));
  new ResizeObserver(measure).observe(rail);
  new MutationObserver(sync).observe(shell,{attributes:true,
    attributeFilter:['data-page','data-living-time','data-motion','data-motion-paused']});
  document.addEventListener('visibilitychange',sync);
  still.addEventListener('change',sync);
  sync();
})();
