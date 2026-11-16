(() => {
 'use strict';
 const dialog=document.getElementById('winter-cosmos-dialog');
 if(!dialog)return;
 const root=document.getElementById('cosmos-root');
 const canvas=document.getElementById('cosmos-stars');
 const ctx=canvas.getContext('2d',{alpha:true});
 const reduced=window.matchMedia?.('(prefers-reduced-motion:reduce)');
 const main=document.getElementById('main');
 const calm=()=>Boolean(reduced?.matches||main?.dataset.motion==='off');
 const stages=['cosmos-intro','cosmos-blessings','cosmos-apod','cosmos-gallery'].map(id=>document.getElementById(id));
 const wishes=[
   '蜡烛会灭，你会有黑夜，但我会为你点灯。',
   '希望比起过去的时间，未来的日子里能够更幸福。',
   '我希望你一切都好，希望所有俗套的祝福也都在你身上灵验。',
   '但愿你的道路漫长，充满奇迹，充满发现。'
 ];
 const photos=[
   ['Breathe in the blue','海风与晴天'],
   ['Last light','日落之前'],
   ['Everyday scenes','便利店里的日常'],
   ['In bloom','樱花开的时候'],
   ['Sunlit afternoon','屋檐下的阳光'],
   ['Little things','货架间的瞬间'],
   ['City wanderer','红砖墙边'],
   ['Butterfly moment','花与蝶的片刻'],
   ['Old town afternoon','古城慢慢走'],
   ['Green pause','绿地里的休息'],
   ['City notes','走过街角'],
   ['After the rain','雨夜与倒影'],
   ['Coffee break','一杯咖啡的午后'],
   ['Light and air','有风的院子'],
   ['Through the trees','树荫里的路'],
   ['Wild tides','走近海浪'],
   ['Just you','很自然的一个瞬间'],
   ['Quiet afternoons','草坪、树和风'],
   ['Winter by the sea','海边的冬天']
 ];
 const wall=document.getElementById('cosmos-photo-wall');
 const preview=document.getElementById('cosmos-photo-lightbox');
 const previewPhoto=document.getElementById('cosmos-lightbox-photo');
 const previewCaption=document.getElementById('cosmos-lightbox-caption');
 const closeButton=document.getElementById('cosmos-close');
 let current=0,selected=-1,lastFocus=null;
 let raf=0,last=0,w=0,h=0,dpr=1,twinkles=[],shooting=[];
 const between=(a,b)=>a+Math.random()*(b-a);
 wall.setAttribute('aria-label',photos.length+'张旅行与生活照片，点击可以放大');
 photos.forEach(([english,cn],i)=>{
   const item=document.createElement('button');item.type='button';item.className='photo-memory';
   item.style.setProperty('--tilt',(((i*23)%9)-4)*.57+'deg');
   item.style.setProperty('--drop',((i*37)%34)+'px');
   item.setAttribute('aria-label','放大第'+(i+1)+'张照片：'+cn);
   const frame=document.createElement('img');frame.className='photo-memory-frame';frame.src='assets/memory-wall/memory-'+String(i+1).padStart(2,'0')+'.webp';frame.alt=cn;frame.loading='lazy';frame.decoding='async';frame.width=440;frame.height=572;
   const en=document.createElement('span');en.className='photo-memory-title';en.textContent=english;
   const name=document.createElement('span');name.className='photo-memory-caption';name.textContent=cn;
   item.append(frame,en,name);item.addEventListener('click',()=>openPhoto(i));wall.append(item);
 });
 function openPhoto(i){
   selected=(i+photos.length)%photos.length;
   previewPhoto.src='assets/memory-wall/memory-'+String(selected+1).padStart(2,'0')+'.webp';
   previewPhoto.alt='照片 '+(selected+1)+'：'+photos[selected][1];
   for(const delta of [-1,1]){const neighbor=new Image();neighbor.src='assets/memory-wall/memory-'+String((selected+delta+photos.length)%photos.length+1).padStart(2,'0')+'.webp';}
   previewCaption.textContent=photos[selected][0]+' · '+photos[selected][1];
   if(preview.hidden)lastFocus=document.activeElement;preview.hidden=false;
   document.getElementById('cosmos-lightbox-close').focus({preventScroll:true});
 }
 function closePhoto(){preview.hidden=true;selected=-1;lastFocus?.focus?.({preventScroll:true})}
 document.getElementById('cosmos-lightbox-close').addEventListener('click',closePhoto);
 document.getElementById('cosmos-lightbox-prev').addEventListener('click',()=>openPhoto(selected-1));
 document.getElementById('cosmos-lightbox-next').addEventListener('click',()=>openPhoto(selected+1));
 preview.addEventListener('click',e=>{if(e.target===preview)closePhoto()});
 function showStage(n){
   current=n;
   stages.forEach((stage,i)=>{stage.classList.toggle('is-active',i===n);stage.setAttribute('aria-hidden',String(i!==n))});
   stages[0].dataset.sequence=n===0?'playing':'idle';
   if(n===1){const wish=document.getElementById('cosmos-wish-text');wish.textContent='选一颗星星，让祝福慢慢亮起来。'}
   root.scrollTop=0;dialog.scrollTop=0;
   const title=stages[n].querySelector('h2')||stages[n].querySelector('button');
   if(title){title.setAttribute('tabindex','-1');title.focus({preventScroll:true})}
 }
 function resize(){
   dpr=Math.min(window.devicePixelRatio||1,2);
   w=window.innerWidth;h=window.innerHeight;
   canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
   ctx?.setTransform(dpr,0,0,dpr,0,0);
   twinkles=Array.from({length:Math.min(190,Math.round(w*h/8500))},()=>({
      x:Math.random()*w,y:Math.random()*h,r:between(.3,1.6),phase:between(0,6.283),alpha:between(.27,.8),speed:between(.2,.7)
   }));
 }
 function starLoop(t){
   if(!dialog.open||document.hidden){raf=0;return}
   if(!ctx){raf=0;return}
   const dt=Math.min(2.8,(t-(last||t-16))/16);last=t;
   ctx.clearRect(0,0,w,h);
   for(const dot of twinkles){
     const brightness=dot.alpha*(.77+.23*Math.cos(t*.001*dot.speed+dot.phase));
     ctx.fillStyle='rgba(224,226,249,'+brightness+')';ctx.beginPath();ctx.arc(dot.x,dot.y,dot.r,0,Math.PI*2);ctx.fill();
   }
   if(!calm()){
     if(Math.random()<.006 && shooting.length<2)shooting.push({x:between(.3,.95)*w,y:between(.05,.42)*h,v:between(5,10),life:1});
     for(const p of shooting){
       const len=54;p.x-=p.v*dt;p.y+=p.v*.53*dt;p.life-=.018*dt;
       const grd=ctx.createLinearGradient(p.x,p.y,p.x+len,p.y-len*.53);
       grd.addColorStop(0,'rgba(255,247,230,'+Math.max(0,p.life*.82)+')');grd.addColorStop(1,'rgba(255,247,230,0)');
       ctx.beginPath();ctx.strokeStyle=grd;ctx.lineWidth=1.4;ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+len,p.y-len*.53);ctx.stroke();
     }
     shooting=shooting.filter(p=>p.life>0&&p.y<h);
   }
   raf=calm()?0:requestAnimationFrame(starLoop);
 }
 function syncPlayback(){
   dialog.dataset.motion=calm()?'off':'on';
   dialog.dataset.paused=String(Boolean(document.hidden));
   if(raf)cancelAnimationFrame(raf);raf=0;
   if(dialog.open&&!document.hidden){last=0;raf=requestAnimationFrame(starLoop)}
 }
 function open(event){
   if(dialog.open)return;
   const origin=event?.detail?.origin;root.style.setProperty('--cosmos-origin-x',(Number.isFinite(origin?.x)?origin.x:50)+'%');root.style.setProperty('--cosmos-origin-y',(Number.isFinite(origin?.y)?origin.y:48)+'%');
   preview.hidden=true;selected=-1;lastFocus=document.activeElement;
   dialog.showModal();showStage(0);resize();last=0;shooting=[];
   syncPlayback();
 }
 function close(){
   if(!preview.hidden){closePhoto();return}
   if(dialog.open)dialog.close();
 }
 closeButton.addEventListener('click',close);
 dialog.addEventListener('close',()=>{
   if(raf){cancelAnimationFrame(raf);raf=0}shooting=[];stages[0].dataset.sequence='idle';lastFocus?.focus?.({preventScroll:true});
 });
 dialog.addEventListener('cancel',e=>{if(!preview.hidden){e.preventDefault();closePhoto()}});
 document.addEventListener('keydown',e=>{
   if(!dialog.open || preview.hidden)return;
   if(e.key==='ArrowRight'){e.preventDefault();openPhoto(selected+1)}
   if(e.key==='ArrowLeft'){e.preventDefault();openPhoto(selected-1)}
 });
 window.addEventListener('resize',()=>{if(dialog.open){resize();syncPlayback()}},{passive:true});
 document.addEventListener('visibilitychange',syncPlayback);
 reduced?.addEventListener?.('change',syncPlayback);
 const motionObserver=typeof MutationObserver==='function'?new MutationObserver(syncPlayback):null;
 if(main)motionObserver?.observe(main,{attributes:true,attributeFilter:['data-motion']});
 window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);raf=0;dialog.dataset.paused='true'});
 window.addEventListener('pageshow',syncPlayback);
 document.getElementById('cosmos-to-stars').addEventListener('click',()=>showStage(1));
 document.getElementById('cosmos-to-apod').addEventListener('click',()=>showStage(2));
 document.getElementById('cosmos-to-gallery').addEventListener('click',()=>showStage(3));
 document.getElementById('cosmos-gallery-home').addEventListener('click',()=>{
   dialog.close();location.hash='#home';
 });
 document.querySelectorAll('[data-wish]').forEach(button=>button.addEventListener('click',()=>{
   const index=Number(button.dataset.wish);
   button.classList.add('is-lit');
   const paragraph=document.getElementById('cosmos-wish-text');
   paragraph.textContent=wishes[index];
   paragraph.style.animation='none';void paragraph.offsetWidth;paragraph.style.animation='';
 }));
 document.addEventListener('winter:cosmos-open',open);
})();
