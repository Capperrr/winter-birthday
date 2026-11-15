// Pure simulation: the renderer and input adapters cannot bypass these gates.
export const VERSION = 1;
export const SAVE_KEY = 'winter-shenzhen-save-v1';
export const NINTH_FLOOR = 28.8;
export const PLAYER_RADIUS = .24;
export const HOTSPOTS = Object.freeze({
  'street-sign': { title:'广场导向牌', at:[-3.2,1.6,7], range:2.35, zone:'street' },
  'wrong-entry': { title:'B 座入口', at:[-7.6,1.4,.2], range:2.1, zone:'street' },
  'c-entry': { title:'C 座玻璃门', at:[0,1.45,.12], range:2.2, zone:'street' },
  directory: { title:'大堂楼层索引', at:[-5.55,1.8,-4.5], range:2, zone:'lobby' },
  'call-lift': { title:'电梯呼叫键', at:[1.95,1.1,-11.6], range:1.85, zone:'lobby' },
  nine: { title:'9F 按钮', at:[1.16,1.32,-13.42], range:1.6, zone:'elevator', moving:true },
  'corridor-note': { title:'走廊里的便笺', at:[-2.98,NINTH_FLOOR+1.7,-9.4], range:1.9, zone:'corridor' },
  leaf: { title:'窗边的黄铜叶片', at:[-2.55,NINTH_FLOOR+1.02,-6], range:1.75, zone:'corridor' },
  socket: { title:'接待台的叶形凹槽', at:[.65,NINTH_FLOOR+1.06,-3.4], range:1.9, zone:'corridor' },
  letter: { title:'写给 Winter 的信', at:[1.32,NINTH_FLOOR+1.08,-3.4], range:1.8, zone:'corridor' }
});
export const OBSTACLES = Object.freeze({
  ground: [ [-8.7,-4.8,11.8,12.5], [5,7.4,7.7,8.7], [-4.15,-2.25,6.85,7.15],[-7.1,-6.7,1.6,2], [6.7,7.1,1.6,2],[-9.05,-8.55,4.75,5.25],[8.55,9.05,4.75,5.25],[-9.1,-6.1,-.16,.12],[-5.7,-5.45,-5.25,-3.75],[-4.8,-3.9,-2.7,-1.7], [2.1,4.7,-6.3,-4.8], [-3.8,-2.3,-8.4,-7.3], [-5.9,-1.48,-.12,.12], [1.48,5.9,-.12,.12], [-5.9,-1.35,-12.15,-11.7], [1.35,5.9,-12.15,-11.7], ...[-10.8,-8.7,-6.6,-4.5,-2.4].map(x=>[x-.12,x+.12,17.58,17.82]) ],
  upper: [ [-1.5,1.9,-3.9,-2.6], [1.8,2.8,-.3,1.4], [-3.2,-2.1,-6.5,-5.5] ]
});
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const ease = t => { t=clamp(t,0,1); return t*t*(3-2*t); };
const phases = ['idle','boarding','closing','rising','arriving','opening','arrived'];
const defaults = () => ({ signRead:false,enteredLobby:false,directoryRead:false,calledLift:false,ninePressed:false,arrived:false,corridorClue:false,leafPlaced:false,letterRead:false });
const safePosition = zone => zone==='corridor' ? {x:0,y:NINTH_FLOOR,z:-10.4} : zone==='elevator' ? {x:0,y:0,z:-13.55} : zone==='lobby' ? {x:0,y:0,z:-3} : {x:0,y:0,z:15};

