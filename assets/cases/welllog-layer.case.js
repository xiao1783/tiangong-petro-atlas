/* =========================================================
   案例 01 · 测井曲线智能分层
   ---------------------------------------------------------
   这是一个"案例插件"的完整示例：
   · 只依赖 Cases 注册表与 K 工具箱，不引用任何外壳内部变量
   · 三块内容（background / workflow / demo）都是可替换的
   · 删掉这个文件 + index.html 里对应的一行 script，系统照常运行，
     只是 w1 场景会回到"待接入"状态
   ========================================================= */

(function () {

  var esc = K.esc;

  /* =========================================================
     插图：用 JS 生成，避免手写几百行 path
     ========================================================= */

  /* 一条带噪声的阶梯曲线，模拟测井响应 */
  function grPolyline(xL, xW, yT, yH, layers, seed) {
    var rnd = seed || 1;
    function r() { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; }
    var pts = [];
    var n = 260;
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      var y = yT + t * yH;
      // 找到当前所在层
      var acc = 0, v = layers[0].v;
      for (var j = 0; j < layers.length; j++) {
        if (t >= layers[j].from) v = layers[j].v;
      }
      // 层内缓变 + 噪声
      var local = (r() - 0.5) * 0.055;
      pts.push((xL + (v + local) * xW).toFixed(1) + ',' + y.toFixed(1));
    }
    return pts.join(' ');
  }

  function figManual() {
    var xL = 118, xW = 210, yT = 30, yH = 230;
    var layers = [
      { from: 0, v: 0.52 },
      { from: 0.26, v: 0.20 },
      { from: 0.46, v: 0.66 },
      { from: 0.62, v: 0.36 },
      { from: 0.70, v: 0.58 },
      { from: 0.90, v: 0.30 }
    ];
    var s = '';
    s += '<svg viewBox="0 0 620 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="人工卡层误差示意">';

    // 深度刻度
    for (var d = 0; d <= 100; d += 20) {
      var y = yT + d / 100 * yH;
      s += '<line x1="96" y1="' + y + '" x2="' + (xL + xW + 6) + '" y2="' + y + '" stroke="#e9e4d8" stroke-width="1" stroke-dasharray="2 4"/>';
      s += '<text x="88" y="' + (y + 3.5) + '" text-anchor="end" font-size="9" font-family="monospace" fill="#9ba3a9">' + (1000 + d * 3) + '</text>';
    }

    // 真实界面
    var truth = [26, 46, 62, 70, 90];
    truth.forEach(function (p) {
      var y = yT + p / 100 * yH;
      s += '<line x1="' + xL + '" y1="' + y + '" x2="' + (xL + xW + 30) + '" y2="' + y + '" stroke="#2f7d6b" stroke-width="1.4" stroke-dasharray="5 3"/>';
    });

    // 曲线
    s += '<polyline points="' + grPolyline(xL, xW, yT, yH, layers, 7) + '" fill="none" stroke="#31393d" stroke-width="1.3" stroke-linejoin="round"/>';
    s += '<line x1="' + (xL + xW + 2) + '" y1="' + yT + '" x2="' + (xL + xW + 2) + '" y2="' + (yT + yH) + '" stroke="#c9c2b0" stroke-width="1"/>';

    // 人工界面（橙色，偏移）
    var manual = [30, 49, 62, 90];
    manual.forEach(function (p, i) {
      var y = yT + p / 100 * yH;
      s += '<line x1="' + (xL - 12) + '" y1="' + y + '" x2="' + (xL + xW + 18) + '" y2="' + y + '" stroke="#b26a39" stroke-width="1.6"/>';
      s += '<circle cx="' + (xL - 12) + '" cy="' + y + '" r="2.6" fill="#b26a39"/>';
    });

    // 薄层（真实存在，人工漏卡）
    var yb1 = yT + 0.70 * yH, yb2 = yT + 0.745 * yH;
    s += '<rect x="' + xL + '" y="' + yb1 + '" width="' + (xW + 4) + '" height="' + (yb2 - yb1) + '" fill="#f2d98a" opacity=".5" rx="2"/>';
    s += '<line x1="' + (xL + xW + 34) + '" y1="' + ((yb1 + yb2) / 2) + '" x2="' + (xL + xW + 62) + '" y2="' + ((yb1 + yb2) / 2) + '" stroke="#b26a39" stroke-width="1"/>';
    s += '<text x="' + (xL + xW + 66) + '" y="' + ((yb1 + yb2) / 2 + 3.5) + '" font-size="10" fill="#b26a39">0.8 m 薄层 · 漏卡</text>';

    // 标注
    s += '<text x="' + (xL + xW + 30) + '" y="' + (yT + 0.26 * yH - 7) + '" font-size="9.5" fill="#2f7d6b">真实界面</text>';
    s += '<text x="' + (xL - 14) + '" y="' + (yT + 0.30 * yH - 7) + '" font-size="9.5" fill="#b26a39" text-anchor="end">人工卡层</text>';

    // 偏差标注
    var y1 = yT + 0.26 * yH, y2 = yT + 0.30 * yH;
    s += '<line x1="' + (xL + xW - 20) + '" y1="' + y1 + '" x2="' + (xL + xW - 20) + '" y2="' + y2 + '" stroke="#b26a39" stroke-width="1"/>';
    s += '<line x1="' + (xL + xW - 24) + '" y1="' + y1 + '" x2="' + (xL + xW - 16) + '" y2="' + y1 + '" stroke="#b26a39" stroke-width="1"/>';
    s += '<line x1="' + (xL + xW - 24) + '" y1="' + y2 + '" x2="' + (xL + xW - 16) + '" y2="' + y2 + '" stroke="#b26a39" stroke-width="1"/>';
    s += '<text x="' + (xL + xW + 62) + '" y="' + ((y1 + y2) / 2 + 3) + '" font-size="9.5" fill="#b26a39">偏移 1.2 m</text>';

    s += '<text x="' + xL + '" y="16" font-size="9.5" font-family="monospace" fill="#9ba3a9" letter-spacing="1">GR (API)</text>';
    s += '<text x="' + (xL + xW + 2) + '" y="' + (yT + yH + 18) + '" text-anchor="end" font-size="9.5" font-family="monospace" fill="#9ba3a9">深度 / m</text>';
    s += '</svg>';
    return s;
  }

  function figAI() {
    var steps = [
      ['合成曲线', '单井 GR · 已知层界面', '#e6f1ec', '#2f7d6b'],
      ['分段代价', '前缀和 · 段内平方误差', '#e7eef9', '#41699b'],
      ['最优分段', '动态规划 + 惩罚项', '#efe9f4', '#7e5a8d'],
      ['最小层厚', '至少 8 点 · 1 m', '#f8ecdf', '#b26a39'],
      ['容差评价', '界面匹配 · 误检漏检', '#f1f1dd', '#767a2e']
    ];
    var s = '<svg viewBox="0 0 620 132" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="最优分段方法流程">';
    var w = 108, gap = 17, x = 8, y = 26;
    steps.forEach(function (st, i) {
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="72" rx="8" fill="' + st[2] + '" stroke="' + st[3] + '" stroke-opacity=".28"/>';
      s += '<rect x="' + x + '" y="' + y + '" width="3" height="72" rx="1.5" fill="' + st[3] + '"/>';
      s += '<text x="' + (x + 13) + '" y="' + (y + 23) + '" font-size="11.5" font-weight="600" fill="#242b2e">' + st[0] + '</text>';
      st[1].split(' · ').forEach(function (line, k) {
        s += '<text x="' + (x + 13) + '" y="' + (y + 43 + k * 14) + '" font-size="9" fill="#5d666d">' + line + '</text>';
      });
      s += '<text x="' + (x + w - 11) + '" y="' + (y + 66) + '" text-anchor="end" font-size="8.5" font-family="monospace" fill="' + st[3] + '">0' + (i + 1) + '</text>';
      if (i < steps.length - 1) {
        s += '<path d="M' + (x + w + 3) + ' ' + (y + 36) + 'h9m-3.5-3.4 3.6 3.4-3.6 3.4" stroke="#c9c2b0" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
      }
      x += w + gap;
    });
    // 人工边界说明
    s += '<text x="8" y="16" font-size="9.5" font-family="monospace" fill="#9ba3a9" letter-spacing="1">ALGORITHM</text>';
    s += '<text x="' + (8 + w + gap * 3) + '" y="16" font-size="9.5" font-family="monospace" fill="#b26a39" letter-spacing="1">EVIDENCE</text>';
    s += '<line x1="8" y1="112" x2="' + (8 + w + gap * 2 + w) + '" y2="112" stroke="#2f7d6b" stroke-width="1.4"/>';
    s += '<text x="' + (8 + w + gap * 2 + w / 2) + '" y="126" text-anchor="middle" font-size="9.5" fill="#2f7d6b">最小化段内误差与界面惩罚</text>';
    s += '<line x1="' + (8 + w + gap * 3) + '" y1="112" x2="' + (8 + w * 5 + gap * 4) + '" y2="112" stroke="#b26a39" stroke-width="1.4"/>';
    s += '<text x="' + (8 + w * 4 + gap * 3.5) + '" y="126" text-anchor="middle" font-size="9.5" fill="#b26a39">以真值检查界面偏差</text>';
    s += '</svg>';
    return s;
  }

  function figTolerance() {
    var s = '<svg viewBox="0 0 620 186" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="容差匹配示意">';
    var cols = [
      { x: 8, tag: 'TP · 命中', color: '#2f7d6b', bg: '#e6f1ec', det: 0.62, truth: 0.60, note: '落在 ±1 m 内' },
      { x: 214, tag: 'FP · 多检', color: '#b26a39', bg: '#f8ecdf', det: 0.30, truth: 0.68, note: '容差内没有真界面' },
      { x: 420, tag: 'FN · 漏检', color: '#b05a51', bg: '#f9e9e5', det: null, truth: 0.44, note: '真界面没被检出' }
    ];
    cols.forEach(function (c) {
      var w = 192, yT = 34, yH = 108;
      s += '<rect x="' + c.x + '" y="10" width="' + w + '" height="' + (yH + 42) + '" rx="9" fill="#fdfcf9" stroke="#e9e4d8"/>';
      s += '<text x="' + (c.x + 12) + '" y="26" font-size="9.5" font-family="monospace" fill="' + c.color + '" letter-spacing=".8">' + c.tag + '</text>';

      // 曲线轴
      var ax = c.x + 26, aw = w - 52;
      s += '<line x1="' + ax + '" y1="' + yT + '" x2="' + ax + '" y2="' + (yT + yH) + '" stroke="#ddd7c8"/>';
      s += '<line x1="' + (ax + aw) + '" y1="' + yT + '" x2="' + (ax + aw) + '" y2="' + (yT + yH) + '" stroke="#ddd7c8"/>';

      // 容差带
      var ty = yT + c.truth * yH;
      s += '<rect x="' + ax + '" y="' + (ty - 11) + '" width="' + aw + '" height="22" fill="' + c.bg + '"/>';
      s += '<line x1="' + ax + '" y1="' + ty + '" x2="' + (ax + aw) + '" y2="' + ty + '" stroke="#2f7d6b" stroke-width="1.2" stroke-dasharray="4 3"/>';
      s += '<text x="' + (ax + aw + 4) + '" y="' + (ty + 3.5) + '" font-size="8" font-family="monospace" fill="#2f7d6b">真</text>';

      // 检测线
      if (c.det !== null) {
        var dy = yT + c.det * yH;
        s += '<line x1="' + ax + '" y1="' + dy + '" x2="' + (ax + aw) + '" y2="' + dy + '" stroke="' + c.color + '" stroke-width="2"/>';
        s += '<circle cx="' + ax + '" cy="' + dy + '" r="3" fill="' + c.color + '"/>';
        s += '<text x="' + (ax + aw + 4) + '" y="' + (dy + 3.5) + '" font-size="8" font-family="monospace" fill="' + c.color + '">测</text>';
        if (c.det !== c.truth) {
          s += '<line x1="' + (ax + 14) + '" y1="' + ty + '" x2="' + (ax + 14) + '" y2="' + dy + '" stroke="#c9c2b0" stroke-width="1" stroke-dasharray="2 2"/>';
        }
      }
      s += '<text x="' + (c.x + 12) + '" y="' + (yT + yH + 26) + '" font-size="9.5" fill="#79828a">' + c.note + '</text>';
    });
    s += '</svg>';
    return s;
  }

  /* =========================================================
     注册
     ========================================================= */
  var solution = {
    id: 'welllog-layer', kind: '序列优化与变点检测',
    problem: '测井曲线的噪声和薄层变化容易造成层界面误检或漏检',
    inputs: '640点合成GR曲线、噪声、最小层厚与已知真实界面',
    method: '段内平方误差＋惩罚动态规划',
    mechanism: '用前缀和计算任意井段的拟合代价，动态规划在段内误差与新增界面惩罚之间寻找最优分段；没有训练神经网络。',
    value: '自动提出候选层界面，并用已知真值检查漏检、误检和位置偏差',
    verify: '同时查看精确率、召回率、F1与界面平均偏差',
    task: '先记录当前分层结果，再提高噪声或惩罚系数β，比较候选层数、薄层漏检和F1，观察过分割与欠分割之间的取舍。',
    boundary: '本页是一口已知真实界面的合成井。指标随当前参数计算，没有接入区块实测资料，也没有执行跨井训练、邻井层序约束或人工修改回流。',
    controls: ['c-beta','c-noise','c-layers'],
    steps: [
      {name:'生成合成曲线',role:'数据输入',action:'按当前层数、噪声与随机种子生成640个GR采样点，保留真实界面仅供评价。',effect:'使曲线与评价真值可以重复核对。',trap:'合成真值不能当成真实区块标注。'},
      {name:'计算段内代价',role:'特征与代价',action:'用GR的前缀和与平方和计算任意候选井段相对段均值的平方误差。',effect:'把“这一段是否相对稳定”转成可计算的代价。',trap:'渐变段和噪声同样可能增加段内代价。'},
      {name:'惩罚动态规划',role:'算法核心',action:'在至少8点的分段约束下，最小化段内误差与新增界面的惩罚，回溯得到最优切分位置。',effect:'用惩罚系数调节过分割与欠分割。',trap:'较大的β可能合并真实薄层。'},
      {name:'容差匹配评价',role:'结果验证',action:'候选界面与真实界面在±1m内做一对一匹配，统计命中、误检、漏检与位置偏差。',effect:'使分层结果有可核对的评价依据。',trap:'总体逐点准确率不能代替界面匹配指标。'},
      {name:'参数对照与复核',role:'专业解释',action:'切换噪声、真实层数或β，比较GR剖面、分层表与F1曲线。',effect:'检查何种条件下薄层漏检或噪声误分更明显。',trap:'模拟中取得较高F1不代表在新井上已有相同表现。'}
    ]
  };
  /* ALGORITHM-DETAIL START */
  solution.algorithm = {"structure":"640点GR → 惩罚动态规划 → 最优分段","input":"单井自然伽马GR曲线、采样间距与分段惩罚","fit":"对单井640点、间距0.125m的合成GR，用前缀和计算段内SSE；动态规划在最小8点段长约束下最小化总误差加分段惩罚，没有网络训练。","predict":"回溯最优切点得到分层，再按±1m容差与已知合成层界做一对一匹配；惩罚控制增加层数需要付出的代价。","formula":"D(t)=min_s[D(s)+SSE(s,t)+β]，t−s≥8","symbols":"β为分段惩罚；SSE由GR前缀和计算；8点×0.125m=1m最小层厚。","check":"调节惩罚、噪声与合成层数，核对容差匹配F1、误检漏检和层内平稳性；单井合成验证不代表跨井泛化。","source":["segment"]};
  solution.mechanism = solution.algorithm.fit;
  solution.verify = solution.algorithm.check;
  /* ALGORITHM-DETAIL END */
  Cases.register({
    id: 'welllog-layer',
    sceneId: 'w1',
    title: '测井曲线智能分层',
    status: 'ready',
    version: '1.1.0',
    updated: '2026-10-30',

    tabs: {

      /* ---------- ① 专业背景 ---------- */
      background: {
        label: '专业背景',

        judge: [
          { label: '任务类型', value: '序列分割 / 变点检测', desc: '不是逐点分类，而是找"位置"', html: '<span style="color:var(--c-ts)">序列分割</span>' },
          { label: '演示数据', value: '640 点合成GR', desc: '0.125 m采样，真实界面用于评价' },
          { label: '核对方式', value: '界面容差匹配', desc: '查看当前F1、召回与位置偏差' },
          { label: '难度', value: '中', desc: '标签粒度不一致是主要障碍', html: K.dtag('中') }
        ],

        lede: '测井曲线是井筒内连续测量的岩石物理响应。分层（卡层）是把一条连续曲线切成地质单元的第一步 —— 后面的储层解释、射孔选段、压裂分段，全都以这套界面为底图。所以它错一点，下游全都要返工。',

        sections: [
          {
            no: 1, en: 'PROBLEM', title: '当前做法与问题',
            html: '<p>测井分层需要把连续曲线的变化定位成候选层界面。<b>噪声波动与真实薄层可能相似</b>：分得太细会引入假界面，分得太粗又会漏掉薄层，影响后续井段解释。</p>' +
              '<p>更麻烦的是「对错」本身就没有唯一答案：同一口井，两位解释员交上来的层数可能相差两层。这决定了后面所有的评测方式 —— <b>不能用"逐点准确率"，只能用"界面是否落在容差内"</b>。</p>' +
              K.figure(figManual(), 1, '同一段曲线的三种典型误差：界面系统性偏移（左上）、薄层漏卡（右下）、以及不同解释员之间不重合的判定区间。这些是"人工目视 + 经验"的固有代价，也是算法要替代的部分。')
          },
          {
            no: 2, en: 'INTERVENTION', title: '本例怎样自动寻找层界面',
            html: '<p>本例把分层写成<b>带惩罚的最优分段</b>。先计算段内平方误差，再用动态规划权衡拟合代价与界面数量，最小层厚限制为8点，即1m。该程序不训练1D分割网络。</p>' +
              '<p>调整惩罚系数β，观察算法怎样在噪声误检与薄层漏检之间取舍；再用合成井的真实界面评价，不把算法候选直接当成最终地质层位。</p>' +
              K.figure(figAI(), 2, '图示与浏览器程序一致：合成GR、段内代价、动态规划、最小层厚、容差评价。')
          },
          {
            no: 3, en: 'DATA', title: '你需要准备什么',
            html: '<p style="margin-bottom:14px">下列清单说明真实业务可能需要的资料，作为准备参考。本页实际只使用一口合成井的GR曲线，未取得这些区块资料。清单可点击。</p>' +
              K.checklist([
                ['常规测井曲线', 'GR / SP / RT / DEN，0.125 m 采样，单井 5000—20000 点', '30—50 口井的人工分层表'],
                ['邻井分层与岩性', '同区块 20 口以上', '作为一致性约束'],
                ['地质分层方案', '油田统一的分层标准', '定义层序与命名'],
                ['井位与构造图', '区块级', '判断层序是否可信'],
                ['历史解释成果', '已有解释报告', '用于交叉验证']
              ]) +
              '<p style="margin-top:18px"><span class="kicker plain" style="color:var(--ink-4)">可参考的公开数据集</span></p>' +
              K.refs(['FORCE 2020 岩性竞赛数据（井曲线 + 岩性标签）', 'Kansas Geological Survey 公开测井库'], null)
          },
          {
            no: 4, en: 'DIFFICULTY', title: '技术难度与参考方向',
            html: '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:2px">' +
              K.dtag('中') + '<span class="small muted">单井数据易得、任务定义清晰；难点在标签粒度不一致与薄层漏检。</span></div>' +
              K.meter('中') +
              '<p>难度按三档标注：<b>低</b> = 数据现成、任务边界清晰、错了代价小；<b>中</b> = 需要一个月量级的标注与清洗，效果依赖后处理规则；<b>高</b> = 标签稀缺或安全约束硬，通常要先做小范围可行性验证再立项。</p>' +
              '<p style="margin-top:18px"><span class="kicker plain" style="color:var(--ink-4)">可借鉴的通用技术</span></p>' +
              K.refs(['变点检测', '段内平方误差', '惩罚动态规划', '最小层厚约束'], '#/method/ts') +
              '<p style="margin-top:18px" class="small muted">交叉环节：<a href="#/stage/mudlog" style="color:var(--jade-d);font-weight:600">录井</a> · <a href="#/stage/geophys" style="color:var(--jade-d);font-weight:600">物探</a></p>'
          }
        ]
      },

      /* ---------- ② 案例流程 ---------- */
      workflow: {
        label: '案例流程',
        title: '合成GR曲线上的最优分段与容差评价',
        solution: solution,
        lead: [
          '要解决的问题是噪声误分与薄层漏检。程序使用640点合成GR曲线，执行带惩罚动态规划，输出候选界面和分层表。',
          '真实界面仅用于容差匹配与打分，惩罚参数的对照用于说明取舍，不构成真实区块效果验证。'
        ],
        stats: [
          ['数据来源', '单井合成'], ['采样点', '640'],
          ['采样间隔', '0.125 m'], ['最小层厚', '1 m'],
          ['评价容差', '±1 m'], ['算法', '惩罚动态规划']
        ],
        steps: solution.steps.map(function (s) { return {name:s.name,role:s.role,do:s.action,effect:s.effect,trap:s.trap}; }),
        metrics: {
          title: '怎么算"分对了"',
          html: '<p>分层不是逐点分类，而是<b>界面匹配</b>问题：一个界面只要落在真实界面 ±1 m 容差内就算命中。这决定了指标的计算方式，也解释了为什么"准确率 99%"在这里毫无意义 —— 界面点只占全井段的千分之一，全判成"不是界面"也有 99.9%。</p>' +
            K.figure(figTolerance(), 3, '按容差匹配后统计 TP / FP / FN，再算精确率与召回率。**漏检（FN）比误检（FP）代价更高**：漏掉一个界面意味着人工要重新扫一遍整段曲线，而多一个候选界面只需点一下删除。') +
            K.dtable(['指标', '定义', '如何查看'], [
              ['精确率 P', 'TP / (TP + FP)，候选中命中的比例', '演示区当前计算'],
              ['召回率 R', 'TP / (TP + FN)，真实界面找回的比例', '演示区当前计算'],
              ['F1', '2PR / (P + R)', '演示区当前计算'],
              ['平均偏差', '命中界面的绝对深度误差均值（m）', '演示区当前计算']
            ])
        },
        fails: [
          { name: '薄层漏检', why: '厚度小于最小层厚（本例 1 m）的层在惩罚项下会被合并。解决方向是分层建模：先粗分大层，再在小层内单独检测薄层。' },
          { name: '渐变过渡带', why: '岩性渐变时曲线没有突变点，算法倾向把过渡带整体归入一侧。可用斜率特征或软分割概率代替硬界面。' },
          { name: '曲线缺失段', why: '某条曲线在井段内缺失时，多通道模型会被"补零"误导。应先做缺失标记，让模型显式知道哪一通道不可用。' },
          { name: '层序冲突', why: '算法可能给出与区域地层方案矛盾的层序（如标志层倒置）。必须加层序约束或人工审核规则。' }
        ]
      },

      /* ---------- ③ 可运行示范 ---------- */
      demo: {
        label: '可运行示范',
        mount: function (root, ctx) {
          if (typeof window.WelllogLayerDemo !== 'function') {
            root.innerHTML = '<div class="callout warn"><span class="ci">缺失</span>' +
              '<span>示范脚本未加载：请确认 index.html 中 <b>assets/cases/welllog-layer.demo.js</b> 在 shell.js 之前引入。</span></div>';
            return;
          }
          window.WelllogLayerDemo(root, ctx);
        },
        unmount: function () {
          if (window.WelllogLayerDemoCleanup) window.WelllogLayerDemoCleanup();
        }
      }
    }
  });

})();
