const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smooth = (from, to, value) => {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const slop = 8;

export function setupReliefPrints(rail, {reducedMotion, onInput}) {
  const gallery = rail.querySelector('.relief-window');
  const landscape = [...gallery.querySelectorAll('.relief-print')];
  const controls = [...rail.querySelectorAll('[data-print-step]')];
  const surfaces = new Map([...rail.querySelectorAll('[data-print-surface]')]
    .map(element => [element, {element, x:0, y:0, frame:0}]));
  let gesture = null;
  let clickBlock = null;
  let chapter = -1;
  let selected = null;
  let active = -1;
  let mix = 0;
  let slideFrame = 0;
  let slideSurface = null;

  function setMix(value) {
    mix = value;
    rail.style.setProperty('--road', value.toFixed(3));
    const index = value >= .5 ? 1 : 0;
    if (index === active) return;
    const hasFocus = document.activeElement === landscape[active];
    active = index;
    gallery.dataset.activePhoto = landscape[index].dataset.photo;
    landscape.forEach((print, i) => { print.inert = i !== index; });
    controls.forEach(button => {
      const next = index + Number(button.dataset.printStep);
      button.disabled = next < 0 || next >= landscape.length;
    });
    if (hasFocus) landscape[index].focus({preventScroll:true});
  }

  function offset(surface, x, y) {
    surface.x = x;
    surface.y = y;
    const scale = reducedMotion() ? 1 : 1 - .034 * clamp(Math.abs(x) / 104);
    surface.element.style.setProperty('--print-x', `${x.toFixed(2)}px`);
    surface.element.style.setProperty('--print-y', `${y.toFixed(2)}px`);
    surface.element.style.setProperty('--print-scale', scale.toFixed(4));
  }

  function spring(surface) {
    cancelAnimationFrame(surface.frame);
    if (reducedMotion()) { offset(surface, 0, 0); return; }
    const {x, y} = surface;
    const start = performance.now();
    function settle(now) {
      const t = (now - start) / 1000;
      if (t >= .62) {
        offset(surface, 0, 0);
        surface.frame = 0;
        return;
      }
      const weight = Math.exp(-9.6 * t) * (Math.cos(14 * t) + 9.6 / 14 * Math.sin(14 * t));
      offset(surface, x * weight, y * weight);
      surface.frame = requestAnimationFrame(settle);
    }
    surface.frame = requestAnimationFrame(settle);
  }

  function stopSlide() {
    cancelAnimationFrame(slideFrame);
    slideFrame = 0;
    if (slideSurface) offset(slideSurface, 0, 0);
    slideSurface = null;
    gallery.style.removeProperty('--slide-distance');
  }

  function selectPrint(index, surface = null) {
    if (index < 0 || index >= landscape.length || index === active) return false;
    stopSlide();
    selected = index;
    onInput();
    if (reducedMotion()) {
      setMix(index);
      if (surface) offset(surface, 0, 0);
      return true;
    }
    const from = mix;
    const x = surface?.x ?? 0;
    const y = surface?.y ?? 0;
    slideSurface = surface;
    if (surface) gallery.style.setProperty('--slide-distance', `${Math.max(72, Math.abs(x) + 52)}px`);
    const start = performance.now();
    function glide(now) {
      const t = clamp((now - start) / 430);
      const eased = smooth(0, 1, t);
      setMix(from + (index - from) * eased);
      if (surface) offset(surface, x * (1 - eased), y * (1 - eased));
      if (t < 1) slideFrame = requestAnimationFrame(glide);
      else stopSlide();
    }
    slideFrame = requestAnimationFrame(glide);
    return true;
  }

  function finish(event, cancelled) {
    if (!gesture || (event && event.pointerId !== gesture.id)) return;
    const drag = gesture;
    gesture = null;
    if (!event && drag.print.hasPointerCapture(drag.id)) drag.print.releasePointerCapture(drag.id);
    if (drag.axis) clickBlock = {element:drag.surface.element, until:performance.now() + 550};
    if (drag.axis !== 'x') {
      if (drag.surface.x || drag.surface.y) spring(drag.surface);
      return;
    }
    drag.surface.element.removeAttribute('data-dragging');
    const enough = Math.abs(drag.distance) >= clamp(drag.width * .13, 48, 96);
    if (!cancelled && enough && drag.surface.element === gallery) {
      const direction = drag.distance < 0 ? 1 : -1;
      if (selectPrint(active + direction, drag.surface)) return;
    }
    spring(drag.surface);
  }

  rail.addEventListener('pointerdown', event => {
    const print = event.target.closest?.('.relief-print:enabled');
    if (!print || print.inert || !event.isPrimary || event.button !== 0) return;
    if (gesture) finish(null, true);
    const element = print.closest('[data-print-surface]');
    const surface = surfaces.get(element);
    if (!surface) return;
    if (element === gallery && slideFrame) {
      stopSlide();
      setMix(selected);
      if (print.inert) return;
    }
    cancelAnimationFrame(surface.frame);
    surface.frame = 0;
    clickBlock = null;
    const rect = element.getBoundingClientRect();
    gesture = {
      id:event.pointerId, print, surface, axis:null, distance:0,
      x:event.clientX, y:event.clientY, startingX:surface.x,
      width:rect.width, left:clamp(rect.left - 5, 0, 140), right:clamp(innerWidth - rect.right - 5, 0, 140)
    };
    print.setPointerCapture(event.pointerId);
    onInput();
  }, {passive:true});

  rail.addEventListener('pointermove', event => {
    const drag = gesture;
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    const horizontal = Math.abs(dx);
    const vertical = Math.abs(dy);
    if (!drag.axis && Math.max(horizontal, vertical) > slop) {
      if (horizontal <= vertical * 1.12) { drag.axis = 'y'; return; }
      drag.axis = 'x';
      drag.surface.element.setAttribute('data-dragging', '');
    }
    if (drag.axis !== 'x') return;
    drag.distance = dx;
    const reach = dx < 0 ? drag.left : drag.right;
    const follow = Math.min(horizontal, reach);
    const limited = follow - follow * follow * .13 / Math.max(reach, 1);
    offset(drag.surface, clamp(drag.startingX + Math.sign(dx) * limited, -drag.left, drag.right), clamp(dy * .18, -9, 9));
    onInput();
  }, {passive:true});
  rail.addEventListener('pointerup', event => finish(event, false), {passive:true});
  for (const name of ['pointercancel','lostpointercapture']) {
    rail.addEventListener(name, event => finish(event, true), {passive:true});
  }
  rail.addEventListener('click', event => {
    const step = event.target.closest('[data-print-step]');
    if (step && !step.disabled) selectPrint(active + Number(step.dataset.printStep));
  });
  gallery.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    selectPrint(active + (event.key === 'ArrowLeft' ? -1 : 1));
  });

  setMix(0);
  return {
    permitsClick(event, print) {
      if (event.detail === 0) return true;
      return !clickBlock || performance.now() > clickBlock.until || !clickBlock.element.contains(print);
    },
    reset() {
      finish(null, true);
      stopSlide();
      for (const surface of surfaces.values()) {
        cancelAnimationFrame(surface.frame);
        surface.frame = 0;
        offset(surface, 0, 0);
      }
      selected = null;
      chapter = -1;
      setMix(0);
      for (const key of ['landscape-travel','landscape-depth','moment-travel','couple-depth','sand-travel','sand-depth']) {
        rail.style.removeProperty(`--${key}`);
      }
    },
    project(p, nextChapter, height) {
      if (chapter === 1 && nextChapter !== 1) {
        finish(null, true);
        selected = null;
        stopSlide();
      }
      chapter = nextChapter;
      if (selected === null) setMix(smooth(.438, .532, p));
      const landscapePhase = clamp((p - .30) / .35);
      const momentArrival = smooth(.65, .796, p);
      const sandArrival = smooth(.783, .932, p);
      const chapterExit = smooth(.833, .995, p);
      rail.style.setProperty('--landscape-travel', `${((.5 - landscapePhase) * .59 * height).toFixed(2)}px`);
      rail.style.setProperty('--landscape-depth', (1.015 - .189 * Math.abs(landscapePhase - .5)).toFixed(4));
      rail.style.setProperty('--moment-travel', `${((.21 * (1 - momentArrival) - .038 * chapterExit) * height).toFixed(2)}px`);
      rail.style.setProperty('--couple-depth', (.939 + .064 * momentArrival).toFixed(4));
      rail.style.setProperty('--sand-travel', `${((1 - sandArrival) * .057 * height).toFixed(2)}px`);
      rail.style.setProperty('--sand-depth', (.93 + .07 * sandArrival).toFixed(4));
    }
  };
}
