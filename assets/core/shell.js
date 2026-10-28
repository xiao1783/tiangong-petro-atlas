/* =========================================================
   应用外壳 Shell
   ---------------------------------------------------------
   职责：路由、页面骨架、导航、把案例挂到场景页上。
   不含任何具体案例的业务内容 —— 那些都在 assets/cases/*.js
   ========================================================= */

(function (global) {
  'use strict';

  var A = global.ATLAS;
  var M = A.methods;
  var K = global.K;
  var esc = K.esc, pad = K.pad, rich = K.rich;

  var view = document.getElementById('view');
  var mounted = null;          // 当前挂载中的示范，切页时调用其 unmount
  var mountedKey = '';
  var pageCleanups = [];
  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function scrollBehavior() { return motionQuery && motionQuery.matches ? 'auto' : 'smooth'; }

  /* =========================================================
     一、路由
     ========================================================= */
  function parseHash() {
    var h = location.hash.replace(/^#/, '') || '/';
    var qi = h.indexOf('?'), qs = '';
    if (qi >= 0) { qs = h.slice(qi + 1); h = h.slice(0, qi); }
    var q = {};
    qs.split('&').forEach(function (kv) {
      if (!kv) return;
      var p = kv.split('=');
      q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
    });
    return { parts: h.split('/').filter(Boolean), q: q };
  }

  function go(hash) { location.hash = hash; }

  /* file:// 协议下部分浏览器会拒绝 replaceState，失败时静默降级 */
  function setHashQuiet(hash) {
    try { history.replaceState(null, '', hash); }
    catch (e) { /* 忽略：地址栏不同步不影响功能 */ }
  }

  /* =========================================================
     二、公共片段
     ========================================================= */
  function header() {
    var r = parseHash();
    var cur = r.parts[0] || 'home';
    function on(k) { return cur === k ? ' on' : ''; }
    function aria(k) { return cur === k ? ' aria-current="page"' : ''; }
    return '<header class="hdr"><div class="hdr-in">' +
      '<a class="brand" href="#/" aria-label="油链天工 · 返回总览">' +
      '<span class="brand-mark"><img src="assets/logo.png" alt="油链天工"></span>' +
      '<span class="brand-txt"><b>油链天工</b><span>TIANGONG · PETRO × AI ATLAS</span></span></a>' +
      '<nav class="nav" aria-label="主导航">' +
      '<a class="nav-keep' + on('home') + '" href="#/"' + aria('home') + '>总览</a>' +
      '<a class="nav-keep' + on('chain') + '" href="#/chain"' + aria('chain') + '>作业链</a>' +
      '<a class="nav-keep' + on('cases') + '" href="#/cases"' + aria('cases') + '>案例库</a>' +
      '<details class="nav-more' + (cur === 'guide' || cur === 'admin' ? ' on' : '') + '">' +
      '<summary>更多<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></summary>' +
      '<div class="nav-more-menu"><a class="nav-keep' + on('guide') + '" href="#/guide"' + aria('guide') + '>接入指南</a>' +
      '<a class="nav-keep' + on('admin') + '" href="#/admin"' + aria('admin') + '>' + (Admin.loggedIn() ? '管理后台' : '管理') + '</a></div></details>' +
      '</nav><div class="nav-actions" role="group" aria-label="快捷操作">' +
      '<button class="nav-search" data-search aria-label="全局检索" title="全局检索（场景 / 案例 / 环节 / 技术）">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span>检索</span></button>' +
      '<button class="nav-lang" data-lang aria-label="切换中英" title="中文 / English">' + (window.I18N ? I18N.label() : 'EN') + '</button>' +
      '<button class="nav-theme" data-theme-toggle type="button" aria-label="切换到暗色" title="切换到暗色" aria-pressed="false">' +
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path class="theme-moon" d="M20.5 14.4A8.5 8.5 0 0 1 9.6 3.5a8.5 8.5 0 1 0 10.9 10.9Z"/>' +
      '<g class="theme-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g></svg></button>' +
      '<button class="nav-add" data-import aria-label="添加案例" title="添加案例"><span aria-hidden="true">＋</span><span class="nav-add-label">添加案例</span></button>' +
      '</div></div></header>';
  }

  function footer() {
    var s = Cases.stats();
    return '<footer class="ftr"><div class="wrap"><div class="ftr-in">' +
      '<div class="ftr-col" style="max-width:32ch">' +
      '<h5>油链天工</h5><p>' + esc(A.meta.title) + '</p>' +
      '<p style="margin-top:8px;color:var(--ink-4)">' + esc(A.meta.version) + ' · 更新于 ' + esc(A.meta.updated) + ' · 纯静态可离线运行</p></div>' +
      '<div class="ftr-col"><h5>探索</h5>' +
      '<a href="#/">总览</a><a href="#/chain">作业链</a><a href="#/cases">案例库</a></div>' +
      '<div class="ftr-col"><h5>按方法</h5>' +
      Object.keys(M).slice(0, 4).map(function (k) {
        return '<a href="#/method/' + k + '">' + esc(M[k].name) + '</a>';
      }).join('') + '</div>' +
      '<div class="ftr-col"><h5>接入</h5>' +
      '<a href="#/guide">接入指南</a><a href="#/admin">管理入口</a>' +
      '<a href="mailto:' + esc(A.meta.email) + '?subject=' + encodeURIComponent('油链天工网站贡献与纠错') + '">贡献 / 纠错<br><span class="small">' + esc(A.meta.email) + '</span></a></div>' +
      '</div>' +
      '<div class="ftr-bot"><span>场景数据：' + A.allScenes.length + ' 个 · 环节：' + A.stages.length + ' 个 · 案例：' + s.registered + ' 个</span>' +
      '<span>纯静态 · 无后端 · 可离线运行</span></div>' +
      '</div></footer>';
  }


  function crumb(items) {
    return '<nav class="crumb">' + items.map(function (it, i) {
      var last = i === items.length - 1;
      return (i ? '<span class="sep">/</span>' : '') +
        (last ? '<span class="cur">' + esc(it[1]) + '</span>' : '<a href="' + it[0] + '">' + esc(it[1]) + '</a>');
    }).join('') + '</nav>';
  }

  function methodChip(k) {
    var ck = (M[k] && (M[k].colorKey || k)) || 'cv';
    return '<span class="mtag" data-m="' + ck + '"><b>' + M[k].abbr + '</b>' + esc(M[k].name) + '</span>';
  }

  function caseChip(k) {  /* 案例 methods 标签（小号） */
    var m = M[k];
    if (!m) return '';
    var ck = m.colorKey || k;
    return '<span class="mtag sm" data-m="' + ck + '"><b>' + esc(m.abbr) + '</b>' + esc(m.name) + '</span>';
  }

  function stageBar(stageId) {
    var counts = A.countByStageMethod()[stageId];
    var keys = Object.keys(counts).filter(function (k) { return counts[k] > 0; });
    if (!keys.length) return '<div class="sb2"><i class="empty"></i></div>';
    return '<div class="sb2" title="' + keys.map(function (k) {
      return M[k].abbr + ' ×' + counts[k];
    }).join('　') + '">' + keys.map(function (k) {
      var ck = (M[k] && (M[k].colorKey || k)) || 'cv';
      return '<i style="flex:' + counts[k] + ';background:var(--c-' + ck + ')"></i>';
    }).join('') + '</div>';
  }

  /* ---------- 首页 V2：方法图谱小图形（五类各一枚，统一线条风） ---------- */
  function motifCV() {
    return '<svg class="motif" viewBox="0 0 52 38" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4">' +
      '<rect x="3" y="3" width="46" height="32" rx="3" stroke-opacity=".55"/>' +
      '<path d="M7 27 L17 15 L24 22 L31 12 L45 26" stroke-width="1.6"/>' +
      '<rect class="an-scan" x="20" y="8" width="17" height="12" rx="2" stroke-dasharray="3 2" stroke-width="1.2"/>' +
      '<circle cx="21.5" cy="9.5" r="1.3" fill="currentColor" stroke="none"/>' +
      '<path d="M8 8 h5 M8 8 v5 M44 30 h-5 M44 30 v-5" stroke-width="1.2" stroke-opacity=".8"/></g></svg>';
  }
  function motifTS() {
    return '<svg class="motif" viewBox="0 0 52 38" aria-hidden="true"><g fill="none" stroke="currentColor">' +
      '<path d="M6 32 H48 M6 32 V5" stroke-width="1.2" stroke-opacity=".45"/>' +
      '<path class="an-draw" d="M7 26 L13 22 L18 25 L24 16 L30 19 L36 10" stroke-width="1.7"/>' +
      '<path d="M36 10 L42 7 L48 5" stroke-width="1.4" stroke-dasharray="3 2.5" class="an-draw2"/>' +
      '<path d="M36 10 L42 13 L48 12 L48 5 L42 7 Z" fill="currentColor" fill-opacity=".12" stroke="none"/>' +
      '<circle cx="36" cy="10" r="2" fill="currentColor" stroke="none"/></g></svg>';
  }
  function motifNLP() {
    return '<svg class="motif" viewBox="0 0 52 38" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.3">' +
      '<rect x="6" y="6" width="40" height="26" rx="3" stroke-opacity=".5"/>' +
      '<path d="M11 12 h22 M11 17 h30 M11 22 h16" stroke-opacity=".7"/>' +
      '<rect class="an-tok" x="26" y="10.5" width="7" height="3.6" rx="1" fill="currentColor" fill-opacity=".55" stroke="none"/>' +
      '<rect class="an-tok2" x="27" y="15.5" width="10" height="3.6" rx="1" fill="currentColor" fill-opacity=".55" stroke="none"/>' +
      '<path class="an-arc" d="M29.5 10 Q22 2 32 15.5" stroke-dasharray="2.5 2" stroke-width="1.1"/></g></svg>';
  }
  function motifOPT() {
    return '<svg class="motif" viewBox="0 0 52 38" aria-hidden="true"><g fill="none" stroke="currentColor">' +
      '<ellipse cx="26" cy="19" rx="21" ry="14" stroke-width="1" stroke-opacity=".35"/>' +
      '<ellipse cx="26" cy="19" rx="14" ry="9" stroke-width="1.1" stroke-opacity=".55"/>' +
      '<ellipse cx="26" cy="19" rx="7" ry="4.4" stroke-width="1.2" stroke-opacity=".8"/>' +
      '<path class="an-path" d="M5 33 Q14 30 20 24 T28 16 Q33 11 26 19" stroke-width="1.5" stroke-dasharray="26 26"/>' +
      '<circle cx="26" cy="19" r="2.2" fill="currentColor" stroke="none"/></g></svg>';
  }
  function motifKG() {
    return '<svg class="motif" viewBox="0 0 52 38" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.1">' +
      '<path d="M10 10 L26 19 L42 10 M10 28 L26 19 L42 28 M10 10 L10 28 M42 10 L42 28 M26 5 L26 19 M26 5 L10 10 M26 5 L42 10" stroke-opacity=".6"/>' +
      '<circle cx="10" cy="10" r="3" fill="currentColor" fill-opacity=".35"/><circle cx="42" cy="10" r="3" fill="currentColor" fill-opacity=".35"/>' +
      '<circle cx="10" cy="28" r="3" fill="currentColor" fill-opacity=".35"/><circle cx="42" cy="28" r="3" fill="currentColor" fill-opacity=".35"/>' +
      '<circle cx="26" cy="5" r="2.6" fill="currentColor" fill-opacity=".35"/>' +
      '<circle class="an-core" cx="26" cy="19" r="4" fill="currentColor" stroke="none"/></g></svg>';
  }
  var MOTIFS = { cv: motifCV, ts: motifTS, nlp: motifNLP, opt: motifOPT, kg: motifKG };
  function motifFor(k) { return (MOTIFS[k] || motifCV)(); }

  /* =========================================================
     三、V9 视觉系统 · 通用片段
     ========================================================= */

  /* 石油作业三阶段：1 勘探与评价 / 2 开发与生产 / 3 加工与储运 */
  var PHASE = { geology:1, seismic:1, drilling:1, mudlogging:1, welllog:1,
                cementing:2, completion:2, perforation:2, production:2, workover:2, eor:2,
                transport:3, refining:3 };
  function phOf(id) { return PHASE[id] || 1; }
  function phColor(p) { return p === 1 ? 'var(--c-cv)' : p === 2 ? 'var(--jade)' : 'var(--clay)'; }
  function phName(p) { return p === 1 ? '勘探与评价' : p === 2 ? '开发与生产' : '加工与储运'; }
  function phEn(p) { return p === 1 ? 'EXPLORATION' : p === 2 ? 'DEVELOPMENT' : 'REFINING & TRANSPORT'; }

  /* 环节内的方法构成条（真实计数） */
  function tgBar(st) {
    var c = A.countByStageMethod()[st.id] || {};
    var keys = Object.keys(M).filter(function (k) { return c[k] > 0; });
    if (!keys.length) return '<span class="tg-node-bar"><i class="on" style="--c:var(--line-2);flex:1"></i></span>';
    return '<span class="tg-node-bar">' + keys.map(function (k) {
      return '<i class="on" style="--c:var(--c-' + (M[k].colorKey || k) + ');flex:' + c[k] + '"></i>';
    }).join('') + '</span>';
  }
  function tgMethodCounts(st) {
    var c = A.countByStageMethod()[st.id] || {};
    return Object.keys(M).filter(function (k) { return c[k] > 0; }).map(function (k) {
      return { k: k, n: c[k] };
    }).sort(function (a, b) { return b.n - a.n; });
  }
  function tgCasesOfStage(st) {
    var n = 0;
    st.scenes.forEach(function (s) { n += Cases.bySceneAll(s.id).length; });
    return n;
  }

  /* ---------- 首屏关系网络：13 环节 × 5 方法，关联强度取自真实场景标签 ---------- */
  function netSVG() {
    var keys = Object.keys(M);
    var sts = A.stages;
    var cnt = A.countByStageMethod();
    var W = 700, H = 566, cx = 350, cy = 282, RX = 266, RY = 224, MR = 118;

    var spos = sts.map(function (st, i) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / sts.length;
      return { st: st, x: cx + RX * Math.cos(a), y: cy + RY * Math.sin(a) };
    });
    var mpos = keys.map(function (k, i) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / keys.length + .55;
      return { k: k, x: cx + MR * Math.cos(a), y: cy + MR * .98 * Math.sin(a) };
    });

    var maxN = 1;
    sts.forEach(function (st) { keys.forEach(function (k) { maxN = Math.max(maxN, cnt[st.id][k] || 0); }); });

    /* 连线 */
    var links = '';
    mpos.forEach(function (mp) {
      spos.forEach(function (sp) {
        var n = cnt[sp.st.id][mp.k] || 0;
        if (!n) return;
        var mx = mp.x, my = mp.y, sx = sp.x, sy = sp.y;
        var qx = (mx + sx) / 2 * .78 + cx * .22;
        var qy = (my + sy) / 2 * .78 + cy * .22;
        var wdt = (0.6 + 2.2 * Math.sqrt(n / maxN)).toFixed(2);
        var op = (0.10 + 0.20 * Math.sqrt(n / maxN)).toFixed(3);
        links += '<path class="tn-link" data-m="' + mp.k + '" data-s="' + sp.st.id + '" d="M' + mx.toFixed(1) + ' ' + my.toFixed(1) +
          ' Q' + qx.toFixed(1) + ' ' + qy.toFixed(1) + ' ' + sx.toFixed(1) + ' ' + sy.toFixed(1) + '" fill="none" stroke="var(--c-' +
          (M[mp.k].colorKey || mp.k) + ')" stroke-width="' + wdt + '" opacity="' + op + '"/>';
      });
    });

    /* 方法节点 */
    var msvg = mpos.map(function (mp) {
      var n = (A.index.byMethod[mp.k] || []).length;
      var col = 'var(--c-' + (M[mp.k].colorKey || mp.k) + ')';
      return '<g class="tn-m" data-m="' + mp.k + '">' +
        '<circle cx="' + mp.x.toFixed(1) + '" cy="' + mp.y.toFixed(1) + '" r="31" fill="#fff" stroke="' + col + '" stroke-opacity=".55" stroke-width="1.3"/>' +
        '<circle cx="' + mp.x.toFixed(1) + '" cy="' + mp.y.toFixed(1) + '" r="31" fill="' + col + '" fill-opacity=".07"/>' +
        '<text x="' + mp.x.toFixed(1) + '" y="' + (mp.y - 2).toFixed(1) + '" text-anchor="middle" font-family="var(--mono)" font-size="13" font-weight="700" fill="' + col + '">' + M[mp.k].abbr + '</text>' +
        '<text x="' + mp.x.toFixed(1) + '" y="' + (mp.y + 13).toFixed(1) + '" text-anchor="middle" font-family="var(--mono)" font-size="8" fill="' + col + '" fill-opacity=".8">' + n + ' 场景</text>' +
        '</g>';
    }).join('');

    /* 环节节点 + 标签 */
    var ssvg = spos.map(function (sp) {
      var st = sp.st, p = phOf(st.id), col = phColor(p);
      var dx = sp.x - cx, dy = sp.y - cy;
      var anchor = Math.abs(dx) < 26 ? 'middle' : (dx > 0 ? 'start' : 'end');
      var lx = sp.x + (anchor === 'middle' ? 0 : (dx > 0 ? 23 : -23));
      var ly = sp.y + (Math.abs(dx) < 26 ? (dy < 0 ? -24 : 30) : 4);
      return '<g class="tn-s" data-s="' + st.id + '">' +
        '<circle class="dot" cx="' + sp.x.toFixed(1) + '" cy="' + sp.y.toFixed(1) + '" r="12.5" fill="#fff" stroke="' + col + '" stroke-width="2"/>' +
        '<circle cx="' + sp.x.toFixed(1) + '" cy="' + sp.y.toFixed(1) + '" r="4.5" fill="' + col + '"/>' +
        '<text class="lab" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + anchor + '">' + esc(st.name) + '</text>' +
        '</g>';
    }).join('');

    return '<svg class="tg-net-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="13 个石油作业环节与 5 类 AI 技术的关联网络">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (RX + 14) + '" fill="none" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="2 7" opacity=".55"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + MR + '" fill="none" stroke="var(--line)" stroke-width="1" stroke-dasharray="2 6" opacity=".8"/>' +
      links + msvg + ssvg +
      '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="var(--ink-4)" letter-spacing="2">TIANGONG</text>' +
      '<text x="' + cx + '" y="' + (cy + 10) + '" text-anchor="middle" font-size="10.5" fill="var(--ink-3)" font-weight="600">13 环节 × 5 技术</text>' +
      '</svg>';
  }

  /* ---------- 案例封面示意图（统一风格，不伪造运行结果） ---------- */
  function coverSVG(m, seed, h) {
    var ck = (M[m] && (M[m].colorKey || m)) || 'cv';
    var col = 'var(--c-' + ck + ')';
    var id = 'cv' + String(seed || '').replace(/[^a-z0-9]/gi, '');
    var g = '<defs><pattern id="' + id + '" width="18" height="18" patternUnits="userSpaceOnUse">' +
      '<path d="M18 0H0V18" fill="none" stroke="' + col + '" stroke-opacity=".12" stroke-width="1"/></pattern></defs>';
    var bg = '<rect width="320" height="120" fill="url(#' + id + ')"/>';
    var art = '';
    if (ck === 'cv') {
      art = '<rect x="26" y="22" width="268" height="76" rx="4" fill="' + col + '" fill-opacity=".05" stroke="' + col + '" stroke-opacity=".35"/>' +
        '<path d="M34 86 L86 52 L122 72 L170 38 L222 62 L286 30" fill="none" stroke="' + col + '" stroke-width="1.6" stroke-opacity=".8"/>' +
        '<rect x="150" y="32" width="58" height="34" rx="2" fill="none" stroke="' + col + '" stroke-width="1.2" stroke-dasharray="4 3"/>' +
        '<path d="M150 32 h9 M150 32 v9 M208 66 h-9 M208 66 v-9" stroke="' + col + '" stroke-width="1.6"/>' +
        '<circle cx="179" cy="49" r="4" fill="' + col + '" fill-opacity=".5"/>';
    } else if (ck === 'ts') {
      art = '<path d="M26 96 H294 M26 96 V20" stroke="' + col + '" stroke-opacity=".3" stroke-width="1"/>' +
        '<path d="M34 82 L66 70 L96 76 L128 52 L160 60 L192 40 L224 46 L256 30 L286 26 V96 H34 Z" fill="' + col + '" fill-opacity=".10"/>' +
        '<path d="M34 82 L66 70 L96 76 L128 52 L160 60 L192 40 L224 46 L256 30 L286 26" fill="none" stroke="' + col + '" stroke-width="1.8"/>' +
        '<circle cx="192" cy="40" r="3" fill="' + col + '"/><circle cx="256" cy="30" r="3" fill="' + col + '"/>' +
        '<path d="M192 40 L256 22 L286 22" fill="none" stroke="' + col + '" stroke-width="1.2" stroke-dasharray="4 3" opacity=".7"/>';
    } else if (ck === 'nlp') {
      art = '<rect x="40" y="24" width="240" height="72" rx="5" fill="#fff" stroke="' + col + '" stroke-opacity=".3"/>' +
        '<path d="M56 42 h96 M56 54 h150 M56 66 h72" stroke="' + col + '" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>' +
        '<rect x="160" y="48" width="44" height="12" rx="3" fill="' + col + '" fill-opacity=".22"/>' +
        '<rect x="136" y="60" width="34" height="12" rx="3" fill="' + col + '" fill-opacity=".32"/>' +
        '<path d="M182 54 Q206 34 216 62" fill="none" stroke="' + col + '" stroke-width="1" stroke-dasharray="3 2"/>';
    } else if (ck === 'opt') {
      art = '<ellipse cx="160" cy="60" rx="118" ry="44" fill="none" stroke="' + col + '" stroke-opacity=".22"/>' +
        '<ellipse cx="160" cy="60" rx="82" ry="30" fill="none" stroke="' + col + '" stroke-opacity=".35"/>' +
        '<ellipse cx="160" cy="60" rx="46" ry="17" fill="none" stroke="' + col + '" stroke-opacity=".55"/>' +
        '<path d="M46 96 Q92 82 112 66 T150 46 Q176 34 160 60" fill="none" stroke="' + col + '" stroke-width="1.8" stroke-dasharray="34 34"/>' +
        '<circle cx="160" cy="60" r="4.5" fill="' + col + '"/>';
    } else {
      art = '<path d="M70 44 L160 60 L250 44 M70 78 L160 60 L250 78 M70 44 V78 M250 44 V78 M160 30 V60" fill="none" stroke="' + col + '" stroke-opacity=".45" stroke-width="1"/>' +
        '<circle cx="70" cy="44" r="5" fill="' + col + '" fill-opacity=".4"/><circle cx="250" cy="44" r="5" fill="' + col + '" fill-opacity=".4"/>' +
        '<circle cx="70" cy="78" r="5" fill="' + col + '" fill-opacity=".4"/><circle cx="250" cy="78" r="5" fill="' + col + '" fill-opacity=".4"/>' +
        '<circle cx="160" cy="30" r="4" fill="' + col + '" fill-opacity=".4"/>' +
        '<circle cx="160" cy="60" r="8" fill="' + col + '" fill-opacity=".85"/>';
    }
    return '<svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + g + bg + art + '</svg>';
  }

  /* ---------- 流程节点 ---------- */
  function flowNode(st, opt) {
    opt = opt || {};
    var p = phOf(st.id);
    var casesN = tgCasesOfStage(st);
    return '<a class="tg-node" data-s="' + st.id + '" data-ph="' + p + '" href="#/stage/' + st.id + '"' +
      ' style="--phc:' + phColor(p) + '" title="' + esc(st.name) + '：' + st.scenes.length + ' 个场景">' +
      '<span class="tg-node-i">' + pad(st.idx) + ' · ' + st.scenes.length + ' 场景</span>' +
      '<b class="tg-node-nm">' + esc(st.name) + '</b>' +
      '<span class="tg-node-m"><b>' + (casesN || '—') + '<small>案例</small></b>' +
      '<span class="tg-node-go">→</span></span>' +
      tgBar(st) + (opt === 'home' && global.HomeChainMotion ? global.HomeChainMotion.svg(st.id) : '') + '</a>';
  }

  function flowHTML(mode) {
    var out = '';
    [1, 2, 3].forEach(function (p) {
      var list = A.stages.filter(function (s) { return phOf(s.id) === p; });
      var scN = list.reduce(function (a, s) { return a + s.scenes.length; }, 0);
      out += '<div class="tg-phase" data-ph="' + p + '" style="--phc:' + phColor(p) + '">' +
        '<div class="tg-phase-h"><span class="tg-phase-no">PHASE 0' + p + '</span><b>' + phName(p) + '</b>' +
        '<em><b>' + list.length + '</b> 环节 · ' + scN + ' 场景</em></div>' +
        '<div class="tg-track"' + (mode === 'chain' ? '' : ' style="grid-template-columns:repeat(' + Math.max(list.length, 1) + ',1fr)"') + '>' +
        list.map(function (st) { return flowNode(st, mode); }).join('') + '</div></div>';
      if (p < 3) out += '<div class="tg-phase-link"><i></i><span>流程衔接 · ' + phName(p) + ' → ' + phName(p + 1) + '</span></div>';
    });
    return '<div class="tg-flow' + (mode === 'chain' ? ' tg-chainflow' : '') + '">' + out + '</div>';
  }

  /* ---------- 环节速览（首页 hover / 作业链工作台共用数据） ---------- */
  function stageDetailHTML(st) {
    var p = phOf(st.id);
    var mc = tgMethodCounts(st);
    var max = mc.length ? mc[0].n : 1;
    var withCase = st.scenes.filter(function (s) { return Cases.bySceneAll(s.id).length; });
    var cnt = { 低: 0, 中: 0, 高: 0 };
    st.scenes.forEach(function (s) { cnt[s.diff] = (cnt[s.diff] || 0) + 1; });

    var bars = mc.map(function (x) {
      return '<div class="tg-sd-mr" style="--mc:var(--c-' + (M[x.k].colorKey || x.k) + ')">' +
        '<em>' + M[x.k].abbr + '</em><i><b style="width:' + (x.n / max * 100).toFixed(0) + '%"></b></i>' +
        '<span>' + x.n + '</span></div>';
    }).join('');

    var scenes = st.scenes.slice(0, 6).map(function (s) {
      var n = Cases.bySceneAll(s.id).length;
      return '<a class="tg-sd-sc" href="#/scene/' + s.id + '"><i></i><span>' + esc(s.name) + '</span>' +
        (n ? '<b>' + n + ' 案例</b>' : '') + '</a>';
    }).join('');

    return '<div class="tg-stage-detail" id="tg-stage-detail" style="--phc:' + phColor(p) + '">' +
      '<div class="tg-sd-l">' +
      '<div class="tg-sd-k"><b>' + pad(st.idx) + '</b> ' + phEn(p) + '</div>' +
      '<div class="tg-sd-h"><h3>' + esc(st.name) + '</h3><span>' + esc(st.en) + '</span></div>' +
      '<p class="tg-sd-p">' + esc(st.blurb) + '</p>' +
      '<div class="tg-sd-m">' + bars + '</div>' +
      '</div>' +
      '<div class="tg-sd-r">' +
      '<div class="tg-sd-rt"><span>典型场景 · ' + st.scenes.length + ' 个 / 其中 ' + withCase.length + ' 个已接入案例</span>' +
      '<a class="btn sm ghost" href="#/stage/' + st.id + '">进入环节 →</a></div>' +
      '<div class="tg-sd-scenes">' + scenes + '</div>' +
      '<div class="tg-sd-cases"><span>代表案例</span>' + (function () {
        var arr = [];
        st.scenes.forEach(function (s) {
          Cases.bySceneAll(s.id).forEach(function (c) { if (arr.length < 3) arr.push(c); });
        });
        return arr.length ? arr.map(function (c) {
          return '<a href="#/scene/' + c.sceneId + '?case=' + esc(c.id) + '">' + esc(c.title || c.id) + '</a>';
        }).join('') : '<a href="#/guide">该环节暂无已接入案例 · 查看接入指南</a>';
      })() + '</div>' +
      '<div class="tg-sd-foot"><span class="tag">难度 低' + cnt.低 + ' / 中' + cnt.中 + ' / 高' + cnt.高 + '</span>' +
      (withCase.length ? '<a class="btn sm" href="#/scene/' + withCase[0].id + '?tab=demo">看一个可运行示范 →</a>' : '') +
      '</div></div></div>';
  }

  /* ---------- 工作台（作业链页） ---------- */
  function workbenchHTML(st) {
    var p = phOf(st.id);
    var mc = tgMethodCounts(st);
    var max = mc.length ? mc[0].n : 1;
    var withCase = st.scenes.filter(function (s) { return Cases.bySceneAll(s.id).length; });
    var casesN = tgCasesOfStage(st);
    var cnt = { 低: 0, 中: 0, 高: 0 };
    st.scenes.forEach(function (s) { cnt[s.diff] = (cnt[s.diff] || 0) + 1; });

    var bars = mc.map(function (x) {
      return '<div class="tg-wb-mr" style="--mc:var(--c-' + (M[x.k].colorKey || x.k) + ')">' +
        '<em>' + M[x.k].abbr + '</em><i><b style="width:' + (x.n / max * 100).toFixed(0) + '%"></b></i>' +
        '<span>' + x.n + '</span></div>';
    }).join('');

    var rows = st.scenes.map(function (s) {
      var cs = Cases.bySceneAll(s.id);
      return '<a class="tg-srow" href="#/scene/' + s.id + '">' +
        '<span class="tg-srow-n">' + esc(s.id.toUpperCase()) + '</span>' +
        '<span class="tg-srow-b"><b>' + esc(s.name) + (cs.length ? '<span class="badge-ready">' + cs.length + ' 案例</span>' : '') +
        '<span class="ar">→</span></b><p>' + esc(s.point) + '</p>' +
        '<span class="tg-srow-t">' + s.methods.map(function (k) {
          var ck = (M[k] && (M[k].colorKey || k)) || 'cv';
          return '<span class="mtag sm" data-m="' + ck + '"><b>' + M[k].abbr + '</b>' + esc(M[k].name) + '</span>';
        }).join('') + '</span></span>' +
        '<span class="tg-srow-r">' + K.dtag(s.diff) +
        (s.demo ? '<span class="tag" style="color:var(--jade-d);border-color:rgba(23,105,179,.25);background:var(--jade-l)">可运行</span>' : '') +
        '</span></a>';
    }).join('');

    return '<div class="tg-wb" id="tg-wb" style="--phc:' + phColor(p) + '" data-stage="' + st.id + '"><div class="tg-wb-in">' +
      '<aside class="tg-wb-l">' +
      '<div class="tg-wb-k"><b>' + pad(st.idx) + '</b>' + phEn(p) + '</div>' +
      '<h2>' + esc(st.name) + '</h2><div class="tg-wb-en">' + esc(st.en) + '</div>' +
      '<p class="tg-wb-p">' + esc(st.blurb) + '</p>' +
      '<div class="tg-wb-m">' + bars + '</div>' +
      '<div class="tg-wb-stats">' +
      '<div><b>' + st.scenes.length + '</b><span>场景</span></div>' +
      '<div><b>' + casesN + '</b><span>案例</span></div>' +
      '<div><b>' + withCase.length + '</b><span>已覆盖</span></div>' +
      '</div>' +
      '<div style="margin-top:16px;display:flex;gap:7px;flex-wrap:wrap">' +
      '<a class="btn sm primary" href="#/stage/' + st.id + '">进入环节详情 →</a>' +
      '<a class="btn sm ghost" href="#/cases?stage=' + st.id + '">按案例浏览</a></div>' +
      '</aside>' +
      '<div class="tg-wb-r">' +
      '<div class="tg-wb-rt"><h3>该环节的典型场景</h3><span class="cnt">' + st.scenes.length + ' 个场景 · 难度 低' + cnt.低 + '/中' + cnt.中 + '/高' + cnt.高 + '</span></div>' +
      rows + '</div></div></div>';
  }

  /* =========================================================
     三、首页 V2 —— 工业科技展馆式总览
     ========================================================= */

  /* 工业全景带：地震采集 → 钻井 → 储层 → 集输 → 加工，数据总线贯穿 */
  function panoramaSVG() {
    return '<svg class="pano" viewBox="0 0 1440 172" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="从地震采集到炼化的工业全景示意">' +
      '<defs><clipPath id="pgnd"><rect x="0" y="66" width="1440" height="106"/></clipPath></defs>' +
      /* 地层：三条缓波状带 */
      '<g clip-path="url(#pgnd)">' +
      '<path d="M0 92 Q 180 84 360 90 T 720 88 T 1080 92 T 1440 86 V172 H0 Z" fill="#e9eef6"/>' +
      '<path d="M0 114 Q 200 106 400 112 T 800 110 T 1200 114 T 1440 108 V172 H0 Z" fill="#dfe6f0"/>' +
      '<path d="M0 136 Q 220 128 440 134 T 880 132 T 1280 136 T 1440 130 V172 H0 Z" fill="#d5deeb"/>' +
      /* 储层透镜体 */
      '<path d="M560 128 Q 680 106 800 128 Q 680 146 560 128 Z" fill="#d47a3a" fill-opacity=".22" stroke="#d47a3a" stroke-width="1.1"/>' +
      '<path d="M600 133 Q 680 121 760 133 Q 680 141 600 133 Z" fill="#d47a3a" fill-opacity=".3"/>' +
      '</g>' +
      /* 地表线 */
      '<line x1="0" y1="66" x2="1440" y2="66" stroke="#b6c4d6" stroke-width="1.4"/>' +
      /* 左：地震采集（震源 + 波前弧 + 检波器） */
      '<g stroke="#0f9dad" fill="none" stroke-width="1.3">' +
      '<path class="pw1" d="M120 66 Q 96 88 120 104 Q 144 88 120 66"/>' +
      '<path class="pw2" d="M120 66 Q 76 96 120 122 Q 164 96 120 66"/>' +
      '<path class="pw3" d="M120 66 Q 56 104 120 140 Q 184 104 120 66"/>' +
      '</g>' +
      '<rect x="104" y="46" width="30" height="14" rx="3" fill="#0f9dad" fill-opacity=".18" stroke="#0f9dad" stroke-width="1.2"/>' +
      '<circle cx="112" cy="63" r="1.6" fill="#0f9dad"/><circle cx="120" cy="63" r="1.6" fill="#0f9dad"/><circle cx="128" cy="63" r="1.6" fill="#0f9dad"/>' +
      /* 中：钻机（桁架）+ 井筒 + 射孔 */
      '<g stroke="#164b88" fill="none" stroke-width="1.5">' +
      '<path d="M600 66 L648 8 L696 66"/>' +
      '<path d="M612 50 L684 50 M620 34 L676 34 M630 20 L666 20"/>' +
      '<path class="pkj" d="M648 8 V18"/>' +
      '</g>' +
      '<line x1="644" y1="66" x2="644" y2="132" stroke="#164b88" stroke-width="1.6"/>' +
      '<line x1="652" y1="66" x2="652" y2="132" stroke="#164b88" stroke-width="1.6"/>' +
      '<path d="M644 120 h-10 M652 120 h10 M644 128 h-10 M652 128 h10" stroke="#d47a3a" stroke-width="1.4"/>' +
      /* 右：集输管线 + 泵站 + 炼化 */
      '<path d="M652 62 H1050" stroke="#164b88" stroke-width="2" fill="none"/>' +
      '<circle cx="860" cy="62" r="7" fill="#fff" stroke="#164b88" stroke-width="1.6"/>' +
      '<path d="M856 62 h8 M860 58 v8" stroke="#164b88" stroke-width="1.4"/>' +
      '<rect x="1060" y="30" width="12" height="36" rx="2" fill="none" stroke="#164b88" stroke-width="1.5"/>' +
      '<rect x="1080" y="38" width="12" height="28" rx="2" fill="none" stroke="#164b88" stroke-width="1.5"/>' +
      '<ellipse cx="1106" cy="58" rx="14" ry="8" fill="none" stroke="#164b88" stroke-width="1.5"/>' +
      '<path d="M1066 30 V22 Q1066 14 1074 14" stroke="#d47a3a" stroke-width="1.3" fill="none"/>' +
      /* 数据总线：地表上方虚线 + 节点 */
      '<path class="bus" d="M120 40 H648 H860 H1100" stroke="#2875c7" stroke-width="1.2" stroke-dasharray="5 4" fill="none"/>' +
      '<g fill="#2875c7">' +
      '<circle cx="120" cy="40" r="3.4"/><circle cx="648" cy="40" r="3.4"/><circle cx="860" cy="40" r="3.4"/><circle cx="1100" cy="40" r="3.4"/>' +
      '</g>' +
      '<g font-family="monospace" font-size="9" fill="#5d6770">' +
      '<text x="120" y="28" text-anchor="middle">采集</text><text x="648" y="28" text-anchor="middle">钻井</text>' +
      '<text x="860" y="28" text-anchor="middle">集输</text><text x="1100" y="28" text-anchor="middle">加工</text></g>' +
      '<text x="1424" y="166" font-size="8.5" fill="#7d8ba0" text-anchor="end" font-family="monospace">SURVEY · DRILL · PRODUCE · TRANSPORT · REFINE — 数据总线贯穿全链</text>' +
      '</svg>';
  }

  function homeHTML() {
    var cs = Cases.stats(), total = A.allScenes.length, keys = Object.keys(M);
    var drilling = A.index.byStage.drilling;
    var drillingCases = Cases.list().filter(function (c) {
      var sc = A.index.byScene[c.sceneId];
      return sc && sc.stageId === 'drilling';
    });
    var featuredIds = ['d1-rop-opt', 'd2-kick-warning', 'd3-trajectory-mpc', 'd4-stick-slip', 'd5-mud-adjust'];
    var feats = featuredIds.map(function (id) {
      return drillingCases.filter(function (c) { return c.id === id; })[0];
    }).filter(Boolean);

    function caseMeta(c) {
      var sc = A.index.byScene[c.sceneId] || {};
      var m0 = (c.methods && c.methods[0]) || (sc.methods && sc.methods[0]) || 'cv';
      return { m0: m0, ck: (M[m0] && (M[m0].colorKey || m0)) || m0 };
    }
    var main = feats[0] ? (function () {
      var c = feats[0], mt = caseMeta(c);
      return '<a class="tg-feat-main" style="--mc:var(--c-' + mt.ck + ')" href="#/scene/' + c.sceneId + '?case=' + esc(c.id) + '&tab=demo">' +
        '<span class="tg-feat-cv">' + coverSVG(mt.m0, c.id) + '<span class="badge"><span class="badge-ready">可运行示范</span></span></span>' +
        '<span class="tg-feat-body"><span class="meta">01 / FEATURED DEMO</span><h3>' + esc((c.title || c.id).split('：')[0]) + '</h3>' +
        '<p>调整钻井参数，对比推荐方案与预测钻速。</p>' +
        '<span class="go"><span class="l">' + (c.methods || []).map(function (m) {
          var ck = (M[m] && (M[m].colorKey || m)) || 'cv';
          return '<span class="mtag sm" data-m="' + ck + '"><b>' + (M[m] ? M[m].abbr : m) + '</b>' + (M[m] ? esc(M[m].name) : '') + '</span>';
        }).join('') + '</span><span class="ar">运行演示 <span>↗</span></span></span></span></a>';
    })() : '';
    var small = feats.slice(1).map(function (c, i) {
      var mt = caseMeta(c), title = (c.title || c.id).split('：');
      return '<a class="tg-fsm" style="--mc:var(--c-' + mt.ck + ')" href="#/scene/' + c.sceneId + '?case=' + esc(c.id) + '&tab=demo">' +
        '<span class="home-case-index">' + pad(i + 2) + '</span><span class="tg-fsm-b"><b>' + esc(title[0]) + '</b>' +
        '<i>' + esc(title.slice(1).join('：')) + '</i></span><span class="tg-fsm-arrow">↗</span></a>';
    }).join('');
    var methods = keys.map(function (k) {
      return '<a class="home-method-link" style="--mc:var(--c-' + (M[k].colorKey || k) + ')" href="#/method/' + k + '">' +
        '<b>' + M[k].abbr + '</b><span>' + esc(M[k].name) + '</span><i aria-hidden="true">↗</i></a>';
    }).join('');

    return '<main class="home-overview">' +
      '<section class="home-hero" aria-labelledby="home-title">' +
      '<div class="home-horizon" aria-hidden="true"></div><div class="wrap home-stage">' +
      '<div class="home-copy"><p class="home-eyebrow"><i></i>油链天工 <span>/ PETROLEUM × AI</span></p>' +
      '<h1 id="home-title"><span>向深处探索</span><em>让智能抵达</em></h1>' +
      '<p class="home-subtitle">石油勘探开发 · 智能化可能性地图</p>' +
      '<p class="home-lead">从钻井现场出发，探索人工智能在石油作业中的应用。</p>' +
      '<div class="home-actions"><a class="home-primary" href="#/stage/drilling">探索智能钻井 <span>↗</span></a>' +
      '<a class="home-secondary" href="#/cases">浏览案例库 <span>→</span></a></div></div>' +
      '<div class="home-art" data-renderer="loading"><div class="home-art-label"><span>FIELD / 01</span><b>钻井井场剖面 · 概念示意</b></div>' +
      '<div class="home-scene-stage" role="group" tabindex="0" aria-label="三维钻井井场，可拖拽旋转" aria-describedby="home-view-help"><span class="home-scene-loading" aria-hidden="true">正在准备三维井场…</span><div class="home-rig-host" aria-hidden="true"></div></div>' +
      '<div class="home-view-controls" role="group" aria-label="三维井场交互">' +
      '<button type="button" data-home-action="interact" aria-pressed="false" disabled>进入交互</button>' +
      '<button type="button" data-home-action="out" aria-label="缩小井场" title="缩小" disabled>−</button>' +
      '<output class="home-zoom" aria-label="相对缩放">100%</output>' +
      '<button type="button" data-home-action="in" aria-label="放大井场" title="放大" disabled>＋</button>' +
      '<button type="button" data-home-action="reset" disabled>复位视角</button></div>' +
      '<p class="home-view-help" id="home-view-help">拖拽旋转 · 进入交互后滚轮缩放 · 方向键调整视角</p>' +
      '<div class="home-art-footer"><div class="home-art-key" aria-label="场景组成"><span><i aria-hidden="true"></i>地表井场</span><span><i aria-hidden="true"></i>井筒剖面</span><span><i aria-hidden="true"></i>目标地层</span></div>' +
      '<button class="home-motion" type="button" aria-pressed="false" aria-label="暂停首页动态效果"><i aria-hidden="true"></i><span>暂停动效</span></button></div></div></div>' +
      '<div class="wrap"><div class="tg-kpis home-kpis">' +
      '<div class="tg-kpi"><span class="tg-kpi-n mono roll" data-n="' + A.stages.length + '">' + A.stages.length + '</span><span class="tg-kpi-l">作业环节</span></div>' +
      '<div class="tg-kpi"><span class="tg-kpi-n mono roll" data-n="' + total + '">' + total + '</span><span class="tg-kpi-l">应用场景</span></div>' +
      '<div class="tg-kpi"><span class="tg-kpi-n mono roll" data-n="' + cs.registered + '">' + cs.registered + '</span><span class="tg-kpi-l">已接入案例</span></div>' +
      '<div class="tg-kpi"><span class="tg-kpi-n mono roll" data-n="' + keys.length + '">' + keys.length + '</span><span class="tg-kpi-l">AI 技术方法</span></div>' +
      '</div></div></section>' +

      '<section class="tg-sec home-drilling"><div class="wrap">' +
      '<div class="tg-shead"><div class="tg-shead-l"><span class="kicker">01 / DRILLING</span><h2>钻井精选</h2>' +
      '<p>调整参数，观察钻速、预警与井眼轨迹的变化。</p></div>' +
      '<div class="home-section-meta"><div class="home-counts"><b>' + drilling.scenes.length + '</b><span>场景</span><b>' + drillingCases.length + '</b><span>案例</span></div>' +
      '<a class="home-text-link" href="#/stage/drilling">查看全部场景 <span>↗</span></a></div></div>' +
      '<div class="tg-feat rv">' + main + '<div class="tg-feat-side">' + small + '</div></div>' +
      '<div class="home-section-foot"><span>示范用于理解算法，不代表现场验证结果。</span></div></div></section>' +

      '<section class="tg-sec home-chain"><div class="wrap">' +
      '<div class="tg-shead"><div class="tg-shead-l"><span class="kicker">02 / PROCESS</span><h2>完整作业链</h2>' +
      '<p>从勘探到加工，按作业顺序进入各环节。</p></div>' +
      '<a class="home-text-link" href="#/chain">打开作业链工作台 <span>↗</span></a></div>' +
      '<div class="rv">' + flowHTML('home') + '</div></div></section>' +

      '<section class="tg-sec home-methods"><div class="wrap">' +
      '<div class="tg-shead"><div class="tg-shead-l"><span class="kicker">03 / AI METHODS</span><h2>技术用在哪里</h2>' +
      '<p>按方法浏览，或点击矩阵交点查看对应案例。</p></div></div>' +
      '<nav class="home-method-nav" aria-label="按 AI 方法浏览">' + methods + '</nav>' + matrixHTML() + '</div></section></main>';
  }

  function matrixHTML() {
    var counts = A.countByStageMethod();
    var keys = Object.keys(M);
    var total = A.allScenes.length;
    var maxV = 1;
    A.stages.forEach(function (st) { keys.forEach(function (k) { maxV = Math.max(maxV, counts[st.id][k] || 0); }); });
    function opFor(n) { return n ? (0.08 + 0.56 * Math.sqrt(n / maxV)).toFixed(3) : 0; }

    var head = '<div class="mx-hc" data-c=""><span>环节 ＼ 方法</span></div>' +
      keys.map(function (k) {
        var n = (A.index.byMethod[k] || []).length;
        return '<a class="mx-h" data-c="' + k + '" href="#/method/' + k + '" title="' + esc(M[k].name) + '：' + n + ' 个场景">' +
          '<i style="background:var(--c-' + (M[k].colorKey || k) + ')"></i><b>' + M[k].abbr + '</b><span>' + n + '</span></a>';
      }).join('') + '<div class="mx-h mx-hh"><b>场景</b><span>' + total + '</span></div>';

    var body = A.stages.map(function (st) {
      var c = counts[st.id];
      var cells = keys.map(function (k) {
        var n = c[k] || 0;
        var pct = st.scenes.length ? Math.round(n / st.scenes.length * 100) : 0;
        if (!n) return '<span class="mx-c mx-zero" data-r="' + st.id + '" data-c="' + k + '"><i></i><em>·</em></span>';
        return '<a class="mx-c" data-r="' + st.id + '" data-c="' + k + '" href="#/cases?stage=' + st.id + '&m=' + k + '"' +
          ' title="' + esc(st.name) + ' × ' + esc(M[k].name) + '：' + n + ' 个场景">' +
          '<i style="opacity:' + opFor(n) + '"></i>' +
          '<span class="mx-v">' + n + '</span>' +
          '<span class="mx-p">' + pct + '%</span></a>';
      }).join('');
      return '<a class="mx-r" data-r="' + st.id + '" href="#/stage/' + st.id + '"><i>' + pad(st.idx) + '</i><span>' + esc(st.name) + '</span></a>' +
        cells +
        '<a class="mx-c mx-t" data-r="' + st.id + '" href="#/stage/' + st.id + '"><span class="mx-v">' + st.scenes.length + '</span><span class="mx-p">100%</span></a>';
    }).join('');

    return '<div class="tg-matrix mxv rv">' +
      '<div class="tg-mxbox"><div class="tg-mx-top">' +
      '<div class="tg-mx-modes" role="group" aria-label="显示模式">' +
      '<button class="on" data-mode="v" type="button">数量</button>' +
      '<button data-mode="p" type="button">环节内占比</button></div>' +
      '<span class="tg-mx-info" id="mx-info">点击交点，筛选对应案例</span></div>' +
      '<div class="mx-scroll"><div class="mx-grid" style="grid-template-columns:minmax(140px,1.5fr) repeat(5,1fr) 58px">' +
      head + body + '</div></div>' +
      '<div class="tg-mxleg"><span class="mono">色阶</span>' +
      [0, 1, Math.round(maxV / 2), maxV].map(function (v, i) {
        return '<span class="sc"><i style="opacity:' + (i ? opFor(v || 1) : 0) + '"></i><b>' + (i ? v : '0') + '</b></span>';
      }).join('') +
      '<span class="nt">颜色越深，关联场景越多；同一场景可使用多种方法。</span></div></div></div>';
  }

  /* =========================================================
     四、链条总览页
     ========================================================= */
  var chainView = 'map';

  function chainHTML() {
    var rows = A.stages.map(function (st) {
      var p = phOf(st.id);
      var mc = tgMethodCounts(st);
      return '<a class="tg-lrow" href="#/stage/' + st.id + '" data-q="' + esc(st.name + ' ' + st.en + ' ' + st.blurb) + '">' +
        '<span class="tg-lrow-n" style="--phc:' + phColor(p) + '">' + pad(st.idx) + '</span>' +
        '<span class="tg-lrow-b"><b>' + esc(st.name) + '<span class="tag" style="font-family:var(--mono);font-size:9.5px">' + esc(st.en).toUpperCase() + '</span></b>' +
        '<p>' + esc(st.blurb) + '</p></span>' +
        '<span class="tg-lrow-m">' + mc.slice(0, 4).map(function (x) {
          return '<span class="mtag sm" data-m="' + (M[x.k].colorKey || x.k) + '"><b>' + M[x.k].abbr + '</b>' + x.n + '</span>';
        }).join('') + '</span>' +
        '<span class="tg-lrow-r"><b>' + st.scenes.length + '</b><span>场景</span></span></a>';
    }).join('');

    return '<main>' +
      '<section class="tg-chainhead"><div class="wrap in">' +
      '<div><div class="ph-idx">FULL CHAIN · 完整作业链</div>' +
      '<h1>从地质勘察到加工的 <em>13 个环节</em></h1>' +
      '<p>按石油作业的真实顺序分为勘探评价、开发生产、加工储运三个阶段。选择任一环节，下方工作台会同步显示它的技术构成、典型场景与已接入案例。</p></div>' +
      '<div class="tg-chstats">' +
      '<div><b>' + A.stages.length + '</b><span>环节</span></div>' +
      '<div><b>' + A.allScenes.length + '</b><span>场景</span></div>' +
      '<div><b id="ch-cases">' + Cases.stats().registered + '</b><span>接入案例</span></div>' +
      '</div></div></section>' +

      '<div class="wrap">' +
      '<div class="tg-chainbar">' +
      '<div class="tg-viewtog" role="group" aria-label="视图切换">' +
      '<button data-v="map" class="' + (chainView === 'map' ? 'on' : '') + '" type="button">流程地图</button>' +
      '<button data-v="list" class="' + (chainView === 'list' ? 'on' : '') + '" type="button">列表视图</button></div>' +
      '<input id="ch-q" type="text" placeholder="搜索环节名称 / 英文 / 简介…" autocomplete="off">' +
      '<span class="sp"></span>' +
      '<span class="small muted">点击节点切换下方工作台 · 工作台内可进入环节详情</span>' +
      '</div>' +

      '<div id="ch-map" ' + (chainView === 'map' ? '' : 'hidden') + '>' +
      '<div class="tg-chainmap">' + flowHTML('chain') + '</div>' +
      '<div id="tg-wb-wrap">' + workbenchHTML(A.stages[0]) + '</div>' +
      '</div>' +

      '<div id="ch-list" ' + (chainView === 'list' ? '' : 'hidden') + '><div class="tg-list">' + rows + '</div>' +
      '<div class="tg-empty" id="ch-empty" hidden><b>没有匹配的环节</b><p>换个关键词试试，或清空搜索框。</p></div></div>' +
      '</div></main>';
  }

  function chPrevHTML() { return ''; }

  function bindChain(root) {
    var m = root.querySelector('#ch-map'), l = root.querySelector('#ch-list');
    if (!m) return;
    var wrap = root.querySelector('#tg-wb-wrap');
    var nodes = [].slice.call(root.querySelectorAll('.tg-chainmap .tg-node'));
    var current = A.stages[0].id;

    function select(id, scroll) {
      var st = A.index.byStage[id];
      if (!st) return;
      current = id;
      nodes.forEach(function (n) { n.classList.toggle('sel', n.getAttribute('data-s') === id); });
      wrap.innerHTML = workbenchHTML(st);
      if (scroll) {
        var y = wrap.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: scrollBehavior() });
      }
    }
    select(A.stages[0].id, false);

    nodes.forEach(function (n) {
      n.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        select(n.getAttribute('data-s'), false);
      });
      n.addEventListener('mouseenter', function () {
        if (window.matchMedia && matchMedia('(hover:hover)').matches) select(n.getAttribute('data-s'), false);
      });
    });

    var q = root.querySelector('#ch-q');
    function applyQ() {
      var v = (q.value || '').trim().toLowerCase();
      var hit = 0;
      [].forEach.call(root.querySelectorAll('.ch-row, .tg-lrow'), function (r) {
        var ok = !v || (r.getAttribute('data-q') || '').toLowerCase().indexOf(v) >= 0;
        r.style.display = ok ? '' : 'none';
        if (ok) hit++;
      });
      nodes.forEach(function (n) {
        var st = A.index.byStage[n.getAttribute('data-s')];
        var ok = !v || (st && (st.name + st.en + st.blurb).toLowerCase().indexOf(v) >= 0);
        n.style.opacity = ok ? '' : '.34';
        n.style.pointerEvents = ok ? '' : 'none';
      });
      var emp = root.querySelector('#ch-empty');
      if (emp) emp.hidden = hit > 0;
    }
    if (q) q.addEventListener('input', applyQ);

    var btns = root.querySelectorAll('.tg-viewtog button');
    [].forEach.call(btns, function (b) {
      b.addEventListener('click', function () {
        chainView = b.getAttribute('data-v');
        [].forEach.call(btns, function (x) { x.classList.toggle('on', x === b); });
        m.hidden = chainView !== 'map';
        l.hidden = chainView !== 'list';
      });
    });
  }

  function drillingStatisticsHTML(st) {
    if (st.id !== 'drilling' || !global.AtlasCharts) return '';
    var keys = Object.keys(M), counts = { '低': 0, '中': 0, '高': 0 };
    st.scenes.forEach(function (sc) { counts[sc.diff]++; });
    return '<section class="drilling-statistics" aria-label="钻井场景统计">' +
      '<div class="ds-heading"><div><span class="eyebrow">DRILLING / DATA</span><h2>从数据看钻井智能化方向</h2></div><p>全量 ' + st.scenes.length + ' 个场景 · ' + tgCasesOfStage(st) + ' 个案例</p></div>' +
      '<div class="ds-grid"><div class="ds-chart">' + global.AtlasCharts.columns('哪些AI方法可以切入钻井', keys.map(function (k) { return M[k].name; }),
        [{ name: '涉及该方法的场景', values: keys.map(function (k) { return st.scenes.filter(function (sc) { return sc.methods.indexOf(k) >= 0; }).length; }) }],
        { unit: '场景数', foot: '同一场景可包含多种方法，柱高之和可超过场景总数' }) + '</div>' +
      '<div class="ds-chart">' + global.AtlasCharts.ring('技术难度构成', ['低', '中', '高'].map(function (name, index) { return { name: name + '难度', value: counts[name], color: ['#168273', '#2875c7', '#d47a3a'][index] }; }),
        { unit: '个', centerLabel: '场景总数', foot: '统计全部钻井场景；难度理由可在各场景详情查看' }) + '</div></div></section>';
  }

  function drillingHighlightsHTML(st) {
    if (st.id !== 'drilling') return '';
    var highlights = [
      ['d26', 'solid', '学习分离响应', '从实验中学习，再筛固控方案', '残差学习 · 独立批次验证 · 约束推荐'],
      ['d27', 'signal', '学习延迟补偿', '从历史井段学习压力变化', '因果特征 · 预测对照 · 井段验证'],
      ['d28', 'strategy', '学习钻速衰减', '先学钻速，再比较换钻时机', '趟次数据 · 回归预测 · 策略优化']
    ];
    return '<section class="drilling-highlights" aria-label="视频演示精选"><div class="dh-head"><div><span class="eyebrow">PETROLEUM × ML / 用数据学习石油规律</span><h2>看见模型怎样学习，怎样辅助决策</h2></div><p>专业数据 · 模型学习 · 独立验证</p></div><div class="dh-grid">' + highlights.map(function (h, i) {
      return '<article class="dh-card dh-' + h[1] + '"><div class="dh-graphic" aria-hidden="true"><span>0' + (i + 1) + '</span><i></i><i></i><i></i></div><span class="dh-tag">' + h[2] + '</span><h3>' + h[3] + '</h3><p>' + h[4] + '</p><div class="dh-actions"><a href="#/scene/' + h[0] + '?tab=demo">进入案例 →</a><a href="showcase/' + h[0] + '/index.html" target="_blank" rel="noopener">独立录屏 ↗</a></div></article>';
    }).join('') + '</div><p class="dh-note">教学合成数据 · 浏览器内训练与验证 · 保留公式基线、样本不足与工况偏移实验。</p></section>';
  }

  function stageHTML(st, q) {
    var counts = {};
    st.scenes.forEach(function (s) { counts[s.diff] = (counts[s.diff] || 0) + 1; });
    var mFilter = q.m || '';
    var dFilter = q.d || '';

    var methodKeys = Object.keys(M).filter(function (k) {
      return st.scenes.some(function (s) { return s.methods.indexOf(k) >= 0; });
    });
    var methBtns = ['<button class="chip' + (mFilter ? '' : ' on') + '" data-f="m" data-v="">全部方法</button>'].concat(
      methodKeys.map(function (k) {
        return '<button class="chip' + (mFilter === k ? ' on' : '') + '" data-f="m" data-v="' + k + '" data-m="' + k + '">' + M[k].abbr + ' ' + esc(M[k].name) + '</button>';
      })).join('');

    var diffBtns = ['<button class="chip' + (dFilter ? '' : ' on') + '" data-f="d" data-v="">全部难度</button>'].concat(
      ['低', '中', '高'].map(function (d) {
        return '<button class="chip' + (dFilter === d ? ' on' : '') + '" data-f="d" data-v="' + d + '">' + d + '</button>';
      })).join('');

    var list = st.scenes.map(function (sc) {
      var cn = Cases.bySceneAll(sc.id).length;
      return '<a class="scene-row' + (sc.status === 'ext' ? ' is-ext' : '') + '" href="#/scene/' + sc.id + '" data-m="' + sc.methods.join(' ') + '" data-d="' + sc.diff + '" data-c="' + (cn || 0) + '" data-demo="' + (sc.demo ? 1 : 0) + '">' +
        '<div class="sr-n">' + esc(sc.id.toUpperCase()) + '</div>' +
        '<div><div class="sr-name">' + esc(sc.name) +
        (cn ? '<span class="badge-ready">已接入案例' + (cn > 1 ? ' ×' + cn : '') + '</span>' : '') +
        '<span class="arrow">→</span></div>' +
        '<div class="sr-point">' + esc(sc.point) + '</div>' +
        '<div class="sr-meta">' + sc.methods.map(function (k) {
          var ck = (M[k] && (M[k].colorKey || k)) || 'cv';
          return '<span class="mtag" data-m="' + ck + '"><b>' + M[k].abbr + '</b>' + esc(M[k].name) + '</span>';
        }).join('') + '</div></div>' +
        '<div class="sr-right"><span class="dtag" data-d="' + sc.diff + '">难度 ' + sc.diff + '</span>' +
        (sc.demo ? '<span class="badge-wip" style="border-style:solid;color:var(--jade-d);background:var(--jade-l);border-color:rgba(47,125,107,.2)">可运行</span>' : '') +
        '</div></a>';
    }).join('');

    var idx = A.stages.indexOf(st);
    var prev = A.stages[idx - 1], next = A.stages[idx + 1];

    return '<main class="wrap">' +
      crumb([['#/', '总览'], ['#/chain', '作业链'], ['#/stage/' + st.id, st.name]]) +
      '<div class="page-head"><div class="ph-top"><div>' +
      '<div class="ph-idx">' + pad(st.idx) + ' / ' + pad(A.stages.length) + '</div>' +
      '<h1>' + esc(st.name) + '环节的可智能化场景<span class="en">' + esc(st.en) + '</span></h1>' +
      '<p class="blurb">' + esc(st.blurb) + '</p></div>' +
      '<div class="ph-stat">' +
      '<div><div class="n">' + st.scenes.length + '</div><div class="l">场景</div></div>' +
      '<div><div class="n">' + (counts.低 || 0) + '</div><div class="l">低难度</div></div>' +
      '<div><div class="n">' + (counts.高 || 0) + '</div><div class="l">高难度</div></div>' +
      '</div></div></div>' +

      drillingHighlightsHTML(st) + drillingStatisticsHTML(st) +
      (st.id === 'drilling' && global.DrillingCinema ? global.DrillingCinema.html('drilling', false) : '') +

      '<div class="pgn">' + A.stages.map(function (x) {
        var on = x.id === st.id;
        return '<a class="pg' + (on ? ' on' : '') + '" href="#/stage/' + x.id + '" title="' + esc(x.name) + '"><i>' + pad(x.idx) + '</i>' + (on ? '<span>' + esc(x.name) + '</span>' : '') + '</a>';
      }).join('<em class="pg-sep">·</em>') + '</div>' +

      '<div class="filters"><span class="lbl">方法</span>' + methBtns +
      '<span class="divider"></span><span class="lbl">难度</span>' + diffBtns +
      '<span class="divider"></span><input id="f-q" type="text" placeholder="搜索场景…" autocomplete="off">' +
      '<button class="chip" data-f="c" data-v="1" type="button">有案例</button>' +
      '<button class="chip" data-f="demo" data-v="1" type="button">可运行</button>' +
      '<button class="f-clear" id="f-clear" type="button" title="清空全部筛选">✕ 清空</button>' +
      '<span class="count" id="f-count">' + st.scenes.length + ' 个场景</span></div>' +
      '<div class="scenes" id="scene-list">' + list + '</div>' +
      '<div class="pager">' +
      (prev ? '<a href="#/stage/' + prev.id + '" class="prev"><span class="dir">← 上一环节</span><span class="nm">' + pad(prev.idx) + ' ' + esc(prev.name) + '</span></a>' : '') +
      (next ? '<a href="#/stage/' + next.id + '" class="next"><span class="dir">下一环节 →</span><span class="nm">' + pad(next.idx) + ' ' + esc(next.name) + '</span></a>' : '') +
      '</div></main>';
  }

  function bindFilters(root) {
    var listEl = root.querySelector('#scene-list');
    if (!listEl) return;
    var st = { m: '', d: '', q: '', c: '', demo: '' };
    var chips = root.querySelectorAll('.filters .chip');
    [].forEach.call(chips, function (c) {
      if (c.classList.contains('on')) st[c.dataset.f] = c.dataset.v;
    });

    function apply() {
      var n = 0;
      [].forEach.call(listEl.querySelectorAll('.scene-row'), function (row) {
        var ms = (row.dataset.m || '').split(' ');
        var okM = !st.m || ms.indexOf(st.m) >= 0;
        var okD = !st.d || row.dataset.d === st.d;
        var okQ = !st.q || (((row.querySelector('.sr-name') || {}).textContent || '') + ((row.querySelector('.sr-point') || {}).textContent || '')).toLowerCase().indexOf(st.q) >= 0;
        var okC = !st.c || (+row.dataset.c || 0) > 0;
        var okDemo = !st.demo || row.dataset.demo === '1';
        var show = okM && okD && okQ && okC && okDemo;
        row.style.display = show ? '' : 'none';
        if (show) n++;
      });
      var cnt = root.querySelector('#f-count');
      if (cnt) cnt.textContent = n + ' 个场景';
      if (window.I18N && I18N.lang === 'en') { var tt = I18N.t(cnt.textContent); if (tt) cnt.textContent = tt; }
      var emp = listEl.querySelector('.filter-empty');
      if (!n) {
        if (!emp) {
          var d = document.createElement('div');
          d.className = 'empty filter-empty';
          d.innerHTML = '<b>没有符合条件的场景</b>换个筛选条件，或点「✕ 清空」。';
          listEl.appendChild(d);
        }
      } else if (emp) emp.remove();
    }

    function syncHash() {
      var hash = '#/stage/' + parseHash().parts[1] + (st.m ? '?m=' + st.m + (st.d ? '&d=' + st.d : '') : (st.d ? '?d=' + st.d : ''));
      setHashQuiet(hash);
    }

    [].forEach.call(chips, function (c) {
      c.addEventListener('click', function () {
        var f = c.dataset.f;
        var wasOn = c.classList.contains('on');
        [].forEach.call(chips, function (x) {
          if (x.dataset.f === f) x.classList.remove('on');
        });
        if (wasOn) { st[f] = ''; }
        else { c.classList.add('on'); st[f] = c.dataset.v; }
        apply();
        syncHash();
      });
    });
    var qIn = root.querySelector('#f-q');
    if (qIn) qIn.addEventListener('input', function () { st.q = qIn.value.trim().toLowerCase(); apply(); });
    var clr = root.querySelector('#f-clear');
    if (clr) clr.addEventListener('click', function () {
      st = { m: '', d: '', q: '', c: '', demo: '' };
      [].forEach.call(chips, function (x) { x.classList.remove('on'); });
      if (qIn) qIn.value = '';
      apply(); syncHash();
    });
    apply();
  }

  /* =========================================================
     六、方法反查页
     ========================================================= */
  function methodHTML(key) {
    if (!M[key]) return '<main class="wrap"><div class="empty"><b>没有这个方法类别</b></div></main>';
    var all = A.index.byMethod[key] || [];
    var hitStages = A.stages.filter(function (st) {
      return st.scenes.some(function (s) { return s.methods.indexOf(key) >= 0; });
    });
    var groups = hitStages.map(function (st) {
      var rows = st.scenes.filter(function (s) { return s.methods.indexOf(key) >= 0; }).map(function (sc) {
        var c = Cases.byScene(sc.id);
        return '<a class="mrow" href="#/scene/' + sc.id + '">' +
          '<div><div class="nm">' + esc(sc.name) + (c ? '<span class="badge-ready">案例</span>' : '') + '</div>' +
          '<div class="pt">' + esc(sc.point) + '</div></div>' +
          '<div class="rt"><span class="dtag" data-d="' + sc.diff + '">' + sc.diff + '</span><span class="mono" style="font-size:10px;color:var(--ink-4)">→</span></div></a>';
      }).join('');
      return '<div class="method-group"><div class="mg-head">' +
        '<span class="idx">' + pad(st.idx) + '</span><h3>' + esc(st.name) + '</h3>' +
        '<span class="cnt">' + st.scenes.filter(function (s) { return s.methods.indexOf(key) >= 0; }).length + ' 个</span></div>' +
        '<div class="mg-list">' + rows + '</div></div>';
    }).join('');

    return '<main class="wrap">' +
      crumb([['#/', '总览'], ['#/method/' + key, M[key].name]]) +
      '<div class="page-head"><div class="ph-top"><div>' +
      '<div class="ph-idx md-k" style="color:var(--c-' + (M[key].colorKey || key) + ')"><span class="md-motif" style="color:var(--c-' + (M[key].colorKey || key) + ')">' + motifFor(key) + '</span>METHOD · ' + M[key].abbr + '</div>' +
      '<h1>' + esc(M[key].name) + '在石油勘探开发中的可应用场景<span class="en">' + esc(M[key].signal) + '</span></h1>' +
      '<p class="blurb">' + esc(M[key].desc) + '</p></div>' +
      '<div class="ph-stat"><div><div class="n">' + all.length + '</div><div class="l">场景</div></div>' +
      '<div><div class="n">' + hitStages.length + '</div><div class="l">跨环节</div></div></div>' +
      '</div></div>' +
      '<div class="md-dist rv on">' +
      '<div class="md-dh"><span class="mono">' + M[key].abbr + ' · 环节分布</span><span class="mono muted">' + all.length + ' 个场景 · 覆盖 ' + hitStages.length + '/13 环节</span></div>' +
      '<div class="md-bars">' + A.stages.map(function (x) {
        var n = x.scenes.filter(function (sc) { return sc.methods.indexOf(key) >= 0; }).length;
        var max = 1; A.stages.forEach(function (y) { max = Math.max(max, y.scenes.filter(function (sc) { return sc.methods.indexOf(key) >= 0; }).length); });
        var w = n / max * 100;
        return '<a class="mdb" href="#/stage/' + x.id + '?m=' + key + '"' + (n ? '' : ' aria-disabled="true"') + '>' +
          '<span class="mdb-n">' + esc(x.name) + '</span>' +
          '<span class="mdb-t"><i style="width:' + w.toFixed(1) + '%' + (n ? '' : ';opacity:.18') + '"></i></span>' +
          '<span class="mdb-v mono">' + (n || '·') + '</span></a>';
      }).join('') + '</div></div>' +
      '<div style="padding:6px 0 10px">' + groups + '</div>' +
      '<div class="pager"><a href="#/" class="prev"><span class="dir">← 返回</span><span class="nm">总览</span></a></div></main>';
  }

  /* =========================================================
     七、场景详情页（案例自动挂载）
     ========================================================= */
  function sceneHTML(sc, q) {
    var st = A.index.byStage[sc.stageId];
    var allCases = Cases.bySceneAll(sc.id);
    /* 当前展示哪个案例：?case= 指定，默认第一个 */
    var c = allCases.filter(function (x) { return x.id === q.case; })[0] || allCases[0] || null;

    var caseSwitch = '';
    if (allCases.length > 1) {
      caseSwitch = '<div class="case-switch"><span class="cs-lbl">本场景共有 ' + allCases.length +
        ' 个案例，当前展示</span>' + allCases.map(function (x) {
          var on = c && x.id === c.id;
          return '<button class="chip' + (on ? ' on' : '') + '" data-case="' + esc(x.id) + '">' +
            esc(x.title || x.id) + '</button>';
        }).join('') + '</div>';
    }

    var tabs = [];
    if (c) {
      if (c.tabs.background) tabs.push({ key: 'bg', num: '01', name: c.tabs.background.label || '专业背景' });
      if (c.tabs.workflow) tabs.push({ key: 'flow', num: '02', name: c.tabs.workflow.label || '案例流程' });
      if (c.tabs.demo) tabs.push({ key: 'demo', num: '03', name: c.tabs.demo.label || '可运行示范' });
    }

    var tabBtns = tabs.map(function (t, i) {
      return '<button class="tab' + (i === 0 ? ' on' : '') + '" data-tab="' + t.key + '">' +
        '<span class="num">' + t.num + '</span>' + esc(t.name) + '</button>';
    }).join('');

    var panels = '';
    if (c) {
      if (c.tabs.background) panels += '<div class="panel on" data-panel="bg">' + renderBackground(sc, c) + '</div>';
      if (c.tabs.workflow) panels += '<div class="panel" data-panel="flow">' + renderWorkflow(sc, c) + '</div>';
      if (c.tabs.demo) panels += '<div class="panel" data-panel="demo">' + renderDemoShell(sc, c) + '</div>';
    }

    var cBadge = allCases.length
      ? '<span class="badge-ready">案例 ' + esc(c.id) + ' · v' + esc(c.version || '—') + '</span>' +
        (allCases.length > 1 ? '<span class="tag">共 ' + allCases.length + ' 个案例</span>' : '')
      : '<span class="badge-wip">未接入案例</span>';

    var head = '<div class="detail-head">' +
      '<div class="dh-kicker">' +
      '<a class="tag" href="#/stage/' + st.id + '">环节 ' + pad(st.idx) + ' · ' + esc(st.name) + '</a>' +
      sc.methods.map(function (k) {
        var ck = (M[k] && (M[k].colorKey || k)) || 'cv';
        return '<span class="mtag" data-m="' + ck + '"><b>' + M[k].abbr + '</b>' + esc(M[k].name) + '</span>';
      }).join('') +
      '<button class="star-btn' + (isFav(sc.id) ? ' on' : '') + '" data-fav="' + esc(sc.id) + '" title="收藏本场景"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z"/></svg><span class="fv-t">' + (isFav(sc.id) ? '已收藏' : '收藏') + '</span></button>' +
      '<button class="link-btn" data-copylink title="复制本页链接（含案例与Tab状态）">⧉ 复制链接</button>' +
      cBadge +
      '</div>' +
      '<h1 class="dh-title">' + esc(sc.name) + '</h1>' +
      '<p class="dh-sub">' + esc(sc.intro) + '</p>' +
      '<div class="dh-tags">' + K.dtag(sc.diff) +
      (sc.status === 'ext' ? '<span class="badge-wip">待扩展</span>' : '') +
      '<span class="tag"><span class="dot" style="color:var(--ink-4)"></span>' + esc(sc.id.toUpperCase()) + '</span>' +
      '</div></div>';

    var body = c
      ? caseSwitch + '<div class="tabs" id="tabs">' + tabBtns + '</div>' + panels
      : pendingHTML(sc);

    return '<main class="wrap">' +
      crumb([['#/', '总览'], ['#/chain', '作业链'], ['#/stage/' + st.id, st.name], ['#/scene/' + sc.id, sc.name]]) +
      head + body + relatedHTML(sc) + '</main>';
  }

  /* ---- 有案例：三块内容由案例提供，这里只套版式 ---- */
  function renderBackground(sc, c) {
    var b = c.tabs.background;
    var out = '';
    if (b.judge) out += K.judge(b.judge);
    if (b.lede) out += '<div class="lede-block"><span class="kicker plain">专业场景介绍</span><p>' + rich(b.lede) + '</p></div>';
    (b.sections || []).forEach(function (s, i) {
      out += K.sec4(i + 1, s.en || '', s.title, s.html || s.body || '');
    });
    return out;
  }

  function renderWorkflow(sc, c) {
    var w = c.tabs.workflow;
    var out = '<div class="case-lead"><div>' +
      '<span class="kicker clay">CASE WALKTHROUGH</span>' +
      '<h3 style="margin-top:10px">' + esc(w.title || '案例流程') + '</h3>' +
      (w.lead || []).map(function (p) { return '<p>' + rich(p) + '</p>'; }).join('') +
      '</div>' + (w.stats ? K.cells(w.stats) : '') + '</div>';

    /* 可选：流程全景图（案例包在 tabs.workflow.overview 里给 HTML/SVG 即渲染） */
    if (w.overview) {
      out += '<div class="figure">' + w.overview + '</div>';
    }

    out += K.pipeline(w.steps || []);

    if (w.metrics) {
      out += K.sec4(0, 'METRICS', w.metrics.title || '怎么算"做对了"', w.metrics.html || '');
    }
    if (w.fails) {
      out += '<div class="sec4"><div class="sn">FAIL<span>MODES</span></div><div class="sec4-body">' +
        '<h3>这类任务通常死在哪</h3>' +
        '<p>下面这些失败模式在同类项目里反复出现。它们多半不是模型能力问题，而是任务定义与数据规范问题。</p>' +
        K.fails(w.fails) + '</div></div>';
    }
    return out;
  }

  function renderDemoShell(sc, c) {
    return (sc.stageId === 'drilling' && global.DrillingCinema &&
      (!global.DrillingCinema.hasScene || global.DrillingCinema.hasScene(sc.id)) ? global.DrillingCinema.html(sc.id, true) : '') + '<div class="lab">' +
      '<div class="lab-bar"><span class="lab-dots"><i></i><i></i><i></i></span>' +
      '<span class="lab-t mono">SANDBOX · 交互实验台 · 纯前端真实算法</span>' +
      '<span class="lab-id mono">' + esc(c ? c.id : '') + '</span>' +
      (c && c.tabs.demo && c.tabs.demo.filesV3 ? '<button class="lab-open" data-openstandalone="' + esc(c.id) + '" type="button" title="在新标签页打开独立示范">↗ 独立打开</button>' : '') + '</div>' +
      '<div id="case-demo-root"></div></div>';
  }

  /* ---- 无案例：展示速览 + 接入引导 ---- */
  function pendingHTML(sc) {
    var dataRows = sc.data.map(function (d) { return [d[0], d[1], d[2]]; });
    return '<div style="padding-top:8px">' +
      '<div class="sec4" style="border-top:0">' +
      '<div class="sn">01<span>PROBLEM</span></div><div class="sec4-body">' +
      '<h3>业务问题</h3><p>' + esc(sc.problem) + '</p></div></div>' +
      '<div class="sec4"><div class="sn">02<span>INTERVENTION</span></div><div class="sec4-body">' +
      '<h3>AI 介入点</h3><p>' + esc(sc.point) + '</p></div></div>' +
      '<div class="sec4"><div class="sn">03<span>DATA</span></div><div class="sec4-body">' +
      '<h3>数据条件</h3>' + K.dtable(['数据类型', '规模 / 规格', '标注要求'], dataRows) + '</div></div>' +
      '<div class="sec4"><div class="sn">04<span>DIFFICULTY</span></div><div class="sec4-body">' +
      '<h3>技术难度与参考方向</h3>' +
      '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:4px">' + K.dtag(sc.diff) +
      '<span class="small muted">' + esc(sc.diffWhy) + '</span></div>' + K.meter(sc.diff) +
      K.refs(sc.refs, '#/method/' + sc.methods[0]) +
      '</div></div>' +

      '<div class="pending"><div class="pending-top"><span class="badge-wip">案例待接入</span>' +
      '<h3>这个场景还没有配套案例</h3></div>' +
      '<p>它的元数据（问题、介入点、数据条件、难度）已经在地图里，但还没有写成可讲解、可运行的具体案例。案例是按插件方式接入的：写一个文件声明三块内容，注册后这个页面就会自动出现 tab 与示范。</p>' +
      '<div class="pending-lines"><div class="pending-line"></div><div class="pending-line"></div><div class="pending-line"></div></div>' +
      '<div class="pending-actions">' +
      '<button class="btn primary" data-import data-scene="' + esc(sc.id) + '">＋ 为这个场景添加案例</button>' +
      '<a class="btn" href="#/cases">看已接入的案例</a>' +
      '<a class="btn ghost" href="#/guide">看接入说明</a>' +
      '</div></div></div>';
  }

  function relatedHTML(sc) {
    var sameStage = A.index.byStage[sc.stageId].scenes.filter(function (s) { return s.id !== sc.id; }).slice(0, 4);
    var sameMethod = (A.index.byMethod[sc.methods[0]] || []).filter(function (s) { return s.id !== sc.id; }).slice(0, 4);
    return '<div class="related"><div class="sec-head" style="margin-bottom:0;border-top:0;padding-top:0"><div>' +
      '<span class="kicker">RELATED</span><h2 style="font-size:18px;margin-top:8px">相关场景</h2></div></div>' +
      '<div class="rel-grid">' +
      '<div class="rel-col"><h5>同环节 · ' + esc(A.index.byStage[sc.stageId].name) + '</h5>' +
      sameStage.map(function (s) {
        return '<a class="rel-item" href="#/scene/' + s.id + '"><span class="nm">' + esc(s.name) + '</span><span class="go">→</span></a>';
      }).join('') + '</div>' +
      '<div class="rel-col"><h5>同方法 · ' + esc(M[sc.methods[0]].name) + '</h5>' +
      sameMethod.map(function (s) {
        return '<a class="rel-item" href="#/scene/' + s.id + '"><span class="nm">' + esc(s.name) + '</span><span class="go">' + esc(s.stageName) + ' →</span></a>';
      }).join('') + '</div></div>' +
      '<div style="margin-top:18px;display:flex;gap:9px;flex-wrap:wrap">' +
      '<a class="btn" href="#/stage/' + sc.stageId + '">← 返回' + esc(sc.stageName) + '环节</a>' +
      '<a class="btn ghost" href="#/">返回总览</a></div></div>';
  }

  /* ---- tab 交互与示范挂载 ---- */
  function bindTabs(sc, c) {
    var tabsEl = document.getElementById('tabs');
    if (!tabsEl) return;

    function activate(key, scroll) {
      [].forEach.call(tabsEl.children, function (b) {
        b.classList.toggle('on', b.dataset.tab === key);
      });
      [].forEach.call(document.querySelectorAll('.panel'), function (p) {
        p.classList.toggle('on', p.dataset.panel === key);
      });
      if (key === 'demo') mountDemo(sc, c);
      if (scroll) {
        var y = tabsEl.getBoundingClientRect().top + window.scrollY - 62;
        window.scrollTo({ top: y, behavior: scrollBehavior() });
      }
    }

    tabsEl.addEventListener('click', function (e) {
      var b = e.target.closest('.tab');
      if (!b) return;
      activate(b.dataset.tab, true);
      setHashQuiet('#/scene/' + sc.id + '?case=' + encodeURIComponent(c.id) + '&tab=' + b.dataset.tab);
    });

    var want = { 1: 'bg', 2: 'flow', 3: 'demo' }[parseHash().q.tab] || parseHash().q.tab;
    if (want && tabsEl.querySelector('[data-tab="' + want + '"]')) activate(want, false);

    bindChecklist();
    bindFlowLinks();
  }

  function bindFlowLinks() {
    var ov = document.querySelector('.panel[data-panel="flow"] .figure svg');
    if (!ov) return;
    var steps = document.querySelectorAll('.panel[data-panel="flow"] .pstep');
    ov.style.cursor = 'pointer';
    ov.addEventListener('click', function (e) {
      var t = e.target.closest('circle, text');
      if (!t) return;
      var n = parseInt(t.textContent, 10);
      if (!n || !steps[n - 1]) return;
      steps[n - 1].scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
      steps[n - 1].classList.add('flash');
      setTimeout(function () { steps[n - 1].classList.remove('flash'); }, 1400);
    });
  }

  function mountDemo(sc, c) {
    var d = c.tabs.demo;
    if (!d || typeof d.mount !== 'function') return;
    var key = c.id;
    if (mountedKey === key) return;
    var root = document.getElementById('case-demo-root');
    if (!root) return;
    if (mounted && mounted.unmount) { try { mounted.unmount(); } catch (e) { } }
    root.innerHTML = '';
    mounted = d;
    mountedKey = key;
    try {
      if (sc.stageId === 'drilling') mountDrillingCinema(view, sc.id);
      d.mount(root, { scene: sc, kase: c, K: K, atlas: A });
    } catch (err) {
      root.innerHTML = '<div class="callout warn"><span class="ci">错误</span><span>示范挂载失败：' +
        esc(err.message) + '。检查 <b>' + esc(c.id) + '</b> 的 tabs.demo.mount。</span></div>';
      console.error('[case:' + c.id + '] demo mount failed', err);
    }
  }

  function mountDrillingCinema(root, sceneId) {
    if (!global.DrillingCinema) return;
    var element = root.querySelector('[data-drilling-cinema]');
    if (!element || element.dataset.cinemaMounted) return;
    element.dataset.cinemaMounted = 'true';
    var cinema = global.DrillingCinema.mount(element, { sceneId: sceneId });
    pageCleanups.push(function () { cinema.destroy(); });
  }

  function bindChecklist() {
    [].forEach.call(document.querySelectorAll('.checklist'), function (list) {
      var items = list.querySelectorAll('.cl-item');
      if (!items.length) return;
      var fill = list.querySelector('.cl-fill, #cl-fill');
      var txt = list.querySelector('.cl-txt, #cl-txt');
      function sync() {
        var n = list.querySelectorAll('.cl-item.done').length;
        if (fill) fill.style.width = (n / items.length * 100) + '%';
        if (txt) txt.textContent = n + ' / ' + items.length;
      }
      [].forEach.call(items, function (it) {
        it.setAttribute('role', 'checkbox'); it.setAttribute('tabindex', '0');
        it.setAttribute('aria-checked', String(it.classList.contains('done')));
        function toggle() {
          it.classList.toggle('done');
          it.setAttribute('aria-checked', String(it.classList.contains('done'))); sync();
        }
        it.addEventListener('click', toggle);
        it.addEventListener('keydown', function (event) {
          if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); toggle(); }
        });
      });
      sync();
    });
  }

  /* =========================================================
     八、案例库控制台
     ========================================================= */
  function casesHTML() {
    var list = Cases.list();
    var checks = Cases.validateAll();
    var s = Cases.stats();
    var pending = A.allScenes.filter(function (sc) { return !Cases.bySceneAll(sc.id).length; });

    function caseState(c) {
      var ck = checks[c.id] || [];
      var errs = ck.filter(function (x) { return x.level === 'error'; }).length;
      var warns = ck.filter(function (x) { return x.level === 'warn'; }).length;
      return { errs: errs, warns: warns, state: errs ? 'err' : warns ? 'warn' : 'ok' };
    }
    var sum = { err: 0, warn: 0, ok: 0 };
    list.forEach(function (c) { sum[caseState(c).state]++; });

    var stageCnt = {}, methodCnt = {};
    A.stages.forEach(function (x) { stageCnt[x.id] = 0; });
    Object.keys(M).forEach(function (k) { methodCnt[k] = 0; });
    list.forEach(function (c) {
      var sc = A.index.byScene[c.sceneId];
      if (sc && stageCnt[sc.stageId] !== undefined) stageCnt[sc.stageId]++;
      (c.methods && c.methods.length ? c.methods : (sc && sc.methods) || []).forEach(function (m) {
        if (methodCnt[m] !== undefined) methodCnt[m]++;
      });
    });

    function attrs(c) {
      var sc = A.index.byScene[c.sceneId] || {};
      var stg = sc.stageId ? A.index.byStage[sc.stageId] : null;
      var stt = caseState(c);
      return ' data-id="' + esc(c.id) + '"' +
        ' data-q="' + esc((c.title || '') + ' ' + c.id + ' ' + (sc.name || '') + ' ' + (sc.stageName || '')) + '"' +
        ' data-title="' + esc(c.title || c.id) + '"' +
        ' data-st="' + esc(sc.stageId || '') + '"' +
        ' data-stidx="' + (stg ? stg.idx : 99) + '"' +
        ' data-ord="' + (parseInt(c.ord, 10) || 0) + '"' +
        ' data-upd="' + esc(c.updated || '') + '"' +
        ' data-m="' + ((c.methods || sc.methods || []).join(' ')) + '"' +
        ' data-state="' + stt.state + '"' +
        ' data-demo="' + (c.tabs.demo ? 1 : 0) + '"' +
        ' data-imp="' + (c.imported ? 1 : 0) + '"' +
        ' data-scene="' + esc(c.sceneId) + '"';
    }

    var cards = list.map(function (c, i) {
      var sc = A.index.byScene[c.sceneId] || {};
      var stt = caseState(c);
      var m0 = (c.methods && c.methods[0]) || (sc.methods && sc.methods[0]) || 'cv';
      var ck = (M[m0] && (M[m0].colorKey || m0)) || m0;
      var stateTxt = stt.state === 'ok' ? '<span class="ok-mark">✓ 校验通过</span>'
        : stt.state === 'warn' ? '<span style="color:var(--warn)">! ' + stt.warns + ' 项提醒</span>'
          : '<span class="bad-mark">✕ ' + stt.errs + ' 项错误</span>';
      return '<a class="tg-cc" style="--mc:var(--c-' + ck + ')"' + attrs(c) +
        ' href="#/scene/' + c.sceneId + '?case=' + esc(c.id) + '" title="' + esc(c.title || c.id) + '">' +
        '<span class="tg-cc-cover">' + coverSVG(m0, c.id) +
        '<span class="tg-cc-badge">' + (c.tabs.demo ? '<span class="badge-ready">可运行</span>' : '') +
        (c.imported ? '<span class="tag" style="background:var(--card)">本地导入</span>' : '') + '</span>' +
        '<button class="tg-cc-fav' + (isFav(c.sceneId) ? ' on' : '') + '" data-fav="' + esc(c.sceneId) + '" type="button" aria-label="收藏该场景">★</button>' +
        '</span>' +
        '<span class="tg-cc-body"><h3>' + esc(c.title || c.id) + '</h3>' +
        '<span class="tg-cc-path"><span>' + esc(sc.stageName || '未匹配') + '</span>·<span>' + esc(sc.name || '') + '</span></span>' +
        '<p class="tg-cc-ds">' + esc((sc.point || '').slice(0, 62)) + '…</p>' +
        '<span class="tg-cc-m">' + (c.methods || sc.methods || []).slice(0, 3).map(function (m) {
          var mk = (M[m] && (M[m].colorKey || m)) || 'cv';
          return '<span class="mtag sm" data-m="' + mk + '"><b>' + (M[m] ? M[m].abbr : m.toUpperCase()) + '</b>' + (M[m] ? esc(M[m].name) : '') + '</span>';
        }).join('') + '</span>' +
        '<span class="tg-cc-foot"><span class="tg-cc-st">' + stateTxt + ' · v' + esc(c.version || '—') + '</span>' +
        '<span class="tg-cc-open">打开案例 <span>→</span></span></span></span></a>';
    }).join('');

    var rows = list.map(function (c) {
      var sc = A.index.byScene[c.sceneId] || {};
      var stt = caseState(c);
      return '<tr' + attrs(c) + '><td>' + esc(c.id) + '</td>' +
        '<td><div style="font-weight:600;color:var(--ink)">' + esc(c.title || c.id) + '</div>' +
        '<div style="font-size:11px;color:var(--ink-4)">' + (sc.stageName ? esc(sc.stageName) + ' / ' + esc(sc.name) : '⚠ 场景未匹配') + '</div></td>' +
        '<td>' + (c.methods || []).map(function (m) { return M[m] ? M[m].abbr : ''; }).join(' / ') + '</td>' +
        '<td>' + esc(c.version || '—') + '</td><td>' + esc(c.updated || '—') + '</td>' +
        '<td>' + (stt.state === 'ok' ? '<span class="ok-mark">✓</span>' : stt.state === 'warn' ? '<span style="color:var(--warn)">!</span>' : '<span class="bad-mark">✕</span>') + '</td>' +
        '<td>' + (sc.id ? '<a class="btn sm ghost" href="#/scene/' + sc.id + '?case=' + esc(c.id) + '">打开 →</a>' : '—') + '</td></tr>';
    }).join('');

    var blocked = (global.CaseImport && global.CaseImport.blockedList ? global.CaseImport.blockedList() : [])
      .filter(function (id) { return !Cases.get(id); });

    var valRows = list.filter(function (c) { return caseState(c).state !== 'ok'; }).map(function (c) {
      var ck = (checks[c.id] || []).filter(function (x) { return x.level !== 'ok'; });
      return '<tr><td>' + esc(c.id) + '</td><td>' + ck.map(function (x) {
        return (x.level === 'error' ? '✕ ' : '! ') + esc(x.label);
      }).join('；') + '</td></tr>';
    }).join('') || '<tr><td colspan="2" style="color:var(--ok)">全部案例通过校验，没有提醒或错误。</td></tr>';

    var dist = Object.keys(M).map(function (k) {
      var n = methodCnt[k] || 0;
      return '<i style="flex:' + n + ';background:var(--c-' + (M[k].colorKey || k) + ')" title="' + M[k].abbr + ' ' + n + ' 个案例"></i>';
    }).join('');

    return '<main>' +
      '<section class="tg-cases-head"><div class="wrap in">' +
      '<div><div class="ph-idx">CASE REGISTRY · 案例探索中心</div>' +
      '<h1>探索石油智能化应用案例</h1>' +
      '<p>' + s.registered + ' 个已注册案例，覆盖 ' + s.coveredScenes + ' / ' + s.totalScenes + ' 个场景，其中 ' + s.withDemo + ' 个带可运行示范。按环节、技术或关键词筛选，进入案例详情可直接运行。</p></div>' +
      '<div class="tg-cdist"><div><div class="eyebrow" style="margin-bottom:6px">技术分布 · 案例数</div><div class="bar">' + dist + '</div></div>' +
      '<div class="lg">' + Object.keys(M).map(function (k) {
        return '<span style="color:var(--c-' + (M[k].colorKey || k) + ')">' + M[k].abbr + ' ' + (methodCnt[k] || 0) + '</span>';
      }).join('') + '</div></div>' +
      '</div></section>' +

      '<div class="wrap"><div class="tg-caselayout">' +

      /* ---- 左筛选栏 ---- */
      '<aside class="tg-filter" id="tg-filter">' +
      '<button class="tg-filter-toggle" id="tg-ftog" type="button" aria-expanded="false"><i></i>筛选条件<span>展开</span></button>' +
      '<div class="tg-filter-h"><span>筛选</span><button id="cq-reset" type="button">重置</button></div>' +
      '<div class="tg-fg"><h4>关键词</h4><input class="tg-fq" id="cq-q" type="text" placeholder="案例 / 场景 / id…" autocomplete="off"></div>' +
      '<div class="tg-fg"><h4>作业环节</h4>' +
      '<button class="tg-fo on" data-st="" type="button"><i></i><span>全部环节</span><b>' + list.length + '</b></button>' +
      A.stages.map(function (x) {
        return '<button class="tg-fo" data-st="' + x.id + '" type="button"><i></i><span>' + pad(x.idx) + ' ' + esc(x.name) + '</span><b>' + stageCnt[x.id] + '</b></button>';
      }).join('') + '</div>' +
      '<div class="tg-fg"><h4>AI 技术</h4>' +
      '<button class="tg-fo on" data-m="" type="button"><i></i><span>全部技术</span><b>' + list.length + '</b></button>' +
      Object.keys(M).map(function (k) {
        return '<button class="tg-fo" data-m="' + k + '" type="button" style="--mc:var(--c-' + (M[k].colorKey || k) + ')"><i style="background:var(--c-' + (M[k].colorKey || k) + ')"></i><span>' + M[k].abbr + ' ' + esc(M[k].name) + '</span><b>' + (methodCnt[k] || 0) + '</b></button>';
      }).join('') + '</div>' +
      '<div class="tg-fg"><h4>状态</h4>' +
      '<button class="tg-fo on" data-state="" type="button"><i></i><span>全部状态</span></button>' +
      '<button class="tg-fo" data-state="ok" type="button"><i></i><span>校验通过</span><b>' + sum.ok + '</b></button>' +
      '<button class="tg-fo" data-state="warn" type="button"><i></i><span>有提醒</span><b>' + sum.warn + '</b></button>' +
      '<button class="tg-fo" data-state="err" type="button"><i></i><span>有错误</span><b>' + sum.err + '</b></button></div>' +
      '<div class="tg-fg"><h4>其他</h4>' +
      '<button class="tg-fo" data-flag="demo" type="button"><i></i><span>含可运行示范</span></button>' +
      '<button class="tg-fo" data-flag="fav" type="button"><i></i><span>已收藏</span></button>' +
      '<button class="tg-fo" data-flag="imp" type="button"><i></i><span>本地导入</span></button></div>' +
      '</aside>' +

      /* ---- 右内容 ---- */
      '<div class="tg-cmain">' +
      '<div class="tg-ctool">' +
      '<span class="cnt"><b id="cq-count">' + list.length + '</b> 个案例</span>' +
      '<span class="tg-ctool-spacer" aria-hidden="true"></span>' +
      '<select id="cq-sort" aria-label="排序"><option value="">默认排序</option><option value="stage">按作业环节</option><option value="title">按名称</option><option value="upd">最近更新</option></select>' +
      '<div class="tg-viewtog" role="group" aria-label="视图"><button data-cv="cards" class="on" type="button">卡片</button><button data-cv="list" type="button">紧凑</button></div>' +
      '<button class="btn sm ghost" id="export-json" type="button" title="导出案例库清单（JSON）">↓ 导出</button>' +
      '<button class="btn sm primary" data-import>＋ 添加案例</button>' +
      '</div>' +

      '<div id="case-cards" class="tg-cgrid">' + (cards || '<div class="tg-empty"><b>还没有任何案例注册</b></div>') + '</div>' +
      '<div class="tg-empty" id="cq-empty" hidden><b>没有符合条件的案例</b><p>调整筛选条件，或点击左侧「重置」。</p></div>' +
      '<div class="tg-pager"><span class="info" id="cq-info"></span><div class="tg-pages" id="cq-pager"></div></div>' +

      '<details class="tg-val"><summary>' +
      '<span class="st"><span class="ok-mark">✓ ' + sum.ok + '</span><span style="color:var(--warn)">! ' + sum.warn + '</span><span class="bad-mark">✕ ' + sum.err + '</span></span>' +
      '校验中心 · 逐案例契约检查 <span class="ar">›</span></summary>' +
      '<div class="tg-val-b"><table><thead><tr><th style="width:220px">案例 id</th><th>未通过的检查项</th></tr></thead><tbody>' + valRows + '</tbody></table>' +
      '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" id="rerun">重新校验</button>' +
      '<a class="btn sm ghost" href="#/guide">查看接入规范</a></div></div></details>' +

      (blocked.length ? '<details class="tg-val"><summary>已删除的插件案例（' + blocked.length + '）<span class="ar">›</span></summary><div class="tg-val-b" style="display:flex;gap:8px;flex-wrap:wrap;padding-top:12px">' +
        blocked.map(function (id) {
          return '<span class="tag"><span class="mono">' + esc(id) + '</span><a href="#" data-restore-case="' + esc(id) + '" style="color:var(--jade-d);font-weight:600">恢复</a></span>';
        }).join('') + '</div></details>' : '') +

      '<details class="tg-val"><summary>还有 ' + pending.length + ' 个场景等待接入 <span class="ar">›</span></summary>' +
      '<div class="tg-val-b" style="padding-top:12px;display:flex;gap:6px;flex-wrap:wrap">' +
      pending.slice(0, 30).map(function (sc) {
        return '<a class="tag" href="#/scene/' + sc.id + '">' + esc(sc.name) + '</a>';
      }).join('') + (pending.length > 30 ? '<span class="tag">… 另有 ' + (pending.length - 30) + ' 个</span>' : '') +
      '</div></details>' +

      '<div class="tg-tbl" id="case-table" hidden><div class="matrix-wrap" style="border-radius:12px"><table class="sys-table"><thead><tr>' +
      '<th>案例 id</th><th>绑定场景</th><th>技术</th><th>版本</th><th>更新</th><th>校验</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
      '</div></div></div></main>';
  }

  function bindCases(root) {
    var cardsEl = root.querySelector('#case-cards');
    if (!cardsEl) return;
    var tblEl = root.querySelector('#case-table');
    var cards = [].slice.call(cardsEl.querySelectorAll('.tg-cc'));
    var q = parseHash().q || {};
    var st = { q: '', stage: q.stage || '', m: q.m || '', state: '', demo: 0, fav: 0, imp: 0, sort: '', page: 1, per: 12, view: 'cards' };

    var ftog = root.querySelector('#tg-ftog');
    if (ftog) ftog.addEventListener('click', function () {
      var box = root.querySelector('#tg-filter');
      var open = box.classList.toggle('open');
      ftog.setAttribute('aria-expanded', open ? 'true' : 'false');
      ftog.querySelector('span').textContent = open ? '收起' : '展开';
    });
    var qIn = root.querySelector('#cq-q');
    var sortSel = root.querySelector('#cq-sort');
    if (qIn && q.m) qIn.value = '';

    function match(el) {
      if (st.stage && el.getAttribute('data-st') !== st.stage) return false;
      if (st.m && (el.getAttribute('data-m') || '').split(' ').indexOf(st.m) < 0) return false;
      if (st.state && el.getAttribute('data-state') !== st.state) return false;
      if (st.demo && el.getAttribute('data-demo') !== '1') return false;
      if (st.fav && !isFav(el.getAttribute('data-scene'))) return false;
      if (st.imp && el.getAttribute('data-imp') !== '1') return false;
      if (st.q && (el.getAttribute('data-q') || '').toLowerCase().indexOf(st.q) < 0) return false;
      return true;
    }

    function sorted() {
      var arr = cards.filter(match);
      if (st.sort === 'stage') arr.sort(function (a, b) { return (+a.getAttribute('data-stidx')) - (+b.getAttribute('data-stidx')); });
      else if (st.sort === 'title') arr.sort(function (a, b) { return (a.getAttribute('data-title') || '').localeCompare(b.getAttribute('data-title') || '', 'zh'); });
      else if (st.sort === 'upd') arr.sort(function (a, b) { return (b.getAttribute('data-upd') || '').localeCompare(a.getAttribute('data-upd') || ''); });
      return arr;
    }

    function renderPager(total) {
      var pages = Math.max(1, Math.ceil(total / st.per));
      if (st.page > pages) st.page = pages;
      var box = root.querySelector('#cq-pager');
      var info = root.querySelector('#cq-info');
      if (info) info.textContent = total ? ('第 ' + ((st.page - 1) * st.per + 1) + '—' + Math.min(total, st.page * st.per) + ' 条 / 共 ' + total + ' 条') : '没有匹配结果';
      if (!box) return;
      var h = '<button data-pg="' + (st.page - 1) + '"' + (st.page <= 1 ? ' disabled' : '') + '>‹</button>';
      for (var i = 1; i <= pages; i++) {
        if (pages > 7 && i > 2 && i < pages - 1 && Math.abs(i - st.page) > 1) {
          if (i === 3 || i === pages - 2) h += '<button disabled>…</button>';
          continue;
        }
        h += '<button data-pg="' + i + '"' + (i === st.page ? ' class="on"' : '') + '>' + i + '</button>';
      }
      h += '<button data-pg="' + (st.page + 1) + '"' + (st.page >= pages ? ' disabled' : '') + '>›</button>';
      box.innerHTML = h;
    }

    function apply() {
      var arr = sorted();
      var total = arr.length;
      var start = (st.page - 1) * st.per, end = start + st.per;
      cards.forEach(function (c) { c.style.display = 'none'; });
      arr.forEach(function (c, i) {
        if (i >= start && i < end) c.style.display = '';
        cardsEl.appendChild(c);
      });
      var cnt = root.querySelector('#cq-count');
      if (cnt) cnt.textContent = total;
      var emp = root.querySelector('#cq-empty');
      if (emp) emp.hidden = total > 0;
      renderPager(total);
      syncHash();
    }

    function syncHash() {
      var parts = [];
      if (st.stage) parts.push('stage=' + st.stage);
      if (st.m) parts.push('m=' + st.m);
      setHashQuiet('#/cases' + (parts.length ? '?' + parts.join('&') : ''));
    }

    /* 左侧筛选按钮 */
    function setGroup(attr, val) {
      [].forEach.call(root.querySelectorAll('.tg-fo[' + attr + ']'), function (b) {
        b.classList.toggle('on', (b.getAttribute(attr) || '') === val);
      });
    }
    [].forEach.call(root.querySelectorAll('.tg-fo[data-st]'), function (b) {
      b.addEventListener('click', function () {
        st.stage = b.getAttribute('data-st'); st.page = 1;
        setGroup('data-st', st.stage); apply();
      });
    });
    [].forEach.call(root.querySelectorAll('.tg-fo[data-m]'), function (b) {
      b.addEventListener('click', function () {
        st.m = b.getAttribute('data-m'); st.page = 1;
        setGroup('data-m', st.m); apply();
      });
    });
    [].forEach.call(root.querySelectorAll('.tg-fo[data-state]'), function (b) {
      b.addEventListener('click', function () {
        st.state = b.getAttribute('data-state'); st.page = 1;
        setGroup('data-state', st.state); apply();
      });
    });
    [].forEach.call(root.querySelectorAll('.tg-fo[data-flag]'), function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-flag');
        st[f] = st[f] ? 0 : 1;
        b.classList.toggle('on', !!st[f]);
        st.page = 1; apply();
      });
    });
    if (qIn) qIn.addEventListener('input', function () { st.q = qIn.value.trim().toLowerCase(); st.page = 1; apply(); });
    if (sortSel) sortSel.addEventListener('change', function () { st.sort = sortSel.value; st.page = 1; apply(); });

    var reset = root.querySelector('#cq-reset');
    if (reset) reset.addEventListener('click', function () {
      st = { q: '', stage: '', m: '', state: '', demo: 0, fav: 0, imp: 0, sort: '', page: 1, per: 12, view: st.view };
      if (qIn) qIn.value = '';
      if (sortSel) sortSel.value = '';
      setGroup('data-st', ''); setGroup('data-m', ''); setGroup('data-state', '');
      [].forEach.call(root.querySelectorAll('.tg-fo[data-flag]'), function (b) { b.classList.remove('on'); });
      apply();
    });

    var pg = root.querySelector('#cq-pager');
    if (pg) pg.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pg]');
      if (!b || b.disabled) return;
      st.page = +b.getAttribute('data-pg'); apply();
      var y = root.querySelector('.tg-cmain').getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: y, behavior: scrollBehavior() });
    });

    /* 视图切换 */
    var vbtns = root.querySelectorAll('.tg-viewtog [data-cv]');
    [].forEach.call(vbtns, function (b) {
      b.addEventListener('click', function () {
        st.view = b.getAttribute('data-cv');
        [].forEach.call(vbtns, function (x) { x.classList.toggle('on', x === b); });
        cardsEl.classList.toggle('compact', st.view === 'list');
        if (tblEl) tblEl.hidden = true;
      });
    });

    /* 导出 JSON */
    var ex = root.querySelector('#export-json');
    if (ex) ex.addEventListener('click', function () {
      var data = {
        exportedAt: new Date().toISOString(),
        site: '油链天工 Tiangong Petro Atlas',
        stats: Cases.stats(),
        cases: list0().map(function (c) {
          var sc = A.index.byScene[c.sceneId] || {};
          return { id: c.id, title: c.title, scene: sc.name, stage: sc.stageName, methods: c.methods || sc.methods || [], version: c.version, updated: c.updated };
        })
      };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'tiangong-case-registry.json';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1200);
    });
    function list0() { return Cases.list(); }

    var rb = root.querySelector('#rerun');
    if (rb) rb.addEventListener('click', render);

    /* URL 初始化 */
    if (st.stage) setGroup('data-st', st.stage);
    if (st.m) setGroup('data-m', st.m);
    apply();
  }

  /* =========================================================
     九、接入指南
     ========================================================= */
  function docCode(src, file) {
    return '<div class="tg-code"><div class="tg-code-h"><span class="dots"><i></i><i></i><i></i></span>' +
      '<span class="fn">' + esc(file || 'snippet.js') + '</span>' +
      '<button class="cp" data-copy type="button">复制</button></div>' +
      '<pre>' + K.highlight(src) + '</pre></div>';
  }

  function guideHTML() {
    var sample = [
      "Cases.register({",
      "  id: 'logging-mud-loss',          // 必填，kebab-case，全局唯一",
      "  sceneId: 'd3',                    // 必填，data.js 里已有的场景 id",
      "  title: '钻井液漏失层位识别',",
      "  status: 'ready',                  // ready | draft",
      "  version: '1.0.0',",
      "  updated: '2026-10-22',",
      "",
      "  tabs: {",
      "    // ① 专业背景：四段式，返回 HTML 字符串",
      "    background: {",
      "      label: '专业背景',",
      "      judge: [",
      "        { label: '任务', value: '序列分割' },",
      "        { label: '数据', value: '随钻曲线 + 漏失记录' }",
      "      ],",
      "      lede: '一句话说明这个场景到底在做什么。',",
      "      sections: [",
      "        { no: 1, en: 'PROBLEM', title: '当前做法与问题', html: '……' },",
      "        { no: 2, en: 'INTERVENTION', title: 'AI 能做什么', html: '……' },",
      "        { no: 3, en: 'DATA', title: '你需要准备什么', html: K.checklist([...]) },",
      "        { no: 4, en: 'DIFFICULTY', title: '技术难度与参考方向', html: '……' }",
      "      ]",
      "    },",
      "",
      "    // ② 案例流程：一条真实项目走过的路",
      "    workflow: {",
      "      title: '某某区块 18 口井的漏失识别',",
      "      lead: ['项目目标不是做模型，而是把漏失层位定位时间压到 10 分钟。'],",
      "      stats: [['样本井', '18 口'], ['目标准确率', '85%']],",
      "      steps: [{ name: '数据对齐', do: '……', role: '工程环节', effect: '……', trap: '……' }],",
      "      fails: [{ name: '标签滞后', why: '……' }]",
      "    },",
      "",
      "    // ③ 可运行示范（可选）：给一个 DOM 容器就能跑",
      "    demo: {",
      "      mount: function (root, ctx) {",
      "        root.innerHTML = '<div>……</div>';",
      "        // ctx.scene / ctx.kase / ctx.K / ctx.atlas 都可直接用",
      "      },",
      "      unmount: function () { /* 清理定时器、事件监听 */ }",
      "    }",
      "  }",
      "});"
    ].join('\n');

    var judgeSample = [
      "judge: [",
      "  { label: '任务',   value: '序列分割',      desc: '逐深度点判别是否漏失' },",
      "  { label: '输入',   value: '随钻曲线',      desc: '立管压力 / 排量 / 钻时' },",
      "  { label: '输出',   value: '漏失层段',      desc: '层段 + 置信度' },",
      "  { label: '验收',   value: '层段命中率',    desc: '按井统计，不看逐点精度' }",
      "]"
    ].join('\n');

    var fields = [
      ['id', '必填', '全局唯一标识，kebab-case。会显示在场景页头部与控制台里。'],
      ['sceneId', '必填', '绑定到 data.js 中的某个场景 id。校验会检查它是否存在。'],
      ['title', '必填', '案例标题，通常与场景名一致或更具体。'],
      ['status', '建议', 'ready = 可用于教学；draft = 内容未定稿，控制台标黄。'],
      ['version', '建议', '语义化版本，改了内容就升一格。'],
      ['updated', '建议', '最后更新日期，方便判断内容是否过期。'],
      ['tabs.background', '必填', '对象。judge（30 秒判断）/ lede（导语）/ sections（四段式数组）。'],
      ['tabs.background.sections[]', '必填', '每段 { no, en, title, html }。建议恰好四段，与全站一致。'],
      ['tabs.workflow', '建议', '对象。title / lead[] / stats[] / steps[] / fails[] / metrics。'],
      ['tabs.workflow.steps[]', '建议', '每步 { name, do, role, effect, trap }。role 会渲染成小标签。'],
      ['tabs.demo', '可选', '对象。mount(root, ctx) 必填；unmount() 用于清理。'],
      ['tabs.demo.label', '可选', '第三个 tab 的显示名，默认「可运行示范」。']
    ].map(function (r) {
      var req = r[1] === '必填' ? '<span class="req">必填</span>'
        : r[1] === '建议' ? '<span class="opt">建议</span>' : '<span class="opt">可选</span>';
      return '<tr><td>' + esc(r[0]) + '</td><td>' + req + '</td><td>' + rich(r[2]) + '</td></tr>';
    }).join('');

    var fileTree = [
      '<b>网站/</b>',
      '├── index.html                <span class="cm">← 新增案例时加一行 script</span>',
      '├── assets/',
      '│   ├── data.js               <span class="cm">场景元数据（13 环节 / 68 场景）</span>',
      '│   ├── core/                 <span class="cm">外壳，一般不用动</span>',
      '│   │   ├── tokens.css        <span class="cm">颜色 / 字号 / 圆角</span>',
      '│   │   ├── v9.css            <span class="cm">页面版式与组件</span>',
      '│   │   ├── registry.js       <span class="cm">Cases.register 契约与校验</span>',
      '│   │   ├── kit.js            <span class="cm">K.sec4 / K.figure / K.code…</span>',
      '│   │   ├── case-demo-host.js <span class="cm">示范宿主：iframe 整页 / Shadow DOM 模块</span>',
      '│   │   ├── case-upload.js    <span class="cm">案例包导入：校验 / 打包 / 落库</span>',
      '│   │   └── shell.js          <span class="cm">路由与页面</span>',
      '│   └── cases/                <span class="dir">← 案例都放这里</span>',
      '│       ├── welllog-layer.case.js   <span class="new">测井分层（示例）</span>',
      '│       ├── welllog-layer.demo.js   <span class="new">它的可运行示范</span>',
      '│       ├── _template.case.js       <span class="new">插件模板，复制它开始</span>',
      '│       └── _template.case.json     <span class="new">清单模板</span>',
      '└── docs/',
      '    └── 如何添加新案例.md      <span class="cm">本页的离线版</span>'
    ].join('\n');

    var nav = [
      ['gs1', '01', '快速开始'],
      ['gs2', '02', '标准文件结构'],
      ['gs3', '03', '元数据配置'],
      ['gs4', '04', '案例页面开发'],
      ['gs5', '05', '接入验证'],
      ['gs6', '06', '常见问题']
    ].map(function (x) {
      return '<a href="#' + x[0] + '" data-goto="' + x[0] + '"><i>' + x[1] + '</i>' + x[2] + '</a>';
    }).join('');

    var toc = [
      ['gs1', '两条接入路径'],
      ['gs1', '三步接入'],
      ['gs2', '目录结构'],
      ['gs2', '文件职责'],
      ['gs3', '契约字段'],
      ['gs3', '四段式内容'],
      ['gs4', '代码骨架'],
      ['gs4', '工具箱 K.*'],
      ['gs5', '校验规则'],
      ['gs5', '四个常踩的坑'],
      ['gs6', '常见问题']
    ].map(function (x) {
      return '<a href="#' + x[0] + '" data-goto="' + x[0] + '">' + x[1] + '</a>';
    }).join('');

    var kitRows = [
      ['K.sec4(no, en, title, html)', '四段式中的一段，带编号与英文小标'],
      ['K.figure(svg, no, caption)', '插图 + 图注，图注支持 **粗体**'],
      ['K.judge([{label,value,desc}])', '页面顶部那排「30 秒判断」格子'],
      ['K.checklist(items)', '可勾选的数据准备清单，items 为 [名称, 规格, 标注要求]'],
      ['K.dtable(head, rows)', '普通数据表格'],
      ['K.pipeline(steps)', '带编号的流程步骤，每步可写效果与坑'],
      ['K.fails([{name, why}])', '失败模式四宫格'],
      ['K.cells([[标签, 值]])', '流程页右侧的指标格'],
      ['K.meter(diff)', '三段式难度条'],
      ['K.refs([...], href)', '参考方向胶囊'],
      ['K.callout(text, "warn")', '提示条']
    ].map(function (r) {
      return '<tr><td>' + esc(r[0]) + '</td><td>' + rich(r[1]) + '</td></tr>';
    }).join('');

    return '<main>' +
      '<section class="tg-guidehead"><div class="wrap">' +
      '<span class="kicker">EXTENDING · 开发者文档</span>' +
      '<h1>如何接入一个新的 AI 案例</h1>' +
      '<p>两条路：不写代码就上传案例包；需要真实算法示范时才写插件。两条路走完，效果一样——场景页自动长出 tab，检索路径自动收录。</p>' +
      '<div class="meta"><span class="tag">6 个步骤</span><span class="tag">3 个文件</span><span class="tag">无需后端</span><span class="tag">纯静态部署</span></div>' +
      '</div></section>' +

      '<div class="wrap"><div class="tg-doc">' +
      '<aside class="tg-doc-nav"><h5>ON THIS PAGE</h5>' + nav +
      '<div class="note"><b>先读这一句</b>不要修改案例内部的独立演示系统；只按契约提供三块内容，外壳会自动接管版式。</div></aside>' +

      '<div class="tg-doc-body">' +

      /* ---------- 1 ---------- */
      '<section class="tg-doc-sec" id="gs1"><div class="dh"><span class="n">01</span><h2>快速开始</h2><span class="en">QUICK START</span></div>' +
      '<p>先判断你要做哪一种：只讲清楚「业务问题 + 技术方案」，用上传包就够了；需要让人在浏览器里拖动参数、看到算法实时出结果，才写插件。</p>' +
      '<div class="tg-ways">' +
      '<div class="tg-way"><div class="t">PATH A · 推荐</div><h4>上传案例包</h4>' +
      '<p>一个文件夹：<code>case.json</code> 清单 + 任意演示文件。HTML 会自动内联 CSS/JS，图片转为内嵌资源，双击也能跑。</p>' +
      '<div class="acts"><button class="btn sm primary" data-import>＋ 打开「添加案例」</button>' +
      '<button class="btn sm" data-dl-template>↓ 下载模板 zip</button></div></div>' +
      '<div class="tg-way"><div class="t">PATH B · 需要真实演示时</div><h4>写一个案例插件</h4>' +
      '<p>复制 <code>_template.case.js</code>，改 <code>id</code>、<code>sceneId</code> 与三块内容，在 index.html 挂一行 script。</p>' +
      '<div class="acts"><a class="btn sm" href="#/cases">看现有案例 →</a></div></div>' +
      '</div>' +
      '<h3>三步接入</h3>' +
      '<div class="tg-steps">' +
      '<div class="tg-step"><span class="sn">1</span><div><h4>选定场景</h4><p>案例必须挂到 <b>data.js 里已经存在的场景</b> 上。场景决定了它的环节、技术标签与检索入口。找不到合适的场景时，先在对应环节的 scenes 数组里补一条元数据。</p></div></div>' +
      '<div class="tg-step"><span class="sn">2</span><div><h4>填三块内容</h4><p>专业背景（四段式）→ 案例流程（一条真实项目走过的路）→ 可运行示范（可选）。三块都是纯数据，不要写死样式。</p></div></div>' +
      '<div class="tg-step"><span class="sn">3</span><div><h4>注册并校验</h4><p>加载顺序必须是 <b>data.js → registry.js → kit.js → 案例 → shell.js</b>。刷新后进案例库，逐项校验会自动跑一遍。</p></div></div>' +
      '</div></section>' +

      /* ---------- 2 ---------- */
      '<section class="tg-doc-sec" id="gs2"><div class="dh"><span class="n">02</span><h2>标准文件结构</h2><span class="en">STRUCTURE</span></div>' +
      '<p>整个站点是纯静态的：没有构建步骤，也没有后端。案例只占 <code>assets/cases/</code> 一个目录，与外壳完全解耦。</p>' +
      '<div class="tg-tree"><div class="tg-tree-h"><span class="mono">TREE</span><span style="margin-left:auto">网站根目录</span></div><pre>' + fileTree + '</pre></div>' +
      '<h3>文件职责</h3>' +
      '<ul>' +
      '<li><b>data.js</b>：13 个环节与 68 个场景的元数据，是检索与矩阵的唯一事实来源。</li>' +
      '<li><b>registry.js</b>：<code>Cases.register()</code> 契约、静态校验、按场景索引案例。</li>' +
      '<li><b>kit.js</b>：内容生产工具箱，四段式、图注、清单、代码块都由它生成，改版式全站同步。</li>' +
      '<li><b>shell.js</b>：路由与页面骨架；案例不需要也不应该改这里。</li>' +
      '</ul></section>' +

      /* ---------- 3 ---------- */
      '<section class="tg-doc-sec" id="gs3"><div class="dh"><span class="n">03</span><h2>元数据配置</h2><span class="en">METADATA</span></div>' +
      '<p>只有标「必填」的字段缺失会报错，其余缺失只是一条提醒。字段名区分大小写。</p>' +
      '<div class="tg-fields"><table><thead><tr><th>字段</th><th>级别</th><th>说明</th></tr></thead><tbody>' + fields + '</tbody></table></div>' +
      '<h3>「30 秒判断」怎么写</h3>' +
      '<p>页面顶部那四格决定读者要不要继续往下看。写任务类型、输入、输出与验收口径，不要写模型名。</p>' +
      docCode(judgeSample, 'tabs.background.judge') +
      '<p>四段式正文建议严格四段：<b>当前做法与问题 → AI 能做什么 → 你需要准备什么 → 技术难度与参考方向</b>。段数不一致会让不同案例的阅读节奏参差。</p>' +
      '</section>' +

      /* ---------- 4 ---------- */
      '<section class="tg-doc-sec" id="gs4"><div class="dh"><span class="n">04</span><h2>案例页面开发</h2><span class="en">DEVELOPMENT</span></div>' +
      '<p>最小可用的声明骨架如下。把省略号换成你的内容，其余结构照抄即可。</p>' +
      docCode(sample, 'assets/cases/your-case.case.js') +
      '<h3>在 index.html 挂载</h3>' +
      '<p>找到页面底部的脚本区，在你的案例文件后面加一行（必须在 <code>shell.js</code> 之前）：</p>' +
      docCode('<scr' + 'ipt src="assets/cases/your-case.case.js"><' + '/scr' + 'ipt>', 'index.html') +
      '<h3>内容用工具箱写，不要写 CSS</h3>' +
      '<p>所有 <code>K.*</code> 函数都会自动转义 HTML，并支持 <b>**粗体**</b> 与 <b>`等宽`</b> 两种轻量标记。</p>' +
      '<div class="tg-fields"><table><thead><tr><th>函数</th><th>用途</th></tr></thead><tbody>' + kitRows + '</tbody></table></div>' +
      '<div class="callout"><span class="ci">约束</span><span>案例里不要写死颜色与字号。需要强调时用 <b>var(--c-cv)</b> 这类令牌，才能跟着全站换肤。</span></div>' +
      '</section>' +

      /* ---------- 5 ---------- */
      '<section class="tg-doc-sec" id="gs5"><div class="dh"><span class="n">05</span><h2>接入验证</h2><span class="en">VALIDATION</span></div>' +
      '<p>刷新页面后，注册表会对每个案例做一次静态检查。任何一项不通过都会在案例库的校验中心列出，不影响其它案例加载。</p>' +
      '<h3>会被检查的项目</h3>' +
      '<ul>' +
      '<li><b>id 规范</b>：小写字母 / 数字 / 连字符，全局唯一，不允许下划线或空格。</li>' +
      '<li><b>sceneId 存在</b>：必须在 data.js 的场景索引里，拼错不会抛异常，只会让案例永远不出现。</li>' +
      '<li><b>title 非空</b>：列表、面包屑与页面标题都用它。</li>' +
      '<li><b>background.sections</b>：至少一段，建议恰好四段；每段必须有 title 与 html。</li>' +
      '<li><b>demo.mount</b>：如果声明了 demo，mount 必须是函数；否则示范 tab 会挂载失败。</li>' +
      '<li><b>demo 标记一致</b>：场景元数据里的 demo 标记要与案例实际是否带示范保持一致。</li>' +
      '<li><b>version / updated</b>：格式建议语义化版本与 ISO 日期，便于判断内容是否过期。</li>' +
      '</ul>' +
      '<h3>四个常踩的坑</h3>' +
      '<div class="tg-faq">' +
      '<details><summary>script 顺序放反了</summary><div class="ans">案例写在 <b>shell.js</b> 后面，页面已经渲染完才注册，控制台能看到案例但场景页没有 tab。案例脚本必须在 shell.js 之前。</div></details>' +
      '<details><summary>sceneId 拼错</summary><div class="ans">id 区分大小写。写错不会报 JS 错误，只是这个案例永远不出现；案例库的「绑定场景」列会显示 <b>⚠ 场景未匹配</b>。</div></details>' +
      '<details><summary>demo 里没有清理</summary><div class="ans">用 <b>setInterval</b> / <b>addEventListener</b> 的示范要在 unmount 里清掉，否则切换场景后老定时器还在后台跑，参数面板会串。</div></details>' +
      '<details><summary>把样式写死在案例里</summary><div class="ans">内联颜色会让案例在换肤时掉队。颜色一律用 <b>var(--jade)</b> 这类令牌，或干脆用 K.* 生成结构。</div></details>' +
      '</div></section>' +

      /* ---------- 6 ---------- */
      '<section class="tg-doc-sec" id="gs6"><div class="dh"><span class="n">06</span><h2>常见问题</h2><span class="en">FAQ</span></div>' +
      '<div class="tg-faq">' +
      '<details><summary>一个场景可以挂多个案例吗？</summary><div class="ans">可以。同一 <b>sceneId</b> 注册多个不同 <b>id</b> 的案例即可，场景页会出现案例切换器，案例库也会分别列出。</div></details>' +
      '<details><summary>上传的案例保存在哪里？</summary><div class="ans">保存在本机浏览器的 <b>localStorage</b>，换电脑或清缓存会丢失。要永久发布给所有人，请走插件路径写进 <b>assets/cases/</b>。</div></details>' +
      '<details><summary>案例数量和方法数为什么对不上？</summary><div class="ans">一个场景可以同时带多个技术标签，所以五类方法的场景数之和大于去重后的场景数。全站统计口径以「场景」去重，矩阵右下角的关联合计是标签次数。</div></details>' +
      '<details><summary>可以给案例加自己的图表库吗？</summary><div class="ans">可以，但建议优先用原生 SVG / Canvas。站点本身零依赖，引入大型图表库会让首屏变慢，也会和全站视觉语言打架。</div></details>' +
      '<details><summary>怎么删除一个案例？</summary><div class="ans">插件案例在案例库工具栏的「删除」里操作，只会隐藏、文件仍在磁盘上，可随时恢复；上传案例的「移除」会清掉本机存档。</div></details>' +
      '</div>' +
      '<div class="tg-way" style="margin-top:18px"><div class="t">NEXT</div><h4>从最简单的案例开始</h4>' +
      '<p>如果还没想好做什么，先挑一个数据现成、任务边界清晰的场景：四段式写满、流程写三步、示范可以先不做。一个只有 80 行内容的案例，也比一个空着的场景有用。</p>' +
      '<div class="acts"><a class="btn sm primary" href="#/cases">看当前案例库 →</a><a class="btn sm" href="#/scene/w1">对照测井分层的写法</a></div></div>' +
      '</section>' +

      '</div>' +

      '<aside class="tg-doc-toc"><h5>本页目录</h5>' + toc +
      '<div class="card"><b>关键约束</b>不改 data.js 结构 · 不改外壳 · 不写死颜色 · 不伪造运行结果</div></aside>' +
      '</div></div></main>';
  }

  function bindGuide(root) {
    var links = [].slice.call(root.querySelectorAll('[data-goto]'));
    var secs = [].slice.call(root.querySelectorAll('.tg-doc-sec'));
    if (!secs.length) return;

    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var t = document.getElementById(a.getAttribute('data-goto'));
        if (t) {
          var y = t.getBoundingClientRect().top + window.scrollY - 84;
          window.scrollTo({ top: y, behavior: scrollBehavior() });
        }
      });
    });

    if ('IntersectionObserver' in window) {
      var navA = [].slice.call(root.querySelectorAll('.tg-doc-nav a'));
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting) return;
          navA.forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-goto') === en.target.id); });
        });
      }, { rootMargin: '-15% 0px -72% 0px' });
      secs.forEach(function (s) { io.observe(s); });
      pageCleanups.push(function () { io.disconnect(); });
    }

    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-copy]');
      if (!b) return;
      var code = b.closest('.tg-code');
      var pre = code && code.querySelector('pre');
      if (!pre) return;
      var txt = pre.textContent;
      var done = function () { var o = b.textContent; b.textContent = '已复制 ✓'; setTimeout(function () { b.textContent = o; }, 1400); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
      else {
        var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (err) { } ta.remove(); done();
      }
    });
  }

  /* =========================================================
     十、调度
     ========================================================= */
  function unmountCurrent() {
    if (mounted && mounted.unmount) {
      try { mounted.unmount(); } catch (e) { }
    }
    mounted = null;
    mountedKey = '';
  }

  function bindReveal(scope) {
    var els = scope.querySelectorAll('.rv');
    if (!els.length) return;
    function show(el) { el.classList.remove('rv-pending'); el.classList.add('on'); }
    if (!('IntersectionObserver' in window) || (motionQuery && motionQuery.matches)) {
      [].forEach.call(els, show);
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } });
    }, { threshold: 0, rootMargin: '0px 0px 48px 0px' });
    [].forEach.call(els, function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight || el.classList.contains('on')) show(el);
      else { el.classList.add('rv-pending'); io.observe(el); }
    });
    pageCleanups.push(function () { io.disconnect(); [].forEach.call(els, show); });
  }
  function bindHome(view) {
    pageCleanups.push(global.HomeHero.bind(view));
    if (global.HomeChainMotion) pageCleanups.push(global.HomeChainMotion.bind(view));
    /* ---- 首屏关系网络：悬停高亮 / 点击跳转 ---- */
    var net = view.querySelector('#tg-net');
    if (net) {
      var tip = net.querySelector('#tg-net-tip');
      var svg = net.querySelector('svg');
      var links = [].slice.call(svg.querySelectorAll('.tn-link'));
      var mnodes = [].slice.call(svg.querySelectorAll('.tn-m'));
      var snodes = [].slice.call(svg.querySelectorAll('.tn-s'));
      var cnt = A.countByStageMethod();

      function clear() {
        net.classList.remove('focus');
        [].forEach.call(svg.querySelectorAll('.hl'), function (x) { x.classList.remove('hl'); });
        if (tip) tip.classList.remove('on');
      }

      function focusStage(id) {
        var st = A.index.byStage[id];
        if (!st) return;
        net.classList.add('focus');
        [].forEach.call(svg.querySelectorAll('.hl'), function (x) { x.classList.remove('hl'); });
        links.forEach(function (l) { if (l.getAttribute('data-s') === id) l.classList.add('hl'); });
        snodes.forEach(function (n) { if (n.getAttribute('data-s') === id) n.classList.add('hl'); });
        var used = [];
        mnodes.forEach(function (n) {
          var k = n.getAttribute('data-m');
          if ((cnt[id][k] || 0) > 0) { n.classList.add('hl'); used.push({ k: k, n: cnt[id][k] }); }
        });
        if (tip) {
          tip.innerHTML = '<b>' + esc(st.name) + '</b><span>' + st.scenes.length + ' 个场景 · ' + tgCasesOfStage(st) +
            ' 个案例 · 点击进入环节</span><span class="tpm">' + used.map(function (x) {
              return '<i style="--mc:var(--c-' + (M[x.k].colorKey || x.k) + ')">' + M[x.k].abbr + ' ×' + x.n + '</i>';
            }).join('') + '</span>';
          tip.classList.add('on');
        }
      }

      svg.addEventListener('mouseover', function (e) {
        var g = e.target.closest ? e.target.closest('.tn-s') : null;
        if (g) focusStage(g.getAttribute('data-s'));
      });
      svg.addEventListener('mouseleave', clear);
      svg.addEventListener('click', function (e) {
        var s = e.target.closest ? e.target.closest('.tn-s') : null;
        if (s) { location.hash = '#/stage/' + s.getAttribute('data-s'); return; }
        var m = e.target.closest ? e.target.closest('.tn-m') : null;
        if (m) { location.hash = '#/method/' + m.getAttribute('data-m'); }
      });
    }

    /* ---- 流程节点：悬停切换环节速览 ---- */
    var detail = view.querySelector('#tg-stage-detail');
    var fnodes = [].slice.call(view.querySelectorAll('.tg-flow .tg-node'));
    fnodes.forEach(function (n) {
      var enter = function () {
        var st = A.index.byStage[n.getAttribute('data-s')];
        if (!st || !detail) return;
        fnodes.forEach(function (x) { x.classList.toggle('sel', x === n); });
        detail.outerHTML = stageDetailHTML(st);
        detail = view.querySelector('#tg-stage-detail');
      };
      n.addEventListener('mouseenter', enter);
      n.addEventListener('focus', enter);
      n.addEventListener('mouseleave', function () { n.classList.remove('sel'); });
    });

    /* ---- 矩阵：模式切换 / 行列联动 / 信息条 ---- */
    var mx = view.querySelector('.mxv');
    if (!mx) return;
    mx.addEventListener('click', function (e) {
      var b = e.target.closest('.tg-mx-modes button');
      if (!b) return;
      e.preventDefault();
      [].forEach.call(mx.querySelectorAll('.tg-mx-modes button'), function (x) { x.classList.toggle('on', x === b); });
      mx.classList.toggle('mx-pct', b.getAttribute('data-mode') === 'p');
    });
    var info = mx.querySelector('#mx-info');
    var def = info ? info.textContent : '';
    mx.addEventListener('mouseover', function (e) {
      var c = e.target.closest('.mx-c, .mx-h, .mx-r');
      if (!c) return;
      var r = c.getAttribute('data-r'), cc = c.getAttribute('data-c');
      [].forEach.call(mx.querySelectorAll('[data-r],[data-c]'), function (x) {
        var xr = x.getAttribute('data-r'), xc = x.getAttribute('data-c');
        x.classList.toggle('hl', !!((r && xr === r) || (cc && xc === cc)));
      });
      if (info && c.classList.contains('mx-c') && r && cc) {
        var st = A.index.byStage[r];
        var v = c.querySelector('.mx-v');
        info.textContent = (st ? st.name : '') + ' × ' + (M[cc] ? M[cc].name : cc) + '：' + (v ? v.textContent : '?') + ' 个场景标签 · 点击筛选案例';
      }
    });
    mx.addEventListener('mouseleave', function () {
      [].forEach.call(mx.querySelectorAll('.hl'), function (x) { x.classList.remove('hl'); });
      if (info) info.textContent = def;
    });
  }

  function render() {
    var r = parseHash();
    var p = r.parts;
    pageCleanups.splice(0).forEach(function (cleanup) { cleanup(); });
    unmountCurrent();
    window.scrollTo(0, 0);

    var html;
    if (!p.length) html = homeHTML();
    else if (p[0] === 'chain') html = chainHTML();
    else if (p[0] === 'cases') html = casesHTML();
    else if (p[0] === 'guide') html = guideHTML();
    else if (p[0] === 'admin') html = global.Admin ? global.Admin.route(p, r.q) : notFound('管理模块未加载');
    else if (p[0] === 'stage') {
      var st = A.index.byStage[p[1]];
      html = st ? stageHTML(st, r.q) : notFound('没有这个环节');
    } else if (p[0] === 'method') {
      html = methodHTML(p[1]);
    } else if (p[0] === 'scene') {
      var sc = A.index.byScene[p[1]];
      html = sc ? sceneHTML(sc, r.q) : notFound('没有这个场景');
    } else html = notFound('页面不存在');

    view.innerHTML = header() + html + footer();
    document.body.dataset.page = p[0] || 'home';
    document.documentElement.classList.toggle('tg-admin-mode', p[0] === 'admin');

    bindReveal(view);
    if (window.I18N) I18N.apply(view);
    if (global.Theme) global.Theme.syncButtons(view);
    if (!p.length) bindHome(view);

    if (p[0] === 'stage') bindFilters(view);
    if (p[0] === 'stage' && p[1] === 'drilling') mountDrillingCinema(view, 'drilling');
    if (p[0] === 'chain') bindChain(view);
    if (p[0] === 'cases') bindCases(view);
    if (p[0] === 'guide') bindGuide(view);
    if (p[0] === 'scene') pushRecent(p[1]);
    if (p[0] === 'scene') {
      var sc2 = A.index.byScene[p[1]];
      var all2 = sc2 && Cases.bySceneAll(sc2.id);
      var c2 = all2 && all2.filter(function (x) { return x.id === r.q.case; })[0] || (all2 && all2[0]) || null;
      if (c2) bindTabs(sc2, c2);
      [].forEach.call(view.querySelectorAll('.case-switch [data-case]'), function (b) {
        b.addEventListener('click', function () {
          var tab = parseHash().q.tab;
          go('#/scene/' + sc2.id + '?case=' + b.dataset.case + (tab ? '&tab=' + tab : ''));
        });
      });
    }
    if (p[0] === 'cases') {
      var rb = document.getElementById('rerun');
      if (rb) rb.addEventListener('click', render);
    }
    if (p[0] === 'admin' && global.Admin) global.Admin.bind(view);
    document.title = pageTitle(p) + ' · 油链天工';
    queueScrollUI();
  }

  function pageTitle(p) {
    if (!p.length) return '总览';
    if (p[0] === 'scene') pushRecent(p[1]);
    if (p[0] === 'scene') { var s = A.index.byScene[p[1]]; return s ? s.name : '场景'; }
    if (p[0] === 'stage') { var t = A.index.byStage[p[1]]; return t ? t.name : '环节'; }
    if (p[0] === 'method') return M[p[1]] ? M[p[1]].name : '方法';
    if (p[0] === 'admin') return global.Admin && global.Admin.loggedIn() ? '管理后台' : '管理员登录';
    return { chain: '作业链', cases: '案例库', guide: '接入指南' }[p[0]] || '地图';
  }

  function notFound(msg) {
    return '<main class="wrap"><div class="empty" style="padding:120px 0"><b>' + esc(msg) + '</b>' +
      '检查地址，或<a href="#/" style="color:var(--jade-d)">回到总览</a>。</div></main>';
  }

  window.addEventListener('hashchange', render);

  /* 场景页键盘 Tab 切换 + 全局快捷键（R 随机 / ? 帮助） */
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var tg = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tg)) return;
    if (document.querySelector('.sp:not([hidden])') || document.querySelector('.mdl:not([hidden])')) return;
    if (e.key === 'r' || e.key === 'R') { randomScene(); return; }
    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
      var hv = document.getElementById('help-ov');
      if (!hv) {
        hv = document.createElement('div');
        hv.id = 'help-ov'; hv.className = 'sp'; hv.hidden = true;
        hv.innerHTML = '<div class="lb-bg"></div><div class="sp-p" role="dialog" aria-label="快捷键" style="width:min(430px,92vw)">' +
          '<div class="sp-bar" style="justify-content:center;font-weight:600;color:var(--ink)">键盘快捷键</div>' +
          '<div class="sp-res" style="padding:14px 20px 18px">' +
          '<div class="hk-row"><kbd>Ctrl K</kbd>全局检索（环节 / 场景 / 案例 / 技术）</div>' +
          '<div class="hk-row"><kbd>1 2 3</kbd>场景页切换 专业背景 / 案例流程 / 可运行示范</div>' +
          '<div class="hk-row"><kbd>← →</kbd>场景页循环切换 Tab</div>' +
          '<div class="hk-row"><kbd>R</kbd>随机探索一个已接入场景</div>' +
          '<div class="hk-row"><kbd>Esc</kbd>关闭面板 / 弹窗</div>' +
          '</div></div>';
        document.body.appendChild(hv);
      }
      hv.hidden = !hv.hidden;
      return;
    }
    var h = location.hash;
    if (h.indexOf('#/scene/') === 0) {
      var tabsBtns = [].slice.call(document.querySelectorAll('#tabs .tab'));
      if (!tabsBtns.length) return;
      var cur = tabsBtns.findIndex(function (b) { return b.classList.contains('on'); });
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        var b1 = tabsBtns[+e.key - 1]; if (b1) b1.click();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        var d = e.key === 'ArrowRight' ? 1 : -1;
        var nx = tabsBtns[(cur + d + tabsBtns.length) % tabsBtns.length];
        if (nx) nx.click();
      }
    }
  });

  /* 快捷键帮助面板（一次性注入） */
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-help]') || e.target.closest('#help-ov .lb-bg')) {
      var hv = document.getElementById('help-ov');
      if (!hv) {
        hv = document.createElement('div');
        hv.id = 'help-ov'; hv.className = 'sp'; hv.hidden = true;
        hv.innerHTML = '<div class="lb-bg"></div><div class="sp-p" role="dialog" aria-label="快捷键" style="width:min(430px,92vw)">' +
          '<div class="sp-bar" style="justify-content:center;font-weight:600;color:var(--ink)">键盘快捷键</div>' +
          '<div class="sp-res" style="padding:14px 20px 18px">' +
          '<div class="hk-row"><kbd>Ctrl K</kbd>全局检索（环节 / 场景 / 案例 / 技术）</div>' +
          '<div class="hk-row"><kbd>1 2 3</kbd>场景页切换 专业背景 / 案例流程 / 可运行示范</div>' +
          '<div class="hk-row"><kbd>← →</kbd>场景页循环切换 Tab</div>' +
          '<div class="hk-row"><kbd>R</kbd>随机探索一个已接入场景</div>' +
          '<div class="hk-row"><kbd>Esc</kbd>关闭面板 / 弹窗</div>' +
          '</div></div>';
        document.body.appendChild(hv);
      }
      hv.hidden = !hv.hidden;
    }
  });

  /* 全局回到顶部（带滚动进度环）+ 顶部滚动进度读条 */
  var topBtn = null, progBar = null, progFill = null, progRing = null;
  function scrollFrac() {
    var dh = document.documentElement.scrollHeight - window.innerHeight;
    return dh > 0 ? Math.min(1, Math.max(0, window.scrollY / dh)) : 0;
  }
  var scrollFrame = null;
  function queueScrollUI() {
    if (scrollFrame !== null) return;
    scrollFrame = requestAnimationFrame(function () { scrollFrame = null; updateScrollUI(); });
  }
  function updateScrollUI() {
    if (!topBtn) {
      topBtn = document.createElement('button');
      topBtn.className = 'to-top';
      topBtn.setAttribute('aria-label', '回到顶部');
      topBtn.innerHTML = '<svg class="tt-ring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" transform="rotate(-90 20 20)" stroke-dasharray="106.8" stroke-dashoffset="106.8"/></svg>' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
      topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: scrollBehavior() }); });
      document.body.appendChild(topBtn);
      progRing = topBtn.querySelector('.tt-ring circle');
    }
    if (!progBar) {
      progBar = document.createElement('div');
      progBar.className = 'scroll-prog';
      progBar.setAttribute('aria-hidden', 'true');
      progBar.innerHTML = '<i></i>';
      document.body.appendChild(progBar);
      progFill = progBar.firstChild;
    }
    var p = scrollFrac();
    topBtn.classList.toggle('on', window.scrollY > 640);
    progRing.style.strokeDashoffset = (106.8 * (1 - p)).toFixed(1);
    progFill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    var headerEl = document.querySelector('.hdr');
    if (headerEl) headerEl.classList.toggle('scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', queueScrollUI, { passive: true });
  window.addEventListener('resize', queueScrollUI, { passive: true });


  /* ---------- 全局检索面板：环节 / 场景 / 案例 / 技术四组结果 ---------- */
  var searchEl = null, searchIdx = -1, searchItems = [];
  function searchBuild(q) {
    q = String(q || '').trim().toLowerCase();
    if (!q) return { g: [], n: 0 };
    var g = [], n = 0;
    function hit(s) { return String(s || '').toLowerCase().indexOf(q) >= 0; }
    function hl(t) {
      var i = String(t).toLowerCase().indexOf(q);
      if (i < 0) return esc(t);
      return esc(t.slice(0, i)) + '<mark>' + esc(t.substr(i, q.length)) + '</mark>' + esc(t.slice(i + q.length));
    }
    var st = A.stages.filter(function (x) { return hit(x.name) || hit(x.en) || hit(x.blurb); }).slice(0, 3);
    if (st.length) g.push({ k: '作业环节', items: st.map(function (x) {
      return { t: hl(x.name), s: x.scenes.length + ' 个场景 · ' + esc(x.en), h: '#/stage/' + x.id }; }) });
    var sc = A.allScenes.filter(function (x) { return hit(x.name) || hit(x.point) || hit(x.intro) || hit(x.stageName); }).slice(0, 6);
    if (sc.length) g.push({ k: '候选场景', items: sc.map(function (x) {
      return { t: hl(x.name), s: x.stageName + ' · ' + (x.methods || []).map(function (m) { return M[m] ? M[m].abbr : ''; }).join(' '), h: '#/scene/' + x.id }; }) });
    var cs = Cases.list().filter(function (c) { return hit(c.title) || hit(c.id) || hit(c.sceneId); }).slice(0, 6);
    if (cs.length) g.push({ k: '接入案例', items: cs.map(function (c) {
      var x = A.index.byScene[c.sceneId] || {};
      return { t: hl(c.title), s: (x.stageName || '') + ' · ' + c.id + ' · v' + (c.version || ''), h: '#/scene/' + c.sceneId + '?case=' + c.id }; }) });
    var ms = Object.keys(M).filter(function (k) { return hit(M[k].name) || hit(M[k].abbr) || hit(M[k].desc); }).slice(0, 3);
    if (ms.length) g.push({ k: '技术方法', items: ms.map(function (k) {
      return { t: hl(M[k].name), s: (A.index.byMethod[k] || []).length + ' 个场景 · ' + M[k].signal, h: '#/method/' + k }; }) });
    g.forEach(function (x) { n += x.items.length; });
    return { g: g, n: n };
  }
  function searchRender(q) {
    var box = searchEl.querySelector('.sp-res');
    q = String(q || '').trim().toLowerCase();
    if (!q) {
      var rec = loadList(RECKEY).map(function (id) {
        var sc = A.index.byScene[id];
        return sc ? { t: esc(sc.name), s: sc.stageName + ' · 最近访问', h: '#/scene/' + id } : null;
      }).filter(Boolean).slice(0, 5);
      var g0 = [{ k: '探索', items: [{ t: '🎲 随机探索一个场景', s: '随时按 R 键也可以', rnd: 1 }] }];
      if (rec.length) g0.push({ k: '最近访问', items: rec });
      searchItems = []; searchIdx = -1;
      box.innerHTML = g0.map(function (grp) {
        return '<div class="sp-g"><div class="sp-gk">' + grp.k + '</div>' + grp.items.map(function (it) {
          if (it.rnd) return '<button class="sp-it" data-random type="button" style="width:100%;text-align:left;border:0;background:none;cursor:pointer;font-family:inherit"><b>' + it.t + '</b><span>' + it.s + '</span></button>';
          return '<a class="sp-it" href="' + it.h + '"><b>' + it.t + '</b><span>' + it.s + '</span></a>';
        }).join('') + '</div>';
      }).join('') + '<div class="sp-empty" style="padding:16px"><span>输入关键词检索全站 · 按 ? 查看快捷键</span></div>';
      return;
    }
    var r = searchBuild(q);
    searchItems = []; searchIdx = -1;
    if (!r.n) {
      box.innerHTML = '<div class="sp-empty">没有匹配的环节 / 场景 / 案例 / 技术<br><span>试试「断层」「示功图」「knn」「压裂」…</span></div>';
      return;
    }
    box.innerHTML = r.g.map(function (grp) {
      return '<div class="sp-g"><div class="sp-gk">' + grp.k + '</div>' + grp.items.map(function (it) {
        searchItems.push(it.h);
        return '<a class="sp-it" href="' + it.h + '"><b>' + it.t + '</b><span>' + it.s + '</span></a>';
      }).join('') + '</div>';
    }).join('');
  }
  function searchMove(d) {
    var els = searchEl.querySelectorAll('.sp-it');
    if (!els.length) return;
    if (searchIdx >= 0) els[searchIdx].classList.remove('cur');
    searchIdx = (searchIdx + d + els.length) % els.length;
    els[searchIdx].classList.add('cur');
    els[searchIdx].scrollIntoView({ block: 'nearest' });
  }
  function searchOpen() {
    if (!searchEl) {
      searchEl = document.createElement('div');
      searchEl.className = 'sp';
      searchEl.hidden = true;
      searchEl.innerHTML = '<div class="sp-bg" data-sp-close></div>' +
        '<div class="sp-p" role="dialog" aria-label="全局检索">' +
        '<div class="sp-bar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>' +
        '<input id="sp-q" type="text" placeholder="搜索环节、场景、案例、技术…（如：断层 / 示功图 / knn）" autocomplete="off">' +
        '<kbd>ESC</kbd></div>' +
        '<div class="sp-res"></div>' +
        '<div class="sp-f"><span>↑↓ 选择</span><span>↵ 打开</span><span>ESC 关闭</span></div></div>';
      document.body.appendChild(searchEl);
      searchEl.addEventListener('click', function (e) { if (e.target.closest('[data-sp-close]')) searchClose(); });
      searchEl.addEventListener('input', function (e) { if (e.target.id === 'sp-q') searchRender(e.target.value); });
      searchEl.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); searchMove(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); searchMove(-1); }
        else if (e.key === 'Enter') {
          var els = searchEl.querySelectorAll('.sp-it');
          if (searchIdx >= 0 && els[searchIdx]) location.hash = els[searchIdx].getAttribute('href').slice(1);
          else if (els.length) location.hash = els[0].getAttribute('href').slice(1);
          if (e.target && e.target.blur) e.target.blur();
          searchClose();
        }
      });
      searchEl.addEventListener('click', function (e) { if (e.target.closest('.sp-it')) searchClose(); });
    }
    searchEl.hidden = false;
    document.documentElement.classList.add('mdl-open');
    var inp = searchEl.querySelector('#sp-q');
    inp.value = ''; searchRender('');
    setTimeout(function () { inp.focus(); }, 30);
  }
  function searchClose() { if (searchEl) searchEl.hidden = true; document.documentElement.classList.remove('mdl-open'); }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-theme-toggle]') && global.Theme) { e.preventDefault(); global.Theme.toggle(); return; }
    var lg = e.target.closest('[data-lang]');
    if (lg && window.I18N) { e.preventDefault(); I18N.toggle(); return; }
    var b = e.target.closest('[data-search]');
    if (b) { e.preventDefault(); searchOpen(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && searchEl && !searchEl.hidden) searchClose();
    if (e.key === 'Escape') { var hov = document.getElementById('help-ov'); if (hov && !hov.hidden) hov.hidden = true; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchOpen(); }
  });

  /* ---------- 收藏 / 最近访问 / 随机探索 ---------- */
  var FAVKEY = 'atlas.favs', RECKEY = 'atlas.recent';
  function loadList(k) { try { var v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function saveList(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function isFav(id) { return loadList(FAVKEY).indexOf(id) >= 0; }
  function toggleFav(id) {
    var v = loadList(FAVKEY), i = v.indexOf(id);
    if (i >= 0) v.splice(i, 1); else v.push(id);
    saveList(FAVKEY, v);
    return i < 0;
  }
  function pushRecent(id) {
    var v = loadList(RECKEY).filter(function (x) { return x !== id; });
    v.unshift(id);
    saveList(RECKEY, v.slice(0, 8));
  }
  function randomScene() {
    var pool = A.allScenes.filter(function (sc) { return Cases.bySceneAll(sc.id).length; });
    var pick = pool.length ? pool : A.allScenes;
    location.hash = '#/scene/' + pick[(Math.random() * pick.length) | 0].id;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-fav]');
    if (!b) return;
    e.preventDefault();
    var id = b.getAttribute('data-fav');
    var on = toggleFav(id);
    b.classList.toggle('on', on);
    var t = b.querySelector('.fv-t');
    if (t) t.textContent = on ? '已收藏' : '收藏';
    [].forEach.call(document.querySelectorAll('[data-fav="' + id + '"]'), function (x) {
      x.classList.toggle('on', on);
      var tt = x.querySelector('.fv-t'); if (tt) tt.textContent = on ? '已收藏' : '收藏';
    });
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-random]');
    if (b) { e.preventDefault(); randomScene(); }
    var c = e.target.closest('[data-copylink]');
    if (c) {
      e.preventDefault();
      var url = location.href;
      var done = function () { var old = c.textContent; c.textContent = '已复制 ✓'; setTimeout(function () { c.textContent = old; }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, done);
      else { var ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (err) { } ta.remove(); done(); }
    }
    var o = e.target.closest('[data-openstandalone]');
    if (o) {
      e.preventDefault();
      var cs = Cases.get(o.getAttribute('data-openstandalone'));
      var dm = cs && cs.tabs && cs.tabs.demo;
      if (dm && dm.filesV3 && global.CaseDemoHost) {
        var doc = global.CaseDemoHost.buildPageDoc({ files: dm.filesV3, demo: { mode: 'page', html: 'demo/index.html', height: 720 } }, 'standalone');
        var blob = new Blob([doc], { type: 'text/html' });
        window.open(URL.createObjectURL(blob), '_blank');
      }
    }
  });

  /* 图表灯箱：点击专业背景里的原理图放大查看 */
  var lbEl = null;
  document.addEventListener('click', function (e) {
    var fig = e.target.closest('.figure');
    if (fig && fig.querySelector('svg')) {
      if (!lbEl) {
        lbEl = document.createElement('div');
        lbEl.className = 'lb';
        lbEl.hidden = true;
        lbEl.innerHTML = '<div class="lb-bg" data-lb-close></div>' +
          '<div class="lb-p" role="dialog" aria-label="图表放大查看">' +
          '<button class="lb-x" data-lb-close aria-label="关闭">✕</button>' +
          '<div class="lb-body"></div>' +
          '<div class="lb-cap mono">油链天工 · TIANGONG — 点击任意处或按 ESC 关闭</div></div>';
        document.body.appendChild(lbEl);
        lbEl.addEventListener('click', function (ev) { if (ev.target.closest('[data-lb-close]')) lbClose(); });
      }
      var src = fig.querySelector('svg');
      var cap = fig.parentElement.querySelector('.figcap');
      lbEl.querySelector('.lb-body').innerHTML = src.outerHTML +
        (cap ? '<div class="lb-fc">' + cap.innerHTML + '</div>' : '');
      lbEl.hidden = false;
      document.documentElement.classList.add('mdl-open');
    }
  });
  function lbClose() { if (lbEl) lbEl.hidden = true; document.documentElement.classList.remove('mdl-open'); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lbEl && !lbEl.hidden) lbClose(); });

  document.addEventListener('click', function (e) {
    var more = document.querySelector('.nav-more[open]');
    if (more && !more.contains(e.target)) more.open = false;
  });
  document.addEventListener('keydown', function (e) {
    var more = document.querySelector('.nav-more[open]');
    if (e.key === 'Escape' && more) {
      more.open = false;
      more.querySelector('summary').focus();
    }
  });
  function settleMotion() {
    if (motionQuery && motionQuery.matches) {
      [].forEach.call(view.querySelectorAll('.rv-pending'), function (el) {
        el.classList.remove('rv-pending'); el.classList.add('on');
      });
    }
    document.documentElement.classList.toggle('motion-paused', document.hidden);
  }
  if (motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change', settleMotion);
  document.addEventListener('visibilitychange', settleMotion);
  settleMotion();
  render();

  // 启动自检：把注册阶段的异常打到控制台，便于排查
  var probs = Cases.problems();
  if (probs.length) console.warn('[case registry]', probs);

})(window);
