import { THREE, shell, state, canvas, loadModel, texture, animate, route, calm, paused, damp, clamp, failure, observeRoute } from './core.js';

export function homeChapter() {
  observeRoute(async () => {
    try {
      const view = canvas(shell, 'home', false);
      const [terrainAsset, grassAsset, dogAsset, photo, clouds] = await Promise.all([
        loadModel('home-terrain'), loadModel('grass'), loadModel('puppy'),
        texture(innerWidth < 761 ? 'assets/swiss-alps-small.webp' : 'assets/swiss-alps.webp'), texture('assets/living-clouds.webp')
      ]);
      view.renderer.toneMapping = THREE.NoToneMapping;
      photo.flipY = false; photo.needsUpdate = true;
      const terrain = terrainAsset.scene.getObjectByName('HomeTerrain');
      const relief = terrain.geometry.attributes.position.array.slice();
      const material = new THREE.MeshBasicMaterial({ map: photo, color: 0xd9e0c9 });
      const uniforms = { winterTime: { value: 0 }, winterWind: { value: 0 }, winterDay: { value: 0 } };
      material.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, uniforms);
        shader.fragmentShader = 'uniform float winterTime; uniform float winterDay;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          float cloud = smoothstep(-.15,.85,sin(vMapUv.x*7.2+vMapUv.y*3.3-winterTime*.075)+.36*sin(vMapUv.x*17.0+winterTime*.05));
          float meadow = smoothstep(.33,.70,vMapUv.y);
          diffuseColor.rgb *= 1.0-.055*cloud*(.4+.6*meadow);
          diffuseColor.rgb *= vec3(1.0+winterDay*.033,1.0+winterDay*.012,1.0-winterDay*.018);`);
        shader.vertexShader = 'uniform float winterTime; uniform float winterWind;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          float foreground = smoothstep(.66,.96,uv.y);
          float tree = smoothstep(.31,.44,uv.y)*(1.0-smoothstep(.65,.78,uv.y));
          transformed.x += (sin(winterTime*.6+position.x*14.0)*.0014*foreground+sin(winterTime*.45+position.x*10.0)*.0010*tree)*winterWind;`);
      };
      terrain.material = material; view.scene.add(terrain);
      const camera = new THREE.PerspectiveCamera(32, 1, .1, 30); camera.position.set(0, 0, 5);
      view.scene.add(new THREE.HemisphereLight(0xdbe9f0, 0x647945, 2.3));
      const sun = new THREE.DirectionalLight(0xffe4b1, 2.2); sun.position.set(-2, 4, 5); view.scene.add(sun);
      const grass = grassAsset.scene; view.scene.add(grass);
      grass.traverse(o => { if (o.isMesh) { o.material.side = THREE.DoubleSide; o.material.roughness = 1; } });
      const dogs = [dogAsset.scene, dogAsset.scene.clone(true)];
      dogs[1].traverse(o => { if (o.isMesh && /coat/.test(o.material.name)) { o.material = o.material.clone(); o.material.color.set('#a18a63'); } });
      dogs.forEach(d => view.scene.add(d));
      const cloudPlanes = [0, 1].map(i => {
        const cloud = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.3), new THREE.MeshBasicMaterial({ map: clouds, transparent: true, opacity: i ? .12 : .18, depthWrite: false }));
        cloud.position.set(i ? -.6 : .2, .74 + i * .18, i ? .05 : .36); view.scene.add(cloud); return cloud;
      });
      const shadowMap = new THREE.CanvasTexture(shadow());
      const shadows = dogs.map(() => {
        const shadow = new THREE.Mesh(new THREE.PlaneGeometry(.28, .045), new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, opacity: .26, depthWrite: false }));
        shadow.position.z = 1.06; view.scene.add(shadow); return shadow;
      });
      let width = 0, height = 0, extent = 1, extentX = 1, targetX = 0, targetY = 0, x = 0, y = 0, time = 0;
      let finger = null;
      const resize = () => {
        const r = shell.getBoundingClientRect(); width = r.width; height = r.height;
        view.size(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
        // Overscan protects the true relief edges while retaining the existing photographic framing.
        extent = Math.max(1, (width / height) / (2000 / 1335)) * 1.065;
        const visibleHeight = 2.0 / extent; camera.position.z = visibleHeight / (2 * Math.tan(THREE.MathUtils.degToRad(16)));
        extentX = visibleHeight * width / height / 2;
        const positions = terrain.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          const z = relief[i * 3 + 2], factor = (camera.position.z - z) / camera.position.z;
          positions.setXYZ(i, relief[i * 3] * factor, relief[i * 3 + 1] * factor, z);
        }
        positions.needsUpdate = true; terrain.geometry.computeBoundingSphere();
      };
      new ResizeObserver(resize).observe(shell); resize();
      shell.addEventListener('pointermove', e => {
        if (!route('home') || calm()) return;
        if (e.pointerType !== 'mouse' && finger?.id !== e.pointerId) return;
        targetX = clamp((e.clientX / width - .5) * 2, -1, 1); targetY = clamp((e.clientY / height - .5) * 2, -1, 1);
      }, { passive: true });
      shell.addEventListener('pointerdown', e => { if (route('home') && !e.target.closest('button,a,nav')) finger = { id: e.pointerId }; }, { passive: true });
      for (const event of ['pointerleave', 'pointerup', 'pointercancel']) shell.addEventListener(event, () => { finger = null; targetX = targetY = 0; }, { passive: true });
      function render(dt) {
        const moving = !calm(); if (moving) time += dt;
        x = damp(x, moving ? targetX : 0, 4, dt); y = damp(y, moving ? targetY : 0, 4, dt);
        camera.position.x = x * .018; camera.position.y = y * -.012;
        camera.lookAt(x * .008, y * -.006, 0);
        uniforms.winterTime.value = time; uniforms.winterWind.value = moving ? 1 : 0; uniforms.winterDay.value = moving ? Math.sin(time / 45) : 0;
        cloudPlanes.forEach((cloud, i) => { cloud.position.x = (i ? -.7 : .2) + Math.sin(time / (i ? 29 : 21)) * .35; });
        grass.children.forEach((g, i) => { const f = (camera.position.z - .95) / camera.position.z; g.position.set((i ? 1 : -1) * extentX * .94 * f, -.98 / extent * f, .95); g.scale.setScalar(.31 * f / extent); g.rotation.z = moving ? .024 * Math.sin(time * 1.2 + i * 2) : 0; });
        dogs.forEach((dog, i) => {
          const phase = time * .31 + i * .8;
          dog.scale.setScalar(.082 / Math.sqrt(extent));
          dog.position.set(Math.sin(phase) * extentX * .67, -.62 / extent + (moving ? Math.abs(Math.sin(time * 9.5 + i)) * .009 : 0), .38);
          dog.rotation.y = Math.cos(phase) >= 0 ? -.14 : Math.PI + .14;
          for (let leg = 0; leg < 4; leg++) { const limb = dog.getObjectByName(`DogLeg_${leg}`); limb.rotation.z = moving ? .62 * Math.sin(time * 9.5 + i + (leg === 0 || leg === 3 ? 0 : Math.PI)) : 0; }
          dog.getObjectByName('DogTail').rotation.z = moving ? .2 * Math.sin(time * 8 + i) : .1;
          shadows[i].position.x = dog.position.x; shadows[i].position.y = -.631 / extent; shadows[i].position.z = .39; shadows[i].scale.setScalar(1 / Math.sqrt(extent));
        });
        view.renderer.render(view.scene, camera);
      }
      render(.05); shell.dataset.livingHome = 'ready'; state.home = 'ready';
      animate(() => !view.lost && route('home') && !paused(), render);
      state.homeGeometry = () => ({ vertices: terrain.geometry.attributes.position.count, time, parallax: [x, y], dogs: dogs.map(d => ({ x: d.position.x, y: d.position.y })), calls: view.renderer.info.render.calls });
    } catch (error) { failure('home', error); }
  }, () => route('home'));
}
function shadow() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 16; const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 8, 1, 32, 8, 31); g.addColorStop(0, '#142314a0'); g.addColorStop(1, '#14231400'); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 16); return c;
}
