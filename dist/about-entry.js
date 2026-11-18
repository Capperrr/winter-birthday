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
    '<p class="winter-about-entry-kicker">THE SEVEN MOMENTS · WINTER, AT TWENTY-FIVE</p>'+
    '<h2 tabindex="-1">关于你，先从这些瞬间开始。</h2>'+
    '<p class="winter-about-entry-description">我喜欢你所有的模样。轻轻滑动照片，看看一路走来的你。</p>'+
    '<div class="winter-about-stage" role="region" aria-label="七张生活照片的 3D 卡片轮播，左右滑动或点击旁边照片切换">'+
      '<span class="winter-about-stage-status" aria-live="polite"></span></div>'+
    '<div class="winter-about-entry-bottom">'+
      '<div class="winter-about-entry-nav" aria-label="切换照片">'+
        '<button type="button" class="winter-about-previous" aria-label="上一张照片">‹</button>'+
        '<button type="button" class="winter-about-next" aria-label="下一张照片">›</button>'+
      '</div>'+
      '<button type="button" class="winter-about-to-notes">翻开下一页 · 25 张便利贴 <span aria-hidden="true">↗</span></button>'+
    '</div>';
  about.prepend(intro);
  const stage=intro.querySelector('.winter-about-stage');
  const status=intro.querySelector('.winter-about-stage-status');
  const previous=intro.querySelector('.winter-about-previous');
  const next=intro.querySelector('.winter-about-next');
  const toNotes=intro.querySelector('.winter-about-to-notes');
  const back=document.createElement('button');
  back.className='winter-about-notes-back';
  back.type='button';
  back.textContent='← 回到七个瞬间';
  notesHeading.after(back);
  const swatches=[
    'rgba(167,185,200,.34)','rgba(205,180,148,.32)','rgba(206,166,168,.27)',
    'rgba(148,190,185,.30)','rgba(197,174,181,.26)','rgba(146,180,202,.29)','rgba(170,170,202,.28)'
  ];
  const cards=pins.map((pin,i)=>{
    const item=document.createElement('button');
    item.type='button';
    item.className='winter-about-card';
    item.dataset.index=String(i);
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
  let clickSuppression=0;
  function distance(){
    return Math.min(190,Math.max(90,stage.getBoundingClientRect().width*.225));
  }
  function setCardPositions(){
    frame=0;
    const space=distance();
    cards.forEach((card,i)=>{
      const d=i-position;
      const magnitude=Math.abs(d),sign=Math.sign(d);
      const factor=(1-Math.exp(-magnitude*.83))/(1-Math.exp(-.83));
      const x=sign*space*factor,y=Math.min(23,magnitude*8);
      const depth=-Math.min(295,magnitude*86);
      const angle=-sign*Math.min(58,magnitude*34);
      const scale=Math.max(.69,1-Math.min(magnitude,3)*.115);
      const opacity=magnitude>3.05?0:Math.max(.21,1-Math.max(0,magnitude-.2)*.24);
      const blur=Math.max(0,magnitude-1.6)*.4;
      card.style.setProperty('--entry-transform',
        'translate3d(calc(-50% + '+x.toFixed(2)+'px),calc(-50% + '+y.toFixed(2)+'px),'+depth.toFixed(2)+'px) rotateY('+angle.toFixed(1)+'deg) scale('+scale.toFixed(3)+')');
      card.style.setProperty('--entry-opacity',opacity.toFixed(3));
      card.style.setProperty('--entry-z',String(Math.round(50-magnitude*9)));
      card.style.setProperty('--entry-blur',blur.toFixed(2)+'px');
      card.style.setProperty('--entry-sat',(1-Math.min(magnitude,3)*.12).toFixed(2));
      card.dataset.current=String(i===selected);
      card.tabIndex=magnitude<=2.3?0:-1;
      card.style.pointerEvents=magnitude<=2.4?'auto':'none';
    });
    stage.style.setProperty('--entry-light',swatches[selected]);
    previous.disabled=selected===0;
    next.disabled=selected===cards.length-1;
    status.textContent=String(selected+1).padStart(2,'0')+' / 07　·　'+cards[selected].querySelector('.winter-about-card-chinese').textContent;
  }
  function schedule(){
    if(frame)return;
    frame=requestAnimationFrame(setCardPositions);
  }
  function choose(i){
    selected=Math.min(cards.length-1,Math.max(0,Math.round(i)));
    position=selected;
    stage.classList.remove('is-dragging');
    setCardPositions();
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
  stage.addEventListener('click',event=>{
    if(!clickSuppression)return;
    clickSuppression=0;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  },true);
  function showIntro(reset=true){
    if(reset){selected=3;position=3}
    about.dataset.aboutMode='intro';
    about.scrollTop=0;
    setCardPositions();
  }
  function showNotes(){
    about.dataset.aboutMode='notes';
    about.scrollTop=0;
    const heading=notesHeading.querySelector('h2');
    heading?.setAttribute('tabindex','-1');
    requestAnimationFrame(()=>heading?.focus({preventScroll:true}));
  }
  toNotes.addEventListener('click',showNotes);
  back.addEventListener('click',()=>{showIntro(false);requestAnimationFrame(()=>intro.querySelector('h2')?.focus({preventScroll:true}))});
  let wasAbout=false;
  function syncRoute(){
    const now=shell.dataset.page==='about'&&!about.hidden;
    if(now&&!wasAbout)showIntro(true);
    wasAbout=now;
  }
  new MutationObserver(syncRoute).observe(shell,{attributes:true,attributeFilter:['data-page']});
  window.addEventListener('resize',()=>{if(!about.hidden)setCardPositions()},{passive:true});
  if(reduce.addEventListener)reduce.addEventListener('change',()=>{if(!about.hidden)setCardPositions()});
  syncRoute();
})();
