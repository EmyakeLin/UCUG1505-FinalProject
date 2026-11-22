import {feed} from './nutrition-rules.mjs';
// Normalized body values; one raw food restores 0.24 energy in this world.
export const RAW_ENERGY=.24;
export const INVENTORY_CAPACITY=4;
export const ITEMS={
 raw:{name:'食物',model:'mote',food:1,rest:0,joy:.28,comfort:0},
 lunch:{name:'便当',model:'Takeaway_Meal_Pack',food:1.6,rest:.05,joy:.12,comfort:.06},
 snack:{name:'零食',model:'Takeaway_Snack_Pack',food:.5,rest:.05,joy:.5,comfort:.08},
 simple:{name:'堂食简餐',model:'Takeaway_Light_Meal',food:.8,rest:.05,joy:.45,comfort:.3},
 packed:{name:'打包简餐',model:'Takeaway_Light_Meal',food:.7,rest:.025,joy:.12,comfort:.08},
 energy:{name:'能源包',model:'Energy_Rescue_Kit',energy:.4,rest:0,joy:0,comfort:0},
 rest:{name:'蓝色急救包',model:'Rest_Care_Kit',energy:.05,rest:.3,joy:0,comfort:0}
};
export const RECIPES={simple:{cost:1,count:1,seconds:7},lunch:{cost:2,count:1,seconds:9},snack:{cost:2,count:2,seconds:8}};
const clamp=(value,min=0)=>Math.max(min,Math.min(1,value));
export function inventoryOf(creature){return creature.inventory??={items:[],held:null};}
export function occupiedSlots(creature){return inventoryOf(creature).items.length+Math.ceil(creature.carry?.food||0);}
export function roomFor(creature,count=1){return occupiedSlots(creature)+count<=INVENTORY_CAPACITY;}
export function putItem(creature,item){if(!ITEMS[item?.type]||!roomFor(creature))return false;inventoryOf(creature).items.push({...item});return true;}
export function takeItem(creature,index){const inventory=inventoryOf(creature);if(!Number.isInteger(index)||index<0||index>=inventory.items.length)return null;const [item]=inventory.items.splice(index,1);if(inventory.held===index)inventory.held=null;else if(inventory.held>index)inventory.held--;return item;}
export function transferItem(first,second,index){if(first===second||!roomFor(second))return false;const item=takeItem(first,index);if(!item)return false;inventoryOf(second).items.push(item);return true;}
export function makeBatch(stock,type,cook,origin){const recipe=RECIPES[type];if(!recipe||stock.raw<recipe.cost||stock.products.length+recipe.count>8)return false;stock.raw-=recipe.cost;for(let index=0;index<recipe.count;index++)stock.products.push({type,cook,origin});return true;}
export function packMeal(item){return item?.type==='simple'?{...item,type:'packed'}:null;}
export function applyItem(creature,item){
 const effect=ITEMS[item?.type];if(!effect||creature.health?.state==='dead')return false;
 creature.energy=clamp(creature.energy+(effect.energy??effect.food*RAW_ENERGY));
 if(effect.food!==undefined)feed(creature,item.type);
 creature.fatigue=clamp(creature.fatigue-effect.rest);
 creature.mood.pleasure=clamp(creature.mood.pleasure+effect.joy,-1);
 creature.mood.comfort=clamp((creature.mood.comfort??.5)+effect.comfort);
 return true;
}
export function mealCredit(eater,cook,item){
 if(!cook||cook===eater||!['simple','packed','lunch','snack'].includes(item.type))return false;
 const relation=eater.brain.relations[String(cook.index)]??={trust:.5,affinity:.5};
 const gain=item.origin==='restaurant'&&item.type!=='simple'?.12:.04;
 relation.affection=clamp((relation.affection??.18)+gain);relation.affinity=clamp((relation.affinity??.5)+gain);
 if(!cook.health||cook.health.state==='awake')cook.mood.pleasure=clamp(cook.mood.pleasure+(item.origin==='restaurant'?.4:.15),-1);
 return true;
}
export function validInventory(value){return value&&Array.isArray(value.items)&&value.items.length<=INVENTORY_CAPACITY&&value.items.every(item=>ITEMS[item?.type]&&(item.cook===null||Number.isInteger(item.cook)&&item.cook>=0&&item.cook<8)&&['restaurant','kitchen','medical','legacy'].includes(item.origin))&&(value.held===null||Number.isInteger(value.held)&&value.held>=0&&value.held<value.items.length);}
