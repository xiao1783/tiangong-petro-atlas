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

const defaults={age:200,wear:.2,trip:8,threshold:350},limits={age:[0,500],wear:[.05,.5],trip:[2,16],threshold:[100,600]};
function simulate(p,threshold){let age=p.age,progress=0,hours=0,drillHours=0,replacements=0;const trace=[[0,0]],segments=[];while(progress<600){if(age>=threshold){hours+=p.trip;replacements++;age=0;trace.push([hours,progress]);}const length=Math.min(threshold-age,600-progress),duration=(length+p.wear/200*((age+length)**2-age**2))/30;segments.push({startAge:age,length,duration});hours+=duration;drillHours+=duration;age+=length;progress+=length;trace.push([hours,progress]);}return {threshold,progress,hours,drillHours,replacements,trace,segments,rigCost:hours*6000,bitCost:replacements*60000,cost:hours*6000+replacements*60000};}
function calculate(p){const current=simulate(p,p.threshold),candidates=Array.from({length:21},(_,i)=>simulate(p,100+25*i)),best=candidates.reduce((a,b)=>b.cost<a.cost?b:a);return {current,candidates,best};}
function mechanism(r,p){return plot('钻头进尺越大，假设钻速越低',[{name:'教学衰减关系',points:Array.from({length:25},(_,i)=>[i*25,30/(1+p.wear*i*25/100)])}],'钻头累计进尺 m','钻速 m/h');}
function visualize(r,p){const a=r.current;return {charts:[plot('相同600 m任务：水平段表示更换停时',[{name:'当前阈值 '+p.threshold+'m',points:a.trace},{name:'最低成本 '+r.best.threshold+'m',points:r.best.trace,dash:true}],'累计时间 h','已完成进尺 m'),plot('21个阈值的未来任务总成本',[{name:'钻机时间与新钻头',points:r.candidates.map(t=>[t.threshold,t.cost/10000])}],'更换阈值 m','费用 万元')],metrics:[['当前总工时',fmt(a.hours,1)+' h'],['当前更换次数',a.replacements+' 次'],['当前任务费用',fmt(a.cost/10000,2)+' 万元'],['最低成本阈值',r.best.threshold+' m']],note:'所有策略完成同样600 m。网格最低费用 '+fmt(r.best.cost/10000,2)+' 万元；当前策略差额 '+fmt((a.cost-r.best.cost)/10000,2)+' 万元。最终完成任务后的起钻未计入，当前钻头已支付费用未重复计入。',detail:bars('当前策略费用拆分',[['钻机时间费用',a.rigCost/10000],['新钻头费用',a.bitCost/10000]],'万元；6000元/h、60000元/个均为教学假设')};}
function illustrate(r,p,n){if(n===1)return flow('统一剩余任务与费用边界',[['当前累计进尺',p.age+' m'],['共同剩余任务','600 m'],['只计未来费用','时间 + 新钻头']]);if(n===2)return mechanism(r,p);const v=visualize(r,p);return n===3?v.charts[0]:n===4?v.charts[1]:v.detail;}

