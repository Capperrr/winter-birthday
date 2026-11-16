(() => {
  'use strict';
  const finale = document.getElementById('birthday-finale');
  const joined = document.getElementById('finale-newspaper');
  const surprise = document.getElementById('finale-surprise');
  const start = document.getElementById('finale-phone-start');
  const phone = document.getElementById('winter-phone-dialog');
  const shell = document.getElementById('winter-phone-shell');
  const camera = document.getElementById('winter-camera-screen');
  const lock = document.getElementById('winter-phone-lockscreen');
  const preview = document.querySelector('.winter-camera-viewfinder img');
  const lockImage = document.getElementById('winter-lock-wallpaper');
  const notification = document.getElementById('winter-lock-notification');
  const shutter = document.getElementById('winter-shutter');
  const save = document.getElementById('winter-wallpaper-save');
  const reset = document.getElementById('winter-phone-reset');
  const close = document.getElementById('winter-phone-close');
  const power = document.getElementById('winter-phone-power');
  const powerGuide = document.getElementById('phone-power-guide');
  const powerNext = document.getElementById('winter-phone-next');
  if (!finale || !start || !phone || !shutter) return;
  let revealTimer=0, notifyTimer=0, flashTimer=0, powerTimer=0, run=0, lastShot='', lastFocused=null, shotBusy=false, powerReady=false;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const quiet=()=>reduced?.matches || document.getElementById('main')?.dataset.motion==='off';

  function isCelebrated(){return joined?.dataset.joined==='true' && !surprise.hidden;}
  function hideStart(){clearTimeout(revealTimer);start.hidden=true;}
  function scheduleStart(){
    hideStart();
    if(!isCelebrated())return;
    revealTimer=window.setTimeout(()=>{ if(isCelebrated())start.hidden=false; },reduced?.matches?0:160);
  }
  start.hidden=true;
  if (surprise){
    new MutationObserver(scheduleStart).observe(surprise,{attributes:true,attributeFilter:['hidden']});
  }
  document.addEventListener('winter:finale-enter',()=>{
    hideStart();
    closePhone();
  });
  function loadImage(path){
    return new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>resolve(null);
      img.src=path;
      if(img.complete && img.naturalWidth)resolve(img);
    });
  }
  function roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
  }
  function lines(ctx, text, x, y, maxWidth, lineHeight){
    const arr=[],words=Array.from(text);let line='';
    for(const ch of words){
      if(ctx.measureText(line+ch).width > maxWidth && line){arr.push(line);line=ch;} else line+=ch;
    }
    if(line)arr.push(line);
    arr.forEach((ln,i)=>ctx.fillText(ln,x,y+i*lineHeight));
    return y+arr.length*lineHeight;
  }
  function drawImageCover(ctx,img,x,y,w,h){
    const scale=Math.max(w/img.width,h/img.height),iw=img.width*scale,ih=img.height*scale;
    ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);
  }
  async function createBirthdayPhoto(){
    const canvas=document.createElement('canvas');canvas.width=720;canvas.height=1360;
    const c=canvas.getContext('2d');const W=canvas.width,H=canvas.height;
    const bg=c.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#f4ebdf');bg.addColorStop(.55,'#eee2d6');bg.addColorStop(1,'#b6a4ab');
    c.fillStyle=bg;c.fillRect(0,0,W,H);
    // Quiet film-grain marks and generous paper framing, like the actual finale.
    c.save();c.globalAlpha=.13;c.strokeStyle='#aa9182';c.lineWidth=1;
    for(let i=0;i<55;i++){
      const px=(i*101+23)%W,py=(i*179+65)%H;
      c.beginPath();c.moveTo(px,py);c.lineTo(px+8,py+2);c.stroke();
    }c.restore();
    c.fillStyle='#f8f3e7';
    roundRect(c,39,118,642,1042,9);c.fill();
    c.strokeStyle='#b7a793';c.lineWidth=3;roundRect(c,39,118,642,1042,9);c.stroke();
    c.fillStyle='#745e52';c.textAlign='center';
    c.font='40px Georgia,serif';c.fillText('THE WINTER CHRONICLE',360,201);
    c.fillStyle='#9d8877';c.font='16px Georgia,serif';c.fillText('A STORY IN TWO PIECES · 25',360,244);
    c.strokeStyle='#b6a48c';c.lineWidth=2;c.beginPath();c.moveTo(82,224);c.lineTo(638,224);c.stroke();
    // Snapshot of the local childhood celebration image (same artwork as the joined page).
    const photo=(await loadImage('assets/finale-duo-cutout.avif')) || (await loadImage('assets/finale-childhood-crisp.avif')) || (await loadImage('assets/finale-childhood.webp'));
    if(photo){
      c.save();roundRect(c,80,287,560,480,5);c.clip();drawImageCover(c,photo,80,287,560,480);c.restore();
    } else {
      const fallback=c.createLinearGradient(0,287,0,767);
      fallback.addColorStop(0,'#cbb5bc');fallback.addColorStop(1,'#83676e');
      c.fillStyle=fallback;c.fillRect(80,287,560,480);
    }
    c.strokeStyle='#c5ada8';c.lineWidth=5;c.strokeRect(78,285,564,484);
    c.fillStyle='#6d5455';c.textAlign='center';c.font='22px Georgia,serif';c.fillText('THEN & NOW · SIDE BY SIDE',360,811);
    // Gwen's original handwriting, unmodified, on the photographed page.
    const writing=await loadImage('assets/handwriting/gwen-birthday.png');
    if(writing){c.save();c.globalAlpha=.96;c.drawImage(writing,76,864,568,93);c.restore();}
    else {c.font='30px serif';c.fillText('我很荣幸，能够参与你的25岁。',360,933);}
    c.fillStyle='#90727c';c.font='italic 23px Georgia,serif';
    c.fillText('How lucky I am to be here.',360,1021);
    const everyBirthday=await loadImage('assets/handwriting/gwen-every-birthday.png');
    if(everyBirthday){c.save();c.globalAlpha=.90;c.drawImage(everyBirthday,97,1060,526,68);c.restore();}
    c.fillStyle='#9d8a81';c.font='15px Georgia,serif';c.fillText('FOR WINTER · WITH LOVE · GWEN',360,1206);
    c.fillStyle='#fff9ef';c.font='24px Georgia,serif';c.fillText('A little piece of fate, kept forever.',360,1304);
    return canvas.toDataURL('image/png');
  }
  function cancelPending(){
    clearTimeout(notifyTimer);clearTimeout(flashTimer);clearTimeout(powerTimer);
    notifyTimer=flashTimer=powerTimer=0;run++;shotBusy=false;
  }
  function setPowerReady(ready){
    powerReady=ready;shell.classList.toggle('is-power-ready',ready);
    if(power)power.disabled=!ready;
    if(powerNext)powerNext.disabled=!ready;
    if(powerGuide){powerGuide.hidden=!ready;powerGuide.classList.remove('is-leaving');}
  }
  async function openPhone(){
    if(!isCelebrated()||phone.open)return;
    cancelPending();const token=run;
    lastFocused=document.activeElement;lastShot='';
    shell.dataset.mode='camera';shell.classList.remove('is-snapping','is-powered-off');
    setPowerReady(false);camera.hidden=false;lock.hidden=true;notification.hidden=true;save.hidden=true;reset.hidden=true;
    phone.showModal();shutter.disabled=true;
    try{const image=await createBirthdayPhoto();if(token!==run||!phone.open)return;lastShot=image;preview.src=image;}catch(e){if(token!==run||!phone.open)return;lastShot='';}
    shutter.disabled=false;shutter.focus({preventScroll:true});
  }
  async function snap(){
    if(shotBusy||!phone.open||camera.hidden)return;
    const token=run;shotBusy=true;shutter.disabled=true;
    shell.classList.remove('is-snapping');void shell.offsetWidth;shell.classList.add('is-snapping');
    if(!lastShot)try{lastShot=await createBirthdayPhoto()}catch(e){}
    if(token!==run||!phone.open)return;
    flashTimer=window.setTimeout(()=>{
      if(token!==run||!phone.open)return;
      shell.classList.remove('is-snapping');camera.hidden=true;lock.hidden=false;shell.dataset.mode='lock';
      if(lastShot){lockImage.src=lastShot;save.href=lastShot;save.hidden=false;}
      reset.hidden=false;notification.hidden=true;shotBusy=false;
      notifyTimer=window.setTimeout(()=>{
        if(token!==run||!phone.open||lock.hidden)return;
        notification.hidden=false;setPowerReady(true);
        powerNext?.focus({preventScroll:true});
      },quiet()?100:1100);
    },quiet()?80:600);
  }
  function resetShot(){
    cancelPending();shutter.disabled=false;
    shell.dataset.mode='camera';camera.hidden=false;lock.hidden=true;
    shell.classList.remove('is-powered-off','is-snapping');setPowerReady(false);
    notification.hidden=true;save.hidden=true;reset.hidden=true;shutter.focus({preventScroll:true});
  }
  function closePhone(){
    cancelPending();setPowerReady(false);
    if(phone.open)phone.close();lastFocused?.focus?.({preventScroll:true});
  }
  function powerOff(){
    if(!powerReady||lock.hidden||!phone.open||shell.classList.contains('is-powered-off'))return;
    const token=run,rect=shell.getBoundingClientRect();
    const origin={x:Math.max(0,Math.min(100,(rect.left+rect.width/2)/(window.innerWidth||1)*100)),y:Math.max(0,Math.min(100,(rect.top+rect.height/2)/(window.innerHeight||1)*100))};
    powerReady=false;if(power)power.disabled=true;if(powerNext)powerNext.disabled=true;
    shell.classList.remove('is-power-ready');shell.classList.add('is-powered-off');powerGuide?.classList.add('is-leaving');
    window.navigator?.vibrate?.(10);
    powerTimer=window.setTimeout(()=>{
      if(token!==run||!phone.open)return;
      closePhone();shell.classList.remove('is-powered-off');
      document.dispatchEvent(new CustomEvent('winter:cosmos-open',{detail:{origin}}));
    },quiet()?110:560);
  }
  power?.addEventListener('click',powerOff);
  powerNext?.addEventListener('click',powerOff);
  start.addEventListener('click',openPhone);shutter.addEventListener('click',snap);
  reset?.addEventListener('click',resetShot);close?.addEventListener('click',closePhone);
  phone.addEventListener('close',()=>{cancelPending();setPowerReady(false);lastFocused?.focus?.({preventScroll:true});});
  phone.addEventListener('click',event=>event.stopPropagation());
})();
