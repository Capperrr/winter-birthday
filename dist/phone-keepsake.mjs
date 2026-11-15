import {CaptureFlow,fitCapture} from './phone-capture.mjs';

const el=id=>document.getElementById(id),dialog=el('phone-keepsake'),flow=new CaptureFlow();
if(dialog){
  const shell=el('main'),phone=el('keepsake-phone'),preview=el('phone-preview'),wallpaper=el('phone-wallpaper');
  let library=null,timers=new Set(),lastFocus=null,disposed=false;
  const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;};
  function clearTimers(){for(const id of timers)clearTimeout(id);timers.clear();}
  function loadCapture(){if(window.html2canvas)return Promise.resolve(window.html2canvas);if(library)return library;library=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/html2canvas.min.js';script.onload=()=>window.html2canvas?resolve(window.html2canvas):reject(new Error('页面拍照组件没有载入'));script.onerror=()=>{library=null;script.remove();reject(new Error('拍照组件加载失败，请重试。'));};document.head.appendChild(script);});return library;}
  async function capture(){
    const target=el('finale-snapshot');if(shell.dataset.destination!=='finale'||el('finale-newspaper').dataset.joined!=='true')throw new Error('先把我们的照片拼在一起。');
    const html2canvas=await loadCapture();
    await Promise.all([...target.querySelectorAll('img')].map(img=>img.decode?.().catch(()=>{})));
    const raw=await html2canvas(target,{backgroundColor:'#f1e9dd',scale:Math.min(2,window.devicePixelRatio||1.5),useCORS:true,allowTaint:false,logging:false,imageTimeout:12000,ignoreElements:node=>node.hasAttribute?.('data-capture-ignore'),onclone:copy=>{const snapshot=copy.getElementById('finale-snapshot');snapshot?.querySelectorAll('*').forEach(node=>{node.style.animation='none';node.style.transition='none';});for(let node=snapshot?.parentElement;node&&node!==copy.body;node=node.parentElement)node.style.overflow='visible';}});
    const canvas=document.createElement('canvas');canvas.width=1179;canvas.height=2556;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('当前浏览器暂时无法拍照，请重试。');
    ctx.fillStyle='#f1e9dd';ctx.fillRect(0,0,canvas.width,canvas.height);const frame=fitCapture(raw.width,raw.height,canvas.width,canvas.height);ctx.drawImage(raw,frame.x,frame.y,frame.width,frame.height);
    return canvas.toDataURL('image/png');
  }
  function sync(){phone.dataset.phase=flow.phase;el('phone-shutter').disabled=flow.phase!=='camera';el('phone-error').hidden=flow.phase!=='error';el('phone-capture-status').textContent=flow.phase==='loading'?'正在对焦到刚刚拼好的这一页…':flow.phase==='camera'?'照片已经对好焦，按下快门，把这一刻留下。':flow.phase==='locked'?'12 月 15 日，00:00。你收到一条来自 Gwen 的消息。':'这次没有拍到照片，可以再试一次。';el('phone-error-text').textContent=flow.error?.message||'';el('phone-download').hidden=flow.phase!=='locked';el('phone-next').hidden=flow.phase!=='locked';el('phone-retake').hidden=flow.phase!=='locked';}
  async function open(){if(disposed||shell.dataset.destination!=='finale')return;clearTimers();lastFocus=document.activeElement;phone.classList.remove('has-message','is-flashing');if(!dialog.open)dialog.showModal();const operation=flow.prepare(capture);sync();const ok=await operation;if(disposed||!dialog.open)return;if(ok){preview.src=flow.image;wallpaper.src=flow.image;}sync();if(ok)el('phone-shutter').focus({preventScroll:true});}
  function close(reset=false){clearTimers();if(dialog.open)dialog.close();if(reset){flow.reset();preview.removeAttribute('src');wallpaper.removeAttribute('src');sync();}lastFocus?.focus?.({preventScroll:true});}
  async function shutter(){if(flow.phase!=='camera')return;const operation=flow.prepare(capture);sync();el('phone-capture-status').textContent='快门按下，正在留下这一刻…';const ok=await operation;if(!ok||!dialog.open){sync();return;}preview.src=flow.image;wallpaper.src=flow.image;if(!flow.shutter())return;const quiet=matchMedia('(prefers-reduced-motion: reduce)').matches||shell.dataset.motion==='off';if(!quiet){phone.classList.add('is-flashing');later(()=>phone.classList.remove('is-flashing'),220);}navigator.vibrate?.(12);sync();later(()=>{if(!dialog.open||flow.phase!=='locked')return;phone.classList.add('has-message');el('phone-next').focus({preventScroll:true});},quiet?0:900);el('finale-phone-again').hidden=false;}
  el('phone-shutter').addEventListener('click',shutter);el('phone-retake').addEventListener('click',open);el('phone-retry').addEventListener('click',open);el('phone-close').addEventListener('click',()=>close());el('phone-next').addEventListener('click',()=>close());el('finale-phone-again').addEventListener('click',open);
  el('phone-download').addEventListener('click',()=>{if(flow.phase!=='locked'||!flow.image)return;const link=document.createElement('a');link.href=flow.image;link.download='WINTER-12-15-00-00.png';document.body.appendChild(link);link.click();link.remove();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  document.addEventListener('winter:finale-finished',open);document.addEventListener('winter:finale-reset',()=>close(true));
  const observer=new MutationObserver(()=>{if(shell.dataset.destination!=='finale')close(true);});observer.observe(shell,{attributes:true,attributeFilter:['data-destination']});
  window.addEventListener('pagehide',event=>{close(true);if(!event.persisted){disposed=true;observer.disconnect();}});
}
