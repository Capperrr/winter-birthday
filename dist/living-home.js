/* WINTER cinematic Home preview — photo-only static meadow.
   Sky, light and fireflies animate; no grass canvas, WebGL or wind simulation. */
(()=>{
  'use strict';
  const shell=document.getElementById('main');
  const home=document.getElementById('panel-home');
  if(!shell||!home||shell.querySelector('.living-stage'))return;

  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const stage=document.createElement('div');
  stage.className='living-stage';
  stage.setAttribute('aria-hidden','true');
  stage.innerHTML='<div class="living-cloudsheet"></div><div class="living-haze"></div><div class="living-sun"></div><div class="living-nightshade"></div><div class="living-moon"></div><div class="living-stars"></div>';
  const shade=shell.querySelector('.landscape-shade');
  if(shade)shade.after(stage);else shell.prepend(stage);

  const sky=stage.querySelector('.living-stars');
  for(let i=0;i<34;i++){
    const dot=document.createElement('i');
    dot.className='living-star';
    dot.style.cssText='--sx:'+((i*73.21+17)%94+3).toFixed(2)+'%;--sy:'+((i*23.91+7)%50+2).toFixed(2)+'%;--ss:'+(i%4===0?2:1.3)+'px;--sd:'+(2.6+i%5)+'s;--delay:'+(-i%6)+'s';
    sky.append(dot);
  }
  for(let i=0;i<13;i++){
    const dot=document.createElement('i');
    dot.className='living-firefly';
    dot.style.cssText='--fx:'+((i*17.35+7)%92+4).toFixed(2)+'%;--fy:'+(67+(i*9.5)%27).toFixed(2)+'%;--ft:'+(4+i%4)+'s;--fd:'+(-i*.43)+'s';
    stage.append(dot);
  }

  const controls=document.createElement('div');
  controls.className='living-ui';
  controls.setAttribute('role','group');
  controls.setAttribute('aria-label','Morning / Night 昼夜切换');
  controls.innerHTML='<div class="living-segment" role="group" aria-label="切换山野时间"><button type="button" id="living-morning" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>Morning</button><button type="button" id="living-night" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.7a8.5 8.5 0 0 1-11.7-11A8.5 8.5 0 1 0 20 15.7Z"/></svg>Night</button></div>';
  const mainNavigation=document.getElementById('page-tabs');
  if(mainNavigation?.parentElement?.classList.contains('site-header'))mainNavigation.after(controls);
  else shell.append(controls);
  const badge=document.createElement('div');
  badge.className='living-preview-tag';
  badge.textContent='WINTER · HOME PREVIEW';
  shell.append(badge);

  const morning=controls.querySelector('#living-morning');
  const night=controls.querySelector('#living-night');
  const animated=stage.querySelectorAll('.living-cloudsheet,.living-haze,.living-sun,.living-firefly,.living-star');

  function sync(){
    const shouldAnimate=!document.hidden&&!reduced.matches&&shell.dataset.page==='home'&&shell.dataset.motionPaused!=='true';
    const state=shouldAnimate?'running':'paused';
    animated.forEach(el=>{el.style.animationPlayState=state});
  }
  function setTime(value){
    shell.dataset.livingTime=value;
    morning.setAttribute('aria-pressed',String(value==='morning'));
    night.setAttribute('aria-pressed',String(value==='night'));
    sync();
  }
  morning.addEventListener('click',()=>setTime('morning'));
  night.addEventListener('click',()=>setTime('night'));
  new MutationObserver(sync).observe(shell,{attributes:true,attributeFilter:['data-page','data-motion','data-motion-paused','data-view']});
  document.addEventListener('visibilitychange',sync);
  if(reduced.addEventListener)reduced.addEventListener('change',sync);
  setTime('morning');
})();
