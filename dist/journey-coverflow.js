/* WINTER Journey: five actual photos as a swipeable 3D Coverflow.
   It only requests stop changes from journey.js, so every letter, note,
   slider, credit and afterword keeps its original single source of truth. */
(()=>{
  'use strict';
  const page=document.getElementById('journey-page');
  const shell=document.getElementById('main');
  const frame=document.getElementById('journey-frame');
  const track=page?.querySelector('.journey-photographs');
  const letter=page?.querySelector('.journey-letter');
  if(!page||!shell||!frame||!track||!letter||page.dataset.journeyCoverflow==='on')return;
  const order=[
    ['dazhou','四川达州'],
    ['school','初中和高中'],
    ['chongqing','重庆工商大学'],
    ['southampton','南安普顿大学'],
    ['together','深圳相遇']
  ];
  const cards=order.map(([key])=>track.querySelector('.journey-photo[data-photo-key="'+key+'"]'));
  if(cards.some(card=>!card))return;
  const quiet=window.matchMedia('(prefers-reduced-motion:reduce)');
  let index=Number(page.dataset.stop||0);
  let visual=index;
  let drag=null;
  let frameToken=0;
  let suppressClick=false;
  let suppressHandle=0;
  page.dataset.journeyCoverflow='on';
  frame.setAttribute('aria-label','五站照片轮播：左右滑动，或点击旁边的照片，切换右边的来信');

  cards.forEach((card,i)=>{
    card.setAttribute('role','button');
    card.setAttribute('tabindex','-1');
    card.setAttribute('aria-label','切换到第 '+(i+1)+' 站：'+order[i][1]);
    card.setAttribute('aria-hidden','false');
    card.dataset.jcfIndex=String(i);
    card.addEventListener('click',()=>{
      if(suppressClick)return;
      if(i!==index)request(i);
    });
    card.addEventListener('keydown',e=>{
      if(!['Enter',' ','ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
      e.preventDefault();
      if(e.key==='Enter'||e.key===' ')request(i);
      else if(e.key==='ArrowRight')request(index+1);
      else if(e.key==='ArrowLeft')request(index-1);
      else if(e.key==='Home')request(0);
      else request(cards.length-1);
      const next=cards[Math.max(0,Math.min(cards.length-1,index))];
      requestAnimationFrame(()=>next?.focus({preventScroll:true}));
    });
    card.querySelector('img')?.setAttribute('draggable','false');
  });

  function isActive(){
    return shell.dataset.destination==='journey'&&!page.hidden&&!document.hidden;
  }
  function step(){
    return Math.min(167,Math.max(89,frame.clientWidth*.325));
  }
  function render(){
    frameToken=0;
    const spacing=step();
    cards.forEach((card,i)=>{
      const delta=i-visual,abs=Math.abs(delta),sign=Math.sign(delta);
      const x=sign*spacing*((1-Math.exp(-abs*.90))/(1-Math.exp(-.90)));
      const y=Math.min(21,abs*7);
      const z=-Math.min(300,abs*92);
      const tilt=-sign*Math.min(62,abs*36);
      const scale=Math.max(.72,1-Math.min(abs,3)*.112);
      const opacity=abs>2.9?0:Math.max(.15,1-Math.max(0,abs-.1)*.23);
      card.style.setProperty('--jcf-transform',
        'translate3d(calc(-50% + '+x.toFixed(2)+'px),calc(-50% + '+y.toFixed(2)+'px),'+z.toFixed(2)+'px) rotateY('+tilt.toFixed(1)+'deg) scale('+scale.toFixed(3)+')');
      card.style.setProperty('--jcf-z',String(Math.round(95-abs*15)));
      card.style.setProperty('--jcf-opacity',opacity.toFixed(3));
      card.style.setProperty('--jcf-hit',abs<=2.3?'auto':'none');
      card.tabIndex=abs<=1.5?0:-1;
    });
  }
  function schedule(){
    if(!frameToken)frameToken=requestAnimationFrame(render);
  }
  function request(i){
    if(!isActive())return;
    const target=Math.max(0,Math.min(cards.length-1,Math.round(i)));
    if(target===index){
      visual=index;frame.dataset.dragging='false';render();return;
    }
    page.dispatchEvent(new CustomEvent('winter:journey-select-stop',{detail:{index:target}}));
  }
  page.addEventListener('winter:journey-stop',e=>{
    index=Math.max(0,Math.min(cards.length-1,Number(e.detail?.index)||0));
    visual=index;
    frame.dataset.dragging='false';
    if(frameToken){cancelAnimationFrame(frameToken);frameToken=0}
    render();
  });

  frame.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch')return;
    if(!isActive()||drag||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;
    drag={
      id:e.pointerId,
      x:e.clientX,y:e.clientY,
      lastX:e.clientX,lastT:performance.now(),velocity:0,
      horizontal:false,vertical:false
    };
  },{passive:true});
  frame.addEventListener('pointermove',e=>{
    const p=drag;
    if(!p||p.id!==e.pointerId||p.vertical||!isActive())return;
    const dx=e.clientX-p.x,dy=e.clientY-p.y;
    if(!p.horizontal){
      if(Math.abs(dy)>11&&Math.abs(dy)>Math.abs(dx)){p.vertical=true;return;}
      if(Math.abs(dx)<7||Math.abs(dx)<Math.abs(dy)*1.22)return;
      p.horizontal=true;
      frame.dataset.dragging='true';
      try{frame.setPointerCapture(e.pointerId)}catch(_){}
    }
    const now=performance.now(),dt=Math.max(9,now-p.lastT);
    p.velocity=p.velocity*.63+((e.clientX-p.lastX)/dt)*.37;
    p.lastX=e.clientX;p.lastT=now;
    let next=index-dx/step();
    // Soft resistance at the first and last station.
    if(next<0)next=next*.20;
    if(next>4)next=4+(next-4)*.20;
    visual=next;
    schedule();
    if(e.cancelable)e.preventDefault();
  },{passive:false});
  function release(e,cancelled=false){
    const p=drag;
    if(!p||p.id!==e.pointerId)return;
    drag=null;
    if(!p.horizontal){frame.dataset.dragging='false';return}
    const dx=e.clientX-p.x;
    frame.dataset.dragging='false';
    suppressClick=true;
    clearTimeout(suppressHandle);
    suppressHandle=setTimeout(()=>{suppressClick=false},300);
    let steps=cancelled?0:Math.round(-(dx+p.velocity*115)/step());
    if(!cancelled&&steps===0&&Math.abs(dx)>33)steps=dx>0?-1:1;
    steps=Math.max(-2,Math.min(2,steps));
    if(frameToken){cancelAnimationFrame(frameToken);frameToken=0}
    request(index+steps);
  }
  frame.addEventListener('pointerup',e=>release(e,false),{passive:true});
  frame.addEventListener('pointercancel',e=>release(e,true),{passive:true});
  frame.addEventListener('lostpointercapture',()=>{
    if(drag?.horizontal){drag=null;visual=index;frame.dataset.dragging='false';render()}
  });

  // iPad native touch recognizer: respond to gentle horizontal swipes,
  // preserve vertical page scroll, and keep the Journey text synchronized.
  let finger=null;
  function findFinger(list,id){
    for(let n=0;n<list.length;n++)if(list[n].identifier===id)return list[n];
    return null;
  }
  frame.addEventListener('touchstart',e=>{
    if(!isActive()||e.touches.length!==1||finger)return;
    const t=e.changedTouches[0];
    finger={id:t.identifier,x:t.clientX,y:t.clientY,lastX:t.clientX,
      lastT:performance.now(),velocity:0,horizontal:false,vertical:false};
  },{passive:true});
  frame.addEventListener('touchmove',e=>{
    const p=finger;
    if(!p||e.touches.length!==1||p.vertical||!isActive())return;
    const t=findFinger(e.touches,p.id);
    if(!t)return;
    const dx=t.clientX-p.x,dy=t.clientY-p.y;
    if(!p.horizontal){
      if(Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)*1.2){p.vertical=true;return;}
      if(Math.abs(dx)<3||Math.abs(dx)<Math.abs(dy)*.9)return;
      p.horizontal=true;
      frame.dataset.dragging='true';
    }
    if(e.cancelable)e.preventDefault();
    const now=performance.now(),dt=Math.max(9,now-p.lastT);
    p.velocity=p.velocity*.65+((t.clientX-p.lastX)/dt)*.35;
    p.lastX=t.clientX;p.lastT=now;
    let next=index-dx/step();
    if(next<0)next*=.2;
    if(next>4)next=4+(next-4)*.2;
    visual=next;
    schedule();
  },{passive:false});
  function finishFinger(e,cancelled=false){
    if(!finger)return;
    const t=findFinger(e.changedTouches,finger.id);
    if(!t)return;
    const p=finger;finger=null;
    if(!p.horizontal){frame.dataset.dragging='false';return}
    frame.dataset.dragging='false';
    suppressClick=true;
    clearTimeout(suppressHandle);
    suppressHandle=setTimeout(()=>{suppressClick=false},480);
    const dx=t.clientX-p.x;
    let steps=cancelled?0:Math.round(-(dx+p.velocity*98)/step());
    if(!cancelled&&steps===0&&Math.abs(dx)>=12)steps=dx>0?-1:1;
    steps=Math.max(-2,Math.min(2,steps));
    if(frameToken){cancelAnimationFrame(frameToken);frameToken=0}
    request(index+steps);
  }
  frame.addEventListener('touchend',e=>finishFinger(e),{passive:true});
  frame.addEventListener('touchcancel',e=>finishFinger(e,true),{passive:true});

  frame.addEventListener('click',e=>{
    if(!suppressClick)return;
    suppressClick=false;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  },true);
  frame.addEventListener('dragstart',e=>e.preventDefault());

  window.addEventListener('resize',()=>{if(!drag)render()},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){drag=null;frame.dataset.dragging='false'}});
  new MutationObserver(()=>{if(!isActive()){drag=null;frame.dataset.dragging='false'}else render();}).observe(shell,{attributes:true,attributeFilter:['data-destination']});
  if(quiet.addEventListener)quiet.addEventListener('change',()=>{render()});
  render();
})();
