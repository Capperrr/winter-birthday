import { THREE, shell, state, canvas, loadModel, animate, calm, paused, smooth, failure, observeRoute } from './core.js';

export function envelopeChapter() {
  observeRoute(async () => {
    try {
      const card = document.getElementById('gift-envelope'), view = canvas(card, 'envelope');
      const gltf = await loadModel('envelope'); const model = gltf.scene; view.scene.add(model);
      model.traverse(o => { if (o.isMesh) { o.material.side = THREE.DoubleSide; o.material.envMapIntensity = .15; } });
      const camera = new THREE.OrthographicCamera(-4.86, 4.86, 4.446, -3.762, .1, 30); camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0);
      const flap = model.getObjectByName('EnvelopeFlapHinge'), sheet = model.getObjectByName('LetterSheet'), fold = model.getObjectByName('LetterFold');
      flap.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.set('#ded7c2'); } });
      const thickness = new THREE.Mesh(new THREE.BoxGeometry(5.39, 3.41, .035), new THREE.MeshStandardMaterial({ color: '#d3cbb2', roughness: .95 })); thickness.position.z = -.07; model.add(thickness);
      const bows = ['BowLeft', 'BowRight'].map(name => model.getObjectByName(name));
      const strings = ['TwineHorizontal', 'TwineVertical'].map(name => model.getObjectByName(name));
      let previous = shell.dataset.destination, began = performance.now(), total = 0;
      new MutationObserver(() => { if (shell.dataset.destination !== previous) { previous = shell.dataset.destination; began = performance.now(); } }).observe(shell, { attributes: true, attributeFilter: ['data-destination'] });
      function render(dt) {
        const phase = shell.dataset.destination, elapsed = (performance.now() - began) / 1000;
        total += dt;
        const untying = phase === 'untying', opening = phase === 'opening';
        const u = opening ? 1 : untying ? smooth(elapsed / .55) : 0;
        bows.forEach((bow, i) => { bow.position.x = -1.48 + (i ? 1 : -1) * u * 1.5; bow.scale.set(1 - u * .85, 1 - u * .6, 1); bow.visible = u < .99; });
        strings.forEach((string, i) => { string.visible = u < .99; string.position[i ? 'x' : 'y'] = u * (i ? -2 : -3); });
        const f = opening ? smooth(elapsed / .40) : 0;
        flap.rotation.x = -Math.PI * .92 * f;
        sheet.position.y = opening ? smooth(elapsed / .85) * 2.1 : 0;
        fold.rotation.x = opening ? Math.PI * .55 * smooth((elapsed - .15) / .7) : 0;
        model.rotation.y = calm() || phase !== 'envelope' ? 0 : .018 * Math.sin(total * .55);
        const r = card.getBoundingClientRect(); if (r.width) view.size(r.width * 1.8, r.height * 2.4);
        view.renderer.render(view.scene, camera);
      }
      render(.05); shell.dataset.livingEnvelope = 'ready'; state.envelope = 'ready';
      animate(() => !view.lost && shell.dataset.page === 'destination' && ['envelope', 'untying', 'opening'].includes(shell.dataset.destination) && !paused(), render,
        () => !calm() || ['untying', 'opening'].includes(shell.dataset.destination));
      state.envelopePose = () => ({ phase: previous, flap: flap.rotation.x, sheet: sheet.position.y, bows: bows.map(b => b.visible) });
    } catch (error) { failure('envelope', error); }
  }, () => shell.dataset.page === 'destination' && shell.dataset.destination === 'envelope');
}
