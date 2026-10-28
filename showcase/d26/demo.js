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

const defaults={solids:8,cut:100,limit:3,price:600},limits={solids:[2,15],cut:[40,200],limit:[1,8],price:[100,1500]};
function evaluate(p,cut){const sizes=[20,50,100,200,400],weights=[.12,.2,.28,.25,.15],solid=p.solids,liquid=100-solid;
 const fractions=sizes.map((d,i)=>({d,input:solid*weights[i],eff:d*d/(d*d+cut*cut)}));
 const removed=fractions.reduce((s,t)=>s+t.input*t.eff,0),lost=liquid*(.01+.06*(200-cut)/160),retained=solid-removed,recovered=liquid-lost,concentration=100*retained/(retained+recovered);
 return {cut,fractions,solid,liquid,removed,lost,retained,recovered,concentration,cost:removed*80+lost*p.price,feasible:concentration<=p.limit};}
function calculate(p){const current=evaluate(p,p.cut),candidates=Array.from({length:17},(_,i)=>evaluate(p,40+i*10)),eligible=candidates.filter(t=>t.feasible),best=eligible.reduce((a,b)=>!a||b.cost<a.cost?b:a,null);return {current,candidates,eligible,best};}
function mechanism(r,p){const a=r.current;let b=box(35,90,170,155)+text(120,125,'入口 100 m³',18,'text-anchor="middle"')+text(120,163,'钻屑 '+fmt(a.solid,1)+' m³',14,'text-anchor="middle"')+text(120,197,'液体 '+fmt(a.liquid,1)+' m³',14,'text-anchor="middle"');b+='<path d="M205 165h65m-10-7 10 7-10 7M420 165h35v-58h35m-35 58v80h35" fill="none" stroke="#2875c7" stroke-width="3"/>'+box(275,115,140,100,'#dae6ef')+text(345,153,'地面分离器',18,'text-anchor="middle" fill="#202b38"')+text(345,186,'d50='+p.cut+' μm',14,'text-anchor="middle" fill="#202b38"')+text(493,90,'回收循环液',18)+text(493,119,fmt(a.recovered+a.retained,2)+' m³',16)+text(493,148,'含固 '+fmt(a.concentration,2)+'%',14)+text(493,222,'排弃物',18)+text(493,251,'固 '+fmt(a.removed,2)+' / 液 '+fmt(a.lost,2)+' m³',14);return svg('地面固控：固体去除与液相损失',b);}
function visualize(r,p){const a=r.current;return {charts:[plot('粒径越大，教学截留率越高',[{name:'当前分离效率',points:a.fractions.map(t=>[t.d,t.eff*100])}],'粒径 μm','效率 %'),plot('17个候选：先检查含固约束',[{name:'出口含固量',points:r.candidates.map(t=>[t.cut,t.concentration])},{name:'允许上限',points:r.candidates.map(t=>[t.cut,p.limit]),dash:true}],'切割粒径 μm','体积分数 %')],metrics:[['当前出口含固',fmt(a.concentration,2)+'%'],['当前费用',fmt(a.cost,0)+' 元'],['推荐切割粒径',r.best?r.best.cut+' μm':'无可行方案'],['可行候选',r.eligible.length+' / 17']],note:(a.feasible?'当前方案满足':'当前方案不满足')+'教学含固约束。'+(r.best?'可行网格最低费用 '+fmt(r.best.cost,0)+' 元/100 m³。':'全部候选超限，应重新审查处理工艺，不能强行推荐。')+'费用和分离关系仅为教学假设。',detail:plot('费用扫描：最低费用还须满足含固约束',[{name:'补液与处置费用',points:r.candidates.map(t=>[t.cut,t.cost])}],'切割粒径 μm','元 / 100 m³')};}
function illustrate(r,p,n){if(n===1)return mechanism(r,p);const v=visualize(r,p);if(n===2)return v.charts[0];if(n===3)return bars('两相去向：总量应闭合100 m³',[['回收液体',r.current.recovered],['回流钻屑',r.current.retained],['排出钻屑',r.current.removed],['损失液体',r.current.lost]],'体积 m³');return n===4?v.charts[1]:v.detail;}

