import * as THREE from './assets/vendor/three/three.module.min.js';

const art = 'assets/winter-v2/';
const field = 39;
const focalHeight = 2 * Math.tan(THREE.MathUtils.degToRad(field / 2));
const aspect = 1672 / 941;
const entrance = { distance: 12.75, front: 2.1, rear: -.42 };
const endZ = -5.15;
const opening = [.721, .322];
const clamp = THREE.MathUtils.clamp;

function smooth(from, to, value) {
  return THREE.MathUtils.smoothstep(value, from, to);
}

function outline(path, points, width, height, round = false) {
  let screen = points.map(([x,y])=>new THREE.Vector3((x-.5)*width,(.5-y)*height,0));
  if (round) screen = new THREE.CatmullRomCurve3(screen,true,'centripetal').getPoints(points.length*4).slice(0,-1);
  screen.forEach(({x,y}, index) => {
    path[index ? 'lineTo' : 'moveTo'](x,y);
  });
  path.closePath();
  return path;
}

function buildStone(profile, width, height, maps) {
  const shape = outline(new THREE.Shape(), profile.outer, width, height);
  shape.holes.push(outline(new THREE.Path(), profile.opening, width, height, true));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: entrance.front - entrance.rear,
    bevelEnabled: true, bevelThickness: .12, bevelSize: .11, bevelSegments: 3, steps: 5
  });
  const xyz = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const cap = geometry.groups[0];
  for (let i = 0; i < xyz.count; i++) {
    const x = xyz.getX(i), y = xyz.getY(i), z = xyz.getZ(i);
    const ripple = Math.sin(z * 3.8) * Math.sin(x * 9.1 + y * 10.3) * .05;
    xyz.setXY(i, x + ripple, y + ripple * .44);
    if (i < cap.start + cap.count) uv.setXY(i, x / width + .5, y / height + .5);
    else uv.setXY(i, .12+.47*(.5+.5*Math.sin(x*1.83+z*.6)), .11+.77*(.5+.5*Math.sin(y*1.3+z*.91)));
  }
  geometry.computeVertexNormals();
  // Average the tunnel's joined vertices while retaining the weathered front cap.
  const normals = geometry.attributes.normal;
  const sideStart = cap.start+cap.count;
  const joins = new Map();
  const keys = [];
  for (let i = sideStart; i < xyz.count; i++) {
    const key = [xyz.getX(i),xyz.getY(i),xyz.getZ(i)].map(n=>Math.round(n*10000)).join(',');
    const normal = new THREE.Vector3().fromBufferAttribute(normals,i);
    const sum = joins.get(key);
    if (sum) sum.add(normal);
    else joins.set(key,normal);
    keys.push(key);
  }
  keys.forEach((key,offset)=>{
    const sum=joins.get(key).normalize();
    normals.setXYZ(sideStart+offset,sum.x,sum.y,sum.z);
  });
  const face = new THREE.MeshStandardMaterial({map: maps.arch, roughness: .88, color: 0xbac9d3});
  const walls = new THREE.MeshStandardMaterial({
    map: maps.rock, bumpMap: maps.rock, bumpScale: .10, roughness: .96, color: 0x849fab, side: THREE.DoubleSide
  });
  const arch = new THREE.Mesh(geometry, [face, walls]);
  arch.position.z = entrance.rear;
  arch.name = 'Winter stone aperture and recessed walls';
  return arch;
}

function fallingWater(map) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { paintedWater: {value:map}, elapsed: {value:0} },
    vertexShader: `
      varying vec2 picture;
      void main() {
        picture=uv;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }
    `,
    fragmentShader: `
      varying vec2 picture;
      uniform sampler2D paintedWater;
      uniform float elapsed;
      void main() {
        vec4 water=texture2D(paintedWater,picture);
        float a=sin(picture.y*180.0+elapsed*10.5+sin(picture.x*91.0)*2.0);
        float b=sin(picture.y*490.0+elapsed*18.0+picture.x*330.0);
        float streak=pow(max(0.0,a*.65+b*.35),2.6);
        gl_FragColor=vec4(water.rgb*vec3(1.01,1.13,1.22)+vec3(.11,.20,.25)*streak,
          water.a*(.23+streak*.53));
        #include <colorspace_fragment>
      }
    `
  });
}

function dustMaterial() {
  const side = 16;
  const rgba = new Uint8Array(side * side * 4);
  for (let index = 0; index < side * side; index++) {
    const radius = Math.hypot((index % side - 7.5) / 7.5, (Math.floor(index / side) - 7.5) / 7.5);
    rgba.set([255,255,255,Math.round(255 * Math.max(0,1-radius) ** 1.9)],index*4);
  }
  const map = new THREE.DataTexture(rgba,side,side);
  map.needsUpdate = true;
  return new THREE.PointsMaterial({
    map, size: .041, transparent: true, opacity: .75, color: 0xddeaf6, depthWrite: false
  });
}

