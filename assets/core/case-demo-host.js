/* =========================================================
   案例示范宿主 Case Demo Host
   ---------------------------------------------------------
   把「案例包里的示范文件」渲染成可交互的页面。两种模式：

   page    —— 包里有 index.html
              整页放进 sandbox iframe，样式/脚本完全隔离，
              写多复杂都不会污染主站。
   module  —— 包里有 demo.js 但没有 html
              挂进 Shadow DOM 并执行 demo.js，导出的 mount(root, api)
              往里画东西；上传的 CSS 也注入 Shadow DOM，不外泄。

   所有文件都转成 data URL 内联，因此 file:// 直接打开也能跑，
   不依赖本地服务器、不发起任何网络请求。

   对外接口：
     CaseDemoHost.create(container, pkg, ctx) -> { mode, destroy() }
     CaseDemoHost.resolveMode(pkg) -> 'page' | 'module' | 'none'
     pkg = { files:[{name,size,mime,enc,data}], demo:{mode,html,js,height} }
   ========================================================= */

(function (global) {
  'use strict';

  var MIME = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon', bmp: 'image/bmp',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
    mp4: 'video/mp4', webm: 'video/webm',
    woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
    json: 'application/json', csv: 'text/csv', txt: 'text/plain', pdf: 'application/pdf'
  };

  var TEXT_EXT = ['json', 'js', 'mjs', 'css', 'html', 'htm', 'svg', 'txt', 'csv', 'tsv', 'md', 'xml', 'yaml', 'yml', 'geojson'];

  /* Shadow DOM 里要继承的设计令牌 */
  var TOKENS = ['--paper', '--paper-2', '--paper-3', '--card', '--card-soft',
    '--line', '--line-2', '--line-3', '--ink', '--ink-2', '--ink-3', '--ink-4', '--ink-inv',
    '--jade', '--jade-d', '--jade-l', '--clay', '--clay-d', '--clay-l',
    '--ok', '--ok-bg', '--warn', '--warn-bg', '--bad', '--bad-bg',
    '--sans', '--mono', '--r-s', '--r-m', '--r-l', '--sh-1', '--sh-2'];

  var BASE_CSS =
    '.cd-box{display:block;font-family:var(--sans,system-ui,sans-serif);' +
    'font-size:13px;line-height:1.72;color:var(--ink,#242b2e);padding:2px 0 6px}' +
    '.cd-err{border:1px solid var(--bad,#b05a51);background:var(--bad-bg,#f9e9e5);' +
    'color:var(--bad,#b05a51);border-radius:8px;padding:11px 13px;font-size:12px;line-height:1.7}' +
    '.cd-err b{display:block;margin-bottom:4px;font-size:12.5px}' +
    '.cd-err code{font-family:var(--mono,monospace);background:rgba(0,0,0,.05);padding:1px 4px;border-radius:3px}';

  /* 沙箱与独立预览共享暗色；只映射模板界面色，保留图片、Canvas 和岩性材质色。 */
  var DARK_CSS =
    ':root,:host{color-scheme:dark;--paper:#081a27!important;--paper-2:#102737!important;' +
    '--paper-3:#183446!important;--card:#102737!important;--card-soft:#142e3f!important;' +
    '--ink:#e6f0f7!important;--ink-2:#c1d3df!important;--ink-3:#9fb5c5!important;--ink-4:#819bab!important;' +
    '--line:#294556!important;--line-2:#203b4d!important;--line-3:#3d5a6b!important;' +
    '--jade:#87e2d2!important;--jade-d:#acefe3!important;--jade-l:#173b39!important;' +
    '--clay:#efbe77!important;--clay-l:#3e302b!important;--blue:#9bbce8!important;--blue-l:#253749!important;' +
    '--bad:#f09990!important;--bad-l:#422e33!important;--bad-bg:#422e33!important;' +
    '--ok:#82cbb6!important;--ok-bg:#173b39!important;--warn:#e5c474!important;--warn-bg:#3b3527!important}' +
    'html,body,.cd-box{background:var(--paper)!important;color:var(--ink)!important}' +
    'body::after{color:#819bab!important}' +
    'a{color:var(--jade)}::selection{background:#315b76;color:var(--ink)}' +
    'svg.chart,.readouts .ro,.tag,.card,.case-row,.report,fieldset,dialog,table{background:var(--card)!important;border-color:var(--line)!important}' +
    '.case-row .mm{color:#081a27!important}' +
    '.readouts .ro:hover{background:var(--paper-3)!important}' +
    'th,td{border-color:var(--line)!important}th{background:var(--paper-3)!important}' +
    'input:not([type=range]):not([type=checkbox]):not([type=radio]),select,textarea{' +
    'background:var(--card)!important;color:var(--ink)!important;border-color:var(--line-3)!important;accent-color:var(--jade)}' +
    'input::placeholder,textarea::placeholder{color:var(--ink-3)}option{background:var(--card);color:var(--ink)}' +
    '.btn,.btn.primary,.btn:not(.ghost):not(.small):not(.clay){background:var(--jade)!important;color:#092033!important;border-color:var(--jade)!important}' +
    '.btn.clay{background:var(--clay)!important;border-color:var(--clay)!important;color:#281b13!important}' +
    '.btn.ghost{background:transparent!important;color:var(--jade)!important;border-color:var(--line-3)!important}' +
    '.btn.ghost:hover{background:var(--jade-l)!important}' +
    '.btn.live-on,.btn.live-on:not(.ghost):not(.small):not(.clay){background:linear-gradient(180deg,#f4ca90,#efad79)!important;border-color:var(--clay)!important;color:#281b13!important}' +
    '.btn.live-on::before{background:currentColor!important}' +
    ':focus-visible{outline:2px solid var(--jade);outline-offset:3px}' +
    '.ctl input[type=range]::-webkit-slider-runnable-track{background:linear-gradient(90deg,var(--jade) 0%,var(--jade) var(--fill,50%),var(--line) var(--fill,50%))}' +
    '.ctl input[type=range]::-webkit-slider-thumb{background:var(--paper);border-color:var(--jade)}' +
    '.ctl input[type=range]::-moz-range-track{background:var(--line)}' +
    '.ctl input[type=range]::-moz-range-thumb{background:var(--paper);border-color:var(--jade)}' +
    '::-webkit-scrollbar-thumb{background:var(--line-3);border-color:var(--paper)}' +
    '::-webkit-scrollbar-thumb:hover{background:#57778c}' +
    'svg{fill:var(--ink-3)}';

  /* SVG 由案例脚本实时重绘，属性选择器会自动覆盖每次新增的节点。 */
  [
    ['#202b38', '#e6f0f7'], ['#52627a', '#c1d3df'], ['#64748b', '#9fb5c5'], ['#9ba3a9', '#9fb5c5'],
    ['#dfe6f0', '#294556'], ['#e9eef6', '#203b4d'], ['#c9d4e4', '#3d5a6b'],
    ['#2875c7', '#78baff'], ['#164b88', '#9ccaff'], ['#41699b', '#9bbce8'],
    ['#d47a3a', '#efad79'], ['#b05a51', '#f09990'], ['#8f4a42', '#dd928c'],
    ['#e7f0fb', '#17364b'], ['#e9eef5', '#253749'], ['#f6ebe1', '#3e302b'], ['#f7e9e6', '#422e33'],
    ['#f4f8fd', '#081a27'], ['#eef2f8', '#142e3f'], ['#f1f4f9', '#142e3f'],
    ['#fbfcfe', '#102737'], ['#fafaf7', '#102737'], ['#eef3fa', '#142e3f'],
    ['#2f7d6b', '#87e2d2'], ['#b26a39', '#efbe77'], ['#e6f1ec', '#173b39']
  ].forEach(function (pair) {
    ['fill', 'stroke'].forEach(function (attr) {
      DARK_CSS += 'svg [' + attr + '="' + pair[0] + '" i]{' + attr + ':' + pair[1] + '!important}';
    });
  });
  DARK_CSS += 'svg [fill="#fff" i]:not(text):not(g),svg [fill="#ffffff" i]:not(text):not(g){fill:#102737!important}';
  DARK_CSS += 'svg [stroke="#efece1" i]{stroke:#294556!important}';
  /* 这些实心徽标/堆叠条在提亮后使用深字；其余白字及分组继承保持原义。 */
  [['#2875c7', '#78baff'], ['#41699b', '#9bbce8'], ['#d47a3a', '#efad79'], ['#b05a51', '#f09990'], ['#52627a', '#c1d3df']].forEach(function (pair) {
    DARK_CSS += '.case-row .mm[style*="background:' + pair[0] + '" i]{background:' + pair[1] + '!important}';
    ['#fff', '#ffffff', 'white'].forEach(function (white) {
      DARK_CSS += 'svg rect[fill="' + pair[0] + '" i]+text[fill="' + white + '" i]{fill:#081a27!important}';
    });
  });

  var seq = 0;

  /* ---------------- 小工具 ---------------- */
  function currentTheme() {
    var theme = global.Theme && global.Theme.get ? global.Theme.get()
      : global.document && global.document.documentElement.dataset && global.document.documentElement.dataset.theme;
    return theme === 'dark' ? 'dark' : 'light';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function extOf(name) {
    var m = /\.([a-z0-9]+)$/i.exec(String(name).split('?')[0].split('#')[0]);
    return m ? m[1].toLowerCase() : '';
  }
  function baseOf(name) { return String(name).split('/').pop(); }
  function isCss(n) { return extOf(n) === 'css'; }
  function isJs(n) { var e = extOf(n); return e === 'js' || e === 'mjs'; }
  function isHtml(n) { var e = extOf(n); return e === 'html' || e === 'htm'; }
  function isText(n) { return TEXT_EXT.indexOf(extOf(n)) >= 0; }
  function mimeOf(n) { return MIME[extOf(n)] || (isText(n) ? 'text/plain' : 'application/octet-stream'); }

  function findFile(files, ref) {
    if (!ref || !files) return null;
    var r = String(ref).replace(/^\.\//, '').split('?')[0].split('#')[0];
    var i, hit = null;
    for (i = 0; i < files.length; i++) if (files[i].name === r) return files[i];
    var bn = baseOf(r).toLowerCase();
    for (i = 0; i < files.length; i++) if (baseOf(files[i].name).toLowerCase() === bn) return files[i];
    return hit;
  }
  function firstExt(files, test) {
    for (var i = 0; i < (files || []).length; i++) if (test(files[i].name)) return files[i];
    return null;
  }

  /* 文件 → 可直接放进 src/href/url() 的地址 */
  function urlOf(f) {
    if (!f) return '';
    if (f.enc === 'dataurl') return f.data;
    return 'data:' + (f.mime || mimeOf(f.name)) + ';charset=utf-8,' + encodeURIComponent(f.data);
  }

  /* ---------------- 模式判定 ---------------- */
  function resolveMode(pkg) {
    var d = (pkg && pkg.demo) || {};
    var files = (pkg && pkg.files) || [];
    var mode = d.mode || 'auto';
    if (mode === 'builtin' || mode === 'page' || mode === 'module') return mode;
    if (findFile(files, d.html) || firstExt(files, isHtml)) return 'page';
    if (findFile(files, d.js) || firstExt(files, isJs)) return 'module';
    return 'none';
  }

  /* ---------------- page 模式：拼一份自包含 HTML ---------------- */
  function cssText(css, map, files) {
    return String(css)
      .replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, function (all, q, ref) {
        if (/^(data:|https?:|\/\/)/i.test(ref)) return all;
        var f = findFile(files, ref);
        return f ? 'url("' + map[f.name] + '")' : all;
      })
      .replace(/<\/style/gi, '<\\/style');
  }
  function jsText(js) {
    return String(js).replace(/<\/script/gi, '<\\/script');
  }

  /* 此函数随 HTML 内联，沙箱中不访问父页 DOM。 */
  function initPageTheme(theme, token) {
    function apply(value) {
      theme = value === 'dark' ? 'dark' : 'light';
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
      var style = document.querySelector('style[data-case-theme="dark"]');
      if (style) style.media = theme === 'dark' ? 'all' : 'not all';
    }
    apply(theme);
    document.addEventListener('DOMContentLoaded', function () { apply(theme); });
    window.addEventListener('message', function (event) {
      var data = event.data;
      if (event.source === parent && data && data.__caseTheme === token && (data.theme === 'light' || data.theme === 'dark')) apply(data.theme);
    });
  }

  function buildPageDoc(pkg, token) {
    var files = pkg.files || [];
    var d = pkg.demo || {};
    var htmlFile = findFile(files, d.html) || firstExt(files, isHtml);
    var html = htmlFile ? String(htmlFile.data)
      : '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><p>包里没有 HTML 文件。</p></body></html>';

    /* 资源表只收"素材"（图片、JSON 等），html/css/js 本身不进去，避免体积翻倍 */
    var map = {};
    files.forEach(function (f) {
      if (isHtml(f.name) || isJs(f.name) || isCss(f.name)) return;
      map[f.name] = urlOf(f);
      if (!map[baseOf(f.name)]) map[baseOf(f.name)] = urlOf(f);
    });

    var used = {};

    /* 1. <link rel=stylesheet> → <style> */
    html = html.replace(/<link\b[^>]*>/gi, function (tag) {
      if (!/stylesheet/i.test(tag)) return tag;
      var m = /href\s*=\s*["']([^"']+)["']/i.exec(tag);
      var f = m && findFile(files, m[1]);
      if (!f || !isCss(f.name)) return tag;
      used[f.name] = 1;
      return '<style data-src="' + esc(m[1]) + '">' + cssText(f.data, map, files) + '</style>';
    });

    /* 2. <script src> → 内联 */
    html = html.replace(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script\s*>/gi, function (tag, src) {
      var f = findFile(files, src);
      if (!f || !isJs(f.name)) return tag;
      used[f.name] = 1;
      return '<script data-src="' + esc(src) + '">' + jsText(f.data) + '</script' + '>';
    });

    /* 3. 其它资源引用 → data URL */
    html = html.replace(/\b(src|href|poster)\s*=\s*["']([^"']+)["']/gi, function (all, attr, ref) {
      if (/^(data:|https?:|mailto:|tel:|#|\/\/)/i.test(ref)) return all;
      var f = findFile(files, ref);
      if (!f || isHtml(f.name) || isJs(f.name) || isCss(f.name)) return all;
      return attr + '="' + map[f.name] + '"';
    });

    /* 4. 未被引用的 css / js 追加到末尾 */
    var tail = '';
    files.forEach(function (f) {
      if (used[f.name] || !isCss(f.name)) return;
      used[f.name] = 1;
      tail += '<style data-src="' + esc(f.name) + '">' + cssText(f.data, map, files) + '</style>';
    });
    files.forEach(function (f) {
      if (used[f.name] || !isJs(f.name)) return;
      used[f.name] = 1;
      tail += '<script data-src="' + esc(f.name) + '">' + jsText(f.data) + '</script' + '>';
    });
    tail += '<style data-case-theme="dark" media="' + (currentTheme() === 'dark' ? 'all' : 'not all') + '">' + DARK_CSS + '</style>';

    /* 5. 注入资源表与高度上报 */
    var assetsJson = JSON.stringify(map).replace(/</g, '\\u003c');
    var head =
      '<script>(' + initPageTheme.toString() + ')(' + JSON.stringify(currentTheme()) + ',' + JSON.stringify(token || '') + ');window.__ASSETS__=' + assetsJson + ';' +
      'window.caseAsset=function(n){return window.__ASSETS__[n]||""};' +
      '(function(){var last=-1;function send(){' +
      'var content=document.querySelector("main[data-visual-case]");' +
      'var h=content?Math.ceil(content.getBoundingClientRect().bottom+window.scrollY+(parseFloat(getComputedStyle(document.body).paddingBottom)||0)):' +
      'Math.max(document.body?document.body.scrollHeight:0,document.documentElement.scrollHeight);' +
      'h=Math.min(h,4200);if(Math.abs(h-last)>2){last=h;' +
      'try{parent.postMessage({__caseDemo:"' + token + '",h:h},"*")}catch(e){}}}' +
      'document.addEventListener("DOMContentLoaded",send);window.addEventListener("load",send);+(function(){function setR(t){var p=(+t.value-+t.min)/((+t.max-+t.min)||1)*100;t.style.setProperty("--fill",p+"%");}function initAll(){var r=document.querySelectorAll("input[type=range]");for(var i=0;i<r.length;i++)setR(r[i]);}document.addEventListener("input",function(e){if(e.target&&e.target.type==="range")setR(e.target);});if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",initAll);}else{initAll();}})();' +
      'try{if(window.ResizeObserver){new ResizeObserver(send).observe(document.documentElement)}}catch(e){}' +
      'var n=0,t=setInterval(function(){send();if(++n>40)clearInterval(t)},400);' +
      '})();</script' + '>';

    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, function (m) { return m + head; });
    } else if (/<html[^>]*>/i.test(html)) {
      html = html.replace(/<html[^>]*>/i, function (m) { return m + '<head><meta charset="utf-8">' + head + '</head>'; });
    } else {
      html = '<!DOCTYPE html><html><head><meta charset="utf-8">' + head + '</head><body>' + html + '</body></html>';
    }

    if (tail) {
      if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, tail + '</body>');
      else html += tail;
    }
    return html;
  }

  function createPage(host, pkg, ctx) {
    var token = 'cd' + (++seq) + Date.now().toString(36);
    var minH = Math.max(220, Number(pkg.demo && pkg.demo.height) || 520);

    var frame = document.createElement('iframe');
    frame.className = 'cd-iframe';
    frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-modals allow-popups allow-downloads');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.setAttribute('title', (pkg.meta && pkg.meta.title ? pkg.meta.title : '案例示范') + '（沙箱）');
    frame.style.height = minH + 'px';
    frame.srcdoc = buildPageDoc(pkg, token);
    host.appendChild(frame);

    function onMsg(e) {
      if (e.source !== frame.contentWindow) return;
      var d = e.data;
      if (d && d.__drillingTelemetry === true && ctx && ctx.scene && ctx.scene.stageId === 'drilling') {
        var values = {}, input = d.values || {};
        var bounds = { rpm: [0, 400], flow: [0, 150], risk: [0, 1], wear: [0, 1], pressure: [0, 250], progress: [0, 1], target: [0, 1000], tripVelocity: [-1.2, 1.2] };
        Object.keys(bounds).forEach(function (key) {
          var value = input[key], range = bounds[key];
          if (typeof value === 'number' && Number.isFinite(value)) values[key] = Math.max(range[0], Math.min(range[1], value));
        });
        if (Array.isArray(input.trajectory) && input.trajectory.length >= 2 && input.trajectory.length <= 160 && input.trajectory.every(function (p) {
          return p && typeof p.x === 'number' && typeof p.z === 'number' && Number.isFinite(p.x) && Number.isFinite(p.z) && Math.abs(p.x) <= 2000 && p.z >= 0 && p.z <= 10000;
        })) values.trajectory = input.trajectory.map(function (p) { return { x: p.x, z: p.z }; });
        if (Object.keys(values).length) global.dispatchEvent(new CustomEvent('tiangong-drilling-telemetry', {
          detail: { sceneId: ctx.scene.id, values: values }
        }));
        return;
      }
      if (!d || d.__caseDemo !== token) return;
      var h = Math.min(6200, Math.max(minH, Number(d.h) + 2));
      frame.style.height = h + 'px';
    }
    global.addEventListener('message', onMsg);
    function syncTheme(event) {
      var theme = event && event.detail ? event.detail.theme : currentTheme();
      if (frame.contentWindow) frame.contentWindow.postMessage({ __caseTheme: token, theme: theme === 'dark' ? 'dark' : 'light' }, '*');
    }
    global.addEventListener('tiangong-theme-change', syncTheme);
    frame.addEventListener('load', syncTheme);

    return {
      mode: 'page',
      destroy: function () {
        global.removeEventListener('message', onMsg);
        global.removeEventListener('tiangong-theme-change', syncTheme);
        frame.removeEventListener('load', syncTheme);
        frame.remove();
      }
    };
  }

  /* ---------------- module 模式：Shadow DOM + demo.js ---------------- */
  function tokenCss() {
    var cs = global.getComputedStyle(document.documentElement);
    var out = ':host{';
    TOKENS.forEach(function (t) {
      var v = cs.getPropertyValue(t);
      if (v) out += t + ':' + v.trim() + ';';
    });
    return out + '}';
  }

  function errBox(box, title, detail) {
    var d = document.createElement('div');
    d.className = 'cd-err';
    d.innerHTML = '<b>' + esc(title) + '</b>' + esc(detail || '');
    box.appendChild(d);
  }

  function createModule(host, pkg, ctx) {
    var files = pkg.files || [];
    var d = pkg.demo || {};
    var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

    var style = document.createElement('style');
    var moduleCss = files.filter(function (f) { return isCss(f.name); }).map(function (f) { return String(f.data); }).join('\n');
    function syncTheme() {
      style.textContent = tokenCss() + '\n' + BASE_CSS + '\n' + moduleCss + (currentTheme() === 'dark' ? '\n' + DARK_CSS : '');
    }
    syncTheme();
    global.addEventListener('tiangong-theme-change', syncTheme);
    shadow.appendChild(style);

    var box = document.createElement('div');
    box.className = 'cd-box';
    shadow.appendChild(box);

    var cleanups = [];
    var api = {
      asset: function (name) { return urlOf(findFile(files, name)); },
      readText: function (name) {
        var f = findFile(files, name);
        return Promise.resolve(f && f.enc === 'text' ? f.data : '');
      },
      list: function () { return files.map(function (f) { return f.name; }); },
      scene: (ctx && ctx.scene) || null,
      kase: (ctx && ctx.kase) || null,
      onDestroy: function (fn) { if (typeof fn === 'function') cleanups.push(fn); },
      height: function (px) { if (px) host.style.minHeight = Number(px) + 'px'; }
    };

    var jsFile = findFile(files, d.js) || firstExt(files, isJs);
    var live = null;

    if (!jsFile) {
      errBox(box, '没有找到 demo.js', '把示范脚本命名为 demo.js 放进包里，或改用 index.html 整页模式。');
    } else {
      var code = String(jsFile.data);
      var mod = { exports: {} };
      var fn = null;
      try {
        fn = new Function('module', 'exports', 'api', 'root', 'console', code + '\n;return module.exports;');
      } catch (e) {
        errBox(box, 'demo.js 有语法错误（第 ' + (e.lineNumber || '?') + ' 行附近）', e.message);
      }
      if (fn) {
        try { delete global.__CASE_MOUNT__; } catch (e) { global.__CASE_MOUNT__ = null; }
        var out = null;
        try {
          out = fn(mod, mod.exports, api, box, global.console) || mod.exports;
        } catch (e) {
          errBox(box, 'demo.js 在加载阶段抛出异常', e.message);
        }
        if (out) {
          var cand = (typeof out.mount === 'function') ? out
            : (out.default && typeof out.default.mount === 'function') ? out.default
              : (typeof global.__CASE_MOUNT__ === 'function') ? { mount: global.__CASE_MOUNT__ }
                : null;
          if (!cand) {
            errBox(box, 'demo.js 没有导出 mount',
              '支持三种写法：module.exports={mount(root,api){}}、exports.mount=function(root,api){}、window.__CASE_MOUNT__=function(root,api){}。');
          } else {
            try {
              live = cand.mount(box, api) || cand;
            } catch (e) {
              errBox(box, 'mount() 执行失败', e.message);
            }
          }
        }
      }
    }

    return {
      mode: 'module',
      destroy: function () {
        global.removeEventListener('tiangong-theme-change', syncTheme);
        try { if (live && typeof live.unmount === 'function') live.unmount(); } catch (e) { }
        cleanups.forEach(function (fn) { try { fn(); } catch (e) { } });
        try { if (shadow.host === host) host.innerHTML = ''; } catch (e) { }
      }
    };
  }

  /* ---------------- 入口 ---------------- */
  function create(container, pkg, ctx) {
    if (!container) return { mode: 'none', destroy: function () { } };
    container.innerHTML = '';
    var mode = resolveMode(pkg);
    if (mode === 'page') return createPage(container, pkg, ctx);
    if (mode === 'module') return createModule(container, pkg, ctx);
    return { mode: 'none', destroy: function () { } };
  }

  global.CaseDemoHost = {
    create: create,
    resolveMode: resolveMode,
    buildPageDoc: buildPageDoc,
    findFile: findFile,
    isText: isText,
    mimeOf: mimeOf
  };

})(window);
