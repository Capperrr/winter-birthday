import * as THREE from './assets/vendor/three/three.module.min.js';

const art = 'assets/winter-v2/home/';
const depth = { distance:12.75, rear:-16, arch:2.1, terrace:3.5, cliff:5.4, canopy:7.2 };
const aspect = 1672/941;
const field = 39;

function ease(start,end,t) {
  const step = Math.max(0,Math.min(1,(t-start)/(end-start)));
  return step*step*(3-2*step);
}

function trace(path,points,width,height) {
  points.forEach(([x,y],i)=>{
    const method = i===0 ? 'moveTo' : 'lineTo';
    path[method]((x-.5)*width,(.5-y)*height);
  });
  path.closePath();
  return path;
}

export async function crossArch(host,signal,{night,start}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'arch-camera';
  canvas.setAttribute('aria-hidden','true');
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias:false, alpha:false, powerPreference:'default', preserveDrawingBuffer:false
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.5));
  renderer.setClearColor(0x142631);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(field,1,.13,100);
  const loader = new THREE.TextureLoader();
  const height = 2*depth.distance*Math.tan(THREE.MathUtils.degToRad(field/2));
  const textures = [];
  const objects = [];
  let frame = 0;
  let observer;
  let lastProgress = 0;
  let disposed = false;

  function release() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    objects.forEach(mesh=>{
      mesh.geometry.dispose();
      [mesh.material].flat().forEach(material=>material.dispose());
    });
    textures.forEach(texture=>texture.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }
  signal.addEventListener('abort',release,{once:true});

  async function texture(file) {
    const map = await loader.loadAsync(art+file+'.webp');
    if (signal.aborted || disposed) {map.dispose();throw new Error('Scene closed');}
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(4,renderer.capabilities.getMaxAnisotropy());
    textures.push(map);
    return map;
  }
  function add(geometry,material,z) {
    const mesh = new THREE.Mesh(geometry,material);
    mesh.position.z = z;
    scene.add(mesh);
    objects.push(mesh);
    return mesh;
  }
  const sizeAt = z => height*(depth.distance-z)/depth.distance;
  const tint = new THREE.Color(night?0x9baec4:0xffffff);
  function plane(z,map,extra={}) {
    const size = sizeAt(z);
    return add(new THREE.PlaneGeometry(size*aspect,size),
      new THREE.MeshBasicMaterial({map,color:tint,...extra}),z);
  }
  try {
    const [far, clean, arch, terraces, cliff, canopy, rock, fog, meshProfile] = await Promise.all([
      ...['far','through','arch','terraces','cliff','canopy','rock'].map(texture),
      loader.loadAsync('assets/winter-v2/air/fog_far_silver.webp').then(map=>{
        if (signal.aborted || disposed) {map.dispose();throw new Error('Scene closed');}
        map.colorSpace=THREE.SRGBColorSpace;
        textures.push(map);
        return map;
      }),
      fetch(art+'arch-profile.json',{signal}).then(response=>{
        if (!response.ok) throw new Error('Missing arch profile');
        return response.json();
      })
    ]);
    if (signal.aborted) return;
    plane(depth.rear,far);
    const clearValley = plane(depth.rear+.018,clean,{transparent:true,opacity:0,depthWrite:false});
    const photoMask = {transparent:true,alphaTest:.04};
    plane(depth.arch,arch,photoMask);
    plane(depth.terrace,terraces,photoMask);
    plane(depth.cliff,cliff,photoMask);
    plane(depth.canopy,canopy,photoMask);
    const driftingCloud = plane(-2.1,fog,{transparent:true,opacity:.36,depthWrite:false});

    const frontHeight = sizeAt(depth.arch);
    const frontWidth = frontHeight*aspect;
    const ridge = trace(new THREE.Shape(),meshProfile.outer,frontWidth,frontHeight);
    ridge.holes.push(trace(new THREE.Path(),meshProfile.opening,frontWidth,frontHeight));
    const archVolume = new THREE.ExtrudeGeometry(ridge,{
      depth:1.45,bevelEnabled:true,bevelSegments:2,steps:1,bevelThickness:.07,bevelSize:.082
    });
    rock.wrapS=rock.wrapT=THREE.MirroredRepeatWrapping;
    rock.repeat.set(.38,.42);
    const plainFace = new THREE.MeshBasicMaterial({map:rock,color:0x56717e,side:THREE.DoubleSide});
    const tunnelWall = new THREE.MeshBasicMaterial({map:rock,color:0x879fa9,side:THREE.DoubleSide});
    const rockMesh = add(archVolume,[plainFace,tunnelWall],depth.arch-1.51);
    rockMesh.name = 'Extruded stone arch with open aperture';
    // The registered photograph covers the mesh's front. The recessed walls are
    // exposed by the moving camera and are occluded by the actual aperture.
    const targetX = (.721-.5)*frontWidth;
    const targetY = (.5-.322)*frontHeight;

    function shot(progress) {
      lastProgress = progress;
      const goal = ease(.06,.60,progress);
      const flight = ease(.14,1,progress);
      const settle = ease(.73,1,progress);
      camera.position.set(targetX*goal + .30*settle,targetY*goal - .13*settle,
        depth.distance - 13.52*flight);
      camera.lookAt(camera.position.x + .28*settle,camera.position.y - .17*settle,camera.position.z-4);
      clearValley.material.opacity = ease(.63,.97,progress);
      driftingCloud.position.x = -.22 + .5*progress;
      driftingCloud.position.y = -.20 - .18*progress;
      renderer.render(scene,camera);
    }
    function resize() {
      if (disposed) return;
      const width = host.clientWidth, h = host.clientHeight;
      if (!width || !h) return;
      renderer.setSize(width,h,false);
      camera.aspect = width/h;
      // Match a cover crop while retaining enough vertical field for portraits.
      camera.zoom = Math.max(1,camera.aspect/aspect);
      camera.updateProjectionMatrix();
      shot(lastProgress);
    }
    host.append(canvas);
    observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    start();
    canvas.classList.add('is-visible');

    await new Promise(resolve=>{
      signal.addEventListener('abort',resolve,{once:true});
      let started;
      function travel(now) {
        if (signal.aborted) {resolve();return;}
        started ??= now;
        const progress = Math.min(1,(now-started)/5150);
        shot(progress);
        if (progress<1) frame=requestAnimationFrame(travel);
        else {frame=0;resolve();}
      }
      frame=requestAnimationFrame(travel);
    });
  } catch (error) {
    release();
    throw error;
  }
}
