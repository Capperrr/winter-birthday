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
  let fxEnabled = true, audioContext = null, soundToggle;
  let celebrated = false, animationId = 0, particles = [], lastFrame = 0, effectEnd = 0, activeDrag = null;
  const pieces = {left:false,right:false};
  const palette = ['#ef889c','#eeb868','#8db8a5','#b5a0d1','#95bed4','#f1d5a1','#e5aabb'];
  function quietMotion(){ return reduced.matches || shell?.dataset.motion === 'off'; }
  function audio() {
    if (!fxEnabled) return null;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (!audioContext) audioContext = new Ctx();
      if (audioContext.state === 'suspended') audioContext.resume().catch(()=>{});
      return audioContext;
    } catch (_) { return null; }
  }
  function tone(freq, duration=.075, volume=.016, type='sine', when=0) {
    const ctx=audio();if(!ctx)return;
    try {
      const o=ctx.createOscillator(),g=ctx.createGain(),start=ctx.currentTime+when;
      o.type=type;o.frequency.setValueAtTime(freq,start);
      o.frequency.exponentialRampToValueAtTime(Math.max(100,freq*.78),start+duration);
      g.gain.setValueAtTime(.0001,start);
      g.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),start+.012);
      g.gain.exponentialRampToValueAtTime(.0001,start+duration);
      o.connect(g);g.connect(ctx.destination);o.start(start);o.stop(start+duration+.025);
    } catch (_) {}
  }
  const fx = {
    tap(){tone(480,.042,.011,'triangle')},
    open(){tone(520,.07,.015,'sine');tone(780,.11,.009,'sine',.06)},
    pick(){tone(270,.085,.023,'triangle')},
    snap(){tone(420,.09,.023,'sine');tone(660,.13,.021,'sine',.1);tone(990,.2,.018,'sine',.24)},
    burst(){[480,640,800,1040].forEach((n,i)=>tone(n,.19,.016,'sine',i*.115))}
  };
  window.winterInteractionFx=fx;

  // A quiet, optional tactile cue on genuine user gestures.
  const actions = document.querySelector('.header-actions');
  if (actions) {
    soundToggle=document.createElement('button');
    soundToggle.type='button';soundToggle.id='fx-audio-toggle';
    soundToggle.title='关闭交互音效';soundToggle.setAttribute('aria-label','关闭交互音效');
    soundToggle.setAttribute('aria-pressed','true');soundToggle.dataset.enabled='true';
    soundToggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 8 6 11H3v4h3l4 3V8Z"/><path d="M14 9c1 1 1.5 2 1.5 3s-.5 2-1.5 3M17 6c2 1.5 3 3.5 3 6s-1 4.5-3 6"/></svg>';
    actions.insertBefore(soundToggle,actions.firstChild);
    soundToggle.addEventListener('click',()=>{
      fxEnabled=!fxEnabled;soundToggle.dataset.enabled=String(fxEnabled);
      soundToggle.setAttribute('aria-pressed',String(fxEnabled));
      soundToggle.title=fxEnabled?'关闭交互音效':'打开交互音效';
      soundToggle.setAttribute('aria-label',soundToggle.title);
      if (fxEnabled)fx.open();
    });
  }
  document.addEventListener('pointerdown',event=>{
    const target=event.target?.closest?.('button:not(:disabled),a[href]');
    if (!target) return;
    target.classList.add('is-interacting');
    if (target!==soundToggle) fx.tap();
    if (target.tagName==='BUTTON' && !target.matches('.finale-piece') && !quietMotion()) {
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
      dialog.showModal();fx.open();
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
    fx.pick();
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
    resetFinale();fx.open();
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
  function startConfetti(){
    if(quietMotion())return;
    const {w,h}=resizeCanvas();particles=[];lastFrame=0;effectEnd=performance.now()+9600;
    for(let i=0;i<105;i++)particles.push({kind:'paper',x:Math.random()*w,y:-Math.random()*h*.7,vx:(Math.random()-.5)*2,vy:1+Math.random()*2.2,life:1,decay:0,color:palette[i%palette.length],size:4+Math.random()*6,spin:Math.random()*6.28});
    createBurst(w*.25,h*.30,35,palette,1);createBurst(w*.74,h*.23,35,palette,1);
    const ctx=confettiCanvas.getContext('2d');if(!ctx)return;
    const draw=now=>{
      if(shell.dataset.destination!=='finale'){animationId=0;ctx.clearRect(0,0,w,h);return}
      const dt=Math.min(2.5,Math.max(.65,(now-(lastFrame||now-16))/16));lastFrame=now;
      ctx.clearRect(0,0,w,h);
      if(now<effectEnd&&Math.random()<.065)createBurst(w*(.12+Math.random()*.76),h*(.13+Math.random()*.3),30,palette,1.1);
      particles=particles.filter(p=>p.life>0&&p.y<h+35);
      for(const p of particles){
        p.x+=p.vx*dt;p.y+=p.vy*dt;
        if(p.kind==='spark'){p.vx*=.992;p.vy=(p.vy+.055*dt)*.997;p.life-=p.decay*dt}
        else {p.y+=.52*dt;p.spin+=.07*dt;p.x+=Math.sin(p.spin)*.65}
        ctx.globalAlpha=p.life;ctx.fillStyle=p.color;
        ctx.save();ctx.translate(p.x,p.y);
        if(p.kind==='paper'){ctx.rotate(p.spin);ctx.fillRect(-p.size/2,-p.size/3,p.size,p.size*.6)}
        else {ctx.beginPath();ctx.arc(0,0,p.size,0,Math.PI*2);ctx.fill()}
        ctx.restore();
      }
      ctx.globalAlpha=1;
      if(now<effectEnd||particles.some(p=>p.kind==='spark'))animationId=requestAnimationFrame(draw);
      else {animationId=0;ctx.clearRect(0,0,w,h)}
    };
    animationId=requestAnimationFrame(draw);
  }
  function celebrate(){
    if(celebrated)return;
    celebrated=true;
    fx.snap();
    newspaper.dataset.joined='true';
    help.innerHTML='拼好了。<strong>原来有些缘分，真的会把我们带到彼此面前。</strong>';
    left.disabled=right.disabled=true;
    surprise.hidden=false;
    const ms=quietMotion()?0:720;
    window.setTimeout(()=>{
      if(shell.dataset.destination!=='finale'||!celebrated)return;
      fx.burst();spawnBalloons();startConfetti();
      surprise.scrollIntoView({behavior:quietMotion()?'instant':'smooth',block:'nearest'});
    },ms);
  }
})();