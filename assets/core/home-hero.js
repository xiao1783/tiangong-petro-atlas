/* 总览主视觉：地层与井轨迹为概念示意，不代表实时工程数据。 */
(function (global) {
  'use strict';
  var script = document.currentScript;
  var rigURL = new URL('./home-rig-scene.js?v=20261027-interaction', script ? script.src : new URL('assets/core/home-hero.js', document.baseURI).href).href;
  var rigPromise = null;

  function scene() {
    var grid = '', strata = '', stars = '';
    var rock = [['#88745d', '#685b4c'], ['#b7a17a', '#8c795b'], ['#79746b', '#585750'], ['#baa47b', '#927d5b'], ['#605c55', '#454640'], ['#8c7866', '#665b50']];
    for (var i = 1; i < 16; i++) {
      var t = i / 16, x = 450 - 390 * t, y = 174 + 156 * t;
      grid += '<path d="M' + x + ' ' + y + ' Q' + (x + 195) + ' ' + (y + 56 - Math.sin(t * 9) * 18) + ' ' + (x + 390) + ' ' + (y + 156) + '"/>';
      grid += '<path d="M' + (450 + 390 * t) + ' ' + y + ' Q' + (255 + 390 * t) + ' ' + (y + 56 + Math.cos(t * 8) * 12) + ' ' + (60 + 390 * t) + ' ' + (y + 156) + '"/>';
    }
    for (var j = 0; j < 6; j++) {
      var d = j * 25;
      strata += '<path d="M60 ' + (330 + d) + ' Q250 ' + (375 + d) + ' 450 ' + (486 + d) + ' L450 ' + (511 + d) + ' Q240 ' + (399 + d) + ' 60 ' + (355 + d) + 'Z" fill="' + rock[j][0] + '"/>';
      strata += '<path d="M450 ' + (486 + d) + ' Q650 ' + (407 + d) + ' 840 ' + (330 + d) + ' L840 ' + (355 + d) + ' Q640 ' + (439 + d) + ' 450 ' + (511 + d) + 'Z" fill="' + rock[j][1] + '"/>';
    }
    for (var k = 0; k < 28; k++) {
      stars += '<circle cx="' + (60 + k * 113 % 790) + '" cy="' + (30 + k * 71 % 520) + '" r="' + (k % 4 ? 1 : 1.8) + '" opacity="' + (.15 + k % 4 * .12) + '"/>';
    }
    return '<svg class="home-scene" viewBox="0 0 900 720" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="hs-title hs-desc">' +
      '<title id="hs-title">智能钻井 · 从地表到储层</title><desc id="hs-desc">土褐色地表、砂岩与灰褐色岩层，钢灰色井架与金属井筒延伸至储层。淡金色流动光线表示数据连接，仅作概念示意。</desc>' +
      '<defs>' +
      '<linearGradient id="hs-top" x2="1" y2="1"><stop stop-color="#766a55"/><stop offset=".5" stop-color="#9b896c"/><stop offset="1" stop-color="#746851"/></linearGradient>' +
      '<linearGradient id="hs-steel"><stop stop-color="#5a676e"/><stop offset=".45" stop-color="#b8c0bf"/><stop offset=".7" stop-color="#8d999b"/><stop offset="1" stop-color="#52636c"/></linearGradient>' +
      '<radialGradient id="hs-aura"><stop stop-color="#a8b2a1" stop-opacity=".16"/><stop offset="1" stop-color="#a8b2a1" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="hs-scan" x2="0" y2="1"><stop stop-color="#b9e3dc" stop-opacity="0"/><stop offset="1" stop-color="#b9e3dc" stop-opacity=".1"/></linearGradient>' +
      '</defs>' +
      '<g class="hs-stars" fill="#54848a">' + stars + '</g>' +
      '<ellipse cx="460" cy="360" rx="420" ry="290" fill="url(#hs-aura)"/>' +
      '<g fill="none" stroke="#55a5ac" stroke-width=".7" opacity=".34"><ellipse cx="450" cy="383" rx="425" ry="180"/><ellipse cx="450" cy="383" rx="398" ry="167" stroke-dasharray="2 11"/><path d="M450 32V687 M18 383H886" stroke-dasharray="3 9"/></g>' +
      '<g stroke="#d1bd9a" stroke-opacity=".28" stroke-width=".8">' + strata + '</g>' +
      '<path d="M60 430 Q250 475 450 586 Q650 507 840 430 L840 442 Q650 519 450 598 Q250 487 60 442Z" fill="#d6c29a" opacity=".38"/>' +
      '<path d="M60 330L450 174 840 330 450 486Z" fill="url(#hs-top)" stroke="#c1ae8f" stroke-opacity=".65"/>' +
      '<g fill="none" stroke="#d6cbb3" stroke-width=".7" opacity=".22">' + grid + '</g>' +
      '<g class="hs-scan" fill="url(#hs-scan)" stroke="#b9e3dc" stroke-opacity=".25"><path d="M170 302L450 190 730 302 450 414Z"/></g>' +
      '<g fill="none" stroke="#b0b3ab" stroke-width="1"><path d="M320 323L450 271 580 323 450 375Z"/><path d="M336 323L450 278 564 323 450 369Z" stroke-dasharray="4 5"/></g>' +
      '<g fill="none" stroke="url(#hs-steel)" stroke-linejoin="round"><path d="M392 321L438 94H462L508 321M405 316L442 105M495 316L458 105" stroke-width="4"/>' +
      '<path d="M397 295H503L406 253H494L415 210H485L424 166H476L432 126H468" stroke-width="2"/>' +
      '<path d="M406 253L503 295M415 210L494 253M424 166L485 210M432 126L476 166" stroke-width="1.4"/>' +
      '<path d="M450 94V320M435 84H465M435 80V98M465 80V98" stroke-width="2"/></g>' +
      '<path d="M377 321L450 292 523 321 450 350Z" fill="#4e5558" stroke="#b3b9b8" stroke-width="1.4"/>' +
      '<g stroke="#dfbc71" stroke-width=".8"><path d="M300 302V279L346 261 373 272V295L326 314Z" fill="#b68b3e"/><path d="M300 279L346 261 373 272 326 291Z" fill="#d5ad5c"/><path d="M326 291L373 272V295L326 314Z" fill="#927035"/></g>' +
      '<g stroke="#bd8b79" stroke-width=".8"><path d="M539 305V284L582 267 609 278V299L566 316Z" fill="#9d5e4c"/><path d="M539 284L582 267 609 278 566 295Z" fill="#b77860"/><path d="M566 295L609 278V299L566 316Z" fill="#774c41"/></g>' +
      '<path d="M450 321V515Q450 561 496 542L724 450" fill="none" stroke="#20282c" stroke-width="14"/>' +
      '<path d="M450 321V515Q450 561 496 542L724 450" fill="none" stroke="#b9bfc0" stroke-width="8"/>' +
      '<path class="hs-flow" d="M450 321V515Q450 561 496 542L724 450" fill="none" stroke="#fff1c7" stroke-width="3" stroke-linecap="round" stroke-dasharray="10 42"/>' +
      '<g transform="translate(724 450)"><circle class="hs-beacon" r="16" fill="none" stroke="#eac784"/><circle r="5" fill="#ffe4a4"/></g>' +
      '<g class="hs-data-lines" fill="none" stroke="#0b6f70" stroke-width="1.3"><path class="hs-data" d="M195 360L314 407 390 377" stroke-dasharray="3 12"/><path class="hs-data" d="M511 366L622 410 760 354" stroke-dasharray="3 12"/></g>' +
      '<g class="hs-nodes" fill="#0d8580"><circle cx="195" cy="360" r="3"/><circle cx="760" cy="354" r="3"/><circle cx="450" cy="84" r="4"/></g>' +
      '<g class="hs-leaders" fill="none" stroke="#728a90" stroke-width=".8"><path d="M470 126H590L615 106H740"/><path d="M729 450H788L808 430H862"/><path d="M190 494H123L103 514H48"/></g>' +
      '<rect class="hs-label-backplate" x="668" y="407" width="176" height="20" rx="3" fill="#f4f8fb" fill-opacity=".9"/>' +
      '<g class="hs-labels" font-family="monospace" font-size="10" letter-spacing="2" fill="#243f4b"><text x="620" y="96">SURFACE / 地表</text><text x="676" y="420">TRAJECTORY / 井轨迹</text><text x="50" y="538">FORMATION / 地层</text></g>' +
      '<g class="hs-footer" font-family="monospace" font-size="9" letter-spacing="2" fill="#526b79"><text x="450" y="684" text-anchor="middle">GEOLOGY → DATA → INTELLIGENCE</text></g></svg>';
  }

  function bind(root) {
    var hero = root.querySelector('.home-hero');
    var button = hero.querySelector('.home-motion');
    var art = hero.querySelector('.home-art');
    var host = hero.querySelector('.home-rig-host');
    var viewport = hero.querySelector('.home-scene-stage');
    var controls = hero.querySelectorAll('[data-home-action]');
    var zoomLabel = hero.querySelector('.home-zoom');
    var help = hero.querySelector('.home-view-help');
    var poster = hero.querySelector('.home-scene');
    var media = global.matchMedia('(prefers-reduced-motion: reduce)');
    var paused = false, visible = true, disposed = false, engine = null;
    var interactive = false, zoom = 1, pointer = null, cleanups = [];
    function listen(target, type, handler, options) {
      if (!target) return;
      target.addEventListener(type, handler, options);
      cleanups.push(function () { target.removeEventListener(type, handler, options); });
    }
    function syncControls() {
      if (viewport) viewport.classList.toggle('is-interacting', interactive);
      [].forEach.call(controls, function (control) {
        var action = control.getAttribute('data-home-action');
        control.disabled = !engine || (action === 'in' && zoom >= 2.2) || (action === 'out' && zoom <= .7);
        if (action === 'interact') {
          control.setAttribute('aria-pressed', String(interactive));
          control.textContent = interactive ? '退出交互' : '进入交互';
        }
      });
      if (zoomLabel) zoomLabel.textContent = Math.round(zoom * 100) + '%';
      if (help) help.textContent = !engine ? (art && art.getAttribute('data-renderer') === 'fallback' ? '当前为静态井场示意' : '三维场景准备中…') : interactive
        ? '交互中：拖拽旋转 · 滚轮缩放 · Esc 退出'
        : '拖拽旋转 · 进入交互后滚轮缩放 · 方向键调整视角';
    }
    function endPointer(event) {
      if (!pointer || (event && event.pointerId !== undefined && event.pointerId !== pointer.id)) return;
      var id = pointer.id; pointer = null;
      if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
      viewport.classList.toggle('is-dragging', false);
    }
    function setInteractive(value) {
      if (value && !interactive && engine) engine.rotate(0, 0);
      interactive = value; if (!value) endPointer(); syncControls();
    }
    function scale(factor) { zoom = engine.zoomBy(factor); setInteractive(true); }
    function sync() {
      var stopped = paused || media.matches;
      var inactive = stopped || document.hidden || !visible;
      hero.classList.toggle('is-still', inactive);
      button.setAttribute('aria-pressed', String(stopped));
        button.setAttribute('data-user-paused', String(paused));
      button.disabled = media.matches;
      button.querySelector('span').textContent = media.matches ? '静态展示' : paused ? '播放动效' : '暂停动效';
      button.setAttribute('aria-label', media.matches ? '首页静态展示' : paused ? '播放首页动态效果' : '暂停首页动态效果');
      if (global.I18N) global.I18N.apply(button);
      if (engine) engine.setRunning(!inactive);
      syncControls();
    }
    function theme() { if (engine) engine.setTheme(document.documentElement.dataset.theme === 'dark'); }
    function fallback() {
      if (disposed) return;
      if (engine) { engine.destroy(); engine = null; }
      if (!poster && host) {
        host.insertAdjacentHTML('beforebegin', scene());
        poster = hero.querySelector('.home-scene');
      }
      art.setAttribute('data-renderer', 'fallback');
      if (poster) poster.removeAttribute('aria-hidden');
      setInteractive(false);
      if (help) help.textContent = '当前为静态井场示意';
    }
    function toggle() { paused = !paused; sync(); }
    listen(button, 'click', toggle);
    listen(document, 'visibilitychange', sync);
    listen(media, 'change', sync);
    listen(global, 'tiangong-theme-change', theme);
    listen(host, 'home-rig-error', fallback);
    listen(art, 'click', function (event) {
      var control = event.target.closest('[data-home-action]');
      if (!control || control.disabled || !engine) return;
      var action = control.getAttribute('data-home-action');
      if (action === 'interact') setInteractive(!interactive);
      else if (action === 'in' || action === 'out') scale(action === 'in' ? 1.15 : 1 / 1.15);
      else if (action === 'reset') { engine.resetView(); zoom = 1; syncControls(); }
    });
    listen(viewport, 'pointerdown', function (event) {
      if (!engine || event.button !== 0 || pointer || (event.pointerType === 'touch' && !interactive)) return;
      setInteractive(true); viewport.focus({ preventScroll: true });
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      viewport.setPointerCapture(event.pointerId); viewport.classList.toggle('is-dragging', true);
    });
    listen(viewport, 'pointermove', function (event) {
      if (!pointer || pointer.id !== event.pointerId || !engine) return;
      engine.rotate((event.clientX - pointer.x) * -.006, (event.clientY - pointer.y) * .004);
      pointer.x = event.clientX; pointer.y = event.clientY;
    });
    listen(viewport, 'pointerup', endPointer);
    listen(viewport, 'pointercancel', endPointer);
    listen(viewport, 'lostpointercapture', endPointer);
    listen(viewport, 'wheel', function (event) {
      if (!interactive || !engine || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      var delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1);
      scale(Math.exp(-Math.max(-200, Math.min(200, delta)) * .002));
    }, { passive: false });
    listen(viewport, 'keydown', function (event) {
      if (!engine || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'Escape') { if (interactive) { event.preventDefault(); setInteractive(false); } return; }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].indexOf(event.key) < 0) return;
      event.preventDefault(); setInteractive(true);
      if (event.key === 'Home') { engine.resetView(); zoom = 1; syncControls(); }
      else if (event.key === '+' || event.key === '=' || event.key === '-') scale(event.key === '-' ? 1 / 1.15 : 1.15);
      else engine.rotate(event.key === 'ArrowLeft' ? -.08 : event.key === 'ArrowRight' ? .08 : 0,
        event.key === 'ArrowUp' ? .05 : event.key === 'ArrowDown' ? -.05 : 0);
    });
    var observer = global.IntersectionObserver ? new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting; sync();
    }, { threshold: 0 }) : null;
    if (observer) observer.observe(hero);
    sync();
    if (host && art) {
      art.setAttribute('data-renderer', 'loading');
      if (!rigPromise) rigPromise = import(rigURL);
      rigPromise.then(function (module) {
        if (disposed) return;
        engine = module.createRigScene(host);
        theme();
        art.setAttribute('data-renderer', 'ready');
        if (poster) poster.setAttribute('aria-hidden', 'true');
        sync();
      }).catch(function () { fallback(); });
    }
    return function () {
      if (disposed) return;
      disposed = true;
      if (observer) observer.disconnect();
      endPointer(); cleanups.forEach(function (clean) { clean(); });
      if (engine) { engine.destroy(); engine = null; }
    };
  }
  global.HomeHero = { scene: scene, bind: bind };
})(window);
