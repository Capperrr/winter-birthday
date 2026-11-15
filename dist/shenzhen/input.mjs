export class InputController {
  constructor({canvas,stick,knob,carry,onInteract,onLook,onDrop,onCancel,onPause,windowTarget=window}) {
    this.canvas=canvas;this.stick=stick;this.knob=knob;this.carry=carry;this.onInteract=onInteract;this.onLook=onLook;this.onDrop=onDrop;this.onCancel=onCancel;this.onPause=onPause;
    this.keys=new Set();this.axis={x:0,y:0};this.look=null;this.joy=null;this.drag=null;this.hand={x:.22,y:-.22,dragging:false};this.enabled=false;this.removers=[];
    const listen=(t,e,f,o)=>{t.addEventListener(e,f,o);this.removers.push(()=>t.removeEventListener(e,f,o));};
    listen(windowTarget,'keydown',e=>{
      if(!this.enabled||e.target?.matches?.('input,textarea,select'))return;
      if(e.code==='Escape'){e.preventDefault();this.onCancel();return;}
      if(e.code==='KeyE'){e.preventDefault();if(!e.repeat)this.onInteract();return;}
      if(e.code==='KeyP'){e.preventDefault();this.onPause();return;}
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}
    });
    listen(windowTarget,'keyup',e=>this.keys.delete(e.code));
    listen(windowTarget,'blur',()=>this.reset());
    listen(stick,'pointerdown',e=>{
      if(!this.enabled||this.joy)return;e.preventDefault();const r=stick.getBoundingClientRect();
      this.joy={id:e.pointerId,x:r.left+r.width/2,y:r.top+r.height/2,radius:r.width*.30};stick.setPointerCapture?.(e.pointerId);this.updateStick(e);
    });
    listen(stick,'pointermove',e=>{if(this.joy?.id===e.pointerId)this.updateStick(e);});
    const endStick=e=>{if(this.joy?.id!==e.pointerId)return;const id=this.joy.id;this.joy=null;this.axis={x:0,y:0};knob.style.transform='translate(0px,0px)';try{if(stick.hasPointerCapture?.(id))stick.releasePointerCapture(id);}catch(_){}};
    listen(stick,'pointerup',endStick);listen(stick,'pointercancel',endStick);listen(stick,'lostpointercapture',endStick);
    listen(canvas,'pointerdown',e=>{
      if(!this.enabled||this.look||e.button>0)return;
      this.look={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false};canvas.setPointerCapture?.(e.pointerId);
    });
    listen(canvas,'pointermove',e=>{
      if(!this.enabled||this.look?.id!==e.pointerId)return;
      const p=this.look,dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
      if(Math.hypot(e.clientX-p.sx,e.clientY-p.sy)>5)p.moved=true;
      if(p.moved)this.onLook(dx,dy);
    });
    const endLook=e=>{
      if(this.look?.id!==e.pointerId)return;const p=this.look;this.look=null;
      try{if(canvas.hasPointerCapture?.(p.id))canvas.releasePointerCapture(p.id);}catch(_){}
      if(this.enabled&&!p.moved&&e.type!=='pointercancel')this.onInteract({x:e.clientX,y:e.clientY});
    };
    listen(canvas,'pointerup',endLook);listen(canvas,'pointercancel',endLook);listen(canvas,'lostpointercapture',e=>{if(this.look?.id===e.pointerId)this.look=null;});
    listen(carry,'pointerdown',e=>{
      if(!this.enabled||carry.hidden||this.drag)return;e.preventDefault();this.drag={id:e.pointerId,rect:canvas.getBoundingClientRect()};this.hand.dragging=true;carry.setPointerCapture?.(e.pointerId);this.moveHand(e);
    });
    listen(carry,'pointermove',e=>{if(this.drag?.id===e.pointerId)this.moveHand(e);});
    const endDrag=e=>{
      if(this.drag?.id!==e.pointerId)return;const id=this.drag.id;this.drag=null;this.hand.dragging=false;
      try{if(carry.hasPointerCapture?.(id))carry.releasePointerCapture(id);}catch(_){}
      if(this.enabled&&e.type!=='pointercancel')this.onDrop({x:e.clientX,y:e.clientY});
      this.hand.x=.22;this.hand.y=-.22;
    };
    listen(carry,'pointerup',endDrag);listen(carry,'pointercancel',endDrag);listen(carry,'lostpointercapture',e=>{if(this.drag?.id===e.pointerId){this.drag=null;this.hand={x:.22,y:-.22,dragging:false};}});
  }
  updateStick(e) {const j=this.joy;let x=(e.clientX-j.x)/j.radius,y=(e.clientY-j.y)/j.radius;const n=Math.hypot(x,y);if(n>1){x/=n;y/=n;}this.axis={x,y};this.knob.style.transform=`translate(${x*j.radius}px,${y*j.radius}px)`;}
  moveHand(e) {const r=this.drag?.rect;if(!r)return;const x=(e.clientX-r.left)/r.width*2-1,y=1-(e.clientY-r.top)/r.height*2;this.hand.nx=Math.max(-.98,Math.min(.98,x));this.hand.ny=Math.max(-.98,Math.min(.98,y));this.hand.x=Math.max(-.42,Math.min(.42,x*.5));this.hand.y=Math.max(-.32,Math.min(.32,y*.36));}
  movement() {if(!this.enabled)return {forward:0,strafe:0,turn:0};return {forward:(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)-(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-this.axis.y,strafe:(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0)+this.axis.x,turn:(this.keys.has('ArrowLeft')?1:0)-(this.keys.has('ArrowRight')?1:0)};}
  reset() {
    const held=[[this.canvas,this.look?.id],[this.stick,this.joy?.id],[this.carry,this.drag?.id]];
    this.look=null;this.joy=null;this.drag=null;this.keys.clear();this.axis={x:0,y:0};this.hand={x:.22,y:-.22,dragging:false};this.knob.style.transform='translate(0px,0px)';
    for(const [el,id]of held)try{if(id!==undefined&&el.hasPointerCapture?.(id))el.releasePointerCapture(id);}catch(_){}
  }
  destroy(){this.enabled=false;this.reset();this.removers.forEach(f=>f());this.removers=[];}
}
