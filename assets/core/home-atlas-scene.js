/* 全流程概念沙盘。空间、设备比例与流动速度用于教学展示，不是工程模型。 */
import * as T from '../vendor/three/three.module.js';

export function createRigScene(host) {
  const owned = new Set(), own = r => (owned.add(r), r);
  const scene = new T.Scene(), world = new T.Group(), fixed = new T.Group(), moving = new T.Group();
  scene.name = 'petroleum-value-chain'; world.name = 'continuous-field-atlas';
  world.add(fixed, moving); scene.add(world);
  const camera = new T.PerspectiveCamera(37, 1, .1, 300);
  const zones = {
    overview: { center: [1, .4, 1.2], extent: [55, 18, 23], yaw: .22, pitch: .53 },
    exploration: { center: [-13, 1.2, .6], extent: [28, 17, 20], yaw: .22, pitch: .48 },
    production: { center: [1.5, .1, 2], extent: [23, 16, 20], yaw: -.25, pitch: .47 },
    midstream: { center: [17, 2, 0], extent: [22, 16, 21], yaw: .42, pitch: .49 }
  };
  let renderer, observer, frame = 0, dead = false, lost = false, running = false, previous = null;
  let elapsed = 0, region = 'overview', tour = false, tourAt = 0, transition = null, zoom = 1, frames = 0, lastRender = 0;
  let yaw = zones.overview.yaw, pitch = zones.overview.pitch, framing = 1.30;
  let manualView = false, ambientYaw = 0, ambientPitch = 0, ambientTime = 0, hoist, receivers, vehicle, vehicleRoute;
  const target = new T.Vector3(...zones.overview.center), extent = new T.Vector3(...zones.overview.extent);
  const up = new T.Vector3(0, 1, 0), direction = new T.Vector3(), pos = new T.Vector3();
  const lights = [], particles = [], pumps = [], pumpRods = [], cranks = [], waves = [], vapors = [], selectable = [];
  const raycaster = new T.Raycaster(), pointer = new T.Vector2();
  const instance = new T.Object3D(), receiverColor = new T.Color(), vehicleTangent = new T.Vector3();
  let mainLight, rim, sky, lightBackdrop, darkBackdrop;

  function backdrop(top, bottom, glow) {
    const width=128,height=64,pixels=new Uint8Array(width*height*4);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const t=y/(height-1),a=Math.exp(-Math.pow((x/width-.72)/.55,2)-Math.pow((t-.4)/.65,2))*.16,i=(y*width+x)*4;
      for(let c=0;c<3;c++)pixels[i+c]=(top[c]*(1-t)+bottom[c]*t)*(1-a)+glow[c]*a;
      pixels[i+3]=255;
    }
    const texture=own(new T.DataTexture(pixels,width,height));texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearFilter;texture.needsUpdate=true;return texture;
  }

  function mat(color, metalness = 0, roughness = .7, extra = {}) {
    return own(new T.MeshStandardMaterial({ color, metalness, roughness, ...extra }));
  }
  const boxGeo = own(new T.BoxGeometry(1, 1, 1));
  const rodGeo = own(new T.CylinderGeometry(1, 1, 1, 12));
  function mesh(geo, material, xyz, parent = fixed) {
    const o = new T.Mesh(geo, material); o.position.set(...xyz); o.castShadow = o.receiveShadow = true; parent.add(o); return o;
  }
  function box(w, h, d, material, xyz, parent) { const o = mesh(boxGeo, material, xyz, parent); o.scale.set(w, h, d); return o; }
  function rod(a, b, radius, material, parent) {
    const av = new T.Vector3(...a), bv = new T.Vector3(...b), o = mesh(rodGeo, material, [0, 0, 0], parent);
    direction.subVectors(bv, av); o.position.copy(av).add(bv).multiplyScalar(.5);
    o.scale.set(radius, direction.length(), radius); o.quaternion.setFromUnitVectors(up, direction.normalize()); return o;
  }
  function tube(points, radius, material, parent = fixed) {
    const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
    mesh(own(new T.TubeGeometry(curve, 60, radius, 8, false)), material, [0, 0, 0], parent); return curve;
  }
  function ring(radius, thickness, material, xyz, parent = fixed) {
    const o = mesh(own(new T.TorusGeometry(radius, thickness, 6, 32)), material, xyz, parent); o.rotation.x = Math.PI / 2; return o;
  }
  function glowTexture() {
    const size = 48, a = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const d = Math.hypot((x - size / 2) / (size / 2), (y - size / 2) / (size / 2)), i = (y * size + x) * 4;
      a[i] = a[i + 1] = a[i + 2] = 255; a[i + 3] = Math.round(Math.pow(Math.max(0, 1 - d), 2) * 255);
    }
    const t = own(new T.DataTexture(a, size, size)); t.needsUpdate = true; return t;
  }
  function grain() {
    const size = 128, a = new Uint8Array(size * size * 4); let seed = 51038;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      const v = 175 + (seed / 4294967296 - .5) * 75 + Math.sin(y * .42 + Math.sin(x * .08)) * 16, i = (y * size + x) * 4;
      a[i] = a[i + 1] = a[i + 2] = v; a[i + 3] = 255;
    }
    const t = own(new T.DataTexture(a, size, size)); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2, .65);
    t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
  }
  function flow(curve, color, count = 18, speed = .10, size = .27, surfaceOffset = .30) {
    const values = new Float32Array(count * 3), geo = own(new T.BufferGeometry());
    geo.setAttribute('position', new T.BufferAttribute(values, 3).setUsage(T.DynamicDrawUsage));
    const material = own(new T.PointsMaterial({ color, size, map: spark, transparent: true, opacity: .98, depthWrite: false, blending: T.NormalBlending }));
    const object = new T.Points(geo, material); moving.add(object); object.frustumCulled = false;
    particles.push({ curve, values, geo, count, speed, surfaceOffset });
  }
  let spark;
  function batchFixed() {
    fixed.updateMatrixWorld(true);
    const groups = new Map();
    fixed.traverse(o => {
      if (!o.isMesh || Array.isArray(o.material)) return;
      const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
      if (!groups.has(o.material)) groups.set(o.material, []); groups.get(o.material).push(geo);
    });
    fixed.clear();
    for (const [material, parts] of groups) {
      const size = parts.reduce((n, g) => n + g.attributes.position.count, 0), g = own(new T.BufferGeometry());
      for (const key of ['position', 'normal', 'uv']) {
        const components = key === 'uv' ? 2 : 3, a = new Float32Array(size * components); let offset = 0;
        for (const part of parts) { const attr = part.attributes[key]; if (attr) a.set(attr.array, offset * components); offset += part.attributes.position.count; }
        g.setAttribute(key, new T.BufferAttribute(a, components));
      }
      const o = mesh(g, material, [0, 0, 0]); o.name = 'batched-' + material.name;
      parts.forEach(p => p.dispose());
    }
  }
  function emit() { host.dispatchEvent(new CustomEvent('atlas-region-change', { detail: { id: region, tour } })); }
  function schedule() { if (!frame && !dead && !lost && (running || transition)) frame = requestAnimationFrame(tick); }
  function view() {
    const a = yaw + ambientYaw, p = pitch + ambientPitch;
    direction.set(Math.sin(a) * Math.cos(p), Math.sin(p), Math.cos(a) * Math.cos(p));
    const right = new T.Vector3().crossVectors(up, direction).normalize(), cameraUp = new T.Vector3().crossVectors(direction, right);
    const tanY = Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * .90, tanX = tanY * camera.aspect;
    let distance = 1;
    for (const x of [-.5, .5]) for (const y of [-.5, .5]) for (const z of [-.5, .5]) {
      pos.set(x * extent.x, y * extent.y, z * extent.z);
      distance = Math.max(distance, pos.dot(direction) + Math.max(Math.abs(pos.dot(right)) / tanX, Math.abs(pos.dot(cameraUp)) / tanY));
    }
    camera.position.copy(target).addScaledVector(direction, distance / (zoom * framing)); camera.lookAt(target); camera.updateMatrixWorld();
  }
  function draw() {
    if (dead || lost || !renderer) return;
    view(); renderer.render(scene, camera); frames++;
    renderer.domElement.dataset.frames = String(frames);
  }
  function focusRegion(id = 'overview', keepTour = false) {
    if (dead || lost || !zones[id]) return;
    takeControl();manualView = id !== 'overview';ambientTime = 0;
    if (!keepTour) tour = false;
    region = id; zoom = 1;
    const next = zones[id], reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { target.set(...next.center); extent.set(...next.extent); yaw = next.yaw; pitch = next.pitch; framing = id === 'overview' ? 1.30 : 1.45; transition = null; draw(); }
    else transition = { at: performance.now(), from: target.clone(), extent: extent.clone(), yaw, pitch, framing, endFraming: id === 'overview' ? 1.30 : 1.45, to: next };
    emit(); schedule();
  }
  function setTour(value) { tour = !!value && !window.matchMedia('(prefers-reduced-motion: reduce)').matches; tourAt = elapsed; if (tour) focusRegion('exploration', true); else emit(); }
  function takeControl(){yaw+=ambientYaw;pitch+=ambientPitch;ambientYaw=ambientPitch=0;manualView=true;}
  function rotate(dx, dy) { if (dead || lost) return; takeControl();transition = null; if (tour) { tour = false; emit(); } yaw += dx; pitch = T.MathUtils.clamp(pitch + dy, .25, 1.12); draw(); }
  function zoomBy(factor) { if (dead || lost) return zoom; takeControl();transition = null; if (tour) { tour = false; emit(); } zoom = T.MathUtils.clamp(zoom * factor, .7, 2.2); draw(); return zoom; }
  function resetView() { focusRegion('overview'); }
  function pick(clientX, clientY) {
    if (dead || lost) return;
    const rect = host.getBoundingClientRect(); pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera); const hits = raycaster.intersectObjects(selectable, false);
    if (hits[0]) focusRegion(hits[0].object.userData.region);
  }
  function animate(dt) {
    elapsed += dt;
    if(region==='overview'&&!manualView&&!transition){ambientTime+=dt;ambientYaw=Math.sin(ambientTime*.20)*.065;ambientPitch=Math.sin(ambientTime*.16)*.016;}
    for (const p of pumps) p.rotation.z = Math.sin(elapsed * 1.3 + p.userData.phase) * .24;
    for(const r of pumpRods){const a=r.beam.rotation.z,top=2.15+Math.sin(a)*1.75;r.object.position.set(r.x+Math.cos(a)*1.75,(.3+top)/2,r.z);r.object.scale.y=top-.3;}
    for (const p of cranks) p.rotation.z = elapsed * 1.3 + p.userData.phase;
    if(hoist)hoist.position.y=5.3+Math.sin(elapsed*.85)*.7;
    for (const w of waves) { const t = (elapsed * .34 + w.userData.phase) % 1; w.scale.setScalar(.35 + t * 4.6); w.material.opacity = (1 - t) * .65; }
    if(receivers){
      for(let i=0;i<16;i++){
        const pulse=Math.pow(Math.max(0,Math.sin(elapsed*2.5-i*.55)),8);
        instance.position.set(-24+i*.71,.76+pulse*.12,4.5);instance.scale.setScalar(1+pulse*.65);instance.updateMatrix();receivers.setMatrixAt(i,instance.matrix);
        receiverColor.setRGB(.035+.08*pulse,.32+.45*pulse,.37+.34*pulse);receivers.setColorAt(i,receiverColor);
      }
      receivers.instanceMatrix.needsUpdate=true;receivers.instanceColor.needsUpdate=true;
    }
    if(vehicle){
      const u=(elapsed*.025+.18)%1;vehicle.position.copy(vehicleRoute.getPointAt(u));vehicleTangent.copy(vehicleRoute.getTangentAt(u));vehicle.rotation.y=Math.atan2(-vehicleTangent.z,vehicleTangent.x);
    }
    for (const p of particles) {
      // 让流向标记贴着管道朝向镜头的一侧，避免被不透明管壁完全遮住。
      for (let i = 0; i < p.count; i++) { pos.copy(p.curve.getPointAt((i / p.count + elapsed * p.speed) % 1)).addScaledVector(direction,p.surfaceOffset); p.values.set([pos.x, pos.y, pos.z], i * 3); }
      p.geo.attributes.position.needsUpdate = true;
    }
    for (const v of vapors) { const t = (elapsed * .18 + v.userData.phase) % 1; v.position.y = 6.8 + t * 3.1; v.position.x = 23.3 + t * 1.4; v.material.opacity = Math.sin(t * Math.PI) * .25; v.scale.setScalar(.85 + t * 2.1); }
    for (const l of lights) {const f=1+Math.sin(elapsed*5+l.userData.phase)*.13;l.material.opacity=.78+Math.sin(elapsed*4)*.12;l.scale.set(.7*f,1.6*f,1);}
    if (tour && elapsed - tourAt > 10) { const ids = ['exploration', 'production', 'midstream', 'overview']; tourAt = elapsed; focusRegion(ids[(ids.indexOf(region) + 1) % ids.length], true); }
  }
  function tick(now) {
    frame = 0; if (dead || lost) return;
    if (now - lastRender < (transition ? 1000 / 60 : 1000 / 30) - .5) { schedule(); return; }
    lastRender = now;
    const dt = previous === null ? 0 : Math.min((now - previous) / 1000, .08); previous = now;
    if (running) animate(dt);
    if (transition) {
      const t = Math.min(1, (now - transition.at) / 1800), u = t * t * (3 - 2 * t), end = transition.to;
      target.copy(transition.from).lerp(new T.Vector3(...end.center), u); extent.copy(transition.extent).lerp(new T.Vector3(...end.extent), u);
      yaw = T.MathUtils.lerp(transition.yaw, end.yaw, u); pitch = T.MathUtils.lerp(transition.pitch, end.pitch, u);
      framing = T.MathUtils.lerp(transition.framing, transition.endFraming, u);
      if (t >= 1) transition = null;
    }
    draw(); schedule(); if (!frame) previous = null;
  }
  function setRunning(value) {
    running = !!value && !lost;
    if (!running && !transition) { cancelAnimationFrame(frame); frame = 0; previous = null; lastRender = 0; }
    schedule();
  }
  function setTheme(dark) {
    if (dead || lost || !renderer) return;
    scene.background=dark?darkBackdrop:lightBackdrop;scene.fog.color.set(dark?0x0b2231:0xeaf2f5);
    mainLight.intensity = dark ? 4.3 : 4.0; rim.intensity = dark ? 2.5 : 2.1; sky.intensity = .85;
    renderer.toneMappingExposure = dark ? 1.06 : 1.10; draw();
  }
  function resize() {
    if (dead || lost) return;
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 600 ? 1.25 : 1.65));
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); draw();
  }
  function contextLost(e) { e.preventDefault(); lost = true; setRunning(false); host.dispatchEvent(new Event('home-rig-error')); }
  function destroy() {
    if (dead) return; dead = true; running = false; cancelAnimationFrame(frame);
    if (observer) observer.disconnect(); else window.removeEventListener('resize', resize);
    owned.forEach(r => r.dispose()); owned.clear();
    scene.traverse(o => { if (o.shadow) o.shadow.dispose(); }); scene.clear();
    if (renderer) { renderer.domElement.removeEventListener('webglcontextlost', contextLost); renderer.renderLists.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); }
    delete host.__atlasScene;
  }
  try {
    renderer = new T.WebGLRenderer({ alpha: false, antialias: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.domElement.className = 'home-rig-canvas'; renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement); renderer.domElement.addEventListener('webglcontextlost', contextLost);
    lightBackdrop=backdrop([245,249,251],[228,238,243],[214,236,236]);
    darkBackdrop=backdrop([7,23,35],[12,37,52],[24,63,70]);
    scene.background=lightBackdrop;scene.fog = new T.Fog(0xeaf2f5, 100, 225);
    spark = glowTexture();
    const stone = grain(), steel = mat(0x849ba7, .8, .3), pale = mat(0xc8d0ce, .65, .3), dark = mat(0x263842, .65, .48);
    const brass = mat(0xc99b4d, .6, .38), red = mat(0xa4513e, .35, .55), blue = mat(0x26717e, .4, .42);
    const concrete = mat(0x748081, 0, .95), rock = mat(0x637168, 0, .96), road = mat(0x343f42, 0, .95);
    const lens = mat(0x386a7b, .6, .2), earth = mat(0x666a52, 0, 1, { map: stone, bumpMap: stone, bumpScale: .12 });
    [steel, pale, dark, brass, red, blue, concrete, rock, road, lens, earth].forEach((m,i) => m.name = 'surface-'+i);
    const envPixels = new Uint8Array(128 * 64 * 4);
    for (let y=0;y<64;y++) for(let x=0;x<128;x++) {
      const i=(y*128+x)*4,v=y<32?120+y*2:45+(64-y)*.7;
      envPixels[i]=v+(y<24?18:0);envPixels[i+1]=v+10;envPixels[i+2]=v+23;envPixels[i+3]=255;
    }
    const environment=own(new T.DataTexture(envPixels,128,64));environment.mapping=T.EquirectangularReflectionMapping;environment.colorSpace=T.SRGBColorSpace;environment.needsUpdate=true;scene.environment=environment;scene.environmentIntensity=.65;
    const colors=[0x897758,0xa38c66,0x62655d,0x9a865f,0x6f725e,0x4a5351,0x9f815d];
    colors.forEach((color,i)=>{
      const boundary=(x,n)=>-.74*n+(n?Math.sin(x*.17+n*.4)*.15+Math.sin(x*.43)*.05:0);
      const shape=new T.Shape();shape.moveTo(-26,boundary(-26,i));
      for(let x=-25.5;x<=26;x+=.5)shape.lineTo(x,boundary(x,i));
      for(let x=26;x>=-26;x-=.5)shape.lineTo(x,boundary(x,i+1));shape.closePath();
      const material=mat(color,0,.92,{map:stone,bumpMap:stone,bumpScale:.10});material.name='strata-'+i;
      mesh(own(new T.ExtrudeGeometry(shape,{depth:15,bevelEnabled:false})),material,[0,0,-8]);
    });
    box(52,.15,15,earth,[0,.07,-.5]);
    const plinth=mat(0x152b37,.55,.45);plinth.name='plinth';box(53.4,.45,16.5,plinth,[0,-5.6,-.5]);
    const edge=mat(0xd3a75c,.5,.35,{emissive:0xa56b28,emissiveIntensity:.4});edge.name='plinth-edge';
    box(52.6,.045,.045,edge,[0,-5.34,7.55]);
    const floor=mesh(own(new T.PlaneGeometry(400,400)),own(new T.ShadowMaterial({color:0x5d8191,opacity:.10})),[0,-5.88,0],scene);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
    box(51,.025,1.05,road,[0,.16,-.5]);
    for(let x=-24;x<25;x+=1.2)box(.48,.012,.045,brass,[x,.18,-.5]);
    // 地貌、露头、采集设备与测线。
    const ridge=own(new T.PlaneGeometry(12,6,48,24));ridge.rotateX(-Math.PI/2);
    const verts=ridge.attributes.position;
    for(let i=0;i<verts.count;i++){
      const x=verts.getX(i),z=verts.getZ(i),fade=Math.max(0,1-Math.pow(x/6,6))*Math.max(0,1-Math.pow(z/3,4));
      const peaks=2.2*Math.exp(-Math.pow((x+2.6)/1.4,2)-Math.pow((z+.2)/1.9,2))+3.2*Math.exp(-Math.pow((x-.4)/1.6,2)-Math.pow((z+.7)/1.5,2))+1.6*Math.exp(-Math.pow((x-3)/1.4,2)-Math.pow(z/1.6,2));
      verts.setY(i,.18+Math.max(0,peaks+Math.sin(x*2.3+z)*.19+Math.cos(z*3.1-x)*.12)*fade);
    }
    ridge.computeVertexNormals();const ridgeMat=mat(0x81806b,0,.97,{map:stone,bumpMap:stone,bumpScale:.10});mesh(ridge,ridgeMat,[-20,.03,-4.9],moving).name='eroded-survey-ridge';
    for(let i=0;i<7;i++)box(2.8,.15,.36,mat(colors[i],0,.95),[-22+i*.19,.3+i*.24,-3.6]);
    const truck=new T.Group();truck.position.set(-17,.2,2.4);fixed.add(truck);
    box(3.4,.38,1.25,dark,[0,.5,0],truck);box(1.15,.9,1.1,brass,[-1,.95,0],truck);box(.6,.4,1.16,lens,[-1.18,1.12,0],truck);
    box(1.4,.75,1.1,blue,[.65,.93,0],truck);box(.65,.22,.75,steel,[.4,.2,0],truck);
    const wheelGeo=own(new T.CylinderGeometry(.34,.34,.22,16));
    for(const x of [-1.15,1.12])for(const z of [-.72,.72]){const w=mesh(wheelGeo,dark,[x,.35,z],truck);w.rotation.x=Math.PI/2;}
    for(let i=0;i<16;i++){
      const x=-24+i*.71;rod([x,.2,4.5],[x,.65,4.5],.035,steel);box(.22,.12,.2,blue,[x,.25,4.5]);
    }
    rod([-24,.23,4.5],[-13.3,.23,4.5],.016,dark);
    receivers=own(new T.InstancedMesh(own(new T.SphereGeometry(.12,8,6)),own(new T.MeshBasicMaterial({color:0xffffff,toneMapped:false})),16));receivers.name='geophone-response';receivers.instanceMatrix.setUsage(T.DynamicDrawUsage);moving.add(receivers);
    for(let i=0;i<3;i++){
      const material=own(new T.MeshBasicMaterial({color:0x72c8d1,transparent:true,opacity:.4,depthWrite:false,side:T.DoubleSide}));
      const w=mesh(own(new T.RingGeometry(.94,1,64)),material,[-16.6,.24,2.4],moving);w.rotation.x=-Math.PI/2;w.userData.phase=i/3;w.castShadow=false;waves.push(w);
    }
    // 井架：格构、天车、游车、平台、护栏与机房。
    const rig=new T.Group();rig.position.set(-6,.2,3.15);fixed.add(rig);
    box(3.3,.34,3,concrete,[0,.15,0],rig);box(2.8,.22,2.5,dark,[0,.75,0],rig);
    const corners=[[-1,-1],[1,-1],[1,1],[-1,1]],leg=(c,t)=>[c[0]*(1.12-.79*t),.85+7.8*t,c[1]*(.9-.6*t)];
    corners.forEach((c,i)=>{
      rod(leg(c,0),leg(c,1),.08,steel,rig);
      for(let k=0;k<8;k++){rod(leg(c,k/8),leg(corners[(i+1)%4],(k+1)/8),.027,steel,rig);rod(leg(c,k/8),leg(corners[(i+1)%4],k/8),.025,steel,rig);}
    });
    box(1.1,.18,.9,steel,[0,8.75,0],rig);rod([0,1,0],[0,8.65,0],.037,pale,rig);
    hoist=new T.Group();hoist.name='travelling-block';hoist.position.set(-6,5.3,3.15);moving.add(hoist);box(.5,.78,.45,brass,[0,0,0],hoist);box(.29,.28,.28,dark,[0,-.52,0],hoist);
    for(const z of [-1.2,1.2]){rod([-1.4,1.45,z],[1.4,1.45,z],.024,brass,rig);for(let x=-1.4;x<=1.4;x+=.7)rod([x,.85,z],[x,1.45,z],.023,brass,rig);}
    for(let k=0;k<22;k++)rod([.7,.9+k*.34,-.9],[1,.9+k*.34,-.9],.019,brass,rig);
    for(let i=0;i<5;i++)box(.5,.13,.3,dark,[-1.55-i*.18,.72-i*.13,1+i*.2],rig);
    for(const x of [-10.5,-7.2]){
      box(2.7,.12,1.8,dark,[x,.23,-3.8]);box(2.6,1.1,1.7,red,[x,.84,-3.8]);box(2.7,.07,1.8,steel,[x,1.43,-3.8]);
      for(let i=0;i<7;i++)box(.035,1,1.74,dark,[x-1.1+i*.36,.84,-3.8]);
    }
    box(3,1.25,1.5,pale,[-3,.85,-4.5]);box(1.1,.5,.025,lens,[-3,1.1,-3.72]);
    for(let i=0;i<15;i++)box(.025,1.14,.035,steel,[-4.3+i*.185,.85,-3.72]);
    box(.5,1,.035,blue,[-1.9,.74,-3.72]);rod([-2,1.5,-4.4],[-2,2.9,-4.4],.025,steel);ring(.28,.02,pale,[-2,2.65,-4.4]);
    box(2,.18,.75,steel,[-2,.36,-1.6]);
    for(let i=0;i<9;i++)box(.16,.13,.48,i%2?rock:concrete,[-2.7+i*.18,.51,-1.6]);
    // 剖面中的套管、井眼与储层流动。
    const bore=tube([[-6,.75,3.15],[-6,-1,7.22],[-5.8,-2.7,7.22],[-4,-4,7.22],[3.8,-4.15,7.22]],.19,dark);
    tube([[-6,.75,3.15],[-6,-1,7.40],[-5.8,-2.7,7.40],[-4,-4,7.40],[3.8,-4.15,7.40]],.062,brass);
    flow(bore,0xd9a33a,16,.12,.75,.35);
    const probe=mesh(own(new T.CylinderGeometry(.09,.09,.58,12)),pale,[-6,-1.65,7.46]);probe.name='logging-probe';
    for(let k=0;k<3;k++)ring(.095,.012,brass,[-6,-1.82+k*.16,7.46]);
    for(let i=0;i<6;i++)rod([-.5+i*.6,-4.15,7.35],[-.5+i*.6,-4.5,7.35],.025,brass);
    const reservoir=mat(0x806d45,0,.9,{emissive:0x4b3617,emissiveIntensity:.28});reservoir.name='reservoir';
    box(15,.38,.08,reservoir,[.5,-4.12,7.05]);
    // 开发区：抽油机、井口树与注采通道。
    function pumpjack(x,z,phase){
      box(3.2,.18,1.6,concrete,[x,.24,z]);
      rod([x-1,.35,z-.4],[x,2.3,z],.12,steel);rod([x+1,.35,z+.4],[x,2.3,z],.12,steel);
      const beam=new T.Group();beam.position.set(x,2.4,z);beam.userData.phase=phase;moving.add(beam);pumps.push(beam);
      box(3.7,.22,.35,blue,[.2,0,0],beam);box(.48,.85,.38,brass,[1.75,-.25,0],beam);
      const sucker=rod([x+1.75,.3,z],[x+1.75,2,z],.02,pale,moving);pumpRods.push({object:sucker,beam,x,z});box(.8,.6,.8,dark,[x-1,.55,z-.8]);
      const crank=new T.Group();crank.position.set(x-1,.9,z+.16);crank.userData.phase=phase;moving.add(crank);cranks.push(crank);
      const wheel=ring(.46,.08,red,[0,0,0],crank);wheel.rotation.x=0;rod([0,0,0],[.4,0,0],.07,brass,crank);box(.4,.25,.18,red,[.32,.05,0],crank);
    }
    pumpjack(1.8,1.7,0);pumpjack(6,-2.4,1.2);
    for(const [x,z] of [[6.3,4.3],[9,-4.6]]){
      box(1.1,.15,1.1,concrete,[x,.23,z]);rod([x,.25,z],[x,1.55,z],.10,blue);
      rod([x-.5,1.2,z],[x+.5,1.2,z],.08,steel);ring(.23,.035,red,[x,1.72,z]);
    }
    // 轻型修井井架与井口相邻，区别于勘探区的大型钻机。
    for(const z of [3.85,4.75]){
      rod([5.65,.28,z],[6.3,3.9,4.3],.045,steel);rod([6.95,.28,z],[6.3,3.9,4.3],.045,steel);
      for(let k=1;k<5;k++){const y=k*.68,t=y/3.9;rod([5.65+.65*t,y,z+(4.3-z)*t],[6.95-.65*t,y,z+(4.3-z)*t],.021,brass);}
    }
    rod([6.3,.3,4.3],[6.3,3.85,4.3],.014,pale);
    const injection=tube([[9,.35,-4.6],[9,-1.7,7.25],[7.5,-3.8,7.25],[4.1,-4.1,7.25]],.07,blue);
    flow(injection,0x188eab,12,.15,.70,.23);
    const line=tube([[3.5,.35,1.7],[8,.35,1.7],[10,.65,2.6],[13,.65,2.6],[15,.8,-1.4],[19,.8,-1.4]],.105,steel);
    flow(line,0x087d86,18,.16,.80,.24);
    // 道路上的巡检车辆沿固定环线行驶，不改变生产设备状态。
    vehicle=new T.Group();vehicle.name='inspection-vehicle';moving.add(vehicle);
    box(2,.22,.85,dark,[0,.25,0],vehicle);box(.7,.65,.82,blue,[.5,.66,0],vehicle);box(.05,.32,.72,lens,[.87,.78,0],vehicle);box(.9,.47,.8,pale,[-.45,.58,0],vehicle);
    for(const x of [-.65,.65])for(const z of [-.47,.47]){const w=mesh(wheelGeo,dark,[x,.22,z],vehicle);w.scale.setScalar(.64);w.rotation.x=Math.PI/2;}
    const roadPoint=(x,z)=>new T.Vector3(x,.18,z);vehicleRoute=new T.CurvePath();
    vehicleRoute.add(new T.LineCurve3(roadPoint(-22,-.22),roadPoint(23,-.22)));
    vehicleRoute.add(new T.CubicBezierCurve3(roadPoint(23,-.22),roadPoint(23.4,-.22),roadPoint(23.4,-.83),roadPoint(23,-.83)));
    vehicleRoute.add(new T.LineCurve3(roadPoint(23,-.83),roadPoint(-22,-.83)));
    vehicleRoute.add(new T.CubicBezierCurve3(roadPoint(-22,-.83),roadPoint(-22.4,-.83),roadPoint(-22.4,-.22),roadPoint(-22,-.22)));
    // 储运区：储罐、泵站、管廊与精馏装置。
    const tankGeo=own(new T.CylinderGeometry(1.65,1.65,1.8,40));
    for(const [x,z] of [[12.3,4.4],[16.4,4.4],[12.3,-4.4]]){
      box(3.8,.13,3.8,concrete,[x,.23,z]);mesh(tankGeo,pale,[x,1.2,z]);ring(1.67,.035,steel,[x,2.1,z]);
      mesh(own(new T.ConeGeometry(1.65,.28,40)),steel,[x,2.22,z]);
      for(let a=0;a<16;a++){const t=a*Math.PI/8;rod([x+Math.cos(t)*1.68,2.1,z+Math.sin(t)*1.68],[x+Math.cos(t)*1.68,2.52,z+Math.sin(t)*1.68],.018,brass);}
      ring(1.69,.02,brass,[x,2.52,z]);
      for(let k=0;k<8;k++)rod([x+1.7,.4+k*.23,z-.2],[x+1.7,.4+k*.23,z+.2],.021,steel);
    }
    box(2.5,.2,1.7,concrete,[10.8,.25,-.3]);
    for(let i=0;i<2;i++){box(.8,.65,.55,blue,[10.4+i, .68,-.3]);rod([10.4+i,.6,-.3],[10.4+i,.6,1],.085,steel);}
    const towers=[[19,7.5,.9],[21.6,5.8,.7],[23.7,4.7,.6]];
    for(const [x,h,r] of towers){
      mesh(own(new T.CylinderGeometry(r,r,h,28)),pale,[x,h/2+.4,-3.5]);
      mesh(own(new T.SphereGeometry(r,24,12)),pale,[x,h+.4,-3.5]);
      for(let y=1;y<h;y+=1.2){ring(r+.25,.025,steel,[x,y,-3.5]);ring(r+.3,.022,brass,[x,y+.38,-3.5]);}
      rod([x+r+.2,.4,-3.7],[x+r+.2,h+.6,-3.7],.025,steel);rod([x+r+.2,.4,-3.3],[x+r+.2,h+.6,-3.3],.025,steel);
      for(let k=0;k<h*4;k++)rod([x+r+.2,.5+k*.25,-3.7],[x+r+.2,.5+k*.25,-3.3],.014,brass);
      tube([[x,h*.65,-3.5],[x-1.1,h*.65,-3.5],[x-1.1,.65,-2],[19,.65,-1.4]],.085,steel);
    }
    for(let x=17.5;x<=24.5;x+=2.3){rod([x,.2,-.8],[x,3.3,-.8],.10,steel);rod([x,.2,1],[x,3.3,1],.10,steel);rod([x,3.25,-.8],[x,3.25,1],.10,steel);}
    for(let i=0;i<5;i++)rod([17.5,3.4+i*.17,-.5],[24.5,3.4+i*.17,-.5],.065,i%2?brass:steel);
    box(4.8,1.5,2.5,dark,[21,1.05,3.65]);box(5,.12,2.7,steel,[21,1.87,3.65]);
    for(let i=0;i<12;i++)box(.18,1.25,2.55,steel,[18.9+i*.38,1.1,3.65]);
    rod([24.4,.2,-6.6],[24.4,6.7,-6.6],.12,dark);
    const flame=new T.Sprite(own(new T.SpriteMaterial({map:spark,color:0xd99340,transparent:true,depthWrite:false,blending:T.NormalBlending})));flame.position.set(24.4,7.2,-6.6);flame.scale.set(.65,1.4,1);flame.userData.phase=0;moving.add(flame);lights.push(flame);
    for(let i=0;i<5;i++){
      const vapor=new T.Sprite(own(new T.SpriteMaterial({map:spark,color:0x8ba5b3,transparent:true,opacity:.1,depthWrite:false})));vapor.userData.phase=i/5;vapor.position.set(23.3,6.8,-3.5);moving.add(vapor);vapors.push(vapor);
    }
    // 安全围栏和稀疏场地灯保留工业尺度线索。
    for(let x=9.5;x<=25;x+=1){rod([x,.2,6.2],[x,.8,6.2],.02,steel);}
    rod([9.5,.7,6.2],[25,.7,6.2],.02,steel);
    for(const x of [-13,8,17,25]){rod([x,.2,-7],[x,3.5,-7],.035,dark);box(.32,.08,.22,edge,[x,3.55,-7]);}
    batchFixed();
    sky=new T.HemisphereLight(0xc2def3,0x5c4932,.85);scene.add(sky);
    mainLight=new T.DirectionalLight(0xffd6a1,4.3);mainLight.position.set(-18,30,14);mainLight.castShadow=true;
    const sc=mainLight.shadow.camera;sc.left=-40;sc.right=40;sc.top=25;sc.bottom=-25;sc.near=.5;sc.far=100;
    mainLight.shadow.mapSize.set(host.clientWidth<600?1024:2048,host.clientWidth<600?1024:2048);mainLight.shadow.bias=-.00025;mainLight.shadow.normalBias=.06;scene.add(mainLight);
    rim=new T.DirectionalLight(0x79b9df,2.5);rim.position.set(12,14,-22);scene.add(rim);
    const fill=new T.DirectionalLight(0xf1d3b1,.4);fill.position.set(30,10,20);scene.add(fill);
    const hitMat=own(new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));
    for(const [id,x,w] of [['exploration',-16,21],['production',3,16],['midstream',18,17]]){
      const hit=new T.Mesh(own(new T.BoxGeometry(w,8,15)),hitMat);hit.position.set(x,1,0);hit.userData.region=id;scene.add(hit);selectable.push(hit);
    }
    view();animate(0);setTheme(document.documentElement.dataset.theme==='dark');
    if(window.ResizeObserver){observer=new ResizeObserver(resize);observer.observe(host);}else window.addEventListener('resize',resize);
    resize();
    const api={setRunning,setTheme,rotate,zoomBy,resetView,focusRegion,setTour,pick,destroy,
      diagnostics:()=>({region,tour,running,elapsed,frames,zoom,target:target.toArray(),extent:extent.toArray(),camera:camera.position.toArray(),transitioning:!!transition,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,resources:owned.size,
        motion:{hoist:hoist.position.y,pumps:pumps.map(p=>p.rotation.z),vehicle:vehicle.position.toArray(),wave:waves[0].scale.x,flowHead:Array.from(particles[0].values.slice(0,3)),vapor:vapors[0].position.toArray(),ambientYaw,manualView}})};
    host.__atlasScene=api;return api;
  } catch(e) { destroy();throw e; }
}
