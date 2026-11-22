import assert from 'node:assert/strict';
import {ITEMS,inventoryOf,roomFor,putItem,takeItem,transferItem,makeBatch,packMeal,applyItem,mealCredit,validInventory} from './provisions-rules.mjs';
import {createHold,loadCargo,unloadCargo,moveCargo,remainingSpace} from './cargo-rules.mjs';
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);
const resident=index=>({index,energy:.1,fatigue:.8,carry:{food:0},mood:{pleasure:0,safety:.5,comfort:.2},brain:{relations:{}},health:{state:'awake'}});
for(const [type,energy,rest,joy,comfort] of [['lunch',.384,.05,.12,.06],['snack',.12,.05,.5,.08],['simple',.192,.05,.45,.3],['packed',.168,.025,.12,.08],['energy',.4,0,0,0],['rest',.05,.3,0,0]]){
 const creature=resident(0);assert.equal(applyItem(creature,{type}),true);close(creature.energy,.1+energy);close(creature.fatigue,.8-rest);close(creature.mood.pleasure,joy);close(creature.mood.comfort,.2+comfort);
}
const stock={raw:0,products:[]};assert.equal(makeBatch(stock,'lunch',0,'restaurant'),false);stock.raw=2;assert.equal(makeBatch(stock,'lunch',0,'restaurant'),true);assert.equal(stock.raw,0);assert.equal(stock.products.length,1);
stock.raw=2;makeBatch(stock,'snack',1,'restaurant');assert.equal(stock.raw,0);assert.equal(stock.products.filter(item=>item.type==='snack').length,2);
stock.raw=1;makeBatch(stock,'simple',1,'kitchen');assert.equal(stock.raw,0);const simple=stock.products.at(-1),packed=packMeal(simple);assert.equal(packed.type,'packed');assert.equal(packed.cook,1);assert.equal(simple.type,'simple');assert.equal(packMeal(packed),null);
const first=resident(0),second=resident(1);first.carry.food=3;assert.equal(putItem(first,packed),true);assert.equal(roomFor(first),false);assert.equal(putItem(first,packed),false);inventoryOf(first).held=0;
assert.equal(transferItem(first,second,0),true);assert.equal(inventoryOf(first).items.length,0);assert.equal(inventoryOf(first).held,null);assert.equal(inventoryOf(second).items[0].cook,1);assert.equal(transferItem(first,second,0),false);assert.equal(transferItem(second,second,0),false);
assert.equal(mealCredit(second,second,packed),false);assert.deepEqual(second.brain.relations,{});assert.equal(mealCredit(first,second,packed),true);assert.ok(first.brain.relations['1'].affection>.18);assert.ok(second.mood.pleasure>0);assert.deepEqual(second.brain.relations,{});
const heldBefore=JSON.parse(JSON.stringify(inventoryOf(second)));assert.equal(validInventory(heldBefore),true);assert.equal(validInventory({items:[{type:'fake'}],held:null}),false);assert.equal(validInventory({items:[],held:4}),false);
const item=takeItem(second,0);assert.equal(item.type,'packed');assert.equal(takeItem(second,0),null);
const dying=resident(2);dying.health.state='dead';const before=JSON.stringify(dying);assert.equal(applyItem(dying,{type:'energy'}),false);assert.equal(JSON.stringify(dying),before);
const full=resident(3);full.energy=.99;full.fatigue=.01;applyItem(full,{type:'rest'});assert.equal(full.energy,1);assert.equal(full.fatigue,0);
const cart=createHold(4),other=createHold(4);assert.equal(loadCargo(cart,'food',{kind:'item',item:{type:'raw'}},1),true);assert.equal(loadCargo(cart,'food',{kind:'item'},1),false);assert.equal(loadCargo(cart,'ball',{kind:'resident',resident:2},4),false);assert.equal(remainingSpace(cart),3);
assert.equal(moveCargo(cart,other,'food'),true);assert.equal(cart.entries.length,0);assert.equal(other.entries.length,1);assert.equal(loadCargo(cart,'ball',{kind:'resident',resident:2},4),true);assert.equal(loadCargo(cart,'kit',{kind:'item',item:{type:'energy'}},1),false);assert.equal(unloadCargo(cart,'ball').payload.resident,2);
assert.equal(loadCargo(cart,'future-object',{kind:'future-object',modelKey:'new_prop',data:{owner:4}},2),true);assert.equal(moveCargo(other,cart,'food'),true);assert.equal(remainingSpace(cart),1);assert.equal(loadCargo(cart,'invalid',{},-1),false);
assert.deepEqual(JSON.parse(JSON.stringify(cart)),cart);
console.log('Provisions/cargo data checks passed: exact recipes and effects, no free food, packing loss, capacity, transfer ownership, maker attribution, no self-affection, clamping, dead guard, persistence and arbitrary cargo.');
