// Cinematic street dressing. Geometry is decorative and intentionally separate
// from the existing collision volumes, hotspots and chapter progression.
export function applyCinematicStreet({THREE,scene,street,city,box,register,resources,materials}) {
  const mat=(color,roughness=.72,metalness=.05,extras={}) =>
    new THREE.MeshStandardMaterial({color,roughness,metalness,...extras});
  const asphalt=mat('#39434a',.94),concrete=mat('#9ca5a3',.89);
  const cladding=mat('#58666b',.73,.14),sand=mat('#b1b5ad',.89);
  const windowDark=mat('#314b53',.28,.28),windowBlue=mat('#53727b',.24,.24);
  const steel=mat('#62777a',.35,.64),warm=mat('#d0b88a',.53,.14);
  const trim=mat('#293d42',.55,.38),light= new THREE.MeshBasicMaterial({color:'#e7d7bb',toneMapped:false});
  const leafMats=['#2e4d3f','#41614d','#56725b','#385c4b','#657965'].map(c=>mat(c,.91));
  const bark=mat('#5d554c',.96),shade=mat('#596c6b',.82);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(164,32,18),
    new THREE.ShaderMaterial({
      side:THREE.BackSide,depthWrite:false,depthTest:false,
      vertexShader:'varying vec3 vDirection; void main(){vDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'varying vec3 vDirection; void main(){vec3 d=normalize(vDirection);float h=clamp((d.y+.055)*1.42,0.,1.);vec3 low=vec3(.60,.67,.69);vec3 top=vec3(.25,.38,.46);vec3 c=mix(low,top,smoothstep(.0,.84,h));float haze=(1.-smoothstep(.02,.40,abs(d.y)));c=mix(c,vec3(.73,.70,.66),.18*haze);float wave=sin(d.x*28.+d.z*7.)*.5+sin(d.x*51.-d.z*11.)*.22+sin(d.x*13.+d.z*25.)*.3;float cloud=smoothstep(.38,.78,wave)*smoothstep(.03,.36,d.y)*(1.-smoothstep(.56,.78,d.y));c=mix(c,vec3(.66,.72,.73),cloud*.19);gl_FragColor=vec4(c,1.);}'
    }));
  sky.renderOrder=-100;sky.frustumCulled=false;scene.add(sky);resources.add(sky.geometry);

  // The real street continues visually outside the playable pedestrian block.
  // This avoids the current hard void/empty-horizon look without changing movement.
  box(city,[115,.075,130],[0,-.24,70],asphalt,null,{ray:false});
  for(let z=27;z<86;z+=9.6) {
    box(city,[.12,.012,4.7],[-2,-.181,z],sand,null,{ray:false});
    box(city,[.12,.012,4.7],[2,-.181,z],sand,null,{ray:false});
  }
  for(const side of [-1,1]) {
    // Two lower-rise blocks on the sides enclose the street at human scale.
    for(let index=0;index<2;index++) {
      const z=index===0?7.3:19.7, h=index===0?17.5:14.2;
      const x=side*16.1,front=side*11.92;
      box(city,[8.35,h,11.3],[x,h/2,z],index===0?cladding:sand,null,{ray:false});
      box(city,[8.55,.31,11.7],[x,h+.11,z],trim,null,{ray:false});
      box(city,[.10,2.95,10.7],[front,1.5,z],windowDark,null,{ray:false});
      for(let floor=1;floor<Math.floor(h/3.15);floor++) {
        const y=floor*3.15+1.6;
        for(let col=0;col<5;col++) {
          const zz=z-4.2+col*2.06;
          box(city,[.085,2.10,1.68],[front,y,zz],(floor+col)%4===0?windowBlue:windowDark,null,{ray:false});
          box(city,[.115,.10,1.87],[front,y+1.12,zz],steel,null,{ray:false});
        }
        box(city,[.18,.22,11.3],[front,y-1.23,z],trim,null,{ray:false});
      }
      for(let col=0;col<6;col++) {
        const zz=z-5+col*1.98;
        box(city,[.14,2.8,.075],[front,1.5,zz],steel,null,{ray:false});
      }
      box(city,[1.42,.24,11.7],[front+side*.20,3.06,z],shade,null,{ray:false});
      box(city,[.10,.08,11.3],[front,4.35,z],warm,null,{ray:false});
    }
  }

  // Main entrance's existing collision and double-door meshes stay intact.
  // The added architecture carries actual depth, window rhythm and a clear plinth.
  box(street,[16.1,.32,3.66],[0,3.92,1.50],trim,null,{ray:false,shadow:true});
  box(street,[15.8,.10,3.72],[0,3.70,1.50],steel,null,{ray:false});
  for(const side of [-1,1]) {
    for(let i=0;i<3;i++) {
      const x=side*(3.12+i*1.66);
      box(street,[.075,2.82,.12],[x,1.42,.145],steel,null,{ray:false});
      box(street,[1.42,2.52,.044],[x,1.44,.21],windowDark,null,{ray:false});
    }
    box(street,[.10,3.1,.17],[side*1.55,1.55,.15],steel,null,{ray:false});
    box(street,[1.25,.29,3.22],[side*6.48,3.35,1.34],cladding,null,{ray:false});
  }
  // A narrow contrasting soffit and recessed entrance lighting.
  for(let x=-5.6;x<=5.7;x+=2.8)box(street,[1.55,.028,.05],[x,3.55,3.12],light,null,{ray:false});
  box(street,[3.38,.17,.25],[0,2.92,.26],trim,null,{ray:false});
  box(street,[3.15,.05,.15],[0,2.82,.27],steel,null,{ray:false});

  // Replace a single giant shiny plane with distinct facade windows and spandrels.
  const paneGeo=new THREE.BoxGeometry(1.45,2.52,.065);
  const paneCount=9*8,paneMesh=new THREE.InstancedMesh(paneGeo,windowDark,paneCount);
  const dummy=new THREE.Object3D();let p=0;
  for(let row=0;row<9;row++)for(let col=0;col<8;col++) {
    dummy.position.set(-6.50+col*1.86,5.25+row*3.31,3.34);
    dummy.updateMatrix();paneMesh.setMatrixAt(p,dummy.matrix);
    paneMesh.setColorAt(p,new THREE.Color((row+col)%5===0?'#67818a':(row*3+col)%4===0?'#405f6b':'#36545e'));p++;
  }
  paneMesh.instanceMatrix.needsUpdate=true;paneMesh.instanceColor.needsUpdate=true;
  street.add(paneMesh);resources.add(paneGeo);
  for(let y=4.0;y<35;y+=3.31)box(street,[15.35,.31,.42],[0,y,3.39],cladding,null,{ray:false});
  for(let x=-7.43;x<=7.45;x+=1.86)box(street,[.09,31.6,.16],[x,19.83,3.47],steel,null,{ray:false});

  // Readable bollards, handrails and physically plausible pavement edging.
  for(let z=3;z<18;z+=3.6) {
    for(const side of [-1,1]) {
      const x=side*10.92;
      box(street,[.08,.69,.08],[x,.345,z],steel,null,{ray:false});
      box(street,[.13,.055,.13],[x,.72,z],warm,null,{ray:false});
    }
  }
  for(const side of [-1,1]) {
    const x=side*11.05;
    box(street,[.10,.17,20.5],[x,.085,10],concrete,null,{ray:false});
  }
  // Naturalistic tree silhouettes made from several tapered branches and
  // overlapping nonuniform leaf clusters instead of five stretched spheres.
  const branchGeo=new THREE.CylinderGeometry(.17,.23,1,9);
  const crownGeo=new THREE.SphereGeometry(1,13,9);
  resources.add(branchGeo);resources.add(crownGeo);
  const Y=new THREE.Vector3(0,1,0);
  function limb(group,from,to,radius) {
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),dir=b.clone().sub(a);
    const mesh=new THREE.Mesh(branchGeo,bark);
    mesh.position.copy(a.add(b).multiplyScalar(.5));
    mesh.scale.set(radius,dir.length(),radius);
    mesh.quaternion.setFromUnitVectors(Y,dir.normalize());
    mesh.castShadow=true;group.add(mesh);
  }
  function tree(x,z,seed) {
    const group=new THREE.Group();group.position.set(x,0,z);street.add(group);
    const lean=seed===0?.17:-.14;
    limb(group,[0,.02,0],[lean,3.95,0],1.1);
    for(let i=0;i<6;i++) {
      const a=i*Math.PI*2/6+seed*.63,from=[lean*.7,2.75+i*.1,0];
      const tip=[Math.cos(a)*(1.4+(i%2)*.38),4.48+((i+1)%3)*.3,Math.sin(a)*1.2];
      limb(group,from,tip,.36);
    }
    const foliage=new THREE.InstancedMesh(crownGeo,leafMats[0],34);
    const t=new THREE.Object3D();let n=0;
    for(let i=0;i<34;i++) {
      const phi=i*2.399963+seed*1.2;
      const rr=.30+Math.sqrt((i+.5)/34)*1.85;
      const y=4.65+.46*Math.sin(i*2.7)+.38*(1-(rr/2.3));
      t.position.set(Math.cos(phi)*rr+lean, y,Math.sin(phi)*rr*.71);
      t.rotation.set(Math.sin(i)*.15,phi,Math.cos(i)*.12);
      t.scale.set(.58+(i%5)*.07,.48+(i%7)*.06,.62+(i%4)*.06);
      t.updateMatrix();foliage.setMatrixAt(n,t.matrix);
      foliage.setColorAt(n,new THREE.Color(['#304e40','#436750','#55735a','#3b594a','#637861'][(i*7+seed)%5]));n++;
    }
    foliage.instanceMatrix.needsUpdate=true;foliage.instanceColor.needsUpdate=true;
    foliage.castShadow=false;group.add(foliage);
  }
  tree(-8.8,5,0);tree(8.8,5,1);

  // Subtle warm urban lighting. The luminaires, not a neon overlay, provide color.
  for(const x of [-11.45,11.45])for(const z of [5.9,15.4]) {
    box(street,[.12,4.25,.12],[x,2.13,z],steel,null,{ray:false});
    box(street,[.68,.065,.19],[x-(x>0?.24:-.24),4.18,z],trim,null,{ray:false});
    box(street,[.39,.035,.17],[x-(x>0?.38:-.38),4.12,z],light,null,{ray:false});
    const glow=new THREE.PointLight('#dfc5a0',7.5,7,2);glow.position.set(x-(x>0?.35:-.35),4.02,z);street.add(glow);
  }
}
