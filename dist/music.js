(() => {
  'use strict';
  const button = document.getElementById('winter-music-toggle');
  const panel = document.getElementById('winter-music-panel');
  const close = document.getElementById('winter-music-close');
  const frame = document.getElementById('winter-music-frame');
  const status = document.getElementById('winter-music-status');
  const title = document.getElementById('winter-music-title');
  const officialLink = document.getElementById('winter-music-credit');
  const filePicker = document.getElementById('winter-local-file');
  const fileStatus = document.getElementById('winter-local-file-status');
  const trackButtons = Array.from(document.querySelectorAll('[data-winter-song]'));
  if (!button || !panel || !close || !frame || !status || !title || !officialLink || !filePicker || !fileStatus) return;

  // Verified Apple Music song IDs. Apple embeds provide an authorised preview
  // without login and may provide full playback to entitled subscribers.
  const tracks = {
    moon: { title:'moon and back', id:'1640157153' },
    pretty: { title:'pretty', id:'1796262634' },
    her: { title:'her', id:'1764940884' },
    winter: { title:'this is what winter feels like', id:'1724478152' }
  };
  let currentSong = 'moon';
  let playing = false;
  const localSources = new Map();
  const audio = new Audio();
  audio.preload = 'metadata';
  audio.loop = true;
  audio.volume = 0.36;
  let disposed = false;

  function announce(message) { status.textContent = message; }
  function sync() {
    button.dataset.playing = String(playing);
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? '暂停本机背景音乐' : '打开背景音乐与歌曲选择');
    button.title = playing ? '暂停本机音乐' : '打开背景音乐';
  }
  function showPanel() {
    panel.hidden = false;
    button.setAttribute('aria-expanded','true');
    loadPreview();
  }
  function hidePanel() {
    panel.hidden = true;
    button.setAttribute('aria-expanded','false');
    button.focus({preventScroll:true});
  }
  function loadPreview() {
    // Delayed until the panel opens, so mainland visitors do not wait for
    // blocked overseas media before seeing the birthday home page.
    const track = tracks[currentSong];
    const url = 'https://embed.music.apple.com/us/song/' + track.id;
    if (frame.getAttribute('src') !== url) frame.src = url;
  }
  function refresh() {
    const track = tracks[currentSong];
    title.textContent = track.title;
    officialLink.href = 'https://music.apple.com/us/song/' + track.id;
    officialLink.textContent = 'Apple Music 打开《' + track.title + '》';
    frame.title = 'Apple Music · JVKE · ' + track.title;
    trackButtons.forEach(el => el.setAttribute('aria-pressed', String(el.dataset.winterSong === currentSong)));
    const hasFile = localSources.has(currentSong);
    fileStatus.textContent = hasFile
      ? '已在这台设备选择《' + track.title + '》的音乐文件；右上角音符可以播放和暂停。'
      : '这首歌尚未选择本机音乐文件；可使用上方 Apple Music 试听。';
    filePicker.value = '';
  }
  function chooseSong(id) {
    if (!Object.hasOwn(tracks,id) || disposed) return;
    audio.pause();
    playing = false;
    currentSong = id;
    if (localSources.has(id)) audio.src = localSources.get(id);
    else { audio.removeAttribute('src'); }
    refresh(); sync(); showPanel();
    announce('已选择《' + tracks[id].title + '》。可点击官方试听或选择本机文件。');
  }
  async function playLocal() {
    if (!localSources.has(currentSong)) {
      showPanel();
      announce('请点 Apple Music 播放器里的播放键，或选择你有权使用的本机音频文件。');
      return;
    }
    if (audio.paused) {
      const target = localSources.get(currentSong);
      if (audio.src !== target) audio.src = target;
      try { await audio.play(); } catch (_) { showPanel(); announce('浏览器没有开始播放。请重新点击播放键。'); }
    } else {
      audio.pause();
    }
  }

  audio.addEventListener('play', () => { playing = true; sync(); announce('正在播放本机音乐。'); });
  audio.addEventListener('pause', () => { playing = false; sync(); });
  audio.addEventListener('error', () => { playing = false; sync(); showPanel(); announce('无法读取选中的音频格式，请更换文件。'); });
  button.addEventListener('click', () => {
    if (disposed) return;
    if (localSources.has(currentSong)) { void playLocal(); return; }
    if (panel.hidden) showPanel();
    else hidePanel();
  });
  filePicker.addEventListener('change', () => {
    const file = filePicker.files && filePicker.files[0];
    if (!file || disposed) return;
    if (!file.type.startsWith('audio/') && !/\.(mp3|m4a|wav|aac|ogg)$/i.test(file.name)) {
      fileStatus.textContent = '请选择 MP3、M4A、WAV 等音频文件。';
      return;
    }
    audio.pause();
    const previous = localSources.get(currentSong);
    if (previous) URL.revokeObjectURL(previous);
    const url = URL.createObjectURL(file);
    localSources.set(currentSong,url);
    audio.src = url;
    refresh();
    fileStatus.textContent = '已选择《' + tracks[currentSong].title + '》的本机音频，正在尝试播放。';
    void playLocal();
  });
  trackButtons.forEach(el => el.addEventListener('click', () => chooseSong(el.dataset.winterSong)));
  close.addEventListener('click', hidePanel);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) hidePanel();
  });
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    disposed = true;
    audio.pause();
    localSources.forEach(url => URL.revokeObjectURL(url));
    localSources.clear();
  });
  refresh();
  sync();
})();