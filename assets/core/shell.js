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
    return '<header class="hdr"><div class="hdr-in">' +
      '<a class="brand" href="#/">' +
      '<span class="brand-mark">' +
      '<img src="assets/logo.png" alt="油链天工">' +
      '</span>' +
      '<span class="brand-txt"><b>油链天工</b><span>Tiangong · Petro × AI Atlas</span></span></a>' +
      '<nav class="nav">' +
      '<a class="nav-keep' + on('home') + '" href="#/">总览</a>' +
      '<a class="nav-keep' + on('chain') + '" href="#/chain">作业链</a>' +
      '<a class="nav-keep' + on('cases') + '" href="#/cases">案例库</a>' +
      '<a class="nav-keep' + on('guide') + '" href="#/guide">接入指南</a>' +
      '<a class="nav-keep' + on('admin') + '" href="#/admin">' + (Admin.loggedIn() ? '管理后台' : '管理') + '</a>' +
      '<span class="live-status"><i></i>' + Cases.stats().registered + ' 案例已载入 · <b id="live-clock">--:--:--</b></span>' +
      '<button class="nav-add" data-import>＋ 添加案例</button>' +
      '</nav></div></header>';
  }

  function footer() {
    var s = Cases.stats();
    return '<footer class="ftr"><div class="wrap"><div class="ftr-in">' +
      '<div class="ftr-col" style="max-width:30ch">' +
      '<h5>关于</h5><p>' + esc(A.meta.title) + '</p>' +
      '<p style="margin-top:8px;color:var(--ink-4)">' + esc(A.meta.version) + ' · 更新于 ' + esc(A.meta.updated) + '</p></div>' +
      '<div class="ftr-col"><h5>地图</h5>' +
      '<a href="#/">总览</a><a href="#/chain">作业链</a><a href="#/method/cv">按方法反查</a></div>' +
      '<div class="ftr-col"><h5>系统</h5>' +
      '<a href="#/cases">案例库（' + s.registered + ' 个已接入）</a>' +
      '<a href="#/guide">接入新案例</a></div>' +
      '<div class="ftr-col"><h5>参与</h5>' +
      '<p>发现问题或想补一个场景？</p>' +
      '<a href="mailto:' + esc(A.meta.email) + '">' + esc(A.meta.email) + '</a></div>' +
      '</div>' +
      '<div class="ftr-bot"><span>场景数据：' + A.allScenes.length + ' 个 · 环节：' + A.stages.length + ' 个</span>' +
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
      '<path d="M560 128 Q 680 106 800 128 Q 680 146 560 128 Z" fill="#c46a2b" fill-opacity=".22" stroke="#c46a2b" stroke-width="1.1"/>' +
      '<path d="M600 133 Q 680 121 760 133 Q 680 141 600 133 Z" fill="#c46a2b" fill-opacity=".3"/>' +
      '</g>' +
      /* 地表线 */
      '<line x1="0" y1="66" x2="1440" y2="66" stroke="#b6c4d6" stroke-width="1.4"/>' +
      /* 左：地震采集（震源 + 波前弧 + 检波器） */
      '<g stroke="#0e8a9e" fill="none" stroke-width="1.3">' +
      '<path class="pw1" d="M120 66 Q 96 88 120 104 Q 144 88 120 66"/>' +
      '<path class="pw2" d="M120 66 Q 76 96 120 122 Q 164 96 120 66"/>' +
      '<path class="pw3" d="M120 66 Q 56 104 120 140 Q 184 104 120 66"/>' +
      '</g>' +
      '<rect x="104" y="46" width="30" height="14" rx="3" fill="#0e8a9e" fill-opacity=".18" stroke="#0e8a9e" stroke-width="1.2"/>' +
      '<circle cx="112" cy="63" r="1.6" fill="#0e8a9e"/><circle cx="120" cy="63" r="1.6" fill="#0e8a9e"/><circle cx="128" cy="63" r="1.6" fill="#0e8a9e"/>' +
      /* 中：钻机（桁架）+ 井筒 + 射孔 */
      '<g stroke="#154687" fill="none" stroke-width="1.5">' +
      '<path d="M600 66 L648 8 L696 66"/>' +
      '<path d="M612 50 L684 50 M620 34 L676 34 M630 20 L666 20"/>' +
      '<path d="M648 8 V18"/>' +
      '</g>' +
      '<line x1="644" y1="66" x2="644" y2="132" stroke="#154687" stroke-width="1.6"/>' +
      '<line x1="652" y1="66" x2="652" y2="132" stroke="#154687" stroke-width="1.6"/>' +
      '<path d="M644 120 h-10 M652 120 h10 M644 128 h-10 M652 128 h10" stroke="#c46a2b" stroke-width="1.4"/>' +
      /* 右：集输管线 + 泵站 + 炼化 */
      '<path d="M652 62 H1050" stroke="#154687" stroke-width="2" fill="none"/>' +
      '<circle cx="860" cy="62" r="7" fill="#fff" stroke="#154687" stroke-width="1.6"/>' +
      '<path d="M856 62 h8 M860 58 v8" stroke="#154687" stroke-width="1.4"/>' +
      '<rect x="1060" y="30" width="12" height="36" rx="2" fill="none" stroke="#154687" stroke-width="1.5"/>' +
      '<rect x="1080" y="38" width="12" height="28" rx="2" fill="none" stroke="#154687" stroke-width="1.5"/>' +
      '<ellipse cx="1106" cy="58" rx="14" ry="8" fill="none" stroke="#154687" stroke-width="1.5"/>' +
      '<path d="M1066 30 V22 Q1066 14 1074 14" stroke="#c46a2b" stroke-width="1.3" fill="none"/>' +
      /* 数据总线：地表上方虚线 + 节点 */
      '<path class="bus" d="M120 40 H648 H860 H1100" stroke="#1e63b4" stroke-width="1.2" stroke-dasharray="5 4" fill="none"/>' +
      '<g fill="#1e63b4">' +
      '<circle cx="120" cy="40" r="3.4"/><circle cx="648" cy="40" r="3.4"/><circle cx="860" cy="40" r="3.4"/><circle cx="1100" cy="40" r="3.4"/>' +
      '</g>' +
      '<g font-family="monospace" font-size="9" fill="#5d6770">' +
      '<text x="120" y="28" text-anchor="middle">采集</text><text x="648" y="28" text-anchor="middle">钻井</text>' +
      '<text x="860" y="28" text-anchor="middle">集输</text><text x="1100" y="28" text-anchor="middle">加工</text></g>' +
      '<text x="1424" y="166" font-size="8.5" fill="#8d969e" text-anchor="end" font-family="monospace">SURVEY · DRILL · PRODUCE · TRANSPORT · REFINE — 数据总线贯穿全链</text>' +
      '</svg>';
  }

  function homeHTML() {
    var s = A.stats();
    var cs = Cases.stats();
    var total = A.allScenes.length;
    var keys = Object.keys(M);
    var tagsTotal = keys.reduce(function (a, k) { return a + (A.index.byMethod[k] || []).length; }, 0);
    var coverPct = total ? Math.round(cs.coveredScenes / total * 100) : 0;

    /* ---- 右侧驾驶舱数据 ---- */
    var diffBar = ['低', '中', '高'].map(function (d) {
      var col = d === '低' ? 'var(--ok)' : d === '中' ? 'var(--warn)' : 'var(--bad)';
      return '<i style="flex:' + s.diff[d] + ';background:' + col + '" title="' + d + '难度 ' + s.diff[d] + ' 个"></i>';
    }).join('');
    var compBar = keys.map(function (k) {
      var n = (A.index.byMethod[k] || []).length;
      return '<i style="flex:' + n + ';background:var(--c-' + (M[k].colorKey || k) + ')" title="' + M[k].abbr + ' ' + n + ' 个场景"></i>';
    }).join('');
    var compLegend = keys.map(function (k) {
      var n = (A.index.byMethod[k] || []).length;
      return '<a href="#/method/' + k + '"><i style="background:var(--c-' + (M[k].colorKey || k) + ')"></i>' + M[k].abbr + '<b>' + n + '</b></a>';
    }).join('');

    /* ---- 流程地图：7 + 7 两行（13 环节 + 引导卡），卡间箭头 ---- */
    function flowCard(st) {
      return '<a class="fc" data-i="' + st.idx + '" href="#/stage/' + st.id + '">' +
        '<div class="fc-idx mono">' + pad(st.idx) + '</div>' +
        '<div class="fc-name">' + esc(st.name) + '</div>' +
        '<div class="fc-n mono">' + st.scenes.length + '<span>场景</span></div>' +
        stageBar(st.id) + '</a>';
    }
    var sep = '<div class="fsep" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M4 2 L10 7 L4 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>';
    var rowA = A.stages.slice(0, 7).map(flowCard).join(sep);
    var rowB = A.stages.slice(7).map(flowCard).join(sep) + sep +
      '<a class="fc fc-all" href="#/chain"><div class="fc-idx mono">VIEW</div>' +
      '<div class="fc-name">完整作业链</div><div class="fc-n mono">61<span>场景 →</span></div></a>';

    /* ---- 方法图谱卡 ---- */
    var mcards = keys.map(function (k) {
      var n = (A.index.byMethod[k] || []).length;
      return '<a class="mcard" data-m="' + (M[k].colorKey || k) + '" href="#/method/' + k + '">' +
        '<div class="m-top"><span class="motif-w" style="color:var(--c-' + (M[k].colorKey || k) + ')">' + motifFor(k) + '</span>' +
        '<span class="abbr"><b>' + M[k].abbr + '</b><span>' + esc(M[k].signal) + '</span></span></div>' +
        '<div class="nm">' + esc(M[k].name) + '</div>' +
        '<div class="ds">' + esc(M[k].desc).slice(0, 34) + '…</div>' +
        '<div class="cnt"><b>' + n + '</b>个场景<span class="ar">→</span></div></a>';
    }).join('');

    /* ---- 精选案例（真实注册案例，按方法多样性挑选） ---- */
    var FEATURED = ['pr1-dynocard', 't1-pipeline-leak', 'co4-slide-rl', 'm5-report-nlp'];
    var feats = FEATURED.map(function (id) { return Cases.get(id); }).filter(Boolean);
    if (feats.length < 3) feats = Cases.list().slice(0, 4);
    var featCards = feats.map(function (c) {
      var sc = A.index.byScene[c.sceneId] || {};
      var m0 = (c.methods && c.methods[0]) || (sc.methods && sc.methods[0]) || 'cv';
      var ck = (M[m0] && (M[m0].colorKey || m0)) || m0;
      return '<a class="fcard" href="#/scene/' + c.sceneId + '?case=' + c.id + '&tab=demo">' +
        '<span class="f-thumb" style="color:var(--c-' + ck + ')">' + motifFor(m0) + '</span>' +
        '<span class="f-body"><b>' + esc(c.title) + '</b>' +
        '<i>' + esc(sc.stageName || '') + ' · ' + esc(sc.name || '') + '</i>' +
        '<em>' + c.methods.map(function (m) { return M[m] ? M[m].abbr : m.toUpperCase(); }).join(' / ') +
        ' · v' + esc(c.version || '1.0') + ' · ready</em></span>' +
        '<span class="f-go">运行演示 <span class="ar">→</span></span></a>';
    }).join('');

    return '<main>' +

      /* ========== HERO ========== */
      '<section class="hero"><div class="wrap"><div class="hgx">' +
      '<div class="hgl">' +
      '<div class="hero-top rise d1">' +
      '<span class="hero-badge">' + esc(A.meta.version) + ' · 全链 ' + total + ' 个候选场景</span>' +
      '<span class="hero-badge alt">案例系统 · ' + cs.registered + ' 个已接入</span></div>' +
      '<h1 class="hx rise d1"><em>油链天工</em><span>石油勘探开发的智能化可能性地图</span></h1>' +
      '<p class="hero-lead rise d2">把从<b>地质勘察</b>到<b>加工</b>的整条作业链拆成 ' + total + ' 个候选场景，逐个回答：哪一步能被算法替掉、要准备什么数据、难在哪里——每个场景都配一个<b>能在浏览器里直接运行</b>的智能化示范。</p>' +
      '<div class="kpis rise d3">' +
      '<div class="kpi"><b class="roll mono" data-n="' + A.stages.length + '">' + A.stages.length + '</b><span>作业环节</span></div>' +
      '<div class="kpi"><b class="roll mono" data-n="' + total + '">' + total + '</b><span>候选场景</span></div>' +
      '<div class="kpi"><b class="roll mono" data-n="' + cs.registered + '">' + cs.registered + '</b><span>接入案例</span></div>' +
      '<div class="kpi"><b class="roll mono" data-n="' + keys.length + '">' + keys.length + '</b><span>类 AI 方法</span></div>' +
      '</div>' +
      '<div class="hero-acts rise d4">' +
      '<a class="btn primary lg" href="#/chain">浏览完整作业链 <span class="ar">→</span></a>' +
      '<a class="btn lg" href="#/scene/pr1?tab=demo">看一个可运行示范</a></div>' +
      '</div>' +

      '<aside class="cockpit rise d3">' +
      '<div class="cp-h"><span class="mono">DATA COCKPIT · 数据驾驶舱</span><span class="mono">' + esc(A.meta.version) + '</span></div>' +
      '<div class="cp-block"><div class="cp-lab"><span>难度分布</span><span class="mono">低 ' + s.diff.低 + ' · 中 ' + s.diff.中 + ' · 高 ' + s.diff.高 + '</span></div>' +
      '<div class="cp-bar">' + diffBar + '</div></div>' +
      '<div class="cp-block"><div class="cp-lab"><span>方法构成（场景标签）</span><span class="mono">' + tagsTotal + ' 次关联</span></div>' +
      '<div class="cp-bar">' + compBar + '</div>' +
      '<div class="cp-leg">' + compLegend + '</div></div>' +
      '<div class="cp-block"><div class="cp-lab"><span>案例覆盖</span><span class="mono cp-pct"><b class="roll" data-n="' + coverPct + '">' + coverPct + '</b>%</span></div>' +
      '<div class="cp-bar"><i style="flex:' + cs.coveredScenes + ';background:var(--jade)"></i><i style="flex:' + Math.max(total - cs.coveredScenes, 0) + ';background:var(--line)"></i></div>' +
      '<div class="cp-sub">' + cs.coveredScenes + ' / ' + total + ' 个场景已有案例 · 其中 ' + cs.withDemo + ' 个带可运行示范</div></div>' +
      '</aside>' +
      '</div>' +

      /* 工业全景带 */
      '<div class="pano-w rise d4">' + panoramaSVG() + '</div>' +
      '</div></section>' +

      /* ========== 01 流程地图 ========== */
      '<section class="section"><div class="wrap">' +
      '<div class="sec-head">' +
      '<div class="sec-rail"><span class="sec-num">01</span><span class="kicker">BY STAGE</span>' +
      '<span class="r"><a class="btn sm ghost" href="#/chain">完整链条 →</a></span></div>' +
      '<h2>作业链数字地图：从地质勘察到加工</h2>' +
      '<p>13 个环节沿作业顺序两行排布，编号即工序；卡片底部的方法构成条显示该环节里五类技术的分量。点击进入场景清单。</p></div>' +
      '<div class="flowmap rv"><div class="frow">' + rowA + '</div><div class="frow">' + rowB + '</div></div>' +
      '<div class="chain-hint">01 地质勘察 → 13 加工 · 悬停查看方法构成 · 点击进入环节</div>' +
      '</div></section>' +

      /* ========== 02 方法图谱 ========== */
      '<section class="section"><div class="wrap">' +
      '<div class="sec-head">' +
      '<div class="sec-rail"><span class="sec-num">02</span><span class="kicker">BY METHOD</span></div>' +
      '<h2>五类 AI 技术的能力图谱</h2>' +
      '<p>已经有一支做 CV 或时序的团队？更自然的问法是「这套技术在这行能干什么」——点进去是跨环节的场景清单。</p></div>' +
      '<div class="methods rv">' + mcards + '</div>' +
      '</div></section>' +

      /* ========== 03 热力矩阵 ========== */
      '<section class="section"><div class="wrap">' +
      '<div class="sec-head">' +
      '<div class="sec-rail"><span class="sec-num">03</span><span class="kicker">MATRIX</span></div>' +
      '<h2>方法 × 环节热力矩阵：哪里密集，哪里空白</h2>' +
      '<p>颜色越深表示该环节里用到该方法的场景越多。悬停高亮行列，点击格子带筛选条件跳进环节页。</p></div>' +
      matrixHTML() +
      '</div></section>' +

      /* ========== 04 精选案例 ========== */
      '<section class="section"><div class="wrap">' +
      '<div class="sec-head">' +
      '<div class="sec-rail"><span class="sec-num">04</span><span class="kicker">SHOWCASE</span>' +
      '<span class="r"><a class="btn sm ghost" href="#/cases">案例库 →</a></span></div>' +
      '<h2>精选案例：现在就能跑给你看</h2>' +
      '<p>来自已注册案例库的四类代表——图像分类、时序预警、强化学习、文本生成，全部纯前端、点开即跑。</p></div>' +
      '<div class="feat rv">' + featCards + '</div>' +
      '</div></section>' +

      /* ========== 05 系统架构 ========== */
      '<section class="section"><div class="wrap">' +
      '<div class="sec-head">' +
      '<div class="sec-rail"><span class="sec-num">05</span><span class="kicker clay">SYSTEM</span>' +
      '<span class="r"><a class="btn primary sm" href="#/guide">接入指南 →</a></span></div>' +
      '<h2>三层系统：数据、案例、外壳</h2>' +
      '<p>新增一个案例只动第二层的一个文件；外壳负责路由、检索与示范宿主，全站风格由设计令牌统一。</p></div>' +
      '<div class="arch3 rv">' +
      '<div class="al"><div class="al-x mono">01 · DATA</div><h4>场景元数据</h4>' +
      '<p><b class="mono">' + A.stages.length + '</b> 个环节 · <b class="mono">' + total + '</b> 个场景的名称、方法标签、难度与数据条件，只是一张可检索的表。</p></div>' +
      '<div class="al-arrow" aria-hidden="true"><svg width="26" height="14" viewBox="0 0 26 14"><path d="M0 7 H20 M16 2 L22 7 L16 12" fill="none" stroke="var(--clay)" stroke-width="1.8" stroke-linecap="round"/></svg></div>' +
      '<div class="al"><div class="al-x mono">02 · CASES</div><h4>案例插件</h4>' +
      '<p><b class="mono">' + cs.registered + '</b> 个案例文件经 <b>Cases.register()</b> 声明式接入，互不引用、可单独增删，含上传包通道。</p></div>' +
      '<div class="al-arrow" aria-hidden="true"><svg width="26" height="14" viewBox="0 0 26 14"><path d="M0 7 H20 M16 2 L22 7 L16 12" fill="none" stroke="var(--clay)" stroke-width="1.8" stroke-linecap="round"/></svg></div>' +
      '<div class="al"><div class="al-x mono">03 · SHELL</div><h4>外壳与组件</h4>' +
      '<p>路由 / 导航 / 方法反查 / 示范沙箱宿主与设计令牌，所有案例共用同一套版式，改一次全站生效。</p></div>' +
      '</div>' +
      '<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<a class="btn" href="#/cases">查看案例库与校验结果 →</a>' +
      '<a class="btn ghost" href="#/guide">看怎么添加下一个案例</a></div>' +
      '</div></section>' +
      '</main>';
  }

  function matrixHTML() {
    var counts = A.countByStageMethod();
    var keys = Object.keys(M);
    var total = A.allScenes.length;
    var tagsTotal = keys.reduce(function (a, k) { return a + (A.index.byMethod[k] || []).length; }, 0);
    var maxV = 1;
    A.stages.forEach(function (st) { keys.forEach(function (k) { maxV = Math.max(maxV, counts[st.id][k] || 0); }); });
    function opFor(n) { return n ? (0.14 + 0.62 * Math.sqrt(n / maxV)).toFixed(3) : 0; }

    var head = '<div class="mx-hc" data-c=""><span>环节 ＼ 方法</span></div>' +
      keys.map(function (k) {
        var n = (A.index.byMethod[k] || []).length;
        return '<a class="mx-h" data-c="' + k + '" href="#/method/' + k + '" title="' + esc(M[k].name) + '：' + n + ' 个场景">' +
          '<i style="background:var(--c-' + (M[k].colorKey || k) + ')"></i><b>' + M[k].abbr + '</b><span class="mono">' + n + '</span></a>';
      }).join('') + '<div class="mx-h mx-hh"><b>场景</b><span class="mono">' + total + '</span></div>';

    var body = A.stages.map(function (st) {
      var c = counts[st.id];
      var cells = keys.map(function (k) {
        var n = c[k] || 0;
        var pct = st.scenes.length ? Math.round(n / st.scenes.length * 100) : 0;
        if (!n) return '<span class="mx-c mx-zero" data-r="' + st.id + '" data-c="' + k + '"><i></i><em>·</em></span>';
        return '<a class="mx-c" data-r="' + st.id + '" data-c="' + k + '" href="#/stage/' + st.id + '?m=' + k + '"' +
          ' title="' + esc(st.name) + ' × ' + esc(M[k].name) + '：' + n + ' 个场景">' +
          '<i style="opacity:' + opFor(n) + '"></i>' +
          '<span class="mx-v mono">' + n + '</span>' +
          '<span class="mx-p mono">' + pct + '%</span></a>';
      }).join('');
      return '<a class="mx-r" data-r="' + st.id + '" href="#/stage/' + st.id + '"><i class="mono">' + pad(st.idx) + '</i><span>' + esc(st.name) + '</span></a>' +
        cells +
        '<a class="mx-c mx-t" data-r="' + st.id + '" href="#/stage/' + st.id + '"><span class="mx-v mono">' + st.scenes.length + '</span><span class="mx-p mono">100%</span></a>';
    }).join('');

    var foot = '<div class="mx-r mx-fr" data-r=""><span>关联合计（一景可多法）</span></div>' +
      keys.map(function (k) {
        return '<div class="mx-c mx-t" data-c="' + k + '"><span class="mx-v mono">' + (A.index.byMethod[k] || []).length + '</span><span class="mx-p mono">—</span></div>';
      }).join('') +
      '<div class="mx-c mx-t"><span class="mx-v mono">' + tagsTotal + '</span><span class="mx-p mono">—</span></div>';

    return '<div class="mxv rv" id="mxv">' +
      '<div class="mx-tools"><div class="mx-modes" role="group" aria-label="显示模式">' +
      '<button class="on" data-mode="v" type="button">数量</button>' +
      '<button data-mode="p" type="button">环节内占比</button></div>' +
      '<span class="mx-info" id="mx-info">悬停格子查看「环节 × 方法」关联 · 点击跳转筛选结果</span></div>' +
      '<div class="mx-scroll"><div class="mx-grid" style="grid-template-columns:minmax(150px,1.6fr) repeat(5,1fr) 62px">' +
      head + body + foot + '</div></div>' +
      '<div class="mx-legend"><span class="mono">色阶</span>' +
      [0, 1, Math.round(maxV / 2), maxV].map(function (v, i) {
        return '<i><b style="opacity:' + (i ? opFor(v || 1) : 0) + '"></b>' + (i ? v : '0') + '</i>';
      }).join('') +
      '<span class="mx-note">口径：单元格 = 该环节中带此方法标签的<b>场景数</b>；因一景可多法，关联合计 <b class="mono">' + tagsTotal + '</b> ≥ 去重场景 <b class="mono">' + total + '</b></span></div>' +
      '</div>';
  }

  /* =========================================================
     四、链条总览页
     ========================================================= */
  function chainHTML() {
    var rows = A.stages.map(function (st) {
      var top = st.scenes.slice(0, 5).map(function (s) { return s.name; }).join('、');
      return '<a class="scene-row" href="#/stage/' + st.id + '" style="grid-template-columns:52px 1fr auto">' +
        '<div class="sr-n" style="padding-top:9px">' + pad(st.idx) + '</div>' +
        '<div><div class="sr-name">' + esc(st.name) +
        '<span class="mono" style="font-size:9.5px;color:var(--ink-4);letter-spacing:.14em">' + esc(st.en).toUpperCase() + '</span>' +
        '<span class="arrow">→</span></div>' +
        '<div class="sr-point">' + esc(st.blurb) + '</div>' +
        '<div class="sr-meta">' + st.scenes.slice(0, 3).map(function (s) { return methodChip(s.methods[0]); }).join('') +
        '<span class="tag" style="margin-left:4px">' + esc(top) + (st.scenes.length > 5 ? '…' : '') + '</span></div></div>' +
        '<div class="sr-right"><span class="mono" style="font-size:19px;color:var(--ink-2)">' + st.scenes.length + '</span>' +
        '<span class="small muted">场景</span></div></a>';
    }).join('');

    return '<main class="wrap">' +
      crumb([['#/', '总览'], ['#/chain', '作业链']]) +
      '<div class="page-head"><div class="ph-top"><div>' +
      '<div class="ph-idx">CHAIN · ' + A.stages.length + ' 个环节</div>' +
      '<h1>从地质勘察到加工的全链条</h1>' +
      '<p class="blurb">上游到下游按作业顺序排列。每个环节标注可智能化的场景数量与方法构成，点进去看清单。</p>' +
      '</div><div class="ph-stat">' +
      '<div><div class="n">' + A.stages.length + '</div><div class="l">环节</div></div>' +
      '<div><div class="n">' + A.allScenes.length + '</div><div class="l">场景</div></div>' +
      '</div></div></div>' +
      '<div class="scenes">' + rows + '</div></main>';
  }

  /* =========================================================
     五、环节页
     ========================================================= */
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
      return '<a class="scene-row' + (sc.status === 'ext' ? ' is-ext' : '') + '" href="#/scene/' + sc.id + '" data-m="' + sc.methods.join(' ') + '" data-d="' + sc.diff + '">' +
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

      '<div class="filters"><span class="lbl">方法</span>' + methBtns +
      '<span class="divider"></span><span class="lbl">难度</span>' + diffBtns +
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
    var st = { m: '', d: '' };
    var chips = root.querySelectorAll('.filters .chip');
    [].forEach.call(chips, function (c) {
      if (c.classList.contains('on')) st[c.dataset.f] = c.dataset.v;
    });

    function apply() {
      var n = 0;
      [].forEach.call(listEl.children, function (row) {
        var ms = (row.dataset.m || '').split(' ');
        var okM = !st.m || ms.indexOf(st.m) >= 0;
        var okD = !st.d || row.dataset.d === st.d;
        var show = okM && okD;
        row.style.display = show ? '' : 'none';
        if (show) n++;
      });
      var cnt = root.querySelector('#f-count');
      if (cnt) cnt.textContent = n + ' 个场景';
      if (!n) {
        if (!listEl.querySelector('.filter-empty')) {
          var d = document.createElement('div');
          d.className = 'empty filter-empty';
          d.innerHTML = '<b>没有符合条件的场景</b>换个筛选条件试试。';
          listEl.appendChild(d);
        }
      } else {
        var e = listEl.querySelector('.filter-empty');
        if (e) e.remove();
      }
    }

    [].forEach.call(chips, function (c) {
      c.addEventListener('click', function () {
        var f = c.dataset.f;
        st[f] = c.dataset.v;
        [].forEach.call(chips, function (x) {
          if (x.dataset.f === f) x.classList.toggle('on', x === c);
        });
        apply();
        var hash = '#/stage/' + parseHash().parts[1] + (st.m ? '?m=' + st.m + (st.d ? '&d=' + st.d : '') : (st.d ? '?d=' + st.d : ''));
        setHashQuiet(hash);
      });
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
      '<div class="ph-idx">METHOD · ' + M[key].abbr + '</div>' +
      '<h1>' + esc(M[key].name) + '在石油勘探开发中的可应用场景<span class="en">' + esc(M[key].signal) + '</span></h1>' +
      '<p class="blurb">' + esc(M[key].desc) + '</p></div>' +
      '<div class="ph-stat"><div><div class="n">' + all.length + '</div><div class="l">场景</div></div>' +
      '<div><div class="n">' + hitStages.length + '</div><div class="l">跨环节</div></div></div>' +
      '</div></div>' +
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
    return '<div id="case-demo-root"></div>';
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
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }

    tabsEl.addEventListener('click', function (e) {
      var b = e.target.closest('.tab');
      if (!b) return;
      activate(b.dataset.tab, true);
      setHashQuiet('#/scene/' + sc.id + '?tab=' + b.dataset.tab);
    });

    var want = { 1: 'bg', 2: 'flow', 3: 'demo' }[parseHash().q.tab] || parseHash().q.tab;
    if (want && tabsEl.querySelector('[data-tab="' + want + '"]')) activate(want, false);

    bindChecklist();
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
      d.mount(root, { scene: sc, kase: c, K: K, atlas: A });
    } catch (err) {
      root.innerHTML = '<div class="callout warn"><span class="ci">错误</span><span>示范挂载失败：' +
        esc(err.message) + '。检查 <b>' + esc(c.id) + '</b> 的 tabs.demo.mount。</span></div>';
      console.error('[case:' + c.id + '] demo mount failed', err);
    }
  }

  function bindChecklist() {
    var items = document.querySelectorAll('.cl-item');
    if (!items.length) return;
    var total = items.length;
    var fill = document.getElementById('cl-fill');
    var txt = document.getElementById('cl-txt');

    function sync() {
      var n = document.querySelectorAll('.cl-item.done').length;
      if (fill) fill.style.width = (n / total * 100) + '%';
      if (txt) txt.textContent = n + ' / ' + total;
    }
    [].forEach.call(items, function (it) {
      it.addEventListener('click', function () {
        it.classList.toggle('done');
        sync();
      });
    });
    sync();
  }

  /* =========================================================
     八、案例库控制台
     ========================================================= */
  function casesHTML() {
    var list = Cases.list();
    var checks = Cases.validateAll();
    var s = Cases.stats();
    var pending = A.allScenes.filter(function (sc) { return !Cases.bySceneAll(sc.id).length; });

    var rows = list.map(function (c) {
      var sc = A.index.byScene[c.sceneId];
      var ck = checks[c.id] || [];
      var errs = ck.filter(function (x) { return x.level === 'error'; }).length;
      var warns = ck.filter(function (x) { return x.level === 'warn'; }).length;
      var state = errs ? '<span class="bad-mark">✕ ' + errs + ' 项错误</span>'
        : warns ? '<span class="mono" style="font-size:11px;color:var(--warn)">! ' + warns + ' 项提醒</span>'
          : '<span class="ok-mark">✓ 通过</span>';
      var tabFlags = ['background', 'workflow', 'demo'].map(function (k) {
        return '<span class="' + (c.tabs[k] ? 'ok-mark' : 'dim-mark') + '" title="' + k + '">' + (c.tabs[k] ? '●' : '○') + '</span>';
      }).join(' ');
      var mChips = (c.methods || []).map(caseChip).join('') || '<span class="dim-mark">继承场景</span>';

      return '<tr><td class="id">' + esc(c.id) + '</td>' +
        '<td><div class="nm">' + esc(c.title || sc && sc.name) +
        (c.imported ? '<span class="badge-local">本地导入</span>' : '') + '</div>' +
        '<div class="sc">' + (sc ? esc(sc.stageName) + ' / ' + esc(sc.name) : '⚠ sceneId 未匹配') + '</div></td>' +
        '<td>' + mChips + '</td>' +
        '<td class="sc">' + esc(c.version || '—') + '</td>' +
        '<td class="sc">' + esc(c.updated || '—') + '</td>' +
        '<td style="letter-spacing:.16em">' + tabFlags + '</td>' +
        '<td>' + state + '</td>' +
        '<td>' + (sc ? '<a class="btn sm ghost" href="#/scene/' + sc.id + '?case=' + esc(c.id) + '">打开 →</a>' : '—') +
        '<a href="#" class="link-remove" data-remove-case="' + esc(c.id) + '" title="' +
        (c.imported ? '从本机移除这份上传的案例包' : '从站点删除这个插件案例（文件保留，可恢复）') + '">' +
        (c.imported ? '移除' : '删除') + '</a>' +
        '</td></tr>';
    }).join('');

    /* 被删除（隐藏）的插件案例——可恢复 */
    var blocked = (global.CaseImport && global.CaseImport.blockedList ? global.CaseImport.blockedList() : [])
      .filter(function (id) { return !Cases.get(id); });
    var blockedBlock = '';
    if (blocked.length) {
      blockedBlock =
        '<div class="blocked-box">' +
        '<div class="bb-h"><span class="kicker clay">HIDDEN</span>' +
        '<b>已删除的插件案例（' + blocked.length + '）</b>' +
        '<span class="bb-sub">.js 文件仍在磁盘上，恢复后重新加载页面即可回到上表</span></div>' +
        '<div class="bb-list">' + blocked.map(function (id) {
          return '<span class="bb-item"><span class="mono">' + esc(id) + '</span>' +
            '<a href="#" class="link-remove" data-restore-case="' + esc(id) + '">恢复</a></span>';
        }).join('') + '</div></div>';
    }

    var detail = list.map(function (c) {
      var ck = checks[c.id] || [];
      return '<details style="margin-top:10px;border:1px solid var(--line);border-radius:8px;background:var(--card)">' +
        '<summary style="padding:10px 14px;cursor:pointer;font-size:12.5px;font-weight:600">' +
        esc(c.id) + ' 的校验明细 <span class="mono" style="font-weight:400;color:var(--ink-4);font-size:10.5px">' +
        ck.length + ' 条</span></summary>' +
        '<div style="padding:0 14px 12px"><table class="contract"><tbody>' +
        ck.map(function (x) {
          var mark = x.level === 'ok' ? '<span class="ok-mark">✓</span>'
            : x.level === 'warn' ? '<span style="color:var(--warn);font-family:var(--mono);font-size:11px">!</span>'
              : '<span class="bad-mark">✕</span>';
          return '<tr><td style="width:22px">' + mark + '</td>' +
            '<td style="font-family:var(--sans)">' + esc(x.label) + '</td>' +
            '<td style="color:var(--ink-4);font-size:11px">' + esc(x.detail) + '</td></tr>';
        }).join('') + '</tbody></table></div></details>';
    }).join('');

    return '<main class="wrap">' +
      crumb([['#/', '总览'], ['#/cases', '案例库']]) +
      '<div class="page-head"><div class="ph-top"><div>' +
      '<div class="ph-idx">CASE REGISTRY</div>' +
      '<h1>案例库与接入状态</h1>' +
      '<p class="blurb">系统在启动时扫描所有已加载的案例插件，按契约做静态校验。任何一项报错都会在这里列出来，不会静默失败。</p>' +
      '</div><div class="ph-stat">' +
      '<div><div class="n">' + s.registered + '</div><div class="l">已注册</div></div>' +
      '<div><div class="n">' + s.withDemo + '</div><div class="l">含示范</div></div>' +
      '<div><div class="n">' + pending.length + '</div><div class="l">待接入</div></div>' +
      '</div></div></div>' +

      '<div class="console-bar">' +
      '<span class="num">' + s.coveredScenes + '<small>/' + s.totalScenes + '</small></span>' +
      '<span class="lbl">个场景已有案例实现（共 ' + s.registered + ' 个案例）</span><span class="sp"></span>' +
      '<button class="btn sm primary" data-import>＋ 添加案例</button>' +
      '<button class="btn sm ghost" id="rerun">重新校验</button></div>' +

      '<div class="matrix-wrap" style="box-shadow:var(--sh-1)">' +
      '<table class="sys-table"><thead><tr>' +
      '<th>案例 id</th><th>绑定场景</th><th>涉及技术</th><th>版本</th><th>更新</th><th>三块内容</th><th>校验</th><th></th>' +
      '</tr></thead><tbody>' + (rows || '<tr><td colspan="8" class="empty">还没有任何案例注册</td></tr>') + '</tbody></table></div>' +
      '<p class="small muted" style="margin-top:9px">三块内容依次为 background / workflow / demo，● 已提供、○ 未提供。技术标签可在导入时勾选，不选则继承场景；同一个场景支持挂多个案例，场景页顶部会出现切换器。删除上传案例会清掉本机存档；删除插件案例只是隐藏，文件不动，可随时恢复。</p>' +

      blockedBlock +

      '<div style="margin-top:26px">' + detail + '</div>' +

      '<div class="section" style="padding:44px 0 56px">' +
      '<div class="sec-head"><div><span class="kicker">BACKLOG</span>' +
      '<h2 style="margin-top:10px">还有 ' + pending.length + ' 个场景等待接入</h2>' +
      '<p>下面这些场景已有元数据，缺的是案例实现。接入一个大约需要「一份专业背景 + 一条流程 + 一个能跑的最小示范」。</p>' +
      '</div></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:7px">' +
      pending.slice(0, 24).map(function (sc) {
        return '<a class="tag" href="#/scene/' + sc.id + '">' + esc(sc.name) + '</a>';
      }).join('') +
      (pending.length > 24 ? '<span class="tag">… 另有 ' + (pending.length - 24) + ' 个</span>' : '') +
      '</div></div></main>';
  }

  /* =========================================================
     九、接入指南
     ========================================================= */
  function guideHTML() {
    var fileTree = K.tree([
      '<b>项目根目录</b>',
      '├── index.html                <span class="cm">← 新增案例时加一行 script</span>',
      '├── assets/',
      '│   ├── data.js               <span class="cm">场景元数据（13 环节 / 61 场景）</span>',
      '│   ├── core/                 <span class="cm">外壳，一般不用动</span>',
      '│   │   ├── tokens.css        <span class="cm">颜色 / 字号 / 圆角</span>',
      '│   │   ├── layout.css        <span class="cm">导航 / 页头 / 页脚</span>',
      '│   │   ├── ui.css            <span class="cm">卡片 / 表格 / 四段式 / 示范</span>',
      '│   │   ├── registry.js       <span class="cm">Cases.register 契约与校验</span>',
      '│   │   ├── kit.js            <span class="cm">K.sec4 / K.figure / K.code…</span>',
      '│   │   ├── case-demo-host.js <span class="cm">示范宿主：iframe 整页 / Shadow DOM 模块</span>',
      '│   │   ├── case-upload.js    <span class="cm">案例包导入：校验 / 打包 / 落库</span>',
      '│   │   └── shell.js          <span class="cm">路由与页面</span>',
      '│   └── cases/                <span class="dir">← 案例都放这里</span>',
      '│       ├── welllog-layer.case.js   <span class="new">测井分层（示例）</span>',
      '│       ├── welllog-layer.demo.js   <span class="new">它的可运行示范</span>',
      '│       ├── _template.case.js       <span class="new">插件模板，复制它开始</span>',
      '│       └── _template.case.json     <span class="new">清单模板（完整包请用弹窗里下载的 zip）</span>',
      '└── docs/',
      '    └── 如何添加新案例.md      <span class="cm">本页的离线版</span>'
    ]);

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
      "        { no: 1, en: 'PROBLEM', title: '当前做法与问题',",
      "          html: '<p>……</p>' + K.figure(svgManual(), 1, '图注') },",
      "        { no: 2, en: 'INTERVENTION', title: 'AI 能做什么', html: '……' },",
      "        { no: 3, en: 'DATA', title: '你需要准备什么',",
      "          html: K.checklist([['随钻曲线', '1 s 采样'], ['漏失记录', '人工登记']]) },",
      "        { no: 4, en: 'DIFFICULTY', title: '技术难度与参考方向', html: '……' }",
      "      ]",
      "    },",
      "",
      "    // ② 案例流程：一条真实项目走过的路",
      "    workflow: {",
      "      label: '案例流程',",
      "      title: '某某区块 18 口井的漏失识别',",
      "      lead: ['项目目标不是做模型，而是把漏失层位定位时间压到 10 分钟。'],",
      "      stats: [['样本井', '18 口'], ['目标准确率', '85%']],",
      "      steps: [",
      "        { name: '数据对齐', do: '……', role: '工程环节',",
      "          effect: '……', trap: '……' }",
      "      ],",
      "      fails: [{ name: '标签滞后', why: '……' }]",
      "    },",
      "",
      "    // ③ 可运行示范（可选）：给一个 DOM 容器就能跑",
      "    demo: {",
      "      label: '可运行示范',",
      "      mount: function (root, ctx) {",
      "        root.innerHTML = '<div>……</div>';",
      "        // ctx.scene / ctx.kase / ctx.K / ctx.atlas 都可直接用",
      "      },",
      "      unmount: function () { /* 清理定时器、事件监听 */ }",
      "    }",
      "  }",
      "});"
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

    return '<main class="wrap">' +
      crumb([['#/', '总览'], ['#/guide', '接入指南']]) +
      '<div class="page-head"><div class="ph-top"><div>' +
      '<div class="ph-idx">EXTENDING</div>' +
      '<h1>怎么把这个系统扩成你自己的案例集</h1>' +
      '<p class="blurb">两条路：不写代码就上传案例包；需要真实算法示范时才写插件。两条路走完，效果一样——场景页自动长出 tab，检索路径自动收录。</p>' +
      '</div></div></div>' +

      /* ---- 方式 A：上传案例包 ---- */
      '<div class="sec-head" style="margin-top:4px">' +
      '<div class="sec-rail"><span class="sec-num">A</span><span class="kicker">UPLOAD PACKAGE · 推荐</span>' +
      '<span class="r"><span class="tag">不需要改任何文件</span></span></div>' +
      '<h2>上传一个案例包，三步接进去</h2>' +
      '<p>下载模板（zip，含一个能跑的示范页）→ 改清单、替换演示内容 → 把整个文件夹拖回网站。系统逐项检查格式，通过后当场出现在站点里。</p>' +
      '</div>' +

      '<div class="upcard">' +
      '<div class="upcard-l">' +
      '<h4>案例包是什么</h4>' +
      '<p>是一个<b>文件夹</b>：一份 JSON 清单 + 任意演示文件。清单写名称、所属场景和两块正文（专业背景 / 案例流程）；' +
      '示范可以是一个完整的 <b>index.html</b>、配套的 <b>demo.js</b> / <b>demo.css</b>，以及图片、JSON 数据等素材。</p>' +
      '<p>拖进弹窗时会整个读进浏览器——<b>html 自动内联 css 与 js、图片自动转成内嵌资源</b>，所以不需要服务器，双击 index.html 也能跑。</p>' +
      '<p>示范页跑在 <b>sandbox iframe</b> 里，你可以随便写样式和脚本，不会污染主站；只有 demo.js 没有 html 时，脚本会挂进 <b>Shadow DOM</b>，样式同样隔离。</p>' +
      '<div class="upcard-acts">' +
      '<button class="btn primary" data-import>＋ 打开「添加案例」</button>' +
      '<button class="btn" data-dl-template>↓ 下载案例包模板（.zip）</button>' +
      '</div>' +
      '<div class="upcard-note">模板解压后就是一个可直接运行的完整包：清单 + 示范页 + 样式 + 脚本，改完整个文件夹拖回去即可。' +
      '上传的案例保存在本机浏览器（localStorage），换电脑需重新上传；要永久发布给所有人，用下面的方式 B。</div>' +
      '</div>' +
      '<div class="upcard-r">' +
      '<table class="contract"><thead><tr><th>文件 / 字段</th><th>级别</th><th>说明</th></tr></thead><tbody>' +
      [
        ['case.json', '必填', '清单。建议就用这个名字，放在包根目录'],
        ['demo/index.html', '可选', '整页示范。自动内联 css/js，图片相对路径自动替换'],
        ['demo/demo.css', '可选', '示范页样式，只在沙箱里生效'],
        ['demo/demo.js', '可选', '示范脚本；无 html 时走模块模式，需导出 mount'],
        ['id', '必填', '小写字母 / 数字 / 连字符，全站唯一'],
        ['sceneId', '必填', '绑定场景，等于选定分类（环节 + 方法自动带出）'],
        ['title', '必填', '案例名称，页头与列表都用它'],
        ['tabs.background.sections[]', '必填', '每段 { title, html }；建议四段'],
        ['tabs.background.judge', '可选', '「30 秒判断」四格 { label, value, desc }'],
        ['tabs.workflow.steps[]', '可选', '每步 { name, do, effect, trap }'],
        ['tabs.demo.mode', '可选', 'auto（默认）/ page / module / builtin，一般不用写'],
        ['tabs.demo.builtin', '可选', '复用某个已有案例的示范（填它的 id）']
      ].map(function (r) {
        var req = r[1] === '必填' ? '<span class="req">必填</span>' : '<span class="opt">可选</span>';
        return '<tr><td>' + esc(r[0]) + '</td><td>' + req + '</td><td>' + rich(r[2]) + '</td></tr>';
      }).join('') +
      '</tbody></table>' +
      '</div>' +
      '</div>' +

      /* ---- 方式 B：插件 ---- */
      '<div class="sec-head" style="margin-top:26px">' +
      '<div class="sec-rail"><span class="sec-num">B</span><span class="kicker">PLUGIN · 需要真实示范时</span></div>' +
      '<h2>写一个案例插件</h2>' +
      '<p>要放真实的算法示范（可交互的曲线、可拖的参数），就用插件。下面三步走完即可。</p>' +
      '</div>' +

      '<div class="gsteps">' +
      '<div class="gstep"><div class="gn">1</div><div>' +
      '<h3>复制模板，改三处</h3>' +
      '<p>把 <b>assets/cases/_template.case.js</b> 复制成 <b>你的案例.case.js</b>，然后只改三处：<b>id</b>、<b>sceneId</b>、以及三个 tab 里的内容。</p>' +
      '<p>id 用 kebab-case，保证唯一；sceneId 必须是 <b>assets/data.js</b> 里已经存在的场景 id（比如 <b>w1</b> 是测井分层）。如果这个场景还不存在，先在 data.js 的对应环节 scenes 数组里加一条元数据。</p>' +
      '</div></div>' +

      '<div class="gstep"><div class="gn">2</div><div>' +
      '<h3>在 index.html 里挂上去</h3>' +
      '<p>找到页面底部的脚本区，在你的案例文件后面加一行：</p>' +
      K.code('<script src="assets/cases/你的案例.case.js"><' + '/script>', { file: 'index.html', note: '加在 shell.js 之前' }) +
      '<p>加载顺序是：data.js → registry.js → kit.js → 案例 → shell.js。案例必须在 shell.js 之前注册完，否则首屏渲染时找不到它。</p>' +
      '</div></div>' +

      '<div class="gstep"><div class="gn">3</div><div>' +
      '<h3>打开控制台看校验结果</h3>' +
      '<p>刷新页面，进 <a href="#/cases" style="color:var(--jade-d);font-weight:600">案例库</a>。系统会自动检查：id 是否规范、sceneId 是否存在、三段内容是否齐全、demo.mount 是否为函数、场景与案例的 demo 标记是否一致。</p>' +
      '<p>全绿就说明接入完成 —— 场景页的 tab、面包屑、相关场景、方法反查页里的条目都会自动出现，不需要改任何其它文件。</p>' +
      '</div></div>' +
      '</div>' +

      '<div class="section tight">' +
      '<div class="sec-head"><div><span class="kicker">STRUCTURE</span>' +
      '<h2 style="margin-top:8px">文件在哪</h2></div></div>' + fileTree + '</div>' +

      '<div class="section tight">' +
      '<div class="sec-head"><div><span class="kicker">CONTRACT</span>' +
      '<h2 style="margin-top:8px">契约字段</h2>' +
      '<p>只有标「必填」的字段缺失会报错，其余缺失只是控制台里的一条提醒。</p></div></div>' +
      '<div class="matrix-wrap"><table class="contract"><thead><tr><th>字段</th><th>级别</th><th>说明</th></tr></thead><tbody>' +
      fields + '</tbody></table></div></div>' +

      '<div class="section tight">' +
      '<div class="sec-head"><div><span class="kicker">EXAMPLE</span>' +
      '<h2 style="margin-top:8px">一个完整的案例声明</h2>' +
      '<p>这是最小可用的骨架，把省略号换成你的内容即可。</p></div></div>' +
      K.code(sample, { file: 'assets/cases/your-case.case.js' }) +
      '</div>' +

      '<div class="section tight">' +
      '<div class="sec-head"><div><span class="kicker">KIT</span>' +
      '<h2 style="margin-top:8px">内容怎么写：工具箱</h2>' +
      '<p>不要在案例里写 CSS 类名，用这些函数生成结构，版式改动会全站同步。</p></div></div>' +
      K.dtable(['函数', '用途'], [
        ['K.sec4(no, en, title, html)', '四段式中的一段，带编号与英文小标'],
        ['K.figure(svg, no, caption)', '插图 + 图注，图注支持 **粗体**'],
        ['K.judge([{label,value,desc}])', '页面顶部那排"30 秒判断"格子'],
        ['K.checklist(items)', '可勾选的数据准备清单，items 为 [名称, 规格, 标注要求]'],
        ['K.dtable(head, rows)', '普通数据表格'],
        ['K.pipeline(steps)', '带编号的流程步骤，每步可写效果与坑'],
        ['K.fails([{name, why}])', '失败模式四宫格'],
        ['K.cells([[标签, 值]])', '流程页右侧的指标格'],
        ['K.meter(diff)', '三段式难度条'],
        ['K.refs([...], href)', '参考方向胶囊'],
        ['K.callout(text, "warn")', '提示条'],
        ['K.code(str, {file})', '代码块，带语法着色']
      ]) +
      K.callout('文本里可以直接用 **粗体** 与 `等宽` 两种标记，所有函数都会自动转义 HTML，不需要手动防注入。') +
      '</div>' +

      '<div class="section tight">' +
      '<div class="sec-head"><div><span class="kicker">PITFALLS</span>' +
      '<h2 style="margin-top:8px">四个常踩的坑</h2></div></div>' +
      '<div class="fails" style="grid-template-columns:1fr 1fr">' +
      '<div class="fail"><div class="fi">PITFALL 01</div><h5>script 顺序放反</h5><p>案例写在 shell.js 后面，页面已经渲染完了才注册，控制台里能看到但场景页没有 tab。案例脚本必须在 shell.js 之前。</p></div>' +
      '<div class="fail"><div class="fi">PITFALL 02</div><h5>sceneId 拼错</h5><p>id 区分大小写。写错不会报 JS 错误，只是这个案例永远不出现。控制台的"绑定场景"列会显示 ⚠。</p></div>' +
      '<div class="fail"><div class="fi">PITFALL 03</div><h5>demo 里没有清理</h5><p>用 setInterval / addEventListener 的示范要在 unmount 里清掉，否则切换场景后老定时器还在跑。</p></div>' +
      '<div class="fail"><div class="fi">PITFALL 04</div><h5>把样式写死在案例里</h5><p>内联颜色会让案例在改配色时掉队。颜色一律用 var(--jade) 这类令牌，或干脆用 K.* 生成。</p></div>' +
      '</div></div>' +

      '<div class="pending" style="margin-top:36px"><div class="pending-top">' +
      '<span class="badge-ready">下一步</span><h3>从最简单的案例开始</h3></div>' +
      '<p>如果还没有想好做什么，先挑一个 <b>数据现成、任务边界清晰</b> 的场景：把四段式写满、流程写三步、示范可以先不做。一个只有 80 行内容的案例，也比一个空着的场景有用。</p>' +
      '<div class="pending-actions">' +
      '<a class="btn primary" href="#/cases">看当前案例库 →</a>' +
      '<a class="btn" href="#/scene/w1">对照测井分层的写法</a></div></div>' +
      '</main>';
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

  /* ---------- 数字滚动：.spec-row .v / .ph-stat .n 里的数值从 0 滚到目标 ---------- */
  function animateNumbers(scope) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var els = scope.querySelectorAll('.spec-row .v, .ph-stat .n');
    var jobs = [];
    [].forEach.call(els, function (el) {
      var node = el.firstChild;
      if (!node || node.nodeType !== 3) return;
      var txt = node.nodeValue;
      var parts = txt.split('/');
      if (!parts.every(function (p) { return /^\d+$/.test(p.trim()); })) return;
      var targets = parts.map(function (p) { return parseInt(p, 10); });
      jobs.push({ node: node, targets: targets, sep: '/' });
    });
    [].forEach.call(scope.querySelectorAll('.roll'), function (r) {
      var fin = parseInt(r.getAttribute('data-n'), 10);
      if (!isNaN(fin)) jobs.push({ node: r.firstChild, targets: [fin], sep: '/' });
    });
    if (!jobs.length) return;
    var t0 = null, DUR = 950;
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / DUR);
      var e = 1 - Math.pow(1 - k, 3);            /* easeOutCubic */
      jobs.forEach(function (j) {
        j.node.nodeValue = j.targets.map(function (v) { return Math.round(v * e); }).join(j.sep);
      });
      if (k < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- 首页 V2 交互：流程邻卡联动 / 矩阵行列高亮与模式 / 滚动浮现 ---------- */
  function bindReveal(scope) {
    var els = scope.querySelectorAll('.rv');
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      [].forEach.call(els, function (e) { e.classList.add('on'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('on'); io.unobserve(en.target); } });
    }, { threshold: 0.1 });
    [].forEach.call(els, function (e) { io.observe(e); });
  }
  function bindHome(view) {
    var fcs = view.querySelectorAll('.fc[data-i]');
    [].forEach.call(fcs, function (c) {
      c.addEventListener('mouseenter', function () {
        var i = +c.getAttribute('data-i');
        [].forEach.call(fcs, function (x) {
          x.classList.toggle('near', Math.abs(+x.getAttribute('data-i') - i) === 1);
        });
      });
      c.addEventListener('mouseleave', function () {
        [].forEach.call(fcs, function (x) { x.classList.remove('near'); });
      });
    });
    var mx = view.querySelector('.mxv');
    if (!mx) return;
    mx.addEventListener('click', function (e) {
      var b = e.target.closest('.mx-modes button');
      if (!b) return;
      e.preventDefault();
      [].forEach.call(mx.querySelectorAll('.mx-modes button'), function (x) { x.classList.toggle('on', x === b); });
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
        info.textContent = (st ? st.name : '') + ' × ' + (M[cc] ? M[cc].name : cc) + '：' + (v ? v.textContent : '?') + ' 个场景标签';
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

    /* 数字滚动：首页速览与页面统计从 0 滚到目标值 */
    animateNumbers(view);
    bindReveal(view);
    if (!p.length) bindHome(view);

    // 页面级交互
    if (p[0] === 'stage') bindFilters(view);
    if (p[0] === 'scene') {
      var sc2 = A.index.byScene[p[1]];
      var all2 = sc2 && Cases.bySceneAll(sc2.id);
      var c2 = all2 && all2.filter(function (x) { return x.id === r.q.case; })[0] || (all2 && all2[0]) || null;
      if (c2) bindTabs(sc2, c2);
      /* 多案例切换器 */
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
  }

  function pageTitle(p) {
    if (!p.length) return '总览';
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

  /* 页头实时时钟（元素随路由重建，逐秒查询更新） */
  setInterval(function () {
    var c = document.getElementById('live-clock');
    if (!c) return;
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    c.textContent = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }, 1000);
  render();

  // 启动自检：把注册阶段的异常打到控制台，便于排查
  var probs = Cases.problems();
  if (probs.length) console.warn('[case registry]', probs);

})(window);
