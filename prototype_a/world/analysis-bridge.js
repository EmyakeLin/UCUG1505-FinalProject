import {ANALYSIS_HTML} from 'analysis-document';
import {exportBrain} from 'cognition';

export function createAnalysisBridge(api){
 const openButton=document.getElementById('analysis-open'),exportButton=document.getElementById('analysis-export'),notice=document.getElementById('brain-notice');
 function snapshot(){
  const residents=api.creatures.map(creature=>{
   const point=api.positionOf(creature),company=api.creatures.some(other=>{if(other===creature)return false;const nearby=api.positionOf(other);return Math.hypot(point.x-nearby.x,point.z-nearby.z)<2.4;});
   return {index:creature.index,name:creature.name,color:creature.color,energy:creature.energy,fatigue:creature.fatigue,satiety:creature.satiety,nightSleep:creature.nightSleep?{...creature.nightSleep}:null,mood:{...creature.mood},company,action:creature.action,inventory:creature.inventory?structuredClone(creature.inventory):null,health:creature.health?{...creature.health}:null,brain:exportBrain(creature.brain)};
  });
  const objects=api.buildings.map(record=>{
   const definition=api.catalog.find(item=>item.key===record.key),suffix=record.id.startsWith('initial-')?'初始':record.id.replace('built-','');
   return {id:record.id,name:(definition?.name||record.key)+' · '+suffix,kind:'building',key:record.key};
  });
  for(const creature of api.creatures)objects.push({id:'friend-'+creature.index,name:creature.name,kind:'resident',index:creature.index});
  return {type:'ucug1505-life-analysis',version:1,exportedAt:new Date().toISOString(),time:api.time(),environment:api.climate?.()||null,residents,objects};
 }
 openButton.addEventListener('click',()=>{
  let page=null;
  try{
   const data=snapshot(),seed=JSON.stringify(data).replace(/</g,'\\u003c'),html=ANALYSIS_HTML.replace('ANALYSIS_SEED',()=>seed);
   page=window.open('','_blank');
   if(!page){notice.textContent='浏览器没有打开新页。可允许此页弹出窗口，或导出生活快照后在独立分析页中导入。';return;}
   page.opener=null;page.document.open();page.document.write(html);page.document.close();notice.textContent='已在新页面打开全部小球的生活与认知快照。';
  }catch(error){if(page)page.close();notice.textContent='分析页未能打开：'+error.message+'。可以先导出生活快照。';}
 });
 exportButton.addEventListener('click',()=>{
  try{
   const data=snapshot(),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download='小球生活快照-'+Math.floor(data.time)+'秒.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
   notice.textContent='已发起生活快照下载，可在独立分析页中导入。';
  }catch(error){notice.textContent='快照未能导出：'+error.message;}
 });
 openButton.disabled=false;exportButton.disabled=false;
 return {snapshot};
}
