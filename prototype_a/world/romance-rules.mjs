// Fictional relationships grow from shared life; a bond requires both residents.
const clamp=value=>Math.max(0,Math.min(1,value));
export function romanceState(creature){return creature.brain.romance??={partner:null,nextInvite:0,since:null};}
export function feelings(creature,other,create=false){
 const key=String(other.index);
 let relation=creature.brain.relations[key];
 if(!relation&&create)relation=creature.brain.relations[key]={trust:.5,affinity:.5};
 if(relation&&create){relation.affection??=.18;relation.sharedSeconds??=0;relation.dateSeconds??=0;}
 return relation;
}
export function comfortable(creature){return (!creature.health||creature.health.state==='awake')&&creature.energy>.38&&creature.fatigue<.72&&creature.mood.safety>.4&&creature.mood.pleasure>-.15;}
export function spendTime(first,second,seconds,kind){
 if(!comfortable(first)||!comfortable(second))return;
 const rate=kind==='date'?.012:kind==='play'||kind==='chat'?.009:.0015;
 for(const [self,other] of [[first,second],[second,first]]){
  const relation=feelings(self,other,true),personalGain=.75+Math.max(0,self.mood.pleasure)*.5;
  relation.affection=clamp(relation.affection+seconds*rate*personalGain);
  if(kind!=='nearby')relation.sharedSeconds+=seconds;
  if(kind==='date')relation.dateSeconds+=seconds;
 }
}
export function canDate(first,second){
 const a=romanceState(first),b=romanceState(second),forward=feelings(first,second),back=feelings(second,first);
 const available=(a.partner===null||a.partner===second.index)&&(b.partner===null||b.partner===first.index);
 return available&&comfortable(first)&&comfortable(second)&&(forward?.affection||0)>=.34&&(back?.affection||0)>=.28&&(forward?.sharedSeconds||0)>=10&&(back?.sharedSeconds||0)>=10;
}
export function wantsDate(creature,draw){
 if(!comfortable(creature))return false;
 const willingness=clamp(.4+creature.mood.safety*.2+Math.max(0,creature.mood.pleasure)*.2-creature.fatigue*.15);
 return draw<willingness;
}
export function confirmBond(first,second,time){
 if(!canDate(first,second))return false;
 const a=romanceState(first),b=romanceState(second);
 if(a.partner!==null||b.partner!==null)return false;
 const ready=[feelings(first,second),feelings(second,first)].every(relation=>relation.affection>=.64&&relation.sharedSeconds>=35&&relation.dateSeconds>=8&&relation.trust>=.4);
 if(!ready)return false;
 a.partner=second.index;b.partner=first.index;a.since=time;b.since=time;return true;
}
