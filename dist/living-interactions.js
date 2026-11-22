/* WINTER Home preview: button touch response + cinematic typography.
 * Interactive feedback belongs to controls only, never to the static meadow. */
(()=>{
  'use strict';
  const shell=document.getElementById('main');
  const home=document.getElementById('panel-home');
  if(!shell||!home||shell.dataset.livingFeedbackReady==='true')return;
  shell.dataset.livingFeedbackReady='true';

  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer=window.matchMedia('(hover: hover) and (pointer: fine)');
  const name=home.querySelector('.cover-title .name');
  const intro=home.querySelector('.cover-title .intro');
  const lightButtons=Array.from(shell.querySelectorAll(
    '#living-morning,#living-night,#page-tabs button,#view-toggle,#winter-music-toggle,#motion-toggle'
  ));

  // Each title letter arrives from a slightly different depth, then stays still.
  if(name&&!name.querySelector('.living-letter')){
    const original=name.textContent.trim();
    name.textContent='';
    name.setAttribute('role','text');
    name.setAttribute('aria-label',original);
    Array.from(original).forEach((character,index)=>{
      const letter=document.createElement('span');
      letter.className='living-letter';
      letter.setAttribute('aria-hidden','true');
      letter.style.setProperty('--letter-i',index);
      letter.style.setProperty('--letter-delay',(480+index*105)+'ms');
      letter.style.setProperty('--gleam-delay',(1100+index*100)+'ms');
      letter.textContent=character;
      name.append(letter);
    });
  }

  function springFrames(from,stiffness,damping,duration=850){
    const frames=[];
    const steps=Math.max(18,Math.round(duration/1000*60));
    const dt=duration/steps/1000;
    let displacement=from-1,velocity=0;
    for(let i=0;i<=steps;i++){
      const value=1+displacement;
      frames.push({scale:Math.max(.86,Math.min(1.12,value)).toFixed(5),offset:i/steps});
      const acceleration=-stiffness*displacement-damping*velocity;
      velocity+=acceleration*dt;
      displacement+=velocity*dt;
    }
    frames[frames.length-1].scale='1';
    return frames;
  }
  function finishPress(button){
    button.classList.remove('living-pressing');
    if(reduced.matches)return;
    try{
      button._livingSpring?.cancel();
      const animation=button.animate(springFrames(.94,260,12),{duration:850,fill:'both',easing:'linear'});
      button._livingSpring=animation;
      animation.onfinish=()=>{animation.cancel();if(button._livingSpring===animation)button._livingSpring=null};
    }catch(_){button.classList.add('living-spring-fallback')}
  }
  function giveRipple(button,x,y,atRelease){
    if(reduced.matches)return null;
    const ripple=document.createElement('span');
    ripple.className='living-touch-glow';
    ripple.setAttribute('aria-hidden','true');
    ripple.style.width=ripple.style.height=Math.max(74,Math.round(button.getBoundingClientRect().width*2.4))+'px';
    ripple.style.left=x+'px';
    ripple.style.top=y+'px';
    button.append(ripple);
    if(atRelease)releaseRipple(ripple);
    return ripple;
  }
  function releaseRipple(ripple){
    if(!ripple||!ripple.isConnected)return;
    ripple.classList.add('living-ripple-released');
    try{
      const burst=ripple.animate([
        {opacity:.28,transform:'translate(-50%,-50%) scale(.12)',offset:0},
        {opacity:.20,transform:'translate(-50%,-50%) scale(.64)',offset:.48},
        {opacity:0,transform:'translate(-50%,-50%) scale(1)',offset:1}
      ],{duration:450,easing:'cubic-bezier(.16,.78,.3,1)',fill:'forwards'});
      burst.onfinish=()=>ripple.remove();
    }catch(_){ripple.remove()}
  }
  function installFeedback(button){
    if(!button||button.classList.contains('living-feedback-button'))return;
    button.classList.add('living-feedback-button');
    let active=null;
    const point=e=>{
      const rect=button.getBoundingClientRect();
      return {
        x:Math.max(0,Math.min(rect.width,e.clientX-rect.left)),
        y:Math.max(0,Math.min(rect.height,e.clientY-rect.top))
      };
    };
    button.addEventListener('pointerdown',e=>{
      if(shell.dataset.page!=='home'||button.disabled||(e.pointerType==='mouse'&&e.button!==0))return;
      if(active)return;
      button._livingSpring?.cancel();
      button.classList.remove('living-spring-fallback');
      button.classList.add('living-pressing');
      const p=point(e);
      active={id:e.pointerId,ripple:giveRipple(button,p.x,p.y,false)};
      if(button.setPointerCapture)try{button.setPointerCapture(e.pointerId)}catch(_){}
    },{passive:true});
    button.addEventListener('pointermove',e=>{
      if(!active||active.id!==e.pointerId||!active.ripple)return;
      const p=point(e);
      active.ripple.style.left=p.x+'px';
      active.ripple.style.top=p.y+'px';
    },{passive:true});
    function release(e,cancelled){
      if(!active||active.id!==e.pointerId)return;
      const ripple=active.ripple;
      active=null;
      if(cancelled){ripple?.remove();button.classList.remove('living-pressing');return}
      finishPress(button);
      releaseRipple(ripple);
    }
    button.addEventListener('pointerup',e=>release(e,false),{passive:true});
    button.addEventListener('pointercancel',e=>release(e,true),{passive:true});
    button.addEventListener('lostpointercapture',()=>{
      if(!active)return;
      const ripple=active.ripple;active=null;
      button.classList.remove('living-pressing');
      ripple?.remove();
    },{passive:true});
    // Keyboard-triggered clicks receive the same visual confirmation.
    button.addEventListener('click',e=>{
      if(e.detail!==0||shell.dataset.page!=='home'||button.disabled)return;
      finishPress(button);
      const rect=button.getBoundingClientRect();
      giveRipple(button,rect.width/2,rect.height/2,true);
    });
  }
  lightButtons.forEach(installFeedback);

  // A real sliding thumb sits below the two toggle labels.
  const segment=shell.querySelector('.living-segment');
  if(segment){
    const indicator=document.createElement('span');
    indicator.className='living-active-indicator';
    indicator.setAttribute('aria-hidden','true');
    segment.prepend(indicator);
    const morning=segment.querySelector('#living-morning');
    const night=segment.querySelector('#living-night');
    let previousX=null;
    function placeIndicator(animate){
      const target=shell.dataset.livingTime==='night'?night:morning;
      if(!target)return;
      const nextX=target.offsetLeft;
      const nextWidth=target.offsetWidth;
      const oldX=previousX===null?nextX:previousX;
      indicator.style.left=nextX+'px';
      indicator.style.width=nextWidth+'px';
      previousX=nextX;
      if(!animate||reduced.matches||oldX===nextX)return;
      try{
        indicator.getAnimations().forEach(animation=>animation.cancel());
        indicator.animate([
          {transform:'translateX('+(oldX-nextX)+'px) scaleX(1)',offset:0},
          {transform:'translateX('+((oldX-nextX)*.30)+'px) scaleX(1.35)',offset:.48},
          {transform:'translateX(2px) scaleX(.97)',offset:.76},
          {transform:'translateX(0px) scaleX(1)',offset:1}
        ],{duration:590,easing:'cubic-bezier(.22,.7,.24,1)'});
      }catch(_){}
    }
    new MutationObserver(()=>placeIndicator(true)).observe(shell,{attributes:true,attributeFilter:['data-living-time']});
    requestAnimationFrame(()=>placeIndicator(false));
    window.addEventListener('resize',()=>placeIndicator(false),{passive:true});
  }

  // Magnetic hover works with mouse/trackpad only; fingers stay in complete control.
  const magnetic=Array.from(shell.querySelectorAll('#living-morning,#living-night'));
  let lastMouse=null;
  function updateMagnet(e){
    if(!finePointer.matches||shell.dataset.page!=='home'||reduced.matches){
      magnetic.forEach(b=>b.style.translate='0px 0px');
      return;
    }
    lastMouse={x:e.clientX,y:e.clientY};
    magnetic.forEach(button=>{
      const box=button.getBoundingClientRect();
      const centerX=box.left+box.width/2;
      const centerY=box.top+box.height/2;
      const dx=e.clientX-centerX,dy=e.clientY-centerY;
      const distance=Math.hypot(dx,dy);
      const reach=Math.max(0,1-distance/120);
      const mx=Math.max(-13,Math.min(13,dx*.35*reach));
      const my=Math.max(-9,Math.min(9,dy*.35*reach));
      button.style.translate=mx.toFixed(2)+'px '+my.toFixed(2)+'px';
    });
  }
  window.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')updateMagnet(e)},{passive:true});
  window.addEventListener('blur',()=>magnetic.forEach(b=>b.style.translate='0px 0px'));
  window.addEventListener('pointerout',e=>{
    if(e.relatedTarget===null)magnetic.forEach(b=>b.style.translate='0px 0px');
  },{passive:true});

  // Light passes through each letter once when Morning / Night changes.
  function relight(){
    if(reduced.matches||!name)return;
    name.querySelectorAll('.living-letter').forEach((letter,i)=>{
      try{
        letter.animate([
          {filter:'brightness(1)',offset:0},
          {filter:'brightness(1.32) drop-shadow(0 0 13px rgba(255,246,216,.72))',offset:.52},
          {filter:'brightness(1)',offset:1}
        ],{duration:880,delay:50*i,easing:'ease-in-out'});
      }catch(_){}
    });
    if(intro)try{
      intro.animate([
        {opacity:1,filter:'brightness(1)',offset:0},
        {opacity:1,filter:'brightness(1.22)',offset:.5},
        {opacity:1,filter:'brightness(1)',offset:1}
      ],{duration:880});
    }catch(_){}
  }
  let lastTime=shell.dataset.livingTime||'morning';
  new MutationObserver(()=>{
    const next=shell.dataset.livingTime||'morning';
    if(next!==lastTime){lastTime=next;relight()}
  }).observe(shell,{attributes:true,attributeFilter:['data-living-time']});
})();
