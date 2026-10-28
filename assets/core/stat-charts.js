/* Small SVG statistics shared by the portal and embedded into independent case files. */
(function (global) {
  'use strict';
  function createStatCharts() {
    const palette=['#2875c7','#d47a3a','#168273','#ae5972','#64748b'];
    const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const num=(v,d=0)=>Number(v).toFixed(d);
    const label=(x,y,s,size=14,attrs='')=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" '+attrs+'>'+esc(s)+'</text>';
    function frame(title,body,foot,description){
      return '<svg class="chart stat-chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 355" role="img" aria-label="'+esc(title)+'"><title>'+esc(title)+'</title><desc>'+esc(description||foot)+'</desc><g font-family="system-ui,Microsoft YaHei,sans-serif" fill="var(--ink)">'+label(24,32,title,19,'font-weight="600"')+body+label(24,337,foot,12)+'</g></svg>';
    }
    function ring(title,rows,options={}){
      const total=rows.reduce((sum,row)=>sum+row.value,0),radius=77;let start=0;
      let b='<circle cx="141" cy="173" r="'+radius+'" fill="none" stroke="var(--line,#dfe6f0)" stroke-width="27"/>';
      rows.forEach((row,i)=>{
        const share=total?row.value/total*100:0,color=row.color||palette[i%palette.length];
        if(share>0)b+='<circle class="stat-sector" cx="141" cy="173" r="'+radius+'" fill="none" stroke="'+color+'" stroke-width="27" pathLength="100" stroke-dasharray="'+num(share,6)+' '+num(100-share,6)+'" stroke-dashoffset="'+num(-start,6)+'" transform="rotate(-90 141 173)"><title>'+esc(row.name+'：'+row.value+(options.unit||'')+' / '+num(share,2)+'%')+'</title></circle>';
        start+=share;
        const y=102+i*48;b+='<rect x="279" y="'+(y-13)+'" width="11" height="11" rx="3" fill="'+color+'"/>'+label(301,y,row.name,15)+label(519,y,row.value+(options.unit||''),14,'text-anchor="end"')+label(609,y,num(share,2)+'%',14,'text-anchor="end"');
      });
      b+=label(141,173,options.centerValue??total,32,'text-anchor="middle" font-weight="600"')+label(141,200,options.centerLabel||'合计'+(options.unit||''),13,'text-anchor="middle"');
      if(!total)b+=label(141,231,'暂无数据',12,'text-anchor="middle"');
      return frame(title,b,options.foot||'分组互不重叠；比例以图中合计为分母',rows.map(r=>r.name+' '+r.value).join('；')+'；合计 '+total);
    }
    function columns(title,labels,series,options={}){
      const totals=labels.map((_,i)=>series.reduce((sum,s)=>sum+s.values[i],0));
      const peak=options.stacked?Math.max(0,...totals):Math.max(0,...series.flatMap(s=>s.values));
      const magnitude=peak?10**Math.floor(Math.log10(peak)):1;
      const maximum=options.maximum||([1,2,5,10].find(v=>v*magnitude>=peak)||10)*magnitude;
      const decimals=maximum<.2?3:maximum<=2?2:(Number.isInteger(maximum/4)?0:1),X=60,W=550,Y=245,H=153,group=W/Math.max(1,labels.length);
      let b=label(25,63,options.unit||'数量',12);
      for(let i=0;i<=4;i++){const y=Y-H*i/4;b+='<path d="M'+X+' '+y+'H610" stroke="var(--line,#dfe6f0)" stroke-dasharray="3 5"/>'+label(48,y+4,num(maximum*i/4,decimals),12,'text-anchor="end"');}
      b+='<path d="M60 92V245H610" fill="none" stroke="var(--ink-3,#64748b)"/>';
      labels.forEach((name,i)=>{
        let base=Y;const width=Math.min(62,group*.7/(options.stacked?1:series.length));
        series.forEach((s,j)=>{
          const value=s.values[i],height=value/maximum*H,x=X+i*group+(group-(options.stacked?width:width*series.length))/2+(options.stacked?0:j*width),y=options.stacked?base-height:Y-height;
          b+='<rect x="'+num(x,2)+'" y="'+num(y,2)+'" width="'+num(Math.max(1,width-3),2)+'" height="'+num(height,2)+'" rx="3" fill="'+(s.color||palette[j%palette.length])+'"><title>'+esc(name+' / '+s.name+'：'+num(value,options.precision??0)+' '+(options.unit||''))+'</title></rect>';
          if(!options.stacked)b+=label(x+(width-3)/2,y-7,num(value,options.precision??0),12,'text-anchor="middle"');
          base=y;
        });
        if(options.stacked)b+=label(X+(i+.5)*group,base-8,num(totals[i],options.precision??0),12,'text-anchor="middle"');
        b+=label(X+(i+.5)*group,270,name,14,'text-anchor="middle"');
      });
      series.forEach((s,i)=>{const x=60+i*260;b+='<rect x="'+x+'" y="296" width="13" height="10" rx="2" fill="'+(s.color||palette[i%palette.length])+'"/>'+label(x+21,306,s.name,13);});
      return frame(title,b,options.foot||'柱高从零起算；悬停查看数值',labels.map((s,i)=>s+' '+series.map(t=>t.values[i]).join('/')).join('；'));
    }
    return {ring,columns};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=createStatCharts();
  else global.AtlasCharts=createStatCharts();
})(typeof window==='undefined'?globalThis:window);
