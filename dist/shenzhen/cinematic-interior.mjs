import * as THREE from './vendor/three.module.mjs';

// Self-contained nine-floor art pass. No collision or hotspot changes.
// Everything here is decorative: interaction raycasts remain owned by game-core.
export function dressNinthFloor({corridor,lobby,lift,box,panel,resources,materials}) {
  const mat=(color,roughness=.74,metalness=0,more={})=>{
    const m=new THREE.MeshStandardMaterial({color,roughness,metalness,...more});
    resources.add(m);return m;
  };
  const warmWhite=mat('#d9d5c7',.82);
  const bone=mat('#b4b2a8',.87);
  const sage=mat('#475952',.78);
  const walnut=mat('#66584b',.62);
  const oak=mat('#917a61',.59);
  const satin=mat('#7d8480',.30,.55);
  const darkMetal=mat('#303e3d',.4,.43);
  const bronze=mat('#bba47e',.34,.60);
  const linen=mat('#b7b5a4',.92);
  const windowFrame=mat('#36474a',.4,.56);
  const glass=mat('#566f74',.19,.22,{transparent:true,opacity:.23,depthWrite:false});
  const leaf=mat('#45634f',.92);

  const add=(parent,size,at,m)=>box(parent,size,at,m,null,{ray:false});
  const planeTexture=(kind)=>{
    if(typeof document==='undefined')return null;
    const c=document.createElement('canvas');c.width=c.height=512;
    const ctx=c.getContext('2d');if(!ctx)return null;
    let seed=kind==='floor'?45622:11739;
    const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
    const base=kind==='floor'?'#a5a8a0':'#c6c4b8';
    ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
    for(let i=0;i<12500;i++){
      let x=rand()*512,y=rand()*512,r=rand()*2.5+.4;
      const light=rand()>.48;
      ctx.fillStyle=light?'rgba(248,245,231,.11)':'rgba(33,41,40,.065)';
      ctx.fillRect(x,y,r*2,r*.9);
    }
    if(kind==='floor'){
      ctx.strokeStyle='rgba(62,68,64,.25)';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(0,256);ctx.lineTo(512,256);
      ctx.moveTo(256,0);ctx.lineTo(256,256);ctx.moveTo(0,0);
      ctx.lineTo(256,0);ctx.stroke();
      for(let i=0;i<50;i++){
        const x=rand()*512,y=rand()*512;
        ctx.strokeStyle='rgba(228,228,218,.085)';
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rand()*30+5,y+rand()*3);ctx.stroke();
      }
    }else{
      for(let i=0;i<25;i++){
        const x=rand()*512;ctx.strokeStyle='rgba(119,116,104,.10)';
        ctx.lineWidth=rand()*1.4+.2;ctx.beginPath();
        ctx.moveTo(x,0);ctx.bezierCurveTo(x-12,190,x+17,310,x+rand()*14-7,512);ctx.stroke();
      }
    }
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=2;resources.add(t);return t;
  };
  const floorTex=planeTexture('floor'),wallTex=planeTexture('wall');
  if(floorTex)floorTex.repeat.set(2.5,5.5);
  if(wallTex)wallTex.repeat.set(1,3);
  const tile=mat('#ece9dc',.82,.03,{map:floorTex});
  const plaster=mat('#e6e4d8',.94,0,{map:wallTex});

  // Cover the featureless floor with moderately reflective, speckled natural stone.
  add(corridor,[6.15,.014,14.8],[0,.008,-4.60],tile);
  for(let z=-11.65;z<2.7;z+=2.1)
    add(corridor,[6.14,.008,.013],[0,.019,z],bone);
  for(let x=-2.90;x<=2.92;x+=1.92)
    add(corridor,[.014,.008,14.79],[x,.019,-4.60],bone);

  // Right-hand wall is articulated at a human scale: limestone fields,
  // timber accents and brass skirting rather than a monolithic rectangle.
  for(let z=-10.75;z<2.30;z+=2.43){
    add(corridor,[.039,2.61,2.33],[3.12,1.69,z],plaster);
    add(corridor,[.058,2.78,.027],[3.078,1.69,z+1.20],satin);
  }
  add(corridor,[.09,.14,14.4],[3.04,.14,-4.48],walnut);
  add(corridor,[.026,.02,14.4],[2.98,.22,-4.48],bronze);
  add(corridor,[.085,.13,14.3],[-3.035,.16,-4.47],walnut);

  // Window: mullions, a proper sill, a restrained exterior city silhouette.
  add(corridor,[.23,.095,14.0],[-3.07,.86,-4.55],satin);
  add(corridor,[.10,.13,14.1],[-3.10,3.04,-4.55],windowFrame);
  for(let z=-11.36;z<2.7;z+=2.35){
    add(corridor,[.12,2.31,.064],[-3.07,1.97,z],windowFrame);
    add(corridor,[.05,.09,2.30],[-3.115,2.04,z+1.14],satin);
  }
  for(let z=-9.5;z<2.3;z+=3.25){
    add(corridor,[.035,1.6,1.95],[-3.18,1.92,z],glass);
  }
  // City beyond the glass is suggestive, not a claim of exact geometry.
  for(let i=0;i<8;i++){
    let z=-11.5+i*1.9,h=8+((i*7)%6);
    add(corridor,[1.2,h,1.33],[-8.0-(i%3),h/2,z],i%2?windowFrame:sage);
    for(let j=1;j<Math.min(6,h/2);j++)
      add(corridor,[.033,.12,1.01],[-7.30-(i%3),j*2.05,z],bone);
  }

  // Ceiling reveals, recesses and linear warm downlights.
  for(let z=-10.95;z<=1.85;z+=3.16){
    add(corridor,[3.25,.042,1.08],[.05,3.09,z],warmWhite);
    add(corridor,[3.1,.026,.022],[.03,3.04,z-.49],bronze);
    for(let x of [-1.18,1.20]){
      add(corridor,[.66,.013,.055],[x,3.035,z+.12],new THREE.MeshBasicMaterial({color:'#f1e2c6',toneMapped:false}));
    }
    let lamp=new THREE.PointLight('#ead8b8',5.7,6.7,2);
    lamp.position.set(.15,2.75,z);corridor.add(lamp);
  }

  // The lift threshold: realistic metallic reveals and floor number detail.
  for(let x of [-1.34,1.34]){
    add(corridor,[.11,2.96,.14],[x,1.5,-12.01],satin);
    add(corridor,[.029,2.93,.15],[x>0?x-.075:x+.075,1.5,-11.94],bronze);
  }
  add(corridor,[2.78,.16,.19],[0,3.025,-12.0],darkMetal);
  add(corridor,[2.75,.06,.10],[0,2.92,-11.96],bronze);
  add(corridor,[2.75,.022,.35],[0,.015,-11.95],satin);

  // Reception desk: tactility without moving or hiding the puzzle objects.
  // Base desk exists at (0.2, 0.5, -3.25); add the details only.
  add(corridor,[3.31,.035,1.32],[.2,1.043,-3.25],walnut);
  add(corridor,[3.26,.018,.065],[.2,.88,-3.928],bronze);
  add(corridor,[3.27,.20,.058],[.2,.17,-3.923],darkMetal);
  for(let x=-1.31;x<1.75;x+=.128){
    add(corridor,[.07,.70,.054],[x,.52,-3.925],x%3>.2?oak:walnut);
  }
  // A modest upholstered seat and side table along a non-interactive wall.
  add(corridor,[.50,.42,1.62],[2.69,.28,-7.85],sage);
  add(corridor,[.18,.78,1.62],[3.02,.58,-7.85],sage);
  add(corridor,[.41,.07,1.48],[2.64,.52,-7.85],linen);
  for(let z of [-8.37,-7.34])
    add(corridor,[.55,.32,.12],[2.75,.71,z],sage);
  // Small workday accessories; symbolic of the workplace, not personal objects.
  add(corridor,[.34,.028,.24],[-.83,1.072,-3.43],linen);
  add(corridor,[.26,.025,.33],[-.80,1.095,-3.43],bone);
  add(corridor,[.45,.035,.27],[-.77,1.075,-3.16],walnut);
  add(corridor,[.025,.12,.022],[-.50,1.145,-3.15],bronze);

  // Warm glass-wall reflections and reception sign backplate.
  add(corridor,[3.79,1.06,.08],[0,1.97,2.925],walnut);
  add(corridor,[3.63,.94,.06],[0,1.97,2.885],warmWhite);
  add(corridor,[3.67,.023,.09],[0,1.48,2.833],bronze);
  for(let x of [-2.4,2.4]){
    add(corridor,[.044,2.70,.048],[x,1.67,2.66],walnut);
  }

  // Accents in lobby and lift so the whole trip shares a material language.
  add(lobby,[11.52,.014,11.7],[0,.008,-6.0],tile);
  add(lobby,[1.0,.025,3.2],[3.32,.80,-5.6],walnut);
  for(let z=-1;z>-10;z-=2.7){
    add(lobby,[11.50,.008,.013],[0,.023,z],bone);
  }
  for(let z of [-14.75,-13.5,-12.5]){
    add(lift,[.025,2.47,.035],[1.275,1.34,z],bronze);
    add(lift,[.025,2.47,.035],[-1.275,1.34,z],bronze);
  }
  add(lift,[2.35,.014,3.15],[0,.007,-13.65],tile);
}
