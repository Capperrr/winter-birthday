/* WINTER / photographed alpine-depth layer.
   Original full photograph (including meadow) stays fixed; only an upper
   mountain/sky mask and light veil respond subtly to the viewer. */
(()=>{
  'use strict';
  const shell=document.getElementById('main');
  const scene=document.getElementById('scene-photo');
  const stage=shell?.querySelector('.living-stage');
  if(!shell||!stage||!scene||stage.querySelector('.living-depth-mountains'))return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const picture=scene.cloneNode(true);
  picture.removeAttribute('id');
  picture.className='living-depth-mountains';
  picture.setAttribute('aria-hidden','true');
  const image=picture.querySelector('img');
  if(image){
    image.alt='';
    image.removeAttribute('fetchpriority');
    image.decoding='async';
    image.loading='lazy';
    image.setAttribute('draggable','false');
  }
  const light=document.createElement('div');
  light.className='living-depth-light';
  light.setAttribute('aria-hidden','true');
  const veil=document.createElement('div');
  veil.className='living-depth-veil';
  veil.setAttribute('aria-hidden','true');
  stage.prepend(picture,light,veil);

  let lastX=0,lastY=0,nextX=0,nextY=0,raf=0;
  const active=()=>shell.dataset.page==='home'&&!document.hidden&&!reduced.matches&&shell.dataset.motion!=='off'&&shell.dataset.motionPaused!=='true';
  function paint(){
    raf=0;
    const x=nextX,y=nextY;
    lastX=x;lastY=y;
    stage.style.setProperty('--winter-depth-x',(x*5.5).toFixed(2)+'px');
    stage.style.setProperty('--winter-depth-y',(y*3.3).toFixed(2)+'px');
    stage.style.setProperty('--winter-light-x',(x*11).toFixed(2)+'px');
    stage.style.setProperty('--winter-light-y',(y*7).toFixed(2)+'px');
    stage.style.setProperty('--winter-veil-x',(-x*2.1).toFixed(2)+'px');
    stage.style.setProperty('--winter-veil-y',(-y*1.5).toFixed(2)+'px');
    stage.style.setProperty('--living-cloud-x',(x*9).toFixed(2)+'px');
    stage.style.setProperty('--living-cloud-y',(y*5).toFixed(2)+'px');
    // The typography moves by under two pixels; the text remains readable.
    shell.style.setProperty('--winter-type-x',(x*1.5).toFixed(2)+'px');
    shell.style.setProperty('--winter-type-y',(y*.8).toFixed(2)+'px');
  }
  function queue(x,y){
    nextX=Math.max(-1,Math.min(1,x));
    nextY=Math.max(-1,Math.min(1,y));
    if(!raf)raf=requestAnimationFrame(paint);
  }
  function move(event){
    if(!active())return;
    if(event.pointerType==='pen'&&event.buttons===0)return;
    if(event.pointerType==='mouse'&&event.buttons)return;
    const rect=shell.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    const x=(event.clientX-rect.left)/rect.width*2-1;
    const y=(event.clientY-rect.top)/rect.height*2-1;
    queue(x,y);
  }
  function reset(){
    if(raf){cancelAnimationFrame(raf);raf=0;}
    nextX=nextY=lastX=lastY=0;
    paint();
  }
  shell.addEventListener('pointermove',move,{passive:true});
  shell.addEventListener('pointerleave',reset,{passive:true});
  shell.addEventListener('pointerup',event=>{if(event.pointerType==='touch')reset()},{passive:true});
  shell.addEventListener('pointercancel',reset,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset()});
  new MutationObserver(()=>{if(!active())reset()})
    .observe(shell,{attributes:true,attributeFilter:['data-page','data-motion','data-motion-paused']});
  if(reduced.addEventListener)reduced.addEventListener('change',()=>reset());
  reset();
})();
