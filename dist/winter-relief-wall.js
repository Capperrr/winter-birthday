import * as THREE from './assets/vendor/three/three.module.min.js';
import { GLTFLoader } from './assets/vendor/three/loaders/GLTFLoader.js';
import { createReliefField, maxBrushSegments, galleryLight, sampledHeight } from './winter-relief-field.js?v=plaster-light';
import { gardenLandmarks, loadSecretGarden, sculptGarden } from './winter-secret-garden.js?v=plaster-light';

const modelURL = new URL('./assets/winter-v2/plaster/winter-herbarium.glb?v=photographic-acts', import.meta.url);
const coverDistance = 9.6;
const coverX = .14;
const coverY = .46;
const positions = [
  [coverX, coverY, coverDistance], [.38,-3.4,12.4], [.59,-7.4,11.8],
  [.15,-11.1,11.45], [-.37,-14.2,11.4], [-.61,-17.0,11.75],
  [-.34,-20.75,12.05], [.27,-22.75,12.42], [.1,-25.01,13.15]
];
const rail = new THREE.CatmullRomCurve3(positions.map(point=>new THREE.Vector3(...point)));
rail.arcLengthDivisions = 360;
const day = new THREE.Color(0xf0ebe3);
const evening = new THREE.Color(0x283646);
const finalWarmth = new THREE.Color(0xece6dd);
const firstBrushDelay = 5;
const idleBrushDelay = 8;
const maxCanvasPixels = 6_200_000;
const shadowDepth = 1.12;

function reliefMaterial(field, direction, text) {
  return new THREE.ShaderMaterial({
    uniforms:{...field.room,...field.light,liftMap:field.map,direction,
      fixedDepth:{value:text ? .74 : 0},inscription:{value:text}},
    vertexShader:sampledHeight + `
      uniform vec3 direction;
      varying float illumination;
      varying float raised;
      varying float occlusion;
      varying vec2 wallPoint;
      void main() {
        vec4 stone = modelMatrix * vec4(position,1.);
        wallPoint = stone.xy;
        raised = reliefAmount(wallPoint);
        float lift = reliefScale(raised);
        float scaleX = length(modelMatrix[0].xyz);
        float scaleY = length(modelMatrix[1].xyz);
        float scaleZ = length(modelMatrix[2].xyz);
        vec2 gradient = vec2(
          reliefScale(reliefAmount(wallPoint+vec2(.12,0.)))-lift,
          reliefScale(reliefAmount(wallPoint+vec2(0.,.12)))-lift
        ) / .12;
        vec3 bent = vec3(normal.xy,normal.z/lift);
        bent.xy -= bent.z * (max(0.,stone.z)/scaleZ) * gradient * vec2(scaleX,scaleY);
        vec3 normalInView = normalize(normalMatrix * bent);
        illumination = clamp(dot(normalInView,direction)*.57 + .43,0.,1.);
        stone.z = displacedDepth(stone.z,lift);
        occlusion = (1.-smoothstep(.02,.31,stone.z)) * .075 * raised;
        gl_Position = projectionMatrix * viewMatrix * stone;
        // Keep the raised inscription legible where fronds cross it in portrait.
        gl_Position.z -= fixedDepth * .012 * gl_Position.w;
      }
    `,
    fragmentShader:galleryLight + `
      uniform bool inscription;
      varying float illumination;
      varying float raised;
      varying float occlusion;
      varying vec2 wallPoint;
      void main() {
        float shaped = .62 + .49 * illumination - occlusion;
        float detail = mix(.012, 1., smoothstep(.025,.77,raised));
        vec3 color = roomPlaster(wallPoint) * mix(1.,shaped,detail);
        if (inscription) {
          vec3 etched = color * vec3(.95,.89,.80) * (.122+.108*illumination);
          vec3 silver = mix(moonColor, vec3(.79,.86,.95),.49) * (.70+.30*illumination);
          color = mix(etched, silver, nightAmount);
        }
        gl_FragColor = vec4(color,1.);
        #include <colorspace_fragment>
      }
    `
  });
}

