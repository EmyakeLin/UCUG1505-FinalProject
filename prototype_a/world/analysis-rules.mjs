import {importBrain,inputVector,predict,learnedValue,actionClass} from './cognition.mjs';

export const ACTIVITY_NAMES={coma:'昏迷',dead:'已经离世',rescue:'医疗救援',rest:'休息与发呆',sun:'晒太阳',food:'吃东西',charge:'巨碑充能',play:'和同伴玩',chat:'聊天',date:'约会',work:'生产与配送',study:'学习与研究',community:'共同生活',explore:'探索与走动',travel:'前往目的地'};
export const ACTION_NAMES={try:'尝试接触',rest:'休息',eat:'补给 / 进食',social:'社交',work:'工作',observe:'观察'};
export const OUTPUT_NAMES=['能量变化','疲劳改善','愉悦变化','安心变化','亲近变化'];
export const INPUT_NAMES=['能量','疲劳','愉悦','活跃','安心','亲近','有同伴','熟悉度','宽度','高度','深度','红色分量','绿色分量','蓝色分量','发光','接近点数量','尝试动作','休息动作','进食动作','社交动作','工作动作','观察动作','实例编码一','实例编码二'];
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const nonnegative=value=>finite(value)&&value>=0;
export function activityOf(creature){
 const action=creature.action,mode=creature.socialJob?.mode;
 if(action==='provision')return ['dine','eat-carried','eat-raw'].includes(creature.provisionMode)?'food':creature.provisionMode==='share'?'community':'work';
 if(['coma','dead'].includes(action))return action;
 if(['go-medical','medical','medical-tow'].includes(action))return 'rescue';
 if(action==='society'){
  if(['process','prepare','repair','cook','fetch-food','collect-part'].includes(mode))return 'work';
  if(['study','experiment'].includes(mode))return 'study';
  if(mode==='garden')return 'rest';if(mode==='meal')return 'food';return 'community';
 }
 if(['work','cart','load','deliver','unload','return-cart'].includes(action))return 'work';
 if(['sleep','idle','toy-rest','recover'].includes(action))return 'rest';
 if(['charge','charge-rest'].includes(action))return 'charge';
 if(['eat'].includes(action))return 'food';
 if(['play','toy-cross'].includes(action))return 'play';
 if(['chat','date','sun'].includes(action))return action;
 if(['wander','discover','go-discover'].includes(action))return 'explore';
 if(['guide','go-guide'].includes(action))return 'community';return 'travel';
}
export function recordLife(creature,seconds,time){
 if(!nonnegative(seconds)||seconds===0||creature.health?.state==='dead')return;
 const record=creature.brain.observation??={since:Math.max(0,time-seconds),total:0,activities:{},objects:{},recent:[]};
 const activity=activityOf(creature),object=creature.provisionTarget||creature.medicalTarget||creature.health?.clinic||(creature.playPartner?'friend-'+creature.playPartner.index:creature.experience?.record.id||creature.slot?.facility?.id||null);
 record.total+=seconds;record.activities[activity]=(record.activities[activity]||0)+seconds;
 if(object)record.objects[object]=(record.objects[object]||0)+seconds;
 const previous=record.recent[record.recent.length-1];
 if(previous&&previous.activity===activity&&previous.object===object){previous.end=time;previous.seconds+=seconds;}
 else{record.recent.push({activity,object,start:Math.max(0,time-seconds),end:time,seconds});if(record.recent.length>120)record.recent.shift();}
}
export function validateSnapshot(data){
 if(data?.type!=='ucug1505-life-analysis'||data.version!==1){
  if(data?.layers)throw new Error('这是旧的纯权重文件，没有生活经历和对象信息。请在新版世界中点击“导出生活快照”。');
  throw new Error('请选择从世界导出的“生活快照”JSON。');
 }
 if(!nonnegative(data.time)||!Array.isArray(data.residents)||data.residents.length<1||data.residents.length>32||!Array.isArray(data.objects)||data.objects.length>256)throw new Error('快照的时间、居民或对象列表无效。');
 const clean=JSON.parse(JSON.stringify(data)),ids=new Set();
 for(const resident of clean.residents){
  if(!Number.isInteger(resident.index)||resident.index<0||ids.has(resident.index)||typeof resident.name!=='string')throw new Error('居民身份重复或缺失。');ids.add(resident.index);
  if(!finite(resident.energy)||resident.energy<0||resident.energy>1||!finite(resident.fatigue)||resident.fatigue<0||resident.fatigue>1||!resident.mood)throw new Error('居民身体数据无效。');
  for(const key of ['pleasure','arousal','safety','connection']){const value=resident.mood[key],minimum=key==='pleasure'?-1:0;if(!finite(value)||value<minimum||value>1)throw new Error('居民心情数据无效。');}
  resident.brain=importBrain(resident.brain);
  const brain=resident.brain;
  if(!brain.known||typeof brain.known!=='object'||Array.isArray(brain.known)||Object.keys(brain.known).length>512||!brain.relations||typeof brain.relations!=='object'||!nonnegative(brain.updates))throw new Error('认知记录无效。');
  brain.known=Object.assign(Object.create(null),brain.known);brain.relations=Object.assign(Object.create(null),brain.relations);
  for(const memory of Object.values(brain.known))if(!memory||!Array.isArray(memory.visible)||memory.visible.length!==8||!memory.visible.every(finite)||!nonnegative(memory.visits)||!nonnegative(memory.observations))throw new Error('对象记忆无效。');
  for(const episode of brain.episodes)if(typeof episode.place!=='string'||typeof episode.action!=='string'||!['self','observed','told'].includes(episode.source)||!nonnegative(episode.time))throw new Error('经历记录无效。');
  const observation=brain.observation;
  if(observation){
   if(!nonnegative(observation.since)||!nonnegative(observation.total)||!observation.activities||!observation.objects||!Array.isArray(observation.recent)||observation.recent.length>120)throw new Error('生活时长记录无效。');
   for(const [key,value] of Object.entries(observation.activities))if(!Object.hasOwn(ACTIVITY_NAMES,key)||!nonnegative(value))throw new Error('活动时长无效。');
   const totalActivities=Object.values(observation.activities).reduce((sum,value)=>sum+value,0),tolerance=Math.max(1,observation.total)*1e-6;
   if(Math.abs(totalActivities-observation.total)>tolerance)throw new Error('活动时长合计与累计时间不一致。');
   for(const value of Object.values(observation.objects))if(!nonnegative(value))throw new Error('对象停留时长无效。');
   for(const item of observation.recent)if(!Object.hasOwn(ACTIVITY_NAMES,item.activity)||!nonnegative(item.start)||!nonnegative(item.end)||item.end<item.start||!nonnegative(item.seconds))throw new Error('生活轨迹无效。');
  }
 }
 const objects=new Set();for(const object of clean.objects){if(typeof object.id!=='string'||objects.has(object.id)||typeof object.name!=='string'||!['building','resident'].includes(object.kind))throw new Error('对象身份无效。');objects.add(object.id);}
 return clean;
}
export function objectsFor(snapshot,resident){
 const objects=snapshot.objects.filter(object=>object.id!=='friend-'+resident.index).map(object=>({...object}));
 for(const id of Object.keys(resident.brain.known))if(!objects.some(object=>object.id===id))objects.push({id,name:'旧对象 '+id,kind:id.startsWith('friend-')?'resident':'building',key:''});
 return objects;
}
export function defaultAction(object){
 if(object.kind==='resident')return 'social';
 if(['monolith','bowl','community_kitchen'].includes(object.key))return 'eat';
 if(['nest','sunlight','quiet_garden'].includes(object.key))return 'rest';
 if(['learning_room','community_plaza','public_forum','welcome_station'].includes(object.key))return 'social';
 if(['workshop','repair_workshop','material_processing','energy_research'].includes(object.key))return 'work';return 'try';
}
export function evaluateObject(resident,object,action,standard=false){
 const memory=resident.brain.known[object.id];if(!memory)return null;
 const body=standard?{energy:.6,fatigue:.3,mood:{pleasure:.2,arousal:.5,safety:.7,connection:.5},company:false,familiarity:.5}:{energy:resident.energy,fatigue:resident.fatigue,mood:{...resident.mood},company:Boolean(resident.company),familiarity:Math.min(1,memory.visits/8)};
 const input=inputVector(body,memory.visible,action,object.id),prediction=predict(resident.brain,input),score=learnedValue(resident.brain,input,body);
 const evidence=resident.brain.episodes.filter(episode=>episode.place===object.id),self=evidence.filter(episode=>episode.source==='self');
 const matched=self.filter(episode=>actionClass(episode.action)===action);
 const actual=matched.length?OUTPUT_NAMES.map((_,index)=>matched.reduce((sum,episode)=>sum+episode.target[index],0)/matched.length):null;
 return {body,input,prediction,score,evidence,self,matched,actual,visits:memory.visits,observations:memory.observations};
}
export function habitRows(resident){
 const observation=resident.brain.observation;if(!observation||observation.total<=0)return [];
 return Object.entries(observation.activities).map(([key,seconds])=>({key,name:ACTIVITY_NAMES[key],seconds,fraction:seconds/observation.total})).sort((a,b)=>b.seconds-a.seconds);
}
export function inputSensitivity(resident,evaluation){
 if(!evaluation)return [];
 return INPUT_NAMES.slice(0,6).map((name,index)=>{
  const low=[...evaluation.input],high=[...evaluation.input],minimum=index===2?-1:0;
  low[index]=Math.max(minimum,low[index]-.05);high[index]=Math.min(1,high[index]+.05);
  const before=predict(resident.brain,low),after=predict(resident.brain,high),span=high[index]-low[index];
  const change=after.map((value,output)=>(value-before[output])*.1/span);
  return {name,change};
 });
}
