/* WINTER / Seven-moment Coverflow — progressive enhancement of About Me viewer.
   No changes to the pinned board or its original high-resolution photo sources. */
(()=>{
  'use strict';
  const dialog=document.getElementById('portrait-lightbox');
  const print=dialog?.querySelector('.portrait-lightbox-print');
  const oldPhoto=document.getElementById('portrait-large-image');
  const pins=Array.from(document.querySelectorAll('#panel-about [data-portrait]'));
  const shell=document.getElementById('main');
  if(!dialog||!print||!oldPhoto||pins.length!==7||dialog.dataset.coverflow)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const palette=[
    'rgba(152,189,196,.25)',
    'rgba(206,194,149,.29)',
    'rgba(209,155,163,.28)',
    'rgba(151,200,204,.27)',
    'rgba(211,182,145,.28)',
    'rgba(132,172,196,.29)',
    'rgba(177,174,201,.29)'
  ];
  const count=pins.length;
  const stage=document.createElement('section');
  stage.className='portrait-coverflow';
  stage.setAttribute('aria-label','七张照片的三维轮播，可左右滑动或点击左右卡片切换');
  stage.setAttribute('role','group');
  const track=document.createElement('div');
  track.className='portrait-coverflow-cards';
  const dots=document.createElement('nav');
  dots.className='portrait-coverflow-dots';
  dots.setAttribute('aria-label','跳转到某张照片');
  stage.append(track,dots);
  print.insertBefore(stage,oldPhoto);

  const cards=pins.map((pin,i)=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='portrait-coverflow-card';
    b.dataset.index=String(i);
    b.setAttribute('aria-label','第'+(i+1)+'张照片：'+(pin.querySelector('.portrait-words small')?.textContent||''));
    b.setAttribute('aria-current','false');
    const image=document.createElement('span');
    image.className='portrait-coverflow-photo';
    image.setAttribute('aria-hidden','true');
    image.style.setProperty('--tile-x',pin.style.getPropertyValue('--tile-x')||'0%');
    image.style.setProperty('--tile-y',pin.style.getPropertyValue('--tile-y')||'0%');
    const en=document.createElement('span');
    en.className='portrait-coverflow-card-title';
    en.textContent=pin.querySelector('.portrait-words b')?.textContent||'WINTER';
    const zh=document.createElement('span');
    zh.className='portrait-coverflow-card-subtitle';
    zh.textContent=pin.querySelector('.portrait-words small')?.textContent||'';
    b.append(image,en,zh);
    b.addEventListener('click',()=>{if(i!==index)pins[i].click()});
    track.append(b);
    return b;
  });
  const indicators=pins.map((pin,i)=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='portrait-coverflow-dot';
    b.setAttribute('aria-label','跳转到第'+(i+1)+'张');
    b.setAttribute('aria-current','false');
    b.addEventListener('click',()=>pins[i].click());
    dots.append(b);
    return b;
  });
  const hint=dialog.querySelector('.portrait-lightbox-hint');
  if(hint)hint.textContent='轻轻左右滑动 · 松手自动回弹 · 点击侧边照片直接跳转';

  dialog.dataset.coverflow='on';
  let index=0;
  let position=0;
  let dragging=null;
  let pending=0;
  let suppressClick=false;
  let suppressTimer=0;

  const quiet=()=>reduced.matches||shell?.dataset.motion==='off';
  function spacing(){
    return Math.min(190,Math.max(84,stage.clientWidth*.245));
  }
  function relative(i,at){
    let d=i-at;
    while(d>count/2)d-=count;
    while(d<-(count/2))d+=count;
    return d;
  }
  function update(immediate=false){
    if(!dialog.open&&!immediate)return;
    const step=spacing();
    const progress=Number.isFinite(position)?position:index;
    for(let i=0;i<count;i++){
      const card=cards[i];
      const d=relative(i,progress),abs=Math.abs(d),sign=Math.sign(d);
      const spread=(1-Math.exp(-abs*.88))/(1-Math.exp(-.88));
      const x=sign*step*spread;
      const y=Math.min(28,abs*11);
      const depth=-Math.min(265,abs*79);
      const angle=-sign*Math.min(55,abs*32);
      const size=Math.max(.70,1-Math.min(abs,3)*.11);
      const alpha=abs>2.75?0:Math.max(.22,1-Math.max(0,abs-.15)*.21);
      const blur=Math.max(0,abs-1.25)*.48;
      card.style.setProperty('--portrait-transform',
        'translate3d(calc(-50% + '+x.toFixed(2)+'px),calc(-50% + '+y.toFixed(2)+'px),'+depth.toFixed(2)+'px) rotateY('+angle.toFixed(2)+'deg) scale('+size.toFixed(3)+')');
      card.style.setProperty('--portrait-opacity',alpha.toFixed(3));
      card.style.setProperty('--portrait-blur',blur.toFixed(2)+'px');
      card.style.setProperty('--portrait-saturate',(1-Math.min(abs,3)*.13).toFixed(2));
      card.style.setProperty('--portrait-z',String(Math.round(100-abs*12)));
      const selected=i===index;
      card.dataset.selected=String(selected);
      card.setAttribute('aria-current',String(selected));
      card.tabIndex=abs<.45?0:-1;
      card.style.pointerEvents=abs<=2.4?'auto':'none';
      indicators[i].setAttribute('aria-current',String(selected));
    }
    stage.style.setProperty('--portrait-aura',palette[index]);
  }
  function schedule(){
    if(pending)return;
    pending=requestAnimationFrame(()=>{pending=0;update()});
  }
  dialog.addEventListener('winter:portrait-index',event=>{
    index=(Number(event.detail?.index)||0);
    position=index;
    stage.classList.remove('is-dragging');
    if(pending){cancelAnimationFrame(pending);pending=0}
    update(true);
  });
  dialog.addEventListener('close',()=>{
    dragging=null;
    stage.classList.remove('is-dragging');
    if(pending){cancelAnimationFrame(pending);pending=0}
    position=index;
    suppressClick=false;
    clearTimeout(suppressTimer);
  });
  // Horizontal gesture only: vertical swipes retain native dialog scrolling.
  stage.addEventListener('pointerdown',event=>{
    if(event.pointerType==='touch')return; // Native touch handling below
    if(!dialog.open||event.target.closest('.portrait-coverflow-dots'))return;
    if(event.pointerType==='mouse'&&event.button!==0)return;
    if(dragging)return;
    dragging={
      id:event.pointerId,
      startX:event.clientX,startY:event.clientY,
      lastX:event.clientX,lastTime:performance.now(),velocity:0,
      moved:false,vertical:false
    };
  },{passive:true});
  stage.addEventListener('pointermove',event=>{
    const p=dragging;
    if(!p||p.id!==event.pointerId||p.vertical)return;
    const dx=event.clientX-p.startX,dy=event.clientY-p.startY;
    if(!p.moved){
      if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){p.vertical=true;return;}
      if(Math.abs(dx)<6||Math.abs(dx)<Math.abs(dy)*1.13)return;
      p.moved=true;
      stage.classList.add('is-dragging');
      try{stage.setPointerCapture(event.pointerId)}catch(_){}
    }
    const now=performance.now();
    const dt=Math.max(8,now-p.lastTime);
    p.velocity=p.velocity*.65+((event.clientX-p.lastX)/dt)*.35;
    p.lastX=event.clientX;
    p.lastTime=now;
    // During a drag, card coordinates follow the finger without transition lag.
    position=index-dx/spacing();
    schedule();
    if(event.cancelable)event.preventDefault();
  },{passive:false});
  function endGesture(event,cancelled=false){
    const p=dragging;
    if(!p||p.id!==event.pointerId)return;
    dragging=null;
    if(!p.moved){stage.classList.remove('is-dragging');return;}
    const dx=event.clientX-p.startX;
    stage.classList.remove('is-dragging');
    suppressClick=true;
    clearTimeout(suppressTimer);
    suppressTimer=setTimeout(()=>{suppressClick=false},380);
    let steps=cancelled?0:Math.round(-(dx+p.velocity*140)/spacing());
    if(!cancelled&&steps===0&&Math.abs(dx)>=30)steps=dx>0?-1:1;
    steps=Math.max(-2,Math.min(2,steps));
    if(pending){cancelAnimationFrame(pending);pending=0}
    if(steps!==0){
      // Use the existing viewer's single source of truth for captions,
      // counters, keyboard actions and focus restoration.
      const target=(index+steps+count)%count;
      pins[target].click();
    }else{
      position=index;
      update(true);
    }
  }
  stage.addEventListener('pointerup',e=>endGesture(e),{passive:true});
  stage.addEventListener('pointercancel',e=>endGesture(e,true),{passive:true});
  stage.addEventListener('lostpointercapture',()=>{
    if(dragging?.moved){dragging=null;position=index;stage.classList.remove('is-dragging');update(true)}
  });

  // iPad touchscreen gestures: the browser may cancel pointer events when
  // scrolling. Native touchmove, explicitly non-passive, keeps light swipes.
  let finger=null;
  function findTouch(touches,id){
    for(let n=0;n<touches.length;n++)if(touches[n].identifier===id)return touches[n];
    return null;
  }
  stage.addEventListener('touchstart',event=>{
    if(!dialog.open||event.touches.length!==1||finger||event.target.closest('.portrait-coverflow-dots'))return;
    const t=event.changedTouches[0];
    finger={id:t.identifier,startX:t.clientX,startY:t.clientY,
      lastX:t.clientX,lastTime:performance.now(),velocity:0,horizontal:false,vertical:false};
  },{passive:true});
  stage.addEventListener('touchmove',event=>{
    const p=finger;
    if(!p||event.touches.length!==1||p.vertical)return;
    const t=findTouch(event.touches,p.id);
    if(!t)return;
    const dx=t.clientX-p.startX,dy=t.clientY-p.startY;
    if(!p.horizontal){
      if(Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)*1.2){p.vertical=true;return}
      if(Math.abs(dx)<3||Math.abs(dx)<Math.abs(dy)*.9)return;
      p.horizontal=true;stage.classList.add('is-dragging');
    }
    if(event.cancelable)event.preventDefault();
    const now=performance.now(),dt=Math.max(9,now-p.lastTime);
    p.velocity=p.velocity*.67+((t.clientX-p.lastX)/dt)*.33;
    p.lastX=t.clientX;p.lastTime=now;
    position=index-dx/spacing();
    schedule();
  },{passive:false});
  function endTouch(event,cancelled=false){
    if(!finger)return;
    const t=findTouch(event.changedTouches,finger.id);
    if(!t)return;
    const p=finger;finger=null;
    if(!p.horizontal){stage.classList.remove('is-dragging');return}
    stage.classList.remove('is-dragging');
    suppressClick=true;
    clearTimeout(suppressTimer);
    suppressTimer=setTimeout(()=>{suppressClick=false},480);
    const dx=t.clientX-p.startX;
    let steps=cancelled?0:Math.round(-(dx+p.velocity*98)/spacing());
    if(!cancelled&&steps===0&&Math.abs(dx)>=12)steps=dx>0?-1:1;
    steps=Math.max(-2,Math.min(2,steps));
    if(pending){cancelAnimationFrame(pending);pending=0}
    if(steps) pins[(index+steps+count)%count].click();
    else{position=index;update(true)}
  }
  stage.addEventListener('touchend',e=>endTouch(e),{passive:true});
  stage.addEventListener('touchcancel',e=>endTouch(e,true),{passive:true});

  stage.addEventListener('click',event=>{
    if(!suppressClick)return;
    suppressClick=false;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  },true);
  // Respect the standard keyboard arrows already bound to the dialog.
  // No auto-advancing timer: photos change only when the visitor acts.
  window.addEventListener('resize',()=>{if(dialog.open)schedule()},{passive:true});
  if(reduced.addEventListener)reduced.addEventListener('change',()=>{if(dialog.open)update(true)});
  update(true);
})();
