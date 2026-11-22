export const FOOD={bowlCapacity:6,cartCapacity:4,stockCapacity:8,batch:4,tendSeconds:5,growSeconds:18,harvestSeconds:4};
export function createFoodState(){return {bowl:3,stock:0,cargo:0,stage:'untended',work:0,growth:0};}
export function canWork(state){return state.stage!=='growing'&&state.stock<=FOOD.stockCapacity-FOOD.batch;}
export function workFood(state,seconds){
 if(!canWork(state))return false;
 const duration=state.stage==='ripe'?FOOD.harvestSeconds:FOOD.tendSeconds;
 state.work=Math.min(duration,state.work+Math.max(0,seconds));
 if(state.work<duration)return false;
 state.work=0;
 if(state.stage==='ripe'){state.stock+=FOOD.batch;state.stage='untended';state.growth=0;}
 else state.stage='growing';
 return true;
}
export function growFood(state,seconds,naturalLight){
 if(state.stage!=='growing')return;
 const increment=Math.max(0,seconds)*Math.max(0,naturalLight)/FOOD.growSeconds;
 state.growth=Math.min(1,state.growth+increment);
 if(state.growth>=1){state.stage='ripe';state.work=0;}
}
export function loadFood(state){
 const space=Math.floor(FOOD.bowlCapacity-state.bowl-state.cargo+1e-9);
 if(state.stock<1||state.cargo>=FOOD.cartCapacity||space<1)return false;
 state.stock--;state.cargo++;return true;
}
export function unloadFood(state){
 if(state.cargo<1||state.bowl>FOOD.bowlCapacity-1+1e-9)return false;
 state.cargo--;state.bowl=Math.min(FOOD.bowlCapacity,state.bowl+1);return true;
}
