import {discover} from './cognition.mjs';

export const INITIAL_POPULATION=6;
export const INITIAL_KNOWLEDGE_VERSION=1;
// The fixed set supplies the world's core adapters; planned entries use the layout planner.
export const INITIAL_BUILDINGS=[
 {id:'initial-monolith',key:'monolith',known:false,point:{x:-26,z:-22}},
 {id:'initial-sunlight',key:'sunlight',known:true,point:{x:-5,z:-1}},
 {id:'initial-nest',key:'nest',known:true,point:{x:-17,z:10}},
 {id:'initial-bowl',key:'bowl',known:true,point:{x:5,z:6}},
 {id:'initial-arch',key:'arch',known:true,point:{x:-4,z:15}},
 {id:'initial-workshop',key:'workshop',known:true,point:{x:17,z:-8}},
 {id:'built-1',key:'ball_home',known:true},
 {id:'built-2',key:'medical_station',known:true},
 {id:'built-3',key:'ball_restaurant',known:true}
];
export function familiarMemory(memory){return Boolean(memory&&(memory.initialFamiliar||memory.visits>0));}
export function seedInitialKnowledge(residents,buildings,positionOf,time){
 const cohort=residents.filter(resident=>resident.index<INITIAL_POPULATION);
 const familiarBuildings=buildings.filter(record=>INITIAL_BUILDINGS.some(definition=>definition.known&&definition.id===record.id&&definition.key===record.key));
 for(const resident of cohort){
  for(const record of familiarBuildings){
   const memory=discover(resident.brain,record.id,record.visible,record.model.position,time,'initial');
   memory.initialFamiliar=true;memory.purpose??=record.key;
   if(record.key==='bowl')memory.food=record.anchors[0]?.foodSite?.state.bowl||0;
  }
  for(const peer of cohort){
   if(peer===resident)continue;
   const memory=discover(resident.brain,'friend-'+peer.index,[.1,.1,.5,.5,.5,0,0,1],positionOf(peer),time,'initial');
   memory.initialFamiliar=true;
   resident.brain.relations[String(peer.index)]??={trust:.5,affinity:.5};
  }
 }
}
