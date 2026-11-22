(() => {
  'use strict';
  const gallery = document.getElementById('cosmos-gallery');
  const wall = document.getElementById('cosmos-photo-wall');
  if (!gallery || !wall) return;
  const cards = [...wall.querySelectorAll('.photo-memory')];
  if (cards.length !== 19) return;
  gallery.classList.add('cosmos-constellation-album');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'memory-expand';
  wall.after(toggle);

  // Asymmetric half-arcs across three depths, using each photograph's own ratio.
  const positions = [
    [10,32,-3.5],[22,21,2.4],[35,12,-1.5],[49,9,1.6],[64,12,-2.8],[78,18,2.6],[90,29,4],
    [9,61,3.2],[21,52,-2.5],[34,44,1.2],[49,39,-1.7],[63,43,2.8],[77,49,-2.2],[91,59,2.9],
    [23,80,-3],[36,74,2.2],[50,69,-1.8],[64,72,2.4],[78,80,-2.5]
  ];
  const ratios = [.605455,.561818,.666364,.666364,.561818,.562727,.666364,1.500682,.561818,
    .75,1.500682,.799091,.749091,.75,1.77706,.562727,.567273,.562727,.75];
  const sizes = [92,77,99,88,103,82,89,86,105,96,113,84,102,87,99,94,111,83,103];
  const stack = new Map([[5,[0,-5,8]],[3,[-62,-20,6]],[14,[56,-23,5]],[10,[-98,30,4]],[17,[95,33,3]]]);
  let expanded = false;

  cards.forEach((card, i) => {
    const frame = card.querySelector('.photo-memory-frame');
    const img = document.createElement('img');
    img.src = 'assets/memory-wall/memory-' + String(i + 1).padStart(2,'0') + '.webp';
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.draggable = false;
    frame.replaceChildren(img);
    // The original lightbox still opens the same full-resolution file.
    frame.style.removeProperty('background-image');
    const [x,y,angle] = positions[i];
    const [px,py,depth] = stack.get(i) ?? [(i*29)%74-37,(i*11)%39-12,1];
    const row = Math.floor(i/4);
    const column = i%4;
    const values = {
      '--photo-index': i, '--open-delay': (i%7)*17+'ms', '--photo-ratio': ratios[i], '--photo-area': sizes[i]*Math.sqrt(ratios[i]),
      '--arc-x': (x*.82+10)-50, '--arc-y': (y-(x-50)*.22+3)-50,
      '--phone-x': column*24+14+[0,2,-1,0,6][row]-50, '--phone-y': 13+row*18+Math.abs(column-1.5)*2.8-50,
      '--arc-angle': (angle*.76)+'deg', '--stack-x': px+'px', '--stack-y': py+'px',
      '--stack-angle': (px/10)+'deg', '--stack-depth': depth,
      '--gather-x': ((x-50)*1.35)+'px', '--gather-y': ((y-50)*.8)+'px',
      '--drift-cycle': (15 + (i%7)*2.3)+'s', '--drift-phase': -(i*2.7%16)+'s',
      '--drift-rise': -(2+i%3)+'px'
    };
    Object.entries(values).forEach(([name,value]) => card.style.setProperty(name,value));
    if (stack.has(i) && i !== 10) card.dataset.floats = 'true';
  });
  function set(value) {
    expanded = value;
    if (value) gallery.closest('dialog')?.removeAttribute('data-entrance');
    wall.dataset.expanded = String(value);
    toggle.textContent = value ? '收拢回忆 ↙' : '展开回忆 ↗';
    toggle.setAttribute('aria-expanded', String(value));
    cards.forEach((card, i) => {
      const reachable = value || i === 5;
      card.tabIndex = reachable ? 0 : -1;
      card.setAttribute('aria-hidden', String(!reachable));
    });
  }
  wall.addEventListener('click', event => {
    if (!expanded) {
      event.preventDefault();
      event.stopImmediatePropagation();
      set(true);
    }
  }, true);
  toggle.addEventListener('click', () => set(!expanded));
  document.addEventListener('winter:cosmos-stage', event => {
    if (event.detail?.stage === 'cosmos-gallery') set(false);
  });
  set(false);
})();
