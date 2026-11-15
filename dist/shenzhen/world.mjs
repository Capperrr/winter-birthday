import * as THREE from './vendor/three.module.mjs';
import {HOTSPOTS,NINTH_FLOOR,OBSTACLES} from './game-core.mjs';
import {applyCinematicStreet} from './cinematic-street.mjs';

// Scenery is replaceable independently of collision, objectives and save data.
export function createWorld({manager=new THREE.LoadingManager()}={}) {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#84969e');scene.fog=new THREE.Fog('#899a9e',58,148);
  const rayMeshes=[],targets=new Map(),resources=new Set(),presses=[];
  const materials={};let textureCount=0;
  const material=(name,color,roughness=.7,metalness=0)=>materials[name]=new THREE.MeshStandardMaterial({color,roughness,metalness});
  material('stone','#899491',.88);material('wall','#b1b5ae',.85);material('wood','#685f54',.72);
  material('dark','#2a4045',.66,.18);material('metal','#778789',.36,.56);material('brass','#ae9b78',.42,.52);
  material('glass','#95bec7',.15,.22);materials.glass.transparent=true;materials.glass.opacity=.27;materials.glass.depthWrite=false;
  material('floor','#9ca4a1',.72,.04);material('green','#3a604d',.91);material('soil','#3b4138',1);
  material('white','#e7e1cf',.72);material('ink','#243f36',.8);material('black','#121c23',.8);
  if(typeof document!=='undefined') {
    const loader=new THREE.TextureLoader(manager);
    for(const [name,file,repeat] of [['stone','pavement_02',[12,12]],['wall','concrete_wall_001',[3,1]],['wood','wood_table_001',[2,1]]]) {
      const mat=materials[name];
      for(const [slot,suffix] of [['map',''],['normalMap','_nor_gl'],['roughnessMap','_rough']]) {
        textureCount++;
        const tex=loader.load(new URL('./textures/'+file+suffix+'.webp',import.meta.url).href,undefined,undefined,()=>{mat[slot]=null;mat.needsUpdate=true;});
        tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(...repeat);tex.colorSpace=slot==='map'?THREE.SRGBColorSpace:THREE.NoColorSpace;
        mat[slot]=tex;resources.add(tex);
      }
      mat.normalScale.set(.28,.28);
    }
  }
  const hemi=new THREE.HemisphereLight('#d9e3e9','#48534c',1.22);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#f0dcc4',1.54);sun.position.set(-20,35,18);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-25;sun.shadow.camera.right=25;sun.shadow.camera.top=24;sun.shadow.camera.bottom=-24;sun.shadow.camera.far=100;sun.shadow.bias=-.0006;scene.add(sun);
  function lamp(parent,x,y,z,intensity=35,color='#fff0d2',range=10) {const light=new THREE.PointLight(color,intensity,range,1.5);light.position.set(x,y,z);parent.add(light);return light;}
  function register(mesh,id,ray=true) {if(id){mesh.userData.hotspot=id;if(!targets.has(id))targets.set(id,mesh);}if(ray)rayMeshes.push(mesh);resources.add(mesh.geometry);return mesh;}
  function box(parent,size,at,mat,id=null,{ray=true,shadow=false}={}) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),typeof mat==='string'?materials[mat]:mat);mesh.position.set(...at);mesh.castShadow=shadow;mesh.receiveShadow=true;parent.add(mesh);return register(mesh,id,ray);
  }
  function cylinder(parent,r1,r2,h,at,mat,segments=16,id=null) {const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),materials[mat]);mesh.position.set(...at);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return register(mesh,id);}
  function makeText(lines,{background='#203c39',color='#ece7d7',width=1024,height=512,font=60}={}) {
    if(typeof document==='undefined') {const t=new THREE.DataTexture(new Uint8Array([220,224,209,255]),1,1);t.needsUpdate=true;resources.add(t);return {texture:t,paint:()=>{}};}
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;resources.add(texture);
    const paint=content=>{ctx.fillStyle=background;ctx.fillRect(0,0,width,height);ctx.strokeStyle='#b6c7b34d';ctx.lineWidth=2;ctx.strokeRect(24,24,width-48,height-48);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`500 ${font}px "PingFang SC","Microsoft YaHei",sans-serif`;const rows=Array.isArray(content)?content:[content];rows.forEach((s,i)=>ctx.fillText(s,width/2,height/2+(i-(rows.length-1)/2)*(font*1.55),width-75));texture.needsUpdate=true;};paint(lines);return {texture,paint};
  }
  function panel(parent,id,lines,width,height,at,rotation=0,opts={}) {
    const group=new THREE.Group();group.name=id||'sign';group.position.set(...at);group.rotation.y=rotation;parent.add(group);
    box(group,[width+.10,height+.10,.08],[0,0,-.05],'metal',id);
    // Canvas dimensions follow the physical face ratio: a very wide entrance sign
    // must not stretch the text texture horizontally on the building.
    const textureH=Math.min(512,Math.max(180,Math.round(2048/(width/height))));
    const textureW=Math.min(2048,Math.max(256,Math.round(textureH*width/height)));
    const text=makeText(lines,{...opts,width:textureW,height:textureH}),mat=new THREE.MeshBasicMaterial({map:text.texture,toneMapped:false});resources.add(mat);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(width,height),mat);face.position.z=.005;group.add(face);register(face,id);return {group,face,paint:text.paint};
  }
  function button(parent,id,at,rotation=0,label='9F') {
    const group=new THREE.Group();group.position.set(...at);group.rotation.y=rotation;parent.add(group);
    const part=new THREE.Group();group.add(part);
    const ring=cylinder(part,.16,.16,.035,[0,0,.015],'metal',24,id);ring.rotation.x=Math.PI/2;
    const cap=cylinder(part,.127,.127,.03,[0,0,.045],'brass',24,id);cap.rotation.x=Math.PI/2;
    const tex=makeText(label,{background:'#8e805b',width:256,height:256,font:88}),mat=new THREE.MeshBasicMaterial({map:tex.texture,toneMapped:false});resources.add(mat);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(.18,.18),mat);face.position.z=.064;part.add(face);register(face,id);
    const proxy=new THREE.Mesh(new THREE.BoxGeometry(.38,.38,.035),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));proxy.position.z=.08;group.add(proxy);register(proxy,id);resources.add(proxy.material);
    const glow=new THREE.PointLight('#ead2a4',0,1.8,2);glow.position.set(0,0,.18);group.add(glow);
    presses.push({id,part,glow,time:99});return group;
  }
  function plant(parent,x,y,z,scale=1) {
    cylinder(parent,.35*scale,.29*scale,.6*scale,[x,y+.3*scale,z],'dark');cylinder(parent,.31*scale,.31*scale,.035,[x,y+.6*scale,z],'soil');
    for(let i=0;i<7;i++){const a=i*2.4,leaf=new THREE.Mesh(new THREE.SphereGeometry(.3,8,5),materials.green);leaf.scale.set(.4,1.8,.65);leaf.position.set(x+Math.cos(a)*.2*scale,y+(1+i%3*.12)*scale,z+Math.sin(a)*.2*scale);leaf.rotation.z=Math.sin(a)*.5;parent.add(leaf);register(leaf,null);}
  }
  function lightStrip(parent,at,size=[1,.035,.07]) {const mat=new THREE.MeshBasicMaterial({color:'#f5ebcf',toneMapped:false});resources.add(mat);box(parent,size,at,mat,null,{ray:false});}

  const street=new THREE.Group();street.name='A_shenzhen_street';scene.add(street);
  box(street,[25,.22,24],[0,-.12,9.5],'stone');box(street,[40,.16,10],[0,-.13,27],'dark',null,{ray:false});
  // The limited walking area ends at visible stone edges, not an unseen wall.
  for(const x of [-11.55,11.55])box(street,[.3,.48,19.8],[x,.22,9.7],'wall');
  box(street,[23.4,.48,.3],[0,.22,19.65],'wall');
  for(let i=-2;i<=2;i++)box(street,[2,.015,.22],[i*3,-.03,23],'white',null,{ray:false});
  // Real 3D foreground: benches, planters, bollards and a shaded entry canopy.
  box(street,[3.9,.48,.72],[-6.75,.35,12.15],'wall',null,{shadow:true});box(street,[3.95,.12,.78],[-6.75,.66,12.15],'wood',null,{shadow:true});
  box(street,[2.4,.8,1],[6.2,.4,8.2],'wall',null,{shadow:true});plant(street,6.2,.8,8.2,1);
  for(let i=0;i<5;i++)cylinder(street,.10,.11,.75,[-10.8+i*2.1,.37,17.7],'metal');
  panel(street,'street-sign',['天利中央广场 · 二期','C 座入口  ↑','B 座 ←     → 广场'],1.8,1.35,HOTSPOTS['street-sign'].at,0,{font:64});
  box(street,[.10,1.1,.10],[-3.2,.6,7],'metal');
  panel(street,'wrong-entry',['B 座','BLOCK B'],1.35,1.5,HOTSPOTS['wrong-entry'].at,0,{font:90});
  box(street,[3,3.4,.18],[-7.6,1.7,-.04],'dark','wrong-entry');
  box(street,[15.6,.32,3.2],[0,3.65,1],'dark',null,{shadow:true});
  for(const x of [-6.9,6.9])box(street,[.36,3.65,.36],[x,1.82,1.8],'metal',null,{shadow:true});
  panel(street,null,['天利中央广场 · 二期 C 座','TIANLI CENTRAL PLAZA · C'],5.6,.62,[0,3.03,.10],0,{font:68});
  box(street,[5.5,3,.25],[-4.25,1.5,0],'wall',null,{shadow:true});box(street,[5.5,3,.25],[4.25,1.5,0],'wall',null,{shadow:true});
  const entryLeft=new THREE.Group(),entryRight=new THREE.Group();entryLeft.position.set(-1.48,0,0);entryRight.position.set(1.48,0,0);street.add(entryLeft,entryRight);
  for(const [group,side]of [[entryLeft,1],[entryRight,-1]]) {
    box(group,[1.47,2.8,.07],[side*.735,1.4,0],'glass','c-entry');
    for(const y of [.04,2.76])box(group,[1.47,.055,.09],[side*.735,y,0],'metal','c-entry');
    box(group,[.05,2.8,.09],[side*1.44,1.4,0],'metal','c-entry');box(group,[.035,.43,.10],[side*1.2,1.25,.12],'metal','c-entry');
  }
  const entryProxy=box(street,[2.95,2.8,.035],[0,1.4,.12],new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}),'c-entry');resources.add(entryProxy.material);
  // Midground C tower has a clear entrance rather than a solid proxy box.
  box(street,[15.1,31.5,.3],[0,19.9,3.02],'glass',null,{ray:false});
  for(const x of [-7.3,7.3])box(street,[.38,36,18],[x,18,-6],'wall',null,{ray:false});
  for(let y=5;y<36;y+=3.6)box(street,[15.2,.08,.4],[0,y,3.05],'metal',null,{ray:false});
  for(let x=-6.3;x<=6.4;x+=1.8)box(street,[.07,31,.1],[x,20,3.25],'metal',null,{ray:false});
  // Distant geometry provides true depth/parallax without photographic backdrops.
  const city=new THREE.Group();city.name='distant_shenzhen_massing';scene.add(city);
  const windowGeometry=new THREE.BoxGeometry(.65,1,.025),windowMaterial=new THREE.MeshStandardMaterial({color:'#779398',roughness:.31,metalness:.12});resources.add(windowGeometry);resources.add(windowMaterial);
  const windows=new THREE.InstancedMesh(windowGeometry,windowMaterial,700);city.add(windows);let wi=0;const dummy=new THREE.Object3D();
  for(let i=0;i<18;i++) {
    const side=i%2?1:-1,x=side*(22+(i%5)*8),z=4-Math.floor(i/2)*12,height=17+(i*13)%51,w=6+(i%3)*2;
    box(city,[w,height,7],[x,height/2,z],i%3===0?'wall':'dark',null,{ray:false});
    for(let floor=2;floor<height-1;floor+=3)for(let col=0;col<3;col++)if(wi<700){dummy.position.set(x-w*.27+col*w*.27,floor,z+3.53);dummy.rotation.set(0,0,0);dummy.updateMatrix();windows.setMatrixAt(wi++,dummy.matrix);}
  }windows.count=wi;windows.instanceMatrix.needsUpdate=true;
  applyCinematicStreet({THREE,scene,street,city,box,register,resources,materials});

  const lobby=new THREE.Group();lobby.name='B_lobby';scene.add(lobby);
  box(lobby,[11.8,.14,12],[0,-.08,-6],'floor');
  // Stone expansion joints and a reception plinth give the room a legible scale.
  for(let x=-5.2;x<=5.2;x+=2.6)box(lobby,[.015,.008,11.7],[x,.002,-6],'metal',null,{ray:false});
  for(let z=-1;z>=-11;z-=2.6)box(lobby,[11.5,.008,.015],[0,.002,z],'metal',null,{ray:false});box(lobby,[.2,3.4,12],[-5.9,1.7,-6],'wall');box(lobby,[.2,3.4,12],[5.9,1.7,-6],'wall');box(lobby,[11.8,.15,12],[0,3.45,-6],'wall');
  for(let x of [-5.77,5.77]) {
    for(let z=-10.5;z<-.8;z+=2.9)box(lobby,[.025,2.9,.10],[x,1.55,z],'metal',null,{ray:false});
  }
  box(lobby,[4.6,3.4,.25],[-3.65,1.7,-12],'wall');box(lobby,[4.6,3.4,.25],[3.65,1.7,-12],'wall');
  for(let z=-2;z>=-10;z-=3.6){lightStrip(lobby,[0,3.34,z],[3,.035,.14]);}
  lamp(lobby,0,2.8,-3,17);lamp(lobby,0,2.8,-10,15);
  plant(lobby,-4.36,0,-2.2,.85);box(lobby,[2.6,.45,1.5],[3.4,.25,-5.55],'wood');box(lobby,[2.5,.32,.48],[3.4,.65,-6.05],'dark');box(lobby,[1.5,.8,1.1],[-3.05,.4,-7.85],'wall');
  panel(lobby,'directory',['楼 层 索 引','09F  启德教育','08F  办公区','01F  大堂'],1.35,1.7,HOTSPOTS.directory.at,Math.PI/2,{font:61,background:'#ede8d8',color:'#344b46'});
  panel(lobby,null,['启德教育','请查阅楼层索引'],2,.5,[3.65,1.8,-11.82],0,{font:68});
  button(lobby,'call-lift',HOTSPOTS['call-lift'].at,0,'↑');
  const lobbyDisplay=panel(lobby,null,['1'],1.2,.28,[0,2.94,-11.80],0,{font:130,background:'#172b30',color:'#d4dcbd'});

  const lift=new THREE.Group();lift.name='C_moving_elevator';scene.add(lift);
  box(lift,[2.75,.14,3.5],[0,-.07,-13.65],'floor');box(lift,[.13,2.75,3.5],[-1.37,1.37,-13.65],'metal');box(lift,[.13,2.75,3.5],[1.37,1.37,-13.65],'metal');box(lift,[2.75,2.75,.13],[0,1.37,-15.34],'metal');box(lift,[2.75,.13,3.5],[0,2.78,-13.65],'white');
  for(const x of [-.95,.95])lightStrip(lift,[x,2.67,-13.6],[.10,.035,2.5]);lamp(lift,0,2.35,-13.5,17,'#fff3dc',5);
  box(lift,[2.2,.035,.07],[0,.95,-15.23],'brass');box(lift,[.08,.035,2.4],[-1.26,.95,-13.7],'brass');
  // Satin-steel seams instead of a featureless metal box.
  for(const x of [-1.22,1.22])for(const z of [-14.6,-13.6,-12.6])box(lift,[.012,2.55,.022],[x,1.34,z],'dark',null,{ray:false});
  const leftDoor=box(lift,[1.27,2.58,.09],[-.635,1.29,-11.99],'metal',null,{shadow:true});
  const rightDoor=box(lift,[1.27,2.58,.09],[.635,1.29,-11.99],'metal',null,{shadow:true});
  panel(lift,null,['操 作 面 板','目的地请查楼层索引'],.75,.75,[1.28,1.65,-14.15],-Math.PI/2,{font:66});
  button(lift,'nine',HOTSPOTS.nine.at,-Math.PI/2,'9F');
  const liftDisplay=panel(lift,null,['1'],1.1,.28,[0,2.58,-12.06],Math.PI,{font:130,background:'#152c32',color:'#d7dfc1'});

  const corridor=new THREE.Group();corridor.name='D_ninth_floor';corridor.position.y=NINTH_FLOOR;scene.add(corridor);
  box(corridor,[6.35,.16,15],[0,-.08,-4.6],'floor');box(corridor,[6.35,.15,15],[0,3.2,-4.6],'wall');box(corridor,[.16,3.2,15],[3.22,1.6,-4.6],'wall');box(corridor,[6.35,3.2,.15],[0,1.6,2.96],'wall');
  for(const x of [-2.23,2.23])box(corridor,[1.7,3.2,.16],[x,1.6,-12.12],'wall');
  box(corridor,[.12,.85,15],[-3.22,.42,-4.6],'wall');box(corridor,[.08,2.2,15],[-3.22,1.94,-4.6],'glass');
  for(let z=-11;z<3;z+=2.5)box(corridor,[.08,3.2,.08],[-3.18,1.6,z],'metal');
  for(let z=-10;z<2;z+=3.4)lightStrip(corridor,[.2,3.09,z],[1.9,.035,.10]);
  lamp(corridor,0,2.7,-8,14,'#fff0d7',10);lamp(corridor,0,2.7,-1,13,'#fff0d7',10);
  panel(corridor,null,['9F · 启德教育','EIC EDUCATION'],3.6,.9,[0,1.95,2.84],Math.PI,{font:76,background:'#d4d3c4',color:'#385c4b'});
  panel(corridor,'corridor-note',['留给走到这里的你','窗边的黄铜叶片，','请放回接待台的叶形凹槽。'],1.04,1.05,[-2.98,1.7,-9.4],Math.PI/2,{font:57,background:'#e7dfc7',color:'#53654d'});
  box(corridor,[3.4,.95,1.3],[.2,.475,-3.25],'wood',null,{shadow:true});box(corridor,[3.5,.08,1.4],[.2,.99,-3.25],'wall');
  box(corridor,[1.1,.06,1],[-2.65,.97,-6],'wall');plant(corridor,2.3,0,.6,.8);
  const leafShape=new THREE.Shape();leafShape.moveTo(0,-.24);leafShape.bezierCurveTo(-.28,-.04,-.27,.18,0,.29);leafShape.bezierCurveTo(.27,.18,.28,-.04,0,-.24);
  const leaf=new THREE.Mesh(new THREE.ExtrudeGeometry(leafShape,{depth:.024,bevelEnabled:true,bevelSize:.012,bevelThickness:.01,bevelSegments:2,steps:1}),materials.brass);leaf.position.set(-2.55,NINTH_FLOOR+1.015,-6);leaf.rotation.x=-Math.PI/2;scene.add(leaf);register(leaf,'leaf');leaf.name='carryable_brass_leaf';
  const vein=box(leaf,[.012,.40,.008],[0,.015,.029],'brass','leaf');
  const groove=new THREE.Mesh(new THREE.ShapeGeometry(leafShape),materials.dark);groove.rotation.x=-Math.PI/2;groove.position.set(.65,1.04,-3.4);groove.scale.setScalar(1.15);corridor.add(groove);register(groove,'socket');
  const socketProxy=box(corridor,[.60,.055,.60],[.65,1.055,-3.4],new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}),'socket');resources.add(socketProxy.material);
  const envelope=new THREE.Group();envelope.position.set(1.32,1.05,-3.4);envelope.rotation.x=-Math.PI/2;corridor.add(envelope);
  box(envelope,[.55,.35,.015],[0,0,0],'white','letter');
  const letterHinge=new THREE.Group();letterHinge.position.set(0,.175,.012);envelope.add(letterHinge);
  const flapShape=new THREE.Shape();flapShape.moveTo(-.275,0);flapShape.lineTo(.275,0);flapShape.lineTo(0,-.215);flapShape.closePath();const flap=new THREE.Mesh(new THREE.ShapeGeometry(flapShape),materials.wall);letterHinge.add(flap);register(flap,'letter');
  const seal=cylinder(letterHinge,.045,.045,.015,[0,-.210,.015],'brass',18,'letter');seal.rotation.x=Math.PI/2;

  const highlight=new THREE.Mesh(new THREE.RingGeometry(.07,.08,32),new THREE.MeshBasicMaterial({color:'#ead6a4',transparent:true,opacity:.65,depthTest:false,toneMapped:false}));scene.add(highlight);highlight.visible=false;resources.add(highlight.geometry);resources.add(highlight.material);
  let lastFloor=-1,leafMode='world',leafTween=null;
  const home=new THREE.Vector3(...HOTSPOTS.leaf.at);home.y-=.005;
  function moveLeaf(mode,camera) {
    if(mode===leafMode)return;leafMode=mode;
    if(mode==='hand')camera.attach(leaf);else scene.attach(leaf);
    leafTween={to:mode==='hand'?new THREE.Vector3(.22,-.22,-.75):mode==='placed'?new THREE.Vector3(.65,NINTH_FLOOR+1.07,-3.4):home.clone(),rot:mode==='hand'?new THREE.Euler(0,0,-.3):new THREE.Euler(-Math.PI/2,0,0)};
  }
  function visible(object) {for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}
  function pick(raycaster) {
    const hits=raycaster.intersectObjects(rayMeshes,false);
    for(const hit of hits) {
      if(!visible(hit.object)||hit.object===leaf&&leafMode==='hand'||hit.object.parent===leaf&&leafMode==='hand')continue;
      return hit.object.userData.hotspot?{id:hit.object.userData.hotspot,point:hit.point,distance:hit.distance}:null;
    }return null;
  }
  function update(dt,core,camera,hand={x:.22,y:-.22,dragging:false}) {
    entryLeft.rotation.y=-core.entry*Math.PI*.48;entryRight.rotation.y=core.entry*Math.PI*.48;
    letterHinge.rotation.x+=((core.flags.letterRead?-Math.PI*.9:0)-letterHinge.rotation.x)*(1-Math.exp(-dt*5));
    entryProxy.visible=core.entry<.98;
    lift.position.y=core.lift.y;leftDoor.position.x=-.635-core.lift.door*1.25;rightDoor.position.x=.635+core.lift.door*1.25;
    if(lastFloor!==core.lift.floor){lastFloor=core.lift.floor;lobbyDisplay.paint(String(lastFloor));liftDisplay.paint(String(lastFloor));}
    for(const press of presses){press.time+=dt;const t=press.time;press.part.position.z=t<.10?-.027*t/.10:t<.34?-.027*(1-(t-.10)/.24):0;press.glow.intensity=press.id==='nine'&&core.flags.ninePressed?1.8:0;}
    moveLeaf(core.held?'hand':core.flags.leafPlaced?'placed':'world',camera);
    if(leafTween){const a=1-Math.exp(-dt*12);leaf.position.lerp(leafTween.to,a);const q=new THREE.Quaternion().setFromEuler(leafTween.rot);leaf.quaternion.slerp(q,a);if(leaf.position.distanceTo(leafTween.to)<.002){leaf.position.copy(leafTween.to);leafTween=null;}}
    else if(leafMode==='hand'){
      const halfHeight=Math.tan(camera.fov*Math.PI/360)*.75;
      const x=hand.dragging?hand.nx*halfHeight*camera.aspect:hand.x,y=hand.dragging?hand.ny*halfHeight:hand.y;
      leaf.position.lerp(new THREE.Vector3(x,y,-.75),1-Math.exp(-dt*(hand.dragging?26:12)));
    }
  }
  function press(id) {const p=presses.find(p=>p.id===id);if(p)p.time=0;}
  function setHighlight(hit,camera,near) {highlight.visible=Boolean(hit&&near);if(highlight.visible){highlight.position.copy(hit.point);highlight.lookAt(camera.position);highlight.position.addScaledVector(new THREE.Vector3().subVectors(camera.position,hit.point).normalize(),.02);highlight.scale.setScalar(Math.max(.6,hit.distance*.45));}}
  function dispose() {for(const r of resources)r.dispose?.();for(const m of Object.values(materials))m.dispose();scene.traverse(o=>{if(o.isMesh&&o.material&&!Object.values(materials).includes(o.material))o.material.dispose?.();});}
  scene.updateMatrixWorld(true);
  return {scene,materials,targets,rayMeshes,lift,entryLeft,entryRight,leftDoor,rightDoor,leaf,letterHinge,presses,pick,press,update,setHighlight,dispose,geometryVersion:1,textureCount};
}
