import * as THREE from './assets/vendor/three/three.module.min.js';

const origin = new THREE.Vector2(-13.5, -34);
const extent = new THREE.Vector2(27, 45);
const fieldSize = 256;
const shadowSize = [896, 704];
const restingDepth = .04;
export const maxBrushSegments = 24;

function textureTarget(width, height) {
  return new THREE.WebGLRenderTarget(width, height, {
    depthBuffer:false, stencilBuffer:false, minFilter:THREE.LinearFilter,
    magFilter:THREE.LinearFilter, generateMipmaps:false
  });
}

export const sampledHeight = `
  uniform sampler2D liftMap;
  uniform vec2 wallOrigin;
  uniform vec2 wallExtent;
  uniform float fixedDepth;
  float reliefAmount(vec2 p) {
    vec2 uv = (p - wallOrigin) / wallExtent;
    float traced = texture2D(liftMap, uv).g;
    return mix(smoothstep(.025, .88, traced), 1., fixedDepth);
  }
  float reliefScale(float amount) {
    return mix(${restingDepth}, 1., amount);
  }
  float displacedDepth(float depth, float scale) {
    return min(0., depth) + max(0., depth) * scale;
  }
`;

const plasterLight = `
  float plasterWash(vec2 p) {
    return .982 + sin(p.x * .26 + p.y * .071 + .84) * .027;
  }
`;

export const galleryLight = plasterLight + `
  uniform vec3 plaster;
  uniform vec3 moonColor;
  uniform float nightAmount;
  float moonFootprint(vec2 p) {
    vec2 offset = p - vec2(.84,.92);
    float across = dot(offset,vec2(-.64,.77));
    float along = dot(offset,vec2(-.77,-.64));
    float aperture = 1.75 + clamp(along + 3.6, 0., 8.) * .13;
    float beam = 1. - smoothstep(aperture * .28, aperture, abs(across + .12));
    return beam * (.68 + .32 * (1. - smoothstep(-5.,4.,along))) * smoothstep(-2.8,-.24,p.y);
  }
  vec3 roomPlaster(vec2 p) {
    vec3 room = plaster * plasterWash(p);
    if (nightAmount <= 0.) return room;
    vec2 spill = (p-vec2(-2.24,.41))*vec2(.51,.55);
    float reflected = .076 * exp(-dot(spill,spill));
    return room + moonColor * nightAmount * (.078 + reflected + .39 * moonFootprint(p));
  }
  vec3 sculptedShadow(vec3 color, float strength) {
    vec3 hue = mix(vec3(.70,.83,1.),vec3(1.04,1.01,.88),nightAmount);
    return color * (1. - hue * strength * mix(.34,.40,nightAmount));
  }
`;

export const projectedShadow = `
  uniform sampler2D shadowAtlas;
  uniform vec2 shadowOrigin;
  uniform vec2 shadowExtent;
  float shadowAt(vec2 p) {
    return texture2D(shadowAtlas,(p-shadowOrigin)/shadowExtent).r;
  }
`;

