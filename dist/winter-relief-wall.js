import * as THREE from './assets/vendor/three/three.module.min.js';
import { GLTFLoader } from './assets/vendor/three/loaders/GLTFLoader.js';

const modelURL = new URL('./assets/winter-v2/plaster/winter-herbarium.glb', import.meta.url);
const coverDistance = 13.25;
const exhibitDistance = 11.35;
const poses = [
  [[0, 0, coverDistance], [0, 0, 0]],
  [[.93, -2.40, 10.35], [.18, -2.83, .14]],
  [[1.58, -5.49, 6.52], [.27, -5.95, .42]],
  [[.31, -9.57, 8.37], [-.53, -9.82, .24]],
  [[-.22, -12.66, exhibitDistance], [-.22, -12.66, 0]],
  [[-.84, -15.82, 8.20], [-.38, -16.33, .26]],
  [[-1.40, -19.22, 6.62], [-.20, -19.56, .48]],
  [[-.45, -22.46, 9.03], [.15, -22.92, .17]],
  [[0, -25.03, 12.43], [0, -25.03, 0]]
];
const makeRail = index => new THREE.CatmullRomCurve3(poses.map(pose => new THREE.Vector3(...pose[index])));
const cameraRail = makeRail(0);
const focusRail = makeRail(1);
const morningStone = new THREE.Color(0xeae9e5);
const nightStone = new THREE.Color(0xc5ccd7);

function softenAlpha(ink, width, height, radius) {
  const pixels = ink.getImageData(0, 0, width, height);
  let input = Uint8Array.from({length: width * height}, (_, i) => pixels.data[i * 4 + 3]);
  for (let pass = 0; pass < 4; pass++) {
    const horizontal = pass % 2 === 0;
    const length = horizontal ? width : height;
    const count = horizontal ? height : width;
    const stride = horizontal ? 1 : width;
    const rowStride = horizontal ? width : 1;
    const output = new Uint8Array(input.length);
    for (let line = 0; line < count; line++) {
      const offset = line * rowStride;
      let total = 0;
      for (let x = 0; x <= radius; x++) total += input[offset + x * stride];
      for (let x = 0; x < length; x++) {
        output[offset + x * stride] = total / (radius * 2 + 1);
        if (x >= radius) total -= input[offset + (x - radius) * stride];
        if (x + radius + 1 < length) total += input[offset + (x + radius + 1) * stride];
      }
    }
    input = output;
  }
  for (let i = 0; i < input.length; i++) {
    pixels.data[i * 4] = pixels.data[i * 4 + 1] = pixels.data[i * 4 + 2] = 255;
    pixels.data[i * 4 + 3] = input[i];
  }
  ink.putImageData(pixels, 0, 0);
}

function plasterMaterial(color, lighting) {
  return new THREE.ShaderMaterial({
    uniforms:{...lighting, stoneColor:{value:new THREE.Color(color)}},
    vertexShader:`
      uniform vec3 stoneColor;
      uniform vec3 keyDirection;
      uniform vec3 roomTint;
      uniform float intensity;
      varying vec3 litStone;
      void main() {
        vec3 outward = normalize(normalMatrix * normal);
        float rakingLight = max(dot(outward,keyDirection),0.);
        litStone = stoneColor * roomTint * (.72 + intensity * rakingLight);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
      }
    `,
    fragmentShader:`
      varying vec3 litStone;
      void main() {
        gl_FragColor = vec4(litStone,1.);
        #include <colorspace_fragment>
      }
    `
  });
}

