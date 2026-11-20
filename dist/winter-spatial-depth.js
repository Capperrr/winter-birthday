/* WINTER / spatial parallax made from distinct planes of the ORIGINAL photo.
 * No synthetic grass, no blur, no full-scene photo translation.
 * Foreground vegetation and nearby bough move at two different depths.
 */
(()=>{
 'use strict';
 const shell=document.getElementById('main');
 const original=document.getElementById('scene-photo');
 if(!shell||!original||shell.querySelector('.winter-photo-depth'))return;
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 const layer=document.createElement('div');
 layer.className='winter-photo-depth';
 layer.setAttribute('aria-hidden','true');
 for(const kind of ['forest','branches']){
   const p=document.createElement('div');
   p.className='winter-depth-plane winter-depth-'+kind;
   const photo=original.cloneNode(true);
   photo.removeAttribute('id');photo.className='';
   photo.setAttribute('aria-hidden','true');
   const img=photo.querySelector('img');
   if(img){img.alt='';img.decoding='async';img.loading='lazy';img.draggable=false;img.removeAttribute('fetchpriority');}
   p.append(photo);layer.append(p);
 }
 // The depth layers are placed directly above the unmodified photo and BELOW
 // the original scenery light, so Morning/Night shading keeps working.
 original.after(layer);
 const routeActive=()=>shell.dataset.page==='home'&&!document.hidden&&!reduce.matches&&shell.dataset.motion!=='off'&&shell.dataset.motionPaused!=='true';
 let x=0,y=0,tx=0,ty=0,frame=0,pointerDown=false;
 function render(){
   frame=0;
   if(!routeActive()){layer.style.setProperty('--depth-x','0px');layer.style.setProperty('--depth-y','0px');layer.style.setProperty('--near-x','0px');layer.style.setProperty('--near-y','0px');return;}
   x+= (tx-x)*.18;y+=(ty-y)*.18;
   layer.style.setProperty('--depth-x',(x*13).toFixed(2)+'px');
   layer.style.setProperty('--depth-y',(y*6).toFixed(2)+'px');
   layer.style.setProperty('--near-x',(x*23).toFixed(2)+'px');
   layer.style.setProperty('--near-y',(y*11).toFixed(2)+'px');
   if(Math.abs(x-tx)+Math.abs(y-ty)>.006)frame=requestAnimationFrame(render);
 }
 function update(nx,ny){
   if(!routeActive())return;
   tx=Math.max(-1,Math.min(1,nx));ty=Math.max(-1,Math.min(1,ny));
   if(!frame)frame=requestAnimationFrame(render);
 }
 function reset(){tx=0;ty=0;if(!frame)frame=requestAnimationFrame(render)}
 function position(clientX,clientY){
   const rect=shell.getBoundingClientRect();
   if(rect.width&&rect.height)update(2*(clientX-rect.left)/rect.width-1,2*(clientY-rect.top)/rect.height-1);
 }
 // Moving the mouse changes the relative position of *trees and branches*.
 shell.addEventListener('pointermove',e=>{
   if(e.pointerType==='touch'||e.pointerType==='pen')return;
   position(e.clientX,e.clientY);
 },{passive:true});
 shell.addEventListener('pointerleave',reset,{passive:true});
 const home=document.getElementById('panel-home');
 if(home){
   home.addEventListener('touchstart',e=>{
     if(!routeActive()||e.touches.length!==1||e.target.closest('button,a,input,[role="button"]'))return;
     pointerDown=true;
     position(e.touches[0].clientX,e.touches[0].clientY);
   },{passive:true});
   home.addEventListener('touchmove',e=>{
     if(pointerDown&&e.touches.length===1)position(e.touches[0].clientX,e.touches[0].clientY);
   },{passive:true});
   const release=()=>{pointerDown=false;reset()};
   home.addEventListener('touchend',release,{passive:true});
   home.addEventListener('touchcancel',release,{passive:true});
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset()});
 new MutationObserver(()=>{if(!routeActive())reset()}).observe(shell,{attributes:true,attributeFilter:['data-page','data-motion','data-motion-paused']});
 if(reduce.addEventListener)reduce.addEventListener('change',reset);
})();
