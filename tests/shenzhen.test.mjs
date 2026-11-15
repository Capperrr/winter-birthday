import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ShenzhenGame,HOTSPOTS,NINTH_FLOOR} from '../dist/shenzhen/game-core.mjs';
import {createWorld} from '../dist/shenzhen/world.mjs';
import * as THREE from '../dist/shenzhen/vendor/three.module.mjs';

export function walkTo(game,x,z,limit=1800) {
  for(let i=0;i<limit;i++) {
    const dx=x-game.player.x,dz=z-game.player.z,d=Math.hypot(dx,dz);
    if(d<.06){for(let j=0;j<12;j++)game.update(1/60,{});return;}
    game.yaw=Math.atan2(-dx,-dz);game.update(1/60,{forward:Math.min(1,d*2)});
    assert.ok(game.canOccupy(game.player.x,game.player.z),'Moving capsule must stay inside navigable space');
  }
  throw Error(`Path blocked toward ${x},${z}; player=${JSON.stringify(game.player)} zone=${game.zone}`);
}
function wait(game,seconds,input={}) {for(let i=0;i<Math.ceil(seconds*60);i++)game.update(1/60,input);}
const game=new ShenzhenGame(),trace=[],world=createWorld(),camera=new THREE.PerspectiveCamera(62,1,.06,180);world.scene.add(camera);
const caster=new THREE.Raycaster();caster.far=10;
function action(id) {
  world.update(0,game,camera);camera.position.set(game.player.x,game.player.y+1.62,game.player.z);camera.lookAt(new THREE.Vector3(...game.point(id)));world.scene.updateMatrixWorld(true);
  caster.setFromCamera(new THREE.Vector2(0,0),camera);
  const hit=world.pick(caster);
  assert.equal(hit?.id,id,`${id}: actual Three.js first visible mesh must be the requested object`);
  const result=game.interact(id,{visible:hit.id===id});
  trace.push({action:id,result:result.ok,zone:game.zone,position:{...game.player},flags:{...game.flags},lift:{...game.lift}});
  return result;
}

