/* 十二个环节的本地三维展厅；共用交互，设备与过程分别建模。 */
(function (global) {
  'use strict';
  var script = document.currentScript;
  var sceneURL = new URL('./stage-cinema-scene.js?v=20261030-field-final', script.src).href, modulePromise;
  var catalog = {
    geology: { title: '走进地质勘察现场', en: 'GEOLOGICAL SURVEY', intro: '从地表露头，认识地下构造与采样位置', shots: [['地貌全景','山体、露头与调查测线'],['地层剖面','追踪褶皱层位与断层错动'],['野外采样','无人机巡测与地面样品记录']], legend: ['自然地层','调查测线','采样位置'], question: '先认识岩层的空间连续性，再思考遥感分类与异常识别的数据来自哪里。', action: '调查位置', values: ['露头与构造','测线巡查','采样对照'] },
    seismic: { title: '看见地震波的旅程', en: 'SEISMIC ACQUISITION', intro: '激发、地下反射与地表接收，在同一空间中相遇', shots: [['采集全景','震源车、检波器阵列与记录站'],['反射路径','入射波到达界面后向地表传播'],['地表接收','沿测线观察检波器的响应']], legend: ['激发位置','反射路径','检波阵列'], question: '观察信号从哪里发出、在哪里返回，理解初至拾取与噪声抑制面对的数据。', action: '震源位置', values: ['可控震源','界面反射','阵列接收'] },
    mudlogging: { title: '追踪返出的岩屑与气体', en: 'MUD LOGGING', intro: '从井口返排，到振动筛与录井房', shots: [['录井全景','井口、返排管线与地面取样'],['岩屑分离','振动筛分离流体与固体样品'],['气体检测','脱气装置、取样支路与分析终端']], legend: ['返排流体','岩屑样品','气体取样'], question: '沿取样路径辨认岩屑和气体，理解样品识别、气测异常与深度滞后之间的联系。', action: '筛分强度', values: ['循环返排','筛分取样','气体分析'] },
    welllog: { title: '沿井筒读取地层', en: 'WIRELINE LOGGING', intro: '测井电缆牵引探头，逐层记录响应', shots: [['测井全景','电缆绞车、井口与地层剖面'],['探头扫描','观察测井探头沿井壁上下移动'],['仪器结构','电极、探测单元与扶正结构']], legend: ['测井电缆','仪器响应','地层界面'], question: '把曲线中的采样位置对应到井下地层，理解分层、岩性判别与缺失曲线重建。', action: '探头位置', values: ['电缆牵引','沿深度采集','响应解释'] },
    cementing: { title: '观察水泥如何封隔地层', en: 'WELL CEMENTING', intro: '浆体沿套管下行，从底部返入环空', shots: [['固井全景','水泥罐、混浆装置与泵注管汇'],['环空返排','区分套管内部下行与环空上返'],['套管封隔','套管、扶正器与水泥环的关系']], legend: ['套管钢体','水泥浆体','环空封隔'], question: '观察水泥环的形成位置，理解配方优化、漏失风险与胶结质量判别所服务的目标。', action: '环空充填', values: ['混浆与泵注','下行后返排','层间封隔'] },
    completion: { title: '把井筒连接到储层', en: 'WELL COMPLETION', intro: '从采油树，到油管、封隔器与筛管', shots: [['完井全景','井口控制与地下生产通道'],['分层隔离','封隔器分离不同井段'],['筛管细节','筛缝、管柱与流体汇入']], legend: ['生产油管','封隔器','储层流入'], question: '辨认生产通道和隔离边界，理解完井方案选择与管柱安全校核为什么需要地层条件。', action: '流入强度', values: ['井口控制','分层隔离','筛管流入'] },
    perforation: { title: '打开储层流入通道', en: 'WELL PERFORATING', intro: '射孔枪、套管与岩石孔道的空间关系', shots: [['射孔全景','电缆下入与目标层定位'],['孔道形成','径向通道穿过套管与水泥环'],['枪体细节','分簇布置、相位与孔道方向']], legend: ['套管与水泥','射孔枪体','径向孔道'], question: '观察孔道的方向与分布，理解孔密、相位和穿深选择如何影响储层连通。', action: '孔道显示', values: ['目标层定位','分簇布孔','储层连通'] },
    production: { title: '从地下流入地面集输', en: 'OIL AND GAS PRODUCTION', intro: '抽油机、井下杆柱与地面分离流程', shots: [['生产全景','多井、管线与分离储存设备'],['举升过程','游梁往复带动井下杆柱'],['分离与计量','井口来液进入分离容器与储罐']], legend: ['机械举升','产出流体','分离与储存'], question: '联系机械运动与产出路径，理解示功图诊断、产量预测及注采调配的业务含义。', action: '举升节奏', values: ['机械举升','井口汇流','地面分离'] },
    workover: { title: '深入修井作业现场', en: 'WELL INTERVENTION', intro: '起下工具、井口控制与井下故障处理', shots: [['修井全景','修井架、管排与井控设备'],['工具下入','吊钩牵引管柱与打捞工具'],['井下处理','观察打捞筒与待处理井段']], legend: ['提升系统','井控装置','井下工具'], question: '先确定工具与故障位置的关系，再理解方案检索、工具匹配和作业风险预警。', action: '下入位置', values: ['提升与下入','井口控制','井下处理'] },
    eor: { title: '看见注入与驱替', en: 'RESERVOIR STIMULATION', intro: '注入井、储层通道与生产井联动', shots: [['注采全景','注入站、井网与储层剖面'],['驱替前缘','注入流体沿储层向生产井推进'],['储层通道','裂缝分支与流体扩展路径']], legend: ['注入流体','目标储层','产出路径'], question: '观察注入、通道与产出之间的联系，理解压裂设计和化学驱方案比较的输入条件。', action: '驱替位置', values: ['地面注入','储层驱替','生产响应'] },
    transport: { title: '沿管线走进储运站场', en: 'TRANSPORT AND STORAGE', intro: '储罐、泵组、阀门与管内巡检', shots: [['站场全景','罐区、输油泵与输送干线'],['管线输送','沿介质流向观察阀组与计量'],['管内检测','检测器在剖开的管段内前行']], legend: ['储罐容积','输送流向','管内检测'], question: '将异常信号放回实际设备位置，理解泄漏检测、腐蚀评估与管网调度的作用。', action: '检测器位置', values: ['储罐缓冲','泵送与计量','管内巡检'] },
    refining: { title: '走进炼化装置', en: 'REFINING AND PROCESSING', intro: '加热、塔内分离、换热与产品外送', shots: [['装置全景','分馏塔、加热炉、换热器与管廊'],['塔内分离','沿塔盘观察上下行过程的示意'],['换热设备','壳体、管束与连接管线']], legend: ['装置钢体','热端流程','产品支路'], question: '从设备连接认识工艺约束，理解软测量、质量预测和运行优化为什么需要多变量信息。', action: '过程强度', values: ['进料加热','塔内分离','换热与外送'] }
  };
  function html(id) {
    var c = catalog[id]; if (!c) return '';
    return '<section class="drilling-cinema stage-cinema" data-stage-cinema="'+id+'" data-state="loading" aria-label="'+c.title+'交互三维场景">'+
      '<header class="dc-heading"><div><span class="dc-eyebrow">'+c.en+' / FIELD NOTES</span><h3>'+c.title+'</h3><p>'+c.intro+'</p></div><span class="dc-source">概念示意 · 非实测数据</span></header>'+
      '<div class="dc-viewport" tabindex="0" aria-label="三维场景，拖动或方向键旋转，使用下方按钮切换镜头"><div class="sc-fallback"><b>'+c.title+'</b><ol>'+c.values.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ol><p>'+c.intro+'</p></div><div class="dc-vignette" aria-hidden="true"></div><div class="dc-status" role="status">正在准备本地三维场景…</div></div>'+
      '<div class="sc-caption"><div class="sc-shot"><span class="dc-eyebrow">01 / 03</span><b>'+c.shots[0][0]+'</b><small>'+c.shots[0][1]+'</small></div><div class="sc-legend">'+c.legend.map(function(x,i){return '<span><i class="sc-color-'+i+'"></i>'+x+'</span>';}).join('')+'</div></div>'+
      '<div class="dc-toolbar"><div class="dc-cameras" role="group" aria-label="选择三维镜头">'+c.shots.map(function(x,i){return '<button type="button" data-sc-shot="'+i+'" aria-pressed="'+(!i)+'" disabled>0'+(i+1)+' '+x[0]+'</button>';}).join('')+'</div><div class="dc-playback"><button type="button" data-sc-action="tour" aria-pressed="false" disabled>自动巡航</button><button type="button" data-sc-action="pause" aria-pressed="false" disabled>暂停</button></div></div>'+
      '<div class="dc-timeline"><label>'+c.action+' <input type="range" min="0" max="100" value="60" data-sc-progress aria-label="'+c.action+'" disabled><output>60%</output></label><span>拖动旋转 · 方向键微调 · Home 复位</span></div><p class="sc-question">'+c.question+'</p></section>';
  }
  function mount(element) {
    var id=element.dataset.stageCinema,c=catalog[id]; if(!c) return {destroy:function(){}};
    var viewport=element.querySelector('.dc-viewport'),status=element.querySelector('.dc-status'),slider=element.querySelector('[data-sc-progress]'),pause=element.querySelector('[data-sc-action="pause"]'),tour=element.querySelector('[data-sc-action="tour"]');
    var engine,dead=false,raf=0,last=0,time=0,tourTime=0,paused=false,touring=false,visible=false,pointer,cleanups=[],media=global.matchMedia('(prefers-reduced-motion: reduce)');
    var view={shot:0,yaw:0,pitch:0,progress:.6,motion:true,manual:false};
    function listen(target,type,fn){target.addEventListener(type,fn);cleanups.push(function(){target.removeEventListener(type,fn);});}
    function running(){return engine&&!dead&&!paused&&!media.matches&&!document.hidden&&visible;}
    function paint(snap){if(engine&&!dead&&!document.hidden&&visible)engine.render(time,view,snap!==false);}
    function schedule(){if(running()&&!raf)raf=requestAnimationFrame(frame);}
    function frame(now){raf=0;if(!running())return;if(last&&now-last<32){schedule();return;}var dt=last?Math.min((now-last)/1000,.08):0;last=now;time+=dt;tourTime+=dt;if(touring&&tourTime>=10){shot((view.shot+1)%3,false);tourTime=0;}paint(false);schedule();}
    function sync(){view.motion=!paused&&!media.matches;pause.textContent=media.matches?'静态视角':paused?'播放':'暂停';pause.setAttribute('aria-pressed',String(paused||media.matches));tour.setAttribute('aria-pressed',String(touring));element.querySelectorAll('button,input').forEach(function(b){b.disabled=!engine;});pause.disabled=tour.disabled=!engine||media.matches;if(!running()&&raf){cancelAnimationFrame(raf);raf=0;}last=0;paint(false);schedule();}
    function shot(n,manual){view.shot=n;view.yaw=view.pitch=0;view.manual=false;if(manual){touring=false;tourTime=0;}element.querySelectorAll('[data-sc-shot]').forEach(function(b){b.setAttribute('aria-pressed',String(Number(b.dataset.scShot)===n));});var caption=element.querySelector('.sc-shot');caption.querySelector('span').textContent='0'+(n+1)+' / 03';caption.querySelector('b').textContent=c.shots[n][0];caption.querySelector('small').textContent=c.shots[n][1];element.dataset.shot=String(n);paint(!running());sync();}
    function resize(){if(engine){engine.resize(viewport.clientWidth,viewport.clientHeight);paint();}}
    function theme(){if(engine){engine.theme(document.documentElement.dataset.theme==='dark');paint();}}
    function fail(message){if(dead)return;if(raf)cancelAnimationFrame(raf);raf=0;if(engine){engine.dispose();engine=null;}element.dataset.state='fallback';status.textContent=message;sync();}
    listen(element,'click',function(e){var b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.scShot!=null)shot(Number(b.dataset.scShot),true);if(b.dataset.scAction==='pause'){paused=!paused;sync();}if(b.dataset.scAction==='tour'){touring=!touring;paused=false;tourTime=0;sync();}});
    listen(slider,'input',function(){view.progress=Number(slider.value)/100;element.querySelector('output').textContent=slider.value+'%';paint();});
    listen(viewport,'pointerdown',function(e){if(!engine||e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};viewport.setPointerCapture(e.pointerId);touring=false;sync();});
    listen(viewport,'pointermove',function(e){if(!pointer||pointer.id!==e.pointerId)return;view.manual=true;view.yaw=Math.max(-1.2,Math.min(1.2,view.yaw+(e.clientX-pointer.x)*.006));view.pitch=Math.max(-.3,Math.min(.35,view.pitch+(e.clientY-pointer.y)*.004));pointer.x=e.clientX;pointer.y=e.clientY;paint();});
    function end(e){if(pointer&&pointer.id===e.pointerId){if(viewport.hasPointerCapture(pointer.id))viewport.releasePointerCapture(pointer.id);pointer=null;}}
    listen(viewport,'pointerup',end);listen(viewport,'pointercancel',end);listen(viewport,'lostpointercapture',function(){pointer=null;});
    listen(viewport,'keydown',function(e){if(!engine||['Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(e.key)<0)return;e.preventDefault();touring=false;view.manual=e.key!=='Home';if(e.key==='Home')view.yaw=view.pitch=0;else if(e.key==='ArrowLeft'||e.key==='ArrowRight')view.yaw=Math.max(-1.2,Math.min(1.2,view.yaw+(e.key==='ArrowLeft'?-.08:.08)));else view.pitch=Math.max(-.3,Math.min(.35,view.pitch+(e.key==='ArrowUp'?-.06:.06)));paint();sync();});
    listen(global,'tiangong-theme-change',theme);listen(document,'visibilitychange',sync);listen(media,'change',sync);
    if(global.ResizeObserver){var ro=new ResizeObserver(resize);ro.observe(viewport);cleanups.push(function(){ro.disconnect();});}else listen(global,'resize',resize);
    if(global.IntersectionObserver){var io=new IntersectionObserver(function(es){visible=es[0].isIntersecting;sync();});io.observe(viewport);cleanups.push(function(){io.disconnect();});}else visible=true;
    if(!modulePromise)modulePromise=import(sceneURL);
    modulePromise.then(function(module){if(dead)return;engine=module.buildStageScene(id);var canvas=engine.canvas;canvas.className='dc-canvas';canvas.setAttribute('aria-hidden','true');listen(canvas,'webglcontextlost',function(e){e.preventDefault();fail('三维图形已中断，当前显示过程说明。');});viewport.prepend(canvas);element.dataset.state='ready';status.textContent='3D 就绪 · 拖动探索';theme();resize();sync();}).catch(function(e){console.error('[stage-cinema:'+id+']',e);fail('当前设备未能启动三维图形，可阅读下方过程说明。');});
    var api={diagnostics:function(){return {id:id,ready:!!engine,running:!!running(),time:time,shot:view.shot,progress:view.progress,touring:touring,scene:engine&&engine.diagnostics()};},destroy:function(){if(dead)return;dead=true;if(raf)cancelAnimationFrame(raf);cleanups.forEach(function(f){f();});if(pointer&&viewport.hasPointerCapture(pointer.id))viewport.releasePointerCapture(pointer.id);if(engine){engine.dispose();engine=null;}delete element.__stageCinema;}};
    element.__stageCinema=api;return api;
  }
  global.StageCinema={html:html,mount:mount,catalog:catalog};
})(window);