const l26Features=t=>{const s=t.solids/15,c=t.cut/200;return [1,s,c,s*c,c*c];};
function l26Balance(p,cut,removal,loss){
 const removed=p.solids*clamp(removal,0,1),lost=(100-p.solids)*clamp(loss,0,.4),retained=p.solids-removed,recovered=100-p.solids-lost;
 return {cut,removed,lost,retained,recovered,concentration:100*retained/(recovered+retained),cost:removed*80+lost*p.price};
}
function l26Reference(p,cut,batchBias=0,shift=false,noise=0){
 const base=evaluate(p,cut),s=p.solids/15,c=cut/200;
 return l26Balance(p,cut,base.removed/p.solids-.065+.03*c+.015*s*c+batchBias+noise-(shift?.16:0),base.lost/(100-p.solids)+.015+.02*s+.008*c*c+batchBias*.23+noise*.2+(shift?.035:0));
}
function l26Data(start,groups,shift=false){
 const rows=[];
 for(let g=0;g<groups;g++){
  const random=rng(26000+(start+g)*7919),bias=(random()-.5)*.024;
  for(let j=0;j<18;j++){
   const solids=2+13*random(),cut=40+160*random(),p={solids,price:600},base=evaluate(p,cut),actual=l26Reference(p,cut,bias,shift,(random()-.5)*.008);
   rows.push({id:'batch-'+(start+g)+'-'+j,group:'batch-'+(start+g),solids,cut,removalResidual:actual.removed/solids-base.removed/solids,lossResidual:actual.lost/(100-solids)-base.lost/(100-solids),actual});
  }
 }
 return rows;
}
function l26Fit(train){return {removal:fit(train,l26Features,t=>t.removalResidual),loss:fit(train,l26Features,t=>t.lossResidual)};}
function l26Predict(model,p,cut){const a=evaluate(p,cut),x=l26Features({...p,cut});return l26Balance(p,cut,a.removed/p.solids+predict(model.removal,x),a.lost/(100-p.solids)+predict(model.loss,x));}
function l26Candidates(model,p){return Array.from({length:17},(_,i)=>{const a=l26Predict(model,p,40+i*10);return {...a,feasible:a.concentration<=p.limit};});}
function learn(p,mode='normal'){
 const train=l26Data(1,mode==='sparse'?2:12),test=l26Data(101,4,mode==='shift'),model=l26Fit(train),predictions=test.map(t=>l26Predict(model,{solids:t.solids,price:600},t.cut)),baseline=test.map(t=>evaluate({solids:t.solids,price:600},t.cut));
 const error={model:mae(test.map(t=>t.actual.concentration),predictions.map(t=>t.concentration)),baseline:mae(test.map(t=>t.actual.concentration),baseline.map(t=>t.concentration)),unit:'百分点'};
 const candidates=l26Candidates(model,p),eligible=candidates.filter(t=>t.feasible),best=eligible.reduce((a,b)=>!a||b.cost<a.cost?b:a,null),current=l26Predict(model,p,p.cut),reference=best?l26Reference(p,best.cut,0,mode==='shift'):null;
 const split={trainGroups:mode==='sparse'?2:12,testGroups:4,trainSamples:train.length,testSamples:test.length};
 const note=mode==='shift'?'测试与查询设备的响应发生偏移；训练模型保持不变，预测合格仍可能在复核时超限。':'模型学习的是合成设备的系统偏差；参考结果仅作事后复核，推荐依据是预测值。';
 return {method:'残差回归代理 + 约束优化',mode,split,train,test,model,predictions,baseline,error,candidates,eligible,best,current,reference,recommendation:best?{cut:best.cut}:null,note,
  metrics:[['测试含固 MAE',fmt(error.model,3)+' 百分点'],['固定公式 MAE',fmt(error.baseline,3)+' 百分点'],['学习推荐粒径',best?best.cut+' μm':'无可行推荐'],['预测合格候选',eligible.length+' / 17']]};
}
function l26Svg(title,body,height=500){return '<svg class="chart learning-board" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 '+height+'" role="img" aria-label="'+esc(title)+'"><title>'+esc(title)+'</title><g fill="var(--ink)" font-family="system-ui,Microsoft YaHei,sans-serif">'+text(24,34,title,24,'font-weight="700"')+body+'</g></svg>';}
function l26Panel(x,y,w,h){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="12" fill="var(--paper-2)" stroke="var(--line)"/>';}
function professionalBackground(p){
 const liquid='var(--c-opt,#2875c7)',solid='var(--clay,#d47a3a)';
 let b=text(24,68,'钻井液把钻屑带到地面；固控希望去掉钻屑，同时尽量把液体送回循环。',17,'fill="var(--ink-2)"');
 b+=l26Panel(24,99,190,284)+text(43,131,'01 / 入口混合物',19,'font-weight="600"')+'<path d="M47 160H191V320H47Z" fill="'+liquid+'" fill-opacity=".13" stroke="'+liquid+'" stroke-width="2"/>';
 [[74,195,10],[124,218,4],[167,188,9],[84,270,4],[149,280,11],[166,240,4]].forEach(([x,y,r])=>{b+='<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+solid+'"/>';});
 b+=text(43,350,'蓝：液体  橙：钻屑',15)+text(43,373,'大小圆点表示不同粒径',14,'fill="var(--ink-2)"');
 b+=l26Panel(245,99,420,284)+text(267,131,'02 / 分离装置剖面示意',19,'font-weight="600"');
 b+='<path d="M268 165H622V259L514 333H358L268 259Z" fill="var(--card)" stroke="var(--ink-2)" stroke-width="3"/><path d="M294 234L589 278" stroke="var(--ink-2)" stroke-width="7" stroke-dasharray="12 5"/>';
 b+='<path d="M194 218H321C410 218 505 181 710 181" fill="none" stroke="'+liquid+'" stroke-opacity=".4" stroke-width="19"/><path d="M466 220C488 289 561 330 710 330" fill="none" stroke="'+liquid+'" stroke-opacity=".4" stroke-width="12"/>';
 b+='<path d="M302 194C390 195 477 259 709 314" fill="none" stroke="'+solid+'" stroke-dasharray="5 5" stroke-width="2"/><path d="M300 212C420 204 535 181 709 181" fill="none" stroke="'+solid+'" stroke-dasharray="3 5" stroke-width="2"/>';
 [[319,197,9],[405,224,10],[534,276,10],[624,301,9],[340,209,4],[433,196,4],[550,185,4],[640,181,4],[584,289,4]].forEach(([x,y,r])=>{b+='<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+solid+'"/>';});
 b+=text(360,319,'分离作用区（示意）',14)+text(267,362,'大颗粒更易被去除；小颗粒更易随回收液流出。',15);
 b+=l26Panel(710,99,266,129)+text(729,132,'03 / 回到循环系统',19,'font-weight="600"')+text(729,168,'以液体为主，仍含部分钻屑',16)+text(729,205,'所以需要检查出口含固量',15,'fill="var(--ink-2)"');
 b+=l26Panel(710,246,266,137)+text(729,278,'04 / 排弃物',19,'font-weight="600"')+text(729,312,'钻屑 + 被夹带的液体',17)+text(729,346,'液体附着、夹带，形成补液费用',15)+text(729,371,'“去固体”不等于“只排固体”',14,'fill="var(--ink-2)"');
 const X=d=>80+310*d/400,Y=e=>540-89*e;
 b+=l26Panel(24,403,952,175)+text(44,432,'d50 是什么？',19,'font-weight="600"');
 b+='<path d="M80 449V540H390" fill="none" stroke="var(--ink-2)"/>'+text(70,454,'100%',14,'text-anchor="end"')+text(98,454,'去除概率',14)+text(70,500,'50%',14,'text-anchor="end"')+text(80,562,'0',14,'text-anchor="middle"')+text(390,562,'400 μm',14,'text-anchor="end"');
 b+='<path d="'+Array.from({length:41},(_,i)=>{const d=i*10;return(i?'L':'M')+X(d)+' '+Y(d*d/(d*d+p.cut*p.cut));}).join(' ')+'" fill="none" stroke="var(--jade)" stroke-width="3"/><path d="M'+X(p.cut)+' 540V'+Y(.5)+'H80" fill="none" stroke="var(--ink-2)" stroke-dasharray="4 4"/><circle cx="'+X(p.cut)+'" cy="'+Y(.5)+'" r="5" fill="var(--jade)"/>';
 b+=text(435,448,'当前 d50 = '+p.cut+' μm：该粒径的去除概率为50%。',18,'font-weight="600"')+text(435,482,'它描述分离曲线，不是一个“大于就全挡住”的硬筛孔。',16)+text(435,516,'粒子数量、路径和液流宽度仅解释机理，不表示精确比例。',15)+text(435,552,'真实设备需用实验标定；具体体积去向在后续衡算中计算。',15,'fill="var(--ink-2)"');
 return l26Svg('固控为什么既去钻屑，又会损失液体？',b,600);
}
function l26Chart(x,y,w,h,series,xmin,xmax,ymax,xlabel,ylabel){
 const X=v=>x+w*(v-xmin)/(xmax-xmin),Y=v=>y+h-h*v/ymax;let b=text(x,y-15,ylabel,14);
 for(let i=0;i<4;i++){const v=ymax*i/3;b+='<path d="M'+x+' '+Y(v)+'h'+w+'" stroke="var(--line)"/>'+text(x-8,Y(v)+5,fmt(v,1),14,'text-anchor="end"');}
 for(let i=0;i<5;i++){const v=xmin+(xmax-xmin)*i/4;b+=text(X(v),y+h+23,fmt(v,0),14,'text-anchor="middle"');}
 series.forEach(s=>{if(!s.scatter)b+='<path d="'+s.points.map((p,i)=>(i?'L':'M')+fmt(X(p[0]))+' '+fmt(Y(p[1]))).join(' ')+'" fill="none" stroke="'+s.color+'" stroke-width="2.5"'+(s.dash?' stroke-dasharray="5 4"':'')+'/>';else for(const p of s.points)b+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="3.8" fill="'+s.color+'" fill-opacity=".7"/>';});
 return b+text(x+w,y+h+46,xlabel,14,'text-anchor="end"');
}
function l26Scatter(r,x=76,y=145,w=350,h=168){
 const max=Math.max(1,...r.test.map(t=>t.actual.concentration),...r.predictions.map(t=>t.concentration))*1.08;
 return l26Chart(x,y,w,h,[{points:[[0,0],[max,max]],color:'var(--ink-2)',dash:true},{points:r.test.map((t,i)=>[t.actual.concentration,r.predictions[i].concentration]),color:'var(--jade)',scatter:true}],0,max,max,'合成参考含固 %','模型预测含固 %');
}
function l26Decision(r,p,x=568,y=145,w=350,h=168){
 const max=Math.max(p.limit,...r.candidates.map(t=>t.concentration))*1.12;
 return l26Chart(x,y,w,h,[{points:r.candidates.map(t=>[t.cut,t.concentration]),color:'var(--jade)'},{points:[[40,p.limit],[200,p.limit]],color:'var(--clay,#d47a3a)',dash:true}],40,200,max,'切割粒径 μm','预测出口含固 %')+r.candidates.map(t=>{const cx=x+w*(t.cut-40)/160,cy=y+h-h*t.concentration/max;return '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r.best&&t.cut===r.best.cut?7:4)+'" fill="'+(t.feasible?'var(--jade)':'var(--bad,#b45d3d)')+'"><title>'+t.cut+' μm：预测含固 '+fmt(t.concentration,2)+'%，费用 '+fmt(t.cost,0)+'元</title></circle>';}).join('');
}
function learningView(r,p){
 if(!r){let b=text(24,68,'训练实验 → 学习设备偏差 → 独立验证 → 预测筛选',17,'fill="var(--ink-2)"');
  ['训练批次','测试批次','17种候选'].forEach((label,i)=>{const x=24+i*325;b+=l26Panel(x,100,302,245)+text(x+20,133,label,20,'font-weight="600"');for(let k=0;k<(i===2?17:i===1?4:12);k++)b+='<rect x="'+(x+22+(k%6)*42)+'" y="'+(160+Math.floor(k/6)*38)+'" width="29" height="25" rx="4" fill="'+(i===1?'var(--clay,#d47a3a)':'var(--jade)')+'" opacity=".6"/>';b+=text(x+20,302,['输入条件与分离结果','从未参与模型拟合','按预测含固与费用筛选'][i],15);});
  b+=text(24,390,'点击“训练并验证模型”，在浏览器内拟合回归并查看独立测试。',19,'font-weight="600"')+text(24,430,'固定公式保留为基线；所有实验均为教学合成，不代表真实设备能力。',15,'fill="var(--ink-2)"');return l26Svg('固控：模型学习了什么？',b);
 }
 let b=text(24,65,r.split.trainGroups+'批 / '+r.split.trainSamples+'条训练 · 4批 / 72条独立测试 · 灰虚线为参考或约束',15,'fill="var(--ink-2)"');
 b+=text(24,94,'01 / 未见实验的预测误差',18,'font-weight="600"')+text(516,94,'02 / 用预测决定哪些方案可选',18,'font-weight="600"')+l26Scatter(r)+l26Decision(r,p);
 r.metrics.forEach((a,i)=>{const x=24+i*242;b+=l26Panel(x,381,230,67)+text(x+13,404,a[0],13,'fill="var(--ink-2)"')+text(x+13,434,a[1],20,'font-weight="700"');});
 b+=text(24,477,r.mode==='shift'?'设备偏移：训练不变；推荐只依赖预测，合成参考用于事后复核。':'批次留出验证后，再进行预测约束筛选；绿色为预测合格，红色为预测超限。',15,'fill="var(--ink-2)"');
 return l26Svg('学得分离响应，让预测进入固控决策',b);
}
function learningStep(r,p,n){
 if(n===1){let b=text(24,68,'每块代表一个完整实验批次；同批次的18条记录始终在同一集合。',16,'fill="var(--ink-2)"');
  [['训练',r.split.trainGroups,'var(--jade)'],['独立测试',4,'var(--clay,#d47a3a)']].forEach((a,k)=>{const x=24+k*490;b+=l26Panel(x,99,465,235)+text(x+22,135,a[0]+'：'+a[1]+'批',22,'font-weight="600"');for(let i=0;i<a[1];i++)b+='<rect x="'+(x+23+i%6*69)+'" y="'+(165+Math.floor(i/6)*63)+'" width="53" height="42" rx="5" fill="'+a[2]+'" opacity=".75"/>';});
  b+=text(24,386,'输入：入口含固量、切割粒径',20)+text(24,424,'标签：排出钻屑体积、带走液体体积 → 出口含固量',20)+text(24,467,'测试集只用于评分；训练按钮不会读取测试标签来选择模型或推荐。',15,'fill="var(--ink-2)"');return l26Svg('01 / 先划分完整实验批次',b);
 }
 if(n===2){const row=r.train[0],input={solids:row.solids,price:600},base=evaluate(input,row.cut),fitted=l26Predict(r.model,input,row.cut),rate=a=>100*a.removed/row.solids,delta=rate(row.actual)-rate(base),cuts=Array.from({length:17},(_,i)=>40+i*10);
  let b=text(24,68,'训练记录 '+row.id+'：入口含固 '+fmt(row.solids,2)+'% · 切割粒径 '+fmt(row.cut,1)+' μm。',16,'fill="var(--ink-2)"');
  b+=l26Panel(24,91,390,330)+text(44,123,'一条记录怎样形成监督目标？',19,'font-weight="600"');
  [['公式基线',base,'var(--clay,#d47a3a)'],['实验测量',row.actual,'var(--c-opt,#2875c7)'],['拟合后预测',fitted,'var(--jade)']].forEach(([name,a,color],i)=>{const y=153+i*74;b+=text(44,y,name+' · 固相去除率',16)+'<rect data-response="'+name+'" x="44" y="'+(y+12)+'" width="'+(rate(a)*2.5)+'" height="20" fill="'+color+'"/>'+text(392,y+30,fmt(rate(a),2)+'%',18,'text-anchor="end" font-weight="600"');});
  b+=text(44,394,'实验 − 公式 = '+(delta>=0?'+':'')+fmt(delta,2)+' 个百分点',17,'font-weight="600"');
  const formula=cuts.map(c=>[c,rate(evaluate(input,c))]),learned=cuts.map(c=>[c,rate(l26Predict(r.model,input,c))]);
  b+=text(449,113,'同一入口条件，改变切割粒径',18,'font-weight="600"')+l26Chart(490,156,435,190,[{points:formula,color:'var(--clay,#d47a3a)',dash:true},{points:learned,color:'var(--jade)'},{points:[[row.cut,rate(row.actual)]],color:'var(--c-opt,#2875c7)',scatter:true}],40,200,100,'切割粒径 μm','固相去除率 %');
  b+=text(450,419,'橙虚线：公式  绿线：学得修正  蓝点：本条实验',15)+text(24,465,'这条记录只用于解释；系数由全部 '+r.split.trainSamples+' 条训练记录共同拟合。',20,'font-weight="600"')+text(24,504,'液相损失率也以“实验 − 公式”为目标，单独拟合一组系数。',17)+text(24,540,'学习目标是残差；测试标签不参与拟合，单条训练记录也不是独立验证。',15,'fill="var(--ink-2)"');return l26Svg('02 / 模型究竟从实验里学到了什么？',b,565);
 }
 if(n===3){let b=text(24,68,'72条未见实验：点越靠近虚线，出口含固预测越准确。',16,'fill="var(--ink-2)"')+l26Scatter(r,76,120,490,260);const max=Math.max(r.error.model,r.error.baseline)*1.15;
  [['残差模型',r.error.model,'var(--jade)'],['固定公式',r.error.baseline,'var(--clay,#d47a3a)']].forEach((a,i)=>{const y=159+i*106;b+=text(632,y,a[0],20)+box(632,y+17,300*a[1]/max,27,a[2])+text(632,y+74,fmt(a[1],3)+' 百分点',21,'font-weight="600"');});
  b+=text(24,478,r.mode==='shift'?'设备偏移后的标签只影响评分；训练系数和同输入预测均保持不变。':'该误差来自独立合成批次；均值误差不能保证每个候选都满足真实约束。',15,'fill="var(--ink-2)"');return l26Svg('03 / 测试批次上的误差是否变小？',b);
 }
 if(n===4){let b=text(24,68,'先淘汰预测含固超限的方案；费用再低，也不能绕过含固约束。',17,'fill="var(--ink-2)"');
  b+=l26Panel(24,91,634,438)+text(42,126,'01 / 检查全部17个候选：含固 ≤ '+p.limit+'%',20,'font-weight="600"');
  r.candidates.forEach((t,i)=>{const x=38+i%6*102,y=151+Math.floor(i/6)*88,color=t.feasible?'var(--jade)':'var(--bad,#b45d3d)',selected=r.best&&r.best.cut===t.cut;b+='<g data-candidate="'+t.cut+'" data-feasible="'+t.feasible+'"><rect x="'+x+'" y="'+y+'" width="91" height="76" rx="7" fill="'+color+'" fill-opacity=".09" stroke="'+color+'" stroke-width="'+(selected?3:1)+'"/>'+text(x+45,y+22,t.cut+' μm',18,'text-anchor="middle" font-weight="600"')+text(x+45,y+45,fmt(t.concentration,2)+'%',16,'text-anchor="middle"')+text(x+45,y+66,t.feasible?(selected?'推荐 ✓':'保留 ✓'):'剔除 ×',14,'text-anchor="middle" fill="'+color+'"')+'</g>';});
  b+=text(42,449,'剔除 '+(17-r.eligible.length)+' 个 → 保留 '+r.eligible.length+' 个',24,'font-weight="700"')+text(42,484,'红色：预测超限；绿色：预测合格；粗边框：推荐。',16)+text(42,512,'候选是否保留由未四舍五入的预测值判断。',14,'fill="var(--ink-2)"');
  b+=l26Panel(680,91,296,438)+text(697,126,'02 / 只比较保留项的费用',18,'font-weight="600"');
  if(r.best){const sorted=[...r.eligible].sort((a,b)=>a.cost-b.cost),max=Math.max(...sorted.map(t=>t.cost))*1.05,rowHeight=Math.min(44,310/sorted.length);sorted.forEach((t,i)=>{const y=151+i*rowHeight;b+=text(698,y+15,t.cut+' μm',14)+'<rect data-cost-cut="'+t.cut+'" x="754" y="'+(y+2)+'" width="'+(140*t.cost/max)+'" height="12" fill="var(--jade)" fill-opacity="'+(t===r.best?1:.4)+'"/>'+text(960,y+15,fmt(t.cost,0),14,'text-anchor="end"');});b+=text(697,491,'最低：'+r.best.cut+' μm / '+fmt(r.best.cost,0)+' 元',18,'font-weight="700"')+text(697,515,'费用单位：元 / 100 m³',14,'fill="var(--ink-2)"');}
  else b+='<path d="M778 203l80 80m0-80-80 80" stroke="var(--bad,#b45d3d)" stroke-width="5"/>'+text(827,334,'无可行推荐',26,'text-anchor="middle" font-weight="700"')+text(697,382,'没有进入费用比选的候选。',16)+text(697,417,'应复核工艺或输入约束，',16)+text(697,447,'不能强行推荐超限方案。',16);
  return l26Svg('04 / 为什么最便宜的方案可能被淘汰？',b+text(24,562,'选择只使用模型预测；合成参考结果不会参与筛选，也不会替算法挑选更好的答案。',15,'fill="var(--ink-2)"'),585);
 }
 const a=r.best,b=r.reference;if(!a)return l26Svg('05 / 无预测可行方案，停止推荐',text(24,100,'当前17个候选的预测含固均超过上限；没有可应用的学习推荐。',20)+l26Decision(r,p,80,170,820,235));
 let body=text(24,68,'同一入口100 m³：条宽对应体积。推荐确定后，才用合成参考检查误差。',17,'fill="var(--ink-2)"');
 const plans=[['模型预测',a],['合成参考复核',b]],colors=['var(--jade)','var(--clay,#d47a3a)','var(--bad,#b45d3d)','var(--c-opt,#2875c7)'],names=['回收液','回流钻屑','排出钻屑','损失液'];
 plans.forEach(([label,t],i)=>{const x=24+i*490,values=[t.recovered,t.retained,t.removed,t.lost];body+=l26Panel(x,91,465,241)+text(x+22,125,label+' · '+a.cut+' μm',21,'font-weight="600"')+text(x+22,162,'含固 '+fmt(t.concentration,2)+'% '+(t.concentration<=p.limit?'≤':'＞')+' '+p.limit+'% '+(t.concentration<=p.limit?'合格':'超限'),22,'font-weight="700" fill="'+(t.concentration<=p.limit?'var(--jade)':'var(--bad,#b45d3d)')+'"');let left=x+22;
  values.forEach((v,j)=>{body+='<rect data-volume-plan="'+i+'" data-component="'+names[j]+'" x="'+left+'" y="183" width="'+(v*4.21)+'" height="27" fill="'+colors[j]+'"><title>'+names[j]+' '+fmt(v,2)+' m³</title></rect>';left+=v*4.21;const lx=x+22+(j%2)*218,ly=244+Math.floor(j/2)*29;body+='<rect x="'+lx+'" y="'+(ly-12)+'" width="11" height="11" fill="'+colors[j]+'"/>'+text(lx+17,ly,names[j]+' '+fmt(v,2)+' m³',15);});
  body+=text(x+22,309,values.map(v=>fmt(v,2)).join(' + ')+' ≈ 100.00 m³',15,'font-weight="600"');
 });
 body+=text(24,367,'费用拆分：排出钻屑 × 80元/m³  +  损失液体 × '+p.price+'元/m³',19,'font-weight="600"');
 const maximum=Math.max(a.cost,b.cost)*1.08;
 plans.forEach(([label,t],i)=>{const y=396+i*76,solidCost=t.removed*80,liquidCost=t.lost*p.price;body+=text(24,y+25,label,19,'font-weight="600"')+'<rect data-cost-plan="'+i+'" data-component="处置" x="221" y="'+y+'" width="'+(solidCost*515/maximum)+'" height="27" fill="'+colors[2]+'"/><rect data-cost-plan="'+i+'" data-component="补液" x="'+(221+solidCost*515/maximum)+'" y="'+y+'" width="'+(liquidCost*515/maximum)+'" height="27" fill="'+colors[3]+'"/>'+text(962,y+24,fmt(t.cost,0)+' 元',23,'text-anchor="end" font-weight="700"')+text(221,y+53,'处置 '+fmt(solidCost,1)+' + 补液 '+fmt(liquidCost,1)+' ≈ '+fmt(t.cost,1)+' 元',17);});
 body+=text(24,573,a.concentration<=p.limit&&b.concentration>p.limit?'预测合格，参考却超限：设备偏移已改变实际响应，应重新采样与人工复核。':'体积闭合不等于预测准确；合成参考仅作事后复核，不代表现场收益。',16,'fill="var(--ink-2)"');return l26Svg('05 / 体积是否闭合？费用从哪里来？预测可靠吗？',body,600);
}

function sv26svg(title,body,height=460){return '<svg class="sv26 chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 '+height+'" role="img" aria-label="'+esc(title)+'"><title>'+esc(title)+'</title><g fill="var(--ink,#202b38)" font-family="system-ui,Microsoft YaHei,sans-serif">'+body+'</g></svg>';}
function sv26label(x,y,label,size=16,attrs=''){return text(x,y,label,size,attrs);}
function sv26ribbon(x0,y0,x1,y1,width,color){return '<path d="M'+x0+' '+y0+' C'+(x0+230)+' '+y0+' '+(x1-190)+' '+y1+' '+x1+' '+y1+' L'+x1+' '+(y1+width)+' C'+(x1-190)+' '+(y1+width)+' '+(x0+230)+' '+(y0+width)+' '+x0+' '+(y0+width)+'Z" fill="'+color+'" fill-opacity=".33" stroke="'+color+'" stroke-opacity=".6"/>';}
function showcase(r,p,progress=1){
 const a=r.current,q=clamp(progress,0,1),scale=1.8,sourceY=146,recoveredY=124,wasteY=354;
 const blue='#2875c7',orange='#d47a3a',green='#168273',status=a.feasible?green:'#bb5570';
 const volumes=[{name:'回收液体',value:a.recovered,start:sourceY,end:recoveredY,color:blue},
  {name:'损失液体',value:a.lost,start:sourceY+a.recovered*scale,end:wasteY,color:blue},
  {name:'回流钻屑',value:a.retained,start:sourceY+a.liquid*scale,end:recoveredY+a.recovered*scale,color:orange},
  {name:'排出钻屑',value:a.removed,start:sourceY+(a.liquid+a.retained)*scale,end:wasteY+a.lost*scale,color:orange}];
 let b=sv26label(28,32,'每 100 m³ 钻井液，流向哪里？',25,'font-weight="700"')+sv26label(28,60,'流带厚度与体积成正比 · 移动标记只表示流向',14,'fill="var(--ink-2,#52627a)"');
 b+='<rect x="740" y="82" width="234" height="238" rx="17" fill="var(--paper-2,#eaf0f7)"/><rect x="740" y="334" width="234" height="92" rx="17" fill="var(--paper-2,#eaf0f7)"/>';
 // Draw smaller loss stream first so the large return stream remains legible.
 for(const i of [1,3,2,0]){const v=volumes[i];b+=sv26ribbon(174,v.start,760,v.end,v.value*scale,v.color);}
 b+='<rect x="155" y="'+sourceY+'" width="19" height="'+(a.liquid*scale)+'" fill="'+blue+'"/><rect x="155" y="'+(sourceY+a.liquid*scale)+'" width="19" height="'+(a.solid*scale)+'" fill="'+orange+'"/>';
 b+='<rect x="760" y="'+recoveredY+'" width="13" height="'+(a.recovered*scale)+'" fill="'+blue+'"/><rect x="760" y="'+(recoveredY+a.recovered*scale)+'" width="13" height="'+(a.retained*scale)+'" fill="'+orange+'"/>';
 b+='<rect x="760" y="'+wasteY+'" width="13" height="'+(a.lost*scale)+'" fill="'+blue+'"/><rect x="760" y="'+(wasteY+a.lost*scale)+'" width="13" height="'+(a.removed*scale)+'" fill="'+orange+'"/>';
 b+=sv26label(28,114,'入口混合物',18,'font-weight="600"')+sv26label(28,187,'100',40,'font-weight="700"')+sv26label(106,187,'m³',17)+sv26label(28,228,'液体 '+fmt(a.liquid,1)+' m³',16)+sv26label(28,258,'钻屑 '+fmt(a.solid,1)+' m³',16);
 b+='<rect x="420" y="85" width="205" height="70" rx="14" fill="var(--card,#fff)" stroke="var(--line,#dfe6f0)"/>'+sv26label(522,113,'地面固控分离',18,'text-anchor="middle" font-weight="600"')+sv26label(522,139,'d50 = '+p.cut+' μm',16,'text-anchor="middle" fill="var(--ink-2,#52627a)"')+'<path d="M520 155v32" stroke="var(--ink-2,#52627a)" stroke-dasharray="3 4"/>';
 b+=sv26label(789,110,'回到循环系统',18,'font-weight="600"')+sv26label(789,156,fmt(a.recovered+a.retained,2),31,'font-weight="700"')+sv26label(789,184,'m³ 回收混合液',15)+sv26label(789,220,'液 '+fmt(a.recovered,2)+' · 固 '+fmt(a.retained,2)+' m³',14);
 b+='<rect x="789" y="239" width="164" height="34" rx="8" fill="'+status+'" fill-opacity=".13"/>'+sv26label(800,262,'含固 '+fmt(a.concentration,2)+'%',18,'font-weight="700" fill="'+status+'"')+sv26label(789,298,(a.feasible?'满足':'超出')+' '+p.limit+'% 教学上限',15,'fill="'+status+'"');
 b+=sv26label(789,358,'进入排弃物流',17,'font-weight="600"')+sv26label(789,385,'液 '+fmt(a.lost,2)+' · 固 '+fmt(a.removed,2)+' m³',14)+sv26label(789,410,'合计 '+fmt(a.lost+a.removed,2)+' m³',16);
 for(const v of volumes){const t=q,cx=(1-t)**3*174+3*(1-t)**2*t*404+3*(1-t)*t*t*570+t*t*t*760,cy=(1-t)**3*(v.start+v.value*scale/2)+3*(1-t)**2*t*(v.start+v.value*scale/2)+3*(1-t)*t*t*(v.end+v.value*scale/2)+t*t*t*(v.end+v.value*scale/2);b+='<circle cx="'+fmt(cx)+'" cy="'+fmt(cy)+'" r="5" fill="'+v.color+'" stroke="var(--card,#fff)" stroke-width="2"/>';}
 b+=sv26label(28,382,'全量计算：液体回收率 '+pct(a.recovered/a.liquid),17,'font-weight="600"')+sv26label(28,411,'钻屑去除率 '+pct(a.removed/a.solid)+' · 当前费用 '+fmt(a.cost,0)+' 元',17);
 b+=sv26label(28,445,r.best?'可行候选 '+r.eligible.length+'/17 · 最低费用切割粒径 '+r.best.cut+' μm':'可行候选 0/17 · 当前范围没有满足含固上限的方案',16,'fill="'+(r.best?green:status)+'" font-weight="600"');
 return sv26svg('固控物料流向与全量衡算',b);
}
function showcaseAnalysis(r,p){
 const X=x=>90+670*(x-40)/160,max=Math.max(...r.candidates.map(t=>t.cost))*1.18,Y=y=>340-235*y/max;
 let b=sv26label(28,32,'从 17 个候选中，选出满足约束的低费用方案',23,'font-weight="700"')+sv26label(28,60,'圆点位置表示费用，颜色表示出口含固量是否合格',15,'fill="var(--ink-2,#52627a)"');
 for(let i=0;i<=4;i++){const val=max*i/4,y=Y(val);b+='<path d="M90 '+y+'H760" stroke="var(--line,#dfe6f0)"/>'+sv26label(78,y+5,fmt(val,0),14,'text-anchor="end"');}
 b+=sv26label(90,92,'元 / 100 m³',14,'fill="var(--ink-2,#52627a)"');
 for(let cut=40;cut<=200;cut+=40)b+=sv26label(X(cut),369,cut,14,'text-anchor="middle"');
 b+=sv26label(760,396,'教学切割粒径 μm',15,'text-anchor="end"');
 const d=r.candidates.map((t,i)=>(i?'L':'M')+fmt(X(t.cut))+' '+fmt(Y(t.cost))).join(' ');b+='<path d="'+d+'" fill="none" stroke="var(--ink-2,#52627a)" stroke-width="2" stroke-opacity=".45"/>';
 for(const t of r.candidates){const cx=X(t.cut),cy=Y(t.cost),color=t.feasible?'#168273':'#bb5570';b+='<circle cx="'+cx+'" cy="'+cy+'" r="6" fill="'+color+'"><title>'+t.cut+' μm：'+fmt(t.cost,0)+' 元；含固 '+fmt(t.concentration,2)+'%；'+(t.feasible?'可行':'超限')+'</title></circle>';}
 const cur=r.current;b+='<circle cx="'+X(cur.cut)+'" cy="'+Y(cur.cost)+'" r="11" fill="none" stroke="#2875c7" stroke-width="3"/>';
 if(r.best){const t=r.best;b+='<path d="M'+X(t.cut)+' '+(Y(t.cost)-15)+'l7 7-7 7-7-7Z" fill="#168273" stroke="var(--card,#fff)" stroke-width="2"/>';}
 b+='<rect x="790" y="87" width="182" height="275" rx="15" fill="var(--paper-2,#eaf0f7)"/>';
 b+=sv26label(810,118,'约束先于低价',18,'font-weight="600"')+sv26label(810,149,'出口含固 ≤ '+p.limit+'%',15)+sv26label(810,185,'可行 '+r.eligible.length+' / 17',24,'font-weight="700"');
 b+=sv26label(810,224,'当前 '+fmt(cur.cost,0)+' 元',17,'fill="#2875c7"');
 b+=sv26label(810,262,r.best?'最低 '+fmt(r.best.cost,0)+' 元':'没有可行推荐',17,'fill="'+(r.best?'#168273':'#bb5570')+'" font-weight="600"');
 b+=sv26label(810,294,r.best?'对应 '+r.best.cut+' μm':'重新审查处理工艺',15)+sv26label(810,330,'网格内比较',14,'fill="var(--ink-2,#52627a)"');
 b+='<circle cx="105" cy="429" r="6" fill="#168273"/>'+sv26label(121,434,'含固合格',15)+'<circle cx="275" cy="429" r="6" fill="#bb5570"/>'+sv26label(291,434,'含固超限',15)+'<circle cx="445" cy="429" r="9" fill="none" stroke="#2875c7" stroke-width="3"/>'+sv26label(462,434,'当前参数',15)+'<path d="M618 420l9 9-9 9-9-9Z" fill="#168273"/>'+sv26label(637,434,'可行最低费用',15);
 return sv26svg('候选费用与含固约束联合比较',b);
}

const automationScene="d26";const roles={"title":"自动筛选，接手人工逐项试算","subtitle":"人工给出含固上限与费用条件；算法计算17个候选，先剔除超限方案，再比较可行方案费用。","manual":"逐项试算切割粒径，核对含固量和费用","automatic":"批量计算17个候选，筛除超限并按费用比选","review":"确认数据与约束，复核建议后决定是否采用","method":"约束网格搜索","action":"自动筛选17个方案","applyLabel":"将建议填入参数","steps":["按同一入口条件计算17个候选的固液去向与处理费用。","逐个检查出口含固上限，保留合格方案并记录超限方案。","从可行候选中选出最低费用；无可行候选时明确不推荐。"],"limits":"这里展示替代重复试算和筛选的智能优化流程。分离关系与费用均为教学假设；算法未验证真实设备能力，也未接管设备控制。人工设定示例与算法搜索结果的差值不代表人类能力评测。"};

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

const presets=[{"label":"基准分离","description":"观察100 m³物料的四个去向","values":{"solids":8,"cut":100,"limit":3,"price":600}},{"label":"高含固挑战","description":"提高含固量并收紧约束，查看无解状态","values":{"solids":15,"cut":100,"limit":1,"price":600}},{"label":"精细分离","description":"减少回流钻屑，同时观察损液费用","values":{"solids":8,"cut":40,"limit":3,"price":600}}];
const api={defaults,limits,calculate,visualize,mechanism,illustrate,showcase,showcaseAnalysis,presets,automationResult,automationView,roles,learn,learningView,learningStep,professionalBackground};
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
