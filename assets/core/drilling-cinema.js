/* 本地 Three.js 钻井展厅。所有尺寸、流动与运镜均为教学概念示意，不代表实井测量。 */
(function (global) {
  'use strict';
  var script = document.currentScript;
  var threeURL = new URL('../vendor/three/three.module.js', script ? script.src : new URL('assets/core/drilling-cinema.js', document.baseURI).href).href;
  var threePromise;
  var scenes = {
    drilling: ['深入钻井现场', '从地表井架，到钻头前沿', 'overview'],
    d1: ['钻速与参数协同', '转速、排量与破岩过程', 'overview'],
    d2: ['井下风险观察', '沿井筒追踪循环与风险信号', 'downhole'],
    d3: ['井眼轨迹控制', '从二维计算轨迹，观察空间剖面', 'downhole'],
    d4: ['钻柱疲劳监测', '旋转、载荷与工具状态', 'downhole'],
    d5: ['钻井液调控', '观察井筒内的循环与携岩', 'downhole'],
    d6: ['井壁稳定观察', '地层、井壁与风险区域', 'downhole'],
    d7: ['井眼清洁观察', '流体循环与岩屑返排', 'downhole'],
    d8: ['钻头磨损观察', 'PDC 切削齿与破岩接触', 'bit'],
    d9: ['压力窗口观察', '压力变化与循环状态', 'downhole'],
    d10: ['地质导向观察', '井轨迹与目标储层', 'downhole'],
    d11: ['起下钻观察', '钻具沿井眼的往复运动', 'overview'],
    d12: ['钻井能耗观察', '地面动力与井下旋转', 'overview']
  };
  function hasScene(id) { return Object.prototype.hasOwnProperty.call(scenes, id); }
  function sceneKey(id) { return hasScene(id) ? id : 'drilling'; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function poster() {
    return '<svg class="dc-poster" viewBox="0 0 1000 580" role="img" aria-label="钻井地层与井轨迹的静态概念剖面" xmlns="http://www.w3.org/2000/svg">' +
      '<g stroke="#86715a" stroke-width="1"><path d="M155 277L484 169 843 278 513 410Z" fill="#ad9b7c"/>' +
      '<path d="M155 277L513 410 843 278V307L513 439 155 307Z" fill="#8b7861"/>' +
      '<path d="M155 307L513 439 843 307V337L513 469 155 337Z" fill="#b3a079"/>' +
      '<path d="M155 337L513 469 843 337V367L513 499 155 367Z" fill="#76736a"/>' +
      '<path d="M155 367L513 499 843 367V398L513 530 155 398Z" fill="#a48b65"/></g>' +
      '<g fill="none" stroke="#65757b" stroke-linejoin="round"><path d="M397 278L434 77H456L496 278" stroke-width="5"/>' +
      '<path d="M405 240H488L414 192H478L422 147H469L430 106H461M414 192L488 240M422 147L478 192M430 106L469 147M445 78V278" stroke-width="2"/></g>' +
      '<path d="M391 277L445 256 502 278 447 300Z" fill="#505d62" stroke="#b6bdbb"/>' +
      '<path d="M320 274V249L353 236 379 247V272L346 285Z" fill="#c6a158" stroke="#80622f"/>' +
      '<path d="M554 277V254L591 240 617 252V274L580 289Z" fill="#a3634e" stroke="#71473d"/>' +
      '<path d="M447 279V403Q447 455 503 438L713 357" fill="none" stroke="#263136" stroke-width="13"/>' +
      '<path d="M447 279V403Q447 455 503 438L713 357" fill="none" stroke="#b7c1c3" stroke-width="7"/>' +
      '<path d="M447 279V403Q447 455 503 438L713 357" fill="none" stroke="#f3d8a0" stroke-width="2" stroke-dasharray="9 20"/>' +
      '<g transform="translate(717 356) rotate(69)"><path d="M-10-19H10L17 6 8 19H-8L-17 6Z" fill="#657276" stroke="#c4ad75" stroke-width="3"/><path d="M-8-8V12M0-8V17M8-8V12" stroke="#d4b875" stroke-width="3"/></g>' +
      '<g fill="none" stroke="currentColor" opacity=".45"><path d="M460 103H650L675 83H810"/><path d="M718 357H827L853 336H902"/></g>' +
      '<g fill="currentColor" font-family="sans-serif" font-size="12" letter-spacing="2"><text x="680" y="73">钢灰井架 / SURFACE</text><text x="766" y="327">PDC / 钻头前沿</text><text x="160" y="475">自然岩层 · 井轨迹剖面</text></g></svg>';
  }
  function html(id, compact) {
    id = sceneKey(id); var info = scenes[id];
    return '<section class="drilling-cinema' + (compact ? ' dc-compact' : '') + '" data-drilling-cinema="' + id + '" data-state="loading" aria-label="交互式钻井三维展厅">' +
      '<header class="dc-heading"><div><span class="dc-eyebrow">DRILLING / FIELD NOTES</span><h3>' + info[0] + '</h3><p>' + info[1] + '</p></div><span class="dc-source">概念示意 · 非实井数据</span></header>' +
      '<div class="dc-viewport" tabindex="0" aria-label="三维视图：左右拖动或方向键旋转，使用下方按钮切换镜头">' + poster() +
      '<div class="dc-vignette" aria-hidden="true"></div><div class="dc-shot"><span class="dc-shot-number">01 / 03</span><b class="dc-shot-name">地表全景</b><span class="dc-shot-note">钢灰井架 / 自然地层</span></div>' +
      '<div class="dc-hud"><span><i>ROTATION</i><b data-dc-value="rpm">120<small> rpm</small><em class="dc-demo-tag">示意参数</em></b></span><span><i>CIRCULATION</i><b data-dc-value="flow">28<small> L/s</small><em class="dc-demo-tag">示意参数</em></b></span><span><i>TOOL STATE</i><b data-dc-value="risk">风险示意</b></span></div>' +
      '<div class="dc-status" role="status" aria-live="polite">正在准备本地 3D 场景…</div></div>' +
      '<div class="dc-toolbar"><div class="dc-cameras" role="group" aria-label="选择镜头"><button type="button" data-dc-camera="overview" aria-pressed="true" disabled>01 全景</button><button type="button" data-dc-camera="downhole" aria-pressed="false" disabled>02 井下</button><button type="button" data-dc-camera="bit" aria-pressed="false" disabled>03 钻头</button></div>' +
      '<div class="dc-playback"><button type="button" data-dc-action="cruise" aria-pressed="false" disabled>自动巡航</button><button type="button" data-dc-action="pause" aria-pressed="false" disabled>暂停</button></div></div>' +
      '<div class="dc-timeline"><label>钻进进度 <input type="range" min="10" max="100" value="72" data-dc-progress aria-label="钻进进度" disabled><output>72%</output></label><span>拖动旋转 · 方向键微调 · 三维教学示意</span></div></section>';
  }

  function build(T, canvas, id) {
    var owned = new Set(), renderer, disposed = false;
    function own(resource) { owned.add(resource); return resource; }
    function geometry(Ctor, args) { return own(Reflect.construct(Ctor, args)); }
    function material(color, metal, rough) { return own(new T.MeshStandardMaterial({ color: color, metalness: metal || 0, roughness: rough == null ? .75 : rough })); }
    var scene = new T.Scene(), camera = new T.PerspectiveCamera(43, 1.7, .035, 120);
    var world = new T.Group(); world.name = 'drilling-cutaway'; scene.add(world);
    function mesh(g, m, p, parent) { var object = new T.Mesh(g, m); object.position.set.apply(object.position, p || [0, 0, 0]); object.castShadow = true; object.receiveShadow = true; (parent || world).add(object); return object; }
    function box(w, h, d, mat, p, parent) { return mesh(geometry(T.BoxGeometry, [w, h, d]), mat, p, parent); }
    function release() {
      if (disposed) return; disposed = true;
      owned.forEach(function (r) { r.dispose(); }); owned.clear();
      scene.traverse(function (o) { if (o.shadow) o.shadow.dispose(); }); scene.clear();
      if (renderer) { renderer.renderLists.dispose(); renderer.dispose(); renderer.forceContextLoss(); }
    }
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
      renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
      var steel = material(0x8d999e, .72, .3), darkSteel = material(0x48555b, .65, .43), gold = material(0xb79550, .55, .42);
      var yellow = material(0xb98d3e, .28, .64), red = material(0x965947, .18, .72), concrete = material(0xa2a29a, .08, .88);
      var beamGeometry = geometry(T.CylinderGeometry, [1, 1, 1, 8]);
      var up = new T.Vector3(0, 1, 0);
      function beam(a, b, radius, mat, parent) {
        var start = new T.Vector3().fromArray(a), end = new T.Vector3().fromArray(b), delta = end.clone().sub(start);
        var o = mesh(beamGeometry, mat, [0, 0, 0], parent); o.position.copy(start.add(end).multiplyScalar(.5));
        o.scale.set(radius, delta.length(), radius); o.quaternion.setFromUnitVectors(up, delta.normalize()); return o;
      }
      // 真实材质色的半剖岩层，前侧留出井眼观察面。
      var grain = new Uint8Array(64 * 64 * 4), seed = 41;
      for (var i = 0; i < grain.length; i += 4) { seed = (seed * 1664525 + 1013904223) >>> 0; var n = 178 + (seed % 78); grain[i] = grain[i + 1] = grain[i + 2] = n; grain[i + 3] = 255; }
      var rockTexture = own(new T.DataTexture(grain, 64, 64)); rockTexture.wrapS = rockTexture.wrapT = T.RepeatWrapping; rockTexture.repeat.set(3, 2); rockTexture.needsUpdate = true;
      var rocks = [0x8d7b62, 0xb29a71, 0x706d65, 0xb49f78, 0x716253, 0x555851, 0x927963];
      function boundary(x, layer) { return 2.05 - layer * 1.12 + (layer ? .13 * Math.sin(x * .55 + layer * .6) : 0); }
      var rockGroup = new T.Group(); rockGroup.name = 'natural-rock-strata'; world.add(rockGroup);
      for (var r = 0; r < rocks.length; r++) {
        var shape = new T.Shape(); shape.moveTo(-7, boundary(-7, r));
        for (var x = -6.5; x <= 7; x += .5) shape.lineTo(x, boundary(x, r));
        for (var bx = 7; bx >= -7; bx -= .5) shape.lineTo(bx, boundary(bx, r + 1)); shape.closePath();
        var rockMat = material(rocks[r], .02, .94); rockMat.map = rockTexture;
        mesh(geometry(T.ExtrudeGeometry, [shape, { depth: 5.6, steps: 1, bevelEnabled: false }]), rockMat, [0, 0, -5.35], rockGroup);
      }
      var groundMat = material(0xd4dde1, .08, .92), ground = mesh(geometry(T.PlaneGeometry, [150, 150]), groundMat, [0, -5.98, 0]); ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
      box(5, .22, 3.2, concrete, [-3, 2.19, .47]);
      // 桁架、顶驱、钢丝绳与平台栏杆均由可释放的原生几何体组成。
      var rig = new T.Group(); rig.name = 'steel-derrick'; rig.position.z = 1.27; world.add(rig);
      var corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      function legPoint(c, t) { return [-3 + c[0] * (1.2 - .87 * t), 2.35 + t * 7.2, -.65 + c[1] * (.92 - .66 * t)]; }
      corners.forEach(function (c, index) {
        beam(legPoint(c, 0), legPoint(c, 1), .065, steel, rig);
        for (var k = 0; k < 6; k++) {
          var next = corners[(index + 1) % 4]; beam(legPoint(c, k / 5), legPoint(next, k / 5), .035, steel, rig);
          if (k < 5) beam(legPoint(c, k / 5), legPoint(next, (k + 1) / 5), .025, steel, rig);
        }
      });
      box(1, .2, .8, darkSteel, [-3, 9.66, -.65], rig);
      var topDrive = box(.4, .85, .37, yellow, [-3, 5.8, -.65], rig);
      beam([-3, 9.7, -.65], [-3, 2.34, -.65], .023, darkSteel, rig);
      for (var rail = 0; rail < 4; rail++) beam([-5 + rail * 1.33, 2.3, .75], [-5 + rail * 1.33, 3.02, .75], .025, gold, rig);
      beam([-5, 3.02, .75], [-1, 3.02, .75], .025, gold, rig);
      // 地面动力与泥浆设备。
      var equipment = new T.Group(); equipment.name = 'surface-equipment'; world.add(equipment);
      box(2.25, 1.15, 1.35, yellow, [-5.3, 2.68, -3.4], equipment);
      box(2.6, .95, 1.4, red, [1.6, 2.57, -3.4], equipment);
      for (var rib = 0; rib < 10; rib++) box(.04, 1, 1.38, darkSteel, [-6.3 + rib * .22, 2.67, -3.4], equipment);
      var pump = mesh(geometry(T.CylinderGeometry, [.4, .4, 1.2, 20]), yellow, [2.4, 2.55, -.9], equipment); pump.rotation.z = Math.PI / 2;
      var flywheel = mesh(geometry(T.TorusGeometry, [.37, .07, 8, 24]), darkSteel, [3.04, 2.55, -.9], equipment); flywheel.rotation.y = Math.PI / 2;
      beam([2.1, 2.26, -.8], [-2.65, 2.26, -.8], .065, red, equipment);
      // 井轨迹与流体。数据投影只替换这条曲线，不重新创建整场景。
      var curve, curveSignature = '', trajectoryScale = .0025;
      var tripOffset = 0, tripStart = 0, tripTravel = 0, tripVelocity, tripProgress;
      var boreMat = own(new T.MeshStandardMaterial({ color: 0x4f473a, roughness: .94, transparent: true, opacity: .22, depthWrite: false, side: T.DoubleSide }));
      var pipe = mesh(geometry(T.BufferGeometry, []), steel), bore = mesh(geometry(T.BufferGeometry, []), boreMat), casing = mesh(geometry(T.BufferGeometry, []), darkSteel);
      pipe.name = 'drill-string'; bore.name = 'bore-annulus'; casing.name = 'surface-casing';
      function replaceTube(object, radius, segments) { var old = object.geometry; object.geometry = geometry(T.TubeGeometry, [curve, segments, radius, 12, false]); owned.delete(old); old.dispose(); }
      function rebuild(points) {
        curve = new T.CatmullRomCurve3(points, false, 'centripetal');
        replaceTube(pipe, .085, 160); replaceTube(bore, .245, 160); replaceTube(casing, .15, 160);
        casing.geometry.setDrawRange(0, Math.floor(160 * .28) * 12 * 6);
      }
      rebuild([[-3, 2.4, .62], [-3, -.4, .62], [-2.85, -2.7, .62], [-1.5, -4.05, .62], [1.5, -4.25, .62], [5.1, -4.12, .62]].map(function (v) { return new T.Vector3().fromArray(v); }));
      // PDC 钻头：钢体、六刀翼、硬质合金基底、深色金刚石切削面与喷嘴。
      var bitAnchor = new T.Group(), bit = new T.Group(); bitAnchor.name = 'pdc-drill-bit'; bitAnchor.add(bit); world.add(bitAnchor);
      var cutterGold = material(0xb1955c, .66, .32), diamond = material(0x303b40, .48, .2);
      var profile = [[.09, .55], [.13, .43], [.14, .22], [.25, .08], [.28, -.13], [.21, -.32], [.06, -.42], [0, -.43]].map(function (p) { return new T.Vector2(p[0], p[1]); });
      mesh(geometry(T.LatheGeometry, [profile, 40]), darkSteel, [0, 0, 0], bit);
      var bladeShape = new T.Shape(); bladeShape.moveTo(.12, .25); bladeShape.quadraticCurveTo(.34, .16, .34, -.16); bladeShape.lineTo(.21, -.39); bladeShape.lineTo(.06, -.42); bladeShape.lineTo(.17, -.1); bladeShape.closePath();
      var bladeGeo = geometry(T.ExtrudeGeometry, [bladeShape, { depth: .055, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 1, steps: 1 }]);
      var cutterGeo = geometry(T.CylinderGeometry, [.044, .044, .04, 16]), faceGeo = geometry(T.CylinderGeometry, [.036, .036, .008, 16]);
      for (var blade = 0; blade < 6; blade++) {
        var wing = new T.Group(); wing.rotation.y = blade * Math.PI / 3; bit.add(wing); mesh(bladeGeo, steel, [0, 0, -.027], wing);
        for (var tooth = 0; tooth < 5; tooth++) {
          var ty = .12 - tooth * .105, tx = tooth < 3 ? .315 : .3 - (tooth - 2) * .065;
          var holder = mesh(cutterGeo, cutterGold, [tx, ty, .01], wing); holder.rotation.z = -Math.PI / 2;
          var face = mesh(faceGeo, diamond, [tx + .024, ty, .01], wing); face.rotation.z = -Math.PI / 2;
        }
      }
      var nozzleGeo = geometry(T.CylinderGeometry, [.026, .031, .045, 12]);
      for (var jet = 0; jet < 3; jet++) mesh(nozzleGeo, diamond, [.105 * Math.cos(jet * Math.PI * 2 / 3), -.355, .105 * Math.sin(jet * Math.PI * 2 / 3)], bit);
      var riskMat = own(new T.MeshStandardMaterial({ color: 0xb59861, emissive: 0x8f5828, emissiveIntensity: .12, metalness: .2, roughness: .65 }));
      var riskRing = mesh(geometry(T.TorusGeometry, [.39, .018, 6, 40]), riskMat); riskRing.name = 'risk-observation-ring';
      var targetMarker = mesh(geometry(T.TorusGeometry, [.32, .018, 6, 36]), gold, [4.7, -4.1, .67]); targetMarker.visible = id === 'd3' || id === 'd10'; targetMarker.name = 'target-window';
      var fluidCount = 180, fluidArray = new Float32Array(fluidCount * 3), chipCount = 80, chipArray = new Float32Array(chipCount * 3);
      function particles(array, size, color, name) {
        var geo = geometry(T.BufferGeometry, []); geo.setAttribute('position', new T.BufferAttribute(array, 3).setUsage(T.DynamicDrawUsage));
        var mat = own(new T.PointsMaterial({ color: color, size: size, sizeAttenuation: true, transparent: true, opacity: .8, depthWrite: false }));
        var p = new T.Points(geo, mat); p.name = name; p.frustumCulled = false; world.add(p); return p;
      }
      var fluid = particles(fluidArray, .045, 0x85adb7, 'circulating-fluid'), chips = particles(chipArray, .052, 0xc4a679, 'rock-cuttings');
      var hemisphere = new T.HemisphereLight(0xe7f2ff, 0x8e7657, 2.5); scene.add(hemisphere);
      var key = new T.DirectionalLight(0xffe3b6, 3.3); key.position.set(-7, 16, 10); key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = key.shadow.camera.bottom = -15; key.shadow.camera.right = key.shadow.camera.top = 15; key.shadow.camera.far = 60; key.shadow.bias = -.0008; key.shadow.normalBias = .05; scene.add(key);
      var rim = new T.DirectionalLight(0xc5d9ef, 2.4); rim.position.set(9, 7, -8); scene.add(rim);
      var fill = new T.DirectionalLight(0xd6e7f0, 1.6); fill.position.set(2, 1, 10); scene.add(fill);
      var currentTarget = new T.Vector3(-.2, 1.6, -.7), temp = new T.Vector3(), direction = new T.Vector3(), currentShot = 'overview';
      var shot = { overview: { target: new T.Vector3(-.2, 1.6, -.7), radius: 27, theta: .55, phi: 1.16 }, downhole: { target: new T.Vector3(-.3, -2.4, .5), radius: 11.5, theta: .3, phi: 1.36 }, bit: { radius: 2.25, theta: .65, phi: 1.16 } };
      camera.position.set(14, 12, 22); camera.lookAt(currentTarget);
      function theme(dark) {
        var bg = dark ? 0x081622 : 0xe9eef1; scene.background = new T.Color(bg); scene.fog = new T.Fog(bg, 34, 85);
        groundMat.color.setHex(dark ? 0x10232c : 0xd4dde1); hemisphere.intensity = dark ? 1.6 : 2.5;
        key.intensity = dark ? 3.5 : 3.1; rim.intensity = dark ? 3 : 2.1; renderer.toneMappingExposure = dark ? 1.1 : 1.03;
      }
      function resize(w, h) { renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, w < 640 ? 1.35 : 1.75)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
      function telemetry(values) {
        if (id === 'd11' && (tripVelocity !== values.tripVelocity || tripProgress !== values.progress)) {
          if (tripProgress !== values.progress) tripOffset = 0;
          tripStart = tripOffset; tripTravel = 0; tripVelocity = values.tripVelocity; tripProgress = values.progress;
        }
        if (values.trajectory && values.trajectory.length > 1) {
          var signature = JSON.stringify(values.trajectory);
          if (signature !== curveSignature) {
            curveSignature = signature; var z0 = values.trajectory[0].z;
            var depth = Math.max.apply(null, values.trajectory.map(function (p) { return Math.abs(p.z - z0); })); trajectoryScale = 7.45 / Math.max(1, depth);
            rebuild(values.trajectory.map(function (p) { return new T.Vector3(clamp(-3 + p.x * trajectoryScale, -6.6, 6.6), 2.4 - Math.abs(p.z - z0) * trajectoryScale, .62); }));
          }
        }
        if (values.target != null) { targetMarker.visible = true; targetMarker.position.set(clamp(-3 + values.target * trajectoryScale, -6.6, 6.6), curve.getPoint(1).y, .67); }
      }
      function update(time, dt, values, view, snap) {
        currentShot = view.shot;
        var baseProgress = .28 + values.progress * .72;
        if (id === 'd11') { tripTravel = clamp(tripTravel + dt * values.tripVelocity * .018, -.085, .085); tripOffset = clamp(tripStart + tripTravel, .12 - baseProgress, 1 - baseProgress); }
        var progress = clamp(baseProgress + tripOffset, .12, 1);
        var point = curve.getPointAt(progress); direction.copy(curve.getTangentAt(progress)).normalize(); bitAnchor.position.copy(point);
        bitAnchor.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), direction);
        bit.rotation.y += dt * values.rpm * Math.PI / 30; topDrive.position.y = 5.8 - tripOffset * 8;
        flywheel.rotation.z += dt * values.rpm * .04;
        var count = Math.floor(160 * progress) * 12 * 6; pipe.geometry.setDrawRange(0, count); bore.geometry.setDrawRange(0, count);
        var alarm = values.risk > .65; riskRing.position.copy(point); riskRing.position.z += .03; riskRing.scale.setScalar(1 + values.risk * .45); riskRing.visible = alarm || id === 'd6' || id === 'd9';
        riskMat.color.setHex(alarm ? 0xb76843 : 0xb59861); riskMat.emissiveIntensity = alarm ? .2 + Math.sin(time * 2) * .08 : .08;
        cutterGold.color.setHex(values.wear > .65 ? 0x736e61 : 0xb1955c); diamond.roughness = .2 + values.wear * .65;
        var flowSpeed = values.flow / 28 * .075, pressureSpeed = clamp(values.pressure / 25, .35, 2);
        for (var f = 0; f < fluidCount; f++) {
          var down = f % 2 === 0, phase = (f / fluidCount + time * flowSpeed * (down ? 1 : -1) + 1000) % 1;
          temp.copy(curve.getPointAt(phase * progress)); var angle = f * 2.399 + time * .2;
          fluidArray[f * 3] = temp.x + Math.cos(angle) * (down ? .045 : .185); fluidArray[f * 3 + 1] = temp.y; fluidArray[f * 3 + 2] = temp.z + Math.sin(angle) * (down ? .045 : .185);
        }
        fluid.geometry.attributes.position.needsUpdate = true; fluid.visible = values.flow > 0; fluid.material.color.setHex(id === 'd9' && alarm ? 0xc48663 : 0x85adb7);
        for (var c = 0; c < chipCount; c++) {
          var age = (c / chipCount + time * .22 * pressureSpeed + 100) % 1, a = c * 2.399;
          chipArray[c * 3] = point.x + Math.cos(a) * (.15 + age * .6) - direction.x * age * .8;
          chipArray[c * 3 + 1] = point.y + Math.sin(a) * .2 - age * age * .7 - direction.y * age * .5;
          chipArray[c * 3 + 2] = point.z + .1 + Math.sin(a * 1.7) * age * .45;
        }
        chips.geometry.attributes.position.needsUpdate = true; chips.visible = id !== 'd11' && values.rpm > 0;
        var preset = shot[currentShot], target = preset.target || point;
        var radius = preset.radius * Math.max(1, (currentShot === 'bit' ? .8 : .9) / camera.aspect), theta = preset.theta + view.yaw + (view.motion ? Math.sin(time * .085) * .045 : 0), phi = clamp(preset.phi + view.pitch, .65, 1.65);
        temp.set(target.x + radius * Math.sin(phi) * Math.sin(theta), target.y + radius * Math.cos(phi), target.z + radius * Math.sin(phi) * Math.cos(theta));
        var lerp = snap ? 1 : 1 - Math.exp(-dt * 4); camera.position.lerp(temp, lerp); currentTarget.lerp(target, lerp); camera.lookAt(currentTarget);
        renderer.render(scene, camera);
      }
      return { scene: scene, renderer: renderer, resize: resize, theme: theme, telemetry: telemetry, update: update, dispose: release };
    } catch (error) { release(); throw error; }
  }

  function mount(element, options) {
    options = options || {}; var id = sceneKey(options.sceneId || element.getAttribute('data-drilling-cinema'));
    var viewport = element.querySelector('.dc-viewport'), status = element.querySelector('.dc-status'), source = element.querySelector('.dc-source');
    var pauseButton = element.querySelector('[data-dc-action="pause"]'), cruiseButton = element.querySelector('[data-dc-action="cruise"]'), slider = element.querySelector('[data-dc-progress]');
    var media = global.matchMedia('(prefers-reduced-motion: reduce)'), disposed = false, engine = null, raf = 0, last = 0, time = 0, paused = false, visible = true, cruise = false, tourTime = 0;
    var view = { shot: scenes[id][2], yaw: 0, pitch: 0, motion: true }, cleanups = [], pointer = null;
    var values = { rpm: 120, flow: 28, pressure: 25, risk: .18, wear: .15, progress: .72, tripVelocity: 0 }, reported = {}, hasTelemetry = false;
    if (id === 'd11') { values.rpm = 0; values.flow = 0; values.progress = .65; }
    var canvas = document.createElement('canvas'); canvas.className = 'dc-canvas'; canvas.setAttribute('aria-hidden', 'true');
    function listen(target, type, fn, opts) { target.addEventListener(type, fn, opts); cleanups.push(function () { target.removeEventListener(type, fn, opts); }); }
    function running() { return !!engine && !disposed && !paused && !media.matches && !document.hidden && visible; }
    function paint(snap) { if (engine && !document.hidden && visible) engine.update(time, 0, values, view, snap !== false); }
    function schedule() { if (running() && !raf) raf = global.requestAnimationFrame(frame); }
    function frame(now) {
      raf = 0; if (!running()) return;
      if (last && now - last < 1000 / 30) { schedule(); return; }
      var dt = last ? Math.min((now - last) / 1000, .067) : 0; last = now; time += dt; tourTime += dt;
      if (cruise && tourTime >= 15) { var shots = ['overview', 'downhole', 'bit']; setShot(shots[(shots.indexOf(view.shot) + 1) % 3], false); tourTime = 0; }
      engine.update(time, dt, values, view, false); schedule();
    }
    function sync() {
      view.motion = !paused && !media.matches;
      pauseButton.textContent = media.matches ? '静态视角' : paused ? '播放' : '暂停'; pauseButton.setAttribute('aria-pressed', String(paused || media.matches));
      pauseButton.disabled = !engine || media.matches; cruiseButton.disabled = !engine || media.matches; slider.disabled = !engine;
      element.querySelectorAll('[data-dc-camera]').forEach(function (b) { b.disabled = !engine; });
      cruiseButton.setAttribute('aria-pressed', String(cruise)); element.classList.toggle('dc-paused', !running());
      if (!running() && raf) { global.cancelAnimationFrame(raf); raf = 0; } last = 0;
      paint(false); schedule();
    }
    function setShot(name, manual) {
      view.shot = name; view.yaw = view.pitch = 0;
      if (manual) { cruise = false; tourTime = 0; cruiseButton.setAttribute('aria-pressed', 'false'); }
      var info = name === 'bit' ? ['03 / 03', '钻头前沿', 'PDC 切削齿 / 旋转破岩'] : name === 'downhole' ? ['02 / 03', '井下剖面', '弯曲井筒 / 循环与携岩'] : ['01 / 03', '地表全景', '钢灰井架 / 自然地层'];
      element.querySelector('.dc-shot-number').textContent = info[0]; element.querySelector('.dc-shot-name').textContent = info[1]; element.querySelector('.dc-shot-note').textContent = info[2];
      element.querySelectorAll('[data-dc-camera]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-dc-camera') === name)); });
      updateHUD();
      if (!running()) paint();
    }
    function resize() { if (!engine || disposed) return; var rect = viewport.getBoundingClientRect(); engine.resize(Math.max(280, rect.width), Math.max(300, rect.height)); paint(); }
    function theme() { if (engine) { engine.theme(document.documentElement.dataset.theme === 'dark'); paint(); } }
    function fallback(message) {
      if (disposed) return;
      if (raf) global.cancelAnimationFrame(raf); raf = 0;
      var old = engine; engine = null; if (old) old.dispose(); canvas.remove();
      element.setAttribute('data-state', 'fallback'); status.textContent = message; sync();
    }
    function updateHUD() {
      element.querySelector('[data-dc-value="rpm"]').innerHTML = Math.round(values.rpm) + '<small> rpm</small>' + (reported.rpm ? '' : '<em class="dc-demo-tag">示意参数</em>');
      element.querySelector('[data-dc-value="flow"]').innerHTML = values.flow.toFixed(1) + '<small> L/s</small>' + (reported.flow ? '' : '<em class="dc-demo-tag">示意参数</em>');
      element.querySelector('[data-dc-value="risk"]').textContent = reported.risk ? (values.risk > .65 ? '风险升高' : '风险参数已联动') : '风险示意';
      element.classList.toggle('dc-alert', values.risk > .65); slider.value = Math.round(values.progress * 100); element.querySelector('.dc-timeline output').textContent = Math.round(values.progress * 100) + '%';
      source.textContent = values.trajectory ? '二维轨迹投影 · 非三维求解' : hasTelemetry ? '案例参数联动 · 非实井数据' : '概念示意 · 非实井数据';
      if (id === 'd11') element.querySelector('.dc-shot-note').textContent = (values.tripVelocity > 0 ? '下放' : values.tripVelocity < 0 ? '上提' : '静止') + ' · ' + Math.abs(values.tripVelocity).toFixed(2) + ' m/s' + (reported.tripVelocity ? ' · 有限行程示意' : ' · 示意参数');
    }
    function setTelemetry(input) {
      if (disposed || !input || input.sceneId && input.sceneId !== id) return;
      var incoming = input.values || input, keys = { rpm: [0, 400], flow: [0, 100], pressure: [0, 100], risk: [0, 1], wear: [0, 1], tripVelocity: [-1.2, 1.2] };
      Object.keys(keys).forEach(function (key) { if (incoming[key] != null && Number.isFinite(Number(incoming[key]))) { values[key] = clamp(Number(incoming[key]), keys[key][0], keys[key][1]); reported[key] = true; } });
      if (incoming.progress != null && Number.isFinite(Number(incoming.progress))) { var p = Number(incoming.progress); values.progress = clamp(p > 1 ? p / 100 : p, .1, 1); reported.progress = true; }
      if (incoming.target != null && Number.isFinite(Number(incoming.target))) { values.target = Number(incoming.target); reported.target = true; }
      if (Array.isArray(incoming.trajectory)) {
        var inputPath = incoming.trajectory, sampled = inputPath;
        if (inputPath.length > 160) sampled = Array.from({ length: 160 }, function (_, i) { return inputPath[Math.round(i * (inputPath.length - 1) / 159)]; });
        var path = sampled.filter(function (p) { return p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.z)); }).map(function (p) { return { x: Number(p.x), z: Number(p.z) }; }).filter(function (p, i, all) { return !i || p.x !== all[i - 1].x || p.z !== all[i - 1].z; });
        if (path.length > 1) { values.trajectory = path; reported.trajectory = true; }
      }
      hasTelemetry = Object.keys(reported).length > 0; if (engine) engine.telemetry(values); updateHUD(); paint();
    }
    listen(element, 'click', function (event) {
      var button = event.target.closest('button'); if (!button || button.disabled || !element.contains(button)) return;
      var shotName = button.getAttribute('data-dc-camera'), action = button.getAttribute('data-dc-action');
      if (shotName) setShot(shotName, true);
      if (action === 'pause') { paused = !paused; sync(); }
      if (action === 'cruise') { cruise = !cruise; paused = false; tourTime = 0; sync(); }
    });
    listen(slider, 'input', function () { values.progress = Number(slider.value) / 100; if (engine) engine.telemetry(values); updateHUD(); paint(); });
    listen(viewport, 'pointerdown', function (event) { if (!engine || event.button !== 0) return; pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; viewport.setPointerCapture(event.pointerId); cruise = false; cruiseButton.setAttribute('aria-pressed', 'false'); });
    listen(viewport, 'pointermove', function (event) {
      if (!pointer || pointer.id !== event.pointerId) return;
      view.yaw = clamp(view.yaw + (event.clientX - pointer.x) * .006, -.8, .8); view.pitch = clamp(view.pitch + (event.clientY - pointer.y) * .004, -.28, .28);
      pointer.x = event.clientX; pointer.y = event.clientY; paint();
    });
    function endPointer(event) { if (pointer && pointer.id === event.pointerId) { if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId); pointer = null; } }
    listen(viewport, 'pointerup', endPointer); listen(viewport, 'pointercancel', endPointer); listen(viewport, 'lostpointercapture', function () { pointer = null; });
    listen(viewport, 'keydown', function (event) {
      if (!engine || ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].indexOf(event.key) < 0) return;
      event.preventDefault(); cruise = false; cruiseButton.setAttribute('aria-pressed', 'false');
      if (event.key === 'Home') view.yaw = view.pitch = 0;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') view.yaw = clamp(view.yaw + (event.key === 'ArrowLeft' ? -.06 : .06), -.8, .8);
      else view.pitch = clamp(view.pitch + (event.key === 'ArrowUp' ? -.04 : .04), -.28, .28); paint();
    });
    listen(global, 'tiangong-drilling-telemetry', function (event) { if (event.detail && event.detail.sceneId === id) setTelemetry(event.detail); });
    listen(global, 'tiangong-theme-change', theme); listen(document, 'visibilitychange', sync); listen(media, 'change', sync);
    listen(canvas, 'webglcontextlost', function (event) { event.preventDefault(); if (engine) fallback('3D 图形上下文已中断 · 当前显示静态剖面'); });
    if (global.ResizeObserver) { var ro = new global.ResizeObserver(resize); ro.observe(viewport); cleanups.push(function () { ro.disconnect(); }); } else listen(global, 'resize', resize);
    if (global.IntersectionObserver) { var io = new global.IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; sync(); }, { threshold: 0 }); io.observe(element); cleanups.push(function () { io.disconnect(); }); }
    setShot(view.shot, false); updateHUD();
    if (!threePromise) threePromise = import(threeURL);
    threePromise.then(function (T) {
      if (disposed) return;
      engine = build(T, canvas, id); if (disposed) { engine.dispose(); engine = null; return; }
      viewport.prepend(canvas); element.setAttribute('data-state', 'ready'); status.textContent = '3D 就绪 · 拖动探索';
      engine.telemetry(values); theme(); resize(); sync();
    }).catch(function () { fallback('当前设备未能启动 WebGL 3D · 已显示静态概念剖面'); });
    return { setTelemetry: setTelemetry, destroy: function () {
      if (disposed) return; disposed = true; if (raf) global.cancelAnimationFrame(raf); raf = 0;
      cleanups.forEach(function (fn) { fn(); }); cleanups.length = 0;
      if (pointer && viewport.hasPointerCapture(pointer.id)) viewport.releasePointerCapture(pointer.id); pointer = null;
      if (engine) { engine.dispose(); engine = null; } canvas.remove();
    } };
  }
  global.DrillingCinema = { html: html, mount: mount, hasScene: hasScene };
})(window);
