import * as THREE from './assets/vendor/three/three.module.min.js';
import { GLTFLoader } from './assets/vendor/three/loaders/GLTFLoader.js';
import { createReliefField, sampledHeight } from './winter-relief-field.js';

const modelURL = new URL('./assets/winter-v2/plaster/winter-herbarium.glb', import.meta.url);
const coverDistance = 13.7;
const positions = [
  [0, 0, coverDistance], [.38,-3.4,12.4], [.59,-7.4,11.8],
  [.15,-11.1,11.45], [-.37,-14.2,11.4], [-.61,-17.0,11.75],
  [-.34,-20.75,12.05], [.27,-22.75,12.42], [.1,-25.01,13.15]
];
const rail = new THREE.CatmullRomCurve3(positions.map(point=>new THREE.Vector3(...point)));
const day = new THREE.Color(0xeaeae7);
const evening = new THREE.Color(0xd1d5dc);
const finalWarmth = new THREE.Color(0xece6dd);

function reliefMaterial(field, direction, text) {
  return new THREE.ShaderMaterial({
    uniforms:{...field.room,liftMap:field.map,plaster:{value:field.backdrop},direction,
      fixedDepth:{value:text ? .74 : 0},ink:{value:text ? .27 : 0}},
    vertexShader:sampledHeight + `
      uniform vec3 direction;
      varying float illumination;
      varying float exposure;
      varying float occlusion;
      void main() {
        vec4 stone = modelMatrix * vec4(position,1.);
        float lift = reliefAt(stone.xy);
        float scaleX = length(modelMatrix[0].xyz);
        float scaleY = length(modelMatrix[1].xyz);
        vec2 gradient = vec2(reliefAt(stone.xy+vec2(.12,0.))-lift, reliefAt(stone.xy+vec2(0.,.12))-lift) / .12;
        vec3 bent = vec3(normal.xy,normal.z/lift);
        bent.xy -= bent.z * max(0.,position.z) * gradient * vec2(scaleX,scaleY);
        vec3 normalInView = normalize(normalMatrix * bent);
        illumination = clamp(dot(normalInView,direction)*.5 + .5,0.,1.);
        exposure = smoothstep(.07,.66,lift);
        stone.z = stone.z > 0. ? stone.z * lift : stone.z;
        occlusion = (1.-smoothstep(.016,.32,stone.z)) * .047;
        gl_Position = projectionMatrix * viewMatrix * stone;
      }
    `,
    fragmentShader:`
      uniform vec3 plaster;
      uniform float ink;
      varying float illumination;
      varying float exposure;
      varying float occlusion;
      void main() {
        float shaped = .69 + .41 * illumination - occlusion;
        float value = mix(.992, shaped, .13 + exposure * .87) - ink;
        gl_FragColor = vec4(plaster * value,1.);
        #include <colorspace_fragment>
      }
    `
  });
}