export function createReliefField(renderer) {
  let read = textureTarget(fieldSize, fieldSize);
  let write = textureTarget(fieldSize, fieldSize);
  const hardShade = textureTarget(...shadowSize);
  const shade = textureTarget(...shadowSize);
  const map = {value:read.texture};
  const room = {wallOrigin:{value:origin},wallExtent:{value:extent}};
  const shadow = {shadowOrigin:{value:new THREE.Vector2()},shadowExtent:{value:new THREE.Vector2(1,1)}};
  const lightVector = {value:new THREE.Vector2(-.48, .60)};
  const backdrop = new THREE.Color(0xe9e9e6);
  const light = {plaster:{value:backdrop}, moonColor:{value:new THREE.Color(0xaec4e1)}, nightAmount:{value:0}};
  const buffers = new Map();
  const projectedShadows = new THREE.Scene();
  const flatCamera = new THREE.Camera();
  const quad = new THREE.PlaneGeometry(2, 2);
  const ink = new THREE.ShaderMaterial({
    depthTest:false,depthWrite:false,
    uniforms:{
      ...room, previous:map, dt:{value:.016},
      strokes:{value:Array.from({length:maxBrushSegments},()=>new THREE.Vector4())},
      strokeCount:{value:0}, brushShape:{value:new THREE.Vector2()},
      ghost:{value:new THREE.Vector4()}, ghostShape:{value:new THREE.Vector2()}
    },
    vertexShader:`
      varying vec2 tracedUV;
      void main() {
        tracedUV = uv;
        gl_Position = vec4(position.xy, 0., 1.);
      }
    `,
    fragmentShader:`
      varying vec2 tracedUV;
      uniform sampler2D previous;
      uniform vec2 wallOrigin;
      uniform vec2 wallExtent;
      uniform vec4 strokes[${maxBrushSegments}];
      uniform int strokeCount;
      uniform vec4 ghost;
      uniform vec2 brushShape;
      uniform vec2 ghostShape;
      uniform float dt;
      float inkAt(vec2 p, vec4 line, vec2 shape) {
        if (shape.y <= 0.) return 0.;
        vec2 edge = line.zw - line.xy;
        float t = clamp(dot(p - line.xy, edge) / max(dot(edge,edge), .0001), 0., 1.);
        float d = length(p - line.xy - edge * t);
        return (1. - smoothstep(shape.x * .16, max(.001,shape.x),d)) * shape.y;
      }
      void main() {
        vec2 p = wallOrigin + tracedUV * wallExtent;
        vec2 old = texture2D(previous,tracedUV).rg;
        float fading = max(0., min(old.r * exp(-dt / 1.04), old.r - 1./255.));
        float head = max(fading, inkAt(p,ghost,ghostShape));
        for (int i=0; i<${maxBrushSegments}; i++) {
          if (i >= strokeCount) break;
          head = max(head, inkAt(p,strokes[i],brushShape));
        }
        float response = head > old.g ? .135 : .26;
        float lifted = mix(old.g,head,1. - exp(-dt / response));
        if (head < old.g) lifted = max(head,min(lifted,old.g-1./255.));
        else lifted = min(head,max(lifted,old.g+1./255.));
        gl_FragColor = vec4(head > .008 ? head : 0., lifted > .012 ? lifted : 0., 0., 1.);
      }
    `
  });
  const paint = new THREE.Scene();
  const pass = new THREE.Mesh(quad, ink);
  pass.frustumCulled = false;
  paint.add(pass);
  const penumbra = new THREE.ShaderMaterial({
    depthTest:false,depthWrite:false,
    uniforms:{source:{value:hardShade.texture},texel:{value:new THREE.Vector2(1/shadowSize[0],1/shadowSize[1])}},
    vertexShader:`
      varying vec2 p;
      void main() { p = uv; gl_Position = vec4(position.xy,0.,1.); }
    `,
    fragmentShader:`
      uniform sampler2D source;
      uniform vec2 texel;
      varying vec2 p;
      void main() {
        vec2 x = vec2(1.48*texel.x,0.);
        vec2 y = vec2(0.,1.32*texel.y);
        float shade = texture2D(source,p).r*.32 + .17*(texture2D(source,p+x).r +
          texture2D(source,p-x).r + texture2D(source,p+y).r + texture2D(source,p-y).r);
        gl_FragColor = vec4(shade,0.,0.,1.);
      }
    `
  });
  const soften = new THREE.Scene();
  const filter = new THREE.Mesh(quad,penumbra);
  filter.frustumCulled = false;
  soften.add(filter);
  const wall = new THREE.ShaderMaterial({
    depthWrite:true,
    uniforms:{...shadow,...light,shadowAtlas:{value:shade.texture}},
    vertexShader:`
      varying vec2 wallPoint;
      void main() {
        wallPoint = (modelMatrix * vec4(position,1.)).xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
      }
    `,
    fragmentShader:galleryLight + projectedShadow + `
      varying vec2 wallPoint;
      void main() {
        gl_FragColor = vec4(sculptedShadow(roomPlaster(wallPoint),shadowAt(wallPoint)),1.);
        #include <colorspace_fragment>
      }
    `
  });

  function casterFor(fixedDepth) {
    return new THREE.ShaderMaterial({
      uniforms:{...room,...shadow,liftMap:map,fixedDepth:{value:fixedDepth},lightVector},
      side:THREE.DoubleSide,transparent:true,depthTest:false,depthWrite:false,
      blending:THREE.CustomBlending,blendEquation:THREE.MaxEquation,
      blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,
      vertexShader: sampledHeight + `
        uniform vec2 lightVector;
        uniform vec2 shadowOrigin;
        uniform vec2 shadowExtent;
        varying float shadeValue;
        void main() {
          vec3 stone = (modelMatrix * vec4(position,1.)).xyz;
          float amount = reliefAmount(stone.xy);
          float z = max(0.,displacedDepth(stone.z,reliefScale(amount)));
          vec2 projected = stone.xy - z * lightVector;
          shadeValue = smoothstep(.012,.48,z) * smoothstep(.015,.70,amount);
          gl_Position = vec4((projected - shadowOrigin) / shadowExtent * 2. - 1., 0.,1.);
        }
      `,
      fragmentShader:`
        varying float shadeValue;
        void main() { gl_FragColor = vec4(shadeValue, 0., 0., 1.); }
      `
    });
  }

  function add(mesh, fixedDepth) {
    const caster = new THREE.Mesh(mesh.geometry, casterFor(fixedDepth));
    caster.matrixAutoUpdate = false;
    caster.frustumCulled = false;
    buffers.set(mesh, caster);
    projectedShadows.add(caster);
  }

  function stamp(uniform, shape, stroke) {
    if (!stroke) {shape.value.set(.001,0);return;}
    uniform.value.set(stroke.from.x,stroke.from.y,stroke.to.x,stroke.to.y);
    shape.value.set(stroke.radius,stroke.strength);
  }

  function clear(target) {
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000);
    renderer.clear(true,false,false);
  }
  function resetInk() {
    clear(read);
    clear(write);
    renderer.setRenderTarget(null);
  }
  resetInk();

  function step(dt, brush, ghost) {
    ink.uniforms.dt.value = dt;
    ink.uniforms.strokeCount.value = brush?.segments.length ?? 0;
    if (brush) {
      ink.uniforms.brushShape.value.set(brush.radius,brush.strength);
      brush.segments.forEach(({from,to},i)=>ink.uniforms.strokes.value[i].set(from.x,from.y,to.x,to.y));
    }
    stamp(ink.uniforms.ghost, ink.uniforms.ghostShape, ghost);
    renderer.setRenderTarget(write);
    renderer.render(paint,flatCamera);
    [read,write] = [write,read];
    map.value = read.texture;
  }

  function shadows(x,y,width,height,hasInk) {
    shadow.shadowOrigin.value.set(x-width/2,y-height/2);
    shadow.shadowExtent.value.set(width,height);
    for (const [mesh,caster] of buffers) {
      caster.visible = mesh.visible && (hasInk || caster.material.uniforms.fixedDepth.value>0);
      if(!caster.visible)continue;
      caster.matrix.copy(mesh.matrixWorld);
      caster.matrixWorldNeedsUpdate = true;
    }
    renderer.setClearColor(0x000000);
    renderer.setRenderTarget(hardShade);
    renderer.render(projectedShadows, flatCamera);
    renderer.setRenderTarget(shade);
    renderer.render(soften,flatCamera);
    renderer.setRenderTarget(null);
  }

  function sample(target, point, channel, size = 1, start=origin, span=extent) {
    const half = Math.floor(size/2);
    const x = Math.round((point.x-start.x)/span.x*(target.width-1)) - half;
    const y = Math.round((point.y-start.y)/span.y*(target.height-1)) - half;
    if(x<0 || y<0 || x+size>target.width || y+size>target.height)return null;
    const pixels = new Uint8Array(size*size*4);
    renderer.readRenderTargetPixels(target,x,y,size,size,pixels);
    let sum = 0;
    for(let i=channel;i<pixels.length;i+=4)sum+=pixels[i]/255;
    return sum/(size*size);
  }

  // Compile the touch shader during loading so the first stroke does not have to wait for it.
  step(.016,null,null);
  renderer.setRenderTarget(null);

  return {
    room,map,wall,backdrop,light,lightVector,add,step,resetInk,shadows,
    probe(point) {
      return {height:sample(read,point,1),shadow:sample(shade,point,0,9,shadow.shadowOrigin.value,shadow.shadowExtent.value)};
    },
    dispose() {
      read.dispose(); write.dispose(); shade.dispose(); hardShade.dispose();
      quad.dispose(); ink.dispose(); wall.dispose(); penumbra.dispose();
      for (const caster of buffers.values()) caster.material.dispose();
    }
  };
}
