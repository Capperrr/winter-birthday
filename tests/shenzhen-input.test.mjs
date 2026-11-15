import assert from 'node:assert/strict';
import {InputController} from '../dist/shenzhen/input.mjs';
class Element {
  constructor(){this.events={};this.captured=new Set();this.style={};this.hidden=false;this.reads=0;}
  addEventListener(e,f){(this.events[e]||=new Set()).add(f)}removeEventListener(e,f){this.events[e]?.delete(f)}
  fire(type,props={}){for(const f of [...(this.events[type]||[])])f({type,target:this,preventDefault(){},...props})}
  getBoundingClientRect(){this.reads++;return{left:0,top:0,width:118,height:118}}
  matches(){return false}setPointerCapture(id){this.captured.add(id)}hasPointerCapture(id){return this.captured.has(id)}releasePointerCapture(id){this.captured.delete(id);this.fire('lostpointercapture',{pointerId:id})}
}
const canvas=new Element(),stick=new Element(),knob=new Element(),carry=new Element(),win=new Element();let look=0,interactions=0,drops=0,cancels=0;
const input=new InputController({canvas,stick,knob,carry,windowTarget:win,onInteract:()=>interactions++,onLook:()=>look++,onDrop:()=>drops++,onCancel:()=>cancels++,onPause:()=>{}});input.enabled=true;
stick.fire('pointerdown',{pointerId:1,clientX:59,clientY:22,isPrimary:true,pointerType:'touch'});
assert.ok(input.movement().forward>.9);
canvas.fire('pointerdown',{pointerId:2,clientX:400,clientY:200,isPrimary:false,button:0,pointerType:'touch'});
canvas.fire('pointermove',{pointerId:2,clientX:440,clientY:202,isPrimary:false,pointerType:'touch'});
assert.equal(look,1,'Secondary touch can look while primary thumb moves');assert.ok(input.movement().forward>.9);
canvas.fire('pointerup',{pointerId:2,clientX:440,clientY:202});assert.equal(interactions,0,'Look drag does not accidentally interact');
stick.fire('pointerup',{pointerId:1});assert.equal(input.movement().forward,0);assert.equal(stick.captured.size,0);
canvas.fire('pointerdown',{pointerId:3,clientX:200,clientY:100,button:0});canvas.fire('pointerup',{pointerId:3,clientX:200,clientY:100});assert.equal(interactions,1);
carry.fire('pointerdown',{pointerId:4,clientX:60,clientY:70});const reads=canvas.reads;carry.fire('pointermove',{pointerId:4,clientX:90,clientY:90});assert.equal(canvas.reads,reads,'Carry move uses cached bounds');assert.equal(input.hand.dragging,true);carry.fire('pointerup',{pointerId:4,clientX:90,clientY:90});assert.equal(drops,1);assert.equal(input.hand.dragging,false);
carry.fire('pointerdown',{pointerId:5,clientX:60,clientY:70});carry.fire('pointercancel',{pointerId:5});assert.equal(drops,1);assert.equal(carry.captured.size,0);
win.fire('keydown',{code:'KeyW'});assert.equal(input.movement().forward,1);win.fire('keyup',{code:'KeyW'});assert.equal(input.movement().forward,0);win.fire('keydown',{code:'KeyE',repeat:false});assert.equal(interactions,2);win.fire('keydown',{code:'Escape'});assert.equal(cancels,1);
stick.fire('pointerdown',{pointerId:6,clientX:59,clientY:20});win.fire('blur');assert.equal(input.movement().forward,0);assert.equal(stick.captured.size,0);
input.destroy();assert.equal([...canvas.events.pointerdown].length,0);
console.log('PASS: Simulated dual-touch movement/look, keyboard action, pointer-follow/drop/cancel and reset cleanup. NOT a real iPad/browser test.');
