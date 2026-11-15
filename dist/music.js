(() => {
  'use strict';
  const button = document.getElementById('winter-music-toggle');
  const panel = document.getElementById('winter-music-panel');
  const close = document.getElementById('winter-music-close');
  const frame = document.getElementById('winter-music-frame');
  const status = document.getElementById('winter-music-status');
  if (!button || !panel || !close || !frame || !status) return;

  // Use the artist's published SoundCloud player, not a rehosted copyrighted MP3.
  // This single iframe stays mounted as the birthday site's hash routes change.
  const officialTrack = 'https://soundcloud.com/itsjvke/this-is-what-winter-feels-like';
  let widget = null;
  let ready = false;
  let playing = false;
  let hasPlayed = false;
  let closedByUser = false;
  let disposed = false;

  function announce(message) { status.textContent = message; }
  function sync() {
    button.dataset.playing = String(playing);
    button.setAttribute('aria-pressed',String(playing));
    button.setAttribute('aria-label',playing ? '暂停背景音乐' : '播放背景音乐');
    button.title = playing ? '暂停音乐' : '播放音乐';
  }
  function showPanel() {
    panel.hidden = false;
    button.setAttribute('aria-expanded','true');
    closedByUser = false;
  }
  function hidePanel() {
    panel.hidden = true;
    button.setAttribute('aria-expanded','false');
    closedByUser = true;
    button.focus({preventScroll:true});
  }
  function attachWidget() {
    if (disposed || widget || !window.SC || !window.SC.Widget) return;
    try {
      widget = window.SC.Widget(frame);
      widget.bind(window.SC.Widget.Events.READY, () => {
        ready = true;
        try { widget.setVolume(38); } catch (_) {}
        announce('音乐播放器已经就绪。轻点音符播放；如 iPad 限制，请在展开的播放器中点击播放。');
      });
      widget.bind(window.SC.Widget.Events.PLAY, () => {
        playing = true; hasPlayed = true; sync();
        announce('正在播放 JVKE 的 this is what winter feels like。');
      });
      widget.bind(window.SC.Widget.Events.PAUSE, () => {
        playing = false; sync(); announce('音乐已暂停。');
      });
      widget.bind(window.SC.Widget.Events.FINISH, () => {
        playing = false; sync();
        // Loop only after the visitor initiated playback.
        if (hasPlayed && !disposed) {
          try { widget.seekTo(0); widget.play(); } catch (_) {}
        }
      });
      widget.bind(window.SC.Widget.Events.ERROR, () => {
        announce('官方播放器暂时不可用。可以打开下方官方歌曲链接收听。');
        showPanel();
      });
    } catch (_) { widget = null; showPanel(); }
  }

  frame.src = 'https://w.soundcloud.com/player/?url='
    + encodeURIComponent(officialTrack)
    + '&color=%237a998b&auto_play=false&hide_related=true'
    + '&show_comments=false&show_user=true&show_reposts=false'
    + '&show_teaser=false&visual=false';

  function loadApi() {
    if (window.SC?.Widget) { attachWidget(); return; }
    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.async = true;
    script.onload = attachWidget;
    script.onerror = () => {
      announce('无法加载音乐控制。请点开播放器后手动播放，或使用歌曲官方链接。');
      showPanel();
    };
    document.head.appendChild(script);
  }
  loadApi();

  button.addEventListener('click', () => {
    if (disposed) return;
    if (!ready || !widget) {
      showPanel();
      announce('请点击展开的官方播放器中的播放按钮。');
      return;
    }
    if (playing) {
      try { widget.pause(); } catch (_) { showPanel(); }
      return;
    }
    // User-gesture playback. In iPad Safari this may still require a tap
    // on SoundCloud's own play control, available in the expandable panel.
    try {
      widget.play();
      announce('正在尝试播放。如没有声音，请点开播放器并点击里面的播放按钮。');
    } catch (_) { showPanel(); }
    if (!hasPlayed && !closedByUser) showPanel();
  });
  close.addEventListener('click', hidePanel);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) hidePanel();
  });
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    disposed = true;
    try { widget?.pause(); } catch (_) {}
  });
  sync();
})();
