// Bounded planning and decisions use only supplied personal observations.
export function planFor(goal,facts){
 if(goal==='meal')return !facts.kitchenKnown?[]:facts.carryFood?['cook']:facts.foodKnown?['fetch-food','cook']:[];
 if(goal==='repair')return !facts.repairKnown||!facts.cartKnown?[]:facts.carryPart?['repair']:facts.processingKnown?facts.partsKnown?['collect-part','repair']:['process','collect-part','repair']:[];
 if(goal==='research')return !facts.researchKnown?[]:facts.carryPart?['experiment']:facts.processingKnown?facts.partsKnown?['collect-part','experiment']:['process','collect-part','experiment']:[];
 return [];
}
export function proposal(personal){
 const scores={food:(personal.shortage||0)*2+(1-personal.energy),rotation:(personal.labour||0)*.025+personal.fatigue,learning:(personal.uncertainty||0)+.3,energy:(personal.energyError||0)*2};
 return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
}
export function resolveCouncil(votes){
 if(votes.length<2)return null;
 const counts={};for(const vote of votes)counts[vote]=(counts[vote]||0)+1;
 const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
 return ranked[0][1]>votes.length/2?ranked[0][0]:null;
}
export function updateBelief(belief,value){
 const current=belief||{count:0,mean:0,m2:0};const count=current.count+1,delta=value-current.mean,mean=current.mean+delta/count;
 return {count,mean,m2:current.m2+delta*(value-mean)};
}
export function welcomeReady({population,beds,food,elapsed}){return population<8&&beds>population&&food>=4&&elapsed>=120;}
export function fetchIngredients(bowl,carry){const amount=Math.min(2,Math.floor(bowl.bowl));if(amount<1)return false;bowl.bowl-=amount;carry.food+=amount;return true;}
export function cookMeal(kitchen,carry){const amount=Math.min(carry.food,6-kitchen.meals);if(amount<1)return false;carry.food-=amount;kitchen.meals+=amount;return true;}
export function processParts(station){if(station.raw<1||station.parts>4)return false;station.raw--;station.parts+=2;return true;}
export function collectPart(station,carry){if(station.parts<1)return false;station.parts--;carry.part++;return true;}
