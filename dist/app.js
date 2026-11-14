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
  const birthdayDialog = document.getElementById('birthday-dialog');
  const envelopeStage = document.getElementById('envelope-stage');
  const envelopeButton = document.getElementById('open-envelope');
  const letterPage = document.getElementById('letter-page');
  const letterTitle = document.getElementById('letter-page-title');
  const countryButtons = Array.from(document.querySelectorAll('[data-country]'));
  const memoryWall = document.getElementById('memory-wall');
  const memories = {
    china: document.getElementById('memory-china'),
    uk: document.getElementById('memory-uk')
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scenery = false;
  let currentRoute = null;
  let birthdayAccepted = false;
  let openingTimer = null;

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

  function showPage(route, updateHistory = false) {
    if (!['home', 'about', 'destination', 'letter'].includes(route)) route = 'home';
    const previousRoute = currentRoute;
    const page = route === 'letter' ? 'destination' : route;
    if (openingTimer !== null) {
      clearTimeout(openingTimer);
      openingTimer = null;
    }
    if (editor.open) editor.close();
    if (route !== 'destination' && birthdayDialog.open) birthdayDialog.close();
    setScenery(false, false);
    shell.dataset.page = page;
    currentRoute = route;
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
    dreamPhoto.setAttribute('aria-hidden', String(route !== 'destination'));
    envelopeStage.hidden = route !== 'destination';
    letterPage.hidden = route !== 'letter';
    envelopeButton.disabled = true;

    if (route === 'letter') {
      birthdayAccepted = true;
      shell.dataset.destination = 'letter';
      envelopeStage.inert = true;
      if (previousRoute !== 'letter') letterPage.scrollTop = 0;
    } else if (route === 'destination') {
      if (!['destination', 'letter'].includes(previousRoute) || (updateHistory && previousRoute === 'destination')) birthdayAccepted = false;
      shell.dataset.destination = birthdayAccepted ? 'envelope' : 'greeting';
      envelopeStage.inert = !birthdayAccepted;
      envelopeButton.disabled = !birthdayAccepted;
      if (!birthdayAccepted && !birthdayDialog.open) birthdayDialog.showModal();
    } else {
      birthdayAccepted = false;
      shell.dataset.destination = 'idle';
      envelopeStage.inert = true;
    }
    document.querySelector('meta[name="theme-color"]').content = route === 'letter' ? '#ede6ce' : page === 'about' ? '#eae7d9' : page === 'destination' ? '#a0acb9' : '#193b31';
    document.title = route === 'letter' ? '一起呼吸过空气的两个国家 — WINTER' : page === 'about' ? '写给25岁的自己 — WINTER' : page === 'destination' ? '一封生日来信 — WINTER' : 'For WINTER — 生日快乐';
    if (updateHistory && location.hash !== '#' + route) history.pushState(null, '', '#' + route);
  }

  function acceptBirthday() {
    if (currentRoute !== 'destination') return;
    birthdayAccepted = true;
    if (birthdayDialog.open) birthdayDialog.close();
    shell.dataset.destination = 'envelope';
    envelopeStage.inert = false;
    envelopeButton.disabled = false;
    requestAnimationFrame(() => {
      if (currentRoute === 'destination' && shell.dataset.destination === 'envelope') envelopeButton.focus({ preventScroll: true });
    });
  }

  document.getElementById('birthday-okay-one').addEventListener('click', acceptBirthday);
  document.getElementById('birthday-okay-two').addEventListener('click', acceptBirthday);
  birthdayDialog.addEventListener('cancel', event => {
    event.preventDefault();
    acceptBirthday();
  });
  envelopeButton.addEventListener('click', () => {
    if (currentRoute !== 'destination' || !birthdayAccepted || openingTimer !== null) return;
    shell.dataset.destination = 'opening';
    envelopeButton.disabled = true;
    openingTimer = setTimeout(() => {
      openingTimer = null;
      if (currentRoute !== 'destination' || shell.dataset.destination !== 'opening') return;
      showPage('letter', true);
      letterTitle.focus({ preventScroll: true });
    }, reducedMotion.matches ? 0 : 850);
  });
  document.getElementById('back-to-envelope').addEventListener('click', () => {
    showPage('destination', true);
    envelopeButton.focus({ preventScroll: true });
  });

  function selectCountry(country) {
    const valid = Object.hasOwn(memories, country);
    countryButtons.forEach(button => button.setAttribute('aria-pressed', String(valid && button.dataset.country === country)));
    Object.entries(memories).forEach(([name, note]) => { note.hidden = !valid || name !== country; });
    memoryWall.dataset.country = valid ? country : '';
  }
  countryButtons.forEach(button => button.addEventListener('click', () => selectCountry(button.dataset.country)));
  selectCountry(null);

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
      if (!birthdayDialog.open) tabs[target].focus();
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
