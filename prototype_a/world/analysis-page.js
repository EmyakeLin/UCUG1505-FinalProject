import {BRAIN} from 'cognition';
import {validateSnapshot,objectsFor,defaultAction,evaluateObject,habitRows,inputSensitivity,ACTION_NAMES,OUTPUT_NAMES,INPUT_NAMES,ACTIVITY_NAMES} from 'analysis-rules';

const byId=id=>document.getElementById(id);
const residentList=byId('resident-list'),targetSelect=byId('target-select'),actionSelect=byId('action-select'),contextSelect=byId('context-select');
const sourceNames={self:'亲身经历',observed:'观察同伴',told:'同伴转述'};
const experienceNames={play:'一起玩',chat:'聊天',date:'约会',charge:'巨碑充能',eat:'吃东西',sleep:'睡觉',sun:'晒太阳',garden:'安静休息',study:'学习交流',plaza:'广场相聚',council:'共同议事',welcome:'迎接伙伴',inspect:'试探对象',process:'加工材料','collect-part':'领取零件',prepare:'准备维修',repair:'维修',experiment:'能源研究','fetch-food':'取食材',cook:'做饭',meal:'共同进餐',work:'工作'};
let snapshot=null,residentIndex=null,targetObjects=[],evaluation=null,importTicket=0;
const node=(tag,text,className)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};
const signed=value=>(value>=0?'+':'')+value.toFixed(3);
const percent=value=>Number.isFinite(value)?Math.round(value*100)+'%':'未记录';
const duration=seconds=>seconds<60?seconds.toFixed(1)+' 秒':(seconds/60).toFixed(1)+' 分钟';
const timestamp=seconds=>Math.floor(seconds/60)+'分'+String(Math.floor(seconds%60)).padStart(2,'0')+'秒';
const resident=()=>snapshot.residents.find(item=>item.index===residentIndex);
const selectedObject=()=>targetObjects.find(item=>item.id===targetSelect.value);
function status(message,error=false){byId('status').textContent=message;byId('status').dataset.error=String(error);}
function objectName(id){return snapshot.objects.find(object=>object.id===id)?.name||id||'自由活动';}
function renderOutcomes(container,values){
 const fragment=document.createDocumentFragment();
 OUTPUT_NAMES.forEach((name,index)=>{
  const item=byId('outcome-template').content.firstElementChild.cloneNode(true),value=values[index];
  item.querySelector('[data-label]').textContent=name;item.querySelector('[data-value]').textContent=signed(value);
  const fill=item.querySelector('.signed-fill'),width=Math.min(1,Math.abs(value))*50+'%',start=value<0?50-Math.min(1,Math.abs(value))*50:50;
  fill.style.setProperty('--bar-width',width);fill.style.setProperty('--bar-start',start+'%');fill.classList.toggle('negative',value<0);fragment.append(item);
 });container.replaceChildren(fragment);
}
function renderResidents(){
 residentList.replaceChildren();
 for(const creature of snapshot.residents){
  const button=node('button',undefined,'resident-button'),swatch=node('span',undefined,'swatch');
  const validColor=Number.isInteger(creature.color)&&creature.color>=0&&creature.color<=0xffffff,color=validColor?'#'+creature.color.toString(16).padStart(6,'0'):'#dfd8bf';
  swatch.style.setProperty('--resident-color',color);swatch.setAttribute('aria-hidden','true');button.append(swatch,node('span',creature.name));button.type='button';button.dataset.index=String(creature.index);
  button.addEventListener('click',()=>{residentIndex=creature.index;renderResident();});residentList.append(button);
 }
}
function renderResident(){
 const creature=resident(),brain=creature.brain;
 for(const button of residentList.children)button.setAttribute('aria-pressed',String(Number(button.dataset.index)===residentIndex));
 const healthLabel={coma:' · 昏迷',dead:' · 已经离世'}[creature.health?.state]||'';
 byId('resident-name').textContent=creature.name+'的生活'+healthLabel;byId('resident-thought').textContent=brain.lastThought||'还在认识这个世界';
 const partner=snapshot.residents.find(other=>other.index===brain.romance?.partner);byId('relationship-state').textContent=partner?'恋人：'+partner.name:'尚未确认恋人关系';
 const stats=[['能量',percent(creature.energy)],['精神',percent(1-creature.fatigue)],['参数更新',brain.updates+' 次'],['保留的经历',brain.episodes.length+' 段']];
 byId('resident-stats').replaceChildren(...stats.map(([label,value])=>{const item=node('div',undefined,'stat');item.append(node('strong',value),node('span',label));return item;}));
 const rows=habitRows(creature),observation=brain.observation;
 byId('habit-bars').replaceChildren();
 byId('habit-summary').textContent=rows.length?'在记录到的这段时间里，'+creature.name+'花最多时间在'+rows[0].name+'。':'还没有实际活动时长记录。';
 for(const row of rows){
  const item=node('div'),head=node('div',undefined,'bar-head'),track=node('div',undefined,'track'),fill=node('div',undefined,'fill');
  head.append(node('span',row.name),node('span',percent(row.fraction)+' · '+duration(row.seconds)));
  fill.style.setProperty('--bar-width',row.fraction*100+'%');track.append(fill);item.append(head,track);byId('habit-bars').append(item);
 }
 const short=observation&&observation.total<60;
 byId('habit-note').textContent=observation?'从模拟 '+timestamp(observation.since)+' 起，累计记录 '+duration(observation.total)+'。'+(short?'观察不足一分钟，暂时只代表这一小段生活。':'这些比例描述实际时间分配，也受资源与设施布局影响。'):'旧存档没有这项历史。请用新版世界继续生活一会儿，再导出；已有认知经历仍可在下方分析。';
 const previousTarget=targetSelect.value;targetObjects=objectsFor(snapshot,creature);
 targetObjects.sort((a,b)=>(brain.known[b.id]?.visits||0)-(brain.known[a.id]?.visits||0));
 targetSelect.replaceChildren();
 for(const [kind,label] of [['building','建筑'],['resident','同伴']]){
  const group=node('optgroup');group.label=label;
  for(const object of targetObjects.filter(item=>item.kind===kind)){
   const known=Boolean(brain.known[object.id]),option=node('option',object.name+(known?'':' · 尚未认识'));option.value=object.id;group.append(option);
  }if(group.children.length)targetSelect.append(group);
 }
 const preferred=targetObjects.find(object=>object.id===previousTarget)||targetObjects.find(object=>brain.known[object.id])||targetObjects[0];
 if(preferred)targetSelect.value=preferred.id;
 const familiar=targetObjects.filter(object=>brain.known[object.id]).slice(0,6);byId('familiar-list').replaceChildren();
 if(!familiar.length)byId('familiar-list').append(node('p','还没有认识的地方或同伴。','hint'));
 for(const object of familiar){
  const memory=brain.known[object.id],button=node('button',undefined,'place-button'),seconds=observation?.objects[object.id]||0;
  const detail='亲身 '+memory.visits+' 次 · 间接 '+memory.observations+' 次'+(seconds>0?' · 相关活动 '+duration(seconds):'');
  button.type='button';button.append(node('span',object.name),node('small',detail));
  button.addEventListener('click',()=>{targetSelect.value=object.id;chooseTarget();byId('target-controls').scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});byId('familiar-list').append(button);
 }
 byId('timeline').replaceChildren();
 const recent=observation?.recent||[];
 if(!recent.length)byId('timeline').append(node('p','还没有活动轨迹。新记录从更新后的世界开始积累。','hint'));
 for(const item of [...recent].reverse()){
  const entry=node('article'),label=ACTIVITY_NAMES[item.activity],target=item.object?' · '+objectName(item.object):'';
  entry.append(node('strong',label+target),node('p',timestamp(item.start)+' → '+timestamp(item.end)+' · '+duration(item.seconds),'muted'));byId('timeline').append(entry);
 }
 byId('network-summary').textContent=BRAIN.inputs+' → '+BRAIN.hidden+' → '+BRAIN.outputs+' · '+(brain.w1.length+brain.w2.length)+' 个参数 · 已更新 '+brain.updates+' 次。观察、转述和睡眠回放也会更新网络。';
 chooseTarget();renderWeights();
}
function chooseTarget(){const object=selectedObject();if(object)actionSelect.value=defaultAction(object);renderTarget();}
function renderRelations(creature,object){
 const box=byId('relations');box.hidden=object?.kind!=='resident';box.replaceChildren();if(box.hidden)return;
 const other=snapshot.residents.find(item=>'friend-'+item.index===object.id),relation=other?creature.brain.relations[String(other.index)]:null,reverse=other?.brain.relations[String(creature.index)];
 if(!other){box.append(node('p','这位同伴不在当前居民快照中，无法显示双向关系。'));return;}
 const mutual=creature.brain.romance?.partner===other.index&&other.brain.romance?.partner===creature.index;
 box.append(node('strong',mutual?'它们已经互相确认恋人关系':'它们的双向关系'));
 box.append(node('p',creature.name+' → '+other.name+'：好感 '+percent(relation?.affection)+' · 信任 '+percent(relation?.trust)+' · 亲近 '+percent(relation?.affinity)));
 box.append(node('p',other.name+' → '+creature.name+'：好感 '+percent(reverse?.affection)+' · 信任 '+percent(reverse?.trust)+' · 亲近 '+percent(reverse?.affinity)));
 const shared=relation?.sharedSeconds||0,dates=relation?.dateSeconds||0;
 box.append(node('p','有效互动 '+duration(shared)+' · 其中约会 '+duration(dates)+'。这些是关系规则的记录，不是网络输出。','hint'));
}
function renderTarget(){
 const creature=resident(),object=selectedObject(),standard=contextSelect.value==='standard';
 evaluation=object?evaluateObject(creature,object,actionSelect.value,standard):null;
 byId('attitude').replaceChildren();byId('evidence-list').replaceChildren();renderRelations(creature,object);
 byId('context-note').textContent=standard?'统一状态：能量 0.6、疲劳 0.3；愉悦 0.2、活跃 0.5、安心 0.7、亲近 0.5；熟悉度 0.5、当前无同伴。选择的动作仅用于试算，不保证对象实际支持。':'使用快照中的身体、心情与附近同伴状态，熟悉度来自对该对象的亲身经历。选择的动作仅用于试算，不保证对象实际支持。';
 byId('forecast').hidden=!evaluation;byId('forecast-note').hidden=!evaluation;
 if(!evaluation){
  const message=object?'还没有认识'+object.name:'快照里还没有可分析的对象';
  byId('attitude').append(node('strong',message),node('p','目前没有对象记忆，无法据此解释它的态度。','hint'));
  byId('evidence-summary').textContent='没有把未知对象的预测当作已有认识。';byId('evidence-list').append(node('p','没有相关认知经历。','hint'));renderSensitivity();return;
 }
 const qualified=evaluation.visits>=3,positive=evaluation.score>.12,negative=evaluation.score<-.12;
 const expectation=positive?'它预计这次互动会带来一些好处':negative?'它预计这次互动可能不太合适':'它预计这次互动带来的变化不大';
 const headline=evaluation.visits===0?'初步猜测：'+expectation:expectation;
 byId('attitude').append(node('strong',headline));
 const source=evaluation.visits===0?'还没有亲身尝试，主要依据初始网络和间接学习。':qualified?'这是神经网络在所选情境下的估计，会随经历改变。':'亲身经历还少，先把这个预期当作试探。';
 byId('attitude').append(node('p',source+' 按身体与心情需求加权的预测值：'+signed(evaluation.score)+'。','hint'));
 byId('evidence-summary').textContent='累计亲身 '+evaluation.visits+' 次 · 观察 / 转述 '+evaluation.observations+' 次 · 当前还保留 '+evaluation.evidence.length+' 段相关经历。';
 renderOutcomes(byId('predictions'),evaluation.prediction);
 if(evaluation.actual){renderOutcomes(byId('actuals'),evaluation.actual);byId('actual-note').textContent='保留记忆中 '+evaluation.matched.length+' 次同类行动的亲身结果均值。历史身体状态与所处环境可能不同。';}
 else{byId('actuals').replaceChildren(node('p','还没有保留下来的同类行动亲身结果。','muted'));byId('actual-note').textContent='观察和转述不会被混入亲身结果，也不会用零填充缺失数据。';}
 for(const episode of [...evaluation.evidence].reverse()){
  const entry=node('article'),source=sourceNames[episode.source],action=experienceNames[episode.action]||episode.action;
  entry.append(node('strong',source+' · '+action),node('p','模拟 '+timestamp(episode.time),'muted'));
  const targets=OUTPUT_NAMES.map((name,index)=>episode.source!=='self'&&index<2?name+'：未观察':name+' '+signed(episode.target[index]));
  entry.append(node('p',targets.join(' · ')));byId('evidence-list').append(entry);
 }
 if(!evaluation.evidence.length)byId('evidence-list').append(node('p','相关旧经历可能已被最近的记忆替换；累计次数仍然保留。','hint'));
 renderSensitivity();
}
function renderSensitivity(){
 const container=byId('sensitivity');container.replaceChildren();
 if(!evaluation){container.append(node('p','选择一个已经认识的对象后，可以查看输入影响。','hint'));return;}
 const table=node('table'),head=node('thead'),header=node('tr');header.append(node('th','单独增加的输入'));
 for(const label of OUTPUT_NAMES)header.append(node('th',label));head.append(header);table.append(head);
 const body=node('tbody');for(const item of inputSensitivity(resident(),evaluation)){const row=node('tr');row.append(node('th',item.name));for(const value of item.change)row.append(node('td',signed(value)));body.append(row);}table.append(body);container.append(table);
}
function renderWeights(){
 if(!snapshot||!byId('network-details').open)return;
 const brain=resident().brain,first=byId('weight-layer').value==='w1',values=first?brain.w1:brain.w2;
 const hidden=Array.from({length:BRAIN.hidden},(_,index)=>'隐藏 '+(index+1)),columns=[...(first?INPUT_NAMES:hidden),'偏置'],rows=first?hidden:OUTPUT_NAMES;
 byId('weight-summary').textContent='本层 '+values.length+' 个参数 · 最小 '+Math.min(...values).toFixed(6)+' · 最大 '+Math.max(...values).toFixed(6);
 const table=node('table',undefined,'weight-table'),head=node('thead'),header=node('tr');header.append(node('th','接收 / 来源'));
 for(const label of columns)header.append(node('th',label));head.append(header);table.append(head);
 const body=node('tbody');rows.forEach((label,rowIndex)=>{
  const row=node('tr');row.append(node('th',label));columns.forEach((source,column)=>{
   const value=values[rowIndex*columns.length+column],cell=node('td',value.toFixed(3)),strength=Math.min(1,Math.abs(value)/.5),lightness=97-strength*40,hue=value<0?205:24;
   cell.style.backgroundColor='hsl('+hue+' 48% '+lightness+'%)';cell.title=source+' → '+label+' = '+String(value);row.append(cell);
  });body.append(row);
 });table.append(body);byId('weights').replaceChildren(table);
}
function load(data,label){
 const clean=validateSnapshot(data);snapshot=clean;
 const exists=snapshot.residents.some(item=>item.index===residentIndex);if(!exists)residentIndex=snapshot.residents[0].index;
 byId('empty').hidden=true;byId('workspace').hidden=false;byId('export-snapshot').disabled=false;
 byId('snapshot-time').textContent='世界时刻：'+timestamp(snapshot.time)+'。共 '+snapshot.residents.length+' 位居民。'+(snapshot.environment?' 季节第 '+snapshot.environment.day+' 天 · '+snapshot.environment.phase:'');
 status('已载入 '+label+' · 导出时间 '+(typeof snapshot.exportedAt==='string'?snapshot.exportedAt:'未记录')+'。此页分析不会改变世界。');
 renderResidents();renderResident();
}
for(const [key,label] of Object.entries(ACTION_NAMES)){const option=node('option',label);option.value=key;actionSelect.append(option);}
targetSelect.addEventListener('change',chooseTarget);actionSelect.addEventListener('change',renderTarget);contextSelect.addEventListener('change',renderTarget);
byId('network-details').addEventListener('toggle',renderWeights);byId('weight-layer').addEventListener('change',renderWeights);
byId('import-file').addEventListener('change',async event=>{
 const file=event.target.files[0];if(!file)return;const ticket=++importTicket;
 try{if(file.size>16*1024*1024)throw new Error('快照超过 16MB，请检查是否选错文件。');const text=await file.text();if(ticket!==importTicket)return;load(JSON.parse(text),file.name);}
 catch(error){const retained=snapshot?' 原先载入的数据仍保留。':'';if(ticket===importTicket)status('未能导入：'+error.message+retained,true);}
 finally{if(ticket===importTicket)event.target.value='';}
});
byId('export-snapshot').addEventListener('click',()=>{
 if(!snapshot)return;const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=node('a');
 link.href=url;link.download='小球生活快照-'+Math.floor(snapshot.time)+'秒.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
});
try{const seed=JSON.parse(byId('analysis-seed').textContent);if(seed)load(seed,'当前世界快照');}catch(error){status('未能载入随页快照：'+error.message,true);}
