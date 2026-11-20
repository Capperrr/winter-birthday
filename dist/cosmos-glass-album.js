(()=>{
 const gallery=document.getElementById('cosmos-gallery'),wall=document.getElementById('cosmos-photo-wall');
 if(!gallery||!wall)return;
 const cards=[...wall.querySelectorAll('.photo-memory')];if(cards.length!==19)return;
 gallery.classList.add('cosmos-constellation-album');
 const toggle=document.createElement('button');toggle.type='button';toggle.className='memory-expand';wall.after(toggle);
 let expanded=false;
 cards.forEach((card,i)=>{
 const frame=card.querySelector('.photo-memory-frame');
 const img=document.createElement('img');img.src='assets/memory-wall/memory-'+String(i+1).padStart(2,'0')+'.webp';img.alt='';img.decoding='async';img.draggable=false;frame.append(img);
 card.style.setProperty('--i',i);
 const row=i<5?0:i<12?1:2, col=i<5?i:i<12?i-5:i-12, count=row===0?5:7;
 const t=col/(count-1)-.5;
 card.style.setProperty('--ex',(50+t*(row===0?61:82))+'%');
 card.style.setProperty('--ey',(18+row*31+Math.abs(t)*16)+'%');
 card.style.setProperty('--cx',(50+Math.sin(i*2.399)*((i%5)+1)*2.9)+'%');
 card.style.setProperty('--cy',(50+Math.cos(i*2.399)*((i%5)+1)*3.3)+'%');
 card.style.setProperty('--cr',((i*17%27)-13)+'deg');
 card.style.setProperty('--er',((i*7%9)-4)*.7+'deg');
 });
 function set(v){expanded=v;wall.dataset.expanded=String(v);toggle.textContent=v?'收拢回忆':'轻触照片，展开回忆';toggle.setAttribute('aria-expanded',String(v));cards.forEach((c,i)=>{c.tabIndex=v||i===18?0:-1})}
 wall.addEventListener('click',e=>{if(!expanded){e.preventDefault();e.stopImmediatePropagation();set(true)}},true);
 toggle.addEventListener('click',()=>set(!expanded));
 document.addEventListener('winter:cosmos-stage',e=>{if(e.detail?.stage==='cosmos-gallery')set(false)});
 set(false);
})();