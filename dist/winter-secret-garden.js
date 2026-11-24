import * as THREE from './assets/vendor/three/three.module.min.js';
import {galleryLight, projectedShadow, sampledHeight} from './winter-relief-field.js?v=continuous-relief';

const depthURL = new URL('./assets/home/secret-garden-depth.bin?v=wagtails', import.meta.url);
const normalURL = new URL('./assets/home/secret-garden-light.webp?v=plaster-light', import.meta.url);
const lightLevelsURL = new URL('./assets/home/secret-garden-light-levels.webp', import.meta.url);
const columns = 521;
const rows = 345;
const width = 13.6;
const height = 9;
const maximumDepth = 1.12;

export const gardenLandmarks = [
  ['Open_hellebore', -3.65, -.75],
  ['Bird_on_the_branch', -1.98, .69],
  ['The_arriving_bird', 2.30, 1.18],
  ['Primary_flight_feathers', 3.45, 2.86],
  ['Camellia_crown', 2.96, -.48],
  ['Bough_and_leaf_veins', -4.29, -1.73]
].map(([name,x,y])=>({name, point:new THREE.Vector3(x,y,0)}));

async function request(url, signal) {
  const response = await fetch(url,{signal});
  if(!response.ok)throw new Error(`${url.pathname} HTTP ${response.status}`);
  return response;
}

async function decodePass(source, width, height, signal) {
  const response = await request(source, signal);
  const url = URL.createObjectURL(await response.blob());
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    if(image.naturalWidth!==width||image.naturalHeight!==height)
      throw new Error(`${source.pathname} 光影贴图尺寸不符`);
  } finally {
    URL.revokeObjectURL(url);
  }
  return image;
}

export async function loadSecretGarden(signal) {
  const [depth, surface, levels] = await Promise.all([
    request(depthURL,signal).then(response=>response.arrayBuffer()),
    decodePass(normalURL,2720,1800,signal),
    decodePass(lightLevelsURL,1920,3840,signal)
  ]);
  if(depth.byteLength!==columns*rows*Uint16Array.BYTES_PER_ELEMENT)
    throw new Error('冬日秘境高度图尺寸不符');
  return {depth:new Uint16Array(depth),surface,levels};
}

export function sculptGarden({depth,surface,levels}, field) {
  // Physical relief scanned from Blender. Remove flat cells shared with the continuous wall.
  const geometry = new THREE.PlaneGeometry(width,height,columns-1,rows-1);
  const position = geometry.getAttribute('position');
  for(let i=0;i<depth.length;i++)position.setZ(i,depth[i]*maximumDepth/65535);
  const faces = [];
  const index = geometry.index.array;
  for(let i=0;i<index.length;i+=3){
    const a=index[i], b=index[i+1], c=index[i+2];
    if(Math.max(depth[a],depth[b],depth[c])>242)faces.push(a,b,c);
  }
  geometry.setIndex(faces);
  geometry.deleteAttribute('normal');
  geometry.computeBoundingBox();
  const lighting = new THREE.Texture(surface);
  lighting.colorSpace = THREE.NoColorSpace;
  lighting.needsUpdate = true;
  const casts = new THREE.Texture(levels);
  casts.colorSpace = THREE.NoColorSpace;
  casts.generateMipmaps = false;
  casts.minFilter = THREE.LinearFilter;
  casts.needsUpdate = true;
  const material = new THREE.ShaderMaterial({
    uniforms:{...field.wall.uniforms,...field.room,liftMap:field.map,fixedDepth:{value:0},
      lighting:{value:lighting},casts:{value:casts}, lightVector:field.lightVector},
    vertexShader:sampledHeight + `
      varying vec2 castUV;
      varying vec2 wallPoint;
      varying vec2 liftSlope;
      varying float scale;
      varying float awake;
      void main() {
        vec4 stone = modelMatrix * vec4(position,1.);
        wallPoint = stone.xy;
        castUV = uv;
        awake = reliefAmount(wallPoint);
        scale = reliefScale(awake);
        vec2 difference = vec2(reliefScale(reliefAmount(wallPoint+vec2(.12,0.))),
          reliefScale(reliefAmount(wallPoint+vec2(0.,.12)))) - vec2(scale);
        liftSlope = difference * (stone.z/.12);
        stone.z = displacedDepth(stone.z,scale) + .001;
        gl_Position = projectionMatrix * viewMatrix * stone;
      }
    `,
    fragmentShader:galleryLight + projectedShadow + `
      uniform vec2 lightVector;
      uniform sampler2D lighting;
      uniform sampler2D casts;
      varying vec2 castUV;
      varying vec2 wallPoint;
      varying vec2 liftSlope;
      varying float scale;
      varying float awake;
      vec3 castAt(float tile) {
        // Four replicated scanlines on either end isolate the three Cycles passes.
        vec2 texel = vec2(castUV.x * 1919. + .5, tile * 1280. + 4.5 + castUV.y * 1271.);
        return texture2D(casts,texel / vec2(1920.,3840.)).rgb;
      }
      void main() {
        vec4 bake = texture2D(lighting,castUV);
        vec2 vane = (bake.rg*255. - vec2(128.))/127.;
        float nz = sqrt(max(.014,1.-dot(vane,vane)));
        vec3 normal = normalize(vec3(vane*scale - liftSlope*nz,nz));
        vec3 light = normalize(vec3(lightVector,1.));
        float facing = max(0.,dot(light,normal));
        float footprint = nightAmount > 0. ? moonFootprint(wallPoint) : 0.;
        float rakingLight = (facing-light.z)*mix(.46,.65 + .18*footprint,nightAmount);
        vec3 fill = vec3(-.49,.23,.841);
        float reflected = (max(0.,dot(fill,normal))-fill.z)*.13*nightAmount;
        float engraving = dot(vane,light.xy)*mix(.068,.164,nightAmount)*(1.-awake);
        float contact = (1.-bake.b)*(.041+.095*awake);
        if (awake > .025) {
          float level = 2. * awake;
          float tile = min(1.,floor(level));
          vec3 illumination = mix(castAt(tile),castAt(tile + 1.),smoothstep(0.,1.,level - tile));
          float bakedLight = clamp(mix(illumination.r,illumination.g,nightAmount) * (255. / 163.) - 1.,-.92,.62);
          float influence = smoothstep(.025,.76,awake);
          rakingLight = mix(rakingLight,bakedLight * mix(.45,.56,nightAmount),.57*influence);
          contact += (1.-illumination.b) * .19 * influence;
        }
        float value = max(.36,1. + rakingLight + reflected + engraving - contact);
        float rim = (1. - normal.z) * (1. - normal.z) * facing;
        vec3 silver = moonColor * (nightAmount * awake * rim * (.08 + .22*footprint));
        vec3 plasterBase = roomPlaster(wallPoint);
        vec3 stone = mix(plasterBase,plasterBase*value + silver,bake.a);
        gl_FragColor = vec4(sculptedShadow(stone,shadowAt(wallPoint)),1.);
        #include <colorspace_fragment>
      }
    `
  });
  const mesh = new THREE.Mesh(geometry,material);
  mesh.name = 'A Secret Winter Garden';
  mesh.frustumCulled = false;
  return {mesh, dispose(){ material.dispose(); lighting.dispose(); casts.dispose(); }};
}
