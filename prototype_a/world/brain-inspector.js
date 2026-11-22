import {BRAIN} from 'cognition';

// Labels follow inputVector / forward exactly; the inspector never trains or copies a brain back.
const INPUT_LABELS=['能量','疲劳','愉悦','活跃','安心','亲近','有同伴','熟悉度','宽度','高度','深度','红色分量','绿色分量','蓝色分量','发光','接近点数量','尝试动作','休息动作','进食动作','社交动作','工作动作','观察动作','实例编码一','实例编码二'];
const OUTPUT_LABELS=['能量变化','疲劳改善','愉悦变化','安心变化','亲近变化'];
const COLOR_LIMIT=.5;
export function createBrainInspector(creatures){
 const toggle=document.getElementById('brain-toggle');
 const residentSelect=document.getElementById('brain-resident'),layerSelect=document.getElementById('brain-layer');
 const matrix=document.getElementById('brain-matrix'),summary=document.getElementById('brain-summary'),detail=document.getElementById('brain-detail');
 const range=document.getElementById('brain-range'),download=document.getElementById('brain-download'),notice=document.getElementById('brain-notice');
 let selected=0,cells=[],layout=null,lastRefresh=-Infinity,lastBrain=null,lastLayer='',lastUpdates=-1;
 const hiddenLabels=Array.from({length:BRAIN.hidden},(_,index)=>'隐藏 '+(index+1));
 function current(){return creatures[Number(residentSelect.value)]||creatures[0];}
 function describeLayer(){
  const first=layerSelect.value==='w1';
  return {key:layerSelect.value,columns:[...(first?INPUT_LABELS:hiddenLabels),'偏置'],rows:first?hiddenLabels:OUTPUT_LABELS};
 }
 function connection(index){
  const row=Math.floor(index/layout.columns.length),column=index%layout.columns.length;
  return layout.columns[column]+' → '+layout.rows[row];
 }
 function showDetail(){
  const creature=current(),value=creature.brain[layout.key][selected],description=connection(selected);
  detail.textContent=creature.name+' · '+description+' = '+String(value);
 }
 function selectCell(index,focus=false){
  const previous=cells[selected];
  if(previous){previous.tabIndex=-1;previous.setAttribute('aria-pressed','false');}
  selected=index;
  const cell=cells[selected];cell.tabIndex=0;cell.setAttribute('aria-pressed','true');
  if(focus)cell.focus();showDetail();
 }
 function buildMatrix(){
  layout=describeLayer();selected=0;cells=[];
  const table=document.createElement('table'),caption=document.createElement('caption');
  caption.textContent='列为来源，行为接收单元；最后一列是偏置';table.append(caption);
  const head=document.createElement('thead'),header=document.createElement('tr'),corner=document.createElement('th');
  corner.textContent='接收 / 来源';header.append(corner);
  layout.columns.forEach((label,column)=>{const cell=document.createElement('th');cell.scope='col';cell.title=label;cell.setAttribute('aria-label',label);const isBias=column===layout.columns.length-1;cell.textContent=isBias?'偏置':String(column+1);header.append(cell);});
  head.append(header);table.append(head);
  const body=document.createElement('tbody');
  layout.rows.forEach((label,row)=>{
   const line=document.createElement('tr'),heading=document.createElement('th');heading.scope='row';heading.textContent=label;line.append(heading);
   layout.columns.forEach((source,column)=>{
    const index=row*layout.columns.length+column,holder=document.createElement('td'),button=document.createElement('button');
    button.type='button';button.className='weight-cell';button.tabIndex=-1;button.setAttribute('aria-pressed','false');
    button.addEventListener('click',()=>selectCell(index));
    button.addEventListener('keydown',event=>{
     const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-layout.columns.length,ArrowDown:layout.columns.length};
     if(!(event.key in offsets))return;
     event.preventDefault();event.stopPropagation();
     const next=Math.max(0,Math.min(cells.length-1,index+offsets[event.key]));selectCell(next,true);
    });
    holder.append(button);line.append(holder);cells.push(button);
   });body.append(line);
  });table.append(body);matrix.replaceChildren(table);selectCell(0);
 }
 function syncResidents(){
  while(residentSelect.options.length<creatures.length){
   const index=residentSelect.options.length,option=document.createElement('option');option.value=String(index);option.textContent=creatures[index].name;residentSelect.append(option);
  }
 }
 function refresh(force=false){
  const now=performance.now(),closed=toggle.getAttribute('aria-expanded')!=='true';
  if(!force&&(closed||now-lastRefresh<500))return;
  lastRefresh=now;syncResidents();
  const creature=current();if(!creature?.brain)return;
  const brain=creature.brain,changedLayer=lastLayer!==layerSelect.value;
  if(changedLayer||!layout)buildMatrix();
  const changed=force||changedLayer||lastBrain!==brain||lastUpdates!==brain.updates;
  if(!changed)return;
  lastLayer=layerSelect.value;lastBrain=brain;lastUpdates=brain.updates;
  const values=brain[layout.key],minimum=Math.min(...values),maximum=Math.max(...values);
  summary.textContent=creature.name+' · 已学习 '+brain.updates+' 次 · 记着 '+brain.episodes.length+' 段经历';
  range.textContent='本层 '+values.length+' 个参数 · 最小 '+minimum.toFixed(6)+' · 最大 '+maximum.toFixed(6);
  values.forEach((value,index)=>{
   const strength=Math.min(1,Math.abs(value)/COLOR_LIMIT),lightness=97-strength*45,hue=value<0?205:24;
   const color='hsl('+hue+' 48% '+lightness+'%)',description=connection(index)+' = '+String(value),cell=cells[index];
   cell.style.backgroundColor=color;cell.title=description;cell.setAttribute('aria-label',description);
   cell.textContent=value>0?'+':value<0?'−':'0';
  });showDetail();
 }
 residentSelect.addEventListener('change',()=>{notice.textContent='';refresh(true);});
 layerSelect.addEventListener('change',()=>{notice.textContent='';refresh(true);});
 toggle.addEventListener('click',()=>refresh(true));
 download.addEventListener('click',()=>{
  const creature=current(),brain=creature.brain;
  const data={name:creature.name,exportedAt:new Date().toISOString(),updates:brain.updates,architecture:{...BRAIN},activation:'tanh',storage:'row-major; final column is bias',inputLabels:INPUT_LABELS,outputLabels:OUTPUT_LABELS,layers:{w1:{rows:BRAIN.hidden,columns:BRAIN.inputs+1,weights:[...brain.w1]},w2:{rows:BRAIN.outputs,columns:BRAIN.hidden+1,weights:[...brain.w2]}}};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=creature.name+'-神经网络权重-'+brain.updates+'.json';document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);notice.textContent='已发起 '+creature.name+' 的权重快照下载。';
 });
 const parameterCount=BRAIN.hidden*(BRAIN.inputs+1)+BRAIN.outputs*(BRAIN.hidden+1);
 document.getElementById('brain-architecture').textContent=BRAIN.inputs+' 个输入 → '+BRAIN.hidden+' 个隐藏单元 → '+BRAIN.outputs+' 个结果预测，共 '+parameterCount+' 个参数（含偏置）。随生活经历学习；每只小球单独保存。';
 syncResidents();toggle.disabled=false;
 return {refresh};
}