export async function mountReliefWall(host, {signal,report,onContextLost,title}) {
  if (signal.aborted) return null;
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', {alpha:false,antialias:false,powerPreference:'high-performance'});
  if (!gl) throw new Error('无法创建 WebGL 2 context');
  const gpu = gl.getExtension('WEBGL_debug_renderer_info');
  const device = gpu ? gl.getParameter(gpu.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  const software = /llvmpipe|softpipe|swiftshader|software/i.test(device);
  const lean = software || (navigator.hardwareConcurrency ?? 8) <= 4 || (navigator.deviceMemory ?? 8) <= 2;
  report({webgl:'WebGL 2', device});
  const renderer = new THREE.WebGLRenderer({canvas,context:gl,alpha:false,antialias:false});
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.debug.onShaderError = (context, program, vertex, fragment) => {
    const error = [context.getProgramInfoLog(program),context.getShaderInfoLog(vertex),context.getShaderInfoLog(fragment)]
      .filter(Boolean).join('\n');
    report({shaderError:error || 'WebGL program link failed'});
  };
  const field = createReliefField(renderer);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38,1,.16,72);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(68,63),field.wall);
  ground.position.y=-14;
  ground.renderOrder=-1;
  scene.add(ground);
  const direction = {value:new THREE.Vector3()};
  const flowers = reliefMaterial(field,direction,false);
  const lettering = reliefMaterial(field,direction,true);
  const motifs = [];
  const ray = new THREE.Raycaster();
  const wallPlane = new THREE.Plane(new THREE.Vector3(0,0,1),0);
  const vector = new THREE.Vector3();
  const rayPosition = new THREE.Vector2();
  const cameraPoint = new THREE.Vector3();
  const projected = new THREE.Vector3();
  let inscription, cancelled=false, resizePending=true, observer;
  let width=0,height=0,spread=1;
  let density = lean ? .69 : Math.min(1.7,devicePixelRatio||1);
  let humanPoint = null, nextGhost = 1.3, ghost = null, previousGhost = null, ghostIndex = 0;
  let firstBrushTime = 0;
  let previousDraw = 0;

  function dispose() {
    if (cancelled)return;
    cancelled = true;
    observer?.disconnect();
    for(const mesh of scene.children)mesh.geometry?.dispose();
    flowers.dispose();lettering.dispose();
    field.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }
  signal.addEventListener('abort',dispose,{once:true});
  canvas.addEventListener('webglcontextlost', event=>{
    if(cancelled)return;
    event.preventDefault();
    onContextLost('WebGL context lost');
  });

  function fit() {
    if(!host.clientWidth || !host.clientHeight)return false;
    resizePending=false;
    width=host.clientWidth;height=host.clientHeight;
    const aspect=width/height;
    spread=THREE.MathUtils.clamp(aspect / 1.46, .56, 1.34);
    camera.aspect=aspect;
    camera.updateProjectionMatrix();
    const ratio=Math.min(density,Math.sqrt((lean?1080000:3300000)/(width*height)));
    renderer.setDrawingBufferSize(width,height,ratio);
    for(const motif of motifs)motif.mesh.position.x=motif.x*spread;
    const box=title.getBoundingClientRect();
    const stageTop=host.getBoundingClientRect().top;
    const distance=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*coverDistance/height;
    inscription.scale.setScalar(box.width*.975*distance/9.5);
    inscription.position.set(0,(height/2 - (box.top-stageTop+box.height/2))*distance,.02);
    return true;
  }

  function worldAt(x,y) {
    rayPosition.set(x*2-1, 1-y*2);
    ray.setFromCamera(rayPosition,camera);
    if(!ray.ray.intersectPlane(wallPlane,vector))return null;
    return {x:vector.x,y:vector.y};
  }

  function motifPoints() {
    return motifs.flatMap(({mesh,crest})=>{
      if(!mesh.visible)return [];
      projected.copy(crest).applyMatrix4(mesh.matrixWorld);
      const x=projected.x,y=projected.y;
      projected.z=0;
      projected.project(camera);
      if(Math.abs(projected.x)>.94||Math.abs(projected.y)>.94)return [];
      return [{x,y,screen:[(projected.x+1)/2,(1-projected.y)/2]}];
    });
  }

  function ambientTrail(seconds,lastInput) {
    if(seconds-lastInput<2.8) {ghost=null;previousGhost=null;return null;}
    if(!ghost && seconds>=nextGhost){
      const options=motifPoints();
      if(!options.length){nextGhost=seconds+.63;return null;}
      const choice=options[ghostIndex++%options.length];
      ghost={x:choice.x,y:choice.y,started:seconds,flip:ghostIndex%2 ? 1 : -1};
      previousGhost=null;
    }
    if(!ghost)return null;
    const along=(seconds-ghost.started)/1.20;
    if(along>=1){
      ghost=null;
      nextGhost=seconds+2.7+Math.sin(ghostIndex*1.37)*.52;
      return null;
    }
    const eased=along*along*(3-2*along);
    const point={x:ghost.x+(eased-.5)*1.78*ghost.flip,
      y:ghost.y + Math.sin(eased*Math.PI*1.18)*.33 + .11*Math.sin(eased*9)};
    const from=previousGhost || point;
    previousGhost=point;
    return {from,to:point,radius:1.16,strength:.72*Math.sin(Math.PI*.2+along*Math.PI*.65)};
  }

  try {
    report({model:'loading',textures:'正在建立 256 × 256 位移场'});
    const response=await fetch(modelURL,{signal});
    if(!response.ok)throw new Error('浮雕模型 HTTP '+response.status);
    const glb=await new GLTFLoader().parseAsync(await response.arrayBuffer(),new URL('.',modelURL).href);
    if(cancelled){
      glb.scene.traverse(item=>{item.geometry?.dispose();item.material?.dispose();});
      return null;
    }
    const originalMaterials=new Set();
    for(const mesh of [...glb.scene.children]){
      if(!mesh.isMesh)continue;
      const isText=mesh.name.includes('WINTER');
      originalMaterials.add(mesh.material);
      mesh.material=isText?lettering:flowers;
      mesh.frustumCulled=false;
      scene.add(mesh);
      field.add(mesh,isText?.74:0);
      if(isText){inscription=mesh;continue;}
      mesh.scale.z*=.79;
      mesh.position.z*=.79;
      const points=mesh.geometry.getAttribute('position');
      let high=0;
      for(let i=1;i<points.count;i++)if(points.getZ(i)>points.getZ(high))high=i;
      const crest=new THREE.Vector3().fromBufferAttribute(points,high);
      motifs.push({mesh,crest,x:mesh.position.x});
    }
    originalMaterials.forEach(material=>material.dispose());
    if(!inscription || motifs.length!==8)throw new Error('模型未包含完整的浮雕节点');
    host.append(canvas);
    fit();
    observer=new ResizeObserver(()=>{resizePending=true;});
    observer.observe(host);
    report({model:'8 组原创实体浮雕及 WINTER 刻字',textures:'256 × 256 GPU 双缓冲场及动态投影已建立'});

    return {
      resize(){resizePending=true;},
      draw({progress,seconds,night,input,lastInput,view}) {
        if(cancelled)return null;
        if(resizePending&&!fit())return null;
        rail.getPoint(progress,cameraPoint);
        camera.position.set(cameraPoint.x*spread,cameraPoint.y,cameraPoint.z);
        camera.lookAt(cameraPoint.x*spread*.91,cameraPoint.y,0);
        camera.updateMatrixWorld();
        inscription.visible=view!=='scenery'&&progress<.21;
        for(const {mesh} of motifs)mesh.visible=Math.abs(mesh.position.y-cameraPoint.y)<9.1;
        scene.updateMatrixWorld();
        const ambient=ambientTrail(seconds,lastInput);
        const point=input ? worldAt(input.x,input.y) : null;
        if(point&&!humanPoint)firstBrushTime=seconds;
        const speed=point&&humanPoint ? Math.hypot(point.x-humanPoint.x,point.y-humanPoint.y) : 0;
        const from=speed<4.5 ? humanPoint||point : point;
        const brush=point?{from,to:point,radius:input.touch?1.52:1.25,
          strength:Math.min(1.,.87+speed*.22+(seconds-firstBrushTime)*.08)}:null;
        humanPoint=point;
        const dt=Math.min(.35,Math.max(.013,seconds-previousDraw));
        previousDraw=seconds;
        field.step(dt,brush,ambient);
        const warmth=THREE.MathUtils.smoothstep(progress,.65,.84);
        field.backdrop.copy(day).lerp(finalWarmth,warmth*.64).lerp(evening,night);
        const drift=Math.sin(seconds*.43);
        const lightX=-.54+.12*drift+.38*night;
        const lightY=.59+.08*Math.sin(seconds*.39);
        field.lightVector.value.set(lightX,lightY);
        direction.value.set(lightX,lightY,1).transformDirection(camera.matrixWorldInverse);
        field.shadows(scene);
        renderer.render(scene,camera);
        return {camera:[camera.position.x,camera.position.y,camera.position.z],resolution:[canvas.width,canvas.height],
          triangles:renderer.info.render.triangles,trace:brush ? (input.touch?'touch':'mouse') : ambient ? 'auto' : 'decay'};
      },
      scaleResolution(factor){
        const next=THREE.MathUtils.clamp(density*factor,lean?.51:.65,lean?.96:Math.min(1.7,devicePixelRatio||1));
        if(Math.abs(next-density)<.026)return false;
        density=next;
        resizePending=true;
        return true;
      },
      probe(x,y){
        const point=worldAt(x,y);
        return point ? {...field.probe(point),point} : null;
      },
      visibleMotifs:motifPoints
    };
  } catch(error){
    dispose();
    throw error;
  }
}