assert.equal(game.interact('street-sign').ok,false,'Cannot investigate a distant street sign');
assert.equal(game.skipRide(),false,'No skipping before the required interactions');
walkTo(game,0,1.65);assert.equal(action('c-entry').ok,false,'Entry is gated by sign investigation');
game.yaw=0;wait(game,2,{forward:1});assert.equal(game.zone,'street');assert.ok(game.player.z>.30,'Closed door physically blocks movement');
walkTo(game,0,8.8);walkTo(game,-3.2,8.8);assert.equal(action('street-sign').ok,true);
walkTo(game,0,8.8);walkTo(game,0,1.65);assert.equal(action('c-entry').ok,true);wait(game,1.1);walkTo(game,0,-3);
assert.equal(game.zone,'lobby');assert.equal(game.flags.enteredLobby,true);
walkTo(game,0,-10.2);walkTo(game,1.7,-10.3);assert.equal(action('call-lift').ok,false,'Call is gated by the directory');
walkTo(game,-4.25,-4.5);assert.equal(action('directory').ok,true);assert.equal(game.flags.directoryRead,true);
walkTo(game,0,-6.7);walkTo(game,1.7,-10.3);assert.equal(action('call-lift').ok,true);wait(game,1.3);
walkTo(game,0,-13.55);assert.equal(game.zone,'elevator');assert.equal(action('nine').ok,true);
const press=world.presses.find(p=>p.id==='nine');world.press('nine');world.update(.08,game,camera);assert.ok(press.part.position.z<-.015,'Physical button visibly depresses');world.update(.4,game,camera);assert.equal(press.part.position.z,0,'Physical button returns');
game.yaw=Math.PI;wait(game,1,{forward:1});assert.equal(game.zone,'elevator');assert.ok(game.player.z< -12.50,'Cannot escape a closing cab');
const rideMid=JSON.parse(JSON.stringify(game.snapshot()));const resumed=new ShenzhenGame(rideMid);assert.equal(resumed.lift.phase,game.lift.phase);assert.ok(Math.abs(resumed.lift.door-game.lift.door)<.001);
const doors=[];for(let i=0;i<690;i++){game.update(1/60,{});world.update(1/60,game,camera);doors.push({door:game.lift.door,y:game.lift.y,phase:game.lift.phase});}
assert.equal(game.lift.phase,'arrived');assert.equal(game.player.y,NINTH_FLOOR);assert.equal(world.lift.position.y,NINTH_FLOOR);assert.equal(game.lift.floor,9);
assert.ok(doors.some(p=>p.phase==='rising'&&p.door===0&&p.y>1&&p.y<NINTH_FLOOR));assert.ok(doors.some(p=>p.phase==='opening'&&p.door>0&&p.door<1));assert.equal(game.lift.door,1);
const events=game.journal.map(e=>e.type);assert.ok(events.indexOf('lift:doors-closed')<events.indexOf('lift:arrived'));assert.ok(events.indexOf('lift:arrived')<events.indexOf('lift:doors-open'));
assert.deepEqual(game.journal.filter(e=>e.type==='lift:floor').map(e=>e.floor),[2,3,4,5,6,7,8,9]);
walkTo(game,0,-10.4);assert.equal(game.zone,'corridor');
walkTo(game,1.32,-4.7);assert.equal(action('letter').ok,false,'Letter stays locked before environmental puzzle');assert.equal(action('socket').ok,false,'Socket requires the environmental clue');
walkTo(game,0,-7.8);walkTo(game,-1.85,-9.4);assert.equal(action('corridor-note').ok,true);
walkTo(game,-1.65,-6);assert.equal(action('leaf').ok,true);assert.equal(game.held,'leaf');
for(const aspect of [.6,1.33,1.78]){
  camera.aspect=aspect;camera.updateProjectionMatrix();
  for(let i=0;i<120;i++)world.update(1/60,game,camera,{dragging:true,nx:.4,ny:-.2,x:.2,y:-.1});
  world.scene.updateMatrixWorld(true);const projected=world.leaf.getWorldPosition(new THREE.Vector3()).project(camera);
  assert.ok(Math.abs(projected.x-.4)<.02&&Math.abs(projected.y+.2)<.02,'Held object follows pointer projection at phone/iPad/desktop aspect');
}
assert.equal(game.cancelCarry(),true);assert.equal(game.held,null);
for(let i=0;i<60;i++)world.update(1/60,game,camera);
assert.equal(world.leaf.parent,world.scene,'Cancelled object returns from camera to world');
assert.equal(action('leaf').ok,true,'Returned object can be picked up again');
walkTo(game,.65,-4.7);assert.equal(action('socket').ok,true);assert.equal(game.flags.leafPlaced,true);assert.equal(game.held,null);
world.update(.1,game,camera);world.update(.1,game,camera);
walkTo(game,1.32,-4.7);assert.equal(action('letter').ok,true);assert.equal(game.flags.letterRead,true);
world.update(.25,game,camera);assert.ok(world.letterHinge.rotation.x< -1,'Unlocked envelope flap physically opens around its hinge');
const final=new ShenzhenGame(game.snapshot());assert.equal(final.flags.letterRead,true);assert.equal(final.zone,'corridor');assert.equal(final.held,null);
const corrupt=new ShenzhenGame({version:1,flags:{arrived:true,letterRead:true,leafPlaced:true},zone:'corridor',player:{x:999,z:-999}});assert.equal(corrupt.flags.letterRead,false);assert.equal(corrupt.flags.arrived,false);assert.equal(corrupt.zone,'street');assert.ok(corrupt.canOccupy(corrupt.player.x,corrupt.player.z));
const skipped=new ShenzhenGame(rideMid);assert.equal(skipped.skipRide(),true);assert.equal(skipped.lift.phase,'arriving');assert.equal(skipped.lift.door,0);assert.equal(skipped.zone,'elevator');wait(skipped,2);assert.equal(skipped.lift.phase,'arrived');assert.equal(skipped.flags.leafPlaced,false);
const wallBlock=new THREE.Mesh(new THREE.BoxGeometry(1.5,2.5,.2),new THREE.MeshBasicMaterial());wallBlock.position.set(game.player.x,game.player.y+1.4,game.player.z+.6);world.scene.add(wallBlock);world.rayMeshes.unshift(wallBlock);world.scene.updateMatrixWorld(true);caster.set(camera.position,new THREE.Vector3(0,0,1));assert.equal(world.pick(caster),null,'Opaque noninteractive geometry blocks interaction rays');
let meshCount=0,triangleEstimate=0;world.scene.traverse(o=>{if(o.isMesh){meshCount++;triangleEstimate+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}});assert.ok(meshCount>100);assert.ok(triangleEstimate<150000);
const report={kind:'automated-simulation-and-real-three-raycast',notBrowserScreenshot:true,browserValidated:false,iPadHardwareValidated:false,status:'mechanics-implemented-awaiting-browser-and-device-acceptance',threeRevision:THREE.REVISION,meshCount,triangleEstimate:Math.round(triangleEstimate),worldHeightMeters:NINTH_FLOOR,actions:trace,journal:game.journal,assertions:['Continuous capsule movement used for every location; no test teleports','Entry/sign and lobby/directory gates enforced','First-hit Three.js rays tested for every interaction','Physical 9F press and return transforms tested','Closed door, full vertical ride, floor 2–9, arrival and opening tested','Skip only after pressing 9F; puzzle still locked','Nine-floor clue, pickup/cancel/re-pick, socket and letter sequence tested','Checkpoint restoration and invalid-save sanitization tested'],pending:['Actual browser/WebGL rendering and visual screenshots','iPad Safari multitouch on physical device','Real-building art/floorplan calibration']};
if(process.argv.includes('--write-evidence'))fs.writeFileSync(new URL('../dist/shenzhen/simulation-evidence.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
world.dispose();wallBlock.geometry.dispose();wallBlock.material.dispose();
console.log(`PASS: Full physically-steered Shenzhen route, gated actions, ${meshCount} real Three.js meshes/raycast tests, 9F press/ride/doors, environmental puzzle, checkpoint/skip guards. NOT browser or iPad hardware validation.`);
