import { state, shell } from './core.js';
import { homeChapter } from './home.js';
import { cakeChapter } from './cake.js';
import { envelopeChapter } from './envelope.js';

// The original DOM owns routes, text, saved notes, camera and the five-wick state machine.
// These views supply actual geometry and lighting without taking over those behaviours.
if (shell) {
  window.WINTER_LIVING = Object.freeze({ status: () => Object.fromEntries(Object.entries(state).map(([key, value]) => [key, typeof value === 'function' ? value() : value])) });
  const papers = Array.from({ length: 6 }, (_, i) => new Promise(resolve => {
    const image = new Image(); image.onload = () => resolve(true); image.onerror = () => resolve(false); image.src = `assets/living/paper-${i}.webp`;
  }));
  Promise.all(papers).then(results => { if (results.every(Boolean)) {
    document.querySelectorAll('[data-note-id]').forEach((note, i) => note.style.setProperty('--living-paper', `url('assets/living/paper-${i % 6}.webp')`));
    shell.dataset.livingPapers = 'ready'; state.papers = 'ready';
  } else state.papers = 'fallback'; });
  homeChapter(); cakeChapter(); envelopeChapter();
}