// Rasterize the actual triangles toward the plaster. The soft contact map
// retains shape detail without a second 3D pass on every rendered frame.
function contactShadow(mesh) {
  const vertices = mesh.geometry.attributes.position;
  const indices = mesh.geometry.index;
  const dots = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < vertices.count; i++) {
    const height = Math.max(0, vertices.getZ(i) * mesh.scale.z + mesh.position.z);
    const x = vertices.getX(i) + height * .49;
    const y = vertices.getY(i) - height * .51;
    dots.push([x,y]);
    minX = Math.min(minX,x); maxX = Math.max(maxX,x);
    minY = Math.min(minY,y); maxY = Math.max(maxY,y);
  }
  const padding = .26;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const size = Math.min(52, 240 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * size);
  canvas.height = Math.ceil(height * size);
  const ink = canvas.getContext('2d', {willReadFrequently:true});
  ink.fillStyle = '#fff';
  const count = indices?.count ?? vertices.count;
  ink.beginPath();
  for (let i=0; i<count; i+=3) {
    const a = dots[indices ? indices.getX(i) : i];
    const b = dots[indices ? indices.getX(i+1) : i+1];
    const c = dots[indices ? indices.getX(i+2) : i+2];
    // Fill a single winding direction so overlapping faces form one silhouette.
    const forward = (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0]) > 0;
    ink.moveTo((a[0]-minX+padding)*size, (maxY-a[1]+padding)*size);
    for (const dot of forward ? [b,c] : [c,b]) {
      ink.lineTo((dot[0]-minX+padding)*size, (maxY-dot[1]+padding)*size);
    }
    ink.closePath();
  }
  ink.fill();
  softenAlpha(ink, canvas.width, canvas.height, Math.max(2, Math.round(size * .065)));
  const map = new THREE.CanvasTexture(canvas);
  const geometry = new THREE.PlaneGeometry(canvas.width / size, canvas.height / size);
  geometry.translate(minX-padding + canvas.width/size/2, maxY+padding - canvas.height/size/2, .009);
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    map, color:0x766e62, transparent:true, opacity:.28, depthWrite:false
  }));
}