export class ShenzhenGame {
  constructor(saved=null) {
    this.flags=defaults(); this.player=safePosition('street'); this.zone='street';
    this.velocity={x:0,z:0}; this.yaw=0; this.pitch=0;
    this.entry=0; this.entryOpening=false;
    this.lift={phase:'idle',elapsed:0,y:0,door:0,floor:1};
    this.held=null; this.time=0; this.events=[]; this.journal=[];
    if(saved) this.restore(saved);
  }
  emit(type,detail={}) { const event={type,...detail};this.events.push(event);this.journal.push(event);if(this.journal.length>80)this.journal.shift(); }
  drainEvents() { return this.events.splice(0); }
  point(id) { const h=HOTSPOTS[id];return h?[h.at[0],h.at[1]+(h.moving?this.lift.y:0),h.at[2]]:null; }
  distance(id) { const p=this.point(id);return p?Math.hypot(p[0]-this.player.x,p[1]-(this.player.y+1.62),p[2]-this.player.z):Infinity; }
  near(id) { const h=HOTSPOTS[id];return Boolean(h&&h.zone===this.zone&&this.distance(id)<=h.range); }
  objective() {
    if(!this.flags.signRead)return '沿街走近导向牌，确认 C 座入口。';
    if(!this.flags.enteredLobby)return '找到 C 座玻璃门，开门后步行进入。';
    if(!this.flags.directoryRead)return '在大堂查阅楼层索引，找到启德教育。';
    if(!this.flags.calledLift)return '已确认 9F，走近电梯呼叫键。';
    if(!this.flags.ninePressed)return '等门打开，走进轿厢，亲自按下 9F。';
    if(!this.flags.arrived)return '电梯正在前往九楼，可以四下观察或跳过过场。';
    if(this.zone!=='corridor')return '九楼到了，等门开启后步行进入走廊。';
    if(!this.flags.corridorClue)return '探索走廊，调查墙上的便笺。';
    if(!this.flags.leafPlaced)return this.held?'把黄铜叶片带到接待台，放回叶形凹槽。':'找到窗边的黄铜叶片，带回接待台。';
    return this.flags.letterRead?'深圳样章的信已读完。可以继续走走，或回到生日网页。':'机关已经解开，现在可以打开那封信。';
  }
  allowedRects() {
    if(this.zone==='elevator'&&this.lift.phase!=='boarding'&&this.lift.phase!=='arrived')return [[-1.28,1.28,-15.15,-12.3]];
    if(this.player.y>NINTH_FLOOR-.2)return [[-3.1,3.1,-12.04,2.8],[-1.28,1.28,-15.15,-11.76]];
    return [[-11.4,11.4,-.08,19.5],[-5.8,5.8,-11.85,.08],[-1.28,1.28,-15.15,-11.76]];
  }
  canOccupy(x,z) {
    const rects=this.allowedRects();
    for(let i=0;i<9;i++) {
      const a=(i-1)/8*Math.PI*2,r=i?PLAYER_RADIUS:0,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
      if(!rects.some(([a,b,c,d])=>px>=a&&px<=b&&pz>=c&&pz<=d))return false;
    }
    const boxes=this.player.y>NINTH_FLOOR-.2?OBSTACLES.upper:OBSTACLES.ground;
    for(const [a,b,c,d]of boxes)if(x>a-PLAYER_RADIUS&&x<b+PLAYER_RADIUS&&z>c-PLAYER_RADIUS&&z<d+PLAYER_RADIUS)return false;
    if(this.player.y<.2&&this.entry<.96&&Math.abs(x)<1.65&&Math.abs(z)<.16+PLAYER_RADIUS)return false;
    if(this.lift.door<.96&&Math.abs(x)<1.5&&Math.abs(z+12)<.13+PLAYER_RADIUS)return false;
    // A lift that has departed cannot be entered from the ground floor.
    if(this.player.y<.2&&this.lift.y>.2&&z<-11.7)return false;
    return true;
  }
  move(dx,dz) {
    const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.07));
    for(let i=0;i<count;i++) {
      if(this.canOccupy(this.player.x+dx/count,this.player.z))this.player.x+=dx/count;else this.velocity.x=0;
      if(this.canOccupy(this.player.x,this.player.z+dz/count))this.player.z+=dz/count;else this.velocity.z=0;
    }
  }
  update(dt,input={}) {
    dt=clamp(Number(dt)||0,0,.05);this.time+=dt;
    if(this.entryOpening)this.entry=Math.min(1,this.entry+dt/.95);
    this.updateLift(dt);
    if(this.zone==='elevator')this.player.y=this.lift.y;
    let f=clamp(Number(input.forward)||0,-1,1),s=clamp(Number(input.strafe)||0,-1,1);
    const length=Math.hypot(f,s);if(length>1){f/=length;s/=length;}
    const speed=2.35,tx=(-Math.sin(this.yaw)*f+Math.cos(this.yaw)*s)*speed,tz=(-Math.cos(this.yaw)*f-Math.sin(this.yaw)*s)*speed;
    const blend=1-Math.exp(-dt/(length>.01?.085:.12));
    this.velocity.x+=(tx-this.velocity.x)*blend;this.velocity.z+=(tz-this.velocity.z)*blend;
    if(Math.abs(this.velocity.x)<.0001)this.velocity.x=0;if(Math.abs(this.velocity.z)<.0001)this.velocity.z=0;
    this.move(this.velocity.x*dt,this.velocity.z*dt);
    const old=this.zone;
    if(this.flags.ninePressed&&this.lift.phase!=='arrived')this.zone='elevator';
    else if(this.player.y>NINTH_FLOOR-.2&&this.player.z>-11.7)this.zone='corridor';
    else if(this.player.z<-12.3)this.zone='elevator';
    else if(this.player.z<-.4)this.zone=this.player.y>NINTH_FLOOR-.2?'corridor':'lobby';
    else this.zone=this.player.y>NINTH_FLOOR-.2?'corridor':'street';
    if(this.zone==='lobby'&&!this.flags.enteredLobby){this.flags.enteredLobby=true;this.emit('lobby:entered');}
    if(old!==this.zone)this.emit('zone:changed',{zone:this.zone});
  }
  updateLift(dt) {
    const l=this.lift;if(['closing','rising','arriving','opening'].includes(l.phase))l.elapsed+=dt;else l.elapsed=0;
    if(l.phase==='idle'){l.door=0;l.y=0;}
    else if(l.phase==='boarding'){l.door=Math.min(1,l.door+dt/1.1);l.y=0;}
    else if(l.phase==='closing') {
      l.door=1-ease((l.elapsed-.28)/1.12);
      if(l.elapsed>=1.4){l.door=0;l.phase='rising';l.elapsed=0;this.emit('lift:doors-closed');}
    } else if(l.phase==='rising') {
      l.y=NINTH_FLOOR*ease(l.elapsed/8);
      const floor=clamp(1+Math.floor(l.y/3.6),1,9);
      if(floor!==l.floor){l.floor=floor;this.emit('lift:floor',{floor});}
      if(l.elapsed>=8){l.y=NINTH_FLOOR;l.floor=9;l.phase='arriving';l.elapsed=0;this.flags.arrived=true;this.emit('lift:arrived');}
    } else if(l.phase==='arriving') {
      l.door=0;l.y=NINTH_FLOOR;
      if(l.elapsed>=.65){l.phase='opening';l.elapsed=0;}
    } else if(l.phase==='opening') {
      l.y=NINTH_FLOOR;l.door=ease(l.elapsed/1.15);
      if(l.elapsed>=1.15){l.phase='arrived';l.door=1;l.elapsed=0;this.emit('lift:doors-open');}
    } else {l.y=NINTH_FLOOR;l.door=1;l.floor=9;}
  }
  interact(id,{visible=true}={}) {
    const fail=reason=>({ok:false,reason});
    if(!HOTSPOTS[id])return fail('这里没有可以操作的物件。');
    if(!visible)return fail('物件被挡住了，请换个位置。');
    if(!this.near(id))return fail('再走近一些，才能调查或操作。');
    if(HOTSPOTS[id].zone==='corridor'&&!this.flags.arrived)return fail('需要先亲自乘电梯到九楼。');
    if(id==='street-sign'){this.flags.signRead=true;this.emit('sign:read');return {ok:true,inspect:'sign'};}
    if(id==='wrong-entry')return fail('这里是 B 座。看一下广场导向牌，再找 C 座。');
    if(id==='c-entry') {
      if(!this.flags.signRead)return fail('先走近导向牌，确认 C 座的位置。');
      this.entryOpening=true;this.emit('entry:opening');return {ok:true};
    }
    if(id==='directory') {
      if(!this.flags.enteredLobby)return fail('需要先进入大堂。');
      this.flags.directoryRead=true;this.emit('directory:read',{floor:9});return {ok:true,inspect:'directory'};
    }
    if(id==='call-lift') {
      if(!this.flags.directoryRead)return fail('先调查大堂楼层索引，确认启德教育在哪一层。');
      if(this.lift.phase!=='idle')return fail('电梯已经在这里，等门打开后走进去。');
      this.flags.calledLift=true;this.lift={phase:'boarding',elapsed:0,y:0,door:0,floor:1};this.emit('lift:called');return {ok:true};
    }
    if(id==='nine') {
      if(!this.flags.directoryRead||!this.flags.calledLift)return fail('需要先查到楼层并呼叫电梯。');
      if(this.lift.phase!=='boarding'||this.player.z> -12.55||this.lift.door<.96)return fail('请先完全走进轿厢，等门打开后再按 9F。');
      this.flags.ninePressed=true;this.lift.phase='closing';this.lift.elapsed=0;this.velocity={x:0,z:0};this.emit('lift:nine-pressed');return {ok:true};
    }
    if(id==='corridor-note') {
      if(!this.flags.arrived)return fail('还没有到九楼。');
      this.flags.corridorClue=true;this.emit('puzzle:clue-read');return {ok:true,inspect:'puzzle'};
    }
    if(id==='leaf') {
      if(this.flags.leafPlaced)return fail('叶片已经放回凹槽了。');
      if(this.held)return fail('叶片已经在你手里。');
      this.held='leaf';this.emit('item:picked',{item:'leaf'});return {ok:true};
    }
    if(id==='socket') {
      if(!this.flags.corridorClue)return fail('先看看走廊里的便笺，弄清凹槽的用途。');
      if(this.flags.leafPlaced)return fail('叶片已经严丝合缝地放好了。');
      if(this.held!=='leaf')return fail('凹槽里缺少一枚黄铜叶片，去窗边找找。');
      this.held=null;this.flags.leafPlaced=true;this.emit('puzzle:solved');return {ok:true};
    }
    if(!this.flags.leafPlaced)return fail('信封的机关还没有解开。先调查便笺和叶形凹槽。');
    this.flags.letterRead=true;this.emit('letter:opened');return {ok:true,inspect:'letter'};
  }
  cancelCarry() { if(!this.held)return false;this.held=null;this.emit('item:returned',{item:'leaf'});return true; }
  skipRide() {
    if(!this.flags.ninePressed||!['closing','rising'].includes(this.lift.phase))return false;
    if(this.lift.phase==='closing')this.emit('lift:doors-closed',{skipped:true});
    this.lift={phase:'arriving',elapsed:0,y:NINTH_FLOOR,door:0,floor:9};
    this.flags.arrived=true;this.player.y=NINTH_FLOOR;this.zone='elevator';
    this.emit('lift:arrived',{skipped:true});return true;
  }
  snapshot() { return {version:VERSION,flags:{...this.flags},player:{...this.player},zone:this.zone,yaw:this.yaw,pitch:this.pitch,entry:this.entry,entryOpening:this.entryOpening,lift:{...this.lift},held:this.held}; }
  restore(saved) {
    if(saved?.version!==VERSION)return false;
    const f=saved.flags||{};for(const key of Object.keys(this.flags))this.flags[key]=f[key]===true;
    const p=this.flags;
    p.enteredLobby=p.enteredLobby&&p.signRead;p.directoryRead=p.directoryRead&&p.enteredLobby;p.calledLift=p.calledLift&&p.directoryRead;p.ninePressed=p.ninePressed&&p.calledLift;p.arrived=p.arrived&&p.ninePressed;p.corridorClue=p.corridorClue&&p.arrived;p.leafPlaced=p.leafPlaced&&p.corridorClue;p.letterRead=p.letterRead&&p.leafPlaced;
    const raw=saved.lift||{};
    let phase=phases.includes(raw.phase)?raw.phase:'idle';
    if(!p.calledLift)phase='idle';else if(!p.ninePressed)phase='boarding';else if(!['closing','rising','arriving','opening','arrived'].includes(phase))phase=p.arrived?'arrived':'closing';
    if(p.arrived&&!['arriving','opening','arrived'].includes(phase))phase='arrived';
    this.lift={phase,elapsed:clamp(Number(raw.elapsed)||0,0,phase==='rising'?8:phase==='closing'?1.4:1.15),y:0,door:0,floor:1};
    if(phase==='rising')this.lift.y=NINTH_FLOOR*ease(this.lift.elapsed/8);
    if(['arriving','opening','arrived'].includes(phase))this.lift.y=NINTH_FLOOR;
    if(phase==='closing')this.lift.door=1-ease((this.lift.elapsed-.28)/1.12);
    if(phase==='opening')this.lift.door=ease(this.lift.elapsed/1.15);
    if(phase==='boarding'||phase==='arrived')this.lift.door=1;
    this.lift.floor=clamp(1+Math.floor(this.lift.y/3.6),1,9);
    this.zone=p.arrived&&saved.zone==='corridor'?'corridor':p.ninePressed||saved.zone==='elevator'&&p.calledLift?'elevator':p.enteredLobby?'lobby':'street';
    const fallback=safePosition(this.zone),r=saved.player||{};
    this.player={x:Number.isFinite(r.x)?r.x:fallback.x,z:Number.isFinite(r.z)?r.z:fallback.z,y:this.zone==='corridor'?NINTH_FLOOR:this.zone==='elevator'?this.lift.y:0};
    this.entry=p.signRead?clamp(Number(saved.entry)||0,0,1):0;this.entryOpening=p.signRead&&Boolean(saved.entryOpening||p.enteredLobby);
    if(!this.canOccupy(this.player.x,this.player.z))this.player={...fallback,y:this.player.y};
    this.yaw=Number.isFinite(saved.yaw)?saved.yaw:0;this.pitch=clamp(Number(saved.pitch)||0,-.72,.72);
    this.held=p.arrived&&!p.leafPlaced&&saved.held==='leaf'?'leaf':null;
    return true;
  }
}
