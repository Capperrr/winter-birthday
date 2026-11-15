// Reference-driven 3D environment for WINTER. All camera translations, foreground
// buildings, depth/occlusion, shadows, doors and surfaces are actual WebGL geometry.
// Existing images are used as distant photographic context, not as gameplay substitutes.
// Source references: official CTBU Nan'an campus, Tianli Central Plaza property gallery,
// University of Southampton Highfield; exact private interiors are artistic reconstructions.
import * as THREE from '../shenzhen/vendor/three.module.mjs';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const rand=i=>{let x=Math.sin(i*78.233+122.123)*43758.5453;return x-Math.floor(x)};
const colors={
  shenzhen:{road:'#47565a',glass:'#51717b',frame:'#45545a',stone:'#a5aa9f',light:'#dac8a5'},
  dazhou:{road:'#686966',glass:'#8e9a92',frame:'#7e7968',stone:'#c4b7a3',light:'#f3dbab'},
  school:{road:'#777e72',glass:'#7694a4',frame:'#8c8f7d',stone:'#c2c5ad',light:'#e3e4c8'},
  university:{road:'#666d60',glass:'#638a9d',frame:'#b2aa92',stone:'#d7d4c4',light:'#efdab5'},
  southampton:{road:'#797570',glass:'#677f8a',frame:'#6b4e3f',stone:'#d1b8a3',light:'#ebd3b4'}
};