const ml28Method='多特征岭回归 + 换钻策略搜索';
function ml28Features(row){const a=row.age/600,w=row.wear/.5;return [1,a,w,a*w,a*a];}
function ml28Reference(age,wear,shift=0){return 2.1+1.7*wear*age/100+.30*(age/300)**2+.55*wear+shift*4.2*(age/300)**2;}
function ml28Data(mode='normal'){
 const make=(prefix,count,seed,shift)=>{const random=rng(seed),rows=[];for(let g=0;g<count;g++){const wear=.05+.45*random(),offset=(random()-.5)*.32;for(let j=0;j<10;j++){const age=600*(j+random()*.35)/9.35;rows.push({group:prefix+'-'+(g+1),age,wear,minutes:ml28Reference(age,wear,shift)+offset+(random()-.5)*.10});}}return rows;};
 return {train:make('train-trip',mode==='sparse'?2:12,2801,0),test:make('test-trip',6,3801,mode==='shift'?1:0)};
}
function ml28Fit(train){return fit(train,ml28Features,row=>row.minutes);}
function ml28Predict(model,row){return Math.max(.5,predict(model,ml28Features(row)));}
function ml28Nominal(row){return 2*(1+row.wear*row.age/100);}
function ml28Simulate(p,threshold,minutesAt){
 let age=p.age,progress=0,hours=0,drillHours=0,replacements=0;const trace=[[0,0]],segments=[];
 while(progress<600){
  if(age>=threshold){hours+=p.trip;replacements++;age=0;trace.push([hours,progress]);}
  const length=Math.min(threshold-age,600-progress),slices=Math.max(1,Math.ceil(length/10)),dx=length/slices;let duration=0;
  for(let i=0;i<slices;i++)duration+=(minutesAt(age+i*dx)+minutesAt(age+(i+1)*dx))*dx/120;
  segments.push({startAge:age,length,duration});hours+=duration;drillHours+=duration;age+=length;progress+=length;trace.push([hours,progress]);
 }
 return {threshold,progress,hours,drillHours,replacements,trace,segments,rigCost:hours*6000,bitCost:replacements*60000,cost:hours*6000+replacements*60000};
}
function ml28Decision(model,p){
 const run=threshold=>ml28Simulate(p,threshold,age=>ml28Predict(model,{age,wear:p.wear})),candidates=Array.from({length:21},(_,i)=>run(100+i*25)),current=run(p.threshold),best=candidates.reduce((a,b)=>b.cost<a.cost?b:a);
 return {current,candidates,best};
}
function learn(p,mode='normal'){
 const {train,test}=ml28Data(mode),model=ml28Fit(train),predictions=test.map(row=>ml28Predict(model,row)),baseline=test.map(ml28Nominal),decision=ml28Decision(model,p);
 const error={model:mae(test.map(row=>row.minutes),predictions),baseline:mae(test.map(row=>row.minutes),baseline),unit:'min/m'};
 // This reference audit is intentionally separate and never enters training or candidate selection.
 const auditCandidates=Array.from({length:21},(_,i)=>ml28Simulate(p,100+i*25,age=>ml28Reference(age,p.wear,mode==='shift'?1:0))),auditBest=auditCandidates.reduce((a,b)=>b.cost<a.cost?b:a),auditChosen=auditCandidates.find(row=>row.threshold===decision.best.threshold);
 const split={trainGroups:new Set(train.map(row=>row.group)).size,testGroups:6,trainSamples:train.length,testSamples:test.length};
 return {method:ml28Method,mode,split,model,train,test,predictions,baseline,error,...decision,auditCandidates,auditBest,auditChosen,
  recommendation:{threshold:decision.best.threshold},
  metrics:[['训练 / 测试趟次',split.trainGroups+' / '+split.testGroups],['测试MAE：学习 / 固定',fmt(error.model,3)+' / '+fmt(error.baseline,3)],['预测最低费用阈值',decision.best.threshold+' m'],['推荐预测费用',fmt(decision.best.cost/10000,2)+' 万元']],
  note:'按趟次隔离的教学合成记录；预测只用累计进尺与已知衰减工况。测试真值仅用于离线复核，不进入策略搜索。'+(mode==='shift'?'地层偏移只改变测试与复核真值，训练模型保持不变。':'固定公式为对照；误差和费用差不代表现场效果。')};
}
function ml28Text(x,y,s,size=15,attrs=''){return text(x,y,s,size,attrs);}
function ml28SVG(title,body,h=500){return '<svg class="chart learning-chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 '+h+'" role="img" aria-label="'+esc(title)+'"><title>'+esc(title)+'</title><g fill="var(--ink)" font-family="system-ui,Microsoft YaHei,sans-serif">'+body+'</g></svg>';}
function ml28Panel(x,y,w,h){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="14" fill="var(--paper-2)" stroke="var(--line)"/>';}
function ml28Axes(x,y,w,h,xmax,ymax,xlabel,ylabel){
 let b=ml28Text(x,y-12,ylabel,13,'fill="var(--ink-2)"');for(let i=0;i<4;i++){const yy=y+h-h*i/3;b+='<path d="M'+x+' '+yy+'h'+w+'" stroke="var(--line)"/>'+ml28Text(x-9,yy+4,fmt(ymax*i/3,1),12,'text-anchor="end"');}
 for(let i=0;i<4;i++)b+=ml28Text(x+w*i/3,y+h+21,fmt(xmax*i/3,0),12,'text-anchor="middle"');
 return b+ml28Text(x+w,y+h+43,xlabel,13,'text-anchor="end" fill="var(--ink-2)"');
}
function ml28Path(points,x,y,w,h,xmax,ymax,color,dash=false){return '<path d="'+points.map((q,i)=>(i?'L':'M')+fmt(x+w*q[0]/xmax)+' '+fmt(y+h-h*q[1]/ymax)).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="2.5"'+(dash?' stroke-dasharray="6 4"':'')+'/>';}
function ml28Legend(x,y,label,color,dash=false){return '<path d="M'+x+' '+(y-5)+'h23" stroke="'+color+'" stroke-width="2.5"'+(dash?' stroke-dasharray="6 4"':'')+'/>'+ml28Text(x+30,y,label,13,'fill="var(--ink-2)"');}
function professionalBackground(p){
 const blue='var(--c-opt,#2875c7)',orange='var(--clay,#b96b35)',green='var(--jade)',stages=['正在钻进','起钻至地面','地面更换钻头','下钻回井底','恢复钻进'],bitY=[270,222,155,222,270];
 let b=ml28Text(24,34,'换钻头，要把钻具从井底提到地面，再送回井底',24,'font-weight="700"')+ml28Text(24,65,'新钻头有助于恢复钻速，但整趟起下钻期间不能增加进尺。',17,'fill="var(--ink-2)"');
 stages.forEach((stage,i)=>{const x=24+i*195,c=x+88,color=i===2?orange:i>2?green:blue;b+=ml28Panel(x,89,172,225)+ml28Text(c,119,(i+1)+' / '+stage,18,'text-anchor="middle" font-weight="650"');b+='<path d="M'+(x+19)+' 177h134" stroke="var(--ink-2)" stroke-width="2"/><path d="M'+(c-12)+' 178v101h24V178" fill="none" stroke="var(--line)" stroke-width="7"/><path d="M'+(c-19)+' 171l19-34 19 34m-30-12h22m-17-12h12" fill="none" stroke="var(--ink-2)" stroke-width="2"/><path d="M'+c+' 170V'+bitY[i]+'" stroke="'+color+'" stroke-width="4"/><path d="M'+(c-8)+' '+(bitY[i]-5)+'h16v10l-8 6-8-6Z" fill="'+color+'"/>'+ml28Text(x+10,194,'地面',12,'fill="var(--ink-2)"')+ml28Text(c,301,i===2?'旧钻头 → 新钻头':i===1?'钻具上提':i===3?'钻具下放':'钻头接触井底',14,'text-anchor="middle"');if(i===1||i===3){const ay=i===1?247:197,by=i===1?204:247;b+='<path d="M'+(c+32)+' '+ay+'V'+by+'m-5 '+(i===1?6:-6)+' 5 '+(i===1?-6:6)+' 5 '+(i===1?6:-6)+'" fill="none" stroke="'+orange+'" stroke-width="3"/>';}if(i<4)b+='<path d="M'+(x+176)+' 228h15m-5-5 5 5-5 5" fill="none" stroke="var(--ink-2)" stroke-width="2"/>';});
 b+='<g data-trip-hours="'+p.trip+'" data-new-progress="0"><path d="M219 325v12h562v-12" fill="none" stroke="'+orange+'" stroke-width="2"/>'+ml28Text(500,363,'起钻 + 换头 + 下钻：合计停时 '+p.trip+' h · 新增进尺 0 m',21,'text-anchor="middle" font-weight="650" fill="'+orange+'"')+'</g>';
 const fresh=ml28Nominal({age:0,wear:p.wear}),old=ml28Nominal({age:p.age,wear:p.wear}),max=Math.max(fresh,old)*1.15;b+=ml28Text(24,402,'同等工况下，每钻1米需要多久？',20,'font-weight="650"');[['新钻头',fresh,green],['当前 '+p.age+' m钻头',old,blue]].forEach(([label,value,color],i)=>{const y=422+i*43;b+=ml28Text(24,y+19,label,16)+box(195,y,220*value/max,25,color)+ml28Text(435,y+19,fmt(value,2)+' min/m',17);});
 b+=ml28Text(610,414,'继续钻：少停工，但旧钻头可能更慢',18)+ml28Text(610,452,'现在换：恢复钻速，但要付出停时和钻头费',17)+ml28Text(610,491,'学习历史耗时，再比较整个任务的费用',18,'font-weight="650" fill="var(--jade)"')+ml28Text(24,540,'位置与结构为概念示意，非比例；耗时对比采用原教学公式，未给三个子阶段分配工时。',15,'fill="var(--ink-2)"');
 return ml28SVG('钻头更换的完整起下钻过程与停工代价',b,560);
}
function ml28FitEvidence(r){
 const group=r.train[0].group,rows=r.train.filter(row=>row.group===group).map(row=>{const predicted=ml28Predict(r.model,row);return {...row,predicted,residual:row.minutes-predicted};}),point=rows.reduce((a,b)=>Math.abs(a.residual)>Math.abs(b.residual)?a:b);
 return {group,rows,point,wear:rows[0].wear,sumSquares:r.train.reduce((s,row)=>s+(row.minutes-ml28Predict(r.model,row))**2,0),penalty:.001*r.model.slice(1).reduce((s,v)=>s+v*v,0)};
}
function ml28SliceEvidence(r,p){
 const first=r.best.segments[0],width=first.length/Math.max(1,Math.ceil(first.length/10)),left=ml28Predict(r.model,{age:first.startAge,wear:p.wear}),right=ml28Predict(r.model,{age:first.startAge+width,wear:p.wear});
 return {age:first.startAge,width,left,right,hours:(left+right)*width/120};
}
function ml28ErrorPlot(r,x,y,w,h){
 const max=Math.max(...r.test.map(row=>row.minutes),...r.predictions,...r.baseline)*1.07;
 let b=ml28Axes(x,y,w,h,max,max,'合成测试耗时 min/m','模型预测 min/m')+ml28Path([[0,0],[max,max]],x,y,w,h,max,max,'var(--ink-2)',true);
 r.test.forEach((row,i)=>{b+='<circle cx="'+fmt(x+w*row.minutes/max)+'" cy="'+fmt(y+h-h*r.predictions[i]/max)+'" r="3.3" fill="var(--jade)" fill-opacity=".65"><title>'+esc(row.group+'：真值 '+fmt(row.minutes,3)+'，预测 '+fmt(r.predictions[i],3))+'</title></circle>';});return b;
}
function learningView(r,p){
 let b=ml28Text(24,34,'从钻头趟次学习，再决定何时更换',25,'font-weight="700"');
 if(!r){
  b+=ml28Text(24,65,'点击训练：用历史进尺与耗时学习衰减，再在相同600米任务下比较策略。',16,'fill="var(--ink-2)"');
  [['历史趟次','累计进尺 + 工况 → 每米耗时'],['回归学习','拟合系数；独立趟次检验误差'],['换钻决策','预测21种阈值的工时与费用']].forEach((a,i)=>{const x=24+i*325;b+=ml28Panel(x,97,301,238)+ml28Text(x+20,132,'0'+(i+1)+' / '+a[0],20,'font-weight="650"')+ml28Text(x+20,172,a[1],16);if(i===0){for(let j=0;j<5;j++)b+='<rect x="'+(x+24+j*49)+'" y="'+(280-j*14)+'" width="30" height="'+(25+j*14)+'" rx="3" fill="var(--jade)" fill-opacity="'+(.25+j*.13)+'"/>';}else if(i===1)b+='<path d="M'+(x+26)+' 295Q'+(x+150)+' 272 '+(x+270)+' 215" fill="none" stroke="var(--jade)" stroke-width="4"/>';else b+=ml28Text(x+22,269,'待训练 · 待验证',29,'font-weight="650" fill="var(--jade)"');});
  b+=ml28Text(24,377,'学什么：累计进尺与已知衰减工况，如何影响单位进尺耗时。',19,'font-weight="600"')+ml28Text(24,415,'如何检验：完整趟次留出；比较学习模型与固定衰减公式的预测误差。',16)+ml28Text(24,452,'记录与真值均为教学合成；算法不下达现场起钻指令。',15,'fill="var(--ink-2)"');return ml28SVG('钻头衰减模型学习导览',b);
 }
 const curve=Array.from({length:25},(_,i)=>({age:i*25,wear:p.wear})),learned=curve.map(row=>[row.age,ml28Predict(r.model,row)]),fixed=curve.map(row=>[row.age,ml28Nominal(row)]),ymax=Math.max(...learned.map(t=>t[1]),...fixed.map(t=>t[1]))*1.1;
 b+=ml28Text(24,62,r.method+' · '+r.split.trainGroups+'趟训练 / 6趟测试 · 当前工况 '+p.wear,15,'fill="var(--ink-2)"');
 b+=ml28Panel(24,80,466,263)+ml28Panel(508,80,468,263)+ml28Text(42,109,'学到的衰减关系',18,'font-weight="650"')+ml28Text(527,109,'独立测试：散点越接近虚线越准',17,'font-weight="650"');
 b+=ml28Axes(74,143,384,125,600,ymax,'钻头累计进尺 m','单位进尺耗时 min/m')+ml28Path(learned,74,143,384,125,600,ymax,'var(--jade)')+ml28Path(fixed,74,143,384,125,600,ymax,'var(--c-opt,#2875c7)',true)+ml28Legend(74,327,'学习模型','var(--jade)')+ml28Legend(246,327,'原固定公式','var(--c-opt,#2875c7)',true);
 b+=ml28ErrorPlot(r,568,143,374,125);
 r.metrics.forEach((m,i)=>{const x=24+i*241;b+=ml28Panel(x,358,229,73)+ml28Text(x+13,382,m[0],13,'fill="var(--ink-2)"')+ml28Text(x+13,415,m[1],m[1].length>15?19:23,'font-weight="700"');});
 b+=ml28Text(24,456,'离线复核：推荐阈值的合成参考费用 '+fmt(r.auditChosen.cost/10000,2)+' 万元；参考网格最低阈值 '+r.auditBest.threshold+' m。',15,'fill="var(--ink-2)"')+ml28Text(24,483,r.mode==='shift'?'地层响应已偏移，模型没有重训；推荐仍基于旧模型，误差可能改变决策。':'测试MAE单位为 min/m；合成参考只在推荐完成后复核，不参与候选选择。',14,'fill="var(--ink-2)"');
 return ml28SVG('钻头衰减学习、独立验证与换钻推荐',b);
}
function learningStep(r,p,n){
 if(!r)return learningView(null,p);
 if(n===1){let b=ml28Text(24,34,'完整趟次分开：避免把同一钻头记录拆到两边',24,'font-weight="700"')+ml28Text(24,66,'每列是一趟钻头，点为该趟10条进尺记录；训练组与测试组编号不重合。',16,'fill="var(--ink-2)"');[['训练',r.train,'var(--jade)',24],['测试',r.test,'var(--c-opt,#2875c7)',512]].forEach(([name,rows,color,x])=>{b+=ml28Panel(x,90,464,306)+ml28Text(x+20,124,name+'：'+new Set(rows.map(t=>t.group)).size+'趟 / '+rows.length+'条',21,'font-weight="650"');const groups=[...new Set(rows.map(t=>t.group))];groups.forEach((g,i)=>{const cx=x+25+i*415/Math.max(groups.length-1,1);for(let j=0;j<10;j++)b+='<circle cx="'+cx+'" cy="'+(157+j*21)+'" r="5" fill="'+color+'"/>';});});return ml28SVG('按钻头趟次隔离训练与测试',b+ml28Text(24,443,'测试标签不会进入回归拟合；地层偏移模式保持训练记录与模型系数不变。',17));}
 if(n===2){
  const e=ml28FitEvidence(r),curve=Array.from({length:25},(_,i)=>[i*25,ml28Predict(r.model,{age:i*25,wear:e.wear})]),max=Math.max(...e.rows.map(t=>t.minutes),...curve.map(t=>t[1]))*1.12,X=a=>80+540*a/600,Y=t=>338-205*t/max,q=e.point;
  let b=ml28Text(24,34,'看见训练点与曲线之间的差，理解模型如何学习',24,'font-weight="700"')+ml28Text(24,66,'示例 '+e.group+' · 固定同一工况 w='+fmt(e.wear,3)+'；拟合使用全部'+r.split.trainGroups+'个训练趟次。',16,'fill="var(--ink-2)"')+ml28Axes(80,133,540,205,600,max,'累计进尺 m','每米耗时 min/m')+ml28Path(curve,80,133,540,205,600,max,'var(--jade)');
  e.rows.forEach(t=>{b+='<g data-fit-age="'+t.age+'" data-observed="'+t.minutes+'" data-predicted="'+t.predicted+'" data-residual="'+t.residual+'"><path d="M'+fmt(X(t.age))+' '+fmt(Y(t.minutes))+'V'+fmt(Y(t.predicted))+'" stroke="var(--clay,#b96b35)" stroke-width="3"/><circle cx="'+fmt(X(t.age))+'" cy="'+fmt(Y(t.minutes))+'" r="5" fill="var(--c-opt,#2875c7)"/>'+ (t===q?'<circle cx="'+fmt(X(t.age))+'" cy="'+fmt(Y(t.minutes))+'" r="10" fill="none" stroke="var(--clay,#b96b35)" stroke-width="2"/>':'')+'</g>';});
  b+=ml28Legend(80,408,'训练观测点','var(--c-opt,#2875c7)')+ml28Legend(280,408,'同工况预测曲线','var(--jade)')+ml28Legend(490,408,'残差','var(--clay,#b96b35)');
  const observedY=q.residual>=0?180:251,predictedY=q.residual>=0?251:180;b+=ml28Panel(690,92,286,320)+ml28Text(710,124,'放大一个点的拟合残差',19,'font-weight="650"')+ml28Text(710,153,'累计进尺 '+fmt(q.age,1)+' m',15,'fill="var(--ink-2)"')+'<path d="M725 '+observedY+'V'+predictedY+'" stroke="var(--clay,#b96b35)" stroke-width="3"/><circle cx="725" cy="'+observedY+'" r="6" fill="var(--c-opt,#2875c7)"/><circle cx="725" cy="'+predictedY+'" r="6" fill="var(--jade)"/>'+ml28Text(744,observedY+6,'观测 '+fmt(q.minutes,3),18)+ml28Text(744,predictedY+6,'预测 '+fmt(q.predicted,3),18)+ml28Text(710,299,'观测 − 预测 =',17)+ml28Text(710,337,(q.residual>=0?'+':'')+fmt(q.residual,3)+' min/m',27,'font-weight="700" fill="var(--clay,#b96b35)"')+ml28Text(710,380,'局部放大，不沿用主图纵轴尺度',14,'fill="var(--ink-2)"');
  b+='<path d="M24 432H976" stroke="var(--line)"/>'+ml28Text(24,462,'全部训练点的残差平方和',18)+ml28Text(315,464,fmt(e.sumSquares,3),25,'font-weight="650"')+ml28Text(447,462,'+ 系数正则项',18)+ml28Text(632,464,fmt(e.penalty,3),25,'font-weight="650"')+ml28Text(760,462,'→ 求解5个系数',18,'font-weight="650"')+ml28Text(24,510,'特征为归一化进尺 a、已知工况 w、a×w、a²；岭回归在拟合残差与系数大小之间取舍。',17,'fill="var(--ink-2)"');
  return ml28SVG('钻头耗时回归：同等工况拟合与残差学习',b,540);
 }
 if(n===3){let b=ml28Text(24,34,'用未参与训练的6个趟次检验预测',24,'font-weight="700"')+ml28ErrorPlot(r,86,106,505,270)+ml28Panel(673,88,303,314)+ml28Text(694,122,'测试平均绝对误差',19,'font-weight="650"');const max=Math.max(r.error.model,r.error.baseline,.001);[['学习模型',r.error.model,'var(--jade)'],['固定公式',r.error.baseline,'var(--c-opt,#2875c7)']].forEach(([label,value,color],i)=>{const y=165+i*101;b+=ml28Text(694,y,label,17)+box(694,y+15,220*value/max,24,color)+ml28Text(694,y+67,fmt(value,3)+' min/m',22,'font-weight="650"');});return ml28SVG('钻头耗时预测独立验证',b+ml28Text(24,469,r.mode==='shift'?'地层偏移测试：新地层衰减加快，学习模型沿用原系数。':'固定公式与学习模型使用相同测试行；误差越小越好，不使用训练误差替代。',16));}
 if(n===4){
  const plan=r.best,max=Math.max(...r.candidates.map(t=>t.cost/10000))*1.1,points=r.candidates.map(t=>[t.threshold,t.cost/10000]),slice=ml28SliceEvidence(r,p);
  let b=ml28Text(24,34,'每米耗时怎样变成一次换钻决策？',25,'font-weight="700"')+ml28Text(24,65,'相同600 m任务 · 比较21种阈值 · 推荐 '+plan.threshold+' m · 以下计算只读取模型预测',17,'fill="var(--ink-2)"')+ml28Panel(24,86,502,248)+ml28Panel(544,86,432,248)+ml28Text(42,115,'21种候选的预测费用',18,'font-weight="650"')+ml28Text(563,115,'推荐方案：分段累计进尺',18,'font-weight="650"');
  b+=ml28Axes(78,153,410,120,600,max,'更换阈值 m','预测总费用 万元')+ml28Path(points,78,153,410,120,600,max,'var(--jade)');r.candidates.forEach(t=>{b+='<circle cx="'+fmt(78+410*t.threshold/600)+'" cy="'+fmt(273-120*t.cost/10000/max)+'" r="'+(t===plan?7:3.5)+'" fill="'+(t===plan?'var(--c-opt,#2875c7)':'var(--jade)')+'"/>';});
  b+=ml28Axes(602,153,334,120,plan.hours,600,'累计时间 h','已完成进尺 m');for(let i=1;i<plan.trace.length;i++){const a=plan.trace[i-1],z=plan.trace[i],trip=z[1]===a[1];b+='<g data-phase="'+(trip?'trip':'drill')+'" data-hours="'+(z[0]-a[0])+'" data-start-progress="'+a[1]+'" data-end-progress="'+z[1]+'">'+ml28Path([a,z],602,153,334,120,plan.hours,600,trip?'var(--clay,#b96b35)':'var(--jade)')+'</g>';}
  b+=ml28Text(820,115,'橙色：停时',14,'fill="var(--ink-2)"');
  const areaMax=Math.max(slice.left,slice.right)*1.15,ly=481-70*slice.left/areaMax,ry=481-70*slice.right/areaMax;
  b+=ml28Text(24,366,'① 每小段用梯形面积累计时间',18,'font-weight="650"')+'<g data-slice-width="'+slice.width+'" data-left-minutes="'+slice.left+'" data-right-minutes="'+slice.right+'" data-slice-hours="'+slice.hours+'"><path d="M80 481V'+ly+'L285 '+ry+'V481Z" fill="var(--jade)" fill-opacity=".18" stroke="var(--jade)" stroke-width="2"/><path d="M68 481h230" stroke="var(--ink-2)"/>'+ml28Text(80,ly-10,fmt(slice.left,3),15)+ml28Text(285,ry-10,fmt(slice.right,3),15,'text-anchor="end"')+ml28Text(183,503,'Δ进尺 '+fmt(slice.width,2)+' m',15,'text-anchor="middle"')+ml28Text(80,388,'每米耗时 min/m',13,'fill="var(--ink-2)"')+'</g>';
  b+=ml28Text(350,366,'② 全部小段累计，再加入更换停时',18,'font-weight="650"')+ml28Text(350,408,fmt(plan.drillHours,2)+' h',29,'font-weight="700" fill="var(--jade)"')+ml28Text(540,407,'+ '+plan.replacements+' × '+p.trip+' h',25,'font-weight="650" fill="var(--clay,#b96b35)"')+ml28Text(756,408,'= '+fmt(plan.hours,2)+' h',29,'font-weight="700"')+ml28Text(350,439,'钻进时间',15)+ml28Text(540,439,'更换次数 × 单次停时',15)+ml28Text(756,439,'任务总工时',15);
  b+=ml28Text(350,484,'③ '+fmt(plan.hours,2)+' h × 0.6 万元/h + '+plan.replacements+' × 6 万元',18)+ml28Text(350,518,'≈ '+fmt(plan.cost/10000,2)+' 万元预测总费用',24,'font-weight="650" fill="var(--jade)"')+ml28Text(24,530,'本小段：('+fmt(slice.left,3)+' + '+fmt(slice.right,3)+') ÷ 2',14)+ml28Text(24,553,'× '+fmt(slice.width,2)+' m ÷ 60 ≈ '+fmt(slice.hours,3)+' h',14)+ml28Text(350,550,'进尺曲线连接分段端点；所有候选均完成600 m，参考真值不参与搜索。',14,'fill="var(--ink-2)"');
  return ml28SVG('预测每米耗时、分段累计时间与换钻费用搜索',b,575);
 }
 const plans=[r.current,r.best,r.auditChosen],labels=['人工阈值：模型预测','推荐阈值：模型预测','推荐阈值：参考复核'],max=Math.max(...plans.map(t=>t.cost))/10000*1.12;
 let b=ml28Text(24,34,'拆开每一项费用，核查预测与参考差在哪里',24,'font-weight="700"')+ml28Text(24,66,'前两行用于方案比较；第三行在推荐完成后读取合成参考，不能反过来参与推荐。',16,'fill="var(--ink-2)"');
 plans.forEach((plan,i)=>{const y=104+i*105,w1=510*plan.rigCost/10000/max,w2=510*plan.bitCost/10000/max;b+='<g data-cost-row="'+i+'" data-rig-cost="'+plan.rigCost+'" data-bit-cost="'+plan.bitCost+'" data-total-cost="'+plan.cost+'">'+ml28Text(24,y+26,labels[i],17)+box(253,y,w1,35,'var(--jade)')+box(253+w1,y,w2,35,'var(--c-opt,#2875c7)')+ml28Text(958,y+27,fmt(plan.cost/10000,2)+' 万元',23,'text-anchor="end" font-weight="650"')+ml28Text(253,y+61,'时间 '+fmt(plan.rigCost/10000,2)+' + 钻头 '+fmt(plan.bitCost/10000,2)+' = '+fmt(plan.cost/10000,2)+' 万元',17)+ml28Text(253,y+85,fmt(plan.hours,2)+' h × 0.6 万元/h + '+plan.replacements+' × 6 万元；阈值 '+plan.threshold+' m',15,'fill="var(--ink-2)"')+'</g>';});
 const delta=r.auditChosen.cost-r.best.cost;b+=ml28Legend(253,439,'钻机时间费用','var(--jade)')+ml28Legend(540,439,'新钻头费用','var(--c-opt,#2875c7)')+'<path d="M24 453H976" stroke="var(--line)"/>'+ml28Text(24,486,'同一推荐阈值 '+r.best.threshold+' m：参考 − 预测 = '+(delta>=0?'+':'')+fmt(delta/10000,2)+' 万元',23,'font-weight="650" fill="var(--clay,#b96b35)"')+ml28Text(24,526,'合成参考的网格最低阈值为 '+r.auditBest.threshold+' m。差值是模型偏差，不能解释为现场节约。',17,'fill="var(--ink-2)"');return ml28SVG('换钻推荐的成本算式、组成与预测偏差',b,550);
}

function sv28Frame(plan,p,time){
 let replacements=0,segment=0;
 for(let i=1;i<plan.trace.length;i++){
  const a=plan.trace[i-1],b=plan.trace[i],drilling=b[1]>a[1];
  if(time<b[0]){
   const elapsed=Math.max(0,time-a[0]),fraction=clamp(elapsed/(b[0]-a[0]),0,1);
   if(!drilling)return {progress:a[1],tool:a[1]*Math.abs(2*fraction-1),replacements,stage:fraction<.45?'起钻中':fraction<.55?'更换钻头':'下钻中',trip:true,elapsed:time};
   const s=plan.segments[segment],B=1+p.wear*s.startAge/100;
   const length=60*elapsed/(B+Math.sqrt(B*B+.6*p.wear*elapsed));
   return {progress:a[1]+Math.min(s.length,length),tool:a[1]+Math.min(s.length,length),replacements,stage:'正在钻进',trip:false,elapsed:time};
  }
  if(drilling)segment++;else replacements++;
 }
 return {progress:600,tool:600,replacements,stage:'任务完成',trip:false,elapsed:plan.hours};
}
function sv28SVG(label,body,height){return '<svg class="chart sv28" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 '+height+'" role="img" aria-label="'+esc(label)+'"><title>'+esc(label)+'</title><g fill="var(--ink,#202b38)" font-family="system-ui,Microsoft YaHei,sans-serif">'+body+'</g></svg>';}
function showcase(r,p,progress){
 const time=clamp(progress,0,1)*Math.max(r.current.hours,r.best.hours),plans=[r.current,r.best],colors=['#2875c7','#168273'];
 let b=text(24,34,'同一时刻，哪种策略推进得更快？',24,'font-weight="700"')+text(976,34,'回放时刻 '+fmt(time,1)+' h',21,'text-anchor="end" font-weight="600"');
 plans.forEach((plan,i)=>{
  const x=20+i*490,color=colors[i],state=sv28Frame(plan,p,time),depth=135+state.progress/600*215,tool=135+state.tool/600*215;
  b+=box(x,58,470,358,'var(--card,#fff)')+'<rect x="'+x+'" y="58" width="470" height="358" rx="12" fill="none" stroke="var(--line,#dfe6f0)"/>';
  b+=text(x+20,89,i?'算法搜索结果':'人工设定示例',20,'font-weight="650" fill="'+color+'"')+text(x+450,89,'阈值 '+plan.threshold+' m',16,'text-anchor="end"');
  b+='<path d="M'+(x+27)+' 133H'+(x+173)+'V351H'+(x+27)+'Z" fill="#b59c76" opacity=".15"/>';
  for(let j=0;j<4;j++)b+='<path d="M'+(x+27)+' '+(160+j*49)+'h146" stroke="#ac8e65" stroke-opacity=".3" stroke-width="14"/>';
  b+='<path d="M'+(x+61)+' 132l27-34 27 34m-42-14h30m-21-12h12" stroke="var(--ink-2,#52627a)" stroke-width="3" fill="none"/>';
  b+='<path d="M'+(x+89)+' 134V350" stroke="var(--line,#dfe6f0)" stroke-width="19"/><path d="M'+(x+89)+' 135V'+depth+'" stroke="'+color+'" stroke-opacity=".3" stroke-width="16"/>';
  b+='<path d="M'+(x+89)+' 132V'+tool+'" stroke="'+color+'" stroke-width="4"/><path d="M'+(x+80)+' '+(tool-6)+'h18v10l-9 6-9-6Z" fill="'+(state.trip?'#d47a3a':color)+'"/>';
  b+=text(x+125,143,'0 m',14)+text(x+125,354,'600 m',14)+text(x+27,386,'剩余任务进尺示意',14,'fill="var(--ink-2,#52627a)"');
  b+=text(x+202,136,state.stage,18,'font-weight="650" fill="'+(state.trip?'#c06a27':color)+'"')+text(x+202,188,fmt(state.progress,0)+' m',40,'font-weight="700"')+text(x+202,216,'已完成 / 600 m',15,'fill="var(--ink-2,#52627a)"');
  b+=text(x+202,253,'已完成更换 '+state.replacements+' 次',17)+text(x+202,281,'累计用时 '+fmt(state.elapsed,1)+' h',17);
  b+='<path d="M'+(x+202)+' 302h245" stroke="var(--line,#dfe6f0)"/>'+text(x+202,329,'全任务费用（预先计算）',14,'fill="var(--ink-2,#52627a)"')+text(x+202,365,fmt(plan.cost/10000,2)+' 万元',28,'font-weight="700"');
 });
 b+=text(24,445,'蓝色：当前策略   绿色：最低成本策略   橙色钻头：起下钻，不增加进尺',16,'fill="var(--ink-2,#52627a)"')+text(24,476,'两种策略使用同一时钟；钻进按衰减模型积分，起下钻位置为过程示意。',15,'fill="var(--ink-2,#52627a)"');
 return sv28SVG('钻头更换策略同步回放',b,500);
}
function showcaseAnalysis(r,p){
 const plans=[r.current,r.best],costMax=Math.max(...plans.map(t=>t.cost))/10000*1.12,timeMax=Math.max(...plans.map(t=>t.hours))*1.12,X=175,width=650;
 let b=text(24,32,'费用从哪里来，时间花在哪里？',24,'font-weight="700"')+text(24,64,'费用组成 · 万元',16,'font-weight="600"');
 b+='<rect x="650" y="49" width="17" height="17" rx="3" fill="#2875c7"/>'+text(674,63,'钻机时间',14)+'<rect x="804" y="49" width="17" height="17" rx="3" fill="#d47a3a"/>'+text(828,63,'新钻头',14);
 plans.forEach((t,i)=>{const y=91+i*79,w1=width*(t.rigCost/10000)/costMax,w2=width*(t.bitCost/10000)/costMax;
  b+=text(24,y+27,i?'最低成本策略':'当前策略',17,'font-weight="600"')+box(X,y,width,37,'var(--paper-2,#eaf0f7)')+'<rect x="'+X+'" y="'+y+'" width="'+w1+'" height="37" fill="#2875c7"/><rect x="'+(X+w1)+'" y="'+y+'" width="'+w2+'" height="37" fill="#d47a3a"/>'+text(975,y+27,fmt(t.cost/10000,2),21,'text-anchor="end" font-weight="700"');
  b+=text(X,y+59,'时间 '+fmt(t.rigCost/10000,2)+' + 钻头 '+fmt(t.bitCost/10000,2)+' = '+fmt(t.cost/10000,2)+' 万元',15,'fill="var(--ink-2,#52627a)"');
 });
 b+='<path d="M24 247H976" stroke="var(--line,#dfe6f0)"/>'+text(24,279,'工时组成 · 小时',16,'font-weight="600"');
 b+='<rect x="650" y="265" width="17" height="17" rx="3" fill="#168273"/>'+text(674,279,'有效钻进',14)+'<rect x="804" y="265" width="17" height="17" rx="3" fill="#ad5975"/>'+text(828,279,'更换停时',14);
 plans.forEach((t,i)=>{const y=302+i*58,w1=width*t.drillHours/timeMax,w2=width*(t.hours-t.drillHours)/timeMax;
  b+=text(24,y+25,i?'最低成本策略':'当前策略',17,'font-weight="600"')+box(X,y,width,34,'var(--paper-2,#eaf0f7)')+'<rect x="'+X+'" y="'+y+'" width="'+w1+'" height="34" fill="#168273"/><rect x="'+(X+w1)+'" y="'+y+'" width="'+w2+'" height="34" fill="#ad5975"/>'+text(975,y+25,fmt(t.hours,1)+' h',21,'text-anchor="end" font-weight="700"');
 });
 b+=text(24,435,'两区分别使用万元和小时刻度；总费用 = 总工时 × 6000 元/h + 新钻头数 × 60000 元。',15,'fill="var(--ink-2,#52627a)"');
 return sv28SVG('当前策略与最低成本策略的费用和工时分解',b,458);
}

const automationScene="d28";const roles={"title":"自动比选，接手换钻策略重复核算","subtitle":"人工设定一个换钻阈值；算法枚举21种策略，在相同600米任务下比较工时、更换次数与总费用。","manual":"试选更换阈值，逐段核算钻进与停工费用","automatic":"模拟21种策略，统一核算并给出最低费用候选","review":"核实地层、寿命与安全条件，再决定作业方案","method":"有限策略搜索","action":"自动比较21种策略","applyLabel":"将建议填入参数","steps":["保持任务与初始条件一致，枚举100—600米范围内的21个更换阈值。","分别模拟钻进和起下钻，累计工时、更换次数与新钻头费用。","按完整任务总费用选择网格最低候选，展示与人工设定示例的差异。"],"limits":"这里展示替代方案遍历和成本核算的智能优化流程。人工设定仅是可调示例，费用差来自教学假设，不是现场收益或人类能力评测；模型没有覆盖突发失效与安全硬约束，不自动下达起钻指令。"};

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

const presets=[{"label":"基准方案","description":"350 m更换阈值，对比网格最低费用策略。","values":{"age":200,"wear":0.2,"trip":8,"threshold":350}},{"label":"频繁更换","description":"100 m阈值、12小时换钻，让停时的代价显现。","values":{"age":200,"wear":0.2,"trip":12,"threshold":100}},{"label":"磨损加快","description":"衰减提高至0.5；观察提前换钻是否更有价值。","values":{"age":350,"wear":0.5,"trip":3,"threshold":600}}];
const api={defaults,limits,calculate,visualize,mechanism,illustrate,showcase,showcaseAnalysis,presets,automationResult,automationView,roles,learn,learningView,learningStep,professionalBackground,simulate};
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
