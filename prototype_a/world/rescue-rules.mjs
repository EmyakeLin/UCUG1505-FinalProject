// Domain-only policies, shared by the live dispatcher and regression tests.
export const RESCUE={minEnergy:.24,maxFatigue:.78,stopEnergy:.12,stopFatigue:.92,energyReserve:.08,fatigueReserve:.06};
export function canOfferHelp(creature,{busy=false,eating=false,transporting=false}={}){
 if(creature.health?.state&&creature.health.state!=='awake')return false;
 if(busy||eating||transporting||creature.energy<RESCUE.minEnergy||creature.fatigue>RESCUE.maxFatigue)return false;
 // Let a resident finish actively recovering before interrupting them.
 if(['charge','go-charge','eat','go-eat','sleep','go-sleep','recover','go-recover'].includes(creature.action))return false;
 return true;
}
export function needsRecovery(creature,danger=0){return creature.energy<.28+.05*Math.max(0,danger)||creature.fatigue>.78;}
export function routeBudget(start,path,speed,energyRate,fatigueRate){
 let previous=start,energy=0,fatigue=0,seconds=0,distance=0;
 for(const point of path){const length=Math.hypot(point.x-previous.x,point.z-previous.z),steps=Math.max(1,Math.ceil(length));
  const interval=length/Math.max(.3,speed)/steps;
  for(let index=0;index<steps;index++){const weight=(index+.5)/steps,sample={x:previous.x+(point.x-previous.x)*weight,z:previous.z+(point.z-previous.z)*weight};energy+=Math.max(0,energyRate(sample))*interval;fatigue+=Math.max(0,fatigueRate(sample))*interval;}
  seconds+=length/Math.max(.3,speed);distance+=length;previous=point;
 }
 return {energy,fatigue,seconds,distance};
}
export function affordableRescue(creature,cost){return creature.energy>=cost.energy*1.15+RESCUE.energyReserve&&creature.fatigue+cost.fatigue*1.15<=1-RESCUE.fatigueReserve;}
export function urgentOrder(first,second){return (second.health?.nightSeconds||0)-(first.health?.nightSeconds||0);}