function makePattern(kind='#7d8b87'){
  const c=document.createElement('canvas');c.width=c.height=512;
  const ctx=c.getContext('2d');ctx.fillStyle=kind;ctx.fillRect(0,0,512,512);
  for(let i=0;i<13000;i++){
    const x=rand(i*9+8)*512,y=rand(i*7+11)*512,r=rand(i*19+3)*3+.4;
    ctx.fillStyle=rand(i*5+2)>.54?'rgba(241,239,229,.085)':'rgba(25,39,40,.065)';
    ctx.fillRect(x,y,r*1.5,r*.4);
  }
  ctx.strokeStyle='rgba(52,64,62,.19)';ctx.lineWidth=2;
  for(let x=0;x<=512;x+=128){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke()}
  for(let y=0;y<=512;y+=128){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke()}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=2;return t;
}
export class WinterWorld3D{
 constructor(root){
  this.root=root;this.fallback=null;this.inputs=new Set();this.pointer=null;this.want={x:0,z:0};
  this.position={x:2,z:10};this.angle={yaw:0,pitch:-.075};this.target={yaw:0,pitch:-.075};this.chapter=-1;this.sub=0;
  this.disposed=false;this.interactables=[];this.tween=null;this.hover=null;this.last=0;this.frame=null;this.moving=false;
  this.clock=new THREE.Clock();this.raycaster=new THREE.Raycaster();
  this.scene=new THREE.Scene();this.scene.background=null;this.scene.fog=new THREE.FogExp2('#91a3a0',.011);
  this.camera=new THREE.PerspectiveCamera(58,1,.08,185);
  this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance',stencil:false});
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure=1.08;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const dpr=Math.min(window.devicePixelRatio||1,1.5);this.renderer.setPixelRatio(dpr);
  this.canvas=this.renderer.domElement;this.canvas.id='three-world';this.canvas.className='three-world';this.canvas.setAttribute('aria-label','可探索的三维场景。按WASD移动，拖动观察，点击景物调查。');this.canvas.setAttribute('tabindex','0');root.insertBefore(this.canvas,root.querySelector('.photo-light'));
  const pad=document.createElement('div');pad.className='world-pad';pad.innerHTML='<span>移动</span><button class="world-n" aria-label="向前移动">↑</button><button class="world-l" aria-label="向左移动">←</button><button class="world-r" aria-label="向右移动">→</button><button class="world-s" aria-label="向后移动">↓</button>';root.parentElement.append(pad);this.pad=pad;
  for(const [klass,key] of [['world-n','KeyW'],['world-s','KeyS'],['world-l','KeyA'],['world-r','KeyD']]){
   const b=pad.querySelector('.'+klass);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);this.inputs.add(key)});
   for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>this.inputs.delete(key));
  }
  this.onDown=e=>{
   if(e.target.closest('button,a,input,textarea'))return;
   this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,dragged:0};
   try{this.canvas.setPointerCapture(e.pointerId)}catch{}
  };
  this.onMove=e=>{
   if(!this.pointer||this.pointer.id!==e.pointerId)return;
   const dx=e.clientX-this.pointer.lastX,dy=e.clientY-this.pointer.lastY;
   this.pointer.lastX=e.clientX;this.pointer.lastY=e.clientY;
   this.pointer.dragged+=Math.abs(dx)+Math.abs(dy);
   if(this.pointer.dragged>5){this.target.yaw=clamp(this.target.yaw-dx*.0042,-1.09,1.09);this.target.pitch=clamp(this.target.pitch-dy*.0028,-.31,.39);this.tween=null;}
  };
  this.onUp=e=>{
   if(!this.pointer||this.pointer.id!==e.pointerId)return;
   const wasClick=this.pointer.dragged<12;this.pointer=null;
   try{this.canvas.releasePointerCapture(e.pointerId)}catch{}
   if(!wasClick)return;
   const bounds=this.canvas.getBoundingClientRect();
   const pt=new THREE.Vector2((e.clientX-bounds.left)/bounds.width*2-1,-((e.clientY-bounds.top)/bounds.height*2-1));
   this.raycaster.setFromCamera(pt,this.camera);
   const hits=this.raycaster.intersectObjects(this.interactables,true);
   const h=hits.find(x=>x.object.userData.interact || x.object.parent?.userData.interact);
   if(h){const name=h.object.userData.interact||h.object.parent?.userData.interact;
     const hotspot=document.querySelector('#hotspots button:nth-child('+(name+1)+')');hotspot?.click();
     this.tween={x:clamp(h.point.x,-7,7),z:clamp(h.point.z+4,-.5,12)};return;}
   const ground=this.raycaster.intersectObject(this.ground,false)[0];
   if(ground&&ground.distance<65){this.tween={x:clamp(ground.point.x,-8,8),z:clamp(ground.point.z,-.1,13)}}
  };
  this.canvas.addEventListener('pointerdown',this.onDown);this.canvas.addEventListener('pointermove',this.onMove);this.canvas.addEventListener('pointerup',this.onUp);
  this.canvas.addEventListener('pointercancel',()=>this.pointer=null);
  this.onKeyDown=e=>{if(e.target.closest('textarea,input,button,a'))return;if(['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){this.inputs.add(e.code);e.preventDefault()}};
  this.onKeyUp=e=>this.inputs.delete(e.code);
  window.addEventListener('keydown',this.onKeyDown);window.addEventListener('keyup',this.onKeyUp);window.addEventListener('blur',()=>this.inputs.clear());
  this.resize=()=>{const {width,height}=root.getBoundingClientRect();this.camera.aspect=Math.max(.1,width/height);this.camera.updateProjectionMatrix();this.renderer.setSize(width,height,false)};
  window.addEventListener('resize',this.resize);this.resize();
  this.mount();
 }
 mount(){
  this.group=new THREE.Group();this.scene.add(this.group);
  this.hemi=new THREE.HemisphereLight('#dce5e1','#465254',2.2);this.scene.add(this.hemi);
  this.sun=new THREE.DirectionalLight('#f6e4c9',2.1);this.sun.position.set(-8,19,10);this.scene.add(this.sun);this.sun.castShadow=true;
  this.sun.shadow.mapSize.set(1024,1024);this.sun.shadow.camera.left=-26;this.sun.shadow.camera.right=26;this.sun.shadow.camera.top=26;this.sun.shadow.camera.bottom=-26;this.sun.shadow.bias=-.0005;
  this.materials={};
  this.setStage(0,0);
  this.frame=requestAnimationFrame(t=>this.tick(t));
 }
 material(hex,rough=.7,metal=.1,more={}){
  return new THREE.MeshStandardMaterial({color:hex,roughness:rough,metalness:metal,...more});
 }
 block(parent,w,h,d,x,y,z,mat,cast=false){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=cast;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 plane(parent,w,h,x,y,z,mat,rotation=0){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.position.set(x,y,z);m.rotation.y=rotation;m.receiveShadow=true;parent.add(m);return m;
 }
 sphere(parent,r,x,y,z,material,scale=[1,1,1]){
  const s=new THREE.Mesh(new THREE.IcosahedronGeometry(r,2),material);s.position.set(x,y,z);s.scale.set(...scale);parent.add(s);return s;
 }
 label(parent,text,w,h,x,y,z,color='#e9e1cf',bg='#314c50',action=-1,rotate=0){
  const c=document.createElement('canvas');c.width=1024;c.height=Math.max(128,Math.round(c.width*(h/w)));const ctx=c.getContext('2d');
  ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
  const size=Math.floor(Math.min(c.height*.45,c.width/(text.length*.95)));ctx.font='600 '+Math.max(26,size)+'px "PingFang SC","Microsoft Yahei",sans-serif';ctx.fillText(text,c.width/2,c.height/2);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const m=this.plane(parent,w,h,x,y,z,new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}),rotate);
  if(action>=0){m.userData.interact=action;this.interactables.push(m)}return m;
 }
 tileGround(palette){
  const roadMat=this.material(palette.road,.85,.1),stoneMat=this.material(palette.stone,.83,.04);
  const texture=makePattern(palette.stone);texture.repeat.set(8,12);
  this.texture=texture;
  this.ground=new THREE.Mesh(new THREE.PlaneGeometry(170,170),new THREE.MeshStandardMaterial({map:texture,roughness:.77,metalness:.06}));this.ground.rotation.x=-Math.PI/2;this.ground.position.y=-.07;this.ground.receiveShadow=true;this.group.add(this.ground);
  // physically present pedestrian curb and carriageway (not a flat background image)
  this.block(this.group,46,.08,17,0,-.09,31,roadMat);
  for(const sx of [-1,1])this.block(this.group,.18,.21,37,sx*12.75,.09,11,stoneMat);
  for(let x=-8;x<=8;x+=4)this.block(this.group,2.7,.012,.10,x,-.025,25,this.material('#d2d3c5',.95));
  // art-directed warm wet pavement pools using transparent surfaces
  const wet=new THREE.MeshBasicMaterial({color:'#90b2b8',transparent:true,opacity:.07,depthWrite:false});
  for(let i=0;i<11;i++){
    const x=(rand(i+3)-.5)*18,z=rand(i*3+7)*21+2;
    const puddle=this.plane(this.group,2.2,.95,x,-.03,z,wet);
    puddle.rotation.x=-Math.PI/2;puddle.scale.set(1+rand(i+44)*1.7,1,1);
  }
 }
 makeLight(x,y,z,color='#d6c4a1',strength=3.8,range=13){
  const l=new THREE.PointLight(color,strength,range,2);l.position.set(x,y,z);this.group.add(l);return l;
 }
 plant(x,z,height=3,seed=2){
  // A detailed leafy silhouette with branched support and 62 overlapping crownlets.
  const bark=this.material('#65554a',.97),leafMat=this.material('#355343',.9,.0,{side:THREE.DoubleSide});
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.07,.17,height*.69,10),bark);stem.position.set(x,height*.34,z);stem.castShadow=true;this.group.add(stem);
  for(let k=0;k<5;k++){
    const a=k*Math.PI*2/5+seed,ex=x+Math.cos(a)*.9,ez=z+Math.sin(a)*.8;
    const limb=new THREE.Mesh(new THREE.CylinderGeometry(.035,.07,1.7,7),bark);
    limb.position.set((x+ex)/2,height*.76,(z+ez)/2);limb.rotation.z=Math.sin(a)*.6;limb.rotation.x=Math.cos(a)*.5;this.group.add(limb);
  }
  const ge=new THREE.IcosahedronGeometry(.47,1),count=62,crown=new THREE.InstancedMesh(ge,leafMat,count);const helper=new THREE.Object3D();
  for(let i=0;i<count;i++){
    const angle=i*2.39996+seed,rad=Math.sqrt((i+.5)/count)*1.8;
    helper.position.set(x+Math.cos(angle)*rad,height*.80+(rand(i*13+seed)-.5)*1.0,z+Math.sin(angle)*rad*.7);
    helper.scale.set(.55+rand(i+6)*.52,.46+rand(i+19)*.45,.56+rand(i+77)*.43);
    helper.rotation.set(.2,angle,.17);helper.updateMatrix();crown.setMatrixAt(i,helper.matrix);
    crown.setColorAt(i,new THREE.Color(['#345b48','#4d735b','#607f61','#2b4d40','#73916b'][i%5]));
  }
  crown.instanceMatrix.needsUpdate=true;this.group.add(crown);
  return crown;
 }
 streetFurniture(){
  const metal=this.material('#586368',.4,.52),lamp=this.material('#fff3db',.18,.0,{emissive:'#a98a5c',emissiveIntensity:1.8});
  for(const side of [-1,1])for(let i=0;i<3;i++){
   const x=side*10.9,z=-5+i*7.5;
   this.block(this.group,.12,4.7,.12,x,2.35,z,metal,true);
   this.block(this.group,1.3,.13,.28,x-side*.52,4.62,z,metal);
   this.block(this.group,.54,.045,.18,x-side*.8,4.54,z,lamp);
   if(i<2)this.makeLight(x-side*.8,4.4,z,'#e7ccac',2,7);
  }
  for(let i=0;i<7;i++){
    const x=-8+i*2.8;
    this.block(this.group,.13,.66,.13,x,.33,-.45,metal);
    this.block(this.group,.20,.08,.20,x,.71,-.45,lamp);
  }
 }
 skyscraper(x,z,w,h,d,glassShade='#3c5a68'){
  const wall=this.material('#6c858d',.38,.4);
  const blue=this.material(glassShade,.22,.51,{transparent:true,opacity:.92});
  this.block(this.group,w,h,d,x,h/2,z,wall);
  // Finned glass curtain wall and individually inset window panes
  const cols=Math.max(4,Math.floor(w/1.65)),floors=Math.min(21,Math.floor(h/2.7));
  const pw=w/cols-.12,ph=2.7-.27;
  const paneGeo=new THREE.BoxGeometry(pw,ph,.06),panes=new THREE.InstancedMesh(paneGeo,blue,cols*floors);
  const dummy=new THREE.Object3D(),color=new THREE.Color();let idx=0;
  for(let row=0;row<floors;row++)for(let col=0;col<cols;col++){
   dummy.position.set(x-w/2+pw/2+col*w/cols+.05,1.45+row*2.7,z+d/2+.052);dummy.updateMatrix();panes.setMatrixAt(idx,dummy.matrix);
   color.set(['#4d747b','#71939b','#375a69','#668590','#35525d','#8baab1'][(row*7+col*3)%6]);panes.setColorAt(idx,color);idx++;
  }
  panes.instanceMatrix.needsUpdate=true;this.group.add(panes);
  const frame=this.material('#435c64',.42,.65);
  for(let col=0;col<=cols;col++)this.block(this.group,.095,floors*2.7,.12,x-w/2+col*w/cols,floors*2.7/2,z+d/2+.11,frame);
  for(let row=1;row<=floors;row++)this.block(this.group,w,.105,.12,x,row*2.7,z+d/2+.11,frame);
  return panes;
 }
 buildShenzhen(sub){
  const p=colors.shenzhen;this.tileGround(p);this.streetFurniture();
  const marble=this.material('#b8c0b9',.84,.04),steel=this.material('#536c70',.36,.74),gold=this.material('#b7a47c',.34,.65);
  const glazing=this.material('#547781',.16,.38,{transparent:true,opacity:.61,depthWrite:false});
  const ceiling=this.material('#9da5a3',.92,.05);
  if(sub<2){
    this.skyscraper(-.5,-18,25,46,7,'#365864');this.skyscraper(-32,-33,24,42,10,'#465e68');this.skyscraper(28,-39,24,64,11,'#496d7b');
    // street-level C lobby: the reference gallery shows a continuous GLASS canopy,
    // aluminium frame, distinctive warmer gold entrance and planted forecourt.
    this.block(this.group,25,3.3,2,0,1.65,-13.7,marble,true);
    for(let i=-6;i<=6;i++){
      const x=i*1.85;
      this.block(this.group,.085,3.4,.13,x,1.72,-12.54,steel);
      if(Math.abs(x)>3.4)this.block(this.group,1.72,2.75,.045,x,1.55,-12.45,glazing);
    }
    this.block(this.group,5.15,.18,2.5,0,3.65,-11.45,gold,true);
    this.block(this.group,19.5,.13,4.4,0,4.18,-9.55,glazing,true);
    for(let j=-5;j<=5;j++)this.block(this.group,.10,.18,4.4,j*1.7,4.04,-9.55,steel);
    this.block(this.group,5,.14,.24,0,3.48,-12.41,gold);
    this.block(this.group,.085,3.05,.12,-2.35,1.52,-12.40,steel);
    this.block(this.group,.085,3.05,.12,2.35,1.52,-12.40,steel);
    this.doors=[];
    for(const sign of [-1,1]){
      const door=this.block(this.group,2.22,2.90,.072,sign*1.13,1.50,-12.40,glazing);
      this.block(door,.055,2.75,.11,sign>0?-.95:.95,0,.02,steel);
      this.block(door,.20,.59,.09,sign>0?-.42:.42,0,.04,gold);
      this.doors.push(door);
    }
    this.label(this.group,'C 座 · ENTRANCE',4.1,.61,0,3.03,-12.28,'#f4eee1','#31494e',0);
    for(const x of [-5.5,5.5]){
      this.block(this.group,1.45,.62,1.1,x,.31,-9.7,this.material('#495453',.91));
      for(let i=0;i<4;i++)this.plant(x+Math.cos(i)*.3,-9.7+Math.sin(i)*.3,1.85,i+9);
    }
    this.plant(-10,2.8,5.2,3);this.plant(10,3,4.7,4);
    // Commercial frontage so the C tower reads as a lived-in real office block.
    for(let side of [-1,1])for(let i=0;i<3;i++){
      const x=side*(7.3+i*2.5);
      this.block(this.group,2.24,2.65,.12,x,1.45,-12.38,glazing);
      this.block(this.group,2.24,.32,.18,x,3.2,-12.36,marble);
    }
    this.makeLight(0,4.4,-10,'#ebc7a6',8,15);
  }else if(sub===2){
    // Premium office lobby, photo-referenced proportions (illustrative layout).
    const stone=this.material('#c3c2b6',.7),wall=this.material('#a9b1aa',.87),metal=this.material('#77878a',.33,.7);
    this.block(this.group,28,12,1.2,0,6,-21,wall);
    this.block(this.group,.4,12,29,-13.5,6,-6,wall);
    this.block(this.group,.4,12,29,13.5,6,-6,wall);
    this.block(this.group,28,.25,27,0,11,-7,stone);
    for(let z=-17;z<7;z+=4)for(let x=-9;x<=9;x+=6){this.block(this.group,3.1,.07,.20,x,10.80,z,this.material('#eedaba',.25,0,{emissive:'#f7e2bc',emissiveIntensity:.65}));this.makeLight(x,10.45,z,'#f1dac0',1.8,7)}
    for(let x of [-6.5,6.5])this.block(this.group,.32,10,.32,x,5,-7,stone,true);
    for(let x of [-4,-1.4,1.4,4])this.block(this.group,.09,7,.14,x,3.6,-17.8,metal);
    this.block(this.group,9,.21,.35,0,7.15,-17.6,metal);
    for(let x of [-5.4,5.4])this.block(this.group,.35,6,.35,x,3,-17.5,metal);
    this.label(this.group,'电梯厅  ·  ELEVATORS',7.0,.72,0,7.70,-17.35);
    this.label(this.group,'楼层索引 · 09F 启德教育',4.2,1.48,-7.5,3.3,-11,'#263e40','#f5eee0',0);
    this.block(this.group,6.6,1.25,2.2,4.8,.62,-8.3,this.material('#827664',.51),true);
    this.block(this.group,6.8,.12,2.4,4.8,1.31,-8.3,stone,true);
    this.plant(-9,2.0,4,7);this.plant(9,4.2,4,8);
  }else if(sub===3){
    // Elevator cabin is actual 3D space, while HTML gives a large tactile 9F control.
    const satin=this.material('#77888a',.33,.65),bronze=this.material('#b9a379',.28,.62),warm=this.material('#c9c6bb',.77);
    this.block(this.group,12,7,.36,0,3.5,-10,satin);
    this.block(this.group,.28,7,13,-6,3.5,-3.5,satin);
    this.block(this.group,.28,7,13,6,3.5,-3.5,satin);
    this.block(this.group,12,.2,13,0,6.75,-3.5,warm);
    for(let x of [-4.0,4.0])for(let z of [-6,-1,3])this.block(this.group,.10,5.5,.14,x,2.75,z,bronze);
    for(let x of [-3,3])this.block(this.group,.13,.08,11,x,4.5,-3.6,bronze);
    for(let x of [-3,0,3])this.block(this.group,1.7,.08,9,x,6.55,-3.2,this.material('#efead6',.25,0,{emissive:'#fff2d9',emissiveIntensity:.75}));
    this.makeLight(0,6.2,-3,'#fae1c3',7,12);
    this.label(this.group,'1F             →            9F',4.7,.92,0,5.2,-9.73,'#dfdbbc','#213840');
  }else{
    // A plausible ninth-floor lobby, not an unverified exact office layout.
    const linen=this.material('#d0cec2',.88),satin=this.material('#596e70',.39,.53),oak=this.material('#98846d',.60);
    this.block(this.group,23,8,.22,0,4,-20,linen);
    for(let side of [-1,1])this.block(this.group,.20,8,32,side*11.5,4,-4,linen);
    this.block(this.group,23,.23,32,0,7.4,-4,linen);
    for(let x=-10;x<11;x+=3.3){
      this.block(this.group,3.14,4.9,.09,x,3.0,-19.7,satin);
      this.block(this.group,3.0,4.4,.05,x,3,-19.60,this.material('#526f76',.26,.34,{transparent:true,opacity:.45}));
    }
    this.label(this.group,'9F · 启德教育  EIC EDUCATION',9.1,1.30,0,5.7,-18.4,'#435955','#e5e1d2');
    this.block(this.group,8.5,1.40,2.4,1,.7,-9.5,oak,true);
    this.block(this.group,8.5,.16,2.65,1,1.48,-9.5,linen);
    for(let i=-11;i<=11;i++)this.block(this.group,.055,1.1,.07,1+i*.30,.55,-8.27,this.material(i%3?'#78685a':'#ac9373',.7));
    this.plant(-8,-3,4.6,3);
    for(let i=-1;i<=1;i++)this.block(this.group,2.3,.08,.17,i*3.5,7.25,-4.5,this.material('#eddfbe',.22,0,{emissive:'#f6e7c9',emissiveIntensity:.7}));
    this.makeLight(0,6,-4.5,'#ead8b7',7,15);
  }
 }
 buildCampus(type,sub){
  const p=colors[type];this.tileGround(p);
  const stone=this.material(p.stone,.83,.08),frame=this.material(p.frame,.58,.3),glass=this.material(p.glass,.29,.37);
  if(type==='dazhou'){
    for(const s of [-1,1]){
      this.skyscraper(s*20,-34,21,23,8,'#617b77');
      this.block(this.group,18,5,2.8,s*17,2.5,-12,stone,true);
      this.label(this.group,s===-1?'达州西外 · 天府新城':'罗浮广场',7,.9,s*17,3.4,-10.5,'#e8e3d4','#6a7668',s===-1?0:1);
      for(let i=0;i<4;i++)this.block(this.group,3.4,3.2,.15,s*17-6+i*4,1.8,-10.48,glass);
    }
    this.streetFurniture();this.plant(-8,1,4.6,2);this.plant(8,-3,4.1,7);
  }else if(type==='school'){
    this.block(this.group,30,13,7,0,6.5,-27,stone,true);
    for(let f=0;f<3;f++)for(let c=-5;c<=5;c++)this.block(this.group,1.6,1.55,.09,c*2.35,3.6+f*3.4,-23.35,glass);
    this.block(this.group,26,.8,3.5,0,1.6,-10,stone);
    this.block(this.group,10,5,.7,-8,2.5,-13,stone,true);
    this.block(this.group,10,5,.7,8,2.5,-13,stone,true);
    this.block(this.group,5,1.1,1,0,5,-13,frame);
    this.label(this.group,'达州市第一中学校 · 西外',9,.95,0,5.0,-12.45,'#f8f3e9','#566865',0);
    for(let x=-10;x<=10;x+=5)this.plant(x,-6.5,4.5,2+x);
  }else if(type==='university'){
    this.block(this.group,35,13,7,0,6.5,-29,stone,true);
    for(let floor=0;floor<4;floor++)for(let col=-8;col<=8;col++){
      this.block(this.group,1.51,2.1,.08,col*1.94,2.1+floor*2.82,-25.45,glass);
      this.block(this.group,.09,2.25,.10,col*1.94-.91,2.1+floor*2.82,-25.37,frame);
    }
    for(const side of [-1,1]){
      this.block(this.group,11,5,1.0,side*12.3,2.5,-12,stone,true);
      this.block(this.group,1.4,6,.6,side*16,3,-11.45,stone);
    }
    this.block(this.group,10,1.05,1.0,0,5,-12,stone);
    this.label(this.group,'重庆工商大学  ·  南岸校区',10,.95,0,5.15,-11.47,'#3c4f4b','#d9d5c2',0);
    for(let x of [-7,7])this.plant(x,-3,5.1,x+12);
    this.plant(-11,5,4.2,11);this.plant(11,6,4.1,3);
  }else{
    // Southampton Highfield: warm brick facade, vertical windows, lawn and broad trees.
    const brick=this.material('#8c604e',.83),tan=this.material('#cfb69e',.88);
    this.block(this.group,36,16,8,0,8,-28,brick,true);
    for(let f=0;f<5;f++)for(let col=-8;col<=8;col++){
      this.block(this.group,1.1,2.1,.08,col*1.95,2.0+f*2.8,-23.9,glass);
      this.block(this.group,1.3,.19,.13,col*1.95,3.2+f*2.8,-23.78,tan);
    }
    this.block(this.group,10,6,1,0,3,-12.2,tan);
    this.block(this.group,3.3,4.3,.12,0,2.2,-11.65,glass);
    this.label(this.group,'UNIVERSITY OF SOUTHAMPTON',11.5,.86,0,5.45,-11.59,'#ead8c7','#704c41',0);
    for(const x of [-8.9,8.9])this.plant(x,-3,5.5,13+x);
    for(const x of [-6,6])for(let z of [4,9])this.sphere(this.group,1.85,x,.08,z,this.material('#4d6d4c',.96),[2,.09,1.4]);
  }
  this.streetFurniture();
 }
 setStage(chapter,sub=0){
  if(this.chapter===chapter&&this.sub===sub)return;
  this.chapter=chapter;this.sub=sub;
  this.interactables=[];
  if(this.group){this.scene.remove(this.group);this.group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&!Array.isArray(o.material))o.material.dispose?.()})}
  if(this.texture)this.texture.dispose();
  this.group=new THREE.Group();this.scene.add(this.group);
  const type=['dazhou','school','university','southampton','shenzhen'][chapter]||'shenzhen';
  this.scene.fog.color.set(type==='shenzhen'?'#6f868b':'#a3b6b3');
  this.hemi.intensity=type==='shenzhen'?1.9:2.2;this.sun.intensity=type==='shenzhen'?1.9:2.0;
  this.sun.color.set(type==='shenzhen'?'#e4c9b5':'#fff0d0');
  if(type==='shenzhen')this.buildShenzhen(sub);else this.buildCampus(type,sub);
  this.position={x:chapter===4&&sub===3?0:2,z:chapter===4&&sub>=2?6.5:12};
  this.angle={yaw:0,pitch:-.07};this.target={yaw:0,pitch:-.07};this.tween=null;
  this.camera.position.set(this.position.x,1.62,this.position.z);
  this.camera.rotation.set(0,0,0);this.resize();
 }
 tick(now){
  if(this.disposed)return;
  this.frame=requestAnimationFrame(t=>this.tick(t));
  if(document.hidden)return;
  const dt=clamp(this.last?(now-this.last)/1000:1/60,0,.05);this.last=now;
  let forward=0,side=0;
  if(this.inputs.has('KeyW')||this.inputs.has('ArrowUp'))forward++;
  if(this.inputs.has('KeyS')||this.inputs.has('ArrowDown'))forward--;
  if(this.inputs.has('KeyA')||this.inputs.has('ArrowLeft'))side--;
  if(this.inputs.has('KeyD')||this.inputs.has('ArrowRight'))side++;
  this.moving=(forward!==0||side!==0);
  if(this.moving)this.tween=null;
  if(this.tween){
    const d=Math.hypot(this.tween.x-this.position.x,this.tween.z-this.position.z);
    if(d<.13)this.tween=null;
    else {const amt=Math.min(d,dt*3.2);this.position.x+=(this.tween.x-this.position.x)/d*amt;this.position.z+=(this.tween.z-this.position.z)/d*amt}
  }
  const yaw=this.angle.yaw;
  if(this.moving){
    const speed=3.6;this.position.x+=(Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed*dt;
    this.position.z+=(-Math.cos(yaw)*forward+Math.sin(yaw)*side)*speed*dt;
  }
  this.position.x=clamp(this.position.x,-9,9);
  const closestZ=this.chapter===4?(this.sub===2?-16:this.sub===3?-8:this.sub===4?-14:-10):(this.chapter===0?-7:-9);
  this.position.z=clamp(this.position.z,closestZ,14);
  this.angle.yaw=mix(this.angle.yaw,this.target.yaw,1-Math.exp(-dt*12));
  this.angle.pitch=mix(this.angle.pitch,this.target.pitch,1-Math.exp(-dt*11));
  this.camera.position.set(this.position.x,1.65,this.position.z);
  this.camera.rotation.order='YXZ';this.camera.rotation.y=this.angle.yaw;this.camera.rotation.x=this.angle.pitch;
  this.renderer.render(this.scene,this.camera);
 }
 destroy(){
  this.disposed=true;cancelAnimationFrame(this.frame);
  window.removeEventListener('resize',this.resize);window.removeEventListener('keydown',this.onKeyDown);window.removeEventListener('keyup',this.onKeyUp);
  this.renderer.dispose();this.canvas.remove();this.pad.remove();
 }
}
