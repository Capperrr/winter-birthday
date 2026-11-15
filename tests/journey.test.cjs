const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync(require('node:path').join(__dirname,'../dist/journey.js'),'utf8');
const markup=fs.readFileSync(require('node:path').join(__dirname,'../dist/index.html'),'utf8');
function start({active=true,reduced=false,storage={},rejectSave=false,width=600}={}){
 const elements=new Map(),frames=new Map(),observers=[],animations=[];let t=0,nextId=0,focused=null,reads=0;
 class Node{
  constructor(id=''){this.id=id;this.dataset={};this.attributes={};this.handlers={};this.hidden=false;this.open=false;this.value='';this.textContent='';this.disabled=false;this.captured=new Set();this.style={setProperty:(k,v)=>this.style[k]=v};if(id)elements.set(id,this);}
  addEventListener(e,f){(this.handlers[e]||=new Set()).add(f)} removeEventListener(e,f){this.handlers[e]?.delete(f)}
  fire(e,p={}){let event={target:this,preventDefault(){this.prevented=true},...p};for(const f of [...(this.handlers[e]||[])])f(event);return event;}
  setAttribute(k,v){this.attributes[k]=v}removeAttribute(k){delete this.attributes[k]}focus(){focused=this}
  showModal(){this.open=true}close(){this.open=false;this.fire('close')}
  getBoundingClientRect(){reads++;return {left:0,top:0,width,height:400}}
  closest(){return null}
  setPointerCapture(id){this.captured.add(id)}hasPointerCapture(id){return this.captured.has(id)}releasePointerCapture(id){this.captured.delete(id);this.fire('lostpointercapture')}
  animate(keyframes,options){const a={cancelled:false,cancel(){this.cancelled=true}};animations.push(a);return a;}
 }
 for(const m of markup.matchAll(/\bid="([^"]+)"/g))new Node(m[1]);
 const shell=elements.get('main'),page=elements.get('journey-page');shell.dataset.destination=active?'journey':'letter';shell.dataset.motion='on';
 const stops=Array.from({length:5},(_,i)=>{const n=new Node();n.dataset.journeyStop=String(i);return n});
 const spots=['tianfu','luofu'].map(key=>{const n=new Node();n.dataset.journeySpot=key;return n});
 const photos=['dazhou','chongqing','southampton','together'].map(key=>{const n=new Node();n.dataset.photoKey=key;n.img=new Node();n.img.complete=true;n.img.naturalWidth=1800;n.querySelector=()=>n.img;return n});
 page.querySelectorAll=s=>({'[data-journey-stop]':stops,'[data-journey-spot]':spots,'[data-photo-key]':photos})[s];
 const document=new Node(),window=new Node(),media=new Node();document.hidden=false;document.getElementById=id=>{assert.ok(elements.has(id),id);return elements.get(id)};media.matches=reduced;window.matchMedia=()=>media;
 const localStorage={getItem:k=>storage[k]||null,setItem:(k,v)=>{if(rejectSave)throw Error('blocked');storage[k]=v}};
 const MutationObserver=class{constructor(fn){this.fn=fn;observers.push(this)}observe(){}disconnect(){this.disconnected=true}};
 vm.runInNewContext(code,{document,window,localStorage,MutationObserver,requestAnimationFrame(fn){const id=nextId++;frames.set(id,fn);return id},cancelAnimationFrame:id=>frames.delete(id)});
 function animate(count=1,step=16){for(let i=0;i<count;i++){t+=step;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(t));assert.ok(frames.size<=1,'At most one pending gesture/spring frame')}}
 const el=id=>elements.get(id);
 return {el,page,shell,document,window,media,frames,stops,spots,photos,storage,observers,animations,animate,focused:()=>focused,reads:()=>reads,activate:value=>document.fire('winter:journey-route',{detail:{active:value}})};
}
const a=start();assert.equal(a.el('journey-place-title').textContent,'从你熟悉的街区开始');assert.equal(a.el('journey-previous').disabled,true);assert.equal(a.el('journey-nearby').hidden,false);
a.el('journey-next').fire('click');assert.equal(a.el('journey-place-title').textContent,'新达一中');assert.equal(a.frames.size,1);a.animate(150);assert.equal(a.frames.size,0);assert.equal(a.el('journey-position').value,'100');
a.stops[2].fire('click');a.animate(2);a.stops[3].fire('click');a.animate(160);assert.equal(a.el('journey-place-title').textContent,'南安普顿大学');assert.ok(a.el('journey-fact').textContent.includes('7.5'));assert.equal(a.photos[2].dataset.active,'true');assert.equal(a.el('journey-position').value,'300');
let key=a.el('journey-position').fire('keydown',{key:'End'});assert.ok(key.prevented);a.animate(150);assert.equal(a.el('journey-place-title').textContent,'启德');assert.equal(a.el('journey-next').disabled,true);assert.equal(a.el('journey-position').value,'400');
a.el('journey-position').fire('keydown',{key:'Home'});a.animate(150);a.el('journey-position').value='248';a.el('journey-position').fire('input');assert.equal(a.el('journey-place-title').textContent,'重庆工商大学');a.el('journey-position').fire('change');a.animate(150);assert.equal(a.el('journey-position').value,'200');
a.stops[0].fire('click');a.animate(150);a.el('journey-write').fire('click');assert.equal(a.el('journey-note-dialog').open,true);assert.equal(a.el('journey-note-title').textContent,'天府新城');
a.el('journey-note-input').value='<img src=x onerror=oops> 这是我的日常。';a.el('journey-note-input').fire('input');a.el('journey-note-form').fire('submit');assert.equal(a.el('journey-note-dialog').open,false);assert.equal(a.focused(),a.el('journey-write'));assert.ok(a.el('journey-saved-preview').textContent.includes('<img'));
a.spots[1].fire('click');assert.ok(a.el('journey-question').textContent.includes('罗浮广场'));a.el('journey-write').fire('click');assert.equal(a.el('journey-note-input').value,'');a.el('journey-note-input').value='罗浮广场的小事';a.el('journey-note-form').fire('submit');
const saved=JSON.parse(a.storage['winter-journey-notes-v1']);assert.equal(saved['dazhou-luofu'],'罗浮广场的小事');assert.ok(saved['dazhou-tianfu'].includes('<img'));assert.equal(a.storage['winter-about-notes-v1'],undefined);
const b=start({storage:a.storage});b.el('journey-write').fire('click');assert.ok(b.el('journey-note-input').value.includes('<img'));b.el('journey-note-input').value='';b.el('journey-note-form').fire('submit');assert.equal(b.el('journey-saved-preview').hidden,true);assert.equal(JSON.parse(b.storage['winter-journey-notes-v1'])['dazhou-luofu'],'罗浮广场的小事');
b.el('journey-credits-open').fire('click');assert.equal(b.el('journey-credit-dialog').open,true);const title=b.el('journey-place-title').textContent;b.stops[3].fire('click');assert.equal(b.el('journey-place-title').textContent,title);b.el('journey-credit-dialog').fire('cancel');assert.equal(b.el('journey-credit-dialog').open,false);
for(const pointerType of ['mouse','touch','pen']){
 const c=start();c.el('journey-frame').fire('pointerdown',{pointerId:4,pointerType,button:0,isPrimary:true,clientX:250,clientY:100});const before=c.reads();
 c.window.fire('pointermove',{pointerId:4,pointerType,clientX:100,clientY:108});c.animate(1);assert.equal(c.reads(),before,'No pointer-move layout reads');c.window.fire('pointerup',{pointerId:4,pointerType,clientX:100,clientY:108});c.animate(150);assert.equal(c.el('journey-place-title').textContent,'新达一中');assert.equal(c.el('journey-frame').captured.size,0);
}
const vertical=start();vertical.el('journey-frame').fire('pointerdown',{pointerId:1,clientX:200,clientY:100});vertical.window.fire('pointermove',{pointerId:1,clientX:210,clientY:170});vertical.window.fire('pointerup',{pointerId:1,clientX:210,clientY:170});assert.equal(vertical.el('journey-place-title').textContent,'从你熟悉的街区开始');assert.equal(vertical.frames.size,0);
const cancel=start();cancel.el('journey-frame').fire('pointerdown',{pointerId:1,clientX:200,clientY:100});cancel.window.fire('pointermove',{pointerId:1,clientX:120,clientY:105});cancel.window.fire('pointercancel',{pointerId:1});assert.equal(cancel.frames.size,0);assert.equal(cancel.el('journey-frame').captured.size,0);
const reduced=start({reduced:true});reduced.stops[4].fire('click');assert.equal(reduced.frames.size,0);assert.equal(reduced.el('journey-position').value,'400');assert.equal(reduced.animations.length,0);
const blocked=start({rejectSave:true});blocked.el('journey-write').fire('click');blocked.el('journey-note-input').value='临时的话';blocked.el('journey-note-form').fire('submit');assert.equal(blocked.el('journey-note-dialog').open,true);assert.ok(blocked.el('journey-note-feedback').textContent.includes('无法保存'));blocked.el('journey-note-close').fire('click');assert.equal(blocked.el('journey-saved-preview').hidden,false);
const off=start({active:false});off.stops[2].fire('click');assert.equal(off.frames.size,0);off.activate(true);off.stops[2].fire('click');off.animate(2);off.activate(false);assert.equal(off.frames.size,0);off.stops[4].fire('click');off.activate(true);assert.equal(off.el('journey-place-title').textContent,'重庆工商大学');
off.el('journey-write').fire('click');off.activate(false);assert.equal(off.el('journey-note-dialog').open,false);off.activate(true);off.stops[4].fire('click');off.document.hidden=true;off.document.fire('visibilitychange');assert.equal(off.frames.size,0);off.document.hidden=false;off.stops[3].fire('click');off.shell.dataset.motion='off';off.observers[0].fn();assert.equal(off.frames.size,0);assert.equal(off.el('journey-position').value,'300');
off.photos[2].img.fire('error');assert.equal(off.el('journey-photo-fallback').hidden,false);off.photos[2].img.fire('load');assert.equal(off.el('journey-photo-fallback').hidden,true);
const corrupt=start({storage:{'winter-journey-notes-v1':'{badJSON'}});corrupt.el('journey-write').fire('click');assert.equal(corrupt.el('journey-note-input').value,'');corrupt.el('journey-note-close').fire('click');
a.window.fire('pagehide',{persisted:true});a.window.fire('pageshow');assert.equal(a.frames.size,0);a.window.fire('pagehide',{persisted:false});assert.ok(a.observers.every(o=>o.disconnected));assert.ok([...a.el('journey-next').handlers.click].length===0);
console.log('PASS: Five chronological stops and all six places; interrupted settling; native slider/keyboard; mouse/touch/pen swipes; independent local notes and literal text; blocked/corrupt storage; modal guards, image fallback, route/visibility/preferences/BFCache cleanup. DOM logic, not browser rendering.');