export async function createWinterWorld(host, signal, {night = false, phase, onFailure} = {}) {
  if (signal.aborted) throw new Error('Winter world was closed');
  const canvas = document.createElement('canvas');
  canvas.className = 'arch-camera';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: false, stencil: true, powerPreference: 'default'
  });
  renderer.autoClear = false;
  renderer.setClearColor(0x142630);
  const outside = new THREE.Scene();
  const stone = new THREE.Scene();
  const aperture = new THREE.Scene();
  const inside = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(field, 1, .045, 160);
  const textureLoader = new THREE.TextureLoader();
  const textures = [];
  const meshes = [];
  let resizeObserver;
  let renderFrame = 0;
  let stopped = false;
  let paused = false;
  let crossing = null;
  let last = 0;
  let elapsed = 0;
  let tick;
  let gazeX = 0, gazeY = 0, wantedX = 0, wantedY = 0;
  let day = night ? 0 : 1, wantedDay = day;

  function dispose() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(renderFrame);
    crossing?.resolve(false);
    crossing = null;
    resizeObserver?.disconnect();
    for (const mesh of meshes) {
      mesh.geometry.dispose();
      for (const material of [mesh.material].flat()) material.dispose();
    }
    textures.forEach(texture => texture.dispose());
    renderer.dispose();
    canvas.remove();
  }

  function schedule() {
    if (!stopped && !paused && !renderFrame && tick) renderFrame = requestAnimationFrame(tick);
  }
  signal.addEventListener('abort', dispose, {once:true});
  canvas.addEventListener('webglcontextlost', event => {
    if (stopped || signal.aborted) return;
    event.preventDefault();
    dispose();
    onFailure?.();
  });

  async function load(path) {
    const texture = await textureLoader.loadAsync(art + path + '.webp');
    if (stopped || signal.aborted) {
      texture.dispose();
      throw new Error('Winter world was closed');
    }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4,renderer.capabilities.getMaxAnisotropy());
    textures.push(texture);
    return texture;
  }
  function add(scene, geometry, material, z, x = 0, y = 0) {
    const mesh = new THREE.Mesh(geometry,material);
    mesh.position.set(x,y,z);
    scene.add(mesh);
    meshes.push(mesh);
    return mesh;
  }
  function film(scene, map, z, options = {}) {
    const frame = (options.distance ?? entrance.distance) - z;
    const height = focalHeight * frame * (options.overscan ?? 1.02);
    const material = new THREE.MeshBasicMaterial({
      map, opacity: options.opacity ?? 1, transparent: options.alpha ?? false,
      depthWrite: !options.alpha || !!options.cutout,
      alphaTest: options.cutout ? .24 : options.alpha ? .025 : 0,
      blending: options.glow ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    const mesh = add(scene,new THREE.PlaneGeometry(height*aspect,height),material,z, options.x, options.y);
    if (options.layer) mesh.renderOrder = options.layer;
    return mesh;
  }

  try {
    const names = {
      far:'home/far', arch:'home/still', terrace:'home/terraces', cliff:'home/cliff',
      canopy:'home/canopy', water:'home/water', rock:'home/rock',
      cloud:'air/fog_far_silver', vapour:'air/fog_near_blue', light:'air/light_shafts_amber',
      greenhouse:'about/far', frame:'about/middle', leaves:'about/near'
    };
    const [pairs,profile] = await Promise.all([
      Promise.all(Object.entries(names).map(async ([name,path]) => [name,await load(path)])),
      fetch(art + 'home/arch-profile.json',{signal}).then(response => {
        if (!response.ok) throw new Error('Winter aperture geometry unavailable');
        return response.json();
      })
    ]);
    if (stopped) throw new Error('Winter world was closed');
    const maps = Object.fromEntries(pairs);
    maps.rock.wrapS = maps.rock.wrapT = THREE.MirroredRepeatWrapping;
    const archH = focalHeight * (entrance.distance-entrance.front);
    const archW = archH * aspect;
    const gateX = (opening[0]-.5)*archW;
    const gateY = (.5-opening[1])*archH;
    const key = new THREE.DirectionalLight(0xd6e8ff,2.0);
    key.position.set(-4,5,7);
    const roomBounce = new THREE.PointLight(0xffdfad,8.5,7,2);
    roomBounce.position.set(gateX-.3,gateY-.32,-.68);
    stone.add(new THREE.HemisphereLight(0xe5f0ff,0x52616f,1.4),key,roomBounce);

    const mountain = film(outside,maps.far,-18,{overscan:1.12});
    const terrace = film(outside,maps.terrace,3.5,{alpha:true,cutout:true,layer:2});
    const cliff = film(outside,maps.cliff,5.4,{alpha:true,cutout:true,layer:4,overscan:1.04});
    const canopy = film(outside,maps.canopy,7.2,{alpha:true,cutout:true,layer:5,overscan:1.08});
    const cloud = film(outside,maps.cloud,-8,{alpha:true,opacity:.55,overscan:1.45,layer:1,y:-1.1});
    const fog = film(outside,maps.vapour,1.0,{alpha:true,opacity:.47,overscan:1.30,layer:3,y:-.38});
    const shaft = film(outside,maps.light,2.6,{alpha:true,opacity:.56,overscan:1.18,glow:true,layer:3});
    const water = fallingWater(maps.water);
    const waterfall = add(outside,terrace.geometry.clone(),water,3.53);
    waterfall.renderOrder = 3;

    const rock = buildStone(profile,archW,archH,maps);
    stone.add(rock);
    meshes.push(rock);

    const window = new THREE.ShapeGeometry(outline(new THREE.Shape(),profile.opening,archW,archH,true),16);
    const stencil = new THREE.MeshBasicMaterial({
      colorWrite:false, depthWrite:false, depthTest:true, side:THREE.DoubleSide,
      stencilWrite:true, stencilRef:1, stencilFunc:THREE.AlwaysStencilFunc, stencilZPass:THREE.ReplaceStencilOp
    });
    const frontRim = entrance.front + .125;
    add(aperture,window,stencil,frontRim);

    const finish = new THREE.Vector3(gateX+.30,gateY-.22,endZ);
    // Deep plates cover the entire aperture before and after the camera reaches the rear stone.
    const through = {distance:endZ, x:finish.x, y:finish.y, overscan:1.19};
    const glass = film(inside,maps.greenhouse,-51,through);
    const posts = film(inside,maps.frame,-36,{...through,alpha:true,layer:1});
    const moss = film(inside,maps.leaves,-19,{...through,alpha:true,layer:3});
    const innerMist = film(inside,maps.cloud,-31,{...through,alpha:true,opacity:.32,layer:2,y:finish.y-.70});
    const wetLight = film(inside,maps.light,-40,{...through,alpha:true,opacity:.49,glow:true,layer:2});
    const gallery = [glass,posts,moss,innerMist,wetLight];

    const seeds = new Float32Array(70 * 4);
    const coords = new Float32Array(70 * 3);
    for (let i = 0; i < 70; i++) {
      const spread = (i * 73 % 97) / 97;
      seeds.set([(spread-.51)*16, (i*31%83)/83*6, 2.3+(i*11%21)*.26, .09+(i%7)*.014],i*4);
    }
    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position',new THREE.BufferAttribute(coords,3));
    const flakes = new THREE.Points(pointsGeometry,dustMaterial());
    flakes.frustumCulled = false;
    flakes.renderOrder = 7;
    textures.push(flakes.material.map);
    outside.add(flakes);
    meshes.push(flakes);

    const af = new THREE.Vector3();
    const look = new THREE.Vector3();
    const tint = new THREE.Color();
    const roomTint = new THREE.Color();
    const motion = new THREE.Vector3();
    let stage = 'idle';

    function rest() {
      const ratio = camera.aspect;
      const frameX = ratio < 1.0 ? .82+(1-ratio)*3.7 : .36;
      return motion.set(frameX + gazeX*.46 + Math.sin(elapsed*.57)*.067,
        .03 + gazeY*.245 + Math.sin(elapsed*.38)*.035,
        entrance.distance + Math.sin(elapsed*.46)*.13);
    }

    function combinedView(pos) {
      const onApproach = pos.z > frontRim + .07;
      renderer.clear(true,true,true);
      if (onApproach) {
        renderer.render(outside,camera);
        renderer.render(aperture,camera);
      }
      // Through the cutout we see the next room. Keep exterior depth for the
      // stone itself, so the cutout cannot paint over the tunnel or nearby trees.
      for (const mesh of gallery) {
        mesh.material.depthWrite = false;
        mesh.material.depthTest = false;
        mesh.material.stencilWrite = onApproach;
        mesh.material.stencilRef = 1;
        mesh.material.stencilFunc = THREE.EqualStencilFunc;
      }
      renderer.render(inside,camera);
      if (pos.z > entrance.rear-.22) renderer.render(stone,camera);
    }

    function draw(seconds, travelSeconds = seconds) {
      elapsed += seconds;
      day += (wantedDay-day) * Math.min(1,seconds*2.2);
      gazeX += (wantedX-gazeX)*Math.min(1,seconds*7.0);
      gazeY += (wantedY-gazeY)*Math.min(1,seconds*7.0);
      const drift = elapsed*.67;
      cloud.position.x = Math.sin(drift*.36)*.58;
      cloud.position.y = -1.1+Math.sin(drift*.20)*.18;
      fog.position.x = .30+Math.sin(drift*.52)*.47;
      fog.material.opacity = .32 + .14*Math.sin(drift*.64+.5);
      shaft.material.opacity = (.34+.22*Math.sin(drift*.75+.96))*(.30+day*.70);
      shaft.position.x = Math.sin(drift*.43)*.24;
      canopy.rotation.z = Math.sin(drift*2.3)*.006;
      canopy.position.x = Math.sin(drift*1.5)*.055;
      water.uniforms.elapsed.value = elapsed;
      tint.setRGB(.52+day*.48,.65+day*.35,.85+day*.15);
      roomTint.setRGB(.73+day*.27,.81+day*.19,.94+day*.06);
      [mountain,terrace,cliff,canopy].forEach(plane=>plane.material.color.copy(tint));
      [glass,posts,moss].forEach(plane=>plane.material.color.copy(roomTint));
      key.intensity = (1.13+day*.90) * (1+Math.sin(drift*.59)*.14);
      key.position.x = -4.3 + Math.sin(drift*.74)*1.7;
      innerMist.position.x = finish.x + Math.sin(drift*.46)*.31;
      wetLight.material.opacity = .36 + .10*Math.sin(drift*.44);
      flakes.material.opacity = .48 + day*.20;
      for (let i = 0; i < 70; i++) {
        const t = i*4, p = i*3;
        coords[p] = seeds[t] + Math.sin(elapsed*seeds[t+3]+i)*.62;
        coords[p+1] = ((seeds[t+1]-elapsed*seeds[t+3]+600) % 6)-2.75;
        coords[p+2] = seeds[t+2];
      }
      pointsGeometry.attributes.position.needsUpdate = true;

      let progress = 0;
      if (crossing) {
        crossing.seconds += travelSeconds;
        progress = clamp(crossing.seconds/6.4,0,1);
        const advance = progress * progress*(2.9-1.9*progress);
        crossing.path.getPoint(clamp(advance,0,1),af);
        const next = af.z > entrance.front+.20 ? 'approach' : af.z > entrance.rear ? 'threshold' : 'beyond';
        if (next !== stage) {
          stage = next;
          phase?.(stage);
        }
      } else af.copy(rest());
      camera.position.copy(af);
      const tilt = crossing ? .43*(1-smooth(.64,1,progress)) : -.07+gazeX*.21;
      const lift = crossing ? .12*(1-smooth(.62,1,progress)) : .03+gazeY*.13;
      camera.lookAt(look.set(af.x+tilt,af.y+lift,af.z-6));
      combinedView(af);
      if (crossing && progress === 1) {
        stage = 'arrived';
        phase?.(stage);
        crossing.resolve(true);
      }
    }

    const budget = (navigator.hardwareConcurrency || 8) <= 4 ? 560000 : 820000;
    function size() {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h || stopped) return;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.25,Math.sqrt(budget/(w*h))));
      renderer.setSize(w,h,false);
      camera.aspect = w/h;
      camera.zoom = Math.max(1,camera.aspect/aspect);
      camera.updateProjectionMatrix();
      if (!paused) draw(0);
    }

    tick = now => {
      renderFrame = 0;
      if (paused || stopped || stage==='arrived') return;
      const interval = crossing ? 1000/30 : 1000/24;
      if (!last || now-last >= interval-3) {
        const elapsedTime = last ? (now-last)/1000 : 1/30;
        last = now;
        draw(Math.min(.10,elapsedTime),elapsedTime);
      }
      if (stage!=='arrived') schedule();
    };
    host.append(canvas);
    resizeObserver = new ResizeObserver(size);
    resizeObserver.observe(host);
    size();
    canvas.classList.add('is-visible');
    schedule();

    return {
      gaze(x,y) { wantedX=x; wantedY=y; },
      setNight(value) { wantedDay = value ? 0 : 1; },
      pause(value) {
        if (paused===value) return;
        paused = value;
        if (paused) {cancelAnimationFrame(renderFrame);renderFrame=0;}
        else {last=0;schedule();}
      },
      cross() {
        if (crossing || stopped) return Promise.resolve(false);
        const start = camera.position.clone();
        const path = new THREE.CatmullRomCurve3([
          start,
          new THREE.Vector3(THREE.MathUtils.lerp(start.x,gateX,.53),.62,9.35),
          new THREE.Vector3(gateX-.17,gateY+.03,5.1),
          new THREE.Vector3(gateX+.30,gateY-.22,entrance.front+.61),
          new THREE.Vector3(gateX+.38,gateY-.23,.62),
          new THREE.Vector3(gateX+.37,gateY-.22,entrance.rear-.79),
          finish
        ]);
        return new Promise(resolve => {
          crossing = {path, resolve, seconds:0};
        });
      },
      reset() {
        crossing?.resolve(false);
        crossing = null;
        stage = 'idle';
        last = 0;
        schedule();
      }
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
