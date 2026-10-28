/* =========================================================
   i18n —— 界面层中英双语（数据与案例正文保持原文）
   机制：渲染后遍历文本节点做「整句精确匹配 + 计数规则正则」替换，
   不改任何 HTML 生成代码；语言持久化在 localStorage(atlas.lang)。
   ========================================================= */
(function (global) {
  'use strict';

  var KEY = 'atlas.lang';
  var lang = 'zh';
  try { lang = localStorage.getItem(KEY) || 'zh'; } catch (e) { }

  /* ---------- 精确短语词典（zh → en） ---------- */
  var D = {
    /* 导航 */
    '切换到亮色': 'Switch to light theme', '切换到暗色': 'Switch to dark theme',
    '总览': 'Overview', '作业链': 'Full Chain', '案例库': 'Case Library', '接入指南': 'Guide',
    '管理': 'Admin', '管理后台': 'Admin Console', '＋ 添加案例': '＋ Add Case', '添加案例': 'Add Case', '更多': 'More', '快捷操作': 'Quick actions', '检索': 'Search',
    /* Hero */
    '向深处探索': 'Explore deeper.', '让智能抵达': 'Intelligence ahead.',
    '石油勘探开发 · 智能化可能性地图': 'Petroleum Exploration · An AI Possibility Atlas',
    '从地层中的信号，到钻头前的决策。': 'From signals in the formation to decisions at the drill bit.',
    '沿着完整作业链，探索人工智能如何走进石油现场。': 'Explore how AI connects to the petroleum value chain.',
    '探索智能钻井': 'Explore Drilling', '纵览完整作业链': 'Explore the Full Chain',
    '从专业场景出发，在交互中理解算法。': 'Real questions. Interactive ways to understand algorithms.',
    '穿透地层，连接数据与决策': 'Connecting geology, data and decisions',
    '地表井场': 'Surface site', '井筒剖面': 'Well section', '目标地层': 'Target formation',
    '正在准备三维井场…': 'Preparing the 3D drilling site…',
    '场景组成': 'Scene elements', '钻井井场、分层岩体与井筒剖面': 'Drilling site, rock formations and well cross-section',
    '暂停首页动态效果': 'Pause homepage animation', '播放首页动态效果': 'Play homepage animation', '首页静态展示': 'Static homepage scene',
    '向下探索 · 从全景到现场': 'SCROLL TO EXPLORE',
    '地层与轨迹为概念示意': 'Conceptual formation and well trajectory',
    '暂停动效': 'Pause motion', '播放动效': 'Play motion', '静态展示': 'Static view',
    '从一口井，': 'Start with one well.', '看见智能的可能。': 'Discover what AI can do.',
    '提速、预警、控轨、减振、调浆。沿着钻井现场的关键问题，进入可以亲手操作的算法示范。': 'Explore drilling speed, early warnings, trajectory control, vibration and mud design through interactive demos.',
    '钻井案例': 'Drilling cases', '等待你的探索': 'Ready to explore',
    '示范用于理解算法，不代表现场验证结果。': 'Algorithm demonstrations, not field-validated results.',
    '进入钻井专题': 'Explore Drilling',
    '每一个环节，都有新的可能。': 'New possibilities at every stage.',
    '把技术，': 'Connect technology.', '连接到现场。': 'Understand the field.',
    '看清图像、理解时序、提取知识、搜索决策。五类 AI 方法交织成网，连接石油作业的每一个环节。': 'Five AI methods connect images, time series, knowledge and decisions across the petroleum value chain.',
    '从计算机视觉开始 →': 'Start with computer vision →',
    '悬停查看关联 · 点击进入环节': 'Hover to explore · Click to open a stage',
    '让每一处交汇，都清晰可见。': 'See where methods and stages meet.',
    '下一种可能，': 'Your next discovery', '从你的探索开始。': 'starts here.',
    '探索全部案例': 'Explore All Cases',
    '石油勘探开发的智能化可能性地图': 'Petroleum E&D · AI Possibility Atlas',
    '让人工智能走进石油勘探开发的每一步。': 'Bringing AI into every step of petroleum exploration & development.',
    '浏览完整作业链': 'Browse the Full Chain', '看一个可运行示范': 'Watch a Live Demo',
    '作业环节': 'Stages', '候选场景': 'Scenes', '接入案例': 'Cases', '类 AI 方法': 'AI Methods',
    'DATA COCKPIT · 数据驾驶舱': 'DATA COCKPIT',
    '难度分布': 'Difficulty Mix', '方法构成（场景标签）': 'Method Mix · scene tags', '案例覆盖': 'Case Coverage',
    '覆盖 %': 'coverage',
    /* 首页区块 */
    '从钻井现场出发，探索人工智能在石油作业中的应用。': 'Explore AI in petroleum operations, starting at the drilling site.',
    '浏览案例库': 'Browse Cases', '钻井井场剖面 · 概念示意': 'Drilling site cutaway · Concept model',
    '应用场景': 'Scenes', '已接入案例': 'Registered Cases', 'AI 技术方法': 'AI Methods',
    '钻井精选': 'Drilling Highlights',
    '调整参数，观察钻速、预警与井眼轨迹的变化。': 'Adjust parameters to explore drilling speed, warnings and well trajectories.',
    '调整钻井参数，对比推荐方案与预测钻速。': 'Adjust drilling parameters and compare recommendations with predicted penetration rates.',
    '查看全部场景': 'View All Scenes', '案例': 'cases',
    '从勘探到加工，按作业顺序进入各环节。': 'Follow each stage from exploration to processing.',
    '打开作业链工作台': 'Open the Chain Workspace',
    '技术用在哪里': 'Where AI Fits',
    '按方法浏览，或点击矩阵交点查看对应案例。': 'Browse by method or select a matrix cell to find related cases.',
    '按 AI 方法浏览': 'Browse by AI method',
    '点击交点，筛选对应案例': 'Select a cell to filter cases',
    '颜色越深，关联场景越多；同一场景可使用多种方法。': 'Darker cells indicate more scenes. A scene can use several methods.',
    '作业链数字地图：从地质勘察到加工': 'Process Map: from Survey to Refining',
    '五类 AI 技术的能力图谱': 'Five AI Capability Cards',
    '方法 × 环节热力矩阵：哪里密集，哪里空白': 'Method × Stage Heatmap: dense vs. blank',
    '精选案例：现在就能跑给你看': 'Featured Cases — run them now',
    '三层系统：数据、案例、外壳': 'Three-Layer System: data · cases · shell',
    '完整作业链': 'Full Chain', '环节 · 68 场景 →': 'stages · 68 scenes →',
    '场景': 'scenes',
    /* 矩阵 */
    '环节 ＼ 方法': 'Stage ＼ Method', '数量': 'Count', '环节内占比': 'Share in Stage',
    '色阶': 'Scale',
    '悬停格子查看「环节 × 方法」关联 · 点击跳转筛选结果': 'Hover a cell for stage × method detail · click to jump with filter',
    '关联合计（一景可多法）': 'Tag total (multi-tag per scene)',
    /* 筛选 */
    '方法': 'Method', '难度': 'Difficulty', '全部难度': 'Any difficulty', '全部方法': 'Any method',
    '低': 'Low', '中': 'Mid', '高': 'High',
    '有案例': 'Has case', '可运行': 'Runnable', '✕ 清空': '✕ Clear',
    '全部环节': 'Any stage', '全部技术': 'Any method', '全部状态': 'Any status',
    '✓ 通过': '✓ Pass', '含示范': 'With demo', '本地导入': 'Local import',
    '只看有问题的': 'Only Issues', '显示全部明细': 'Show All Details',
    '卡片': 'Cards', '表格': 'Table',
    '流程地图': 'Process Map', '列表视图': 'List View',
    /* 场景页 tab 与实验台 */
    '专业背景': 'Background', '案例流程': 'Workflow', '可运行示范': 'Live Demo',
    '上一环节': 'Prev stage', '下一环节': 'Next stage', '← 返回': '← Back',
    '打开案例 →': 'Open case →', '运行演示': 'Run demo',
    /* 检索面板 */
    '作业环节': 'Stages', '候选场景': 'Scenes', '接入案例': 'Cases', '技术方法': 'Methods',
    '↑↓ 选择': '↑↓ Navigate', '↵ 打开': '↵ Open', 'ESC 关闭': 'ESC Close',
    '没有符合条件的场景': 'No scenes match the filters',
    '换个筛选条件，或点「✕ 清空」。': 'Try other filters, or hit “✕ Clear”.',
    '没有符合条件的案例': 'No cases match the filters',
    /* 案例库/流程 */
    '案例库与接入状态': 'Case Library & Registry', '已注册': 'Registered', '含示范': 'With demo', '待接入': 'Pending',
    '个场景已有案例实现（共 ': 'scenes covered (of ',
    '重新校验': 'Re-validate', '打开 →': 'Open →', '移除': 'Remove', '删除': 'Delete', '恢复': 'Restore',
    'VALIDATION · 校验中心': 'VALIDATION CENTER', '逐案例校验明细': 'Per-case validation detail',
    'BACKLOG': 'BACKLOG', '还有 ': 'Remaining: ',
    ' 个场景等待接入': ' scenes awaiting cases',
    /* 指南/页脚 */
    '关于': 'About', '地图': 'Map',
    '完整链条 →': 'Full chain →', '案例库 →': 'Library →', '接入指南 →': 'Guide →',
    /* 空态 */
    '还没有任何案例注册': 'No cases registered yet'
  };

  /* 方法名映射 */
  var METHODS = {
    '计算机视觉': 'Computer Vision', '时序预测': 'Time Series', '自然语言处理': 'NLP',
    '优化算法': 'Optimization', '知识图谱': 'Knowledge Graph'
  };

  /* ---------- 计数/动态规则（正则，捕获组直传） ---------- */
  var RULES = [
    [/^(\d+) 个场景$/, '$1 scenes'],
    [/^(\d+) 个案例$/, '$1 cases'],
    [/^(\d+) 个已接入$/, '$1 registered'],
    [/^v([\d.]+) · 全链 (\d+) 个候选场景$/, 'v$1 · $2 candidate scenes'],
    [/^案例系统 · (\d+) 个已接入$/, 'Case system · $1 registered'],
    [/^(\d+) 案例已载入 · ?$/, '$1 cases loaded · '],
    [/^把从地质勘察到加工的整条作业链拆成 (\d+) 个候选场景，逐个回答：哪一步能被算法替掉、要准备什么数据、难在哪里——每个场景都配一个能在浏览器里直接运行的智能化示范。$/,
      'The full chain from survey to refining, split into $1 candidate scenes — each answers: which step can AI take over, what data it needs, where it is hard. Every scene ships a demo that runs right in your browser.'],
    [/^个场景已有案例 · 其中 (\d+) 个带可运行示范$/, 'scenes covered · $1 with runnable demos'],
    [/^低 (\d+) · 中 (\d+) · 高 (\d+)$/, 'Low $1 · Mid $2 · High $3'],
    [/^难度 低(\d+)\/中(\d+)\/高(\d+)$/, 'Difficulty L$1/M$2/H$3'],
    [/^(\d+) 次关联$/, '$1 tags'],
    [/^个场景已有案例实现（共 (\d+) 个案例））?$/, 'of scenes covered ($1 cases)'],
    [/^还有 (\d+) 个场景等待接入$/, '$1 scenes still awaiting cases'],
    [/^个场景已有案例实现$/, 'scenes with cases'],
    [/^(\d+) 个场景标签$/, '$1 scene tags'],
    [/^口径：单元格 = 该环节中带此方法标签的场景数；因一景可多法，关联合计 (\d+) ≥ 去重场景 (\d+)$/,
      'Cell = scenes in this stage tagged with the method; a scene may carry multiple tags, so tag total $1 ≥ unique scenes $2'],
    [/^SANDBOX · 交互实验台 · 纯前端真实算法$/, 'SANDBOX · Interactive Lab · real algorithms, pure front-end'],
    [/^(\d+) 个场景$ 个$/, '$1 scenes'],
    [/^场景 (\d+)$/, '$1 scenes'],
    [/^01 地质勘察 → 13 加工 · 沿作业顺序排列 · 点击任意环节进入场景清单$/,
      '01 Survey → 13 Refining · in operational order · click any stage'],
    [/^01 地质勘察 → 13 加工 · 悬停查看方法构成 · 点击进入环节$/,
      '01 Survey → 13 Refining · hover for method mix · click to open'],
    [/^两种浏览方式：流程地图看结构与次序，列表看每个环节的简介与前几个场景。悬停地图节点可在下方预览环节详情。$/,
      'Two views: the map shows structure & order, the list shows each stage intro. Hover a map node to preview it below.'],
    [/^从地质勘察到加工的 13 个环节$/, '13 stages, from survey to refining'],
    [/^搜索环节名称 \/ 英文 \/ 简介…$/, 'Search stages…'],
    [/^搜索场景…$/, 'Search scenes…'],
    [/^搜索案例 \/ 场景 \/ id…$/, 'Search cases / scenes / id…'],
    [/^搜索环节、场景、案例、技术…（如：断层 \/ 示功图 \/ knn）$/,
      'Search stages, scenes, cases, methods… (e.g. fault / dynocard / knn)'],
    [/^没有匹配的环节 \/ 场景 \/ 案例 \/技术$/, 'No matching stages / scenes / cases / methods'],
    [/^没有匹配的环节 \/ 场景 \/ 案例 \/ 技术$/, 'Nothing matched'],
    [/^试试「断层」「示功图」「knn」「压裂」…$/, 'Try “fault”, “dynocard”, “knn”, “frac”…'],
    [/^三块内容依次为 background \/ workflow \/ demo，● 已提供、○ 未提供。同一场景可挂多个案例；删除上传案例清本机存档，删除插件案例仅隐藏可恢复。$/,
      'Columns are background / workflow / demo (● present ○ missing). Multiple cases per scene are supported; removing an upload clears local storage, removing a plugin case only hides it.'],
    [/^业务简介|代表性场景$/, ''],
    [/^代表性场景$/, 'Typical scenes'],
    [/^进入环节 →$/, 'Open stage →'],
    [/^本场景共有 (\d+) 个案例，当前展示$/, '$1 cases on this scene · showing'],
    [/^(\d+) 个场景$/g, '$1 scenes']
  ];

  /* placeholder / title 属性词典 */
  var ATTRS = {
    '搜索场景…': 'Search scenes…',
    '搜索环节名称 / 英文 / 简介…': 'Search stages…',
    '搜索案例 / 场景 / id…': 'Search cases / scenes / id…',
    '全局检索（场景 / 案例 / 环节 / 技术）': 'Global search (scenes / cases / stages / methods)',
    '清空全部筛选': 'Clear all filters'
  };

  function translateText(t) {
    t = t.replace(/\u00a0/g, ' ');
    if (D[t] !== undefined) return D[t];
    if (METHODS[t] !== undefined) return METHODS[t];
    for (var i = 0; i < RULES.length; i++) {
      var m = t.match(RULES[i][0]);
      if (m) {
        var out = RULES[i][1];
        for (var g = 1; g < m.length; g++) out = out.replace(new RegExp('\\$' + g, 'g'), m[g]);
        return out;
      }
    }
    /* 环节标题「XX环节的可智能化场景」→ 英文名 + 副题 */
    var mt = t.match(/^(.{2,8})环节的可智能化场景$/);
    if (mt && global.ATLAS && global.ATLAS.index) {
      for (var sid2 in global.ATLAS.index.byStage) {
        var st2 = global.ATLAS.index.byStage[sid2];
        if (st2 && st2.name === mt[1]) return (st2.en || mt[1]) + ' · AI-candidate scenes';
      }
    }
    /* 环节名：自动采用 data.js 的英文名 */
    if (global.ATLAS && global.ATLAS.index) {
      for (var sid in global.ATLAS.index.byStage) {
        var st = global.ATLAS.index.byStage[sid];
        if (st && st.name === t) return st.en || t;
      }
    }
    return null;
  }

  function apply(root) {
    if (lang !== 'en' || !root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      if (n.parentElement && n.parentElement.closest('[data-lang]')) return;
      var raw = n.nodeValue;
      if (!raw || !raw.trim()) return;
      var t = translateText(raw.trim());
      if (t !== null && t !== raw.trim()) {
        var lead = raw.match(/^\s*/)[0], tail = raw.match(/\s*$/)[0];
        n.nodeValue = lead + t + tail;
      }
    });
    root.querySelectorAll('[placeholder],[title]').forEach(function (el) {
      ['placeholder', 'title'].forEach(function (a) {
        var v = el.getAttribute(a);
        if (v && ATTRS[v]) el.setAttribute(a, ATTRS[v]);
        else if (v) { var tv = translateText(v); if (tv && tv !== v) el.setAttribute(a, tv); }
      });
    });
    document.documentElement.setAttribute('lang', 'en');
  }

  function set(l) {
    lang = l;
    try { localStorage.setItem(KEY, l); } catch (e) { }
    document.documentElement.setAttribute('lang', l === 'en' ? 'en' : 'zh-CN');
    global.dispatchEvent(new Event('hashchange'));
  }

  global.I18N = {
    t: function (txt) { try { return translateText(String(txt)); } catch (e) { return null; } },
    get lang() { return lang; },
    apply: apply,
    toggle: function () { set(lang === 'zh' ? 'en' : 'zh'); },
    label: function () { return lang === 'zh' ? 'EN' : '中'; }
  };
})(window);
