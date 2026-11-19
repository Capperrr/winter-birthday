/* WINTER / real-photo frosted-glass memory album.
   Reuses all 19 existing photo buttons and their original full-resolution
   lightbox click handlers. No made-up dates or changed personal captions. */
(()=>{
  'use strict';
  const gallery=document.getElementById('cosmos-gallery');
  const wall=document.getElementById('cosmos-photo-wall');
  const dialog=document.getElementById('winter-cosmos-dialog');
  if(!gallery||!wall||!dialog||gallery.classList.contains('cosmos-gallery-glass'))return;
  const items=Array.from(wall.querySelectorAll('.photo-memory'));
  if(items.length!==19)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  gallery.classList.add('cosmos-gallery-glass');
  wall.setAttribute('role','region');
  wall.setAttribute('aria-label','十九张回忆照片，逐张呈现。左右轻滑或使用箭头切换；点击照片可放大');
  wall.setAttribute('tabindex','0');

  const nav=document.createElement('div');
  nav.className='cosmos-album-controls';
  nav.setAttribute('role','group');
  nav.setAttribute('aria-label','切换相册照片');
  const prev=document.createElement('button');
  prev.type='button';prev.textContent='‹';prev.setAttribute('aria-label','上一张照片');
  const counter=document.createElement('span');
  counter.className='cosmos-album-count';
  counter.setAttribute('aria-live','polite');
  const next=document.createElement('button');
  next.type='button';next.textContent='›';next.setAttribute('aria-label','下一张照片');
  nav.append(prev,counter,next);
  const hint=document.createElement('p');
  hint.className='cosmos-album-hint';
  hint.textContent='左右轻滑，或轻触照片细看';
  wall.after(nav,hint);

  let index=0,swipe=null,suppressClick=false,suppressTimer=0;
  let colourRequest=0;
  const pad=n=>String(n).padStart(2,'0');
  const paths=items.map((_,i)=>'assets/memory-wall/memory-'+pad(i+1)+'.webp');
  const images=items.map((button,i)=>{
    const frame=button.querySelector('.photo-memory-frame');
    const img=document.createElement('img');
    img.className='photo-memory-image';
    img.alt='';
    img.decoding='async';
    img.loading='lazy';
    img.setAttribute('draggable','false');
    img.dataset.src=paths[i];
    frame.append(img);
    const meta=document.createElement('span');
    meta.className='photo-memory-meta';
    meta.textContent='PRIVATE ALBUM · '+pad(i+1)+' / 19';
    button.append(meta);
    button.style.removeProperty('--tilt');
    button.style.removeProperty('--drop');
    button.hidden=i!==0;
    button.setAttribute('aria-hidden',String(i!==0));
    return img;
  });

  function hueOf(r,g,b){
    r/=255;g/=255;b/=255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),range=max-min;
    if(!range)return 158;
    let hue;
    if(max===r)hue=((g-b)/range)%6;
    else if(max===g)hue=(b-r)/range+2;
    else hue=(r-g)/range+4;
    return (hue*60+360)%360;
  }
  function setPalette(img,token){
    if(index!==token||!img.naturalWidth||!img.naturalHeight)return;
    try{
      const scratch=document.createElement('canvas');
      scratch.width=20;scratch.height=20;
      const ctx=scratch.getContext('2d',{willReadFrequently:true});
      if(!ctx)return;
      ctx.drawImage(img,0,0,20,20);
      const rgba=ctx.getImageData(0,0,20,20).data;
      let rr=0,gg=0,bb=0,count=0;
      for(let p=0;p<rgba.length;p+=4){
        if(rgba[p+3]<140)continue;
        rr+=rgba[p];gg+=rgba[p+1];bb+=rgba[p+2];count++;
      }
      if(!count)return;
      const hue=hueOf(rr/count,gg/count,bb/count);
      const h=String(Math.round(hue));
      gallery.style.setProperty('--album-surface','hsl('+h+' 16% 94%)');
      gallery.style.setProperty('--album-halo','hsl('+h+' 23% 75% / .19)');
      gallery.style.setProperty('--album-glass','hsl('+h+' 19% 83% / .34)');
      gallery.style.setProperty('--album-ink','hsl('+h+' 19% 26%)');
      gallery.style.setProperty('--album-muted','hsl('+h+' 13% 41%)');
      gallery.style.setProperty('--album-rule','hsl('+h+' 18% 38% / .15)');
    }catch(_){
      // The local photograph will still appear with a neutral fallback.
    }
  }
  function animateSelected(direction){
    const card=items[index];
    if(reduced.matches||!gallery.classList.contains('is-active')||!card.animate)return;
    card.animate([
      {opacity:.35,translate:(direction>0?'16px':'-16px')+' 0',filter:'blur(3px)'},
      {opacity:1,translate:'0 0',filter:'blur(0px)'}
    ],{duration:380,easing:'cubic-bezier(.2,.75,.22,1)'});
  }
  function loadSelected(i){
    const img=images[i];
    if(!img.src){
      img.src=img.dataset.src;
    }
    if(img.complete&&img.naturalWidth)setPalette(img,i);
    else img.addEventListener('load',()=>setPalette(img,i),{once:true});
  }
  function show(i,direction=0){
    const target=Math.max(0,Math.min(items.length-1,Math.round(i)));
    const changed=target!==index;
    if(changed){
      items[index].hidden=true;
      items[index].setAttribute('aria-hidden','true');
    }
    index=target;
    items[index].hidden=false;
    items[index].setAttribute('aria-hidden','false');
    prev.disabled=index===0;
    next.disabled=index===items.length-1;
    counter.textContent=pad(index+1)+' / '+pad(items.length);
    loadSelected(index);
    if(changed)animateSelected(direction||1);
  }
  prev.addEventListener('click',()=>show(index-1,-1));
  next.addEventListener('click',()=>show(index+1,1));
  wall.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'){event.preventDefault();show(index-1,-1)}
    if(event.key==='ArrowRight'){event.preventDefault();show(index+1,1)}
  });

  // Gestures are restricted to the album area. Vertical page scrolling
  // remains native; a deliberate horizontal movement is required.
  function startSwipe(id,x,y){
    swipe={id,x,y,dx:0,horizontal:false,vertical:false};
  }
  function moveSwipe(id,x,y,event){
    if(!swipe||swipe.id!==id||swipe.vertical)return;
    const dx=x-swipe.x,dy=y-swipe.y;
    if(!swipe.horizontal){
      if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)*1.25){
        swipe.vertical=true;return;
      }
      if(Math.abs(dx)<4||Math.abs(dx)<Math.abs(dy))return;
      swipe.horizontal=true;
    }
    if(event.cancelable)event.preventDefault();
    swipe.dx=dx;
    items[index].style.translate=Math.max(-40,Math.min(40,dx*.28))+'px 0';
  }
  function finishSwipe(id,x,cancelled){
    if(!swipe||swipe.id!==id)return;
    const p=swipe;swipe=null;
    items[index].style.translate='';
    if(!p.horizontal)return;
    suppressClick=true;
    clearTimeout(suppressTimer);
    suppressTimer=setTimeout(()=>{suppressClick=false},420);
    const dx=x-p.x;
    if(cancelled||Math.abs(dx)<16)return;
    if(dx<0)show(index+1,1);
    else show(index-1,-1);
  }
  function locate(list,id){
    for(let i=0;i<list.length;i++)if(list[i].identifier===id)return list[i];
    return null;
  }
  wall.addEventListener('touchstart',event=>{
    if(event.touches.length!==1||swipe)return;
    const t=event.changedTouches[0];startSwipe(t.identifier,t.clientX,t.clientY);
  },{passive:true});
  wall.addEventListener('touchmove',event=>{
    if(!swipe||event.touches.length!==1)return;
    const t=locate(event.touches,swipe.id);
    if(t)moveSwipe(t.identifier,t.clientX,t.clientY,event);
  },{passive:false});
  wall.addEventListener('touchend',event=>{
    if(!swipe)return;
    const t=locate(event.changedTouches,swipe.id);
    if(t)finishSwipe(t.identifier,t.clientX,false);
  },{passive:true});
  wall.addEventListener('touchcancel',event=>{
    if(!swipe)return;
    const t=locate(event.changedTouches,swipe.id);
    if(t)finishSwipe(t.identifier,t.clientX,true);
  },{passive:true});
  wall.addEventListener('pointerdown',event=>{
    if(event.pointerType==='touch'||(event.pointerType==='mouse'&&event.button!==0)||swipe)return;
    startSwipe(event.pointerId,event.clientX,event.clientY);
  },{passive:true});
  wall.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch')return;
    moveSwipe(event.pointerId,event.clientX,event.clientY,event);
  },{passive:false});
  wall.addEventListener('pointerup',event=>{
    if(event.pointerType==='touch')return;
    finishSwipe(event.pointerId,event.clientX,false);
  },{passive:true});
  wall.addEventListener('pointercancel',event=>{
    if(event.pointerType==='touch')return;
    finishSwipe(event.pointerId,event.clientX,true);
  },{passive:true});
  wall.addEventListener('pointerleave',event=>{
    if(event.pointerType==='touch')return;
    if(swipe)finishSwipe(swipe.id,event.clientX,true);
  },{passive:true});
  wall.addEventListener('click',event=>{
    if(!suppressClick)return;
    suppressClick=false;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  },true);
  wall.addEventListener('dragstart',event=>event.preventDefault());

  function syncTheme(){
    dialog.dataset.galleryTheme=gallery.classList.contains('is-active')?'light':'dark';
    if(!gallery.classList.contains('is-active')){
      swipe=null;items[index].style.translate='';
    }
  }
  new MutationObserver(syncTheme).observe(gallery,{attributes:true,attributeFilter:['class']});
  dialog.addEventListener('close',()=>{dialog.dataset.galleryTheme='dark';swipe=null;});
  syncTheme();
  show(0);
})();
