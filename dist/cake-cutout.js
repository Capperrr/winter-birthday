/* Pre-rendered native-resolution layers. Browser work is two alpha draws, never pixel differencing. */
(()=>{
 'use strict';
 const shell=document.getElementById('main'),stage=document.getElementById('cake-page'),plane=document.getElementById('cake-art-slot');
 if(!shell||!stage||!plane)return;
 const canvas=document.createElement('canvas');canvas.className='grand-cake-cutout';canvas.setAttribute('aria-hidden','true');
 const photo=plane.querySelector('.grand-cake-photograph');plane.insertBefore(canvas,photo?.nextSibling||plane.firstChild);
 const ctx=canvas.getContext('2d',{alpha:true});
 const portrait=matchMedia('(max-width:760px), (max-aspect-ratio:4/5)');
 const cache=new Map();let current='',generation=0;
 function load(path){return new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Birthday layer could not load: '+path));image.src=path;});}
 function layers(key){
  if(!cache.has(key))cache.set(key,Promise.all([load('assets/birthday-render/stone-'+key+'.webp'),load('assets/birthday-render/cake-'+key+'.webp')]).catch(error=>{cache.delete(key);throw error}));
  return cache.get(key);
 }
 async function prepare(){
  const key=portrait.matches?'portrait':'wide';if(current===key)return;
  const token=++generation;shell.dataset.cakeCutout='loading';
  try{
   const [stone,cake]=await layers(key);if(token!==generation)return;
   canvas.width=cake.naturalWidth;canvas.height=cake.naturalHeight;
   ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(stone,0,0,canvas.width,canvas.height);
   ctx.drawImage(cake,Math.round(canvas.width*(key==='portrait'?.21:.22)),0);
   current=key;shell.dataset.cakeCutout='ready';
  }catch(error){if(token!==generation)return;shell.dataset.cakeCutout='failed';console.warn(error);}
 }
 document.addEventListener('winter:camera-ready',()=>{if(shell.dataset.destination==='cake')prepare()});
 document.addEventListener('winter:celebration-route',e=>{if(e.detail?.active)prepare()});
 portrait.addEventListener('change',()=>{generation++;current='';shell.dataset.cakeCutout='loading';if(shell.dataset.destination==='cake')prepare()});
 if(shell.dataset.destination==='cake')prepare();
})();
