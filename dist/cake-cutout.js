/* WINTER: scene-matched foreground extraction.
   Uses the birthday scene and the same scene without the cake, not a rough radial mask.
   Rendering stays entirely in the visitor's browser and works offline once assets load. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const shell=$('main'),stage=$('cake-page'),plane=$('cake-art-slot');
if(!shell||!stage||!plane)return;
const canvas=document.createElement('canvas');
canvas.className='grand-cake-cutout';canvas.setAttribute('aria-hidden','true');
const photograph=plane.querySelector('.grand-cake-photograph');
plane.insertBefore(canvas,photograph?.nextSibling||plane.firstChild);
const ctx=canvas.getContext('2d',{alpha:true,willReadFrequently:true});
let current='',generation=0;
const portrait=matchMedia('(max-width:760px), (max-aspect-ratio:4/5)');
const sources={
 landscape:{scene:'assets/cinematic-cake-scene.webp',empty:'assets/cinematic-cake-empty.webp',w:768,h:512},
 portrait:{scene:'assets/cinematic-cake-scene-portrait.webp',empty:'assets/cinematic-cake-empty-portrait.webp',w:512,h:768}
};
function load(src){
 return new Promise((resolve,reject)=>{const im=new Image();im.decoding='async';im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});
}
function imagePixels(image,w,h){
 const c=document.createElement('canvas');c.width=w;c.height=h;
 const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,0,0,w,h);
 return x.getImageData(0,0,w,h);
}
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
async function prepare(){
 const key=portrait.matches?'portrait':'landscape';
 if(current===key && canvas.width) return;
 const gen=++generation,config=sources[key];
 try{
  const [photo,empty]=await Promise.all([load(config.scene),load(config.empty)]);
  if(gen!==generation)return;
  const {w,h}=config,front=imagePixels(photo,w,h),back=imagePixels(empty,w,h);
  const data=front.data,old=back.data;
  // A low-level photographic difference traces the cake, flowers and pedestal
  // without turning the lake or dark mountain silhouettes into a rectangular frame.
  const raw=new Uint8Array(w*h);
  const x0=Math.floor(w*(key==='portrait'?.29:.34));
  const x1=Math.ceil(w*(key==='portrait'?.71:.65));
  const y0=Math.floor(h*(key==='portrait'?.28:.11));
  const y1=Math.ceil(h*(key==='portrait'?.84:.83));
  for(let y=y0;y<y1;y++){
   for(let x=x0;x<x1;x++){
    const i=y*w+x,k=i*4;
    const diff=(Math.abs(data[k]-old[k])+Math.abs(data[k+1]-old[k+1])+Math.abs(data[k+2]-old[k+2]))/3;
    // Reject minor colour/compression shifts from unchanged background.
    if(diff>26)raw[i]=255;
   }
  }
  // Fill tiny gaps within a real foreground contour, then soften only its silhouette.
  const grown=new Uint8Array(w*h);
  for(let y=y0+2;y<y1-2;y++){
   for(let x=x0+2;x<x1-2;x++){
    let hit=0;
    for(let dy=-2;dy<=2;dy+=2){
      for(let dx=-2;dx<=2;dx+=2){if(raw[(y+dy)*w+x+dx]){hit++;}}
    }
    grown[y*w+x]=hit>=3?255:0;
   }
  }
  // Draw a continuous, horizontal slab from the source stone texture.
  // Sample the lower part of the picture to avoid retaining the lake or the
  // cake in its old centred position over the live camera.
  canvas.width=w;canvas.height=h;ctx.clearRect(0,0,w,h);
  const stoneStart=key==='portrait'?.82:.81;
  const stoneSourceY=Math.floor(h*.905);
  const rock=document.createElement('canvas');rock.width=w;rock.height=h;
  const rx=rock.getContext('2d',{alpha:true});
  rx.drawImage(photo,0,stoneSourceY,w,h-stoneSourceY,0,Math.floor(h*stoneStart),w,Math.ceil(h*(1-stoneStart)));
  rx.globalCompositeOperation='destination-in';
  const fade=rx.createLinearGradient(0,h*stoneStart,0,h*(stoneStart+.04));
  fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(1,'rgba(0,0,0,1)');
  rx.fillStyle=fade;rx.fillRect(0,Math.floor(h*stoneStart),w,h-Math.floor(h*stoneStart));
  rx.globalCompositeOperation='source-over';
  ctx.drawImage(rock,0,0);

  // Move the transparent cake layer to the far right, independently of the slab.
  const alpha=new Uint8ClampedArray(w*h);
  for(let y=y0;y<Math.min(y1,Math.round(h*stoneStart));y++){
   for(let x=x0;x<x1;x++){const i=y*w+x;alpha[i]=grown[i];}
  }
  const mask=document.createElement('canvas');mask.width=w;mask.height=h;
  const mx=mask.getContext('2d',{willReadFrequently:true});
  const m=mx.createImageData(w,h);
  for(let i=0;i<alpha.length;i++){const j=i*4;m.data[j]=m.data[j+1]=m.data[j+2]=255;m.data[j+3]=alpha[i];}
  mx.putImageData(m,0,0);
  const cake=document.createElement('canvas');cake.width=w;cake.height=h;
  const cx=cake.getContext('2d',{alpha:true});
  cx.filter='blur(.85px)';cx.drawImage(mask,0,0);cx.filter='none';
  cx.globalCompositeOperation='source-in';cx.drawImage(photo,0,0,w,h);
  const cakeShift=Math.round(w*(key==='portrait'?.21:.22));
  ctx.drawImage(cake,cakeShift,0);
  current=key;shell.dataset.cakeCutout='ready';
 }catch(err){
  shell.dataset.cakeCutout='failed';
  console.warn('WINTER cake foreground could not be prepared:',err);
 }
}
document.addEventListener('winter:camera-ready',()=>{if(shell.dataset.destination==='cake')prepare();});
document.addEventListener('winter:celebration-route',e=>{if(e.detail?.active && window.WINTER_GESTURES?.active)prepare()});
portrait.addEventListener('change',()=>{generation++;current='';canvas.width=1;canvas.height=1;shell.dataset.cakeCutout='loading';if(shell.dataset.cakeCamera==='on')prepare();});
})();