export async function mountReliefWall(host, {signal,report,onContextLost,title}) {
  if (signal.aborted) return null;
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', {
    alpha:true,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:true
  });
  if (!gl) throw new Error('无法创建 WebGL 2 context');
  const gpu = gl.getExtension('WEBGL_debug_renderer_info');
  const device = gpu ? gl.getParameter(gpu.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  report({webgl:'WebGL 2', device});
  const renderer = new THREE.WebGLRenderer({canvas,context:gl,alpha:true,antialias:false});
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
  const viewBounds = new THREE.Frustum();
  const viewProjection = new THREE.Matrix4();
  const meshBounds = new THREE.Box3();
  const strokeBounds = new THREE.Box2();
  const projectedBounds = new THREE.Box2();
  let inscription, garden, cancelled=false, resizePending=true, observer;
  let width=0,height=0,spread=1;
  let lastContact = null, nextGhost = firstBrushDelay, ghost = null, previousGhost = null, ghostIndex = 0;
  let previousDraw = -Infinity, previousProgress=-1, previousNight=-1, previousView;
  let lastInk=-Infinity, inkVisible=false;

  function dispose() {
    if (cancelled)return;
    cancelled = true;
    observer?.disconnect();
    for(const mesh of scene.children)mesh.geometry?.dispose();
    garden?.dispose();
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
    spread=THREE.MathUtils.clamp(aspect / 1.38, .46, 1.64);
    camera.aspect=aspect;
    camera.updateProjectionMatrix();
    const ratio=Math.min(devicePixelRatio||1,3,Math.sqrt(maxCanvasPixels/(width*height)));
    renderer.setDrawingBufferSize(width,height,ratio);
    for(const motif of motifs)motif.mesh.position.x=motif.x*spread;
    const compositionScale=Math.min(1,aspect/1.05);
    garden.mesh.scale.setScalar(compositionScale);
    garden.mesh.position.y=.94*(1-compositionScale);
    const box=title.getBoundingClientRect();
    const stageBox=host.getBoundingClientRect();
    const distance=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*coverDistance/height;
    inscription.scale.setScalar(box.width*.975*distance/9.5);
    inscription.position.set(coverX + (box.left-stageBox.left+box.width/2-width/2)*distance,
      coverY+(height/2-(box.top-stageBox.top+box.height/2))*distance,.02);
    return true;
  }

  function worldAt(x,y) {
    rayPosition.set(x*2-1, 1-y*2);
    ray.setFromCamera(rayPosition,camera);
    if(!ray.ray.intersectPlane(wallPlane,vector))return null;
    return {x:vector.x,y:vector.y};
  }

  function motifPoints() {
    const landmarks=gardenLandmarks.map(({name,point})=>({mesh:garden.mesh,crest:point,name}));
    return [...landmarks,...motifs].flatMap(({mesh,crest,name=mesh.name})=>{
      if(!mesh.visible)return [];
      projected.copy(crest).applyMatrix4(mesh.matrixWorld);
      const x=projected.x,y=projected.y;
      projected.z=0;
      projected.project(camera);
      if(Math.abs(projected.x)>.94||Math.abs(projected.y)>.94)return [];
      return [{name,x,y,screen:[(projected.x+1)/2,(1-projected.y)/2]}];
    });
  }

  function isInFrame(mesh){
    meshBounds.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld).expandByScalar(.7);
    return viewBounds.intersectsBox(meshBounds);
  }

  function ambientTrail(seconds,lastInput,hasContact) {
    if(hasContact||seconds-lastInput<idleBrushDelay) {ghost=null;previousGhost=null;return null;}
    if(!ghost && seconds>=nextGhost){
      const options=motifPoints();
      if(!options.length){nextGhost=seconds+.63;return null;}
      const choice=options[ghostIndex++%options.length];
      ghost={x:choice.x,y:choice.y,started:seconds,flip:ghostIndex%2 ? 1 : -1};
      previousGhost=null;
    }
    if(!ghost)return null;
    const along=(seconds-ghost.started)/1.55;
    if(along>=1){
      ghost=null;
      nextGhost=seconds+9+Math.sin(ghostIndex*1.37)*.95;
      return null;
    }
    const eased=along*along*(3-2*along);
    const point={x:ghost.x+(eased-.5)*.78*ghost.flip,
      y:ghost.y + Math.sin(eased*Math.PI*1.18)*.15 + .06*Math.sin(eased*9)};
    const from=previousGhost || point;
    previousGhost=point;
    return {from,to:point,radius:.72,strength:.67*Math.sin(Math.PI*.13+along*Math.PI*.73)};
  }

  function contactTrail(contacts,input,reach) {
    const segments=[];
    const samples=contacts.length?contacts:input?[{...input,point:null,join:true}]:[];
    for(const sample of samples){
      const point=sample.point||worldAt(sample.x,sample.y);
      if(!point)continue;
      const previous=sample.join&&lastContact?.touch===sample.touch?lastContact.point:point;
      segments.push({from:previous,to:point});
      lastContact={point,touch:sample.touch};
    }
    const touch=Boolean(lastContact?.touch);
    if(!input)lastContact=null;
    if(!segments.length)return null;
    return {segments:segments.slice(-maxBrushSegments),touch,radius:touch?reach:reach*.955,strength:.96};
  }

  function markStroke({from,to},radius) {
    strokeBounds.min.x=Math.min(strokeBounds.min.x,from.x-radius,to.x-radius);
    strokeBounds.min.y=Math.min(strokeBounds.min.y,from.y-radius,to.y-radius);
    strokeBounds.max.x=Math.max(strokeBounds.max.x,from.x+radius,to.x+radius);
    strokeBounds.max.y=Math.max(strokeBounds.max.y,from.y+radius,to.y+radius);
  }

  // With a fixed camera and light, repaint only the stroke, its perspective expansion and cast shadow.
  function clipToStroke() {
    const {x,y}=field.lightVector.value;
    const left=strokeBounds.min.x-Math.max(0,x)*shadowDepth-.18;
    const right=strokeBounds.max.x-Math.min(0,x)*shadowDepth+.18;
    const bottom=strokeBounds.min.y-Math.max(0,y)*shadowDepth-.18;
    const top=strokeBounds.max.y-Math.min(0,y)*shadowDepth+.18;
    projectedBounds.makeEmpty();
    for(const x of [left,right]){
      for(const y of [bottom,top]){
        for(const z of [0,shadowDepth]){
          projected.set(x,y,z).project(camera);
          projectedBounds.expandByPoint(projected);
        }
      }
    }
    const px=n=>(Math.max(-1,Math.min(1,n))+1)*width/2;
    const py=n=>(Math.max(-1,Math.min(1,n))+1)*height/2;
    const x0=Math.floor(px(projectedBounds.min.x));
    const x1=Math.ceil(px(projectedBounds.max.x));
    const y0=Math.floor(py(projectedBounds.min.y));
    const y1=Math.ceil(py(projectedBounds.max.y));
    if(x1>x0&&y1>y0){
      renderer.setScissor(x0,y0,x1-x0,y1-y0);
      renderer.setScissorTest(true);
    }
  }

  try {
    report({model:'loading',textures:'正在建立 256 × 256 位移场'});
    const [response,gardenData]=await Promise.all([fetch(modelURL,{signal}),loadSecretGarden(signal)]);
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
      mesh.geometry.computeBoundingBox();
      const points=mesh.geometry.getAttribute('position');
      let high=0;
      for(let i=1;i<points.count;i++)if(points.getZ(i)>points.getZ(high))high=i;
      const crest=new THREE.Vector3().fromBufferAttribute(points,high);
      motifs.push({mesh,crest,x:mesh.position.x});
    }
    originalMaterials.forEach(material=>material.dispose());
    if(!inscription || !motifs.length)throw new Error('模型未包含浮雕和刻字');
    garden=sculptGarden(gardenData,field);
    scene.add(garden.mesh);
    field.add(garden.mesh,0);
    host.append(canvas);
    fit();
    observer=new ResizeObserver(()=>{resizePending=true;});
    observer.observe(host);
    report({model:`A Secret Winter Garden · ${motifs.length} 组后续实体浮雕及 WINTER 刻字`,
      textures:'2720 × 1800 Cycles 法线与环境遮蔽 · 3 档晨光 / 月光烘焙 · 256 × 256 GPU 双缓冲 · 896 × 704 局部投影'});

    return {
      resize(){resizePending=true;},
      draw({progress,seconds,night,input,contacts,lastInput,view}) {
        if(cancelled)return null;
        const resized=resizePending;
        if(resized&&!fit())return null;
        const changed=resized||progress!==previousProgress||night!==previousNight||view!==previousView;
        if(!changed&&!input&&!contacts.length&&!inkVisible&&!ghost&&
          (seconds<nextGhost||seconds-lastInput<idleBrushDelay))return null;
        // Preserve the opening composition, then keep wall travel even across the photographs.
        const cameraProgress=THREE.MathUtils.lerp(progress,rail.getUtoTmapping(progress),
          THREE.MathUtils.smoothstep(progress,.07,.28));
        rail.getPoint(cameraProgress,cameraPoint);
        const horizontalScale=THREE.MathUtils.lerp(1,spread,THREE.MathUtils.smoothstep(progress,0,.15));
        camera.position.set(cameraPoint.x*horizontalScale,cameraPoint.y,cameraPoint.z);
        camera.lookAt(cameraPoint.x*horizontalScale,cameraPoint.y,0);
        camera.updateMatrixWorld();
        inscription.visible=view!=='scenery'&&progress<.21;
        scene.updateMatrixWorld();
        viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
        viewBounds.setFromProjectionMatrix(viewProjection);
        garden.mesh.visible=isInFrame(garden.mesh);
        for(const {mesh} of motifs)mesh.visible=isInFrame(mesh);
        const reach=progress<.25 ? 1.36*Math.max(.77,garden.mesh.scale.x) : 1.12;
        const brush=contactTrail(contacts,input,reach);
        const ambient=ambientTrail(seconds,lastInput,Boolean(brush));
        const dt=Math.min(.35,Math.max(.013,seconds-previousDraw));
        if(brush||ambient)lastInk=seconds;
        if(brush)brush.segments.forEach(segment=>markStroke(segment,brush.radius));
        if(ambient)markStroke(ambient,ambient.radius);
        const fading=seconds-lastInk<6.4;
        if(fading)field.step(dt,brush,ambient);
        else if(inkVisible)field.resetInk();
        inkVisible=fading;
        previousDraw=seconds;
        previousProgress=progress;
        previousNight=night;
        previousView=view;
        const warmth=THREE.MathUtils.smoothstep(progress,.65,.84);
        field.backdrop.copy(day).lerp(finalWarmth,warmth*.64).lerp(evening,night);
        const lightX=THREE.MathUtils.lerp(-.79,.91,night);
        const lightY=THREE.MathUtils.lerp(.61,.81,night);
        const lightZ=THREE.MathUtils.lerp(.88,.60,night);
        field.light.nightAmount.value=night;
        field.lightVector.value.set(lightX/lightZ,lightY/lightZ);
        direction.value.set(lightX,lightY,lightZ).transformDirection(camera.matrixWorldInverse);
        const wallHeight=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*cameraPoint.z;
        field.shadows(camera.position.x,camera.position.y,wallHeight*camera.aspect+1.05,wallHeight+1.05,inkVisible);
        renderer.setClearAlpha(0);
        if(!changed&&!strokeBounds.isEmpty())clipToStroke();
        renderer.render(scene,camera);
        renderer.setScissorTest(false);
        if(!fading)strokeBounds.makeEmpty();
        return {camera:[camera.position.x,camera.position.y,camera.position.z],resolution:[canvas.width,canvas.height],
          night,light:[lightX,lightY,lightZ],
          triangles:renderer.info.render.triangles,trace:brush ? (brush.touch?'touch':'mouse') : ambient ? 'auto' : 'decay'};
      },
      probe(x,y){
        const point=worldAt(x,y);
        return point ? {...field.probe(point),point} : null;
      },
      visibleMotifs:motifPoints,
      contactAt:worldAt
    };
  } catch(error){
    dispose();
    throw error;
  }
}
