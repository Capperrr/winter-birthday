(() => {
  const shell = document.getElementById('main');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const papers = {
    china: { paper: document.getElementById('memory-china'), text: document.getElementById('china-letter-text'), counter: document.getElementById('china-note-counter'), label: '中国' },
    uk: { paper: document.getElementById('memory-uk'), text: document.getElementById('uk-letter-text'), counter: document.getElementById('uk-note-counter'), label: '英国' }
  };
  const stories = {
    china: [papers.china.text.textContent, '我最不屑的每天都能看见的天空，天气晴朗之时我竟都会抬头看，因为我耳边总萦绕着你对我说的，天气好的时候，云朵很美，每天的云朵都不一样。', '因为你，我的日子变得生动又快活了，因为你我对这个可爱的世界又敬畏了几分。'],
    uk: [papers.uk.text.textContent, '走你两年前走的路，我心跳竟然会加速，我的心脏在为我们鼓掌，我们都太勇敢。', '我原以为你的离开不会让我流泪，毕竟在中国与你分别的时候我未曾掉过一滴泪，可我却在你离开英国的前一天就掉下了太多滴泪，因为我清楚生活有了你变得具象化，变得生动，变得充实，光是想想你离开后我的日子会回归空虚，我的泪水就不再受我控制。']
  };
  const indices = { china: 0, uk: 0 };
  const animations = { china: null, uk: null };
  const listeners = [];
  function listen(target, name, handler) { target.addEventListener(name, handler); listeners.push(() => target.removeEventListener(name, handler)); }
  function cancelAnimations() {
    Object.keys(animations).forEach(country => { if (animations[country]) animations[country].cancel(); animations[country] = null; });
  }
  function render(country, animate) {
    const item = papers[country];
    const index = indices[country];
    item.text.textContent = stories[country][index];
    item.counter.textContent = (index + 1) + ' / 3 · ' + (index === 2 ? '轻点从头重读' : '轻点纸条继续');
    item.paper.setAttribute('aria-label', item.label + '的纸条，第' + (index + 1) + '张，共3张，点击翻页');
    if (animations[country]) animations[country].cancel();
    if (animate && !reduced.matches && typeof item.paper.animate === 'function') animations[country] = item.paper.animate([{ opacity: .1, translate: '0 8px' }, { opacity: 1, translate: '0 0' }], { duration: 360, easing: 'cubic-bezier(.22,.72,.22,1)' });
  }
  function next(country) {
    if (shell.dataset.destination !== 'letter' || papers[country].paper.hidden) return;
    indices[country] = (indices[country] + 1) % stories[country].length;
    render(country, true);
  }
  Object.entries(papers).forEach(([country, item]) => {
    render(country, false);
    listen(item.paper, 'click', () => next(country));
    listen(item.paper, 'keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault(); next(country);
    });
  });
  document.querySelectorAll('[data-country]').forEach(button => listen(button, 'click', cancelAnimations));
  const observer = new MutationObserver(() => { if (shell.dataset.destination !== 'letter') cancelAnimations(); });
  observer.observe(shell, { attributes: true, attributeFilter: ['data-destination'] });
  listen(window, 'pagehide', event => {
    cancelAnimations();
    if (!event.persisted) { observer.disconnect(); listeners.forEach(remove => remove()); }
  });
})();
