/* 本地原生几何场景：尺寸、运动和流体均为概念示意。 */
import * as T from '../vendor/three/three.module.js';

export function buildStageScene(id) {
  const owned=new Set(),own=r=>(owned.add(r),r),scene=new T.Scene(),world=new T.Group(),fixed=new T.Group(),moving=new T.Group();
  scene.add(world);world.add(fixed,moving);world.name=id+'-field';
  const camera=new T.PerspectiveCamera(36,1,.05,250),animations=[],flows=[],details=new Set(),sectionMaterials=new Map();
  let renderer,dead=false,frames=0,width=1000,activeShot=-1;
  const shots=[],target=new T.Vector3(),desired=new T.Vector3(),direction=new T.Vector3(),tmp=new T.Vector3(),up=new T.Vector3(0,1,0),position=new T.Vector3();
  const boxGeo=own(new T.BoxGeometry(1,1,1)),cylGeo=own(new T.CylinderGeometry(1,1,1,24)),sphereGeo=own(new T.SphereGeometry(1,12,8));
  function mat(color,metal=0,rough=.7,extra={}){return own(new T.MeshStandardMaterial({color,metalness:metal,roughness:rough,...extra}));}
  const steel=mat(0x91a4ac,.78,.28),pale=mat(0xc3cecc,.55,.35),dark=mat(0x344c57,.66,.4),teal=mat(0x226e79,.42,.42),gold=mat(0xc4a25c,.6,.34),rust=mat(0xa55f48,.28,.6),rubber=mat(0x24333a,0,.88),concrete=mat(0x9aa8a5,0,.93),glass=mat(0x255e71,.56,.18),water=mat(0x338b9b,.3,.33),hot=mat(0xc98542,.42,.45);
  const grain=new Uint8Array(128*128*4);let seed=9341;
  for(let i=0;i<grain.length;i+=4){seed=(1664525*seed+1013904223)>>>0;const n=182+(seed>>>24)*.19;grain[i]=grain[i+1]=grain[i+2]=n;grain[i+3]=255;}
  const stone=own(new T.DataTexture(grain,128,128));stone.wrapS=stone.wrapT=T.RepeatWrapping;stone.repeat.set(3,2);stone.needsUpdate=true;
  const brushed=new Uint8Array(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,v=178+Math.sin(y*1.7)*12+(grain[i]-200)*.12;brushed[i]=brushed[i+1]=brushed[i+2]=v;brushed[i+3]=255;}
  const metalTexture=own(new T.DataTexture(brushed,128,128));metalTexture.wrapS=metalTexture.wrapT=T.RepeatWrapping;metalTexture.repeat.set(2,3);metalTexture.needsUpdate=true;steel.roughnessMap=pale.roughnessMap=metalTexture;steel.bumpMap=pale.bumpMap=metalTexture;steel.bumpScale=pale.bumpScale=.008;
  const rockColors=[0xa38e69,0xc0aa7e,0x7b8072,0xad9670,0x686f66,0xb49f7d];
  const rocks=rockColors.map(c=>mat(c,0,.96,{map:stone,bumpMap:stone,bumpScale:.075}));
  function mesh(g,m,p=[0,0,0],parent=fixed){const o=new T.Mesh(g,m);o.position.set(...p);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  function box(w,h,d,m,p,parent){const o=mesh(boxGeo,m,p,parent);o.scale.set(w,h,d);return o;}
  function cylinder(r,h,m,p,parent){const o=mesh(cylGeo,m,p,parent);o.scale.set(r,h,r);return o;}
  function ball(r,m,p,parent){const o=mesh(sphereGeo,m,p,parent);o.scale.setScalar(r);return o;}
  function rod(a,b,r,m=steel,parent){const o=mesh(cylGeo,m,[0,0,0],parent);direction.subVectors(new T.Vector3(...b),new T.Vector3(...a));o.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);o.scale.set(r,direction.length(),r);o.quaternion.setFromUnitVectors(up,direction.normalize());return o;}
  function ring(r,t,m,p,parent){const o=mesh(own(new T.TorusGeometry(r,t,8,40)),m,p,parent);return o;}
  function pipe(points,r=.10,m=teal,parent=fixed){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal');curve.surfaceRadius=r;mesh(own(new T.TubeGeometry(curve,Math.max(28,points.length*10),r,12,false)),m,[0,0,0],parent);return curve;}
  function group(name,p=[0,0,0],parent=fixed){const g=new T.Group();g.name=name;g.position.set(...p);parent.add(g);details.add(name);return g;}
  function shot(center,extent,yaw=.48,pitch=.48){shots.push({center:new T.Vector3(...center),extent:new T.Vector3(...extent),yaw,pitch});}
  const glowPixels=new Uint8Array(32*32*4);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4,v=Math.max(0,1-Math.hypot(x-15.5,y-15.5)/16);glowPixels[i]=glowPixels[i+1]=glowPixels[i+2]=255;glowPixels[i+3]=255*v*v;}
  const glow=own(new T.DataTexture(glowPixels,32,32));glow.needsUpdate=true;
  function flow(curve,color=0xd4ac60,count=36,speed=.1,size=.15,offset=.14){
    const values=new Float32Array(count*3),g=own(new T.BufferGeometry());g.setAttribute('position',new T.BufferAttribute(values,3).setUsage(T.DynamicDrawUsage));
    const p=new T.Points(g,own(new T.PointsMaterial({color,size,map:glow,transparent:true,opacity:.95,depthWrite:false})));p.frustumCulled=false;moving.add(p);const f={curve,values,g,count,speed,offset,object:p};flows.push(f);return f;
  }
  function foundation(w=18,d=9,depth=4.8,fold=false){
    const g=group('layered-geological-section');
    for(let i=0;i<6;i++){
      const boundary=(x,n)=>-n*depth/6+(n&&fold?.45*Math.cos(x*.42+n*.24)-(id==='geology'&&x>1.75?.42:0):0),s=new T.Shape();s.moveTo(-w/2,boundary(-w/2,i));
      for(let x=-w/2+.25;x<=w/2+.01;x+=.25)s.lineTo(x,boundary(x,i));
      for(let x=w/2;x>=-w/2-.01;x-=.25)s.lineTo(x,boundary(x,i+1));s.closePath();
      mesh(own(new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:false})),rocks[i],[0,0,1-d],g);
    }
    box(w+.35,.22,d+.35,dark,[0,-depth-.17,1-d/2]);box(w+.25,.025,.035,gold,[0,-depth-.04,1.19]);
  }
  function pad(x,z,w=3,d=2){box(w,.15,d,concrete,[x,.075,z]);}
  function ladder(x,y,z,h,parent=fixed){rod([x-.18,y,z],[x-.18,y+h,z],.025,steel,parent);rod([x+.18,y,z],[x+.18,y+h,z],.025,steel,parent);for(let a=.15;a<h;a+=.25)rod([x-.18,y+a,z],[x+.18,y+a,z],.02,steel,parent);}
  function rail(x,y,z,w,d,parent=fixed){for(const side of [-1,1]){rod([x-w/2,y+.5,z+side*d/2],[x+w/2,y+.5,z+side*d/2],.022,gold,parent);for(let a=-w/2;a<=w/2+.01;a+=w/4)rod([x+a,y,z+side*d/2],[x+a,y+.5,z+side*d/2],.02,gold,parent);}}
  function flange(x,y,z,r=.18,parent=fixed){const f=cylinder(r,.08,steel,[x,y,z],parent);for(let i=0;i<8;i++){const a=i*Math.PI/4;ball(.026,gold,[x+Math.sin(a)*r*.78,y+.05,z+Math.cos(a)*r*.78],parent);}return f;}
  function valve(x,y,z,scale=1,parent=fixed){const g=group('handwheel-valve',[x,y,z],parent);g.scale.setScalar(scale);cylinder(.17,.35,teal,[0,0,0],g);flange(0,-.2,0,.24,g);flange(0,.2,0,.24,g);rod([0,.18,0],[0,.65,0],.035,steel,g);const h=ring(.22,.025,rust,[0,.65,0],g);h.rotation.x=Math.PI/2;rod([-.2,.65,0],[.2,.65,0],.02,rust,g);return g;}
  function tree(x,z){const g=group('christmas-tree',[x,0,z]);cylinder(.22,1.2,teal,[0,.7,0],g);for(let y=.3;y<1.4;y+=.45){flange(0,y,0,.32,g);rod([-.65,y,0],[.65,y,0],.09,teal,g);const hand=ring(.22,.035,rust,[.68,y,0],g);hand.rotation.y=Math.PI/2;}valve(0,1.5,0,.75,g);pad(x,z,1.7,1.6);return g;}
  function cabin(x,z,w=3,color=teal){const g=group('instrument-cabin',[x,0,z]);box(w,1.35,1.9,color,[0,.78,0],g);box(w+.1,.1,2,pale,[0,1.5,0],g);box(.65,.68,.035,dark,[-w*.24,.95,1],g);for(let i=0;i<3;i++)box(.34,.37,.04,glass,[w*.05+i*.4,1,1],g);for(let i=0;i<9;i++)box(.035,1.1,.035,steel,[-w/2+.16+i*(w-.32)/8,.8,1],g);return g;}
  function truck(x,z,type='box',parent=fixed){const g=group(type+'-truck',[x,0,z],parent);box(3.8,.25,1.5,dark,[0,.48,0],g);box(1.1,.9,1.45,gold,[-1.25,1,0],g);box(.5,.38,1.47,glass,[-1.52,1.16,0],g);box(.04,.23,1.3,pale,[-1.83,.87,0],g);for(const a of [-1.22,.65,1.3])for(const b of [-.78,.78]){const tire=cylinder(.34,.18,rubber,[a,.35,b],g);tire.rotation.x=Math.PI/2;const rim=cylinder(.17,.19,steel,[a,.35,b],g);rim.rotation.x=Math.PI/2;for(let i=0;i<6;i++){const angle=i*Math.PI/3;ball(.022,dark,[a+Math.sin(angle)*.11,.35+Math.cos(angle)*.11,b+(b>0?.105:-.105)],g);}}
    for(const side of [-1,1]){box(.4,.15,.035,dark,[-1.15,.55,side*.76],g);box(.15,.04,.035,steel,[-1.05,.93,side*.75],g);box(.17,.13,.04,pale,[-1.72,.86,side*.56],g);rod([-1.5,1.08,side*.76],[-1.6,1.08,side*.95],.018,steel,g);box(.11,.18,.06,dark,[-1.6,1.12,side*.95],g);box(.1,.08,.04,rust,[1.84,.54,side*.63],g);}for(let i=0;i<6;i++)box(.035,.15,.035,dark,[-1.85,.87,-.35+i*.14],g);box(3.85,.08,1.6,steel,[0,.4,0],g);
    if(type==='box')box(2.1,1.1,1.4,teal,[.75,1.14,0],g);if(type==='tank'){const tank=cylinder(.58,2.2,pale,[.65,1.15,0],g);tank.rotation.z=Math.PI/2;for(let a=-.2;a<1.8;a+=.5){const hoop=ring(.6,.025,steel,[a,1.15,0],g);hoop.rotation.y=Math.PI/2;}}
    if(type==='seismic'){box(1.2,1.05,1.3,teal,[1.05,1.1,0],g);for(let i=0;i<9;i++)box(.02,.65,1.32,steel,[.55+i*.12,1.13,0],g);box(.8,.65,.85,gold,[-.25,.8,0],g);for(const a of [-.48,.05])for(const b of [-.5,.5])rod([a,.15,b],[a,1.25,b],.065,steel,g);}
    if(parent===moving)batch(g);return g;}
  function tank(x,z,r=1.1,h=2.2,parent=fixed){const g=group('storage-tank',[x,0,z],parent);pad(x,z,r*2.3,r*2.3);cylinder(r,h,pale,[0,h/2+.12,0],g);cylinder(r*.98,.09,steel,[0,h+.12,0],g);for(let y=.3;y<h;y+=.65){const a=ring(r+.015,.018,steel,[0,y,0],g);a.rotation.x=Math.PI/2;}const hand=ring(r+.05,.02,gold,[0,h+.5,0],g);hand.rotation.x=Math.PI/2;for(let i=0;i<16;i++){const a=i*Math.PI/8;rod([Math.sin(a)*r,h+.12,Math.cos(a)*r],[Math.sin(a)*r,h+.5,Math.cos(a)*r],.018,gold,g);}ladder(r+.08,.2,0,h+.35,g);return g;}
  function pump(x,z,parent=fixed){const g=group('motor-pump',[x,.2,z],parent);box(1.65,.15,.75,concrete,[0,0,0],g);const motor=cylinder(.28,.75,teal,[-.3,.4,0],g);motor.rotation.z=Math.PI/2;for(let i=0;i<8;i++){const a=ring(.285,.012,steel,[-.65+i*.09,.4,0],g);a.rotation.y=Math.PI/2;}ball(.32,steel,[.48,.4,0],g);rod([.48,.4,0],[.48,.95,0],.10,teal,g);return g;}
  function mast(x,z,h=6,parent=fixed){const g=group('lattice-mast',[x,0,z],parent);const p=(a,b,t)=>[a*(.85-.55*t),.2+t*h,b*(.7-.43*t)];for(const a of [-1,1])for(const b of [-1,1]){rod(p(a,b,0),p(a,b,1),.045,steel,g);for(let i=0;i<6;i++){rod(p(a,b,i/6),p(-a,b,(i+1)/6),.025,steel,g);rod(p(a,b,i/6),p(a,-b,i/6),.025,steel,g);}}box(.8,.15,.7,dark,[0,h+.25,0],g);ladder(.2,.2,-.73,h,g);return g;}
  function halfTube(r,h,m,p,parent=fixed){if(!sectionMaterials.has(m)){const clone=own(m.clone());clone.side=T.DoubleSide;sectionMaterials.set(m,clone);}return mesh(own(new T.CylinderGeometry(r,r,h,48,1,true,Math.PI/2,Math.PI)),sectionMaterials.get(m),p,parent);}
  function siteDetails(){
    if(['geology','seismic'].includes(id))return;
    const road=mat(0x65706e,0,.96);box(17,.025,.75,road,[0,.02,-6.9]);for(let x=-8;x<8;x+=1.1)box(.48,.012,.035,pale,[x,.038,-6.9]);
    for(let x=-8;x<=8;x+=1){rod([x,.04,-7.7],[x,.8,-7.7],.018,steel);if(x<8){rod([x,.78,-7.7],[x+1,.78,-7.7],.015,steel);rod([x,.35,-7.7],[x+1,.35,-7.7],.012,steel);}}
    const cabinet=group('electrical-cabinet',[7.8,0,-5.5]);box(.7,.95,.5,pale,[0,.53,0],cabinet);box(.62,.8,.025,dark,[0,.53,.26],cabinet);box(.56,.74,.025,teal,[0,.53,.28],cabinet);rod([.18,.48,.31],[.18,.64,.31],.018,steel,cabinet);for(let i=0;i<4;i++)box(.32,.012,.025,steel,[0,.3+i*.05,.3],cabinet);
    for(const x of [-7.7,7.7]){cylinder(.16,.1,gold,[x,.06,-.2]);mesh(own(new T.ConeGeometry(.07,.35,16)),rust,[x,.27,-.2]);}
  }
  function well(x,z=1.4,mode='cased'){const g=group('cutaway-well',[x,0,z]);halfTube(.57,4.6,rocks[3],[0,-2.3,0],g);if(mode==='cased')halfTube(.43,4.5,concrete,[0,-2.25,0],g);if(mode!=='open'){halfTube(.34,4.45,steel,[0,-2.22,0],g);for(let y=-.1;y>-4.4;y-=.65){const r=ring(.34,.02,dark,[0,y,0],g);r.rotation.x=Math.PI/2;}}return g;}
  function screen(x,y,z,w=1.2,h=.8,parent=fixed){box(w+.1,h+.1,.12,dark,[x,y,z],parent);const canvas=document.createElement('canvas');canvas.width=256;canvas.height=160;const c=canvas.getContext('2d');c.fillStyle='#102d39';c.fillRect(0,0,256,160);c.strokeStyle='#285261';c.lineWidth=1;for(let a=16;a<256;a+=24){c.beginPath();c.moveTo(a,0);c.lineTo(a,160);c.stroke();}for(let a=16;a<160;a+=24){c.beginPath();c.moveTo(0,a);c.lineTo(256,a);c.stroke();}for(let j=0;j<3;j++){c.strokeStyle=['#7bc3bd','#dcb572','#94b3d3'][j];c.lineWidth=2;c.beginPath();for(let i=0;i<240;i++){const yy=38+j*40+Math.sin(i*.07+j)*12+Math.cos(i*.16)*5;i?c.lineTo(i+8,yy):c.moveTo(i+8,yy);}c.stroke();}const tx=own(new T.CanvasTexture(canvas));tx.colorSpace=T.SRGBColorSpace;mesh(own(new T.PlaneGeometry(w,h)),own(new T.MeshBasicMaterial({map:tx})),[x,y,z+.071],parent);}
  function wave(center,radius=3,plane='xz',color=0x2c8998){const material=own(new T.MeshBasicMaterial({color,transparent:true,opacity:.6,depthWrite:false,side:T.DoubleSide}));const o=mesh(own(new T.TorusGeometry(1,.012,5,80)),material,center,moving);if(plane==='xz')o.rotation.x=Math.PI/2;animations.push((t,p)=>{const v=(t*.22+p*.5)%1;o.scale.setScalar(.15+v*radius);material.opacity=.65*(1-v);});return o;}

  function geology(){
    foundation(18,9,4.8,true);
    const terrain=own(new T.PlaneGeometry(18,8,100,56));terrain.rotateX(-Math.PI/2);const a=terrain.attributes.position;
    for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i);const fade=Math.max(0,1-(x/9)**6)*Math.max(0,1-(z/4)**4);a.setY(i,.02+fade*(2.7*Math.exp(-((x+3)**2/8+(z+.4)**2/4))+1.8*Math.exp(-((x-3)**2/6+(z-1)**2/5))+.17*Math.sin(x*3.4+z)*Math.cos(z*2)));}terrain.computeVertexNormals();mesh(terrain,mat(0x9e9b7d,0,.97,{map:stone,bumpMap:stone,bumpScale:.1}),[0,0,-3]);details.add('eroded-outcrop-terrain');
    for(let i=0;i<5;i++)pipe([[-8+i*.6,.15+i*.25,.95],[-3,.6+i*.2,.97],[1,.3+i*.2,.98],[6,.18+i*.22,.98]],.025,rocks[i]);
    truck(5,-3);for(let x=-7;x<7;x+=1.4){rod([x,0,.4],[x,.65,.4],.025,gold);ball(.07,teal,[x,.7,.4]);}pipe([[-7,.1,.4],[0,.1,.4],[7,.1,.4]],.018,gold);
    const tripod=group('survey-tripod',[-5,0,-.3]);for(const a of [0,2.1,4.2])rod([0,1.25,0],[Math.sin(a)*.5,0,Math.cos(a)*.5],.035,steel,tripod);box(.4,.28,.3,teal,[0,1.4,0],tripod);
    const drone=group('survey-drone',[0,4.5,-2],moving);box(.5,.18,.35,dark,[0,0,0],drone);const rotors=[];for(const x of [-.5,.5])for(const z of [-.5,.5]){rod([0,0,0],[x,0,z],.04,steel,drone);const rotor=group('drone-rotor',[x,.08,z],drone);box(.65,.02,.06,rubber,[0,0,0],rotor);box(.06,.02,.65,rubber,[0,0,0],rotor);rotors.push(rotor);}ball(.1,glass,[0,-.17,.1],drone);
    animations.push((t,p)=>{drone.position.set(-6+12*p+Math.sin(t*.3)*.6,4.4+Math.sin(t)*.12,-2.7);rotors.forEach(r=>r.rotation.y=t*22);});
    for(let i=0;i<9;i++){const core=cylinder(.09,.75,rocks[i%6],[3+i*.25,.25,.2]);core.rotation.z=Math.PI/2;}box(3,.12,.65,dark,[4,.08,.2]);wave([0,.12,-1],2.5);shot([0,-1,1],[17,6,3],.15,.3);shot([-3,1.1,-.5],[10,7,8],.5,.5);
  }
  function seismic(){
    foundation();const truckG=truck(-5,-2.6,'seismic',moving);const plate=box(1.2,.14,1.3,steel,[-.2,.15,0],truckG);animations.push((t,p)=>{truckG.position.x=-6+p*4;plate.position.y=.15+Math.sin(t*16)*.035;});
    cabin(6,-4,2.8);for(let i=0;i<20;i++){const x=-8+i*.8;rod([x,0,.15],[x,.25,.15],.025,steel);const led=ball(.065,mat(0x207c85,.2,.35,{emissive:0x147c78,emissiveIntensity:.5}),[x,.3,.15],moving);animations.push(t=>led.scale.setScalar(.065*(.6+Math.max(0,Math.sin(t*2.5-i*.35))*1.6)));}pipe([[-8,.05,.15],[0,.05,.15],[8,.05,.15]],.018,rubber);
    for(let i=0;i<4;i++){const m=own(new T.MeshBasicMaterial({color:i%2?0xc49a50:0x398d99,transparent:true,depthWrite:false,side:T.DoubleSide,opacity:.6}));const wave=mesh(own(new T.TorusGeometry(1,.02,6,96,Math.PI)),m,[-4,-.05,1.23],moving);wave.rotation.z=Math.PI;animations.push((t,p)=>{const f=(t*.17+i/4)%1;wave.position.x=-6+4*p;wave.scale.setScalar(.2+f*4.5);m.opacity=.7*(1-f);});}
    for(const x of [-.8,2.2,5.2]){const c=pipe([[-4,-.05,1.27],[-1,-3.1,1.27],[x,.05,1.27]],.018,gold);flow(c,0xd8ac55,12,.17,.13,.03);}shot([-1,-1.8,1],[16,6,2],.10,.2);shot([1,.2,.15],[17,2,4],.15,.65);
  }
  function mudlogging(){
    foundation();mast(-6,-3.2,5);tree(-6,-1);cabin(5,-4,4);screen(5,1.02,-2.98,1.3,.65);const shaker=group('shale-shaker',[0,0,0],moving);box(3.5,.16,1.7,dark,[0,.3,0]);for(const x of [-1.4,1.4])for(const z of [-.6,.6]){rod([x,.3,z],[x,.9,z],.04,steel);const s=ring(.16,.028,steel,[x,.55,z]);s.rotation.x=Math.PI/2;}
    box(3.2,.12,1.6,teal,[0,.96,0],shaker);for(let x=-1.5;x<1.6;x+=.12)rod([x,1.05,-.75],[x,1.05,.75],.014,steel,shaker);for(let z=-.7;z<.8;z+=.16)rod([-1.55,1.05,z],[1.55,1.05,z],.014,steel,shaker);box(3,.55,1.6,teal,[0,.35,0]);
    const chips=[];for(let i=0;i<36;i++){const o=mesh(own(new T.DodecahedronGeometry(.07+(i%4)*.015)),rocks[i%6],[0,0,0],moving);chips.push(o);}animations.push((t,p)=>{shaker.position.x=Math.sin(t*(16+p*14))*.025;chips.forEach((o,i)=>{const u=(t*(.12+p*.12)+i/36)%1;o.position.set(-1.45+u*3,1.12+Math.abs(Math.sin(t*14+i))*.04,(i%7-3)*.19);o.rotation.x=t+i;});});
    const returnLine=pipe([[-6,1,-1],[-4,.55,-1],[-2,1.2,-.5],[-1.5,1.15,0]],.15,teal);flow(returnLine,0x61a2a7,28,.15,.15);pipe([[1.4,.45,0],[3,.4,0],[3,.4,-2]],.12,teal);
    cylinder(.55,1.8,pale,[3,1.1,-1.5]);flange(3,2.05,-1.5,.6);pipe([[3,2.1,-1.5],[3,2.5,-1.5],[5,2.5,-2.8],[5,1.7,-2.8]],.045,gold);flow(pipe([[3,2.15,-1.4],[3,2.5,-1.4],[5,2.5,-2.7],[5,1.7,-2.7]],.016,gold),0xd7b36d,14,.18,.11);pad(0,0,4,2.2);shot([0,.9,0],[5,3,4],.5,.6);shot([4,1.3,-2.5],[6,4,5],.6,.4);
  }
  function welllog(){
    foundation();truck(-5,-3,'box');well(-1,1.4,'open');const drum=cylinder(.65,1.15,dark,[-4,.9,-1],moving);drum.rotation.z=Math.PI/2;for(const x of [-4.63,-3.37]){const rim=cylinder(.77,.08,steel,[x,.9,-1]);rim.rotation.z=Math.PI/2;}for(let i=0;i<15;i++){const r=ring(.66,.015,gold,[-4.55+i*.075,.9,-1]);r.rotation.y=Math.PI/2;}
    pipe([[-4,.9,-1],[-1,1,-1],[-1,.4,1.4]],.025,dark);mast(-1,-.5,2.2);const probe=group('logging-sonde',[-1,-2,1.55],moving);cylinder(.15,1.4,steel,[0,0,0],probe);for(const y of [-.55,-.15,.15,.55])cylinder(.18,.1,gold,[0,y,0],probe);for(const x of [-1,1]){rod([x*.1,-.5,0],[x*.28,0,0],.025,dark,probe);rod([x*.28,0,0],[x*.1,.5,0],.025,dark,probe);}const wire=rod([-1,.4,1.55],[-1,-2,1.55],.017,dark,moving);
    const pulse=ring(.28,.018,water,[-1,-2,1.55],moving);pulse.rotation.x=Math.PI/2;animations.push((t,p)=>{const y=-.7-p*2.7+Math.sin(t*.65)*.18;probe.position.y=y;wire.position.y=(y+.4)/2;wire.scale.y=.4-y;drum.rotation.x=t*.4;pulse.position.y=y;pulse.scale.setScalar(.7+(t*.65%1)*1.5);});screen(4,1.4,-.2,2.4,2.5);box(2.8,.25,1.3,dark,[4,.1,-.3]);rod([4,.2,-.3],[4,1.3,-.3],.08,steel);shot([-1,-2,1.5],[3.3,5.8,3],.25,.22);shot([-1,-2.3,1.6],[1.8,3,1.8],.45,.2);
  }
  function cementing(){
    foundation();truck(-5,-3,'tank');for(const x of [2.8,5]){cylinder(.65,2.3,pale,[x,1.65,-4]);mesh(own(new T.ConeGeometry(.65,.7,32)),pale,[x,.18,-4]).rotation.z=Math.PI;for(const z of [-4.5,-3.5])rod([x,.15,z],[x,1.2,z],.045,steel);ladder(x+.7,0,-4,3);}pump(3,-1);pump(5,-1);well(-2,1.4,'unset');tree(-2,-.2);
    const fill=halfTube(.50,4.2,mat(0xc5a762,0,.8),[-2,-2.2,1.4],moving);
    for(const y of [-.7,-2.3,-3.7])for(let i=0;i<6;i++){const a=i*Math.PI/3;pipe([[-2+Math.sin(a)*.36,y-.25,1.4+Math.cos(a)*.36],[-2+Math.sin(a)*.52,y,1.4+Math.cos(a)*.52],[-2+Math.sin(a)*.36,y+.25,1.4+Math.cos(a)*.36]],.016,gold);}
    flow(pipe([[3,.9,-1],[0,.9,-1],[-2,.4,1.62],[-2,-4.3,1.62],[-1.57,-4.3,1.62],[-1.57,-.2,1.62]],.045,teal),0xd4b16d,55,.1,.14,.02);
    animations.push((t,p)=>{const h=.15+p*4.05;fill.scale.y=h/4.2;fill.position.y=-4.3+h/2;});shot([-2,-2,1.4],[4,6,3],.25,.23);shot([-2,-2.3,1.4],[1.9,2.3,1.9],.65,.15);
  }
  function completion(){
    foundation();tree(-2,-1);cabin(5,-4,3);well(-2);cylinder(.12,4.8,teal,[-2,-2,1.45]);details.add('production-tubing');
    for(const y of [-1.2,-2.7]){cylinder(.29,.3,rubber,[-2,y,1.45]);flange(-2,y-.2,1.45,.29);flange(-2,y+.2,1.45,.29);}
    for(let y=-3.1;y>-4.4;y-=.08){const s=ring(.21,.015,gold,[-2,y,1.45]);s.rotation.x=Math.PI/2;}for(let i=0;i<7;i++){const a=i*Math.PI*2/7;rod([-2+Math.sin(a)*.2,-3.1,1.45+Math.cos(a)*.2],[-2+Math.sin(a)*.2,-4.4,1.45+Math.cos(a)*.2],.012,steel);}
    for(const side of [-1,1])for(let i=0;i<3;i++){const y=-3.2-i*.4;const curve=pipe([[-2+side*2,y,1.6],[-2+side*.5,y,1.6],[-2,-3.8,1.6],[-2,.4,1.6]],.025,teal);flow(curve,0x58a7a9,15,.12,.12,.025);}
    const surface=pipe([[-2,.4,-1],[1,.4,-1],[3,.4,-2],[5,.4,-2]],.13,teal);flow(surface);valve(1,.4,-1,.7);tank(5,-1,1,1.8);animations.push((t,p)=>flows.forEach(f=>f.speed=.04+p*.13));shot([-2,-2,1.5],[4,6,3],.25,.25);shot([-2,-3.65,1.5],[2.2,2.3,2.3],.55,.18);
  }
  function perforation(){
    foundation();truck(-5,-3);well(-1);mast(-1,-1,2.4);const gun=group('perforating-gun',[-1,-2.9,1.5]);halfTube(.17,2.4,dark,[0,0,0],gun);rod([-1,1.5,1.5],[-1,-1.7,1.5],.018,steel);
    const channels=[],jets=[];for(let j=0;j<3;j++)for(let k=0;k<4;k++){const a=k*Math.PI/2+j*Math.PI/6,dx=Math.sin(a),dz=Math.cos(a),y=-2-j*.7;
      const charge=mesh(own(new T.ConeGeometry(.11,.25,20)),gold,[-1+dx*.15,y,1.5+dz*.15]);charge.quaternion.setFromUnitVectors(up,new T.Vector3(dx,0,dz));
      const path=rod([-1+dx*.24,y,1.5+dz*.24],[-1+dx*1.7,y,1.5+dz*1.7],.065,hot,moving);channels.push(path);
      const tunnel=rod([-1+dx*.48,y,1.5+dz*.48],[-1+dx*1.75,y,1.5+dz*1.75],.11,rocks[4]);if(dz<-.3)tunnel.visible=false;
      const ray=new T.LineCurve3(new T.Vector3(-1+dx*.2,y,1.5+dz*.2),new T.Vector3(-1+dx*1.8,y,1.5+dz*1.8));jets.push(flow(ray,0xf0c66e,6,.37,.19,.13));
    }animations.push((t,p)=>channels.forEach((o,i)=>{o.visible=jets[i].object.visible=i<Math.ceil(p*12);}));shot([-1,-2.9,1.5],[5,5,5],.40,.25);shot([-1,-2.7,1.5],[3.8,3.2,3.8],.9,.15);
  }
  function pumpjack(x,z){
    const g=group('beam-pumping-unit',[x,0,z]);box(2.8,.16,1.6,concrete,[0,.1,0],g);for(const side of [-1,1]){rod([-.55,.2,side*.5],[0,1.9,side*.3],.07,steel,g);rod([.7,.2,side*.5],[0,1.9,side*.3],.07,steel,g);}const beam=group('walking-beam',[0,1.9,0],moving);beam.position.x=x;beam.position.z=z;box(2.6,.18,.38,teal,[0,0,0],beam);const head=mesh(own(new T.CylinderGeometry(.55,.55,.48,32,1,false,0,Math.PI)),gold,[1.1,-.15,0],beam);head.rotation.x=Math.PI/2;head.rotation.z=Math.PI/2;const crank=group('crank',[-.8,.65,0],g);box(.85,.2,.18,teal,[0,0,0],crank);ball(.24,dark,[-.4,0,0],crank);pump(x-.9,z-1.5);const rodO=rod([x+1.25,.1,z],[x+1.25,2,z],.035,steel,moving);animations.push((t,p)=>{const a=Math.sin(t*(.5+p*1.3)+x)*.22;beam.rotation.z=a;crank.rotation.z=t*(.5+p*1.3)+x;const top=1.9+Math.sin(a)*1.25;rodO.position.y=(top-3.9)/2;rodO.scale.y=top+3.9;});return [x+1.25,z];
  }
  function production(){
    foundation(20,10);const [x,z]=pumpjack(-4,1.4);pumpjack(-5,-4);well(x,1.4);rod([x,-.2,1.5],[x,-4.4,1.5],.035,steel);halfTube(.22,1.2,steel,[x,-3.7,1.5]);
    tank(6,-4,1.2,2.4);tank(6,-.5,1.1,2);const separator=cylinder(.65,3.6,pale,[2,1.1,-2.4]);separator.rotation.z=Math.PI/2;for(const a of [.8,3.2])box(.2,.6,1.2,dark,[a,.35,-2.4]);for(let a=.4;a<3.6;a+=.6){const r=ring(.66,.02,steel,[a,1.1,-2.4]);r.rotation.y=Math.PI/2;}valve(2,1.8,-2.4,.6);
    flow(pipe([[x,.35,z],[0,.35,z],[.4,1.1,-2.4],[2,1.1,-2.4],[4,1.1,-2.4],[6,.5,-.5]],.12,teal),0xd5ad5f,50,.12,.16);flow(new T.LineCurve3(new T.Vector3(x,-4.4,1.65),new T.Vector3(x,.3,1.65)),0xd5ad5f,25,.13,.14);shot([-3,.1,1],[7,8,4],.3,.3);shot([4,1,-2],[9,4,7],.65,.5);
  }
  function workover(){
    foundation();mast(-2,-.3,6);truck(-6,-4);tree(-2,.2);well(-2);const rack=group('tubing-rack',[4,0,-3]);for(let j=0;j<3;j++)for(let i=0;i<6;i++)rod([-2,.3+j*.13,-.5+i*.18],[2,.3+j*.13,-.5+i*.18],.055,steel,rack);box(4,.15,1.5,dark,[0,.1,0],rack);
    const tool=group('fishing-assembly',[-2,-2,1.55],moving);cylinder(.11,1.2,steel,[0,.4,0],tool);halfTube(.25,.7,teal,[0,-.55,0],tool);for(let i=0;i<6;i++){const a=i*Math.PI/3;rod([Math.sin(a)*.22,-.3,Math.cos(a)*.22],[Math.sin(a)*.13,-.95,Math.cos(a)*.13],.025,gold,tool);}cylinder(.11,.8,rust,[-2,-4,1.55]);const hook=group('travelling-block',[-2,4,-.3],moving);box(.35,.45,.25,gold,[0,0,0],hook);ring(.14,.035,steel,[0,-.35,0],hook);rod([-2,6,-.3],[-2,.4,-.3],.018,dark);animations.push((t,p)=>{tool.position.y=-.6-p*2.3+Math.sin(t*.6)*.45;hook.position.y=5-p*2.7+Math.sin(t*.6)*.45;});shot([-2,-.3,1],[5,11,4],.28,.25);shot([-2,-3.4,1.55],[2.5,3,2.5],.55,.2);
  }
  function eor(){
    foundation(20,9,4.8,true);tree(-6,-1);tree(6,-1);pump(-6,-4);tank(-3,-4,.9,2.1);tank(6,-4,1,2);well(-6);well(6);for(const x of [-6,6])pipe([[x,.3,-1],[x,.3,1.5],[x,-3.4,1.5]],.1,x<0?teal:gold);
    box(13,.8,.35,mat(0xb69a66,.1,.75,{transparent:true,opacity:.55}),[0,-3.4,1.2],moving);details.add('reservoir-flood-front');const front=box(6,.72,.4,mat(0x2f8a99,.15,.5,{transparent:true,opacity:.68}),[-3,-3.4,1.48],moving);
    for(let i=0;i<9;i++){const x=-5.5+i*1.3;const c=pipe([[x,-3.4,1.7],[x+.5,-3.1,1.9],[x+1,-3.6,1.8]],.027,gold);flow(c,0x86c0bf,9,.14,.12,.02);}for(const sign of [-1,1])for(let j=0;j<4;j++)pipe([[-3+j*1.6,-3.35,1.7],[-3+j*1.6+sign*.5,-2.8,1.7],[-3+j*1.6+sign*.9,-2.6,1.7]],.025,hot);
    flow(pipe([[-6,-.1,1.7],[-6,-3.4,1.7],[-2,-3.4,1.7],[2,-3.4,1.7],[6,-3.4,1.7],[6,.3,1.7]],.025,teal),0x63b9bd,70,.08,.17,.02);animations.push((t,p)=>{front.scale.x=.05+p*2.1;front.position.x=-6+front.scale.x*3;});wave([-6,-3.4,1.8],1.6,'xy');shot([0,-3.1,1.5],[16,3.5,3],.2,.15);shot([-1,-3,1.6],[8,3.3,4],.5,.3);
  }
  function transport(){
    foundation(20,10,1.4);tank(-6,-4,1.4,2.7);tank(-2.5,-4,1.4,2.7);tank(-6,-.2,1.3,2.5);pump(2,-3);pump(4,-3);cabin(7,-4,2.6);for(const x of [-1,2.5,5]){pad(x,0,1.1,1.3);valve(x,.7,0,.9);}const main=pipe([[-6,.3,-.2],[-6,.3,0],[-2,.7,0],[3,.7,0],[7,.7,0],[8,.2,1.7]],.18,teal);flow(main,0xd4b268,64,.12,.17);
    const g=group('pipeline-inspection-cutaway',[0,-.5,2]);const shell=halfTube(.45,9,steel,[2,0,0],g);shell.rotation.z=Math.PI/2;for(const x of [-2.5,6.5]){const r=ring(.46,.04,dark,[x,0,0],g);r.rotation.y=Math.PI/2;}
    const pig=group('inspection-pig',[0,0,0],moving);cylinder(.2,.7,gold,[0,0,0],pig).rotation.z=Math.PI/2;for(const x of [-.4,.4]){const disk=cylinder(.37,.07,teal,[x,0,0],pig);disk.rotation.z=Math.PI/2;}for(let i=0;i<12;i++){const a=i*Math.PI/6;box(.2,.055,.055,dark,[0,Math.sin(a)*.25,Math.cos(a)*.25],pig);}animations.push((t,p)=>{pig.position.set(-2.2+p*8,-.5,2);});for(let i=0;i<4;i++)rod([i*2-1,-1.4,2],[i*2-1,-.9,2],.06,dark);shot([2,.4,0],[13,4,5],.35,.55);shot([2,-.5,2],[9,2.5,2.5],.3,.25);
  }
  function tower(x,z,h,r){
    const g=group('fractionation-tower',[x,0,z]);cylinder(r,h,pale,[0,h/2+.2,0],g);ball(r,pale,[0,h+.15,0],g);for(let y=1.2;y<h;y+=1.5){cylinder(r+.24,.06,dark,[0,y,0],g);const hand=ring(r+.25,.018,gold,[0,y+.45,0],g);hand.rotation.x=Math.PI/2;for(let k=0;k<14;k++){const a=k*Math.PI/7;rod([Math.sin(a)*(r+.25),y,Math.cos(a)*(r+.25)],[Math.sin(a)*(r+.25),y+.45,Math.cos(a)*(r+.25)],.018,gold,g);}}
    ladder(r+.15,.2,.15,h,g);for(let y=.8;y<h;y+=.8){const hoop=ring(.3,.018,steel,[r+.18,y,.15],g);hoop.rotation.x=Math.PI/2;}return g;
  }
  function refining(){
    foundation(21,11,1);tower(-4,-4,7,.75);tower(0,-4,5.2,.65);tower(4,-4,4,.55);const cut=group('tower-tray-cutaway',[-4,0,.6]);halfTube(.85,5.6,pale,[0,2.9,0],cut);for(let i=0;i<10;i++){const y=.5+i*.5;mesh(own(new T.CylinderGeometry(.78,.78,.045,32,1,false,Math.PI/2,Math.PI)),i<4?hot:steel,[0,y,0],cut);for(let j=-2;j<=2;j++)cylinder(.045,.08,gold,[j*.2,y+.06,-.25],cut);}for(let i=0;i<4;i++)wave([-4,1+i*.9,.7],.65,'xz',i<2?0xd29958:0x669eaa);
    box(2.8,2.1,2.2,rust,[6,1.15,-.6]);for(let x=5;x<7.5;x+=.35)rod([x,.3,.54],[x,2,.54],.06,dark);rod([6,.3,-.6],[6,5,-.6],.18,dark);const furnace=mesh(own(new T.PlaneGeometry(2.1,.4)),own(new T.MeshBasicMaterial({color:0xd59a52})),[6,.6,.52]);
    const exchanger=group('shell-tube-exchanger',[1,.75,.5]);const shell=halfTube(.55,3.7,steel,[0,0,0],exchanger);shell.rotation.z=Math.PI/2;for(let j=-2;j<=2;j++)for(let k=-2;k<=2;k++)if(j*j+k*k<6)rod([-1.75,j*.16,k*.16],[1.75,j*.16,k*.16],.035,gold,exchanger);for(const x of [-1.9,1.9]){const f=cylinder(.61,.12,pale,[x,0,0],exchanger);f.rotation.z=Math.PI/2;}
    for(let i=0;i<3;i++){const y=1+i*.55;const c=pipe([[-4,y+1,.6],[-2,y+1,.6],[-2,y,-1],[1,y,-1],[4,y,-1],[7,y,-2]],.065,i?teal:hot);flow(c,i?0x6bafb4:0xe4b46d,28,.11,.14);}for(const x of [-7,-1,5,8]){rod([x,.2,-2],[x,2.5,-2],.07,steel);rod([x,.2,-.8],[x,2.5,-.8],.07,steel);rod([x,2.5,-2],[x,2.5,-.8],.065,steel);}for(let j=0;j<4;j++)pipe([[-7,2.55+j*.15,-1.4],[0,2.55+j*.15,-1.4],[8,2.55+j*.15,-1.4]],.035,steel);
    const vapor=group('process-vapor',[0,0,0],moving);for(let i=0;i<6;i++){const s=new T.Sprite(own(new T.SpriteMaterial({map:glow,color:0x8aabb4,transparent:true,opacity:.25,depthWrite:false})));vapor.add(s);animations.push(t=>{const u=(t*.15+i/6)%1;s.position.set(-4+u*.65,7.2+u*1.7,-4);s.scale.setScalar(.5+u*1.2);s.material.opacity=Math.sin(u*Math.PI)*.25;});}animations.push((t,p)=>{furnace.material.color.setHSL(.09,.5,.35+p*.18+Math.sin(t*4)*.025);flows.forEach(f=>f.speed=.04+p*.12);});shot([-4,3,.6],[4,7,4],.5,.3);shot([1,.85,.5],[6,3,4],.55,.5);
  }

  function batch(root=fixed){
    root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),groups=new Map();root.traverse(o=>{if(!o.isMesh)return;const transform=inverse.clone().multiply(o.matrixWorld),g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(transform);if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(g);});root.clear();
    for(const [m,parts] of groups){const g=own(new T.BufferGeometry()),count=parts.reduce((n,p)=>n+p.attributes.position.count,0);for(const name of ['position','normal','uv']){const size=name==='uv'?2:3,a=new Float32Array(count*size);let offset=0;for(const p of parts){if(p.attributes[name])a.set(p.attributes[name].array,offset*size);offset+=p.attributes.position.count;}g.setAttribute(name,new T.BufferAttribute(a,size));}mesh(g,m,[0,0,0],root);parts.forEach(p=>p.dispose());}
  }
  function fit(shot,view){
    const dir=new T.Vector3(Math.sin(shot.yaw+view.yaw)*Math.cos(shot.pitch+view.pitch),Math.sin(shot.pitch+view.pitch),Math.cos(shot.yaw+view.yaw)*Math.cos(shot.pitch+view.pitch));
    const right=new T.Vector3().crossVectors(up,dir).normalize(),vertical=new T.Vector3().crossVectors(dir,right),tanY=Math.tan(T.MathUtils.degToRad(18))*.85,tanX=tanY*camera.aspect;let distance=1;
    for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){tmp.set(x*shot.extent.x,y*shot.extent.y,z*shot.extent.z);distance=Math.max(distance,tmp.dot(dir)+Math.max(Math.abs(tmp.dot(right))/tanX,Math.abs(tmp.dot(vertical))/tanY));}
    desired.copy(shot.center).addScaledVector(dir,distance/(width>=760?1.18:1));return shot.center;
  }
  function render(t,view,snap=false){
    if(dead)return;const s=shots[view.shot],cameraView={yaw:view.yaw+(view.manual?0:Math.sin(t*.14)*.045),pitch:view.pitch+(view.manual?0:Math.sin(t*.11)*.012)},center=fit(s,cameraView);if(snap||activeShot<0){camera.position.copy(desired);target.copy(center);}else{camera.position.lerp(desired,.09);target.lerp(center,.09);}activeShot=view.shot;camera.lookAt(target);camera.updateMatrixWorld();
    animations.forEach(f=>f(t,view.progress));direction.subVectors(camera.position,target).normalize();
    for(const f of flows){const offset=Math.max(f.offset,(f.curve.surfaceRadius||0)+.045);for(let i=0;i<f.count;i++){position.copy(f.curve.getPointAt((i/f.count+t*f.speed)%1)).addScaledVector(direction,offset);f.values.set([position.x,position.y,position.z],i*3);}f.g.attributes.position.needsUpdate=true;}renderer.render(scene,camera);frames++;
  }
  function theme(darkTheme){const c=darkTheme?0x0c2230:0xe9f0f3;scene.background=new T.Color(c);scene.fog=new T.Fog(c,80,200);renderer.toneMappingExposure=darkTheme?1.2:1.05;}
  function resize(w,h){width=w;renderer.setPixelRatio(Math.min(devicePixelRatio||1,w<640?1.35:1.75));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  function dispose(){if(dead)return;dead=true;owned.forEach(r=>r.dispose());owned.clear();scene.traverse(o=>{if(o.shadow)o.shadow.dispose();});scene.clear();if(renderer){renderer.renderLists.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}}
  try{
    renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    const builders={geology,seismic,mudlogging,welllog,cementing,completion,perforation,production,workover,eor,transport,refining};if(!builders[id])throw new Error('Unknown field '+id);builders[id]();siteDetails();
    const envPixels=new Uint8Array(128*64*4);for(let y=0;y<64;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,v=y<32?160:70;const l=Math.exp(-(((x-32)/9)**2+((y-18)/11)**2))*75;envPixels[i]=v+l;envPixels[i+1]=v+l+7;envPixels[i+2]=v+l+12;envPixels[i+3]=255;}
    const env=own(new T.DataTexture(envPixels,128,64));env.mapping=T.EquirectangularReflectionMapping;env.colorSpace=T.SRGBColorSpace;env.needsUpdate=true;scene.environment=env;scene.environmentIntensity=.75;
    const bounds=new T.Box3().setFromObject(world),extent=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());shots.unshift({center,extent,yaw:.48,pitch:.48});
    batch();const floor=mesh(own(new T.PlaneGeometry(200,200)),own(new T.ShadowMaterial({color:0x476473,opacity:.17})),[0,bounds.min.y-.04,0],scene);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
    scene.add(new T.HemisphereLight(0xd2e7f5,0x897351,1.8));const key=new T.DirectionalLight(0xffdfb0,3.4);key.position.set(-12,22,14);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=key.shadow.camera.bottom=-20;key.shadow.camera.right=key.shadow.camera.top=20;key.shadow.camera.far=75;key.shadow.bias=-.0003;key.shadow.normalBias=.035;scene.add(key);const rim=new T.DirectionalLight(0x96c7e4,2.4);rim.position.set(12,10,-14);scene.add(rim);const fill=new T.DirectionalLight(0xd7e8eb,.7);fill.position.set(0,2,14);scene.add(fill);theme(false);
    return {canvas:renderer.domElement,render,resize,theme,dispose,diagnostics:()=>({id,frames,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,resources:owned.size,details:[...details],animations:animations.length,flows:flows.length,camera:camera.position.toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}})};
  }catch(e){dispose();throw e;}
}
