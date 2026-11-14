(() => {
  const cover = document.getElementById('main');
  const button = document.getElementById('view-toggle');
  const label = document.getElementById('view-label');
  const status = document.getElementById('view-status');
  const copy = document.querySelectorAll('.scene-copy');
  let scenery = false;

  function setScenery(active) {
    scenery = active;
    cover.dataset.view = active ? 'scenery' : 'cover';
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', active ? '返回封面，显示文字' : '隐藏文字，只看风景');
    label.textContent = active ? '返回封面' : '只看风景';
    copy.forEach(element => {
      element.inert = active;
      if (active) element.setAttribute('aria-hidden', 'true');
      else element.removeAttribute('aria-hidden');
    });
    status.textContent = active ? '正在欣赏风景。按 Escape 键或点击返回封面，可重新显示文字。' : '已返回 WINTER 封面。';
  }

  button.addEventListener('click', () => setScenery(!scenery));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && scenery) {
      setScenery(false);
      button.focus();
    }
  });
})();
