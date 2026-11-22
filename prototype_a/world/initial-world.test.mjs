import assert from 'node:assert/strict';
import {createBrain} from './cognition.mjs';
import {INITIAL_BUILDINGS,seedInitialKnowledge,familiarMemory} from './initial-world.mjs';
const residents=Array.from({length:7},(_,index)=>({index,brain:createBrain(index)}));
const buildings=INITIAL_BUILDINGS.map((record,index)=>({...record,visible:[.1,.2,.3,.4,.5,.6,.7,.8],model:{position:record.point||{x:index,z:index}},anchors:[{foodSite:{state:{bowl:4}}}]}));
buildings.push({...buildings[1],id:'built-20'});
const positionOf=resident=>({x:resident.index,z:0}),weights=residents.map(resident=>structuredClone(resident.brain.w1));
seedInitialKnowledge(residents,buildings,positionOf,0);
for(const resident of residents.slice(0,6)){
 assert.equal(Object.keys(resident.brain.known).length,13);
 assert.equal(Object.keys(resident.brain.relations).length,5);
 assert.equal(resident.brain.known['initial-monolith'],undefined);
 assert.equal(resident.brain.known['built-20'],undefined);
 assert.equal(resident.brain.known['friend-'+resident.index],undefined);
 assert.equal(resident.brain.known['friend-6'],undefined);
 assert.equal(resident.brain.known['initial-bowl'].food,4);
 assert(familiarMemory(resident.brain.known['built-3']));
 assert.equal(resident.brain.known['built-3'].visits,0);
 assert.equal(resident.brain.known['built-3'].purpose,'ball_restaurant');
 assert.equal(resident.brain.updates,0);assert.deepEqual(resident.brain.episodes,[]);
 assert.deepEqual(resident.brain.w1,weights[resident.index]);
 for(const peer of residents.slice(0,6))if(peer!==resident){assert(resident.brain.known['friend-'+peer.index]);assert(peer.brain.known['friend-'+resident.index]);}
}
assert.deepEqual(residents[6].brain.known,{});assert.deepEqual(residents[6].brain.relations,{});
residents[0].brain.relations['1']={affinity:.9,trust:.8,affection:.7};
residents[0].brain.known['initial-monolith']={visits:3};
residents[0].brain.known['built-3'].visits=7;
const previous=structuredClone(residents);
seedInitialKnowledge(residents,buildings,positionOf,20);
assert.deepEqual(residents,previous,'reinitializing must preserve existing discoveries, relationships and experience');
assert.equal(familiarMemory(undefined),false);assert.equal(familiarMemory({visits:0}),false);assert.equal(familiarMemory({visits:1}),true);
console.log('Initial knowledge passed: eight familiar facilities, unknown monolith, mutual six-resident acquaintance, no fabricated learning, newcomers excluded, existing memories preserved.');
