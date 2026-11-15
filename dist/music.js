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
  // Tracks are embedded from JVKE's published SoundCloud profile.
  const tracks = {
    moon: { title:'moon and back', url:'https://soundcloud.com/itsjvke/moon-and-back' },
    pretty: { title:'pretty', url:'https://soundcloud.com/itsjvke/pretty' },
    her: { title:'her', url:'https://soundcloud.com/itsjvke/her' },
    winter: { title:'this is what winter feels like', url:'https://soundcloud.com/itsjvke/this-is-what-winter-feels-like' }
  };
  const songButtons = Array.from(document.querySelectorAll('[data-winter-song]'));
  const title = document.getElementById('winter-music-title');
  const songLink = document.getElementById('winter-music-credit');
  let currentSong = 'moon';
  let widget = null;
  let ready = false;
  let playing = false;
  let hasPlayed = false;
  let closedByUser = false;
  let disposed = false;

  function announce(message) { status.textContent = message; }
  function refreshSong() {
    const track = tracks[currentSong];
    title.textContent = track.title;
    songLink.href = track.url;
    songLink.textContent = '在 SoundCloud 收听《' + track.title + '》';
    frame.title = 'JVKE · ' + track.title + '，SoundCloud 官方播放器';
    songButtons.forEach(el => el.setAttribute('aria-pressed',String(el.dataset.winterSong===currentSong)));
  }
  function chooseSong(id) {
    if (!Object.hasOwn(tracks,id) || disposed) return;
    currentSong = id;
    playing = false;
    hasPlayed = true;
    sync(); refreshSong(); showPanel();
    if (widget && ready) {
      try {
        widget.load(tracks[id].url,{
          auto_play:true, hide_related:true, show_comments:false,
          show_user:true, show_reposts:false, show_teaser:false, visual:false,
          callback:()=>{try{widget.setVolume(38)}catch(_){}}
        });
      } catch (_) {
        ready=false;
        frame.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(tracks[id].url)
          + '&color=%237a998b&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false';
      }
    } else {
      frame.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(tracks[id].url)
        + '&color=%237a998b&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false';
    }
    announce('已选择《'+tracks[id].title+'》。iPad 如未播放，请点击下方播放器里的播放键。');
  }
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
        announce('正在播放 JVKE 的《'+tracks[currentSong].title+'》。');
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
    + encodeURIComponent(tracks[currentSong].url)
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
  refreshSong();
  loadApi();
  songButtons.forEach(el => el.addEventListener('click',()=>chooseSong(el.dataset.winterSong)));

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
