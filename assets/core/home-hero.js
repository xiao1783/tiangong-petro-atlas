/* 总览主视觉：地层与井轨迹为概念示意，不代表实时工程数据。 */
(function (global) {
  'use strict';
  var script = document.currentScript;
  var rigURL = new URL('./home-atlas-scene.js?v=20261030-clear-view', script ? script.src : new URL('assets/core/home-hero.js', document.baseURI).href).href;
  var rigPromise = null;

  function scene() {
    var layers = '', colors = ['#887458','#a08b67','#62675e','#9a865f','#6b725f','#4c5855'];
    colors.forEach(function (c,i) { layers += '<path d="M70 '+(335+i*22)+'L640 '+(390+i*22)+' 1260 '+(320+i*22)+'V'+(344+i*22)+'L640 '+(414+i*22)+' 70 '+(359+i*22)+'Z" fill="'+c+'"/>'; });
    return '<svg class="home-scene" viewBox="0 0 1320 600" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="hs-title hs-desc"><title id="hs-title">石油全流程静态概念沙盘</title><desc id="hs-desc">勘探采集、井场与注采、储运与炼化连接在同一地层剖面中。三维渲染不可用时展示此静态图，环节入口仍可使用。</desc><rect width="1320" height="600" fill="var(--ex-night,#f4f8fb)"/>'+layers+'<path d="M70 335L650 270 1260 320 640 390Z" fill="#69715b"/><g stroke="#bdc5bd" fill="none" stroke-width="4"><path d="M507 338L545 135h20l38 203M518 285h75L528 230h54l-44-50h34M528 230l65 55M552 137v204"/><path d="M800 335l30-65 30 65m-48-65h65m-4-10v80"/><path d="M1045 323V180h40v143m-32-120h24m-24 35h24m-24 35h24M1120 325V210h28v115"/></g><g fill="#9cafb6"><path d="M930 308v-50h65v50Zm0-50q32-25 65 0Z"/><path d="M1170 310v-45h62v45Zm0-45q31-22 62 0Z"/></g><path d="M110 315l80-90 60 44 50-55 93 99Z" fill="#9a896b"/><path d="M150 324h180" stroke="#91bdc7" stroke-dasharray="5 12" stroke-width="4"/><path d="M550 340v112q10 38 80 24h90" fill="none" stroke="#edc27d" stroke-width="7"/><path d="M860 333h100l30-30h185" fill="none" stroke="#d5b47b" stroke-width="5"/><g font-family="system-ui,Microsoft YaHei,sans-serif" font-size="19" fill="var(--ex-white,#173443)"><text x="165" y="170">勘探与评价</text><text x="695" y="210">开发与生产</text><text x="1030" y="130">储运与加工</text></g><text x="660" y="565" text-anchor="middle" fill="var(--ex-muted,#526b79)" font-size="14" font-family="system-ui">全流程概念示意 · 当前为静态展示</text></svg>';
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
    var interactive = false, zoom = 1, pointer = null, cleanups = [], touring = false;
    function showRegion(id) {
      if (['overview','exploration','production','midstream'].indexOf(id) < 0) return;
      art.setAttribute('data-region', id);
      [].forEach.call(hero.querySelectorAll('[data-atlas-region]'), function (node) {
        node.setAttribute('aria-pressed', String(node.getAttribute('data-atlas-region') === id));
      });
      if (global.I18N) global.I18N.apply(art);
    }
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
        if (action === 'tour') { control.setAttribute('aria-pressed', String(touring)); control.textContent = touring ? '停止导览' : '自动导览'; control.disabled = !engine || media.matches; }
      });
      if (zoomLabel) zoomLabel.textContent = Math.round(zoom * 100) + '%';
      if (help) help.textContent = !engine ? (art && art.getAttribute('data-renderer') === 'fallback' ? '当前为全流程静态示意' : '三维场景准备中…') : interactive
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
      if (help) help.textContent = '当前为全流程静态示意';
    }
    function toggle() { paused = !paused; sync(); }
    listen(button, 'click', toggle);
    listen(document, 'visibilitychange', sync);
    listen(media, 'change', sync);
    listen(global, 'tiangong-theme-change', theme);
    listen(host, 'home-rig-error', fallback);
    listen(host, 'atlas-region-change', function (event) { touring = !!event.detail.tour; zoom = 1; showRegion(event.detail.id); syncControls(); });
    listen(art, 'click', function (event) {
      var regionButton = event.target.closest('[data-atlas-region]');
      if (regionButton && engine && engine.focusRegion) { engine.focusRegion(regionButton.getAttribute('data-atlas-region')); return; }
      var control = event.target.closest('[data-home-action]');
      if (!control || control.disabled || !engine) return;
      var action = control.getAttribute('data-home-action');
      if (action === 'interact') setInteractive(!interactive);
      else if (action === 'in' || action === 'out') scale(action === 'in' ? 1.15 : 1 / 1.15);
      else if (action === 'reset') { engine.resetView(); zoom = 1; syncControls(); }
      else if (action === 'tour' && engine.setTour) { if (paused) paused = false; engine.setTour(!touring); sync(); }
    });
    listen(viewport, 'pointerdown', function (event) {
      if (!engine || event.button !== 0 || pointer || (event.target && event.target.closest && event.target.closest('button')) || (event.pointerType === 'touch' && !interactive)) return;
      setInteractive(true); viewport.focus({ preventScroll: true });
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
      viewport.setPointerCapture(event.pointerId); viewport.classList.toggle('is-dragging', true);
    });
    listen(viewport, 'pointermove', function (event) {
      if (!pointer || pointer.id !== event.pointerId || !engine) return;
      if (Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 5) pointer.moved = true;
      engine.rotate((event.clientX - pointer.x) * -.006, (event.clientY - pointer.y) * .004);
      pointer.x = event.clientX; pointer.y = event.clientY;
    });
    listen(viewport, 'pointerup', function (event) { if (pointer && !pointer.moved && engine && engine.pick) engine.pick(event.clientX, event.clientY); endPointer(event); });
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
