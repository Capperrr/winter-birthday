(() => {
  const root = document.documentElement;
  const button = document.getElementById('theme-toggle');
  const icon = document.getElementById('theme-icon');
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let chosenTheme = null;
  try { chosenTheme = localStorage.getItem('winter-theme'); } catch (_) {}
  function applyTheme(theme) {
    const dark = theme === 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', dark ? '切换为浅色主题' : '切换为深色主题');
    icon.textContent = dark ? '☼' : '◐';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#112129' : '#edf3f5';
  }
  applyTheme(chosenTheme || (media.matches ? 'dark' : 'light'));
  button.addEventListener('click', () => {
    chosenTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(chosenTheme);
    try { localStorage.setItem('winter-theme', chosenTheme); } catch (_) {}
  });
  media.addEventListener('change', event => {
    if (!chosenTheme) applyTheme(event.matches ? 'dark' : 'light');
  });
  document.getElementById('year').textContent = new Date().getFullYear();
  const copyButton = document.getElementById('copy-github');
  const status = document.getElementById('copy-status');
  let statusTimer;
  copyButton.addEventListener('click', async () => {
    clearTimeout(statusTimer);
    try {
      await navigator.clipboard.writeText('https://github.com/Capperrr');
      status.textContent = '已复制 GitHub 链接。';
    } catch (_) {
      status.textContent = 'GitHub 链接：https://github.com/Capperrr';
    }
    statusTimer = setTimeout(() => { status.textContent = ''; }, 7000);
  });
})();
