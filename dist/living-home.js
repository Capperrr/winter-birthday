/* WINTER Living Landscape — preview only; no production mutation.
   A photo-based alpine world with real GPU grass and touch-sensitive wind. */
(()=>{
'use strict';
const shell=document.getElementById('main'),home=document.getElementById('panel-home');
if(!shell||!home||shell.querySelector('.living-stage'))return;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const stage=document.createElement('div');
stage.className='living-stage';stage.setAttribute('aria-hidden','true');
stage.innerHTML='<div class="living-cloudsheet"></div><div class="living-haze"></div><div class="living-sun"></div><div class="living-nightshade"></div><div class="living-moon"></div><div class="living-stars"></div><canvas class="living-grass" aria-hidden="true"></canvas>';
const shade=shell.querySelector('.landscape-shade');
if(shade)shade.after(stage);else shell.prepend(stage);
const sky=stage.querySelector('.living-stars');
for(let i=0;i<34;i++){
 const dot=document.createElement('i');dot.className='living-star';
 dot.style.cssText='--sx:'+((i*73.21+17)%94+3).toFixed(2)+'%;--sy:'+((i*23.91+7)%50+2).toFixed(2)+'%;--ss:'+(i%4===0?2:1.3)+'px;--sd:'+(2.6+i%5)+'s;--delay:'+(-i%6)+'s';
 sky.append(dot);
}
for(let i=0;i<13;i++){
 const dot=document.createElement('i');dot.className='living-firefly';
 dot.style.cssText='--fx:'+((i*17.35+7)%92+4).toFixed(2)+'%;--fy:'+(67+(i*9.5)%27).toFixed(2)+'%;--ft:'+(4+i%4)+'s;--fd:'+(-i*.43)+'s';
 stage.append(dot);
}
const controls=document.createElement('div');
controls.className='living-ui';controls.setAttribute('role','group');controls.setAttribute('aria-label','山野时间与交互');
controls.innerHTML='<div class="living-segment" role="group" aria-label="切换山野时间"><button type="button" id="living-morning" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>Morning</button><button type="button" id="living-night" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.7a8.5 8.5 0 0 1-11.7-11A8.5 8.5 0 1 0 20 15.7Z"/></svg>Night</button></div><span class="living-divider"></span><span class="living-hint" id="living-hint">用手指轻拂草地</span>';
shell.append(controls);
const badge=document.createElement('div');badge.className='living-preview-tag';badge.textContent='LIVING LANDSCAPE · HOME PREVIEW';shell.append(badge);
const canvas=stage.querySelector('canvas'),morning=controls.querySelector('#living-morning'),night=controls.querySelector('#living-night'),hint=controls.querySelector('#living-hint');
let mode='none',gl=null,program=null,uni={},ctx2d=null,paintCanvas=canvas,blades=[],width=0,height=0,ready=false,frame=0,lastDraw=0,nightMix=0,timeOfDay='morning';
let windTouch={x:-1e5,y:-1e5},cursor={x:-1e5,y:-1e5},power=0,shiftX=0,shiftY=0,windHeld=false;
const vertex=[
'#version 300 es','precision highp float;',
'uniform vec2 uResolution;','uniform float uTime;','uniform float uNight;','uniform vec2 uTouch;','uniform float uTouchStrength;',
'out vec4 vTint;',
'float hash(float x){return fract(sin(x*127.1+31.8)*43758.5453123);}',
'void main(){',
' float id=float(gl_InstanceID)+1.;',
' float rand1=hash(id*1.333),rand2=hash(id*7.133),rand3=hash(id*4.713),rand4=hash(id*13.171);',
' float depth=pow(rand2,.80);',
' float baselineY=mix(.125,1.045,depth)*uResolution.y;',
' float baselineX=(rand1*1.14-.07)*uResolution.x;',
' float scale=min(1.42,max(.58,uResolution.x/1100.));',
' float bladeHeight=mix(3.2,30.0,pow(depth,1.15))*scale*(.64+rand3*.82);',
' float bladeWidth=mix(.7,2.8,depth)*scale*(.68+rand4*.5);',
' float t=gl_VertexID==2?1.:0.;',
' float side=gl_VertexID==0?-1.:gl_VertexID==1?1.:0.;',
' float breeze=sin(uTime*1.0+rand1*15.0+depth*12.)*.50+sin(uTime*1.55+baselineX*.014+depth*7.1)*.45;',
' float broadwave=sin(uTime*.75+baselineX*.006+depth*7.0);',
' float dx=(breeze*.52+broadwave*.17)*bladeHeight;',
' float d=length(vec2(baselineX,baselineY)-uTouch);',
' float fall=exp(-d*d/(2.0*160.0*160.0));',
' dx+=sign(baselineX-uTouch.x)*uTouchStrength*fall*min(38.0,bladeHeight*2.0);',
' float x=baselineX+side*bladeWidth*.5+dx*t*t;',
' float y=baselineY-bladeHeight*t;',
' gl_Position=vec4(x/uResolution.x*2.0-1.0,1.0-y/uResolution.y*2.0,0.0,1.0);',
' vec3 darkGreen=vec3(.092,.19,.073),warmGreen=vec3(.31,.47,.12),brightGreen=vec3(.44,.55,.17);',
' vec3 c=mix(darkGreen,warmGreen,rand3);c=mix(c,brightGreen,rand4*.35);',
' c=mix(c,vec3(.115,.23,.27),uNight*.78);',
' c=mix(c,vec3(.63,.68,.26),t*(.17+.16*rand4)*(1.0-uNight));',
' float a=mix(.13,.62,pow(depth,1.35))*(.76+rand4*.35);',
' vTint=vec4(c,a);',
'}'
].join('\n');
const fragment=['#version 300 es','precision mediump float;','in vec4 vTint;','out vec4 outColor;','void main(){outColor=vTint;}'].join('\n');
function compile(type,src){
 const shader=gl.createShader(type);gl.shaderSource(shader,src);gl.compileShader(shader);
 if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader)||'Shader failed');
 return shader;
}
function startGraphics(){
 try{
  gl=canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,premultipliedAlpha:false,powerPreference:'low-power'});
  if(!gl)throw Error('WebGL2 unavailable');
  const v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragment);
  program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Link failed');
  gl.deleteShader(v);gl.deleteShader(f);gl.useProgram(program);
  gl.bindVertexArray(gl.createVertexArray());
  uni={resolution:gl.getUniformLocation(program,'uResolution'),time:gl.getUniformLocation(program,'uTime'),night:gl.getUniformLocation(program,'uNight'),touch:gl.getUniformLocation(program,'uTouch'),strength:gl.getUniformLocation(program,'uTouchStrength')};
  gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  mode='webgl';
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(frame);frame=0;mode='lost';});
  canvas.addEventListener('webglcontextrestored',()=>location.reload());
 }catch(err){
  console.warn('WINTER: WebGL grass fallback enabled',err);
  mode='2d';gl=null;
  const swap=document.createElement('canvas');swap.className=canvas.className;swap.setAttribute('aria-hidden','true');
  canvas.replaceWith(swap);paintCanvas=swap;ctx2d=swap.getContext('2d',{alpha:true});
  for(let i=0;i<1300;i++){
   const s=Math.abs(Math.sin(i*117.273)*715.782)%1,r=Math.abs(Math.sin(i*43.17)*334.842)%1,n=Math.abs(Math.sin(i*91.78)*216.145)%1;
   blades.push({x:s,y:.14+Math.pow(r,.82)*.91,n,seed:i*1.83});
  }
 }
}
function resize(){
 const rect=paintCanvas.getBoundingClientRect();
 if(!rect.width||!rect.height){ready=false;return}
 width=rect.width;height=rect.height;
 const ratio=Math.min(window.devicePixelRatio||1,innerWidth<650?1.1:1.5);
 paintCanvas.width=Math.max(1,Math.round(width*ratio));paintCanvas.height=Math.max(1,Math.round(height*ratio));
 if(gl)gl.viewport(0,0,paintCanvas.width,paintCanvas.height);
 if(ctx2d)ctx2d.setTransform(ratio,0,0,ratio,0,0);
 ready=true;
}
function render2d(t){
 ctx2d.clearRect(0,0,width,height);
 for(const b of blades){
  const depth=(b.y-.14)/.91,x=b.x*width,y=b.y*height,h=(3+26*Math.pow(depth,1.3))*(.7+b.n*.7)*Math.max(.65,Math.min(1.3,width/1050));
  const d=Math.hypot(windTouch.x-x,windTouch.y-y);
  const gust=power*Math.exp(-d*d/(2*165*165))*Math.sign(x-windTouch.x)*h*.9;
  const sway=Math.sin(t*1.2+b.seed)*h*.19+gust;
  const r=nightMix>.5?48:Math.round(51+b.n*36),g=nightMix>.5?83:Math.round(98+b.n*33),blue=nightMix>.5?91:Math.round(31+b.n*7);
  ctx2d.strokeStyle='rgba('+r+','+g+','+blue+','+(0.13+depth*.37).toFixed(2)+')';
  ctx2d.lineWidth=.65+depth*1.35;ctx2d.beginPath();ctx2d.moveTo(x,y);ctx2d.quadraticCurveTo(x+sway*.52,y-h*.62,x+sway,y-h);ctx2d.stroke();
 }
}
function renderGL(t){
 gl.useProgram(program);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
 gl.uniform2f(uni.resolution,width,height);gl.uniform1f(uni.time,t);gl.uniform1f(uni.night,nightMix);
 gl.uniform2f(uni.touch,windTouch.x,windTouch.y);gl.uniform1f(uni.strength,power);
 const count=width<500?3200:width<1100?5100:7600;
 gl.drawArraysInstanced(gl.TRIANGLES,0,3,count);
}
const canRun=()=>!document.hidden&&!reduced.matches&&shell.dataset.page==='home'&&shell.dataset.motionPaused!=='true';
function draw(timestamp){
 frame=0;if(!canRun())return;
 if(timestamp-lastDraw<28){frame=requestAnimationFrame(draw);return}
 lastDraw=timestamp;
 if(!ready)resize();
 if(ready){
  nightMix+=((timeOfDay==='night'?1:0)-nightMix)*.08;
  power*=.92;
  windTouch.x+=(cursor.x-windTouch.x)*.24;windTouch.y+=(cursor.y-windTouch.y)*.24;
  if(mode==='webgl')renderGL(timestamp/1000);else if(mode==='2d')render2d(timestamp/1000);
 }
 frame=requestAnimationFrame(draw);
}
function sync(){
 const enabled=canRun();
 if(enabled&&!frame)frame=requestAnimationFrame(draw);
 if(!enabled&&frame){cancelAnimationFrame(frame);frame=0;}
 const state=enabled?'running':'paused';
 stage.querySelectorAll('.living-cloudsheet,.living-haze,.living-sun,.living-firefly,.living-star').forEach(el=>el.style.animationPlayState=state);
}
function setTime(value){
 timeOfDay=value;shell.dataset.livingTime=value;
 morning.setAttribute('aria-pressed',String(value==='morning'));night.setAttribute('aria-pressed',String(value==='night'));
 hint.textContent=value==='night'?'星光也会陪你慢慢走':'用手指轻拂草地';
 sync();
}
morning.addEventListener('click',()=>setTime('morning'));
night.addEventListener('click',()=>setTime('night'));
let touchCount=0;
const isInteractive=t=>Boolean(t?.closest?.('button,a,input,nav,header,footer,[role="button"]'));
function point(ev){
 if(!canRun()||isInteractive(ev.target))return;
 const b=shell.getBoundingClientRect(),r=paintCanvas.getBoundingClientRect();
 const nx=Math.max(-1,Math.min(1,(ev.clientX-b.left)/(b.width||1)*2-1));
 const ny=Math.max(-1,Math.min(1,(ev.clientY-b.top)/(b.height||1)*2-1));
 shiftX+=(nx*6-shiftX)*.36;shiftY+=(ny*5-shiftY)*.36;
 shell.style.setProperty('--living-shift-x',(-shiftX).toFixed(1)+'px');shell.style.setProperty('--living-shift-y',(-shiftY).toFixed(1)+'px');
 stage.querySelector('.living-cloudsheet').style.setProperty('--living-cloud-x',(-nx*9).toFixed(1)+'px');
 stage.querySelector('.living-cloudsheet').style.setProperty('--living-cloud-y',(-ny*5).toFixed(1)+'px');
 cursor.x=ev.clientX-r.left;cursor.y=ev.clientY-r.top;
 if(ev.clientY>=r.top-60&&ev.clientY<=r.bottom+20){
  if(windTouch.x<-10000){windTouch.x=cursor.x;windTouch.y=cursor.y}
  power=Math.min(1.65,power+.33);
  if(ev.pointerType==='touch'&&touchCount===0)hint.textContent='风经过了你指尖 ♡';
 }
}
shell.addEventListener('pointermove',point,{passive:true});
shell.addEventListener('pointerdown',ev=>{
 point(ev);if(!canRun()||isInteractive(ev.target))return;
 touchCount++;
 const r=shell.getBoundingClientRect(),ripple=document.createElement('span');ripple.className='living-ripple';
 ripple.style.left=(ev.clientX-r.left)+'px';ripple.style.top=(ev.clientY-r.top)+'px';stage.append(ripple);
 ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});setTimeout(()=>ripple.remove(),1400);
},{passive:true});
shell.addEventListener('pointerup',()=>{touchCount=Math.max(0,touchCount-1)},{passive:true});
shell.addEventListener('pointercancel',()=>{touchCount=0},{passive:true});
shell.addEventListener('pointerleave',()=>{power*=.5;cursor={x:-10000,y:-10000}},{passive:true});
new MutationObserver(sync).observe(shell,{attributes:true,attributeFilter:['data-page','data-motion','data-motion-paused','data-view']});
if('ResizeObserver'in window)new ResizeObserver(()=>{ready=false}).observe(shell);
else addEventListener('resize',()=>{ready=false},{passive:true});
document.addEventListener('visibilitychange',sync);
reduced.addEventListener?.('change',sync);
startGraphics();resize();sync();
})();
