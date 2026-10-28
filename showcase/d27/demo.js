(function(){
'use strict';

const mean=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rng=seed=>()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(x,d=2)=>Number.isFinite(x)?x.toFixed(d):'—',pct=x=>fmt(100*x,1)+'%';
const palette=['#2875c7','#d47a3a','#168273','#ad5975'];
function text(x,y,s,size=13,attr=''){return '<text x="'+x+'" y="'+y+'" font-size="'+size+'" '+attr+'>'+esc(s)+'</text>';}
function svg(title,b,h=350){return '<svg class="chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 '+h+'" role="img" aria-label="'+esc(title)+'"><title>'+esc(title)+'</title><g fill="var(--ink)" font-family="system-ui,Microsoft YaHei,sans-serif">'+text(24,30,title,18,'font-weight="600"')+b+'</g></svg>';}
function box(x,y,w,h,color='var(--paper-2,#eef3f8)'){return '<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+h+'" rx="8" fill="'+color+'"/>';}
function plot(title,series,xlabel,ylabel){
 const pts=series.flatMap(s=>s.points).filter(p=>p[1]!==null),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
 const lo=Math.min(0,...ys),hi=Math.max(lo+1,...ys)*1.1,x0=Math.min(...xs),x1=Math.max(x0+1,...xs),X=x=>70+600*(x-x0)/(x1-x0),Y=y=>255-180*(y-lo)/(hi-lo);
 let b=text(24,58,ylabel,12);for(let i=0;i<5;i++){const x=x0+(x1-x0)*i/4,y=lo+(hi-lo)*i/4;b+='<path d="M70 '+Y(y)+'H670" stroke="var(--line,#dfe6f0)"/>'+text(61,Y(y)+4,fmt(y,1),11,'text-anchor="end"')+text(X(x),277,fmt(x,x1-x0<5?2:0),11,'text-anchor="middle"');}
 series.forEach((s,i)=>{let open=false;const d=s.points.map(p=>{if(p[1]===null){open=false;return '';}const q=(open?'L':'M')+fmt(X(p[0]))+' '+fmt(Y(p[1]));open=true;return q;}).join(' ');b+='<path d="'+d+'" fill="none" stroke="'+palette[i%4]+'" stroke-width="2.5"'+(s.dash?' stroke-dasharray="5 4"':'')+'/>'+'<path d="M'+(70+i*200)+' 321h20" stroke="'+palette[i%4]+'" stroke-width="3"/>'+text(96+i*200,325,s.name,12);});return svg(title,b+text(670,298,xlabel,12,'text-anchor="end"'));
}
function bars(title,rows,unit=''){let b='',max=Math.max(1e-8,...rows.map(t=>Math.abs(t[1])))*1.15,h=Math.max(250,rows.length*46+115);rows.forEach((t,i)=>{const y=65+i*46;b+=text(24,y+17,t[0],12)+box(215,y,370,24)+box(215,y,370*Math.abs(t[1])/max,24,palette[i%4])+text(605,y+17,fmt(t[1]),13);});return svg(title,b+text(585,h-19,unit,12,'text-anchor="end"'),h);}
function flow(title,labels){let b='';labels.forEach((t,i)=>{let x=25+i*230;b+=box(x,85,210,110)+text(x+105,112,'0'+(i+1),13,'text-anchor="middle"')+text(x+105,146,t[0],16,'text-anchor="middle"')+text(x+105,174,t[1],12,'text-anchor="middle"');if(i<2)b+='<path d="M'+(x+212)+' 140h15l-5-5m5 5-5 5" fill="none" stroke="var(--jade,#168273)" stroke-width="2"/>';});return svg(title,b,230);}
function fit(rows,features,target){const n=features(rows[0]).length,a=Array.from({length:n},()=>Array(n+1).fill(0));for(const r of rows){const x=features(r),y=target(r);for(let i=0;i<n;i++){for(let j=0;j<n;j++)a[i][j]+=x[i]*x[j];a[i][n]+=x[i]*y;}}for(let i=1;i<n;i++)a[i][i]+=.001;for(let i=0;i<n;i++){let k=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[k][i]))k=j;[a[k],a[i]]=[a[i],a[k]];const v=a[i][i];for(let j=i;j<=n;j++)a[i][j]/=v;for(let k2=0;k2<n;k2++)if(k2!==i){const v2=a[k2][i];for(let j=i;j<=n;j++)a[k2][j]-=v2*a[i][j];}}return a.map(r=>r[n]);}
const predict=(c,x)=>c.reduce((s,v,i)=>s+v*x[i],0),mae=(truth,pred)=>mean(truth.map((v,i)=>Math.abs(v-pred[i])));

const defaults={delay:8,period:4,noise:.2,jump:3},limits={delay:[0,20],period:[1,10],noise:[0,1],jump:[0,6]};
function truth(t,p){return 12+.035*t+.5*Math.sin(t/14)+(t>=60?p.jump:0);}
function estimate(received,t){if(!received.length)return null;const rows=received.slice(-5),last=rows[rows.length-1];let slope=0,estimate=last.value;if(rows.length>1){const mt=mean(rows.map(x=>x.sample)),mv=mean(rows.map(x=>x.value)),den=rows.reduce((s,x)=>s+(x.sample-mt)**2,0);slope=clamp(rows.reduce((s,x)=>s+(x.sample-mt)*(x.value-mv),0)/den,-.15,.15);estimate=mv+slope*(t-mt);}return {hold:last.value,estimate,age:t-last.sample,slope,latest:last.sample,used:rows.map(x=>x.sample)};}
function calculate(p){const random=rng(2701),packets=[];for(let t=0;t<=120;t+=p.period)packets.push({sample:t,arrival:t+p.delay,value:truth(t,p)+(random()-.5)*2*p.noise});const rows=Array.from({length:121},(_,t)=>({t,truth:truth(t,p),prediction:estimate(packets.filter(x=>x.arrival<=t),t)})),valid=rows.filter(x=>x.prediction),event=valid.filter(x=>x.t>=60&&x.t<=90),error=(a,key)=>mean(a.map(x=>Math.abs(x.truth-x.prediction[key])));return {packets,rows,valid,holdMAE:error(valid,'hold'),predMAE:error(valid,'estimate'),eventHold:error(event,'hold'),eventPred:error(event,'estimate'),age:mean(valid.map(x=>x.prediction.age))};}
function mechanism(r,p){const t=60,row=r.rows[t],q=row.prediction;return flow('在第60秒，地面知道什么？',[['井下采样','每 '+p.period+' 秒一包'],['链路等待','延迟 '+p.delay+' 秒'],['地面最新采样',q?q.latest+' 秒；数据年龄 '+q.age+' 秒':'尚未收到包']]);}
function visualize(r,p){return {charts:[plot('已到达包才能参与当前估计',[{name:'参考（仅评分）',points:r.rows.map(x=>[x.t,x.truth])},{name:'保持法',points:r.rows.map(x=>[x.t,x.prediction?x.prediction.hold:null])},{name:'因果外推',points:r.rows.map(x=>[x.t,x.prediction?x.prediction.estimate:null])}],'时间 s','压力 MPa'),plot('每一时刻的数据陈旧程度',[{name:'最新包数据年龄',points:r.rows.map(x=>[x.t,x.prediction?x.prediction.age:null])}],'地面时间 s','数据年龄 s')],metrics:[['保持法 MAE',fmt(r.holdMAE,3)+' MPa'],['外推 MAE',fmt(r.predMAE,3)+' MPa'],['平均数据年龄',fmt(r.age,1)+' s'],['有效估计覆盖',pct(r.valid.length/121)]],note:'当前外推全段MAE'+(r.predMAE<r.holdMAE?'低于':'不低于')+'保持法。60秒突变后，历史趋势可能无法代表新状态；斜率限制±0.15 MPa/s只是教学约束。首包到达前不计算估计误差。',detail:bars('突变段60—90秒：两方法使用同一评分时刻',[['保持法 MAE',r.eventHold],['外推 MAE',r.eventPred]],'压力绝对误差 MPa')};}
function illustrate(r,p,n){if(n===1)return plot('参考序列只用于评分',[{name:'教学参考',points:r.rows.map(x=>[x.t,x.truth])}],'时间 s','MPa');if(n===2)return mechanism(r,p);if(n===3)return flow('只让已到达数据参与计算',[['接收筛选','arrival ≤ 当前时刻'],['最近5包回归','不足2包用保持法'],['有限斜率外推','不读取未来测量']]);const v=visualize(r,p);return n===4?v.charts[0]:v.detail;}

const telemetryFeatureNames=['常数项','数据年龄 / 20 s','局部斜率 × 年龄','局部外推校正'];
function telemetryInput(packets,t){
 const arrived=packets.filter(a=>a.arrival<=t),used=arrived.slice(-5),q=estimate(used,t);
 if(!q)return null;
 return {x:[1,q.age/20,q.slope*q.age,q.estimate-q.hold],hold:q.hold,local:q.estimate,age:q.age,latest:q.latest,slope:q.slope,used};
}
function telemetryPredict(model,packets,t){
 const a=telemetryInput(packets,t);if(!a)return null;
 // A single packet has no observed trend; retaining it is an explicit fallback.
 return {...a,value:a.used.length<2?a.hold:a.hold+predict(model,a.x)};
}
function telemetrySequence(id,seed,shift=0){
 const random=rng(seed),base=10+4*random(),slope=.01+.055*random(),phase=6*random(),amplitude=.15+.65*random(),delay=2+Math.floor(19*random()),period=2+Math.floor(5*random()),noise=.08+.4*random(),jump=.2+.8*random(),event=45+Math.floor(35*random());
 const reference=t=>base+slope*t+amplitude*Math.sin(t/(12+period)+phase)+(t>=event?jump:0)+(t>=60?shift:0),packets=[];
 for(let t=0;t<=120;t+=period)packets.push({sample:t,arrival:t+delay,value:reference(t)+(random()-.5)*2*noise});
 const rows=[];for(let t=0;t<=120;t+=2){const a=telemetryInput(packets,t);if(a)rows.push({group:id,t,features:a.x,target:reference(t)-a.hold,truth:reference(t),hold:a.hold,local:a.local,packets});}
 return {id,delay,period,packets,rows};
}
function telemetryTrain(rows){return fit(rows,r=>r.features,r=>r.target);}
function telemetryQuery(p,shift=0){
 const random=rng(2701),reference=t=>truth(t,p)+(t>=60?shift:0),packets=[];
 for(let t=0;t<=120;t+=p.period)packets.push({sample:t,arrival:t+p.delay,value:reference(t)+(random()-.5)*2*p.noise});
 return {packets,reference:Array.from({length:121},(_,t)=>reference(t))};
}
function learn(p,mode='normal'){
 const count=mode==='sparse'?3:12,shift=mode==='shift'?4:0;
 const train=Array.from({length:count},(_,i)=>telemetrySequence('训练井段-'+(i+1),27100+i)),test=Array.from({length:4},(_,i)=>telemetrySequence('测试井段-'+(i+1),28100+i,shift));
 const trainRows=train.flatMap(g=>g.rows),testRows=test.flatMap(g=>g.rows),model=telemetryTrain(trainRows);
 const validation=testRows.map(r=>({...r,value:telemetryPredict(model,r.packets,r.t).value})),score=key=>mean(validation.map(r=>Math.abs(r.truth-r[key])));
 const query=telemetryQuery(p,shift),rows=query.reference.map((value,t)=>({t,truth:value,prediction:telemetryPredict(model,query.packets,t)})),valid=rows.filter(r=>r.prediction),queryScore=key=>mean(valid.map(r=>Math.abs(r.truth-r.prediction[key])));
 return {method:'监督岭回归 · 因果特征',mode,shift,train,test,model,validation,query,rows,
  split:{trainGroups:train.length,testGroups:test.length,trainSamples:trainRows.length,testSamples:validation.length},
  metrics:[['训练 / 测试井段',train.length+' / '+test.length],['独立测试 MAE',fmt(score('value'),3)+' MPa'],['保持法 MAE',fmt(score('hold'),3)+' MPa'],['局部外推 MAE',fmt(score('local'),3)+' MPa']],
  error:{model:score('value'),baseline:score('hold'),unit:'MPa'},localMAE:score('local'),queryError:{model:queryScore('value'),hold:queryScore('hold'),local:queryScore('local')},recommendation:null,
  note:'历史数据和参考压力均为教学合成；按完整井段隔离。'+(shift?'未见工况在第60秒额外增加4 MPa突变，训练模型保持不变。':'参考压力只用于监督或离线评分。')+'当前估计只读取已到达包，误差对照不用于在线可靠度判断。'};
}
function ltText(x,y,s,size=15,attrs=''){return text(x,y,s,size,attrs);}
function ltSvg(title,b,height=510){return '<svg class="chart learning-telemetry" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 '+height+'" role="img" aria-label="'+esc(title)+'"><title>'+esc(title)+'</title><g fill="var(--ink)" font-family="system-ui,Microsoft YaHei,sans-serif">'+ltText(24,33,title,23,'font-weight="700"')+b+'</g></svg>';}
function ltPanel(x,y,w,h){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="13" fill="var(--paper-2)" stroke="var(--line)"/>';}
function telemetryTimeline(p,t=60){
 const packets=[];for(let sample=0;sample<=t;sample+=p.period)packets.push({sample,arrival:sample+p.delay,arrived:sample+p.delay<=t});
 const arrived=packets.filter(a=>a.arrived),latest=arrived.length?arrived[arrived.length-1]:null;
 return {t,packets,latest,arrived:arrived.length,inFlight:packets.length-arrived.length,age:latest?t-latest.sample:null,maxTime:Math.max(80,t+p.delay)};
}
function professionalBackground(p){
 const a=telemetryTimeline(p),X=t=>210+700*t/a.maxTime,ys=173,yr=309,now=X(a.t);
 let b=ltText(24,66,'演示设置：每 '+p.period+' 秒采样，通信延迟 '+p.delay+' 秒；同一测量要在地面收到后才可使用。',16);
 b+='<rect x="'+now+'" y="123" width="'+(X(a.maxTime)-now)+'" height="228" fill="var(--clay,#d47a3a)" fill-opacity=".07"/><path d="M'+now+' 122V355" stroke="var(--ink-2)" stroke-dasharray="5 5"/>'+ltText(now,111,'现在 60 s',16,'text-anchor="middle" font-weight="600"');
 // Two physical locations share one horizontal time scale.
 b+='<path d="M61 137h109m-109 19h109m-109 20h109" stroke="#b6a88d" stroke-width="11" opacity=".4"/><path d="M103 122v76" stroke="var(--ink-2)" stroke-width="7"/><rect x="95" y="184" width="16" height="24" rx="4" fill="var(--c-ts,#2875c7)"/>'+ltText(43,113,'井下传感器',16,'font-weight="600"')+ltText(43,235,'① 测得压力',15);
 b+='<rect x="67" y="272" width="91" height="55" rx="5" fill="var(--card)" stroke="var(--ink-2)" stroke-width="2"/><path d="M80 308l14-11 13 7 17-18 21 10M112 327v12m-22 0h44" fill="none" stroke="var(--jade)" stroke-width="2.5"/>'+ltText(43,262,'地面接收端',16,'font-weight="600"')+ltText(43,365,'② 数据可用',15);
 for(const y of [ys,yr]){b+='<path d="M210 '+y+'H930" stroke="var(--line)" stroke-width="2"/>';for(const t of [0,20,40,60,80])b+='<path d="M'+X(t)+' '+(y-5)+'v10" stroke="var(--ink-2)"/>'+ltText(X(t),y+28,t+' s',13,'text-anchor="middle"');}
 for(const packet of a.packets){const active=a.latest===packet,color=active?'var(--c-ts,#2875c7)':packet.arrived?'var(--jade)':'var(--clay,#d47a3a)',opacity=active?1:.35;
  b+='<g data-sample="'+packet.sample+'" data-arrival="'+packet.arrival+'" data-state="'+(packet.arrived?'arrived':'in-flight')+'"><path d="M'+X(packet.sample)+' '+ys+'L'+X(packet.arrival)+' '+yr+'" fill="none" stroke="'+color+'" stroke-opacity="'+opacity+'" stroke-width="'+(active?3:1.3)+'"'+(packet.arrived?'':' stroke-dasharray="4 4"')+'/>';
  b+='<circle cx="'+X(packet.sample)+'" cy="'+ys+'" r="'+(active?6:3.2)+'" fill="'+color+'"/><circle cx="'+X(packet.arrival)+'" cy="'+yr+'" r="'+(active?6:3.2)+'" fill="'+(packet.arrived?color:'var(--card)')+'" stroke="'+color+'" stroke-width="1.5"/></g>';
 }
 b+=ltPanel(24,383,952,90)+ltText(44,415,a.latest?'最新可用包：'+a.latest.sample+' s 测得 → '+a.latest.arrival+' s 收到':'尚无可用包',20,'font-weight="650"')+ltText(44,450,'数据年龄 = 当前60 s − 最新采样'+(a.latest?a.latest.sample:'—')+' s = '+(a.age===null?'—':a.age)+' s',17);
 b+=ltText(650,414,'已收到 '+a.arrived+' 包 / 传输中 '+a.inFlight+' 包',18,'font-weight="600"')+ltText(650,447,p.delay===0?'零延迟：上下两点垂直对齐。':'连线的水平跨度表示等待时差。',15);
 b+=ltText(24,501,'空心点是尚未收到的包；此图抽象表示通信，不表示固定物理传播时间或泥浆压力脉冲波形。',14,'fill="var(--ink-2)"');
 return ltSvg('测到不等于收到：一份压力测量的两个时间',b,520);
}
function telemetryFeatureGeometry(r,t=60){
 const q=r.rows[t].prediction;if(!q)return null;
 const start=Math.max(0,q.used[0].sample-2),fitAt=time=>q.local+q.slope*(time-t),points=q.used.map(a=>({sample:a.sample,value:a.value,fitted:fitAt(a.sample),residual:a.value-fitAt(a.sample)}));
 const values=[q.hold,q.value,fitAt(start),fitAt(t),...points.flatMap(a=>[a.value,a.fitted])],padding=Math.max(.3,(Math.max(...values)-Math.min(...values))*.12);
 return {q,start,end:t,points,fitStart:fitAt(start),fitEnd:fitAt(t),lo:Math.min(...values)-padding,hi:Math.max(...values)+padding};
}
function telemetryContributions(r,t=60){
 const q=r.rows[t].prediction;if(!q)return null;
 const terms=q.x.map((value,i)=>({name:telemetryFeatureNames[i],input:value,coefficient:r.model[i],contribution:value*r.model[i]})),rawCorrection=terms.reduce((s,a)=>s+a.contribution,0),fallback=q.used.length<2;
 return {q,terms,rawCorrection,correction:fallback?0:rawCorrection,fallback};
}
function telemetrySegmentErrors(r){
 return [[0,59,'突变前段'],[60,90,'突变与滞后段'],[91,120,'后续段']].map(([start,end,label])=>{
  const rows=r.rows.filter(a=>a.t>=start&&a.t<=end&&a.prediction),errors=Object.fromEntries(['hold','local','value'].map(key=>[key,rows.length?mean(rows.map(a=>Math.abs(a.truth-a.prediction[key]))):null]));
  return {start,end,label,count:rows.length,times:rows.map(a=>a.t),errors};
 });
}
function telemetryAbsoluteErrors(r){return r.rows.map(a=>({t:a.t,...Object.fromEntries(['hold','local','value'].map(key=>[key,a.prediction?Math.abs(a.truth-a.prediction[key]):null]))}));}
function ltGroups(r,x,y){
 let b=ltText(x,y,'完整井段分组，时点不跨组',17,'font-weight="600"');
 [['训练',r.train,'var(--jade)'],['测试',r.test,'var(--clay,#d47a3a)']].forEach(([label,groups,color],k)=>{
  b+=ltText(x,y+32+k*32,label,14);groups.forEach((g,i)=>{b+='<rect x="'+(x+49+i*25)+'" y="'+(y+15+k*32)+'" width="18" height="22" rx="4" fill="'+color+'"><title>'+esc(g.id)+' · '+g.rows.length+'个有效时点</title></rect>';});
 });return b;
}
function ltErrors(r,x,y,width=300){
 const values=[['保持法',r.error.baseline,'var(--clay,#d47a3a)'],['局部外推',r.localMAE,'var(--c-ts,#2875c7)'],['学习模型',r.error.model,'var(--jade)']],max=Math.max(.01,...values.map(a=>a[1]))*1.15;
 let b=ltText(x,y,'独立测试 MAE · MPa · 越低越好',17,'font-weight="600"');values.forEach(([label,value,color],i)=>{const top=y+14+i*27;b+=ltText(x,top+15,label,14)+'<rect x="'+(x+82)+'" y="'+top+'" width="'+width*value/max+'" height="17" rx="3" fill="'+color+'"/>'+ltText(x+width+100,top+15,fmt(value,3),15,'text-anchor="end"');});return b;
}
function ltCurve(r,x,y,w,h){
 const vals=r.rows.flatMap(a=>[a.truth,...(a.prediction?[a.prediction.hold,a.prediction.value]:[])]),lo=Math.floor(Math.min(...vals)-1),hi=Math.ceil(Math.max(...vals)+1),X=t=>x+w*t/120,Y=v=>y+h-h*(v-lo)/(hi-lo);
 let b='';for(let i=0;i<=3;i++){const v=lo+(hi-lo)*i/3;b+='<path d="M'+x+' '+Y(v)+'h'+w+'" stroke="var(--line)"/>'+ltText(x-8,Y(v)+4,fmt(v,1),12,'text-anchor="end"');}
 for(const t of [0,30,60,90,120])b+=ltText(X(t),y+h+18,t+' s',12,'text-anchor="middle"');
 for(const [key,color,dash] of [['truth','var(--ink-2)',true],['hold','var(--clay,#d47a3a)',false],['value','var(--jade)',false]]){
  let open=false;const d=r.rows.map(a=>{const v=key==='truth'?a.truth:a.prediction?a.prediction[key]:null;if(v===null){open=false;return '';}const out=(open?'L':'M')+fmt(X(a.t))+' '+fmt(Y(v));open=true;return out;}).join(' ');
  b+='<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="2.4"'+(dash?' stroke-dasharray="5 4"':'')+'/>';
 }
 b+='<path d="M'+X(60)+' '+y+'v'+h+'" stroke="var(--ink-2)" stroke-dasharray="3 5"/>';return b;
}
function learningView(r,p){
 if(!r)return ltSvg('把迟到测量变成可验证的学习任务',
  ltText(24,64,'点击“训练并验证模型”：浏览器生成历史井段、拟合系数，并在独立井段评分。',16)+
  [0,1,2].map((n)=>ltPanel(24+n*326,104,302,258)+ltText(44+n*326,141,['01 / 历史监督','02 / 学习关系','03 / 独立验证'][n],20,'font-weight="600"')+ltText(44+n*326,191,['已到达的压力测量','数据年龄 + 历史趋势','保持 / 外推 / 学习模型'][n],17)+ltText(44+n*326,227,['配对当时参考压力','拟合4个回归系数','相同有效时刻比较误差'][n],16)+ltText(44+n*326,286,['完整井段隔离训练与测试','预测当前压力校正量','未收到的突变仍然未知'][n],15)).join('')+
  ltText(24,411,'石油任务：解释遥测链路中的陈旧压力数据；模型不生成井控指令。',18)+ltText(24,451,'可切换训练不足与未见工况，观察模型何时失效。全部数据为教学合成。',16),490);
 const q=r.rows[60].prediction;
 let b=ltText(24,60,r.method+' · '+r.split.trainSamples+'个训练时点 / '+r.split.testSamples+'个测试时点 · 教学合成',14,'fill="var(--ink-2)"');
 b+=ltPanel(24,77,444,128)+ltGroups(r,42,105)+ltPanel(486,77,490,128)+ltErrors(r,504,105,290);
 b+=ltPanel(24,220,650,255)+ltText(43,249,'当前井段 · 完整回放曲线（离线对照）',17,'font-weight="600"')+ltText(643,249,'压力 MPa',13,'text-anchor="end"')+ltCurve(r,72,275,572,140);
 [['参考真值（仅评分）','var(--ink-2)'],['保持法','var(--clay,#d47a3a)'],['学习估计','var(--jade)']].forEach(([label,color],i)=>{const x=45+i*210;b+='<path d="M'+x+' 458h20" stroke="'+color+'" stroke-width="3"/>'+ltText(x+26,463,label,13);});
 b+=ltPanel(692,220,284,255)+ltText(710,249,'第60秒：地面实际知道什么',16,'font-weight="600"');
 b+=ltText(710,288,q?'最新采样 '+q.latest+' s':'尚未收到首包',20,'font-weight="650"')+ltText(710,320,q?'数据年龄 '+q.age+' s':'暂不输出估计',18)+ltText(710,360,q?'学习估计 '+fmt(q.value,2)+' MPa':'等待有效测量',20,'font-weight="700" fill="var(--jade)"')+ltText(710,394,'仅使用已到达的历史包',15)+ltText(710,424,'不读取当前真值或未来突变',14)+ltText(710,454,r.shift?'未见工况：60秒额外突变4 MPa':'误差是离线评估，不是置信度',13,'fill="var(--ink-2)"');
 return ltSvg('从历史井段学习，检验延迟校正有没有帮助',b+ltText(24,501,'学习结果不保证优于基线；完整井段测试与当前情境评分分开，估计不用于现场控制。',14,'fill="var(--ink-2)"'));
}
function learningStep(r,p,n){
 if(n===1){let b=ltGroups(r,45,93)+ltText(510,93,'每条样本：已到测量 → 当时参考',19,'font-weight="600"');
  for(let i=0;i<8;i++){const x=513+i*52;b+='<circle cx="'+x+'" cy="164" r="7" fill="var(--jade)"/><path d="M'+x+' 176v46" stroke="var(--line)"/><circle cx="'+x+'" cy="235" r="7" fill="var(--clay,#d47a3a)"/>';}
  b+=ltText(507,139,'可用历史特征',15)+ltText(507,269,'历史参考用于监督，测试参考只评分',15)+ltText(45,233,'训练 '+r.split.trainGroups+'井段 / '+r.split.trainSamples+'时点',19)+ltText(45,270,'测试 '+r.split.testGroups+'井段 / '+r.split.testSamples+'时点',19)+ltText(45,335,'同一井段的时点始终属于同一组；训练与测试使用不同的生成种子。',17);return ltSvg('01 / 按完整井段划分监督数据',b,385);}
 if(n===2){const g=telemetryFeatureGeometry(r);if(!g)return ltSvg('02 / 从已到历史提取因果特征',ltText(30,95,'第60秒尚无已到达包，暂不提取特征或输出估计。',18),220);
  const q=g.q,X=t=>90+600*(t-g.start)/(g.end-g.start),Y=v=>345-195*(v-g.lo)/(g.hi-g.lo);let b=ltText(24,70,'只读取已到包；竖向残差显示测量值偏离局部趋势线的程度。',16)+ltText(90,135,'压力 / MPa',14);
  [['测量 / 局部趋势','var(--c-ts,#2875c7)'],['拟合残差','var(--ink-2)'],['水平保持','var(--clay,#d47a3a)'],['学习估计','var(--jade)']].forEach(([label,color],i)=>{const x=32+i*174;b+='<path d="M'+x+' 101h22" stroke="'+color+'" stroke-width="3"/>'+ltText(x+28,106,label,13);});
  for(let i=0;i<4;i++){const val=g.lo+(g.hi-g.lo)*i/3;b+='<path d="M90 '+Y(val)+'H690" stroke="var(--line)"/>'+ltText(78,Y(val)+5,fmt(val,1),13,'text-anchor="end"');}
  b+='<path d="M90 '+Y(q.hold)+'H690" stroke="var(--clay,#d47a3a)" stroke-width="2"/><path d="M90 '+Y(g.fitStart)+'L690 '+Y(g.fitEnd)+'" fill="none" stroke="var(--c-ts,#2875c7)" stroke-dasharray="6 4" stroke-width="2"/>';
  for(const a of g.points){const x=X(a.sample);b+='<path d="M'+x+' '+Y(a.value)+'V'+Y(a.fitted)+'m-4 0h8" stroke="var(--ink-2)" stroke-width="2"/><circle cx="'+x+'" cy="'+Y(a.value)+'" r="6" fill="var(--c-ts,#2875c7)"/>'+ltText(x,370,a.sample+' s',13,'text-anchor="middle"');}
  b+='<path d="M690 146V350" stroke="var(--ink-2)" stroke-dasharray="4 5"/><circle cx="690" cy="'+Y(q.value)+'" r="9" fill="var(--card)" stroke="var(--jade)" stroke-width="4"/>'+ltText(690,396,'当前 60 s',14,'text-anchor="middle"');
  b+=ltPanel(735,142,241,275)+ltText(752,172,'当前能用的信息',17,'font-weight="600"')+ltText(752,204,'最新采样 '+q.latest+' s',16)+ltText(752,232,'数据年龄 '+q.age+' s',16)+ltText(752,277,'保持 '+fmt(q.hold,3)+' MPa',17,'fill="var(--clay,#d47a3a)"')+ltText(752,314,'局部 '+fmt(q.local,3)+' MPa',17,'fill="var(--c-ts,#2875c7)"')+ltText(752,351,'学习 '+fmt(q.value,3)+' MPa',17,'font-weight="650" fill="var(--jade)"')+ltText(752,391,'三者均不读取当前真值',14);
  b+=ltText(24,449,'最近5点趋势是本次输入特征；它本身不是从历史训练井段学习出的模型。',17)+ltText(24,485,'局部外推基于已到测量；学习模型用历史拟合的系数进一步校正。残差不是在线置信度。',14,'fill="var(--ink-2)"');return ltSvg('02 / 从已到历史提取因果特征',b,510);}
 if(n===3){const a=telemetryContributions(r);if(!a)return ltSvg('03 / 当前输入怎样变成一次压力校正',ltText(30,95,'第60秒尚无已到达包，暂不执行特征乘积与压力校正。',18),220);
  const max=Math.max(.01,...a.terms.map(x=>Math.abs(x.contribution))),units=['无量纲 × MPa','无量纲 × MPa','MPa × 无量纲','MPa × 无量纲'];let b=ltText(24,70,'系数来自 '+r.split.trainGroups+' 个历史训练井段；当前5点趋势只是输入，不是训练结果。',16);
  b+=ltText(28,106,'输入特征',14)+ltText(285,106,'本次取值',14,'text-anchor="end"')+ltText(440,106,'训练系数',14,'text-anchor="end"')+ltText(695,106,'本次压力贡献 / MPa',14,'text-anchor="middle"');
  a.terms.forEach((v,i)=>{const y=137+i*54,width=154*Math.abs(v.contribution)/max;b+=ltText(28,y+8,v.name,16)+ltText(28,y+28,units[i],12,'fill="var(--ink-2)"')+ltText(285,y+10,fmt(v.input,4),16,'text-anchor="end"')+ltText(322,y+10,'×',17,'text-anchor="middle"')+ltText(440,y+10,fmt(v.coefficient,4),16,'text-anchor="end"')+ltText(482,y+10,'=',17,'text-anchor="middle"')+'<path d="M695 '+(y-9)+'v30" stroke="var(--ink-2)"/><rect x="'+(v.contribution<0?695-width:695)+'" y="'+(y-5)+'" width="'+width+'" height="23" rx="3" fill="'+(v.contribution<0?'var(--clay,#d47a3a)':'var(--jade)')+'"/>'+ltText(958,y+12,(v.contribution>=0?'+':'')+fmt(v.contribution,4),17,'text-anchor="end"');});
  b+=ltPanel(24,365,952,91)+ltText(44,396,a.fallback?'只有1个包：尚无趋势，回退保持值，不应用回归校正。':'各项贡献求和，得到当前压力的学习校正量：',16)+ltText(44,433,fmt(a.q.hold,4)+' MPa + ('+fmt(a.correction,4)+' MPa) ≈ '+fmt(a.q.value,4)+' MPa',23,'font-weight="650" fill="var(--jade)"');
  b+=ltText(24,488,'贡献相加使用未舍入值；特征量纲不同，系数大小不是重要性排名。正则强度预先固定为0.001。',14,'fill="var(--ink-2)"');return ltSvg('03 / 当前输入怎样变成一次压力校正',b,510);}
 if(n===4){const lo=Math.floor(Math.min(...r.validation.map(a=>Math.min(a.truth,a.value)))),hi=Math.ceil(Math.max(...r.validation.map(a=>Math.max(a.truth,a.value))))+1,X=v=>90+400*(v-lo)/(hi-lo),Y=v=>345-230*(v-lo)/(hi-lo);let b=ltText(35,70,'每个点是一条独立测试记录；越接近对角线，预测越接近参考。',16);
  for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4;b+='<path d="M90 '+Y(v)+'H490" stroke="var(--line)"/>'+ltText(80,Y(v)+5,fmt(v,1),12,'text-anchor="end"')+ltText(X(v),366,fmt(v,1),12,'text-anchor="middle"');}
  b+='<path d="M90 345L490 115" stroke="var(--ink-2)" stroke-dasharray="5 4"/>';r.validation.filter((_,i)=>i%2===0).forEach(a=>{b+='<circle cx="'+X(a.truth)+'" cy="'+Y(a.value)+'" r="3.7" fill="var(--jade)" fill-opacity=".5"/>';});
  b+=ltText(90,99,'预测压力 / MPa',14)+ltText(490,395,'参考压力 / MPa',14,'text-anchor="end"')+ltErrors(r,550,140,275)+ltText(550,300,r.shift?'测试加入未见强突变，训练系数不变。':'同一批测试时刻比较三种方法。',15)+ltText(550,334,'评分真值不参与训练、特征或当前估计。',15);return ltSvg('04 / 独立测试预测误差与基线',b,430);}
 if(n===5){const groups=telemetrySegmentErrors(r),series=telemetryAbsoluteErrors(r),keys=[['hold','保持法','var(--clay,#d47a3a)'],['local','局部外推','var(--c-ts,#2875c7)'],['value','学习模型','var(--jade)']],maxBar=Math.max(.01,...groups.flatMap(a=>Object.values(a.errors).filter(v=>v!==null)))*1.1,maxCurve=Math.max(.1,...series.flatMap(a=>keys.map(([key])=>a[key]||0)))*1.08,X=t=>90+850*t/120,Y=v=>425-115*v/maxCurve;
  let b=ltText(24,61,'当前查询的离线复盘；下方数值不是独立测试井段 MAE，真值只用于事后评分。',15);
  groups.forEach((a,i)=>{const x=24+i*326;b+=ltPanel(x,79,300,170)+ltText(x+15,105,a.start+'—'+a.end+' s · '+a.label,17,'font-weight="600"')+ltText(x+15,130,'相同有效时刻 '+a.count+' 个 · MAE / MPa',13);
   keys.forEach(([key,label,color],j)=>{const y=151+j*28,value=a.errors[key];b+=ltText(x+15,y+13,label,13)+(value===null?'':'<rect x="'+(x+84)+'" y="'+y+'" width="'+(151*value/maxBar)+'" height="17" rx="3" fill="'+color+'"/>')+ltText(x+283,y+14,value===null?'无时点':fmt(value,3),14,'text-anchor="end"');});
  });
  b+=ltPanel(24,265,952,202)+ltText(42,291,'逐秒绝对误差 / MPa',14);keys.forEach(([key,label,color],i)=>{const x=508+i*147;b+='<path d="M'+x+' 287h22" stroke="'+color+'" stroke-width="2.5"'+(key==='local'?' stroke-dasharray="5 4"':'')+'/>'+ltText(x+28,292,label,13);});
  [[0,60],[60,91],[91,120]].forEach(([from,to],i)=>{b+='<rect x="'+X(from)+'" y="306" width="'+(X(to)-X(from))+'" height="119" fill="'+(i===1?'var(--clay,#d47a3a)':'var(--jade)')+'" fill-opacity="'+(i===1?'.10':'.05')+'"/>';});
  for(let i=0;i<3;i++){const v=maxCurve*i/2;b+='<path d="M90 '+Y(v)+'H940" stroke="var(--line)"/>'+ltText(80,Y(v)+4,fmt(v,1),12,'text-anchor="end"');}for(const t of [0,30,60,90,120])b+=ltText(X(t),447,t+' s',12,'text-anchor="middle"');
  keys.forEach(([key,label,color])=>{let open=false;const d=series.map(a=>{if(a[key]===null){open=false;return '';}const point=(open?'L':'M')+fmt(X(a.t))+' '+fmt(Y(a[key]));open=true;return point;}).join(' ');b+='<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="2.3"'+(key==='local'?' stroke-dasharray="5 4"':'')+'/>';});
  b+=ltText(24,497,'三法在相同时点评分；首包到达前不计分。分段真值不参与在线估计、置信度或控制。',14,'fill="var(--ink-2)"');return ltSvg('05 / 当前井段分段复盘：误差集中在哪里？',b,520);}
 return learningView(r,p);
}

function sv27Text(x,y,label,size=16,attrs=''){return '<text x="'+x+'" y="'+y+'" font-size="'+size+'" '+attrs+'>'+esc(label)+'</text>';}
function sv27Rect(x,y,w,h,fill='var(--card,#fff)',stroke='var(--line,#dfe6f0)'){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="16" fill="'+fill+'" stroke="'+stroke+'"/>';}
function sv27SVG(label,body,height){return '<svg class="chart sv27" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 '+height+'" role="img" aria-label="'+esc(label)+'"><title>'+esc(label)+'</title><g fill="var(--ink,#202b38)" font-family="system-ui,Microsoft YaHei,sans-serif">'+body+'</g></svg>';}
function showcase(r,p,progress=1){
 const t=Math.floor(clamp(progress,0,1)*120),row=r.rows[t],q=row.prediction;
 const active=r.packets.filter(packet=>packet.sample<=t&&packet.arrival>t);
 const x=time=>64+880*time/120,y=value=>468-108*(value-7)/23;
 let b=sv27Text(24,34,'井下已经变化，地面知道了吗？',24,'font-weight="700"');
 b+=sv27Rect(850,8,126,39,'var(--paper-2,#eaf0f7)')+sv27Text(913,35,'回放 '+t+' s',19,'text-anchor="middle" font-weight="650"');
 b+=sv27Rect(24,60,226,250)+sv27Rect(268,60,432,250)+sv27Rect(718,60,258,250);
 b+=sv27Text(44,91,'01 / 井下采样',16,'fill="var(--ink-2,#52627a)"');
 b+='<path d="M46 126h180m-180 22h180m-180 22h180" stroke="#b6a88d" stroke-width="13" opacity=".38"/><path d="M95 109v80q15 14 30 0v-80" stroke="#7b919c" stroke-width="8" fill="none"/><rect x="103" y="173" width="15" height="23" rx="4" fill="#2875c7"/>';
 b+=sv27Text(144,135,'传感器',16)+sv27Text(144,163,'每 '+p.period+' s',16)+sv27Text(144,187,'采样一次',14);
 b+=sv27Text(44,231,fmt(row.truth,2)+' MPa',31,'font-weight="700" fill="var(--show-blue,#2875c7)"')+sv27Text(44,263,'当前教学参考压力',15)+sv27Text(44,287,'仅用于对照，不送入估计器',14,'fill="var(--ink-2,#52627a)"');
 b+=sv27Text(289,91,'02 / 传输中的数据包',16,'fill="var(--ink-2,#52627a)"');
 b+=sv27Text(289,124,'固定延迟 '+p.delay+' s',23,'font-weight="650"')+sv27Text(677,124,active.length+' 包在途',16,'text-anchor="end"');
 b+='<path d="M298 175h370" stroke="var(--line,#dfe6f0)" stroke-width="18" stroke-linecap="round"/><path d="M298 175h370m-12-10 12 10-12 10" fill="none" stroke="#2875c7" stroke-width="2"/>';
 active.forEach(packet=>{const ratio=p.delay?(t-packet.sample)/p.delay:1,cx=302+356*ratio,color=packet.sample>=60?'#d47a3a':'#2875c7';b+='<circle data-sample="'+packet.sample+'" data-arrival="'+packet.arrival+'" cx="'+fmt(cx)+'" cy="175" r="7" fill="'+color+'" stroke="var(--card,#fff)" stroke-width="2"/>';});
 b+=sv27Text(290,210,'发送',14)+sv27Text(678,210,'接收',14,'text-anchor="end"');
 b+='<circle cx="296" cy="238" r="5" fill="#2875c7"/>'+sv27Text(309,244,'60秒前采样',14)+'<circle cx="482" cy="238" r="5" fill="#d47a3a"/>'+sv27Text(495,244,'60秒起采样',14);
 b+=sv27Text(289,282,p.delay===0?'零延迟：数据包在采样时刻立即可用':'包到达之前，地面无法读取它的测量值',15);
 b+=sv27Text(738,91,'03 / 地面可用信息',16,'fill="var(--ink-2,#52627a)"');
 if(q){b+='<g data-current-time="'+t+'" data-latest-sample="'+q.latest+'">'+sv27Text(738,128,'最新采样 '+q.latest+' s',18)+sv27Text(738,170,'保持  '+fmt(q.hold,2)+' MPa',23,'fill="var(--show-orange,#b9672c)" font-weight="650"')+sv27Text(738,211,'外推  '+fmt(q.estimate,2)+' MPa',23,'fill="var(--jade,#168273)" font-weight="650"')+sv27Text(738,253,'数据年龄 '+q.age+' s',24,'font-weight="700"')+sv27Text(738,283,'仅使用已到达的最近5包',14)+'</g>';}
 else b+='<g data-current-time="'+t+'" data-latest-sample="none">'+sv27Text(738,149,'尚未收到首包',25,'font-weight="650"')+sv27Text(738,189,'保持：无估计',20)+sv27Text(738,225,'外推：无估计',20)+sv27Text(738,271,'首包将在 '+p.delay+' s 到达',16)+'</g>';
 b+=sv27Rect(24,326,952,190)+sv27Text(44,351,'截至回放时刻的压力曲线',17,'font-weight="650"')+sv27Text(952,351,'MPa',14,'text-anchor="end"');
 for(const value of [10,20,30])b+='<path d="M64 '+y(value)+'H944" stroke="var(--line,#dfe6f0)"/>'+sv27Text(55,y(value)+5,value,14,'text-anchor="end"');
 for(const time of [0,30,60,90,120])b+=sv27Text(x(time),491,time+' s',14,'text-anchor="middle"');
 const futureX=x(t);b+='<rect x="'+futureX+'" y="360" width="'+(944-futureX)+'" height="108" fill="var(--paper-2,#eaf0f7)" opacity=".6"/>';
 b+='<path d="M'+x(60)+' 360V468" stroke="#d47a3a" stroke-dasharray="4 4"/>';
 const series=[{key:'truth',color:'#2875c7'},{key:'hold',color:'#d47a3a'},{key:'estimate',color:'#168273'}];
 for(const s of series){let open=false;const d=r.rows.slice(0,t+1).map(a=>{const v=s.key==='truth'?a.truth:a.prediction?a.prediction[s.key]:null;if(v===null){open=false;return '';}const out=(open?'L':'M')+fmt(x(a.t))+' '+fmt(y(v));open=true;return out;}).join(' ');b+='<path d="'+d+'" fill="none" stroke="'+s.color+'" stroke-width="2.5"'+(s.key==='estimate'?' stroke-dasharray="6 3"':'')+'/>';}
 b+='<path d="M'+futureX+' 360V468" stroke="var(--ink-2,#52627a)" stroke-width="1.5"/>';
 [['参考（仅对照）','#2875c7'],['保持法','#d47a3a'],['因果外推','#168273']].forEach((s,i)=>{const sx=360+i*190;b+='<path d="M'+sx+' 344h20" stroke="'+s[1]+'" stroke-width="3"/>'+sv27Text(sx+26,349,s[0],14);});
 return sv27SVG('遥测因果回放，第'+t+'秒；地面只使用已到达包',b,530);
}
function showcaseAnalysis(r,p){
 const maximum=Math.max(.1,...r.valid.flatMap(a=>[Math.abs(a.truth-a.prediction.hold),Math.abs(a.truth-a.prediction.estimate)]));
 const X=t=>150+792*t/121,W=792/121;
 const color=v=>{const z=clamp(v/maximum,0,1);return 'rgb('+Math.round(225-183*z)+','+Math.round(239-141*z)+','+Math.round(250-86*z)+')';};
 let b=sv27Text(24,34,'误差在哪里集中？',23,'font-weight="700"')+sv27Text(24,62,'离线全段评分 · 同一时间、同一色标；颜色越深，绝对误差越大',16,'fill="var(--ink-2,#52627a)"');
 b+=sv27Text(24,136,'保持法',18,'font-weight="650"')+sv27Text(24,205,'因果外推',18,'font-weight="650"');
 ['hold','estimate'].forEach((key,k)=>{const top=102+k*69;for(const row of r.rows){const v=row.prediction?Math.abs(row.truth-row.prediction[key]):null;b+='<rect x="'+fmt(X(row.t))+'" y="'+top+'" width="'+fmt(W+.12)+'" height="49" fill="'+(v===null?'var(--line,#cbd5df)':color(v))+'"><title>'+row.t+'s：'+(v===null?'尚未收到包':fmt(v,3)+' MPa')+'</title></rect>';}});
 const eventX=X(60),eventW=X(91)-eventX;b+='<rect x="'+eventX+'" y="98" width="'+eventW+'" height="126" fill="none" stroke="#d47a3a" stroke-width="2" stroke-dasharray="5 4"/>'+sv27Text(eventX+eventW/2,88,'60—90 s 突变段',15,'text-anchor="middle" fill="var(--show-orange,#b9672c)"');
 for(const t of [0,30,60,90,120])b+=sv27Text(X(t)+W/2,246,t+' s',14,'text-anchor="middle"');
 b+=sv27Text(24,282,'绝对误差',15);
 for(let i=0;i<60;i++)b+='<rect x="'+(112+i*4)+'" y="268" width="4.1" height="17" fill="'+color(maximum*i/59)+'"/>';
 b+=sv27Text(112,309,'0',14)+sv27Text(352,309,fmt(maximum,2)+' MPa',14,'text-anchor="end"');
 b+='<rect x="397" y="268" width="22" height="17" fill="var(--line,#cbd5df)"/>'+sv27Text(428,282,'首包未到，不评分',15);
 b+=sv27Text(680,281,'突变段 MAE（保持 / 外推）',15)+sv27Text(680,311,fmt(r.eventHold,3)+' / '+fmt(r.eventPred,3)+' MPa',22,'font-weight="650"');
 return sv27SVG('保持法与外推法的逐秒绝对误差热图，离线评分',b,330);
}

const automationScene="d27";const roles={"title":"自动对齐，接手人工盯数与趋势试算","subtitle":"把“这个数是什么时刻测到的、现在还能说明什么”转为自动检查，并保留保持法基线和误差证据。","manual":"逐包核对时间戳，判断数据新旧并试算趋势","automatic":"筛选已到达包，计算数据年龄与局部回归估计","review":"核对真实测量，复核突变与高噪声下的估计","method":"因果局部回归","action":"自动对齐并估计","applyLabel":"","steps":["按接收时刻筛选当前已到达的数据包，计算最新测量的数据年龄。","使用最近至多5个已到达包拟合局部趋势；不足2包时采用保持值。","输出回归估计，并在相同有效时刻与保持法基线比较离线误差。"],"limits":"这里展示自动接手时间对齐、数据新旧检查和趋势计算。保持法是算法基线，不代表人工操作水平；回归可能放大噪声，不能预知未到达的突变，也不能替代井控测量或安全判断。"};

function automationResult(r,p,progress=1){
 if(automationScene==='d26'){
  const a=r.current,b=r.best;
  return {state:b?'ready':'blocked',headline:b?'找到可行推荐：'+b.cut+' μm':'没有满足含固约束的候选',
   stats:[['自动计算候选',r.candidates.length+' 个'],['满足含固约束',r.eligible.length+' 个'],['推荐切割粒径',b?b.cut+' μm':'无可行推荐'],['推荐方案费用',b?fmt(b.cost,0)+' 元':'不推荐']],
   steps:[{name:'计算全部候选',detail:r.candidates.length+'组固液衡算与费用计算，统一100 m³入口。'},
    {name:'筛除超限方案',detail:'保留'+r.eligible.length+'组，排除'+(r.candidates.length-r.eligible.length)+'组；含固上限'+p.limit+'%。'},
    {name:'在合格方案中比价',detail:b?'最低费用'+fmt(b.cost,0)+'元；出口含固'+fmt(b.concentration,2)+'%。':'可行集为空，停止推荐并保留超限证据。'}],
   recommendation:b?{cut:b.cut}:null,
   comparison:!b?'当前条件下无可行推荐；应复核约束或处理工艺。':!a.feasible?'人工设定示例含固'+fmt(a.concentration,2)+'%超限；推荐'+fmt(b.concentration,2)+'%满足约束。先满足含固上限，再比较费用。':'两者均满足约束；当前教学设定费用差 '+fmt(a.cost-b.cost,0)+' 元/100 m³，仅用于模型内比较。',
   review:roles.review};
 }
 if(automationScene==='d27'){
  const t=Math.floor(clamp(progress,0,1)*120),q=r.rows[t].prediction,arrived=r.packets.filter(a=>a.arrival<=t),used=arrived.slice(-5),worse=r.predMAE>r.holdMAE;
  return {state:q?'ready':'blocked',headline:!q?'首包未到：暂不输出估计':used.length<2?'已有1包：使用保持值回退':'已完成对齐与当前时刻估计',
   stats:[['当前最新采样',q?q.latest+' s':'尚未收到'],['当前数据年龄',q?q.age+' s':'无可用数据'],['当前估计',q?fmt(q.estimate,2)+' MPa':'无估计'],['离线MAE 保持/外推 MPa',fmt(r.holdMAE,3)+' / '+fmt(r.predMAE,3)]],
   steps:[{name:'按接收时间筛选',detail:'第'+t+'秒已收到'+arrived.length+'包；只取arrival≤'+t+'s。'},
    {name:'使用已到达的历史',detail:!q?'没有包可用，不读取未来数据。':used.length<2?'仅1包，回退保持值；不拟合趋势。':'最近'+used.length+'包采于'+used.map(x=>x.sample).join('、')+'秒。'},
    {name:'独立离线复盘',detail:'完整参考的全段评分：外推MAE'+(worse?'大于':'不大于')+'保持法，仅供事后复盘。'}],
   recommendation:null,
   comparison:'当前帧='+t+'s，估计只使用已到包。离线全段复盘：外推MAE'+(worse?'大于':'不大于')+'保持法；全段评分不影响当前估计与状态。',
   review:roles.review};
 }
 const a=r.current,b=r.best;
 return {state:'ready',headline:'搜索结果：累计进尺 '+b.threshold+' m 时更换',
  stats:[['自动比较策略',r.candidates.length+' 种'],['最低费用阈值',b.threshold+' m'],['推荐任务工时',fmt(b.hours,1)+' h'],['推荐任务费用',fmt(b.cost/10000,2)+' 万元']],
  steps:[{name:'枚举更换阈值',detail:r.candidates.length+'种策略均完成剩余600 m任务。'},
   {name:'逐段核算时间与费用',detail:'合并钻进、起下钻停时和新钻头费用。'},
   {name:'选出最低费用候选',detail:b.threshold+' m阈值；'+b.replacements+'次更换，'+fmt(b.hours,1)+'小时。'}],
  recommendation:{threshold:b.threshold},
  comparison:'当前教学设定差：'+fmt((a.cost-b.cost)/10000,2)+'万元。人工设定示例与算法候选在同一模型内比较，不是现场收益。',
  review:roles.review};
}
function autoText(x,y,s,size=16,attrs=''){return '<text x="'+x+'" y="'+y+'" font-size="'+size+'" '+attrs+'>'+esc(s)+'</text>';}
function autoLines(x,y,s,width,size=16,maxLines=2,color='var(--ink,#202b38)'){
 const rows=[];let row='',used=0;for(const ch of String(s)){const unit=/[\x00-\x7f]/.test(ch)?.55:1;if(used+unit>width/size&&row){rows.push(row);row='';used=0;}row+=ch;used+=unit;}if(row)rows.push(row);
 return rows.slice(0,maxLines).map((line,i)=>autoText(x,y+i*(size+6),i===maxLines-1&&rows.length>maxLines?line.slice(0,-1)+'…':line,size,'fill="'+color+'"')).join('');
}
function autoPanel(x,y,w,h,color='var(--card,#fff)'){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="14" fill="'+color+'" stroke="var(--line,#dfe6f0)"/>';}
function automationView(r,p,progress=1,complete=false){
 const result=automationResult(r,p,progress),color=result.state==='blocked'?'#b45d3d':result.state==='review'?'#a16d28':'var(--jade,#168273)';
 let b=autoText(24,32,'人工给条件，算法做重复计算，人来复核',24,'font-weight="700"');
 b+=autoText(24,60,'方法：'+roles.method+' · 教学模型 · 不接管现场设备',14,'fill="var(--ink-2,#52627a)"');
 b+=autoPanel(823,13,153,35,'var(--paper-2,#eaf0f7)')+autoText(899,37,complete?(result.state==='blocked'?'无可行输出':result.state==='review'?'需要人工复核':'自动处理已完成'):'等待运行',16,'text-anchor="middle" fill="'+(complete?color:'var(--ink-2,#52627a)')+'" font-weight="600"');
 b+=autoPanel(24,82,267,231)+autoPanel(310,82,389,231,'var(--paper-2,#eaf0f7)')+autoPanel(718,82,258,231);
 b+=autoText(42,111,'01 / 原来人工做什么',17,'font-weight="650"')+autoLines(42,145,roles.manual,229,17,3);
 const manual=automationScene==='d26'?['当前设定 '+p.cut+' μm','出口含固 '+fmt(r.current.concentration,2)+'%','当前费用 '+fmt(r.current.cost,0)+' 元']:
  automationScene==='d27'?['回放时刻 '+Math.floor(clamp(progress,0,1)*120)+' s','保持法是算法基线','不代表人工操作水平']:
  ['人工设定示例 '+p.threshold+' m','当前总工时 '+fmt(r.current.hours,1)+' h','当前任务 '+fmt(r.current.cost/10000,2)+' 万元'];
 manual.forEach((s,i)=>{b+=autoText(42,232+i*25,s,15,'fill="var(--ink-2,#52627a)"');});
 b+='<path d="M294 190h12l-5-5m5 5-5 5M702 190h12l-5-5m5 5-5 5" fill="none" stroke="var(--jade,#168273)" stroke-width="2"/>';
 b+=autoText(329,111,'02 / 算法自动接手',17,'font-weight="650" fill="var(--jade,#168273)"');
 result.steps.forEach((step,i)=>{const y=140+i*61;b+='<circle cx="339" cy="'+(y-4)+'" r="10" fill="var(--jade,#168273)" fill-opacity=".13"/>'+autoText(339,y+1,String(i+1),14,'text-anchor="middle" fill="var(--jade,#168273)"');b+=autoText(358,y,step.name,16,'font-weight="600"');b+=autoLines(358,y+21,complete?step.detail:roles.steps[i],321,14,2,'var(--ink-2,#52627a)');});
 b+=autoText(737,111,'03 / 人工保留什么',17,'font-weight="650"')+autoLines(737,145,complete?result.review:roles.review,220,16,3);
 b+=autoLines(737,237,complete?result.headline:'运行后查看证据，再决定是否采用。',220,17,3,complete?color:'var(--ink-2,#52627a)');
 result.stats.forEach((stat,i)=>{const x=24+i*241;b+=autoPanel(x,327,229,74,'var(--paper-2,#eaf0f7)')+autoText(x+14,351,stat[0],14,'fill="var(--ink-2,#52627a)"')+autoText(x+14,383,complete?stat[1]:'待运行',stat[1].length>14?18:22,'font-weight="700"');});
 b+=autoLines(24,426,complete?result.comparison:'自动完成的是试算、对齐和候选筛选；数据条件、结果采用与现场决策仍需人工复核。',950,14,2,'var(--ink-2,#52627a)');
 return '<svg class="chart automation-board" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 460" role="img" aria-label="'+esc(complete?result.headline:'人工任务、算法处理与人工复核分工')+'"><title>'+esc(complete?result.headline+'。'+result.comparison:'运行自动处理，查看可复核的步骤和结果。')+'</title><g fill="var(--ink)" font-family="system-ui,Microsoft YaHei,sans-serif">'+b+'</g></svg>';
}

const presets=[{"label":"稳定链路","description":"短延迟、低噪声，观察两条估计如何跟随。","values":{"delay":2,"period":2,"noise":0.1,"jump":1}},{"label":"突变被延迟","description":"在60秒附近暂停：井下已变，地面仍在等待。","values":{"delay":20,"period":4,"noise":0.2,"jump":6}},{"label":"噪声放大","description":"长延迟、高噪声，观察局部外推放大的误差。","values":{"delay":20,"period":1,"noise":1,"jump":0}}];
const api={defaults,limits,calculate,visualize,mechanism,illustrate,showcase,showcaseAnalysis,presets,automationResult,automationView,roles,learn,learningView,learningStep,professionalBackground,estimate};
if(typeof module!=="undefined"&&module.exports)module.exports=api;

if(typeof document==='undefined')return;
const $=id=>document.getElementById(id);
let paramsCache,resultCache,progress=1,playing=false,animation=null,lastTime=null,disposed=false,recording=false,analysisView=false,workView=true,autoComplete=false,applied=false,inView=true,pending=null,timer=null;
let learningSelected=true,learningResult=null,learningMode='normal',learningApplied=false,learningStepIndex=0;
const reduced=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
if(reduced.addEventListener)reduced.addEventListener('change',()=>{if(reduced.matches){pause();paint();}});
function paint(){
 $('showcase-root').setAttribute('data-view',learningSelected?'learning':workView?'work':analysisView?'analysis':'process');
 $('showcase').innerHTML=learningSelected?(learningResult&&learningStepIndex?learningStep(learningResult,paramsCache,learningStepIndex):learningView(learningResult,paramsCache)):workView?automationView(resultCache,paramsCache,progress,autoComplete):analysisView?showcaseAnalysis(resultCache,paramsCache):showcase(resultCache,paramsCache,progress);
 $('learning-view').setAttribute('aria-pressed',String(learningSelected));$('work-view').setAttribute('aria-pressed',String(!learningSelected&&workView));$('process-view').setAttribute('aria-pressed',String(!learningSelected&&!workView&&!analysisView));$('analysis-view').setAttribute('aria-pressed',String(!learningSelected&&analysisView));
 $('lab-context').textContent=(learningSelected?'数据学习与验证':'公式与规则对照')+' / '+automationScene.toUpperCase();
 $('input-title').textContent=learningSelected?'当前查询条件':'调整输入 · 即时复算';
 $('ml-apply').disabled=!learningResult||!learningResult.recommendation||Object.entries(learningResult.recommendation).every(([k,v])=>paramsCache[k]===v);
 $('ml-step').disabled=!learningResult;$('ml-step').value=String(learningStepIndex);
 $('ml-status').textContent=learningApplied?'学习建议已填入当前参数；请结合预测误差复核。':learningResult?'训练完成 · '+learningResult.split.trainGroups+'个训练组 / '+learningResult.split.testGroups+'个独立测试组 · 测试MAE '+fmt(learningResult.error.model,3)+' '+learningResult.error.unit+'，基线 '+fmt(learningResult.error.baseline,3):'点击训练：仅用训练组拟合，独立测试组只用于评分。';
 $('ml-note').hidden=!learningSelected;$('ml-note').textContent=learningResult?learningResult.note:'教学合成数据 · 模型在浏览器内学习。三种实验比较正常条件、少量训练样本和测试工况偏移；模型不保证优于基线。';
 for(const mode of ['normal','sparse','shift'])$('ml-mode-'+mode).setAttribute('aria-pressed',String(learningMode===mode));
 const job=autoComplete?automationResult(resultCache,paramsCache,progress):null;
 $('apply').disabled=!job||!job.recommendation||Object.entries(job.recommendation).every(([k,v])=>paramsCache[k]===v);
 $('auto-status').textContent=applied?'建议已填入示例参数，请人工复核结果。':job?job.headline:'自动任务尚未执行；调参后需重新运行。';
 $('showcase-progress').value=progress*100;
 $('showcase-time').textContent=Math.round(progress*100)+'%';
 $('play').textContent=playing?'暂停回放':progress>=1?'开始回放':'继续回放';
 $('play').setAttribute('aria-pressed',String(playing));
 for(const id of ['play','replay','step'])$(id).disabled=analysisView;
}
function pause(){playing=false;lastTime=null;if(animation!==null)cancelAnimationFrame(animation);animation=null;}
function tick(time){animation=null;if(!playing||disposed||document.hidden||!inView){pause();paint();return;}if(lastTime!==null)progress=Math.min(1,progress+Math.min(100,time-lastTime)/16000);lastTime=time;paint();if(progress<1)animation=requestAnimationFrame(tick);else{pause();paint();}}
function update(keepProgress=false){
 pause();if(!keepProgress)progress=1;autoComplete=false;applied=false;learningResult=null;learningApplied=false;
 const p=Object.fromEntries(Object.keys(defaults).map(k=>[k,Number($(k).value)])),r=calculate(p),v=visualize(r,p);paramsCache=p;resultCache=r;
 for(const k of Object.keys(defaults))$('out-'+k).textContent=String(p[k]);
 $('mechanism').innerHTML=mechanism(r,p);$('chart1').innerHTML=v.charts[0];$('chart2').innerHTML=v.charts[1];
 $('readouts').innerHTML=v.metrics.map(t=>'<div class="metric"><small>'+esc(t[0])+'</small><b>'+esc(t[1])+'</b></div>').join('');
 $('explain').textContent=v.note;$('detail').innerHTML=v.detail;$('showcase-analysis').innerHTML=showcaseAnalysis(r,p);
 presets.forEach((preset,i)=>$('preset-'+i).setAttribute('aria-pressed',String(Object.keys(defaults).every(k=>p[k]===preset.values[k]))));paint();
}
function cancelInput(){if(pending!==null)cancelAnimationFrame(pending);if(timer!==null)clearTimeout(timer);pending=null;timer=null;}
function flush(){cancelInput();update();}
for(const k of Object.keys(defaults)){const input=$(k);input.addEventListener('input',()=>{pause();autoComplete=false;applied=false;learningResult=null;learningApplied=false;$('ml-apply').disabled=true;$('ml-status').textContent='查询条件已改变，请重新训练并验证。';$('apply').disabled=true;$('auto-status').textContent='参数已改变，请重新执行自动任务。';if(document.hidden){flush();return;}if(pending===null){pending=requestAnimationFrame(flush);timer=setTimeout(flush,100);}});input.addEventListener('change',flush);}
presets.forEach((preset,i)=>$('preset-'+i).addEventListener('click',()=>{for(const k of Object.keys(defaults))$(k).value=preset.values[k];flush();}));
$('reset').addEventListener('click',()=>{for(const [k,v] of Object.entries(defaults))$(k).value=v;learningMode='normal';learningStepIndex=0;flush();});
$('play').addEventListener('click',()=>{if(pending!==null)flush();learningSelected=false;workView=false;if(playing){pause();paint();return;}autoComplete=false;applied=false;if(progress>=1)progress=0;if(reduced.matches){progress=Math.min(1,progress+.25);paint();return;}playing=true;lastTime=null;paint();animation=requestAnimationFrame(tick);});
$('replay').addEventListener('click',()=>{if(pending!==null)flush();pause();learningSelected=false;workView=false;autoComplete=false;applied=false;progress=0;paint();});
$('step').addEventListener('click',()=>{if(pending!==null)flush();pause();learningSelected=false;workView=false;autoComplete=false;applied=false;progress=progress>=1?0:Math.min(1,progress+.25);paint();});
$('recording').addEventListener('click',()=>{recording=!recording;$('showcase-root').setAttribute('data-recording',String(recording));$('recording').textContent=recording?'完整分析':'录屏布局';$('recording').setAttribute('aria-pressed',String(recording));});
$('analysis-view').addEventListener('click',()=>{pause();learningSelected=false;workView=false;analysisView=!analysisView;paint();});
$('work-view').addEventListener('click',()=>{pause();learningSelected=false;workView=true;analysisView=false;paint();});
$('process-view').addEventListener('click',()=>{pause();learningSelected=false;workView=false;analysisView=false;paint();});
$('auto-run').addEventListener('click',()=>{if(pending!==null)flush();update(true);autoComplete=true;learningSelected=false;workView=true;analysisView=false;paint();});
$('apply').addEventListener('click',()=>{if(!autoComplete||pending!==null)return;const job=automationResult(resultCache,paramsCache,progress);if(!job.recommendation)return;for(const [k,v] of Object.entries(job.recommendation))$(k).value=v;flush();autoComplete=true;applied=true;workView=true;analysisView=false;paint();});
$('learning-view').addEventListener('click',()=>{pause();learningSelected=true;paint();});
$('ml-step').addEventListener('change',()=>{learningStepIndex=Number($('ml-step').value);paint();});
for(const mode of ['normal','sparse','shift'])$('ml-mode-'+mode).addEventListener('click',()=>{pause();learningMode=mode;learningResult=null;learningApplied=false;learningSelected=true;paint();});
$('ml-run').addEventListener('click',()=>{if(pending!==null)flush();update(true);learningResult=learn(paramsCache,learningMode);learningSelected=true;paint();});
$('ml-apply').addEventListener('click',()=>{if(!learningResult||pending!==null||!learningResult.recommendation)return;for(const [k,v] of Object.entries(learningResult.recommendation))$(k).value=v;flush();learningResult=learn(paramsCache,learningMode);learningApplied=true;learningSelected=true;paint();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(pending!==null)flush();pause();paint();}});
const observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{inView=entries.some(e=>e.isIntersecting);if(!inView){pause();paint();}},{threshold:.01}):null;
if(observer)observer.observe($('showcase'));
window.addEventListener('pagehide',()=>{disposed=true;cancelInput();pause();if(observer)observer.disconnect();});
window.addEventListener('pageshow',()=>{disposed=false;inView=true;if(observer)observer.observe($('showcase'));paint();});
update();

})();
