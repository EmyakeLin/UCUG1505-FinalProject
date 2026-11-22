import {applyItem} from './provisions-rules.mjs';
const secondsPerHour=60;
export const WINTER={secondsPerHour,daySeconds:24*secondsPerHour,daysToWinter:10,startHour:12,transitionHours:3,deathNightSeconds:18*secondsPerHour,safeRadius:4,monolithRadius:2,monolithFatigue:.018,clinicEnergy:.003*3,clinicRest:.028};
export function worldClimate(time){
 const elapsed=Math.max(0,time),winter=Math.min(1,elapsed/(WINTER.daySeconds*WINTER.daysToWinter));
 const daylight=12-6*winter,hour=(WINTER.startHour+elapsed/WINTER.secondsPerHour)%24,sunrise=12-daylight/2,sunset=12+daylight/2,half=WINTER.transitionHours/2;
 let phase='白天',darkness=0,danger=0;
 if(hour>=sunrise-half&&hour<sunrise+half){const progress=(hour-(sunrise-half))/3;phase='黎明';darkness=1-progress;danger=2*(1-progress);}
 else if(hour>=sunset-half&&hour<sunset+half){const progress=(hour-(sunset-half))/3;phase='黄昏';darkness=progress;danger=2*progress;}
 else if(hour<sunrise-half||hour>=sunset+half){phase='深夜';darkness=1;danger=3;}
 return {day:Math.floor(elapsed/WINTER.daySeconds)+1,hour,daylight,nightHours:24-daylight,winter,phase,darkness,danger,isNight:hour<sunrise||hour>=sunset,fullNight:phase==='深夜',sunrise,sunset};
}
// Keep the calendar phase and accumulated coma hours when loading the old clock.
// Only the calendar origin moves: task deadlines and learned memories keep their timestamps.
export function retimeWorld(saved){
 if(!saved||saved.clockDaySeconds===WINTER.daySeconds||!Number.isFinite(saved.time))return saved;
 const previousDay=saved.clockDaySeconds??288;
 if(!Number.isFinite(previousDay)||previousDay<=0)throw new Error('存档时间比例无效');
 const data=structuredClone(saved),ratio=WINTER.daySeconds/previousDay;
 const origin=Number.isFinite(data.winterStart)?data.winterStart:data.time;
 data.winterStart=data.time-Math.max(0,data.time-origin)*ratio;
 for(const resident of data.residents||[])if(Number.isFinite(resident.health?.nightSeconds))resident.health.nightSeconds*=ratio;
 data.clockDaySeconds=WINTER.daySeconds;
 return data;
}
export function localDanger(climate,sheltered){return climate.danger*(sheltered?.5:1);}
export function healthOf(creature){return creature.health??={state:'awake',nightSeconds:0,cause:null,clinic:null,bed:null,kit:null,supply:0};}
export function comaCause(energy,fatigue){return energy<=0&&fatigue>=1?'both':energy<=0?'energy':fatigue>=1?'rest':null;}
export function advanceComa(health,seconds,isNight,deathAllowed){
 if(health.state!=='coma')return false;
 if(isNight)health.nightSeconds+=Math.max(0,seconds);
 return Boolean(deathAllowed&&health.nightSeconds>=WINTER.deathNightSeconds-1e-8);
}
export function applyKit(creature,type){
 if(healthOf(creature).state!=='coma'||!['energy','rest'].includes(type))return false;
 return applyItem(creature,{type});
}
export function fullyRecovered(creature){return creature.energy>=1-1e-8&&creature.fatigue<=1e-8;}
export function prepareKit(kits,carrier,type){if(!['energy','rest'].includes(type)||carrier.supply<1||kits[type]>=2)return false;carrier.supply--;kits[type]++;return true;}
export function collectKit(kits,carrier,type){if(!['energy','rest'].includes(type)||carrier.kit||kits[type]<1)return false;kits[type]--;carrier.kit=type;return true;}
