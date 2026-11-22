(() => {
  'use strict';

  const copy = window.WINTER;
  const root = document.documentElement;
  const main = document.getElementById('content');
  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');
  const dialog = document.getElementById('view-dialog');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const asset = name => 'assets/' + name;
  const stable = 'https://winter-living-landscape-preview.vercel.app/';
  const chapters = {
    home: 'Home', about: 'About Me', journey: 'Journey',
    memories: 'Memories', cake: 'Birthday', letter: 'Letter'
  };
  const order = Object.keys(chapters);
  const flagLabel = { china: 'CHINA', uk: 'UnitedKindom' };
  const state = { night: false, portrait: 3, stop: 0, unfolded: false, letter: 'note', country: 'china' };
  const cardNotes = new Map();
  const travelNotes = new Map();
  const countryPages = { china: 0, uk: 0 };
  const strokeIcon = (path, box = '0 0 24 24') => '<svg viewBox="' + box + '" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  const back = strokeIcon('<path d="m14 6-6 6 6 6"/>');
  const forward = strokeIcon('<path d="m10 6 6 6-6 6"/>');
  const closeMark = strokeIcon('<path d="m6 6 12 12M18 6 6 18"/>');
  const musicMark = strokeIcon('<path d="M9 17V5l11-2v12M9 17a3.5 2.5 0 1 1-7 0 3.5 2.5 0 0 1 7 0Zm11-2a3.5 2.5 0 1 1-7 0 3.5 2.5 0 0 1 7 0Z"/>');
  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]
  ));
  const current = () => root.dataset.chapter;
  let stopObserver;
  let stopFrame = 0;
  let waveFrame = 0;
  let objectUrl;
  let returnTarget;

  header.innerHTML = copy.brand + '<nav class="top-nav" aria-label="主导航">' +
    '<a href="#home">Home</a><a href="#about">About Me</a>' +
    '<details class="destination"><summary>Destination</summary><div class="nav-links">' +
    order.slice(2).map(key => '<a href="#' + key + '">' + chapters[key] + ' <span aria-hidden="true">↗</span></a>').join('') +
    '</div></details></nav><button class="icon-button music-open" data-action="music" aria-haspopup="dialog" aria-label="音乐">' + musicMark + '</button>';

  function modeSwitch() {
    return '<div class="mode-switch" role="group" aria-label="Morning / Night"><button data-action="morning" aria-pressed="' +
      !state.night + '">Morning</button><button data-action="night" aria-pressed="' + state.night + '">Night</button></div>';
  }

  const home = () => `
    <section class="home composition" aria-labelledby="home-title">
      <div class="opening">
        <h1 id="home-title"><span class="for-you">For you</span><span class="winter-title">WINTER</span></h1>
        <div class="opening-copy">
          <p class="opening-poem">${copy.poem.map(line => '<span>' + line + '</span>').join('')}</p>
          <p class="dedication">${copy.dedication}</p>
        </div>
      </div>
      <figure class="poster" aria-label="雪山、树叶与夕阳的 WINTER 原始海报">
        <img src="${asset('home-original.png')}" width="3344" height="1882" alt="树叶下是夕照里的绵延雪山，细密的光栅线穿过山谷和草坡" fetchpriority="high">
        <img class="retouch" src="${asset('winter-poster-corner-retouch.svg')}" width="1672" height="941" alt="" aria-hidden="true">
      </figure>
      <div class="home-catalog"><div><p>A Personal Exhibition</p><em>A little universe made for you.</em></div>${modeSwitch()}</div>
    </section>`;

  function portraitTile(portrait, index) {
    if (index === 1) {
      return '<img class="portrait-image" src="' + asset('winter-about-second-photo.webp') + '" alt="' + portrait.alt + '">';
    }
    return '<span class="portrait-image portrait-atlas" role="img" aria-label="' + portrait.alt + '" style="' + portrait.style + '"></span>';
  }

  const about = () => `
    <section class="about composition" aria-labelledby="about-title">
      <div class="portrait-intro">
        <p class="section-name">About Me</p>
        <h1 id="about-title"><span>关于你，</span><span>先从这些</span><span>瞬间开始。</span></h1>
        <div class="portrait-info" aria-live="polite"></div>
        <div class="portrait-nav" aria-label="切换肖像">
          <button class="icon-button" data-action="portrait-prev" aria-label="上一张肖像">${back}</button>
          <div class="image-count" data-portrait-count></div>
          <button class="icon-button" data-action="portrait-next" aria-label="下一张肖像">${forward}</button>
        </div>
        <a href="#about-notes" class="inline-link">写给 25 岁的自己 <span aria-hidden="true">↓</span></a>
      </div>
      <div class="portrait-stage" tabindex="0" role="group" aria-label="七张肖像，左右滑动或用方向键浏览">
        ${copy.portraits.map((photo, index) => '<button class="portrait-card" data-action="portrait" data-index="' + index + '" aria-label="' + photo.alt + ' · ' + photo.caption + '">' + portraitTile(photo, index) + '</button>').join('')}
      </div>
    </section>
    <section class="note-chapter composition" id="about-notes" aria-labelledby="notes-heading">
      <div class="note-intro">
        <p class="section-name">写给 25 岁的自己</p><h2 id="notes-heading">${copy.notesHeading}</h2>
        <p class="note-thanks">${copy.notesFooter}</p>
        <p class="note-help">把想对自己说的话，一张张留在这里。</p>
      </div>
      ${copy.notes}
    </section>`;

  const journey = () => `
    <section class="journey composition" aria-labelledby="journey-title">
      <header class="chapter-intro journey-intro"><p class="section-name">Journey</p><h1 id="journey-title">你走过的路，<span>我陪你再走一遍。</span></h1></header>
      <div class="journey-layout">
        <aside class="journey-visual" aria-label="五站照片">
          <div class="journey-frames">
            ${copy.stops.map((stop, index) => '<button data-action="journey-photo" data-index="' + index + '" class="journey-frame" aria-label="放大照片 · ' + escapeHtml(stop.caption) + '"' + (index === 0 ? '' : ' hidden') + '><img src="' + stop.src + '" alt="' + escapeHtml(stop.alt) + '"></button>').join('')}
          </div>
          <div class="journey-photo-meta"><span id="stop-name"></span><button class="text-button" data-action="credits">照片来源</button></div>
          <div class="stop-controls" role="group" aria-label="旅程站点">
            ${copy.stops.map((stop, index) => '<button data-action="stop" data-index="' + index + '">' + stop.label + '</button>').join('')}
          </div>
        </aside>
        <div class="journey-reading">
          ${copy.stops.map((stop, index) => `
            <article class="journey-letter" id="stop-${index}" data-story="${index}">
              <p class="stop-period">${stop.period}</p>
              <h2>${stop.title}</h2>
              ${stop.fact ? '<p class="stop-fact">' + stop.fact + '</p>' : ''}
              <p class="stop-prose">${stop.prose}</p>
              <div class="stop-question"><p>我想知道</p><p>${stop.question}</p></div>
              <p class="journey-signature">${stop.english} <span>— Gwen</span></p>
              <button class="text-button story-reply" data-action="journey-note" data-index="${index}">把这一段，慢慢讲给 Gwen ↗</button>
              <p class="saved-travel-note" data-note-key="${index}" ${travelNotes.has(index) ? '' : 'hidden'}>${escapeHtml(travelNotes.get(index) || '')}</p>
            </article>`).join('')}
        </div>
      </div>
      <div class="journey-end"><p>${copy.stopEnd}</p><a class="inline-link" href="#letter">下一页 <span aria-hidden="true">→</span></a></div>
    </section>`;

  const memoryPath = index => asset('memory-wall/memory-' + String(index + 1).padStart(2, '0') + '.webp');
  const memoryPositions = [
    [10, 32, -3.5], [22, 21, 2.4], [35, 12, -1.5], [49, 9, 1.6], [64, 12, -2.8], [78, 18, 2.6], [90, 29, 4],
    [9, 61, 3.2], [21, 52, -2.5], [34, 44, 1.2], [49, 39, -1.7], [63, 43, 2.8], [77, 49, -2.2], [91, 59, 2.9],
    [23, 80, -3], [36, 74, 2.2], [50, 69, -1.8], [64, 72, 2.4], [78, 80, -2.5]
  ];
  const memoryRatios = [0.605455, 0.561818, 0.666364, 0.666364, 0.561818, 0.562727, 0.666364, 1.500682, 0.561818, 0.75, 1.500682, 0.799091, 0.749091, 0.75, 1.77706, 0.562727, 0.567273, 0.562727, 0.75];
  const memorySize = [92, 77, 99, 88, 103, 82, 89, 86, 105, 96, 113, 84, 102, 87, 99, 94, 111, 83, 103];
  const memoryAngle = .76;
  const memories = () => `
    <section class="memories composition" aria-labelledby="memories-title">
      <header class="chapter-intro memory-intro">
        <p class="section-name">Memories</p><h1 id="memories-title">一些闪闪发光的普通日子</h1>
        <p class="memories-line">我喜欢你所有的模样</p>
      </header>
      <div class="memory-gallery" data-unfolded="${state.unfolded}" aria-label="十九张照片">
        ${copy.photos.map(([name, caption], index) => {
          const [x,y,tilt] = memoryPositions[index];
          const mobileRow = Math.floor(index / 4);
          const mobileX = (index % 4) * 24 + 14 + ([0,2,-1,0,6][mobileRow]);
          const mobileY = 13 + mobileRow * 18 + Math.abs((index % 4) - 1.5) * 2.8;
          const bx = x * .82 + 10;
          const by = y - (x - 50) * .22 + 3;
          const center = index === 5 ? 8 : index === 3 ? 6 : index === 14 ? 5 : index === 10 ? 4 : index === 17 ? 3 : 1;
          const stackX = center === 8 ? 0 : center === 6 ? -62 : center === 5 ? 56 : center === 4 ? -98 : center === 3 ? 95 : ((index * 29) % 74 - 37);
          const stackY = center === 8 ? -5 : center === 6 ? -20 : center === 5 ? -23 : center === 4 ? 30 : center === 3 ? 33 : ((index * 11) % 39 - 12);
          const ratio = memoryRatios[index];
          const style = '--ratio:' + ratio + ';--factor:' + Math.sqrt(ratio) + ';--mx:' + mobileX + '%;--my:' + mobileY + '%;--bx:' + bx + '%;--by:' + by + '%;--tilt:' + tilt * memoryAngle + 'deg;--s:' + memorySize[index] + ';--sx:' + stackX + 'px;--sy:' + stackY + 'px;--sz:' + center + ';--sr:' + (stackX / 9) + 'deg;--delay:' + (index % 7) * 14 + 'ms';
          return '<button class="memory-photo" data-action="memory" data-index="' + index + '" style="' + style + '" aria-label="放大 · ' + caption + '"' + (state.unfolded ? '' : ' tabindex="-1" aria-hidden="true"') + '><img src="' + memoryPath(index) + '" alt="' + caption + '" draggable="false"></button>';
        }).join('')}
        <button class="memory-stack-target" data-action="memory-toggle" aria-label="展开十九张照片" ${state.unfolded ? 'hidden' : ''}></button>
      </div>
      <button class="inline-link memory-toggle" data-action="memory-toggle" aria-expanded="${state.unfolded}">${state.unfolded ? '收拢照片' : '展开照片'} <span aria-hidden="true">${state.unfolded ? '↙' : '↗'}</span></button>
    </section>`;

  const cake = () => `
    <section class="cake composition" aria-labelledby="cake-title">
      <div class="cake-copy">
        <p class="section-name">A WISH, JUST FOR YOU</p>
        <h1 id="cake-title"><em>For your</em><span>twenty</span><span>fifth.</span></h1>
      </div>
      <figure class="cake-frame" aria-label="暮色下的三层蛋糕和五根白蜡烛">
        <div class="cake-wide"><img src="${asset('cinematic-cake-scene.webp')}" width="1536" height="1024" alt="深蓝湖岸上的奶油白三层蛋糕">${copy.cake.wide}</div>
        <div class="cake-tall"><img src="${asset('cinematic-cake-scene-portrait.webp')}" width="1024" height="1536" alt="深蓝湖岸上的奶油白三层蛋糕">${copy.cake.tall}</div>
      </figure>
      <div class="cake-interact">
        <img class="lighter" src="${asset('birthday-render/lighter.webp')}" alt="金属打火机">
        <div><p class="cake-instruction">捏合拿起打火机，依次靠近五根烛芯。</p>
        <a class="inline-link" href="${stable}#cake" target="_blank" rel="noopener">前往原站点蜡烛 <span aria-hidden="true">↗</span></a></div>
      </div>
    </section>`;

  function noteLetter() {
    const starts = [0, ...copy.afterword.lines.flatMap(([, paragraphStart], index) => paragraphStart ? [index] : []), copy.afterword.lines.length];
    const paragraphs = starts.slice(0,-1).map((index, row) => '<p>' +
      copy.afterword.lines.slice(index, starts[row+1]).map(([line,, mark]) => '<span' + (mark ? ' class="letter-emphasis"' : '') + '>' + line + '</span>').join('') + '</p>'
    ).join('');
    const parts = ['偏偏，在那里', '遇见了你。'];
    const title = parts.join('') === copy.afterword.title ? parts.map(part => '<span>' + part + '</span>').join('') : copy.afterword.title;
    return `
      <div class="note-letter">
        <div class="letter-side">
          <p class="section-name">A LITTLE NOTE ABOUT FATE</p>
          <h1 id="letter-title">${title}</h1>
        </div>
        <div class="letter-body">
          <div class="letter-lines">${paragraphs}</div>
          <img class="handwriting" src="${asset('handwriting/gwen-encounter.png')}" alt="${copy.afterword.handwriting}" width="1023" height="174">
          <div class="letter-closer"><em>${copy.afterword.close[0]}</em><p>${copy.afterword.close[1]}</p></div>
        </div>
      </div>`;
  }

  function countryLetter() {
    return `<div class="country-letter">
      <h1 id="letter-title">${copy.countryHeading}</h1>
      <div class="country-switch" role="group" aria-label="选择国家">
        ${['china','uk'].map(key => '<button data-action="country" data-key="' + key + '" aria-pressed="' + (state.country === key) + '"><img src="' + asset('flag-' + key + '.svg') + '" alt="">' + flagLabel[key] + '</button>').join('')}
      </div>
      <div class="country-layout">
        <figure class="lake-photo">
          <div class="lake-image">
            <img src="${asset('memory-natural.webp')}" alt="群山与草地之间的湖泊" width="1536" height="1024">
            <canvas aria-hidden="true"></canvas>
          </div>
          <figcaption>轻点湖面，可以看见水纹。</figcaption>
        </figure>
        <button class="country-paper" data-action="country-next" aria-live="polite">${countryPaper()}</button>
      </div>
    </div>`;
  }

  function countryPaper() {
    const page = countryPages[state.country];
    return '<span>' + copy[state.country][page] + '</span><span class="country-count">' + (page + 1) + ' / 3 <span aria-hidden="true">↗</span></span>';
  }

  function finaleLetter() {
    return `<div class="finale-letter">
      <figure><img src="${asset('finale-childhood-crisp.avif')}" alt="两位小女孩一起庆祝生日的合照"><figcaption>${copy.finaleCaption}</figcaption></figure>
      <div>
        <p class="section-name">12月15日 · 00:00</p><h1 id="letter-title">${copy.birthdayMessage}</h1>
        <img class="handwriting" src="${asset('handwriting/gwen-birthday.png')}" alt="Gwen 的亲笔生日祝福">
        <a class="inline-link" href="${stable}#finale" target="_blank" rel="noopener">打开原站的最后一页 <span aria-hidden="true">↗</span></a>
      </div>
    </div>`;
  }

  const letter = () => `
    <section class="letter composition" aria-labelledby="letter-title">
      <div class="letter-tabs" role="group" aria-label="信件章节">
        ${[['note','来信'],['country','两国回忆'],['finale','最后一页']].map(([key,label]) => '<button data-action="letter" data-key="' + key + '" aria-pressed="' + (state.letter === key) + '">' + label + '</button>').join('')}
      </div>
      <div class="letter-content">${({ note: noteLetter, country: countryLetter, finale: finaleLetter })[state.letter]()}</div>
    </section>`;

  const templates = { home, about, journey, memories, cake, letter };

  function setPortrait(index) {
    const size = copy.portraits.length;
    const offset = Math.floor(size / 2);
    state.portrait = (index + size) % size;
    main.querySelectorAll('.portrait-card').forEach((card, position) => {
      const distance = (position - state.portrait + size + offset) % size - offset;
      card.dataset.depth = distance;
      card.style.setProperty('--delta', distance);
      card.style.setProperty('--distance', Math.abs(distance));
      card.tabIndex = distance === 0 ? 0 : -1;
      card.setAttribute('aria-hidden', String(Math.abs(distance) > 2));
    });
    const photo = copy.portraits[state.portrait];
    main.querySelector('.portrait-info').innerHTML = '<p lang="en">' + photo.title + '</p><p>' + photo.caption + '</p>';
    main.querySelector('[data-portrait-count]').textContent = (state.portrait + 1) + ' / ' + size;
  }

  function addSwipe() {
    const stage = main.querySelector('.portrait-stage');
    let start;
    let movedAt = -Infinity;
    stage.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      start = [event.clientX, event.clientY];
    });
    stage.addEventListener('pointercancel', () => { start = undefined; });
    stage.addEventListener('pointerup', event => {
      if (!start) return;
      const dx = event.clientX - start[0];
      const dy = event.clientY - start[1];
      start = undefined;
      if (Math.abs(dx) >= 34 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        movedAt = performance.now();
        setPortrait(state.portrait + (dx > 0 ? -1 : 1));
      }
    });
    stage.addEventListener('click', event => {
      if (performance.now() - movedAt < 300) event.stopPropagation();
    }, true);
    stage.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      setPortrait(state.portrait + (event.key === 'ArrowRight' ? 1 : -1));
    });
  }

  function stopAt(index) {
    state.stop = index;
    main.querySelectorAll('.journey-frame').forEach(img => { img.hidden = Number(img.dataset.index) !== index; });
    main.querySelector('#stop-name').textContent = copy.stops[index].caption;
    main.querySelectorAll('.stop-controls button').forEach(button => {
      if (Number(button.dataset.index) === index) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    });
  }

  function watchStops() {
    stopAt(0);
    const stories = [...main.querySelectorAll('[data-story]')];
    const update = () => {
      if (stopFrame) return;
      stopFrame = requestAnimationFrame(() => {
        stopFrame = 0;
        if (current() !== 'journey') return;
        const bound = innerWidth <= 870 ?
          main.querySelector('.journey-visual').getBoundingClientRect().bottom + 48 :
          innerHeight * .51;
        let hit = Math.max(0, stories.findIndex(item => item.getBoundingClientRect().bottom > bound));
        if (stories.at(-1).getBoundingClientRect().bottom < bound) hit = stories.length - 1;
        if (hit !== state.stop) stopAt(hit);
      });
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    stopObserver = () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }

  function jumpStop(index) {
    stopAt(index);
    const card = main.querySelector('[data-story="' + index + '"]');
    const pinned = main.querySelector('.journey-visual');
    const offset = innerWidth <= 870 ? pinned.offsetHeight + header.offsetHeight + 16 : header.offsetHeight + 28;
    window.scrollTo({ top: card.getBoundingClientRect().top + scrollY - offset, behavior: reduceMotion.matches ? 'instant' : 'smooth' });
  }

  function unfold() {
    state.unfolded = !state.unfolded;
    const gallery = main.querySelector('.memory-gallery');
    gallery.dataset.unfolded = state.unfolded;
    gallery.querySelector('.memory-stack-target').hidden = state.unfolded;
    const button = main.querySelector('.memory-toggle');
    button.setAttribute('aria-expanded', String(state.unfolded));
    button.innerHTML = (state.unfolded ? '收拢照片' : '展开照片') + ' <span aria-hidden="true">' + (state.unfolded ? '↙' : '↗') + '</span>';
    gallery.querySelectorAll('.memory-photo').forEach(photo => {
      photo.tabIndex = state.unfolded ? 0 : -1;
      if (state.unfolded) photo.removeAttribute('aria-hidden');
      else photo.setAttribute('aria-hidden','true');
    });
    if (state.unfolded && document.activeElement === document.body) button.focus({ preventScroll:true });
  }

  function animateLake() {
    if (waveFrame) cancelAnimationFrame(waveFrame);
    const figure = main.querySelector('.lake-image');
    if (!figure) return;
    const image = figure.querySelector('img');
    const canvas = figure.querySelector('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    const bank = [[.34,.61],[.45,.58],[.65,.568],[.80,.579],[.835,.604],[.80,.646],[.73,.69],[.66,.724],[.56,.722],[.445,.697],[.375,.66]];
    const drawPath = (width, height) => {
      const path = new Path2D();
      bank.forEach(([x,y], index) => {
        if (index === 0) path.moveTo(x * width,y * height);
        else path.lineTo(x * width,y * height);
      });
      path.closePath();
      return path;
    };
    let start;
    figure.addEventListener('pointerdown', event => {
      if (event.isPrimary) start = [event.clientX,event.clientY];
    });
    figure.addEventListener('pointercancel', () => { start = undefined; });
    figure.addEventListener('pointerup', event => {
      if (reduceMotion.matches || !start || !image.complete || !image.naturalWidth) return;
      const distance = Math.hypot(event.clientX - start[0], event.clientY - start[1]);
      start = undefined;
      if (distance > 14) return;
      const rect = image.getBoundingClientRect();
      const width = Math.ceil(rect.width);
      const height = Math.ceil(rect.height);
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const bankPath = drawPath(width, height);
      if (!context.isPointInPath(bankPath, x, y)) return;
      cancelAnimationFrame(waveFrame);
      canvas.width = width;
      canvas.height = height;
      const begin = performance.now();
      const update = time => {
        const progress = (time - begin) / 1150;
        context.clearRect(0,0,width,height);
        if (progress >= 1 || !figure.isConnected) { waveFrame = 0; return; }
        context.save();
        context.clip(bankPath);
        for (let i=0;i<4;i++) {
          const travel = Math.max(0, progress - i*.105);
          if (travel === 0) continue;
          const radius = travel * width * .27 + 2;
          context.save();
          context.beginPath();
          context.ellipse(x,y,radius,radius*.29,0,0,Math.PI*2);
          context.ellipse(x,y,Math.max(.5,radius-2),Math.max(.5,radius*.29-1.45),0,0,Math.PI*2);
          context.clip('evenodd');
          context.globalAlpha = (1-progress) * .81;
          context.drawImage(image,0,(i%2 === 0 ? -1.8 : 1.8) * (1-progress),width,height);
          context.restore();
        }
        context.restore();
        waveFrame = requestAnimationFrame(update);
      };
      waveFrame = requestAnimationFrame(update);
    });
  }

  function present(title, body, className = '') {
    returnTarget = document.activeElement;
    dialog.className = 'view-dialog ' + className;
    dialog.setAttribute('aria-labelledby','dialog-title');
    dialog.innerHTML = '<div class="dialog-top"><h2 id="dialog-title">' + title + '</h2><form method="dialog"><button class="icon-button" aria-label="关闭">' + closeMark + '</button></form></div>' + body;
    dialog.showModal();
  }

  dialog.addEventListener('close', () => {
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = undefined; }
    dialog.replaceChildren();
    if (returnTarget instanceof HTMLElement && returnTarget.isConnected) returnTarget.focus({ preventScroll:true });
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

  function photoView(title, visual, caption) {
    present(escapeHtml(title), '<figure class="photo-view">' + visual + '<figcaption>' + escapeHtml(caption) + '</figcaption></figure>', 'photo-dialog');
  }

  function showCredits() {
    const credit = copy.credits.find(item => item.id === copy.stops[state.stop].key);
    if (!credit) return;
    const links = [
      credit.source_url ? '<a class="inline-link" href="' + credit.source_url + '" target="_blank" rel="noopener">照片来源 ↗</a>' : '',
      credit.license_url ? '<a class="inline-link" href="' + credit.license_url + '" target="_blank" rel="noopener">' + credit.license + ' ↗</a>' : ''
    ].join('');
    present('照片来源', '<p>' + credit.title + '</p><p>' + credit.author + '</p><p>' + credit.depicts + '</p><div class="credit-links">' + links + '</div>');
  }

  function editNote(label, question, initial, save) {
    present(label, '<p class="edit-prompt">' + escapeHtml(question) + '</p><form id="note-editor"><label class="visually-hidden" for="note-text">写在这里</label><textarea id="note-text" rows="5" maxlength="300" autofocus>' + escapeHtml(initial || '') + '</textarea><button class="inline-link" type="submit">保存便签 ↗</button></form>');
    dialog.querySelector('form#note-editor').addEventListener('submit', event => {
      event.preventDefault();
      save(dialog.querySelector('textarea').value.trim());
      dialog.close();
    });
  }

  function music() {
    present('音乐', '<div class="music-tracks">' + Object.values(copy.tracks).map(track =>
      '<a href="https://music.apple.com/us/song/' + track.id + '" target="_blank" rel="noopener">' +
      escapeHtml(track.title) + (track.artist ? ' <small>' + track.artist + '</small>' : '') + ' <span aria-hidden="true">↗</span></a>'
    ).join('') + '</div><label class="local-music">从本机选择音频<input type="file" accept="audio/*"></label><audio controls preload="none" hidden></audio>');
    dialog.querySelector('input').addEventListener('change', event => {
      const file = event.target.files[0];
      if (!file) return;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(file);
      const player = dialog.querySelector('audio');
      player.src = objectUrl;
      player.hidden = false;
      player.play().catch(() => {});
    });
  }

  function setTime(night) {
    state.night = night;
    root.dataset.night = night;
    main.querySelectorAll('.mode-switch button').forEach(item => {
      item.setAttribute('aria-pressed', String((item.dataset.action === 'night') === night));
    });
  }

  function showLetter(key) {
    state.letter = key;
    const area = main.querySelector('.letter-content');
    area.innerHTML = ({ note: noteLetter, country: countryLetter, finale: finaleLetter })[key]();
    main.querySelectorAll('.letter-tabs button').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.key === key)));
    if (!reduceMotion.matches) area.animate([{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { duration: 360, easing: 'ease-out' });
    animateLake();
  }

  const actions = {
    morning: () => setTime(false),
    night: () => setTime(true),
    music,
    'portrait-prev': () => setPortrait(state.portrait - 1),
    'portrait-next': () => setPortrait(state.portrait + 1),
    portrait: (_, index) => {
      if (index !== state.portrait) { setPortrait(index); return; }
      const photo = copy.portraits[index];
      photoView(photo.title, portraitTile(photo,index), photo.caption);
    },
    stop: (_, index) => jumpStop(index),
    'journey-photo': (_, index) => {
      const photo = copy.stops[index];
      photoView(photo.label, '<img src="' + photo.src + '" alt="' + escapeHtml(photo.alt) + '">', photo.caption + ' · ' + photo.credit);
    },
    credits: showCredits,
    'journey-note': (_, index) => editNote(copy.stops[index].title, copy.stops[index].question, travelNotes.get(index), value => {
      travelNotes.set(index, value);
      const note = main.querySelector('[data-note-key="' + index + '"]');
      note.textContent = value;
      note.hidden = !value;
    }),
    'memory-toggle': unfold,
    memory: (_, index) => {
      if (!state.unfolded) { unfold(); return; }
      const [title,caption] = copy.photos[index];
      photoView(title, '<img src="' + memoryPath(index) + '" alt="' + caption + '">', caption);
    },
    letter: button => showLetter(button.dataset.key),
    country: button => {
      state.country = button.dataset.key;
      main.querySelectorAll('.country-switch button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      main.querySelector('.country-paper').innerHTML = countryPaper();
    },
    'country-next': button => {
      countryPages[state.country] = (countryPages[state.country] + 1) % copy[state.country].length;
      button.innerHTML = countryPaper();
      if (!reduceMotion.matches) button.animate([{ opacity:.52, translate:'0 4px' },{ opacity:1, translate:'0 0' }], { duration: 240 });
    }
  };

  document.addEventListener('click', event => {
    const control = event.target.closest('[data-action]');
    if (control && actions[control.dataset.action]) actions[control.dataset.action](control, Number(control.dataset.index));
    const note = event.target.closest('.sticky-note');
    if (note) editNote('写给 25 岁的自己', '把想对自己说的话，一张张留在这里。', cardNotes.get(note.dataset.noteId), value => {
      cardNotes.set(note.dataset.noteId, value);
      const hint = note.querySelector('.note-ink');
      if (hint) hint.remove();
      if (value) {
        const line = document.createElement('span');
        line.className = 'note-ink';
        line.textContent = value;
        note.append(line);
      }
    });
    const nav = header.querySelector('.destination');
    if (nav.open && (!nav.contains(event.target) || event.target.closest('a'))) nav.open = false;
  });

  function render() {
    const fragment = location.hash.slice(1);
    const key = fragment === 'about-notes' ? 'about' : Object.hasOwn(templates, fragment) ? fragment : 'home';
    const sameNotes = key === 'about' && fragment === 'about-notes' && current() === 'about';
    if (fragment === 'content') { main.focus(); return; }
    if (sameNotes) {
      main.querySelector('#about-notes').scrollIntoView({ behavior: reduceMotion.matches ? 'instant' : 'smooth' });
      return;
    }
    if (dialog.open) dialog.close();
    if (stopObserver) { stopObserver(); stopObserver = undefined; }
    cancelAnimationFrame(waveFrame);
    root.dataset.chapter = key;
    root.dataset.night = state.night;
    main.innerHTML = templates[key]();
    const nav = header.querySelector('.destination');
    nav.open = false;
    header.querySelectorAll('.top-nav a').forEach(link => {
      if (link.hash === '#' + key) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
    });
    nav.firstElementChild.classList.toggle('destination-current', key !== 'about' && key !== 'home');
    const index = order.indexOf(key);
    const next = order[index+1];
    footer.innerHTML = '<div class="footer-inner"><a class="review-link" href="#home">WINTER.</a><div class="footer-nav">' +
      order.map(chapter => '<a href="#' + chapter + '"' + (key === chapter ? ' aria-current="page"' : '') + '>' + chapters[chapter] + '</a>').join('') +
      '</div>' + (next ? '<a class="footer-next" href="#' + next + '">' + chapters[next] + ' <span aria-hidden="true">→</span></a>' : '<a class="footer-next" href="#home">Home <span aria-hidden="true">↗</span></a>') + '</div>';
    if (key === 'about') {
      setPortrait(state.portrait);
      addSwipe();
      main.querySelectorAll('.sticky-note').forEach(note => {
        const value = cardNotes.get(note.dataset.noteId);
        if (value) {
          const line = document.createElement('span');
          line.className = 'note-ink';
          line.textContent = value;
          note.append(line);
        }
      });
    }
    if (key === 'journey') watchStops();
    if (key === 'letter') animateLake();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (fragment === 'about-notes') requestAnimationFrame(() => main.querySelector('#about-notes')?.scrollIntoView());
  }

  window.addEventListener('hashchange', render);
  window.addEventListener('pagehide', () => { cancelAnimationFrame(waveFrame); cancelAnimationFrame(stopFrame); });
  render();
})();
