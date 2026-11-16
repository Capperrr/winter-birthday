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
  // A small, separate stone slab crop anchors the cake; the lake and mountains are gone.
  const alpha=new Uint8ClampedArray(w*h);
  for(let y=0;y<h;y++){
   const yn=y/h;
   for(let x=0;x<w;x++){
    const xn=x/w,i=y*w+x;
    const edge=(x>x0+2&&x<x1-2&&y>y0+2&&y<y1-2)?grown[i]:0;
    // Stone tabletop: a narrow grounded foreground, not an opaque old landscape.
    const slabStart=key==='portrait'?.82:.83;
    const slab=smooth(slabStart,slabStart+.016,yn)*
       (1-smooth(key==='portrait'?.87:.9,key==='portrait'?.91:.94,Math.abs(xn-.5)*2));
    alpha[i]=Math.max(edge,Math.round(slab*255));
   }
  }
  // Blur only 2px of edge pixels, keeping centre opaque and the cutout sharp.
  const mask=document.createElement('canvas');mask.width=w;mask.height=h;
  const mx=mask.getContext('2d',{willReadFrequently:true});
  const m=mx.createImageData(w,h);
  for(let i=0;i<alpha.length;i++){const j=i*4;m.data[j]=m.data[j+1]=m.data[j+2]=255;m.data[j+3]=alpha[i];}
  mx.putImageData(m,0,0);
  // Light antialiasing at the very edge via a blurred alpha overlay; no huge feathered halo.
  const sm=document.createElement('canvas');sm.width=w;sm.height=h;
  const sx=sm.getContext('2d');sx.filter='blur(1.2px)';sx.drawImage(mask,0,0);
  sx.globalCompositeOperation='source-in';sx.filter='none';sx.drawImage(photo,0,0,w,h);
  canvas.width=w;canvas.height=h;ctx.clearRect(0,0,w,h);ctx.drawImage(sm,0,0);
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
