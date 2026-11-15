(() => {
 'use strict';
 const about=document.getElementById('panel-about');
 const reveal=document.getElementById('about-photo-reveal');
 const wall=document.getElementById('about-photo-wall');
 if (!about || !reveal || !wall) return;
 const cards=Array.from(wall.querySelectorAll('.winter-polaroid'));
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 const shell=document.getElementById('main');
 const calm=()=>reduce.matches || shell?.dataset.motion==='off';
 reveal.addEventListener('click',()=>{
   wall.scrollIntoView({behavior:calm()?'auto':'smooth',block:'start'});
 });
 if (!('IntersectionObserver' in window)) {
   cards.forEach(card=>card.classList.add('is-visible')); return;
 }
 const observer=new IntersectionObserver(entries=>{
   for(const entry of entries)if(entry.isIntersecting){
     entry.target.classList.add('is-visible');
     observer.unobserve(entry.target);
   }
 },{root:about,rootMargin:'0px 0px 65px 0px',threshold:0.08});
 cards.forEach(card=>observer.observe(card));
 window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
})();
