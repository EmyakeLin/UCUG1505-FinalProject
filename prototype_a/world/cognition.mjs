// Small per-resident neural predictor. No browser, rendering, or global-world access.
export const BRAIN={version:1,inputs:24,hidden:20,outputs:5,episodes:160,rate:.028};
const clamp=(value,low=-1,high=1)=>Math.max(low,Math.min(high,value));
function random(seed){let state=seed>>>0;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
export function createBrain(seed=1){
 const draw=random(seed);
 return {version:BRAIN.version,w1:Array.from({length:BRAIN.hidden*(BRAIN.inputs+1)},()=> (draw()-.5)*.3),w2:Array.from({length:BRAIN.outputs*(BRAIN.hidden+1)},()=> (draw()-.5)*.12),known:{},relations:{},episodes:[],updates:0,frozen:false,practice:{},beliefs:{},lastThought:'还在认识这个世界',lastReplay:0};
}
function identity(id){let hash=2166136261;for(const character of String(id))hash=Math.imul(hash^character.charCodeAt(0),16777619);return [(hash&65535)/32767.5-1,((hash>>>16)&65535)/32767.5-1];}
export function inputVector(body,visible,action='try',id=''){
 const actions=['try','rest','eat','social','work','observe'];
 const vector=[body.energy,body.fatigue,body.mood.pleasure,body.mood.arousal,body.mood.safety,body.mood.connection,body.company?1:0,body.familiarity||0,...visible.slice(0,8),...actions.map(name=>Number(name===action)),...identity(id)];
 return vector.map(value=>clamp(Number.isFinite(value)?value:0));
}
function forward(brain,input){
 const hidden=[];for(let row=0;row<BRAIN.hidden;row++){const offset=row*(BRAIN.inputs+1);let sum=brain.w1[offset+BRAIN.inputs];for(let column=0;column<BRAIN.inputs;column++)sum+=brain.w1[offset+column]*input[column];hidden.push(Math.tanh(sum));}
 const output=[];for(let row=0;row<BRAIN.outputs;row++){const offset=row*(BRAIN.hidden+1);let sum=brain.w2[offset+BRAIN.hidden];for(let column=0;column<BRAIN.hidden;column++)sum+=brain.w2[offset+column]*hidden[column];output.push(Math.tanh(sum));}return {hidden,output};
}
export function predict(brain,input){return forward(brain,input).output;}
export function train(brain,input,target,weight=1,mask=[1,1,1,1,1]){
 const {hidden,output}=forward(brain,input);let loss=0;
 const delta=output.map((value,index)=>{const error=clamp(target[index])-value;loss+=error*error*mask[index];return error*(1-value*value)*mask[index];});
 if(brain.frozen)return loss;
 const hiddenDelta=hidden.map((value,column)=>{let sum=0;for(let row=0;row<BRAIN.outputs;row++)sum+=delta[row]*brain.w2[row*(BRAIN.hidden+1)+column];return sum*(1-value*value);});
 const rate=BRAIN.rate*clamp(weight,0,1);
 for(let row=0;row<BRAIN.outputs;row++){const offset=row*(BRAIN.hidden+1);for(let column=0;column<BRAIN.hidden;column++)brain.w2[offset+column]=clamp(brain.w2[offset+column]+rate*delta[row]*hidden[column],-4,4);brain.w2[offset+BRAIN.hidden]=clamp(brain.w2[offset+BRAIN.hidden]+rate*delta[row],-4,4);}
 for(let row=0;row<BRAIN.hidden;row++){const offset=row*(BRAIN.inputs+1);for(let column=0;column<BRAIN.inputs;column++)brain.w1[offset+column]=clamp(brain.w1[offset+column]+rate*hiddenDelta[row]*input[column],-4,4);brain.w1[offset+BRAIN.inputs]=clamp(brain.w1[offset+BRAIN.inputs]+rate*hiddenDelta[row],-4,4);}
 brain.updates++;return loss;
}
export function discover(brain,id,visible,point,time,source='seen'){
 if(!brain.known[id])brain.known[id]={visible:[...visible],point:{x:point.x,z:point.z},visits:0,observations:0,error:.5,lastSeen:time,source};
 if(source==='seen')brain.known[id].lastSeen=time;
 return brain.known[id];
}
export function uncertainty(brain,id){const memory=brain.known[id];return memory?clamp(.65/Math.sqrt(1+memory.visits+memory.observations*.2)+memory.error*.35,0,1):1;}
export function remember(brain,episode){
 const indirect=episode.source!=='self',mask=indirect?[0,0,1,1,1]:[1,1,1,1,1];
 const trust=episode.teacher?(brain.relations[episode.teacher]?.trust??.5):.5;
 const weight=indirect?.15+trust*.2:1;
 const error=train(brain,episode.input,episode.target,weight,mask)/mask.reduce((sum,value)=>sum+value,0);
 const memory=brain.known[episode.place];
 if(memory){if(indirect)memory.observations++;else memory.visits++;memory.error=memory.error*.8+Math.sqrt(error)*.2;}
 const stored={...episode,input:[...episode.input],target:[...episode.target],mask,weight,salience:.1+Math.sqrt(error)+Math.abs(episode.target[2])};
 brain.episodes.push(stored);if(brain.episodes.length>BRAIN.episodes)brain.episodes.shift();
 if(!indirect){brain.practice[episode.place]=(brain.practice[episode.place]||0)+1;
  const report=brain.episodes.slice(0,-1).reverse().find(item=>item.place===episode.place&&item.teacher);
  if(report){const disagreement=Math.abs(report.target[2]-episode.target[2]);const relation=brain.relations[report.teacher]??={trust:.5,affinity:.5};relation.trust=clamp(relation.trust*.9+(1-disagreement)*.1,0,1);}
 }
 return error;
}
export function replay(brain,draw=Math.random){
 if(!brain.episodes.length)return false;
 const total=brain.episodes.reduce((sum,episode)=>sum+episode.salience,0);let cursor=draw()*total;
 let chosen=brain.episodes[0];for(const episode of brain.episodes){cursor-=episode.salience;if(cursor<=0){chosen=episode;break;}}
 train(brain,chosen.input,chosen.target,chosen.weight*.6,chosen.mask);return true;
}
export function learnedValue(brain,input,body){
 const outcome=predict(brain,input);
 const needs=[.5+(1-body.energy)*2,.3+body.fatigue*1.7,.35+(1-body.mood.pleasure)*.3,.2+(1-body.mood.safety),.2+(1-body.mood.connection)];
 return outcome.reduce((sum,value,index)=>sum+value*needs[index],0);
}
export function snapshotBody(creature){return [creature.energy,-creature.fatigue,creature.mood.pleasure,creature.mood.safety,creature.mood.connection];}
export function outcomeBetween(before,after,seconds){const scale=10/Math.max(4,Math.min(30,seconds));return after.map((value,index)=>clamp((value-before[index])*scale));}
export function exportBrain(brain){return JSON.parse(JSON.stringify(brain));}
export function importBrain(data){
 if(!data||data.version!==BRAIN.version||data.w1?.length!==BRAIN.hidden*(BRAIN.inputs+1)||data.w2?.length!==BRAIN.outputs*(BRAIN.hidden+1))throw new Error('认知存档版本或尺寸不匹配');
 if(![...data.w1,...data.w2].every(value=>Number.isFinite(value)&&Math.abs(value)<=4))throw new Error('认知存档含无效权重');
 if(!Array.isArray(data.episodes)||data.episodes.length>BRAIN.episodes||data.episodes.some(item=>item.input?.length!==BRAIN.inputs||item.target?.length!==BRAIN.outputs||![...item.input,...item.target].every(Number.isFinite)))throw new Error('经历存档无效');
 const brain=exportBrain(data);brain.frozen=false;return brain;
}

// Shared by live experiences and the read-only analysis page.
export function actionClass(mode){return ['garden','sleep','sun'].includes(mode)?'rest':['meal','eat','charge'].includes(mode)?'eat':['study','plaza','council','welcome','play','chat','date'].includes(mode)?'social':['process','repair','cook','work','experiment'].includes(mode)?'work':'try';}
