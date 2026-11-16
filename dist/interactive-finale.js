(() => {
  'use strict';
  const shell = document.getElementById('main');
  const dialog = document.getElementById('portrait-lightbox');
  const pins = Array.from(document.querySelectorAll('[data-portrait]'));
  const large = document.getElementById('portrait-large-image');
  const largeTitle = document.getElementById('portrait-lightbox-title');
  const largeZh = document.getElementById('portrait-lightbox-zh');
  const counter = document.getElementById('portrait-counter');
  const finalPage = document.getElementById('birthday-finale');
  const newspaper = document.getElementById('finale-newspaper');
  const help = document.getElementById('finale-help');
  const surprise = document.getElementById('finale-surprise');
  const left = document.getElementById('finale-piece-left');
  const right = document.getElementById('finale-piece-right');
  const confettiCanvas = document.getElementById('finale-confetti');
  const balloonLayer = document.getElementById('finale-balloons');
  const bits = [
    ['Free spirit','自由的灵魂','海边的风和背影'],
    ['Gentle gaze','温柔的目光','暖光下的日常'],
    ['Quiet glow','安静发光','夜晚暖色里的你'],
    ['Open heart','清澈真诚','蓝色海天的草坡'],
    ['Radiance','明媚耀眼','鲜花与蝴蝶'],
    ['Fearlessly you','自在做自己','蓝天下的酷女孩'],
    ['Wanderlust','热爱探索','背着海鹦玩偶看海']
  ];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let portraitIndex = 0, lastPin = null;
  // Interaction feedback remains visual only; background music is controlled separately.
  let celebrated = false, animationId = 0, particles = [], lastFrame = 0, effectEnd = 0, activeDrag = null;
  const pieces = {left:false,right:false};
  const palette = ['#ef889c','#eeb868','#8db8a5','#b5a0d1','#95bed4','#f1d5a1','#e5aabb'];
  function quietMotion(){ return reduced.matches || shell?.dataset.motion === 'off'; }
  document.addEventListener('pointerdown',event=>{
    const target=event.target?.closest?.('button:not(:disabled),a[href]');
    if (!target) return;
    target.classList.add('is-interacting');
    if (target.tagName==='BUTTON' && !target.matches('.finale-piece, .grand-lighter, .candle-ignition-target') && !quietMotion()) {
      const rect=target.getBoundingClientRect();
      const ripple=document.createElement('span');ripple.className='touch-ripple';
      ripple.style.setProperty('--ripple-x',(event.clientX-rect.left)+'px');
      ripple.style.setProperty('--ripple-y',(event.clientY-rect.top)+'px');
      const st=getComputedStyle(target);if(st.position==='static')target.style.position='relative';
      target.appendChild(ripple);
      ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});
      window.setTimeout(()=>ripple.remove(),600);
    }
  },{capture:true,passive:true});
  for (const name of ['pointerup','pointercancel'])document.addEventListener(name,()=>{
    document.querySelectorAll('.is-interacting').forEach(el=>el.classList.remove('is-interacting'));
  },{capture:true,passive:true});

  function openPortrait(i,focusOnClose) {
    if(!dialog||!large)return;
    portraitIndex=(i+bits.length)%bits.length;
    const [en,zh,alt]=bits[portraitIndex],x=((portraitIndex%4)/3*100).toFixed(4)+'%',y=portraitIndex<4?'0%':'100%';
    large.style.setProperty('--tile-x',x);
    large.style.setProperty('--tile-y',y);
    large.setAttribute('aria-label',alt);
    largeTitle.textContent=en;largeZh.textContent=zh;
    counter.textContent=String(portraitIndex+1).padStart(2,'0')+' / 07';
    if (!dialog.open) {
      lastPin=focusOnClose||pins[i];
      dialog.showModal();
      document.getElementById('portrait-close')?.focus({preventScroll:true});
    }
  }
  pins.forEach(pin=>pin.addEventListener('click',()=>openPortrait(Number(pin.dataset.portrait),pin)));
  function closePortrait(){
    if(!dialog?.open)return;
    dialog.close();lastPin?.focus({preventScroll:true});
  }
  document.getElementById('portrait-close')?.addEventListener('click',closePortrait);
  document.getElementById('portrait-prev')?.addEventListener('click',()=>openPortrait(portraitIndex-1));
  document.getElementById('portrait-next')?.addEventListener('click',()=>openPortrait(portraitIndex+1));
  dialog?.addEventListener('click',e=>{if(e.target===dialog)closePortrait()});
  dialog?.addEventListener('keydown',e=>{
    if(e.key==='ArrowRight'){e.preventDefault();openPortrait(portraitIndex+1)}
    else if(e.key==='ArrowLeft'){e.preventDefault();openPortrait(portraitIndex-1)}
  });
  if(!finalPage||!newspaper||!left||!right)return;

  function resetFinale(){
    cancelAnimationFrame(animationId);animationId=0;particles=[];celebrated=false;
    pieces.left=false;pieces.right=false;activeDrag=null;
    for(const el of [left,right]){
      el.classList.remove('is-found');el.style.removeProperty('--piece-dx');el.style.removeProperty('--piece-dy');
      el.disabled=false;el.setAttribute('aria-pressed','false');
    }
    newspaper.dataset.joined='false';surprise.hidden=true;
    help.innerHTML='照片被时光撕成了两半。<strong>拖动或点击两边的照片，让我们重新站到一起。</strong>';
    balloonLayer.replaceChildren();
    const c=confettiCanvas.getContext('2d');if(c)c.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
  }
  function choosePiece(which) {
    if(celebrated||pieces[which])return;
    pieces[which]=true;
    const button=which==='left'?left:right;
    button.classList.add('is-found');button.setAttribute('aria-pressed','true');button.style.removeProperty('--piece-dx');button.style.removeProperty('--piece-dy');
    
    if(pieces.left&&pieces.right) {
      celebrate();
    } else {
      help.innerHTML='找到第一半了。<strong>再把另一半拼上，看看我们的故事。</strong>';
    }
  }
  for(const [el,which] of [[left,'left'],[right,'right']]) {
    el.addEventListener('pointerdown',e=>{
      if(celebrated||pieces[which])return;
      activeDrag={which,id:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};
      if(el.setPointerCapture)try{el.setPointerCapture(e.pointerId)}catch(_){}
    });
    el.addEventListener('pointermove',e=>{
      if(!activeDrag||activeDrag.which!==which||activeDrag.id!==e.pointerId||celebrated)return;
      const dx=Math.max(-90,Math.min(90,e.clientX-activeDrag.startX));
      const dy=Math.max(-50,Math.min(50,e.clientY-activeDrag.startY));
      if(Math.abs(dx)>5||Math.abs(dy)>5)activeDrag.moved=true;
      activeDrag.lastX=e.clientX;activeDrag.lastY=e.clientY;
      if(!quietMotion()){el.style.setProperty('--piece-dx',dx+'px');el.style.setProperty('--piece-dy',dy+'px');}
    });
    el.addEventListener('pointerup',e=>{
      if(!activeDrag||activeDrag.which!==which||activeDrag.id!==e.pointerId)return;
      const moved=activeDrag.moved;activeDrag=null;
      if(moved)choosePiece(which);
    });
    el.addEventListener('pointercancel',()=>{activeDrag=null;el.style.removeProperty('--piece-dx');el.style.removeProperty('--piece-dy')});
    el.addEventListener('click',()=>choosePiece(which));
  }
  document.getElementById('finale-replay')?.addEventListener('click',()=>{
    resetFinale();
    left.focus({preventScroll:true});
  });
  document.addEventListener('winter:finale-enter',()=>{resetFinale()});
  if(shell?.dataset.destination==='finale')resetFinale();
  let lastRoute=shell?.dataset.destination;
  if('MutationObserver' in window) {
    const observer=new MutationObserver(()=>{
      const route=shell.dataset.destination;
      if(lastRoute==='finale'&&route!=='finale'){cancelAnimationFrame(animationId);animationId=0;particles=[];balloonLayer.replaceChildren()}
      lastRoute=route;
    });
    observer.observe(shell,{attributes:true,attributeFilter:['data-destination']});
  }
  function spawnBalloons(){
    balloonLayer.replaceChildren();
    if(quietMotion())return;
    for(let i=0;i<13;i++){
      const b=document.createElement('span');b.className='finale-balloon';
      b.style.setProperty('--float-x',(5+((i*37)%90))+'%');
      b.style.setProperty('--float-color',palette[i%palette.length]);
      b.style.setProperty('--float-duration',(6.2+(i%5)*.5)+'s');
      b.style.setProperty('--float-delay',(i*.16)+'s');
      balloonLayer.appendChild(b);
    }
    window.setTimeout(()=>{if(shell.dataset.destination==='finale')balloonLayer.replaceChildren()},10000);
  }
  function resizeCanvas(){
    const d=Math.min(2,window.devicePixelRatio||1);
    const w=window.innerWidth,h=window.innerHeight;
    confettiCanvas.width=Math.round(w*d);
    confettiCanvas.height=Math.round(h*d);
    confettiCanvas.style.width=w+'px';confettiCanvas.style.height=h+'px';
    const ctx=confettiCanvas.getContext('2d');if(ctx)ctx.setTransform(d,0,0,d,0,0);
    return {w,h};
  }
  function createBurst(x,y,count,colors,scale=1) {
    for(let j=0;j<count;j++){
      const angle=(Math.PI*2*j/count)+(Math.random()-.5)*.12;
      const speed=(2+Math.random()*4)*scale;
      particles.push({kind:'spark',x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:1,decay:.008+Math.random()*.009,color:colors[j%colors.length],size:1.5+Math.random()*2.5,spin:0});
    }
  }
  function spawnStarCake(w,h){
    const cx=w/2,cy=h*.51,ww=Math.min(285,w*.56);
    const x1=cx-ww*.48,x2=cx+ww*.48,top=cy-ww*.28,bottom=cy+ww*.34;
    const points=[];
    function line(ax,ay,bx,by,n=30,clr='#f5dfbd'){
      for(let i=0;i<n;i++){
        const k=i/(n-1);points.push([ax+(bx-ax)*k,ay+(by-ay)*k,clr]);
      }
    }
    line(x1,top,x2,top,62,'#f5dfbd');
    line(x1,bottom,x2,bottom,70,'#f5dfbd');
    line(x1,top,x1,bottom,44,'#d4b2df');
    line(x2,top,x2,bottom,44,'#d4b2df');
    line(x1,cy+ww*.08,x2,cy+ww*.08,62,'#ceb4e9');
    for(let k=0;k<74;k++){
      const f=k/73,xx=x1+ww*.96*f,yy=top+12+7*Math.sin(f*9*Math.PI);
      points.push([xx,yy,'#e9c3dc']);
    }
    for(const dx of [-.22,0,.22]){
      line(cx+ww*dx,top-ww*.19,cx+ww*dx,top,19,'#f6eee2');
      for(let k=0;k<9;k++){const angle=Math.PI*2*k/9;points.push([
        cx+ww*dx+Math.sin(angle)*4,top-ww*.21+Math.cos(angle)*8,'#ffe2a5'
      ])}
    }
    for(const [tx,ty,color] of points)particles.push({
      kind:'cake',x:between(.08*w,.92*w),y:between(.08*h,.83*h),tx,ty,
      vx:0,vy:0,life:1,color,size:between(1,2.4),spin:between(0,6.28)
    });
  }
  function between(a,b){return a+Math.random()*(b-a)}
  function startConfetti(variant='default'){
    if(quietMotion())return;
    const {w,h}=resizeCanvas();
    particles=[];lastFrame=0;
    const startTime=performance.now(),effectEndAt=startTime+(variant==='scatter'?3200:variant==='gather'?5400:8800);
    effectEnd=effectEndAt;
    for(let i=0;i<(variant==='gather'?0:92);i++)particles.push({
      kind:'paper',x:Math.random()*w,y:-Math.random()*h*.7,
      vx:(Math.random()-.5)*2,vy:1+Math.random()*2.2,
      life:1,decay:0,color:palette[i%palette.length],
      size:4+Math.random()*6,spin:Math.random()*6.28
    });
    if(variant!=='gather')createBurst(w*.24,h*.31,50,['#ffe7b2','#e8c1df','#f5f1ee'],1.2);
    if(variant!=='gather')createBurst(w*.76,h*.25,50,['#e3c8ff','#d0e8eb','#f7dfbf'],1.2);
    if(variant!=='scatter')spawnStarCake(w,h);
    const ctx=confettiCanvas.getContext('2d');if(!ctx)return;
    const draw=now=>{
      if(shell.dataset.destination!=='finale'){animationId=0;ctx.clearRect(0,0,w,h);return}
      const dt=Math.min(2.5,Math.max(.65,(now-(lastFrame||now-16))/16));
      lastFrame=now;
      const elapsed=now-startTime;
      ctx.clearRect(0,0,w,h);
      if(variant!=='gather'&&elapsed<2300&&Math.random()<.075){
        createBurst(w*between(.12,.88),h*between(.12,.45),31,['#eee1f5','#f8e9c8','#f6f7f4'],1.05);
      }
      particles=particles.filter(p=>p.life>0&&p.y<h+45);
      for(const p of particles){
        if(p.kind==='cake'){
          if(elapsed<(variant==='default'?1250:0))continue;
          const ease=Math.min(.18,dt*.055);
          p.x+=(p.tx-p.x)*ease;p.y+=(p.ty-p.y)*ease;
          const fadeAt=variant==='default'?7000:4100;
           p.life=elapsed>fadeAt?Math.max(0,1-(elapsed-fadeAt)/850):1;
          ctx.globalAlpha=p.life*(.73+.27*Math.sin(now*.003+p.spin));
          ctx.fillStyle=p.color;
          ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
          continue;
        }
        p.x+=p.vx*dt;p.y+=p.vy*dt;
        if(p.kind==='spark'){
          p.vx*=.991;p.vy=(p.vy+.048*dt)*.997;
          p.life-=p.decay*dt;
        } else {
          p.y+=.52*dt;p.spin+=.07*dt;p.x+=Math.sin(p.spin)*.65;
        }
        ctx.globalAlpha=p.life;ctx.fillStyle=p.color;
        ctx.save();ctx.translate(p.x,p.y);
        if(p.kind==='paper'){
          ctx.rotate(p.spin);ctx.fillRect(-p.size/2,-p.size/3,p.size,p.size*.6);
        } else {
          ctx.beginPath();ctx.arc(0,0,p.size,0,Math.PI*2);ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha=1;
      if(now<effectEndAt||particles.some(p=>p.kind==='spark'))animationId=requestAnimationFrame(draw);
      else{animationId=0;ctx.clearRect(0,0,w,h)}
    };
    animationId=requestAnimationFrame(draw);
  }

  // Optional camera gestures: palm opens stardust; fist brings the cake together.
  document.addEventListener('winter:gesture-particle',event=>{
    if(shell.dataset.destination!=='finale' || !celebrated || quietMotion())return;
    const variant=event.detail?.action==='scatter'?'scatter':event.detail?.action==='gather'?'gather':null;
    if(!variant)return;
    cancelAnimationFrame(animationId);animationId=0;
    startConfetti(variant);
  });
  function celebrate(){
    if(celebrated)return;
    celebrated=true;
    
    newspaper.dataset.joined='true';
    help.innerHTML='拼好了。<strong>原来有些缘分，真的会把我们带到彼此面前。</strong>';
    left.disabled=right.disabled=true;
    surprise.hidden=false;
    const ms=quietMotion()?0:190;
    window.setTimeout(()=>{
      if(shell.dataset.destination!=='finale'||!celebrated)return;
      spawnBalloons();startConfetti();
      surprise.scrollIntoView({behavior:quietMotion()?'instant':'smooth',block:'nearest'});
    },ms);
  }
})();