export async function mountReliefWall(host, {signal, report, onContextLost, title, scroller, prints, onPrintBounds}) {
  if (signal.aborted) return null;
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', {alpha:false, antialias:false, powerPreference:'high-performance'});
  if (!gl) throw new Error('无法创建 WebGL 2 context');
  const gpu = gl.getExtension('WEBGL_debug_renderer_info');
  const device = gpu ? gl.getParameter(gpu.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  const software = /llvmpipe|softpipe|swiftshader|software/i.test(device);
  const lean = software || (navigator.deviceMemory ?? 8) <= 2 || (navigator.hardwareConcurrency ?? 8) <= 4;
  report({webgl:'WebGL 2', device});
  const renderer = new THREE.WebGLRenderer({canvas, context:gl, alpha:false, antialias:false});
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(morningStone);
  renderer.debug.onShaderError = (context, program, vertex, fragment) => {
    const message = [context.getProgramInfoLog(program), context.getShaderInfoLog(vertex),
      context.getShaderInfoLog(fragment)].filter(Boolean).join('\n');
    report({shaderError:message || 'WebGL program link failed'});
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .12, 75);
  const keyDirection = new THREE.Vector3();
  const nightTint = new THREE.Color(0xe3ecff);
  const morningTint = new THREE.Color(0xffffff);
  const lighting = {
    keyDirection:{value:keyDirection},
    roomTint:{value:new THREE.Color(0xffffff)},
    intensity:{value:.29}
  };
  const stone = morningStone.clone();
  const plaster = plasterMaterial(0xf4f1eb, lighting);
  const letters = plasterMaterial(0xc6beb2, lighting);
  const photoFrame = plasterMaterial(0xf0e9d9, lighting);
  // The neutral plaster ground is the clear color. Its plane still hides
  // the portion of each sculpture that physically extends into the wall.
  const backing = new THREE.Mesh(new THREE.PlaneGeometry(75, 68),
    new THREE.MeshBasicMaterial({colorWrite:false}));
  backing.position.y = -13;
  backing.renderOrder = -1;
  scene.add(backing);

  const position = new THREE.Vector3();
  const focus = new THREE.Vector3();
  const p = new THREE.Vector3();
  const foliage = [];
  const photographs = [];
  let inscription;
  let observer;
  let released = false;
  let w = 0, h = 0, aspect = 1;
  let density = lean ? .83 : Math.min(1.52, devicePixelRatio || 1);
  let resizePending = true;

  function dispose() {
    if (released) return;
    released = true;
    observer?.disconnect();
    const materials = new Set([plaster, letters, photoFrame]);
    scene.traverse(item => {
      item.geometry?.dispose();
      if (item.material) materials.add(item.material);
    });
    for (const material of materials) {
      material.map?.dispose();
      material.dispose();
    }
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }

  signal.addEventListener('abort', dispose, {once:true});
  canvas.addEventListener('webglcontextlost', event => {
    if (released) return;
    event.preventDefault();
    onContextLost('WebGL context lost');
  });

  function fit() {
    if (released || !host.clientWidth || !host.clientHeight) return;
    w = host.clientWidth; h = host.clientHeight;
    aspect = w / h;
    resizePending = false;
    const ratio = Math.min(density, Math.sqrt((lean ? 1230000 : 2700000) / (w * h)));
    renderer.setDrawingBufferSize(w, h, ratio);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    const spread = THREE.MathUtils.clamp(aspect / 1.43, .58, 1.34);
    foliage.forEach(({mesh, shadow, x}) => {
      mesh.position.x = x * spread;
      shadow.position.copy(mesh.position);
      shadow.position.z = 0;
    });

    const angle = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const word = title.getBoundingClientRect();
    const viewport = host.getBoundingClientRect();
    const coverUnits = 2 * angle * (coverDistance - .14) / h;
    inscription.mesh.position.set(0, (h / 2 - (word.top - viewport.top + scroller.scrollTop + word.height / 2)) * coverUnits, .035);
    inscription.mesh.scale.setScalar(word.width * .94 * coverUnits / 9.5);
    inscription.shadow.position.copy(inscription.mesh.position);
    inscription.shadow.position.z = .030;
    inscription.shadow.scale.copy(inscription.mesh.scale);

    const tall = aspect < .95;
    photographs.forEach(({group, width, height}, i) => {
      const panelZ = i ? .23 : .38;
      const viewHeight = 2 * angle * (exhibitDistance - panelZ);
      const fraction = (tall ? [.406, .326] : [.59, .457])[i];
      const targetH = viewHeight * fraction;
      const targetW = targetH * width / height;
      const centerX = (tall ? [-.29, .34] : [.10, .57])[i];
      const centerY = (tall ? [-.075, -.11] : [.062, -.158])[i];
      group.scale.set(targetW, targetH, 1);
      group.position.set(-.22 * spread + centerX * viewHeight * aspect / 2, -12.66 + centerY * viewHeight / 2, panelZ);
    });

  }

  async function loadModel() {
    const response = await fetch(modelURL, {signal});
    if (!response.ok) throw new Error('浮雕模型 HTTP ' + response.status);
    const model = await new GLTFLoader().parseAsync(await response.arrayBuffer(), new URL('.', modelURL).href);
    if (released) {
      model.scene.traverse(mesh => {mesh.geometry?.dispose(); mesh.material?.dispose();});
      return;
    }
    for (const mesh of [...model.scene.children]) {
      if (!mesh.isMesh) continue;
      const isLettering = mesh.name.includes('WINTER');
      mesh.material.dispose();
      mesh.material = isLettering ? letters : plaster;
      const shadow = contactShadow(mesh);
      if (isLettering) inscription = {mesh, shadow};
      else foliage.push({mesh, shadow, x:mesh.position.x});
      scene.add(mesh, shadow);
    }
    if (!inscription || foliage.length < 6) throw new Error('浮雕模型缺少模型节点');
    report({model:foliage.length + ' 组实体雕塑 + WINTER'});
  }

  async function loadPhotograph(print, index) {
    const image = print.querySelector('img');
    const source = image.getAttribute('src');
    let map;
    try {
      map = await new THREE.TextureLoader().loadAsync(source);
    } catch (_) {
      throw new Error('无法读取摄影纹理 ' + source);
    }
    if (released) {map.dispose(); return;}
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.028, 1.02, .055), photoFrame);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map}));
    face.position.z = .03;
    const group = new THREE.Group();
    group.add(frame, face);
    group.rotation.y = index ? .035 : -.060;
    group.rotation.z = index ? -.021 : .011;
    photographs[index] = {group, face, width:map.image.naturalWidth, height:map.image.naturalHeight};
    scene.add(group);
  }

  function projectPrints() {
    return photographs.map(({face}) => {
      let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
      for (const x of [-.5, .5]) for (const y of [-.5, .5]) {
        p.set(x, y, 0).applyMatrix4(face.matrixWorld).project(camera);
        if (p.z < -1 || p.z > 1) return null;
        const sx = (p.x + 1) * w / 2;
        const sy = (1 - p.y) * h / 2;
        left = Math.min(left, sx); right = Math.max(right, sx);
        top = Math.min(top, sy); bottom = Math.max(bottom, sy);
      }
      return {left, top, right, bottom};
    });
  }

  try {
    report({model:'loading', textures:'loading'});
    await Promise.all([loadModel(), ...prints.map(loadPhotograph)]);
    if (released) return null;
    report({textures:'2/2 摄影原图已加载，接触阴影已生成'});
    host.append(canvas);
    fit();
    observer = new ResizeObserver(() => {resizePending = true;});
    observer.observe(host);
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
    if (released) return null;

    let previousX, previousY, previousZ;
    let previousSize, previousView;
    return {
      resize() {resizePending = true;},
      draw(progress, look, night, seconds, view) {
        if (released) return null;
        if (resizePending) fit();
        if (!w) return null;
        const travel = progress / 2;
        const spread = THREE.MathUtils.clamp(aspect / 1.43, .58, 1.34);
        cameraRail.getPoint(travel, position);
        focusRail.getPoint(travel, focus);
        camera.position.set(position.x * spread + look.x * .38, position.y + look.y * .18, position.z);
        camera.lookAt(focus.set(focus.x * spread + look.x * .26, focus.y + look.y * .12, focus.z));
        camera.updateMatrixWorld();
        inscription.mesh.visible = inscription.shadow.visible = view !== 'scenery' && progress < .62;
        photographs.forEach(({group}) => {group.visible = view !== 'scenery' && progress > .36 && progress < 1.65;});
        for (const {mesh, shadow} of foliage) {
          mesh.visible = shadow.visible = Math.abs(mesh.position.y - position.y) < 9.7;
        }
        stone.copy(morningStone).lerp(nightStone, night).multiplyScalar(.95 + .033 * Math.sin(seconds * .55));
        renderer.setClearColor(stone);
        const sweep = Math.sin(seconds * .61 + travel * 2.0);
        keyDirection.set(-4.95 + sweep * 3.1 + night * 4.4,
          4.15 + Math.cos(seconds * .47) * 1.58, 7.15).transformDirection(camera.matrixWorldInverse);
        lighting.roomTint.value.copy(morningTint).lerp(nightTint, night);
        lighting.intensity.value = .275 + .065 * sweep - night * .09;
        renderer.render(scene, camera);

        const size = w * 12800 + h;
        if (camera.position.x !== previousX || camera.position.y !== previousY || camera.position.z !== previousZ || size !== previousSize || view !== previousView) {
          onPrintBounds(photographs[0].group.visible ? projectPrints() : [null, null], w, h);
          ({x:previousX, y:previousY, z:previousZ} = camera.position);
          previousSize = size;
          previousView = view;
        }
        return {camera:[camera.position.x, camera.position.y, camera.position.z],
          resolution:[canvas.width, canvas.height], triangles:renderer.info.render.triangles, density};
      },
      scaleResolution(factor) {
        const next = THREE.MathUtils.clamp(density * factor, software ? .50 : .64,
          lean ? .94 : Math.min(1.72, devicePixelRatio || 1));
        if (Math.abs(next - density) < .025) return false;
        density = next;
        resizePending = true;
        return true;
      }
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
