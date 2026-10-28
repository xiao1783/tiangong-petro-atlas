/* 首页井场剖面：物体材质与机械运动为展示模型，不代表实井尺寸或现场数据。 */
import * as T from '../vendor/three/three.module.js';

export function createRigScene(host) {
  const owned = new Set(), scene = new T.Scene(), world = new T.Group();
  scene.name = 'home-drilling-field'; world.name = 'field-cutaway'; scene.add(world);
  const own = resource => (owned.add(resource), resource);
  const camera = new T.PerspectiveCamera(36, 1, .1, 160);
  let renderer, observer, frame = 0, running = false, dead = false, lost = false, elapsed = 0, previous = null, nextDraw = 0;
  const up = new T.Vector3(0, 1, 0), direction = new T.Vector3(), target = new T.Vector3();
  const outward = new T.Vector3(), right = new T.Vector3(), cameraUp = new T.Vector3(), offset = new T.Vector3();
  const fitCorners = [];
  let yaw = .39, pitch = Math.atan(.33), zoom = 1, manualView = false;
  function mesh(geometry, material, position = [0, 0, 0], parent = world) {
    const object = new T.Mesh(geometry, material); object.position.set(...position);
    object.castShadow = object.receiveShadow = true; parent.add(object); return object;
  }
  function material(color, metalness = 0, roughness = .8) {
    return own(new T.MeshStandardMaterial({ color, metalness, roughness }));
  }
  function dispose() {
    if (dead) return; dead = true; running = false; cancelAnimationFrame(frame); frame = 0;
    if (observer) observer.disconnect(); else window.removeEventListener('resize', resize);
    if (renderer) renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    owned.forEach(resource => resource.dispose()); owned.clear();
    scene.traverse(object => { if (object.shadow) object.shadow.dispose(); }); scene.clear();
    if (renderer) {
      renderer.renderLists.dispose(); renderer.dispose(); renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  }
  function contextLost(event) {
    event.preventDefault(); lost = true; setRunning(false);
    host.dispatchEvent(new Event('home-rig-error'));
  }
  function setRunning(value) {
    if (dead) return;
    running = !!value && !lost;
    if (!running) { cancelAnimationFrame(frame); frame = 0; previous = null; nextDraw = 0; }
    else if (!frame) frame = requestAnimationFrame(tick);
  }
  function view() {
    const angle = yaw + (manualView ? 0 : Math.sin(elapsed * .09) * .025);
    outward.set(Math.sin(angle) * Math.cos(pitch), Math.sin(pitch), Math.cos(angle) * Math.cos(pitch));
    right.crossVectors(up, outward).normalize(); cameraUp.crossVectors(outward, right);
    const tanY = Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * .90, tanX = tanY * camera.aspect;
    let distance = 1;
    for (const corner of fitCorners) {
      offset.subVectors(corner, target);
      distance = Math.max(distance, offset.dot(outward) + Math.max(Math.abs(offset.dot(right)) / tanX, Math.abs(offset.dot(cameraUp)) / tanY));
    }
    distance /= zoom;
    camera.position.copy(target).addScaledVector(outward, distance);
    const far = Math.max(160, distance * 2);
    if (camera.far !== far) { camera.far = far; camera.updateProjectionMatrix(); }
    camera.lookAt(target);
  }
  function takeControl() {
    if (!manualView) yaw += Math.sin(elapsed * .09) * .025;
    manualView = true;
  }
  function rotate(dx, dy) {
    if (dead || lost) return;
    takeControl(); yaw += dx; pitch = T.MathUtils.clamp(pitch + dy, .10, 1.10); draw();
  }
  function zoomBy(factor) {
    if (dead || lost) return zoom;
    takeControl(); zoom = T.MathUtils.clamp(zoom * factor, .7, 2.2); draw(); return zoom;
  }
  function resetView() {
    if (dead || lost) return;
    yaw = .39; pitch = Math.atan(.33); zoom = 1; manualView = true; draw();
  }
  function draw() { if (!dead && !lost) { view(); renderer.render(scene, camera); } }
  function resize() {
    if (dead || lost) return;
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 600 ? 1.35 : 1.7));
    renderer.setSize(width, height, false); camera.aspect = width / height;
    camera.updateProjectionMatrix(); draw();
  }
  let drive, flywheel, bit, fluid, key, fill, sky, groundMat;
  const curve = new T.CatmullRomCurve3([
    new T.Vector3(-2.45, .6, .26), new T.Vector3(-2.45, -1.7, .26),
    new T.Vector3(-2.27, -3.6, .26), new T.Vector3(-1.15, -4.55, .26),
    new T.Vector3(1.5, -4.62, .26), new T.Vector3(4.6, -4.45, .26)
  ]);
  const fluidPositions = new Float32Array(54 * 3), point = new T.Vector3();
  function animate(dt) {
    elapsed += dt; drive.position.y = 4.75 + Math.sin(elapsed * .3) * .38;
    flywheel.rotation.z += dt * .7; bit.rotation.y += dt * .8;
    for (let i = 0; i < 54; i++) {
      const u = (i / 54 - elapsed * .045 + 100) % 1;
      point.copy(curve.getPointAt(u));
      fluidPositions[i * 3] = point.x + Math.sin(i * 2.4) * .13;
      fluidPositions[i * 3 + 1] = point.y;
      fluidPositions[i * 3 + 2] = point.z + .19;
    }
    fluid.geometry.attributes.position.needsUpdate = true;
  }
  function tick(now) {
    frame = 0; if (!running || dead || lost) return;
    const interval = 1000 / 30;
    if (previous === null) { previous = now; nextDraw = now + interval; }
    if (now + .01 >= nextDraw) {
      animate(Math.min((now - previous) / 1000, .08)); previous = now;
      // 保留目标帧的时间余量，避免刷新率和浮点误差额外跳帧。
      nextDraw += Math.max(1, Math.floor((now - nextDraw) / interval) + 1) * interval;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function setTheme(dark) {
    if (dead || lost) return;
    // 保留岩石和机械本色，仅调节周围光照与背景适应页面。
    scene.background = null;
    sky.intensity = dark ? 1.65 : 2.4; key.intensity = dark ? 3.3 : 3.0; fill.intensity = dark ? 1.3 : 1.1;
    groundMat.opacity = dark ? .3 : .19;
    renderer.toneMappingExposure = dark ? 1.03 : 1.08; draw();
  }
  try {
    renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-hidden', 'true'); renderer.domElement.className = 'home-rig-canvas';
    host.appendChild(renderer.domElement); renderer.domElement.addEventListener('webglcontextlost', contextLost);
    const boxGeo = own(new T.BoxGeometry(1, 1, 1)), rodGeo = own(new T.CylinderGeometry(1, 1, 1, 10));
    const box = (w, h, d, mat, p, parent) => { const o = mesh(boxGeo, mat, p, parent); o.scale.set(w, h, d); return o; };
    function beam(a, b, r, mat, parent, square = false) {
      const first = new T.Vector3(...a), last = new T.Vector3(...b); direction.copy(last).sub(first);
      const o = mesh(square ? boxGeo : rodGeo, mat, [0, 0, 0], parent);
      o.position.copy(first.add(last).multiplyScalar(.5)); o.scale.set(r, direction.length(), r);
      o.quaternion.setFromUnitVectors(up, direction.normalize()); return o;
    }
    const steel = material(0x8e9ca0, .78, .32), darkSteel = material(0x424d50, .65, .42);
    const pipeSteel = material(0xc1c7c7, .8, .25), safety = material(0xc89f48, .28, .56);
    const oxide = material(0x875144, .35, .6), enamel = material(0xb6beb8, .32, .55), rubber = material(0x272a28, .05, .9);
    const concrete = material(0xb6b3a8, 0, .94), windowMat = material(0x36545e, .45, .18);
    // 一张颗粒/层理贴图由确定性噪声生成，可同时用于岩石颜色细节与凹凸。
    let seed = 571;
    function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
    function grainTexture(layered) {
      const size = 128, pixels = new Uint8Array(size * size * 4);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const warp = Math.sin(x * .08) * 2 + Math.sin(x * .21 + y * .07);
        const line = layered ? Math.sin(y * .24 + warp) * 9 + Math.sin(y * .73 + warp * 2) * 4 : 0;
        const v = Math.max(70, Math.min(255, 195 + (random() - .5) * 78 + line)), p = (y * size + x) * 4;
        pixels[p] = pixels[p + 1] = pixels[p + 2] = v; pixels[p + 3] = 255;
      }
      const tex = own(new T.DataTexture(pixels, size, size)); tex.wrapS = tex.wrapT = T.RepeatWrapping;
      tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearMipmapLinearFilter; tex.generateMipmaps = true;
      tex.repeat.set(.65, .8); tex.needsUpdate = true; return tex;
    }
    const stone = grainTexture(true), grit = grainTexture(false);
    concrete.bumpMap = grit; concrete.bumpScale = .045;
    const environment = new Uint8Array(128 * 64 * 4);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) {
      const p = (y * 128 + x) * 4, skyPart = y < 32, value = skyPart ? 215 + y : 92 - (y - 32) * .8;
      environment[p] = Math.min(255,value); environment[p + 1] = Math.min(255,value + (skyPart ? 5 : 0)); environment[p + 2] = Math.min(255,value + (skyPart ? 12 : -8)); environment[p + 3] = 255;
    }
    const env = own(new T.DataTexture(environment, 128, 64)); env.mapping = T.EquirectangularReflectionMapping;
    env.colorSpace = T.SRGBColorSpace; env.needsUpdate = true; scene.environment = env;
    const strata = new T.Group(); strata.name = 'natural-strata'; world.add(strata);
    const rockColors = [0x9e896a, 0xb8a07b, 0x75746a, 0xbda57d, 0x837362, 0x696c62, 0x9c8264];
    const boundary = (x, i) => -i * .84 + (i ? Math.sin(x * .48 + i * .4) * .105 + Math.sin(x * 1.4) * .026 : 0);
    rockColors.forEach((color, i) => {
      const shape = new T.Shape(); shape.moveTo(-7, boundary(-7, i));
      for (let x = -6.75; x <= 7; x += .25) shape.lineTo(x, boundary(x, i));
      for (let x = 7; x >= -7; x -= .25) shape.lineTo(x, boundary(x, i + 1)); shape.closePath();
      const mat = material(color, 0, .96); mat.map = stone; mat.bumpMap = stone; mat.bumpScale = .085;
      const layer = mesh(own(new T.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: false, steps: 1 })), mat, [0, 0, -6], strata);
      layer.name = 'rock-layer-' + (i + 1);
    });
    const earth = material(0x9f9176, 0, 1); earth.map = grit; earth.bumpMap = grit; earth.bumpScale = .075;
    box(14, .08, 6, earth, [0, .015, -3]);
    groundMat = own(new T.ShadowMaterial({ color: 0x16262d, opacity: .19, depthWrite: false }));
    const ground = mesh(own(new T.PlaneGeometry(45, 40)), groundMat, [0, -6.04, -2], scene); ground.name='studio-shadow-ground';ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
    const gravelGeo = own(new T.IcosahedronGeometry(.045, 0)), gravel = new T.InstancedMesh(gravelGeo, concrete, 100), dummy = new T.Object3D();
    for (let i = 0; i < 100; i++) { dummy.position.set(random() * 13.8 - 6.9, .08, random() * -5.8); dummy.scale.setScalar(.5 + random()); dummy.rotation.set(random(), random(), random()); dummy.updateMatrix(); gravel.setMatrixAt(i, dummy.matrix); }
    gravel.castShadow = true; world.add(gravel);
    // 地面平台与四面钢桁架，前方剖面打开以同时观察井筒。
    const rig = new T.Group(); rig.name = 'steel-derrick'; rig.position.set(-2.45, .1, -.15); world.add(rig);
    box(3.4, .38, 2.8, concrete, [0, .12, 0], rig); box(3.05, .25, 2.5, darkSteel, [0, .44, 0], rig);
    const corners = [[-1,-1],[1,-1],[1,1],[-1,1]], y0 = .57, height = 7.6;
    const leg = (c, t) => [c[0] * (1.15 - .82 * t), y0 + height * t, c[1] * (.9 - .65 * t)];
    corners.forEach((c, index) => {
      const next = corners[(index + 1) % 4]; beam(leg(c,0),leg(c,1),.11,steel,rig,true);
      for (let j = 0; j <= 6; j++) {
        beam(leg(c,j/6),leg(next,j/6),.045,darkSteel,rig);
        if (j < 6) { beam(leg(c,j/6),leg(next,(j+1)/6),.031,steel,rig); beam(leg(next,j/6),leg(c,(j+1)/6),.018,darkSteel,rig); }
      }
    });
    box(.95,.18,.82,darkSteel,[0,8.25,0],rig);
    const sheaveGeo = own(new T.CylinderGeometry(.19,.19,.09,20));
    for (let i=0;i<4;i++) { const s=mesh(sheaveGeo,steel,[-.23+i*.15,8.4,0],rig);s.rotation.z=Math.PI/2; }
    drive = new T.Group(); drive.name='travelling-block'; drive.position.set(0,4.75,0); rig.add(drive);
    box(.42,.73,.4,safety,[0,0,0],drive); box(.3,.2,.28,darkSteel,[0,-.44,0],drive);
    for (let i=0;i<4;i++) beam([-.15+i*.1,.65,-.03],[-.15+i*.1,8.37,-.03],.009,darkSteel,rig);
    beam([0,.57,0],[0,6.4,0],.045,pipeSteel,rig);
    for (const z of [-1.27,1.27]) {
      beam([-1.49,1.25,z],[1.49,1.25,z],.022,safety,rig); beam([-1.49,.91,z],[1.49,.91,z],.018,safety,rig);
      for (let x=-1.49;x<=1.5;x+=.745) beam([x,.55,z],[x,1.25,z],.024,safety,rig);
    }
    beam([1.27,.57,-.76],[.47,7.8,-.23],.02,steel,rig); beam([1.52,.57,-.76],[.72,7.8,-.23],.02,steel,rig);
    for(let i=0;i<28;i++){const t=i/28;beam([1.27-.8*t,.57+7.23*t,-.76+.53*t],[1.52-.8*t,.57+7.23*t,-.76+.53*t],.014,steel,rig);}
    for(let i=0;i<4;i++) box(.48,.09,.29,darkSteel,[-1.8-i*.13,.49-i*.12,1.04+i*.22],rig);
    for(const x of [-6.4,4.9]) beam([-2.45,7.5,-.4],[x,.1,-4.9],.01,darkSteel);
    const equipment = new T.Group(); equipment.name='surface-equipment'; world.add(equipment);
    // 带波纹板、门窗与屋顶通风管的动力机房。
    box(3.1,.16,1.65,darkSteel,[-4.55,.15,-3.85],equipment);box(2.85,1.28,1.5,enamel,[-4.55,.84,-3.85],equipment);
    box(3,.1,1.6,darkSteel,[-4.55,1.52,-3.85],equipment);
    for(let i=0;i<17;i++) box(.025,1.2,.035,steel,[-5.85+i*.16,.84,-3.08],equipment);
    box(.5,.95,.035,oxide,[-5.4,.72,-3.06],equipment);box(.74,.4,.045,windowMat,[-4.2,1.06,-3.05],equipment);
    beam([-5.5,1.55,-3.9],[-5.5,2,-3.9],.06,darkSteel,equipment);
    // 两只泥浆罐带顶部横梁、检修栏杆与并联管道。
    for(const x of [1.35,4.1]){
      box(2.25,.14,1.7,darkSteel,[x,.14,-3.95],equipment);box(2.15,.95,1.6,oxide,[x,.66,-3.95],equipment);
      box(2.2,.05,1.65,steel,[x,1.16,-3.95],equipment);
      for(let j=0;j<4;j++) box(.045,.91,1.63,darkSteel,[x-.85+j*.57,.66,-3.95],equipment);
      for(const z of [-4.72,-3.18]){beam([x-1.05,1.67,z],[x+1.05,1.67,z],.018,safety,equipment);for(const dx of [-1.05,0,1.05])beam([x+dx,1.2,z],[x+dx,1.67,z],.018,safety,equipment);}
      beam([x,.25,-3.1],[x,.25,-2.65],.085,steel,equipment);
    }
    beam([1.35,.25,-2.65],[4.1,.25,-2.65],.085,steel,equipment);
    // 泥浆泵、电机和地面管汇，局部安全黄保留工程涂装含义。
    box(1.8,.16,.9,darkSteel,[2,.16,-1.35],equipment);box(.72,.61,.65,safety,[1.6,.52,-1.35],equipment);
    const motor=mesh(own(new T.CylinderGeometry(.27,.27,.68,24)),enamel,[2.4,.54,-1.35],equipment);motor.rotation.z=Math.PI/2;
    for(let i=0;i<7;i++){const ring=mesh(own(new T.TorusGeometry(.28,.013,6,24)),darkSteel,[2.12+i*.09,.54,-1.35],equipment);ring.rotation.y=Math.PI/2;}
    flywheel=new T.Group();flywheel.name='mud-pump-flywheel';flywheel.position.set(1.6,.53,-.95);equipment.add(flywheel);
    mesh(own(new T.TorusGeometry(.29,.045,8,24)),darkSteel,[0,0,0],flywheel);
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;beam([0,0,0],[Math.cos(a)*.27,Math.sin(a)*.27,0],.025,steel,flywheel);}
    beam([1.5,.32,-.92],[-1.8,.32,-.92],.065,oxide,equipment);beam([-1.8,.32,-.92],[-1.8,.74,-.92],.065,oxide,equipment);
    for(let i=0;i<5;i++)beam([3.8,.16+i*.09,-1.4],[6.4,.16+i*.09,-1.4],.035,darkSteel,equipment);
    // 切开的套管露出内钻柱，管壁、孔隙与金属钻头分别表达。
    const well = new T.Group(); well.name='wellbore-cutaway'; world.add(well);
    function openTube(radius) {
      const geo=own(new T.TubeGeometry(curve,130,radius,16,false)), index=geo.index.array, pos=geo.attributes.position, half=[];
      for(let i=0;i<index.length;i+=3) if((pos.getZ(index[i])+pos.getZ(index[i+1])+pos.getZ(index[i+2]))/3<.26) half.push(index[i],index[i+1],index[i+2]);
      geo.setIndex(half);return geo;
    }
    const boreMat=material(0x3f392f,0,.96);boreMat.side=T.DoubleSide;
    const bore=mesh(openTube(.225),boreMat,[0,0,-.12],well);bore.name='bore-annulus';
    const casingGeo=openTube(.175), casingMat=pipeSteel.clone();own(casingMat);casingMat.side=T.DoubleSide;
    mesh(casingGeo,casingMat,[0,0,.05],well).name='cut-steel-casing';
    mesh(own(new T.TubeGeometry(curve,130,.065,12,false)),steel,[0,0,.12],well).name='inner-drill-string';
    const bitAnchor=new T.Group();bitAnchor.name='drill-bit';bitAnchor.position.copy(curve.getPoint(1)).add(new T.Vector3(0,0,.12));
    bitAnchor.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),curve.getTangent(1));well.add(bitAnchor);bit=new T.Group();bitAnchor.add(bit);
    mesh(own(new T.CylinderGeometry(.09,.21,.42,24)),steel,[0,0,0],bit);
    const carbide=material(0xa9986e,.65,.32), diamond=material(0x344043,.45,.25);
    for(let i=0;i<6;i++){
      const blade=new T.Group();blade.rotation.y=i*Math.PI/3;bit.add(blade);box(.14,.36,.06,steel,[.15,-.04,0],blade);
      for(let j=0;j<3;j++){const tooth=mesh(own(new T.CylinderGeometry(.043,.043,.035,12)),carbide,[.22,-.16+j*.11,.03],blade);tooth.rotation.x=Math.PI/2;const face=mesh(own(new T.CircleGeometry(.034,12)),diamond,[.22,-.16+j*.11,.051],blade);face.name='pdc-cutter';}
    }
    const fluidGeo=own(new T.BufferGeometry());fluidGeo.setAttribute('position',new T.BufferAttribute(fluidPositions,3).setUsage(T.DynamicDrawUsage));
    fluid=new T.Points(fluidGeo,own(new T.PointsMaterial({color:0xab9069,size:.045,transparent:true,opacity:.72,depthWrite:false})));fluid.frustumCulled=false;fluid.name='returning-mud';well.add(fluid);
    sky=new T.HemisphereLight(0xe2ecf3,0x8e785c,2.4);scene.add(sky);
    key=new T.DirectionalLight(0xffe3b5,3);key.position.set(-9,17,11);key.castShadow=true;
    key.shadow.mapSize.set(1536,1536);key.shadow.camera.left=-15;key.shadow.camera.right=15;key.shadow.camera.top=15;key.shadow.camera.bottom=-15;
    key.shadow.camera.near=.5;key.shadow.camera.far=55;key.shadow.bias=-.00025;key.shadow.normalBias=.035;scene.add(key);
    fill=new T.DirectionalLight(0xc9deed,1.1);fill.position.set(10,8,-9);scene.add(fill);
    animate(0);
    // 只包围井场实体，45×40 的接影地面留在 scene 中，不参与镜头取景。
    world.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(world); bounds.getCenter(target);
    // 分别包围地层、井架和设备，避免把井架两侧的空中区域也当作实体。
    for (const object of world.children) {
      const part = new T.Box3().setFromObject(object);
      if (part.isEmpty()) continue;
      for (const x of [part.min.x, part.max.x]) for (const y of [part.min.y, part.max.y]) for (const z of [part.min.z, part.max.z]) fitCorners.push(new T.Vector3(x, y, z));
    }
    setTheme(document.documentElement.dataset.theme==='dark');
    if(window.ResizeObserver){observer=new ResizeObserver(resize);observer.observe(host);}else window.addEventListener('resize',resize);
    resize();
    return { setRunning, setTheme, rotate, zoomBy, resetView, destroy:dispose };
  } catch(error) { dispose(); throw error; }
}
