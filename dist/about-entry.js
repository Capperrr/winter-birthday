/* WINTER About Me: an actual first chapter (seven 3D photos),
   followed by the untouched editable "25" notes.
   The separate enlarged portrait dialog remains available on a center-card tap. */
(()=>{
  'use strict';
  const shell=document.getElementById('main');
  const about=document.getElementById('panel-about');
  const notesHeading=about?.querySelector('.about-heading');
  const pins=Array.from(about?.querySelectorAll('.keepsake-mosaic .portrait-pin[data-portrait]')||[])
    .sort((a,b)=>Number(a.dataset.portrait)-Number(b.dataset.portrait));
  if(!shell||!about||!notesHeading||pins.length!==7||about.querySelector('.winter-about-entry'))return;
  const reduce=window.matchMedia('(prefers-reduced-motion:reduce)');
  const intro=document.createElement('section');
  intro.className='winter-about-entry';
  intro.setAttribute('aria-label','About Me 第一章 · 七个瞬间');
  intro.innerHTML=
    '<div class="winter-about-context">'+
      '<p class="winter-about-entry-kicker">About Me</p>'+
      '<h2 tabindex="-1">关于你，先从这些瞬间开始。</h2>'+
      '<p class="winter-about-current-name" aria-hidden="true"></p>'+
      '<p class="winter-about-stage-status" aria-live="polite"></p>'+
      '<div class="winter-about-entry-nav" aria-label="切换照片">'+
        '<button type="button" class="winter-about-previous" aria-label="上一张照片">‹</button>'+
        '<button type="button" class="winter-about-next" aria-label="下一张照片">›</button>'+
      '</div>'+
      '<button type="button" class="winter-about-to-notes">写给 25 岁的自己 <span aria-hidden="true">↗</span></button>'+
    '</div>'+
    '<div class="winter-about-stage" role="region" aria-label="七张生活照片，左右滑动或点击旁边照片切换"></div>';
  about.prepend(intro);
  const stage=intro.querySelector('.winter-about-stage');
  const status=intro.querySelector('.winter-about-stage-status');
  const currentName=intro.querySelector('.winter-about-current-name');
  const previous=intro.querySelector('.winter-about-previous');
  const next=intro.querySelector('.winter-about-next');
  const toNotes=intro.querySelector('.winter-about-to-notes');
  const back=document.createElement('button');
  back.className='winter-about-notes-back';
  back.type='button';
  back.textContent='← 回到七个瞬间';
  notesHeading.after(back);
  const cards=pins.map((pin,i)=>{
    const item=document.createElement('button');
    item.type='button';
    item.className='winter-about-card';
    item.dataset.index=String(i);
    item.style.setProperty('--entry-i',String(Math.abs(i-3)));
    item.setAttribute('aria-label','第 '+(i+1)+' 张照片：'+(pin.querySelector('.portrait-words small')?.textContent||''));
    const photo=document.createElement('span');
    photo.className='winter-about-card-image';
    photo.setAttribute('aria-hidden','true');
    photo.style.setProperty('--tile-x',pin.style.getPropertyValue('--tile-x')||'0%');
    photo.style.setProperty('--tile-y',pin.style.getPropertyValue('--tile-y')||'0%');
    const en=document.createElement('span');
    en.className='winter-about-card-english';
    en.textContent=pin.querySelector('.portrait-words b')?.textContent||'WINTER';
    const zh=document.createElement('span');
    zh.className='winter-about-card-chinese';
    zh.textContent=pin.querySelector('.portrait-words small')?.textContent||'';
    item.append(photo,en,zh);
    stage.append(item);
    return item;
  });
  let selected=3;
  let position=3;
  let pointer=null;
  let frame=0;
  let settleFrame=0;
  let announced=-1;
  let clickSuppression=0;
  function distance(){
    return Math.min(196,Math.max(90,stage.clientWidth*.24));
  }
  function setCardPositions(){
    frame=0;
    const space=distance();
    cards.forEach((card,i)=>{
      const d=i-position;
      const magnitude=Math.abs(d),sign=Math.sign(d);
      const factor=(1-Math.exp(-magnitude*.83))/(1-Math.exp(-.83));
      const x=sign*space*factor,y=d*7;
      const depth=-Math.min(298,magnitude*78);
      const angle=-sign*Math.min(41,magnitude*21);
      const scale=Math.max(.69,1-Math.min(magnitude,3)*.115);
      const opacity=magnitude>3.05?0:Math.max(.21,1-Math.max(0,magnitude-.2)*.24);

      card.style.setProperty('--entry-transform',
        'translate3d(calc(-50% + '+x.toFixed(2)+'px),calc(-50% + '+y.toFixed(2)+'px),'+depth.toFixed(2)+'px) rotateY('+angle.toFixed(1)+'deg) scale('+scale.toFixed(3)+')');
      card.style.setProperty('--entry-opacity',opacity.toFixed(3));
      card.style.setProperty('--entry-z',String(Math.round(50-magnitude*9)));
      card.dataset.near=String(magnitude>.75 && magnitude<1.25);
      card.dataset.current=String(i===selected);
      card.tabIndex=magnitude<=2.3?0:-1;
      card.style.pointerEvents=magnitude<=2.4?'auto':'none';
    });
    if (announced !== selected) {
      announced=selected;
      previous.disabled=selected===0;
      next.disabled=selected===cards.length-1;
      currentName.textContent=cards[selected].querySelector('.winter-about-card-english').textContent;
      status.textContent=String(selected+1).padStart(2,'0')+' / 07　·　'+cards[selected].querySelector('.winter-about-card-chinese').textContent;
    }
  }
  function schedule(){
    if(frame)return;
    frame=requestAnimationFrame(setCardPositions);
  }
  function stopSettle(){
    if(settleFrame) cancelAnimationFrame(settleFrame);
    settleFrame=0;
  }
  function choose(i){
    selected=Math.min(cards.length-1,Math.max(0,Math.round(i)));
    stage.classList.remove('is-dragging');
    stopSettle();
    if(reduce.matches||shell.dataset.motion==='off'||Math.abs(position-selected)<.02){
      position=selected;
      setCardPositions();
      return;
    }
    let last=performance.now(), velocity=0;
    function settle(now){
      settleFrame=0;
      if(about.hidden||document.hidden||about.dataset.aboutMode!=='intro'){
        position=selected;
        return;
      }
      const dt=Math.min(.032,(now-last)/1000);
      last=now;
      velocity+=(182*(selected-position)-23*velocity)*dt;
      position+=velocity*dt;
      if(Math.abs(selected-position)<.003&&Math.abs(velocity)<.02){
        position=selected;
        setCardPositions();
        return;
      }
      setCardPositions();
      settleFrame=requestAnimationFrame(settle);
    }
    setCardPositions();
    settleFrame=requestAnimationFrame(settle);
  }
  previous.addEventListener('click',()=>choose(selected-1));
  next.addEventListener('click',()=>choose(selected+1));
  cards.forEach((card,i)=>{
    card.addEventListener('click',()=>{
      if(clickSuppression)return;
      if(i!==selected){choose(i);return}
      pins[i].click(); // Open original high-resolution viewer, no duplicated modal implementation.
    });
  });
  stage.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    if(event.key==='ArrowLeft')choose(selected-1);
    else if(event.key==='ArrowRight')choose(selected+1);
    else if(event.key==='Home')choose(0);
    else choose(cards.length-1);
    cards[selected].focus({preventScroll:true});
  });
  stage.addEventListener('pointerdown',event=>{
    if(event.pointerType==='touch')return; // iPad uses native TouchEvents below
    if(!event.isPrimary||(event.pointerType==='mouse'&&event.button!==0)||pointer)return;
    pointer={id:event.pointerId,x:event.clientX,y:event.clientY,
      lastX:event.clientX,lastT:performance.now(),velocity:0,
      active:false,vertical:false};
  },{passive:true});
  stage.addEventListener('pointermove',event=>{
    const p=pointer;
    if(!p||p.id!==event.pointerId||p.vertical)return;
    const dx=event.clientX-p.x,dy=event.clientY-p.y;
    if(!p.active){
      if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){p.vertical=true;return;}
      if(Math.abs(dx)<7||Math.abs(dx)<Math.abs(dy)*1.2)return;
      p.active=true;
      stopSettle();
      stage.classList.add('is-dragging');
      try{stage.setPointerCapture(event.pointerId)}catch(_){}
    }
    const t=performance.now();
    p.velocity=p.velocity*.65+((event.clientX-p.lastX)/Math.max(8,t-p.lastT))*.35;
    p.lastX=event.clientX;p.lastT=t;
    let nextPosition=selected-dx/distance();
    // Touch resistance at both ends rather than wrapping to a distant photo.
    if(nextPosition<0)nextPosition=nextPosition*.22;
    else if(nextPosition>cards.length-1)nextPosition=cards.length-1+(nextPosition-(cards.length-1))*.22;
    position=nextPosition;
    schedule();
    if(event.cancelable)event.preventDefault();
  },{passive:false});
  function release(event,cancelled){
    const p=pointer;
    if(!p||event.pointerId!==p.id)return;
    pointer=null;
    if(!p.active){stage.classList.remove('is-dragging');return}
    const dx=event.clientX-p.x;
    stage.classList.remove('is-dragging');
    clickSuppression=1;
    setTimeout(()=>{clickSuppression=0},220);
    let steps=cancelled?0:Math.round(-(dx+p.velocity*120)/distance());
    if(!cancelled&&steps===0&&Math.abs(dx)>30)steps=dx>0?-1:1;
    steps=Math.max(-2,Math.min(2,steps));
    choose(selected+steps);
  }
  stage.addEventListener('pointerup',e=>release(e,false),{passive:true});
  stage.addEventListener('pointercancel',e=>release(e,true),{passive:true});
  stage.addEventListener('lostpointercapture',()=>{
    if(pointer?.active){pointer=null;choose(selected)}
  });

  // iPad Safari/Chrome: use non-passive native TouchEvents for horizontal
  // gestures. Pointer Events can be cancelled by browser scrolling before
  // a light finger movement reaches the old drag threshold.
  let finger=null;
  function findFinger(list,id){
    for(let n=0;n<list.length;n++)if(list[n].identifier===id)return list[n];
    return null;
  }
  stage.addEventListener('touchstart',event=>{
    if(event.touches.length!==1||finger)return;
    const t=event.changedTouches[0];
    finger={id:t.identifier,x:t.clientX,y:t.clientY,
      lastX:t.clientX,lastT:performance.now(),velocity:0,
      horizontal:false,vertical:false};
  },{passive:true});
  stage.addEventListener('touchmove',event=>{
    const p=finger;
    if(!p||event.touches.length!==1||p.vertical)return;
    const t=findFinger(event.touches,p.id);
    if(!t)return;
    const dx=t.clientX-p.x,dy=t.clientY-p.y;
    if(!p.horizontal){
      if(Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)*1.2){p.vertical=true;return}
      if(Math.abs(dx)<3||Math.abs(dx)<Math.abs(dy)*.9)return;
      p.horizontal=true;
      stopSettle();
      stage.classList.add('is-dragging');
    }
    if(event.cancelable)event.preventDefault();
    const time=performance.now(),dt=Math.max(9,time-p.lastT);
    p.velocity=p.velocity*.67+((t.clientX-p.lastX)/dt)*.33;
    p.lastX=t.clientX;p.lastT=time;
    let pos=selected-dx/distance();
    if(pos<0)pos*=.2;
    if(pos>cards.length-1)pos=(cards.length-1)+(pos-(cards.length-1))*.2;
    position=pos;
    schedule();
  },{passive:false});
  function finishFinger(event,cancelled=false){
    if(!finger)return;
    const t=findFinger(event.changedTouches,finger.id);
    if(!t)return;
    const p=finger;finger=null;
    if(!p.horizontal){stage.classList.remove('is-dragging');return}
    const dx=t.clientX-p.x;
    stage.classList.remove('is-dragging');
    clickSuppression=1;
    setTimeout(()=>{clickSuppression=0},480);
    let steps=cancelled?0:Math.round(-(dx+p.velocity*95)/distance());
    if(!cancelled&&steps===0&&Math.abs(dx)>=12)steps=dx>0?-1:1;
    steps=Math.max(-2,Math.min(2,steps));
    choose(selected+steps);
  }
  stage.addEventListener('touchend',e=>finishFinger(e),{passive:true});
  stage.addEventListener('touchcancel',e=>finishFinger(e,true),{passive:true});

  stage.addEventListener('click',event=>{
    if(!clickSuppression)return;
    clickSuppression=0;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  },true);
  function showIntro(reset=true){
    stopSettle();
    if(reset){selected=3;position=3}
    about.dataset.aboutMode='intro';
    shell.dataset.aboutTheme='night';
    about.scrollTop=0;
    setCardPositions();
  }
  function showNotes(focusHeading = true){
    stopSettle();
    about.dataset.aboutMode='notes';
    shell.dataset.aboutTheme='paper';
    if (!focusHeading) return;
    about.scrollTop=0;
    const heading=notesHeading.querySelector('h2');
    heading?.setAttribute('tabindex','-1');
    requestAnimationFrame(()=>heading?.focus({preventScroll:true}));
  }
  toNotes.addEventListener('click',()=>showNotes());
  about.addEventListener('winter:about-journey-enter',()=>{
    if (about.dataset.aboutMode !== 'notes') showNotes(false);
  });
  about.addEventListener('winter:about-start',()=>showIntro(false));
  back.addEventListener('click',()=>{showIntro(false);requestAnimationFrame(()=>intro.querySelector('h2')?.focus({preventScroll:true}))});
  let wasAbout=false;
  function syncRoute(){
    const now=shell.dataset.page==='about'&&!about.hidden;
    if(now&&!wasAbout){
      if(location.hash==='#journey'){
        showNotes(false);
        requestAnimationFrame(()=>{
          if(location.hash==='#journey'&&!about.hidden)document.getElementById('journey-page').scrollIntoView({block:'start',behavior:'instant'});
        });
      }else showIntro(true);
    }
    else if(!now)stopSettle();
    wasAbout=now;
  }
  new MutationObserver(syncRoute).observe(shell,{attributes:true,attributeFilter:['data-page']});
  window.addEventListener('resize',()=>{if(!about.hidden)setCardPositions()},{passive:true});
  if(reduce.addEventListener)reduce.addEventListener('change',()=>{if(!about.hidden)choose(selected)});
  syncRoute();

  const bridge=document.getElementById('about-journey-bridge');
  const emblem=bridge.querySelector('.about-idea-emblem');
  const invitation=bridge.querySelector('.about-idea-copy p');
  const sentence=invitation.textContent;
  const readable=document.createElement('span');
  readable.className='sr-only';
  readable.textContent=sentence;
  invitation.replaceChildren(readable,...Array.from(sentence,(letter,index)=>{
    const mark=document.createElement('span');
    mark.className='about-idea-letter';
    mark.textContent=letter;
    mark.setAttribute('aria-hidden','true');
    mark.style.setProperty('--letter-delay',index*18+'ms');
    return mark;
  }));
  if ('IntersectionObserver' in window) {
    const reveal=new IntersectionObserver(entries=>{
      if (!entries.some(entry=>entry.isIntersecting)) return;
      bridge.dataset.arrived='true';
      reveal.disconnect();
    },{root:about,threshold:.35});
    reveal.observe(bridge);
  }
  let magnetBounds;
  emblem.addEventListener('pointerenter',()=>{ magnetBounds=emblem.getBoundingClientRect(); });
  emblem.addEventListener('pointermove',event=>{
    if (!magnetBounds || event.pointerType === 'touch' || reduce.matches || shell.dataset.motion === 'off') return;
    const x=(event.clientX-magnetBounds.left)/magnetBounds.width-.5;
    const y=(event.clientY-magnetBounds.top)/magnetBounds.height-.5;
    emblem.style.setProperty('--idea-x',x*12+'px');
    emblem.style.setProperty('--idea-y',y*9+'px');
  },{passive:true});
  emblem.addEventListener('pointerleave',()=>{
    magnetBounds=null;
    emblem.style.removeProperty('--idea-x');
    emblem.style.removeProperty('--idea-y');
  });
  let switchOff;
  emblem.addEventListener('pointerdown',()=>{
    bridge.dataset.lit='true';
    clearTimeout(switchOff);
    switchOff=setTimeout(()=>{ delete bridge.dataset.lit; },1200);
  },{passive:true});
})();
