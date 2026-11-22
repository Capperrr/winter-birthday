/* Brief light exposure for Morning/Night, local refraction for the lake. */
(()=>{
  'use strict';
  const shell=document.getElementById('main');
  if(!shell||shell.dataset.waterWavesReady==='true')return;
  shell.dataset.waterWavesReady='true';
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const backdrop=shell.querySelector('.memory-backdrop');
  const img=backdrop?.querySelector('img');
  const stage=shell.querySelector('.living-stage');

  // The Home photograph has no lake. Its toggle receives only a light pulse.
  if(stage){
    let time=shell.dataset.livingTime||'morning';
    let cleanup=null;
    function transitionWave(){
      const next=shell.dataset.livingTime||'morning';
      if(next===time)return;
      time=next;
      if(cleanup){cleanup();cleanup=null}
      if(reduced.matches||document.hidden||shell.dataset.page!=='home'||shell.dataset.motion==='off')return;
      const wrapper=document.createElement('div');
      wrapper.className='winter-light-wave winter-light-wave--'+next;
      wrapper.setAttribute('aria-hidden','true');
      wrapper.innerHTML='<span class="winter-light-glow"></span>';
      stage.append(wrapper);
      const remove=()=>wrapper.remove();
      cleanup=remove;
      // animationend is preferred; the timer only cleans up if animations are paused
      wrapper.lastElementChild.addEventListener('animationend',remove,{once:true});
      window.setTimeout(remove,1650);
    }
    new MutationObserver(transitionWave).observe(shell,{attributes:true,attributeFilter:['data-living-time']});
  }

  if(!backdrop||!img)return;
  const canvas=document.createElement('canvas');
  canvas.className='winter-lake-refraction';
  canvas.setAttribute('aria-hidden','true');
  backdrop.append(canvas);
  const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
  if(!ctx)return;
  const photograph=document.createElement('canvas');
  const photoCtx=photograph.getContext('2d',{alpha:false});
  if(!photoCtx)return;
  // Conservative lake-water polygon on the original photograph (relative 0..1).
  // Forest, bank, sky and meadow are excluded from effects.
  const lake=[
    [.34,.61],[.45,.58],[.65,.568],[.80,.579],
    [.835,.604],[.80,.646],[.73,.69],[.66,.724],
    [.56,.722],[.445,.697],[.375,.66]
  ];
  const ripples=[];
  const lifetime=1470,maxRipples=3;
  let frame=0,lastFrame=0,geometry=null,dpr=1,ready=false;
  function isActive(){
    return shell.dataset.destination==='letter'&&!document.hidden&&!backdrop.hidden&&
      shell.dataset.motionPaused!=='true'&&shell.dataset.motion!=='off';
  }
  function insidePolygon(x,y){
    let inside=false;
    for(let i=0,j=lake.length-1;i<lake.length;j=i++){
      const a=lake[i],b=lake[j];
      if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  }
  function updateSize(){
    if(!img.naturalWidth||!img.naturalHeight)return;
    const rect=img.getBoundingClientRect();
    if(rect.width<2||rect.height<2)return;
    dpr=Math.min(window.devicePixelRatio||1,1.25);
    const width=Math.round(rect.width*dpr),height=Math.round(rect.height*dpr);
    if(canvas.width!==width||canvas.height!==height){
      canvas.width=width;canvas.height=height;
      photograph.width=width;photograph.height=height;
    }
    const mobile=window.matchMedia('(max-width:760px)').matches;
    const scale=Math.max(rect.width/img.naturalWidth,rect.height/img.naturalHeight);
    const coverW=img.naturalWidth*scale,coverH=img.naturalHeight*scale;
    const offsetX=(rect.width-coverW)*(mobile?.49:.5);
    const offsetY=(rect.height-coverH)*(mobile?.5:.53);
    geometry={rect,coverW,coverH,offsetX,offsetY,
      px:x=>(offsetX+x*coverW)*dpr,
      py:y=>(offsetY+y*coverH)*dpr};
    photoCtx.setTransform(1,0,0,1,0,0);
    photoCtx.clearRect(0,0,width,height);
    photoCtx.drawImage(img,offsetX*dpr,offsetY*dpr,coverW*dpr,coverH*dpr);
    ready=true;
  }
  function syncSize(){
    if(!img.complete||!img.naturalWidth)return;
    const rect=img.getBoundingClientRect();
    if(!geometry||Math.abs(geometry.rect.width-rect.width)>1||Math.abs(geometry.rect.height-rect.height)>1)updateSize();
  }
  function samplePoint(clientX,clientY){
    if(!geometry)return null;
    const g=geometry;
    // The new lake is an in-flow print, so scrolling can move it without resizing it.
    const rect=img.getBoundingClientRect();
    const x=clientX-rect.left,y=clientY-rect.top;
    if(x<0||y<0||x>rect.width||y>rect.height)return null;
    const u=(x-g.offsetX)/g.coverW, v=(y-g.offsetY)/g.coverH;
    return insidePolygon(u,v)?{x:x*dpr,y:y*dpr,u,v}:null;
  }
  function pathLake(){
    if(!geometry)return;
    ctx.beginPath();
    lake.forEach(([x,y],index)=>{
      if(index===0)ctx.moveTo(geometry.px(x),geometry.py(y));
      else ctx.lineTo(geometry.px(x),geometry.py(y));
    });
    ctx.closePath();
  }
  function stop(){
    if(frame)cancelAnimationFrame(frame);
    frame=0;lastFrame=0;ripples.length=0;
    ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  function paint(t){
    frame=0;
    if(!isActive()||reduced.matches){stop();return}
    if(t-lastFrame<1000/32){frame=requestAnimationFrame(paint);return}
    lastFrame=t;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(!ripples.length)return;
    ctx.save();pathLake();ctx.clip();
    const maxR=Math.min(canvas.width*.31,330*dpr);
    for(let n=ripples.length-1;n>=0;n--){
      const r=ripples[n],p=Math.min(1,(t-r.birth)/lifetime);
      if(p>=1){ripples.splice(n,1);continue}
      const alpha=Math.pow(1-p,1.3);
      const ringR=15*dpr+p*maxR;
      // Three narrow elliptical refractive annuli, not opaque CSS rings.
      for(let k=0;k<3;k++){
        const radius=ringR-k*10*dpr;
        if(radius<5*dpr)continue;
        const band=3.5*dpr;
        ctx.save();ctx.beginPath();
        ctx.ellipse(r.x,r.y,radius,(radius)*.31,0,0,Math.PI*2);
        ctx.ellipse(r.x,r.y,radius-band,Math.max(1,(radius-band)*.31),0,0,Math.PI*2,true);
        ctx.clip('evenodd');
        const dx=(k%2===0?2.1:-1.5)*dpr*alpha;
        const dy=(k%2===0?-1.1:1.4)*dpr*alpha;
        ctx.globalAlpha=.85*alpha;
        ctx.drawImage(photograph,dx,dy);
        ctx.restore();
      }
      ctx.save();ctx.globalAlpha=.43*alpha;
      ctx.lineWidth=Math.max(1,1.5*dpr*(1-p*.5));
      ctx.strokeStyle='#e9faff';
      ctx.shadowColor='#d3faff';ctx.shadowBlur=7*dpr;
      ctx.beginPath();ctx.ellipse(r.x,r.y,ringR,ringR*.31,0,0,Math.PI*2);
      ctx.stroke();ctx.restore();
      ctx.save();ctx.globalAlpha=.18*alpha;
      ctx.strokeStyle='#062f43';ctx.lineWidth=2*dpr;
      ctx.beginPath();ctx.ellipse(r.x,r.y,ringR-4*dpr,Math.max(1,ringR*.31-2*dpr),0,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    if(ripples.length)frame=requestAnimationFrame(paint);
  }
  function addRipple(pt){
    if(reduced.matches||!isActive())return;
    const now=performance.now();
    ripples.push({x:pt.x,y:pt.y,birth:now});
    if(ripples.length>maxRipples)ripples.shift();
    if(!frame)frame=requestAnimationFrame(paint);
  }
  const starts=new Map();
  function blocked(target){
    return Boolean(target.closest('button,a,input,textarea,select,label,dialog,[role="button"],[role="link"]'));
  }
  shell.addEventListener('pointerdown',e=>{
    if(!isActive()||!e.isPrimary||blocked(e.target))return;
    syncSize();
    const point=samplePoint(e.clientX,e.clientY);
    if(point)starts.set(e.pointerId,{x:e.clientX,y:e.clientY,t:performance.now(),point});
  },{passive:true});
  shell.addEventListener('pointerup',e=>{
    const start=starts.get(e.pointerId);starts.delete(e.pointerId);
    if(!start||blocked(e.target))return;
    if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>13||performance.now()-start.t>480)return;
    const point=samplePoint(e.clientX,e.clientY);
    if(point)addRipple(point);
  },{passive:true});
  shell.addEventListener('pointercancel',e=>starts.delete(e.pointerId),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
  new MutationObserver(()=>{
    if(!isActive())stop();
    else syncSize();
  }).observe(shell,{attributes:true,attributeFilter:['data-destination','data-motion','data-motion-paused']});
  window.addEventListener('resize',()=>{stop();updateSize()},{passive:true});
  if(img.complete&&img.naturalWidth)updateSize();
  else img.addEventListener('load',updateSize,{once:true});
})();
