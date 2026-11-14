(() => {
  const shell = document.getElementById('main');
  const navigation = document.getElementById('page-tabs');
  const tabs = Array.from(navigation.querySelectorAll('[role="tab"]'));
  const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));
  const sceneryButton = document.getElementById('view-toggle');
  const sceneryLabel = document.getElementById('view-label');
  const sceneryStatus = document.getElementById('view-status');
  const sceneCopy = document.querySelectorAll('.scene-copy');
  const sceneFooter = document.getElementById('scene-footer');
  const scenePhoto = document.getElementById('scene-photo');
  const dreamPhoto = document.getElementById('dream-photo');
  const editor = document.getElementById('note-editor');
  let scenery = false;

  function setScenery(active, announce = true) {
    scenery = active && shell.dataset.page === 'home';
    shell.dataset.view = scenery ? 'scenery' : 'cover';
    sceneryButton.setAttribute('aria-pressed', String(scenery));
    sceneryButton.setAttribute('aria-label', scenery ? '返回封面，显示文字' : '隐藏文字，只看风景');
    sceneryLabel.textContent = scenery ? '返回封面' : '只看风景';
    sceneCopy.forEach(element => {
      element.inert = scenery;
      if (scenery) element.setAttribute('aria-hidden', 'true');
      else element.removeAttribute('aria-hidden');
    });
    if (announce) sceneryStatus.textContent = scenery ? '正在欣赏风景。按 Escape 键或点击返回封面，可重新显示文字。' : '已返回 WINTER 封面。';
  }

  function showPage(page, updateHistory = false) {
    if (!tabs.some(tab => tab.dataset.page === page)) page = 'home';
    if (editor.open) editor.close();
    setScenery(false, false);
    shell.dataset.page = page;
    tabs.forEach((tab, index) => {
      const selected = tab.dataset.page === page;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected) navigation.style.setProperty('--active-index', String(index));
    });
    panels.forEach(panel => { panel.hidden = panel.id !== 'panel-' + page; });
    sceneFooter.hidden = page !== 'home';
    sceneryButton.disabled = page !== 'home';
    scenePhoto.setAttribute('aria-hidden', String(page !== 'home'));
    dreamPhoto.setAttribute('aria-hidden', String(page !== 'destination'));
    document.querySelector('meta[name="theme-color"]').content = page === 'about' ? '#eae7d9' : page === 'destination' ? '#a0acb9' : '#193b31';
    document.title = page === 'about' ? '写给你的25岁 — WINTER' : page === 'destination' ? '一封生日来信 — WINTER' : 'For WINTER — 生日快乐';
    if (updateHistory && location.hash !== '#' + page) history.pushState(null, '', '#' + page);
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showPage(tab.dataset.page, true));
    tab.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') target = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = tabs.length - 1;
      else return;
      event.preventDefault();
      showPage(tabs[target].dataset.page, true);
      tabs[target].focus();
    });
  });
  window.addEventListener('popstate', () => showPage(location.hash.slice(1)));
  window.addEventListener('hashchange', () => showPage(location.hash.slice(1)));
  sceneryButton.addEventListener('click', () => setScenery(!scenery));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && scenery) {
      setScenery(false);
      sceneryButton.focus();
    }
  });

  const storageKey = 'winter-about-notes-v1';
  const noteButtons = Array.from(document.querySelectorAll('[data-note-id]'));
  const noteStatus = document.getElementById('note-status');
  const noteInput = document.getElementById('note-input');
  const editorTitle = document.getElementById('editor-title');
  const count = document.getElementById('character-count');
  const notes = Object.create(null);
  let activeNote = null;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (saved && typeof saved === 'object') {
      noteButtons.forEach(button => {
        const id = button.dataset.noteId;
        if (Object.hasOwn(saved, id) && typeof saved[id] === 'string') notes[id] = saved[id].slice(0, 180);
      });
    }
  } catch (_) {
    noteStatus.textContent = '当前浏览器无法读取已保存的文字。';
  }

  function renderNotes() {
    noteButtons.forEach(button => {
      const id = button.dataset.noteId;
      const text = notes[id] || '';
      button.querySelector('.note-text').textContent = text;
      button.setAttribute('aria-label', '第 ' + id + ' 张便利贴，' + (text ? text.slice(0, 30) + '，点击编辑' : '尚未写字，点击编辑'));
    });
  }
  function updateCount() { count.textContent = noteInput.value.length + ' / 180'; }
  noteButtons.forEach(button => {
    button.addEventListener('click', () => {
      activeNote = button;
      const id = button.dataset.noteId;
      editorTitle.textContent = '第 ' + id.padStart(2, '0') + ' 张便利贴';
      editor.dataset.tone = button.classList.contains('sage') ? 'sage' : button.classList.contains('linen') ? 'linen' : 'butter';
      noteInput.value = notes[id] || '';
      updateCount();
      editor.showModal();
      noteInput.focus();
      noteInput.setSelectionRange(noteInput.value.length, noteInput.value.length);
    });
  });
  noteInput.addEventListener('input', updateCount);
  document.getElementById('editor-close').addEventListener('click', () => editor.close());
  document.getElementById('editor-cancel').addEventListener('click', () => editor.close());
  editor.addEventListener('click', event => {
    if (event.target !== editor) return;
    const rect = editor.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) editor.close();
  });
  editor.addEventListener('close', () => {
    if (activeNote && shell.dataset.page === 'about') activeNote.focus({ preventScroll: true });
  });
  document.getElementById('note-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!activeNote) return;
    const id = activeNote.dataset.noteId;
    const text = noteInput.value.trim();
    if (text) notes[id] = text;
    else delete notes[id];
    renderNotes();
    try {
      localStorage.setItem(storageKey, JSON.stringify(notes));
      noteStatus.textContent = '第 ' + id.padStart(2, '0') + ' 张便利贴' + (text ? '已保存在这台设备上。' : '已留白。');
    } catch (_) {
      noteStatus.textContent = '文字已显示，但当前浏览器无法保存；刷新后可能丢失。';
    }
    editor.close();
  });

  renderNotes();
  showPage(location.hash.slice(1));
})();
