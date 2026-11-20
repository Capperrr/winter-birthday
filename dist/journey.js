(() => {
  const page = document.getElementById('journey-page');
  const shell = document.getElementById('main');
  if (!page || page.dataset.journeyReady === 'true') return;
  page.dataset.journeyReady = 'true';
  const byId = id => document.getElementById(id);
  const range = byId('journey-position');
  const frame = byId('journey-frame');
  const body = byId('journey-letter-body');
  const previous = byId('journey-previous');
  const next = byId('journey-next');
  const status = byId('journey-status');
  const noteDialog = byId('journey-note-dialog');
  const noteInput = byId('journey-note-input');
  const noteFeedback = byId('journey-note-feedback');
  const noteButton = byId('journey-write');
  const credits = byId('journey-credit-dialog');
  const stopButtons = Array.from(page.querySelectorAll('[data-journey-stop]'));
  const afterwordTrigger = byId('journey-afterword-trigger');
  const photos = Array.from(page.querySelectorAll('[data-photo-key]'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'winter-journey-notes-v1';
  const stops = [
    { key:'dazhou', label:'四川达州', chapter:'FAMILIAR DAYS', period:'四川达州', title:'从你熟悉的街区开始。', fact:'', photo:'dazhou', caption:'达州 · 城市资料影像（非具体街区）', credit:'Nyx Ning · CC BY-SA 3.0', prose:'在你的小时候，这座城市就已经在陪着你。我非常期待有一天能够跟着你走到四川达州，听你分享你曾经在那里的生活。', question:'如果有一天我和你一起到了四川达州，你想带我从哪里开始走？', english:'I wish I could have walked beside you.' },
    { key:'school', label:'初中和高中', chapter:'BEFORE WE MET', period:'初中和高中 · 四川达州', title:'新达一中（达州一中）', fact:'', photo:'school', caption:'达州一中 · 校门', credit:'珍藏影像', prose:'感谢张琪茹的陪伴，感谢身边所有人对你的陪伴。感谢你的坚韧与勇敢，也感谢呈现在我面前那个有生命力、保持积极乐观、阳光明媚的你。', question:'如果回到初中或高中的某一天，你最想给我讲什么故事？放学要跟我一起散步吗？', english:'I would love to know the girl you were.' },
    { key:'chongqing', label:'南岸', chapter:'A WIDER WORLD', period:'本科 · 重庆', title:'重庆工商大学', fact:'南岸校区', photo:'chongqing', caption:'重庆工商大学 · 南岸校区正门', credit:'不可思议的诚 · CC BY-SA 4.0', prose:'我好像也不太了解这个时期的你。那个还没有遇见我的你，会是什么样的呢？在我眼里，你一直是明媚而向上的。如果现在的我回到那时候认识你，我想，我也一定会欣赏你吧。', question:'大学四年的日子里，有没有一段路你想和我一起走？', english:'I think I would have admired you even then.' },
    { key:'southampton', label:'南安普顿', chapter:'ACROSS THE SEA', period:'硕士 · 英国南安普顿', title:'南安普顿大学', fact:'University of Southampton', photo:'southampton', caption:'南安普顿大学 · Highfield 校区影像', credit:'Roger Davies · CC BY-SA 2.0', prose:'后来，你走到了南安普顿。在今年，我跟你一起也走到了南安普顿。读书之外的日子，你热爱生活，带着好奇心去探索这个世界。我想听你慢慢讲。我总在你的照片里看见充满了生命力的你，这让我很是喜欢。', question:'在南安普顿，哪一片、哪一天的天空最让你想念？', english:'Somehow, our paths led us here together.' },
    { key:'qide', label:'相遇', chapter:'WHERE OUR STORY BEGAN', period:'相遇 · 深圳南山', title:'天利名城 · 启德', fact:'你来到深圳工作的地方，也是我认识你的地方', photo:'together', caption:'深圳 · 夜色里的街景', credit:'珍藏影像', prose:'走到这里，终于也是我在场的一页。毕业后的这两年，你来到深圳工作，也是在这里我认识了你。从相遇这一页开始，想和你一起走到 destination。', question:'如果把我们相遇的日子留在这一页，你最想写下哪一个瞬间？', english:'Of all the places, I am glad I met you here.' }
  ];

  // Retain legacy note IDs so previous browser notes are not discarded.
  const allowedKeys = ['dazhou','dazhou-tianfu','dazhou-luofu','school','chongqing','southampton','qide'];
  const notes = Object.create(null);
  const brokenPhotos = new Set();
  const removers = [];
  let active = false;
  let disposed = false;
  let index = 0;
  let position = 0;
  let goal = 0;
  let velocity = 0;
  let springFrame = null;
  let lastSpring = null;
  let swipeFrame = null;
  let swipe = null;
  let textAnimation = null;
  let editing = null;
  // Five chapters are rendered from this *same* stops array. On wide screens
  // the real page scrolls past these letters while the left 3D photos stick.
  // On narrow screens the original single-letter view remains scroll-friendly.
  const story=document.createElement('div');
  story.className='journey-sticky-story';
  story.setAttribute('aria-label','五段旅程的滚动来信');
  const storyPanels=stops.map((stop,i)=>{
    const section=document.createElement('section');
    section.className='journey-story-card';
    section.dataset.storyStop=String(i);
    const headingId='journey-story-heading-'+i;
    section.setAttribute('aria-labelledby',headingId);
    function add(tag,cls,txt,parent=section){
      const el=document.createElement(tag);el.className=cls;el.textContent=txt;parent.append(el);return el;
    }
    add('p','journey-chapter',String(i+1).padStart(2,'0')+' / 05 · '+stop.chapter);
    add('p','journey-period',stop.period);
    const heading=add('h3','',stop.title);heading.id=headingId;
    if(stop.fact)add('p','journey-fact',stop.fact);
    add('p','journey-prose',stop.prose);
    const question=document.createElement('div');
    question.className='journey-question';add('span','', '我想知道',question);
    add('p','',stop.question,question);section.append(question);
    const signature=document.createElement('p');
    signature.className='journey-signature';
    const line=document.createElement('span');line.textContent=stop.english;
    const signed=document.createElement('span');signed.textContent=' — Gwen';
    signature.append(line,signed);section.append(signature);
    const write=add('button','journey-story-write','把这一段，慢慢讲给 Gwen');
    write.type='button';
    write.setAttribute('aria-label','为'+stop.period+'这一站留言');
    write.addEventListener('click',()=>{
      selectStop(i,false,'story');
      noteButton.click();
    });
    const saved=add('p','journey-story-saved','');
    saved.hidden=true;
    story.append(section);
    return {section,saved};
  });
  body.before(story);
  page.dataset.stickyStory='on';
  const storyMedia=window.matchMedia('(min-width:761px)');
  let storyNavigationUntil=0;
  let storyScrollFrame=0;
  function canStory(){return storyMedia.matches&&!page.hidden&&active&&!disposed;}
  function moveToStory(i,smooth){
    if(!canStory())return;
    const viewport=page.getBoundingClientRect();
    const rect=storyPanels[i].section.getBoundingClientRect();
    if(!viewport.height||!rect.height)return;
    const target=page.scrollTop+rect.top-viewport.top-Math.min(110,viewport.height*.14);
    storyNavigationUntil=performance.now()+(smooth?900:160);
    page.scrollTo({top:Math.max(0,target),behavior:smooth&&!calm()?'smooth':'auto'});
  }
  function watchStoryScroll(){
    storyScrollFrame=0;
    if(!canStory()||noteDialog.open||credits.open||performance.now()<storyNavigationUntil)return;
    const bounds=page.getBoundingClientRect(),readingLine=bounds.top+bounds.height*.50;
    let nearest=0,distance=Infinity;
    storyPanels.forEach(({section},i)=>{
      const r=section.getBoundingClientRect();
      const gap=Math.abs((r.top+r.bottom)/2-readingLine);
      if(gap<distance){distance=gap;nearest=i}
    });
    if(nearest!==index)selectStop(nearest,true,'story');
  }
  listen(page,'scroll',()=>{
    if(!storyScrollFrame)storyScrollFrame=requestAnimationFrame(watchStoryScroll);
  },{passive:true});
  listen(story,'pointerdown',()=>{storyNavigationUntil=0},{passive:true});
  listen(story,'touchstart',()=>{storyNavigationUntil=0},{passive:true});
  listen(page,'wheel',()=>{storyNavigationUntil=0},{passive:true});



  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (stored && typeof stored === 'object') allowedKeys.forEach(key => { if (Object.hasOwn(stored,key) && typeof stored[key] === 'string') notes[key] = stored[key].slice(0,500); });
  } catch (_) {}
  // Move an earlier Dazhou neighbourhood note into the combined chapter without erasing its old key.
  if (!notes.dazhou) notes.dazhou = notes['dazhou-tianfu'] || notes['dazhou-luofu'] || '';

  function listen(target, event, handler, options) { target.addEventListener(event,handler,options); removers.push(() => target.removeEventListener(event,handler,options)); }
  function calm() { return reduced.matches || shell.dataset.motion === 'off'; }
  function notePlace() { return { key:stops[index].key, title:stops[index].title, question:stops[index].question }; }
  function setText(id, text) { byId(id).textContent = text; }
  function cancelText() { if (textAnimation) textAnimation.cancel(); textAnimation = null; }
  function updateNotePreview() {
    const answer = notes[notePlace().key] || '';
    setText('journey-write-label', answer ? '看看这一站，留给 Gwen 的话' : '把这一段，慢慢讲给 Gwen');
    const preview = byId('journey-saved-preview');
    preview.hidden = !answer;
    preview.textContent = answer ? '你留在这里的话：' + answer.replace(/\s+/g,' ').slice(0,42) + (answer.length > 42 ? '…' : '') : '';
    storyPanels.forEach(({saved},i)=>{
      const note=notes[stops[i].key]||'';
      saved.hidden=!note;
      saved.textContent=note?'你留在这里的话：'+note:'';
    });
  }
  function updatePhotoFallback() { byId('journey-photo-fallback').hidden = !brokenPhotos.has(stops[index].photo); }
  function renderStop(value, animate = true, announce = true) {
    index = Math.max(0,Math.min(stops.length - 1,Math.round(value)));
    const stop = stops[index];
    storyPanels.forEach(({section},i)=>{section.dataset.active=String(i===index)});
    cancelText();
    body.scrollTop = 0;
    page.dataset.stop = String(index);
    setText('journey-chapter', String(index+1).padStart(2,'0') + ' / 05 · ' + stop.chapter);
    setText('journey-period',stop.period);
    setText('journey-place-title',stop.title);
    setText('journey-fact',stop.fact);
    setText('journey-prose',stop.prose);
    setText('journey-question',notePlace().question);
    setText('journey-signature-line',stop.english);
    setText('journey-photo-caption',stop.caption);
    setText('journey-photo-number',String(index+1).padStart(2,'0'));
    setText('journey-count',String(index+1).padStart(2,'0') + ' / 05');
    setText('journey-ending',index === stops.length-1 ? '后来还有很多路，想和你一起走。' : '那些我还没参与的日子，想听你慢慢讲。');
    setText('journey-credits-open','影像：' + stop.credit);
    previous.disabled = index === 0;
    next.disabled = false;
    next.setAttribute('aria-label',index===stops.length-1?'继续阅读相遇之后的后记':'前往下一站');
    afterwordTrigger.hidden = index !== stops.length-1;
    stopButtons.forEach((button,i) => { if (i === index) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current'); });
    photos.forEach(photo => { const selected = photo.dataset.photoKey === stop.photo; photo.dataset.active = String(selected); photo.setAttribute('aria-hidden',String(!selected && page.dataset.journeyCoverflow !== 'on')); });
    range.setAttribute('aria-valuetext','第' + (index+1) + '站，' + stop.label + '，' + stop.title);
    updatePhotoFallback(); updateNotePreview();
    if (announce) status.textContent = '第' + (index+1) + '站，共5站。' + stop.period + '，' + stop.title + '。';
    page.dispatchEvent(new CustomEvent('winter:journey-stop',{detail:{index,animate}}));
    if (animate && !calm() && !document.hidden && typeof body.animate === 'function') textAnimation = body.animate([{ opacity:.45, translate:'0 5px' },{ opacity:1, translate:'0 0' }],{ duration:320, easing:'cubic-bezier(.22,.72,.22,1)' });
  }
  function paint(value) {
    position = Math.max(0,Math.min(stops.length-1,value));
    page.style.setProperty('--journey-progress',String(position/(stops.length-1)));
    range.value = String(position*100);
  }
  function cancelSpring() { if (springFrame !== null) cancelAnimationFrame(springFrame); springFrame = null; lastSpring = null; }
  function spring(now) {
    springFrame = null;
    if (!active || disposed || document.hidden) { lastSpring = null; return; }
    if (calm()) { paint(goal); velocity = 0; return; }
    const dt = lastSpring === null ? 1/60 : Math.min(.032,Math.max(.001,(now-lastSpring)/1000));
    lastSpring = now;
    velocity += ((goal-position)*190-velocity*28)*dt;
    paint(position+velocity*dt);
    if (Math.abs(goal-position) < .0006 && Math.abs(velocity) < .006) { paint(goal); velocity = 0; lastSpring = null; return; }
    springFrame = requestAnimationFrame(spring);
  }
  function selectStop(value, animate = true, source='controls') {
    if (!active || disposed || noteDialog.open || credits.open) return;
    releaseSwipe();
    const target = Math.max(0,Math.min(stops.length-1,Math.round(value)));
    cancelSpring();
    if (target !== index) renderStop(target,animate);
    goal = target;
    if(source!=='story')moveToStory(target,animate);
    if (!animate || calm() || document.hidden || Math.abs(position-goal) < .0001) { paint(goal); velocity = 0; return; }
    springFrame = requestAnimationFrame(spring);
  }
  function releaseSwipe() {
    const previousSwipe = swipe; swipe = null;
    if (swipeFrame !== null) cancelAnimationFrame(swipeFrame);
    swipeFrame = null;
    page.dataset.swiping = 'false';
    page.style.setProperty('--journey-photo-x','0px');
    try { if (previousSwipe && frame.hasPointerCapture?.(previousSwipe.id)) frame.releasePointerCapture(previousSwipe.id); } catch (_) {}
  }
  function stopMotion() { cancelSpring(); releaseSwipe(); cancelText(); velocity = 0; goal = index; paint(index); }
  function swipeStart(event) {
    if (page.dataset.journeyCoverflow === 'on' || !active || disposed || swipe || noteDialog.open || credits.open || event.isPrimary === false || (event.button !== undefined && event.button !== 0) || event.target.closest?.('a,button,input,textarea')) return;
    cancelSpring(); goal = index; paint(index);
    swipe = { id:event.pointerId, x:event.clientX, y:event.clientY, lastX:event.clientX, width:frame.getBoundingClientRect().width, horizontal:false };
  }
  function swipeMove(event) {
    if (!swipe || event.pointerId !== swipe.id || !active) return;
    const dx = event.clientX-swipe.x, dy = event.clientY-swipe.y;
    if (!swipe.horizontal) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { releaseSwipe(); return; }
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)*1.2) return;
      swipe.horizontal = true; page.dataset.swiping = 'true';
      try { frame.setPointerCapture?.(event.pointerId); } catch (_) {}
    }
    swipe.lastX = event.clientX;
    if (swipeFrame === null) swipeFrame = requestAnimationFrame(() => { swipeFrame = null; if (active && swipe) page.style.setProperty('--journey-photo-x', Math.max(-14,Math.min(14,(swipe.lastX-swipe.x)*.1)) + 'px'); });
  }
  function swipeEnd(event) {
    if (!swipe || event.pointerId !== swipe.id) return;
    const dx = (event.clientX ?? swipe.lastX)-swipe.x;
    const threshold = Math.min(70,Math.max(38,swipe.width*.12));
    const target = swipe.horizontal && Math.abs(dx) > threshold ? index + (dx < 0 ? 1 : -1) : index;
    releaseSwipe(); selectStop(target);
  }
  function closeNotes() { if (noteDialog.open) noteDialog.close(); }
  function closeCredits() { if (credits.open) credits.close(); }
  function activate(value) {
    if (disposed || Boolean(value) === active) return;
    active = Boolean(value);
    stopMotion();
    if (active) { renderStop(index,false,false); storyNavigationUntil=0; }
    else if(storyScrollFrame){cancelAnimationFrame(storyScrollFrame);storyScrollFrame=0;}
    else { editing = null; closeNotes(); closeCredits(); }
  }

  listen(page,'winter:journey-select-stop',event => {
    const target=Number(event.detail?.index);
    if (Number.isFinite(target)) selectStop(target);
  });
  stopButtons.forEach(button => listen(button,'click',() => selectStop(Number(button.dataset.journeyStop))));
  listen(previous,'click',() => selectStop(index-1));
  listen(next,'click',() => {
    if(index === stops.length-1) {if(active && !noteDialog.open && !credits.open) document.dispatchEvent(new CustomEvent('winter:journey-afterword'));}
    else selectStop(index+1);
  });
  listen(afterwordTrigger,'click',() => {
    if(active && index===stops.length-1 && !noteDialog.open && !credits.open) document.dispatchEvent(new CustomEvent('winter:journey-afterword'));
  });
  listen(range,'input',() => {
    if (!active || disposed || noteDialog.open || credits.open) return;
    cancelSpring(); releaseSwipe(); velocity = 0;
    const value = Number(range.value)/100;
    if (!Number.isFinite(value)) return;
    paint(value); goal = Math.round(position);
    if (Math.abs(position-index) > .58) renderStop(goal,true,false);
  });
  listen(range,'change',() => selectStop(Math.round(position)));
  listen(range,'pointercancel',() => { if (active) selectStop(Math.round(position)); });
  listen(range,'keydown',event => {
    if (!active || noteDialog.open || credits.open) return;
    let target;
    if (['ArrowRight','ArrowUp','PageDown'].includes(event.key)) target = index+1;
    else if (['ArrowLeft','ArrowDown','PageUp'].includes(event.key)) target = index-1;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = stops.length-1;
    else return;
    event.preventDefault(); selectStop(target);
  });
  listen(frame,'pointerdown',swipeStart);
  listen(window,'pointermove',swipeMove,{passive:true});
  listen(window,'pointerup',swipeEnd);
  listen(window,'pointercancel',event => { if (swipe?.id === event.pointerId) releaseSwipe(); });
  listen(frame,'lostpointercapture',() => { if (swipe) releaseSwipe(); });
  listen(frame,'dragstart',event => event.preventDefault());
  listen(noteButton,'click',() => {
    if (!active || disposed || noteDialog.open || credits.open) return;
    stopMotion();
    editing = notePlace();
    setText('journey-note-title',editing.title);
    setText('journey-note-question',editing.question);
    noteInput.value = notes[editing.key] || '';
    setText('journey-note-count',noteInput.value.length + ' / 500');
    noteFeedback.textContent = '';
    noteDialog.showModal(); noteInput.focus();
  });
  listen(noteInput,'input',() => setText('journey-note-count',noteInput.value.length + ' / 500'));
  listen(byId('journey-note-form'),'submit',event => {
    event.preventDefault();
    if (!active || !editing || !noteDialog.open) return;
    const value = noteInput.value.trim().slice(0,500);
    if (value) notes[editing.key] = value; else delete notes[editing.key];
    updateNotePreview();
    try {
      localStorage.setItem(storageKey,JSON.stringify(notes));
      status.textContent = editing.title + (value ? '的话，已留在当前浏览器。' : '的纸条已留白。');
      closeNotes();
    } catch (_) {
      noteFeedback.textContent = '文字已留在这一页，但当前浏览器无法保存；刷新后可能丢失。';
    }
  });
  listen(byId('journey-note-close'),'click',closeNotes);
  listen(byId('journey-note-cancel'),'click',closeNotes);
  listen(noteDialog,'cancel',event => { event.preventDefault(); closeNotes(); });
  listen(noteDialog,'close',() => { editing = null; if (active) noteButton.focus({preventScroll:true}); });
  listen(byId('journey-credits-open'),'click',() => { if (active && !noteDialog.open && !credits.open) { stopMotion(); credits.showModal(); } });
  listen(byId('journey-credits-close'),'click',closeCredits);
  listen(credits,'cancel',event => { event.preventDefault(); closeCredits(); });
  listen(credits,'close',() => { if (active) byId('journey-credits-open').focus({preventScroll:true}); });
  [noteDialog,credits].forEach(dialog => listen(dialog,'click',event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.left+r.width || event.clientY < r.top || event.clientY > r.top+r.height) dialog.close();
  }));
  photos.forEach(photo => {
    const img = photo.querySelector('img');
    listen(img,'error',() => { brokenPhotos.add(photo.dataset.photoKey); if (active) updatePhotoFallback(); });
    listen(img,'load',() => { brokenPhotos.delete(photo.dataset.photoKey); if (active) updatePhotoFallback(); });
    if (img.complete && img.naturalWidth === 0) brokenPhotos.add(photo.dataset.photoKey);
  });
  listen(document,'winter:journey-route',event => activate(Boolean(event.detail?.active)));
  listen(document,'visibilitychange',() => { if (document.hidden && active) stopMotion(); });
  listen(window,'resize',() => { if (active) stopMotion(); },{passive:true});
  const preferenceChanged = () => { if (active && calm()) stopMotion(); };
  listen(reduced,'change',preferenceChanged);
  const motionObserver = typeof MutationObserver === 'function' ? new MutationObserver(preferenceChanged) : null;
  motionObserver?.observe(shell,{attributes:true,attributeFilter:['data-motion']});
  listen(window,'pagehide',event => {
    stopMotion();
    if (!event.persisted) { active = false; disposed = true; editing = null; closeNotes(); closeCredits(); motionObserver?.disconnect(); removers.forEach(remove => remove()); }
  });
  listen(window,'pageshow',() => { if (active) { paint(index); updatePhotoFallback(); } });
  if (shell.dataset.destination === 'journey') activate(true);
})();
