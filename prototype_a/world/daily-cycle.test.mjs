import assert from 'node:assert/strict';
import fs from 'node:fs';
import {audit} from './daily-cycle-audit.mjs';
const empty=process.argv.includes('--empty'),results=[];
for(const seed of [1,7,42]){
 const result=audit(seed,{empty,seconds:2880});
 assert(result.harvested>0,'factory must produce food without manual assignments');
 assert(result.restaurant[0].recipe>0,'food shortage must not repeatedly cancel cooking');
 assert(result.restaurant[0].served>0,'the restaurant must serve food');
 for(const resident of result.residents){
  assert(resident.ate>0,'every resident must eat');
  assert.equal(resident.slept,2,'each night must reach a bed');assert.equal(resident.woke,2);
  assert.equal(resident.nightInterrupted,0);assert.equal(resident.badWake,0);
  assert.equal(resident.nightEnergyLoss,0);assert.equal(resident.nightFatigueGain,0);
  assert.equal(resident.coma,0);assert.equal(resident.health,'awake');
  assert(resident.sunDayPercent<50,'no resident should spend most daylight in the central light field');
 }
 results.push(result);
 console.log(JSON.stringify({seed,empty,harvested:result.harvested,cooked:result.restaurant[0].recipe,served:result.restaurant[0].served,sunDayPercent:result.residents.map(resident=>resident.sunDayPercent),allAte:true,allSleptTwice:true,coma:0}));
}
const file=empty?'daily-cycle-empty.json':'daily-cycle-normal.json';
fs.writeFileSync(new URL(file,import.meta.url),JSON.stringify(results,null,2));
console.log('Passed two-day controlled simulation; real geometry, collisions, learned/social choices and active rescue are outside this fixture.');
