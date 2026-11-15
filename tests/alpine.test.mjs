import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AlpineState,findPath,isWalkable,walkingHeight,riverAt,patrol,HOTSPOTS,RIVER,baseHeight,groundHeight} from '../dist/alpine/core.mjs';
import {createAlpineScene} from '../dist/alpine/scene.mjs';
import * as THREE from '../dist/vendor/three.module.mjs';

const world=createAlpineScene(),camera=new THREE.PerspectiveCamera(48,1.4,.1,250),caster=new THREE.Raycaster(),state=new AlpineState();
camera.position.set(35,43,50);
for(const[id,spot]of Object.entries(HOTSPOTS)){camera.lookAt(new THREE.Vector3(...spot.at));camera.updateMatrixWorld(true);world.scene.updateMatrixWorld(true);caster.setFromCamera(new THREE.Vector2(),camera);assert.equal(world.pick(caster)?.id,id,'Actual mesh ray must reach '+id);}
const routes=[];
for(const goal of [{x:-3.8,z:-1.5},{x:7,z:-5},{x:12,z:9},{x:-14,z:-19}]){
 const game=new AlpineState();assert.ok(game.walkTo(goal));const planned=game.walker.path.map(p=>({...p}));let frames=0;
 while(game.walker.path.length&&frames<8000){game.update(1/60);assert.ok(isWalkable(game.walker.x,game.walker.z));assert.ok(Number.isFinite(game.walker.y));frames++;}
 assert.equal(game.walker.path.length,0,'Route must finish without teleporting');for(let i=0;i<70;i++)game.update(1/60);assert.ok(Math.hypot(game.walker.vx,game.walker.vz)<.002,'Movement decelerates');
 routes.push({goal,frames,final:{x:game.walker.x,y:game.walker.y,z:game.walker.z},steps:planned.length,crossedBridge:planned.some(p=>Math.abs(p.z+5)<.8&&p.x>2.7&&p.x<7.3||Math.abs(p.z-10)<.8&&p.x> -7.5&&p.x< -1.7)});
}
assert.ok(routes.some(r=>r.crossedBridge),'Routes use actual bridge corridors');
assert.equal(isWalkable(-2,-1.5),false,'Cannot walk through fountain');assert.equal(isWalkable(9.5,-1),false,'Cannot walk through workshop');assert.equal(isWalkable(5,-3),false,'Cannot walk into stream');assert.equal(isWalkable(5,-5),true,'Bridge makes the crossing walkable');
for(const p of RIVER){assert.ok(baseHeight(p[0],p[1])>p[2]-.4,'Stream cannot float above the mountain/meadow banks');assert.ok(groundHeight(p[0],p[1])<p[2],'Water bed is actually carved under the surface');}
assert.equal(state.setWeather('storm'),false);assert.equal(state.setDay('midnight'),false);const firstCable=world.cableCars[0].position.clone();
for(const weather of ['sun','rain','fog','snow']){state.setWeather(weather);for(const day of ['morning','noon','evening']){state.setDay(day);for(let i=0;i<120;i++){state.update(1/60);world.update(1/60,state,camera);}assert.ok(Number.isFinite(world.scene.fog.near));}}
assert.ok(world.cableCars[0].position.distanceTo(firstCable)>1,'Cable car moves in actual world coordinates');assert.equal(world.materials.window.emissiveIntensity>1,true,'Evening windows light up');
const actor=world.villagers[3],before=actor.mesh.position.clone();for(let i=0;i<180;i++){state.update(1/60);world.update(1/60,state,camera);}assert.ok(actor.mesh.position.distanceTo(before)>.01,'Baker walks in space');
const cableFrozen=world.cableCars[0].position.clone();for(let i=0;i<10;i++)world.update(1/60,state,camera,{quiet:true});assert.ok(world.cableCars[0].position.distanceTo(cableFrozen)<.0001,'Reduced motion freezes cable without resetting it');
world.action('flock',state);assert.ok(state.flockCall>state.time);world.action('fountain',state);world.action('cheese',state);world.update(1/60,state,camera);
const frozen={...state.walker},time=state.time;state.paused=true;state.update(.05,{x:1});assert.equal(state.time,time);assert.deepEqual(state.walker,frozen);
let meshes=0,triangles=0,instances=0;world.scene.traverse(o=>{if(o.isMesh){meshes++;instances+=o.isInstancedMesh?o.count:1;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}});assert.ok(meshes<180);assert.ok(triangles<180000);assert.equal(world.animals.length,19);assert.equal(world.villagers.length,4);
const shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>',uniforms:{}};world.materials.pine.onBeforeCompile(shader);assert.ok(shader.vertexShader.includes('#ifdef USE_INSTANCING'));assert.ok(shader.fragmentShader.includes('cloudBand'));assert.ok(shader.uniforms.uAlpineTime);
const report={verification:'Node simulation, actual Three.js geometry/rays; not WebGL rendering',browserVerified:false,iPadHardwareVerified:false,threeRevision:THREE.REVISION,meshes,triangles,instances,characters:world.stats,routes,weather:['sun','rain','fog','snow'],times:['morning','noon','evening'],assertions:['Six real scene target rays','Four continuously walked collision-aware routes, including bridges','River/building boundaries and deceleration','Twelve weather/time update combinations, evening window lighting','Moving cable and bakery sprite; reduced-motion phase continuity','Flock/wish/cheese actions and pause']};
if(process.argv.includes('--write-evidence'))fs.writeFileSync(new URL('../dist/alpine/verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
world.dispose();console.log(`PASS: Alpine routes/bridges, six mesh rays, weather/time, cable, pixel actors, 19 animals, ${Math.round(triangles)} triangles. NOT browser/GPU/iPad validation.`);
