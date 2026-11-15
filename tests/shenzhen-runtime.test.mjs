import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld} from '../dist/shenzhen/world.mjs';
import {startGame} from '../dist/shenzhen/game.mjs';
import {SAVE_KEY,ShenzhenGame} from '../dist/shenzhen/game-core.mjs';
// Real scene/camera/core/input with a no-GPU renderer and a minimal DOM adapter.
// This catches controller/initialization failures; it is explicitly not browser QA.
const world=createWorld(),html=fs.readFileSync(new URL('../dist/shenzhen/index.html',import.meta.url),'utf8');
const nodes=new Map(),frames=new Map();let id=0,time=0,draws=0,rendererDisposed=false;
class Node {
 constructor(name=''){this.name=name;this.events={};this.dataset={};this.style={};this.hidden=false;this.open=false;this.textContent='';this.disabled=false;this.checked=false;this.value='auto';this.clientWidth=1024;this.clientHeight=768;this.width=1024;this.height=768;this.children=[];this.captured=new Set();if(name)nodes.set(name,this)}
 addEventListener(e,f){(this.events[e]||=new Set()).add(f)}removeEventListener(e,f){this.events[e]?.delete(f)}
 async fire(type,props={}){for(const f of [...(this.events[type]||[])])await f({type,target:this,preventDefault(){},...props})}
 setAttribute(k,v){this[k]=v}removeAttribute(k){delete this[k]}matches(){return false}focus(){}
 replaceChildren(){this.children=[]}appendChild(n){this.children.push(n)}showModal(){this.open=true}close(){this.open=false}
 getBoundingClientRect(){return{left:0,top:0,width:this.clientWidth,height:this.clientHeight}}
 setPointerCapture(id){this.captured.add(id)}hasPointerCapture(id){return this.captured.has(id)}releasePointerCapture(id){this.captured.delete(id)}
}
for(const m of html.matchAll(/\bid="([^"]+)"/g))new Node(m[1]);
const stages=['street','lobby','elevator','corridor'].map(stage=>{const n=new Node();n.dataset.stage=stage;return n});
const doc=new Node(),win=new Node();doc.hidden=false;doc.getElementById=name=>{assert.ok(nodes.has(name),name);return nodes.get(name)};doc.querySelectorAll=()=>stages;doc.createElement=()=>new Node();win.matchMedia=()=>({matches:false});win.devicePixelRatio=2;
const storage={'winter-about-notes-v1':'{"1":"original birthday note"}','winter-journey-notes-v1':'{"school":"original journey note"}'};
globalThis.document=doc;globalThis.window=win;globalThis.localStorage={getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v,removeItem:k=>delete storage[k]};globalThis.location={reload(){}};
globalThis.requestAnimationFrame=callback=>{const n=id++;frames.set(n,callback);return n};globalThis.cancelAnimationFrame=n=>frames.delete(n);
const renderer={shadowMap:{},info:{render:{calls:190,triangles:20000}},setPixelRatio(){},setSize(){},render(){draws++},dispose(){rendererDisposed=true}};
const app=await startGame({rendererFactory:()=>renderer,worldFactory:()=>world});
assert.equal(nodes.get('start-button').disabled,false);assert.ok(draws>0);assert.equal(win.shenzhenDiagnostics().ready,true);
await nodes.get('start-button').fire('click');assert.equal(win.shenzhenDiagnostics().playing,true);assert.equal(frames.size,1);
async function tick(count){for(let i=0;i<count;i++){time+=16;const f=[...frames.values()];frames.clear();for(const cb of f)cb(time);assert.ok(frames.size<=1)}}
await win.fire('keydown',{code:'KeyW'});await tick(60);await win.fire('keyup',{code:'KeyW'});assert.ok(win.shenzhenDiagnostics().position.z<13.2);assert.equal(win.shenzhenDiagnostics().flags.signRead,false);
await nodes.get('pause-button').fire('click');assert.equal(frames.size,0);assert.equal(nodes.get('pause-dialog').open,true);assert.ok(storage[SAVE_KEY]);
await nodes.get('resume-button').fire('click');assert.equal(frames.size,1);await tick(5);
await nodes.get('help-button').fire('click');assert.equal(frames.size,0);await nodes.get('help-close').fire('click');assert.equal(frames.size,1);
await nodes.get('world').fire('webglcontextlost');assert.equal(frames.size,0);assert.equal(nodes.get('resume-button').disabled,true);await nodes.get('world').fire('webglcontextrestored');assert.equal(nodes.get('resume-button').disabled,false);await nodes.get('resume-button').fire('click');await tick(5);
doc.hidden=true;await doc.fire('visibilitychange');assert.equal(frames.size,0);assert.equal(win.shenzhenDiagnostics().paused,true);
assert.equal(storage['winter-about-notes-v1'],'{"1":"original birthday note"}');assert.equal(storage['winter-journey-notes-v1'],'{"school":"original journey note"}');
const restored=new ShenzhenGame(JSON.parse(storage[SAVE_KEY]));assert.ok(restored.player.z<13.2);
await win.fire('pagehide',{persisted:false});assert.equal(frames.size,0);assert.equal(rendererDisposed,true);assert.equal([...nodes.get('world').events.pointerdown].length,0);
delete globalThis.document;delete globalThis.window;delete globalThis.localStorage;delete globalThis.location;delete globalThis.requestAnimationFrame;delete globalThis.cancelAnimationFrame;
console.log('PASS: Runtime wiring with real scene/core/camera and no-GPU renderer; movement, pause/help, context restore, save isolation and teardown. NOT actual WebGL/browser validation.');
