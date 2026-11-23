import * as THREE from './assets/vendor/three/three.module.min.js';

const art = 'assets/winter-v2/plaster/';
const names = ['cover','prints','dedication'];
const slabWidth = 18;
const slabHeight = 12;

export async function mountReliefWall(host, signal, onContextLost) {
  if (signal.aborted) return null;
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});
  renderer.setClearColor(0xe2e0da);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38,1,.1,65);
  const projection = new THREE.Vector3();
  const loader = new THREE.TextureLoader();
  const textures = [];
  const geometry = new THREE.PlaneGeometry(slabWidth,slabHeight,196,130);
  const stone = new THREE.Color(0xe2e0da);
  const lamp = {value:new THREE.Vector3(-.48,.47,.73).normalize()};
  const blue = {value:0};
  const walls = [];
  let observer;
  let closed = false;
  let lastSize = [0,0,0];
  let aspect = 1;
  let budget = (navigator.hardwareConcurrency || 8) <= 4 ? 310000 : 490000;

  function dispose() {
    if (closed) return;
    closed = true;
    observer?.disconnect();
    geometry.dispose();
    walls.forEach(wall=>wall.material.dispose());
    textures.forEach(texture=>texture.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }

  signal.addEventListener('abort',dispose,{once:true});
  canvas.addEventListener('webglcontextlost',event=>{
    if (closed) return;
    event.preventDefault();
    dispose();
    onContextLost();
  });

  async function texture(name, color) {
    const image = await loader.loadAsync(art+name+'.webp');
    if (closed || signal.aborted) {image.dispose();throw new Error('The relief wall has closed');}
    if (color) image.colorSpace = THREE.SRGBColorSpace;
    image.anisotropy = Math.min(4,renderer.capabilities.getMaxAnisotropy());
    textures.push(image);
    return image;
  }

  function material(paint, depth) {
    const wall = new THREE.MeshBasicMaterial({map:paint});
    wall.onBeforeCompile = shader => {
      shader.uniforms.sculptureHeight = {value:depth};
      shader.uniforms.relieflamp = lamp;
      shader.uniforms.nightTemperature = blue;
      shader.uniforms.plasterGround = {value:stone};
      shader.vertexShader = `
        uniform sampler2D sculptureHeight;
        varying vec2 sculptureUV;
      `+shader.vertexShader.replace('#include <begin_vertex>',`
        #include <begin_vertex>
        sculptureUV=uv;
        transformed.z+=texture2D(sculptureHeight,uv).r*.54;
      `);
      shader.fragmentShader = `
        uniform sampler2D sculptureHeight;
        uniform vec3 relieflamp;
        uniform float nightTemperature;
        uniform vec3 plasterGround;
        varying vec2 sculptureUV;
      `+shader.fragmentShader.replace('#include <map_fragment>',`
        #include <map_fragment>
        vec2 d=vec2(.0026,.0039);
        float dx=texture2D(sculptureHeight,sculptureUV+vec2(d.x,0.0)).r-
          texture2D(sculptureHeight,sculptureUV-vec2(d.x,0.0)).r;
        float dy=texture2D(sculptureHeight,sculptureUV+vec2(0.0,d.y)).r-
          texture2D(sculptureHeight,sculptureUV-vec2(0.0,d.y)).r;
        vec3 normal=normalize(vec3(-dx*9.8,-dy*9.8,1.0));
        vec3 nominal=normalize(vec3(-.48,.47,.73));
        float reflected=dot(normal,relieflamp-nominal)-relieflamp.z+nominal.z;
        float edge=smoothstep(0.0,.022,min(sculptureUV.y,1.0-sculptureUV.y));
        diffuseColor.rgb=mix(plasterGround,diffuseColor.rgb*(1.0+reflected*.46),edge);
        diffuseColor.rgb*=mix(vec3(1.0),vec3(.878,.92,.985),nightTemperature);
      `);
    };
    return wall;
  }

  function resize() {
    const w=host.clientWidth,h=host.clientHeight;
    if (!w || !h || closed) return;
    const ratio=Math.min(devicePixelRatio||1,1.15,Math.sqrt(budget/(w*h)));
    if (w===lastSize[0] && h===lastSize[1] && ratio===lastSize[2]) return;
    lastSize=[w,h,ratio];
    renderer.setDrawingBufferSize(w,h,ratio);
    aspect=w/h;
    camera.aspect=aspect;
    camera.updateProjectionMatrix();
    const width=1.087*Math.max(.57,aspect/1.48,Math.min(1,aspect/.97));
    walls.forEach(wall=>{wall.scale.x=width;});
  }

  try {
    const maps=await Promise.all(names.map(name=>Promise.all([texture(name,true),texture(name+'-depth',false)])));
    if (signal.aborted) return null;
    maps.forEach(([paint,depth],index)=>{
      const wall=new THREE.Mesh(geometry,material(paint,depth));
      wall.position.y=-slabHeight*index;
      scene.add(wall);
      walls.push(wall);
    });
    host.append(canvas);
    observer=new ResizeObserver(resize);
    observer.observe(host);
    resize();
    return {
      draw(rail,look,night,seconds) {
        if (closed) return;
        const turn=Math.sin(rail*Math.PI);
        const shift=aspect<1 ? -.62+.55*turn : -.30+.46*turn;
        const y=-slabHeight*rail+.035*look.y;
        const x=shift+.26*look.x;
        const z=16.84-.30*Math.sin(Math.PI*rail/2);
        camera.position.set(x,y,z);
        camera.lookAt(projection.set(x-.14+look.x*.31,y+.047*look.y,0));
        lamp.value.set(-.48+.51*night+.26*turn+.18*Math.sin(seconds*.39)+.16*look.x,
          .47+.09*Math.sin(seconds*.2+rail),.73).normalize();
        blue.value=night;
        renderer.render(scene,camera);
      },
      reduce() {
        if (budget<=195000) return;
        budget=Math.max(195000,Math.floor(budget*.73));
        resize();
      }
    };
  } catch(error) {
    dispose();
    throw error;
  }
}
