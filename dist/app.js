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
  const envelopeCard = document.getElementById('gift-envelope');
  const unfoldSheet = document.getElementById('unfold-sheet');
  const letterPage = document.getElementById('letter-page');
  const letterTitle = document.getElementById('letter-page-title');
  const unlockPage = document.getElementById('unlock-page');
  const unlockTitle = document.getElementById('unlock-page-title');
  const unlockWord = document.getElementById('birthday-word');
  const unlockError = document.getElementById('unlock-error');
  const celebrationPage = document.getElementById('cake-page');
  const journeyPage = document.getElementById('journey-page');
  const afterwordPage = document.getElementById('journey-afterword');
  const finalePage = document.getElementById('birthday-finale');
  const journeyTitle = document.getElementById('journey-title');
  const cakeDialog = document.getElementById('cake-dialog');
  const cakeButton = document.getElementById('birthday-cake');
  const countryButtons = Array.from(document.querySelectorAll('[data-country]'));
  const memoryWall = document.getElementById('memory-wall');
  const memories = { china: document.getElementById('memory-china'), uk: document.getElementById('memory-uk') };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const unlockKey = 'winter-birthday-word-solved';
  const celebrationKey = 'winter-birthday-celebrated';
  let memoryUnlocked = false;
  let celebrationCompleted = false;
  try { memoryUnlocked = sessionStorage.getItem(unlockKey) === 'true'; } catch (_) {}
  try { celebrationCompleted = sessionStorage.getItem(celebrationKey) === 'true'; } catch (_) {}
  let scenery = false;
  let currentRoute = null;
  let birthdayAccepted = false;
  let openingTimer = null;
  let openingAnimation = null;

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

  function clearOpening() {
    if (openingTimer !== null) clearTimeout(openingTimer);
    openingTimer = null;
    if (openingAnimation) openingAnimation.cancel();
    openingAnimation = null;
    unfoldSheet.hidden = true;
  }

  function showPage(requestedRoute, updateHistory = false) {
    let route = ['home', 'about', 'destination', 'unlock', 'cake', 'letter', 'journey', 'afterword', 'finale'].includes(requestedRoute) ? requestedRoute : 'home';
    if (['cake','letter','journey','afterword','finale'].includes(route) && !memoryUnlocked) route = 'unlock';
    else if (['letter','journey','afterword','finale'].includes(route) && !celebrationCompleted) route = 'cake';
    const previousRoute = currentRoute;
    const page = ['unlock', 'cake', 'letter', 'journey', 'afterword', 'finale'].includes(route) ? 'destination' : route;
    clearOpening();
    if (editor.open) editor.close();
    if (route !== 'destination' && birthdayDialog.open) birthdayDialog.close();
    if (route !== 'unlock' && cakeDialog.open) cakeDialog.close();
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
    unlockPage.hidden = route !== 'unlock';
    celebrationPage.hidden = route !== 'cake';
    journeyPage.hidden = route !== 'journey';
    afterwordPage.hidden = route !== 'afterword';
    finalePage.hidden = route !== 'finale';
    envelopeButton.disabled = true;

    if (route === 'finale') {
      birthdayAccepted = true;
      shell.dataset.destination = 'finale';
      envelopeStage.inert = true;
      if (previousRoute !== 'finale') finalePage.scrollTop = 0;
      if (previousRoute !== 'finale') document.dispatchEvent(new CustomEvent('winter:finale-enter'));
    } else if (route === 'afterword') {
      birthdayAccepted = true;
      shell.dataset.destination = 'afterword';
      envelopeStage.inert = true;
      if (previousRoute !== 'afterword') afterwordPage.scrollTop = 0;
    } else if (route === 'journey') {
      birthdayAccepted = true;
      shell.dataset.destination = 'journey';
      envelopeStage.inert = true;
      if (previousRoute !== 'journey') journeyPage.scrollTop = 0;
    } else if (route === 'cake') {
      birthdayAccepted = true;
      shell.dataset.destination = 'cake';
      envelopeStage.inert = true;
    } else if (route === 'letter') {
      birthdayAccepted = true;
      shell.dataset.destination = 'letter';
      envelopeStage.inert = true;
      if (previousRoute !== 'letter') letterPage.scrollTop = 0;
      if (!memoryWall.dataset.country) selectCountry('china');
    } else if (route === 'unlock') {
      birthdayAccepted = true;
      shell.dataset.destination = 'unlock';
      envelopeStage.inert = true;
      if (previousRoute !== 'unlock') {
        unlockWord.value = '';
        unlockWord.setAttribute('aria-invalid', 'false');
        unlockError.textContent = '';
      }
    } else if (route === 'destination') {
      if (!['destination', 'unlock', 'cake', 'letter', 'journey', 'afterword', 'finale'].includes(previousRoute) || (updateHistory && previousRoute === 'destination')) birthdayAccepted = false;
      shell.dataset.destination = birthdayAccepted ? 'envelope' : 'greeting';
      envelopeStage.inert = !birthdayAccepted;
      envelopeButton.disabled = !birthdayAccepted;
      if (!birthdayAccepted && !birthdayDialog.open) birthdayDialog.showModal();
    } else {
      birthdayAccepted = false;
      shell.dataset.destination = 'idle';
      envelopeStage.inert = true;
    }
    document.querySelector('meta[name="theme-color"]').content = route === 'finale' ? '#f3eee4' : route === 'afterword' ? '#1c2b3a' : route === 'journey' ? '#f0efe9' : route === 'cake' ? '#16282a' : ['unlock', 'letter'].includes(route) ? '#eee7d4' : page === 'about' ? '#eae7d9' : page === 'destination' ? '#a0acb9' : '#193b31';
    document.title = route === 'finale' ? '很荣幸参与你的25岁 — WINTER' : route === 'afterword' ? '而我偏偏在那里遇见了你 — WINTER' : route === 'journey' ? '你走过的路，我陪你再走一遍 — WINTER & GWEN' : route === 'cake' ? '为你点亮生日 — WINTER' : route === 'letter' ? '两个国家，都有和你一起的时光 — WINTER' : route === 'unlock' ? 'Happy ____ WINTERRRR' : page === 'about' ? '写给25岁的自己 — WINTER' : page === 'destination' ? '一封生日来信 — WINTER' : 'For WINTER — 生日快乐';
    if ((previousRoute === 'cake') !== (route === 'cake')) document.dispatchEvent(new CustomEvent('winter:celebration-route', { detail: { active: route === 'cake' } }));
    if ((previousRoute === 'journey') !== (route === 'journey')) document.dispatchEvent(new CustomEvent('winter:journey-route', { detail: { active: route === 'journey' } }));
    if (updateHistory && location.hash !== '#' + route) history.pushState(null, '', '#' + route);
    else if (requestedRoute !== route && ['cake','letter','journey','afterword','finale'].includes(requestedRoute) && location.hash !== '#' + route) history.replaceState(null, '', '#' + route);
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
  birthdayDialog.addEventListener('cancel', event => { event.preventDefault(); acceptBirthday(); });

  function finishUnfolding() {
    showPage('unlock', true);
    unlockTitle.focus({ preventScroll: true });
  }
  envelopeButton.addEventListener('click', () => {
    if (currentRoute !== 'destination' || !birthdayAccepted || shell.dataset.destination !== 'envelope' || openingTimer !== null) return;
    envelopeButton.disabled = true;
    if (reducedMotion.matches) { finishUnfolding(); return; }
    const frame = shell.getBoundingClientRect();
    const card = envelopeCard.getBoundingClientRect();
    const x = card.left - frame.left;
    const y = card.top - frame.top;
    const scaleX = card.width / (frame.width || 1);
    const scaleY = card.height / (frame.height || 1);
    shell.dataset.destination = 'untying';
    openingTimer = setTimeout(() => {
      openingTimer = null;
      if (currentRoute !== 'destination' || shell.dataset.destination !== 'untying') return;
      shell.dataset.destination = 'opening';
      openingTimer = setTimeout(() => {
        openingTimer = null;
        if (currentRoute !== 'destination' || shell.dataset.destination !== 'opening') return;
        unfoldSheet.hidden = false;
        const start = 'translate(' + x + 'px,' + y + 'px) scale(' + scaleX + ',' + scaleY + ') rotate(-3deg)';
        if (typeof unfoldSheet.animate === 'function') {
          openingAnimation = unfoldSheet.animate([{ transform: start, opacity: 1, borderRadius: '5px' }, { transform: 'translate(0,0) scale(1,1) rotate(0deg)', opacity: 1, borderRadius: '10px' }], { duration: 900, easing: 'cubic-bezier(.22,.72,.22,1)', fill: 'forwards' });
        }
        openingTimer = setTimeout(() => {
          openingTimer = null;
          if (currentRoute === 'destination' && shell.dataset.destination === 'opening') finishUnfolding();
        }, 930);
      }, 420);
    }, 620);
  });
  document.getElementById('back-to-envelope').addEventListener('click', () => {
    showPage('destination', true);
    envelopeButton.focus({ preventScroll: true });
  });

  document.getElementById('birthday-unlock-form').addEventListener('submit', event => {
    event.preventDefault();
    if (currentRoute !== 'unlock') return;
    if (unlockWord.value.trim().toLowerCase() !== 'birthday') {
      unlockWord.setAttribute('aria-invalid', 'true');
      unlockError.textContent = '提示：happy 后面，是生日的那个英文单词。';
      unlockWord.focus();
      return;
    }
    unlockWord.setAttribute('aria-invalid', 'false');
    memoryUnlocked = true;
    try { sessionStorage.setItem(unlockKey, 'true'); } catch (_) {}
    showPage('cake', true);
  });
  unlockWord.addEventListener('input', () => {
    unlockWord.setAttribute('aria-invalid', 'false');
    unlockError.textContent = '';
  });
  cakeButton.addEventListener('click', () => { if (currentRoute === 'unlock' && !cakeDialog.open) cakeDialog.showModal(); });
  document.getElementById('cake-dialog-close').addEventListener('click', () => cakeDialog.close());
  cakeDialog.addEventListener('cancel', event => { event.preventDefault(); cakeDialog.close(); });
  cakeDialog.addEventListener('close', () => { if (currentRoute === 'unlock') cakeButton.focus({ preventScroll: true }); });
  document.addEventListener('winter:celebration-complete', () => {
    if (currentRoute !== 'cake') return;
    celebrationCompleted = true;
    try { sessionStorage.setItem(celebrationKey, 'true'); } catch (_) {}
    showPage('letter', true);
    letterTitle.focus({ preventScroll: true });
  });
  document.getElementById('open-journey').addEventListener('click', () => {
    if (currentRoute !== 'letter') return;
    showPage('journey', true);
    journeyTitle.focus({ preventScroll: true });
  });
  document.getElementById('journey-return').addEventListener('click', () => {
    if (currentRoute !== 'journey') return;
    showPage('letter', true);
    document.getElementById('open-journey').focus({ preventScroll: false });
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
  document.addEventListener('winter:journey-afterword',()=>showPage('afterword',true));
  document.getElementById('afterword-back')?.addEventListener('click',()=>showPage('journey',true));
  document.getElementById('afterword-continue')?.addEventListener('click',()=>showPage('finale',true));
  document.getElementById('finale-back')?.addEventListener('click',()=>showPage('afterword',true));
  document.getElementById('finale-home')?.addEventListener('click',()=>showPage('home',true));
  document.getElementById('afterword-home')?.addEventListener('click',()=>showPage('home',true));
  window.addEventListener('hashchange', () => showPage(location.hash.slice(1)));
  sceneryButton.addEventListener('click', () => setScenery(!scenery));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && scenery) { setScenery(false); sceneryButton.focus(); }
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
