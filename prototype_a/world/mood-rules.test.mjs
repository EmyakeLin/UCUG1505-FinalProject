// Pure numerical behavior rules only; no renderer, UI, physics, or scene simulation.
import assert from 'node:assert/strict';
import {createMood,evolveMood,actionWeights,chooseMoodAction,acceptsCompany,sunlightComfort,enjoyFood,companionshipRecovery} from './mood-rules.mjs';
const calm={pleasure:.4,arousal:.6,safety:.85,connection:.8};
const lonely={...calm,connection:.1};
const uneasy={...calm,safety:.2};
assert.ok(actionWeights(lonely,.7,.3).play>actionWeights(calm,.7,.3).play);
assert.ok(actionWeights(uneasy,.7,.3).wander<actionWeights(calm,.7,.3).wander);
assert.ok(actionWeights(uneasy,.7,.3).charge>actionWeights(calm,.7,.3).charge);
assert.equal(acceptsCompany(lonely,.2,.1,0),false);
assert.equal(acceptsCompany(lonely,.8,.9,0),false);
assert.equal(acceptsCompany(uneasy,.8,.1,0),false);
assert.equal(chooseMoodAction({eat:0,charge:1,play:0},.999), 'charge');
assert.equal(chooseMoodAction({eat:0,charge:0},.5), 'idle');
const context={energy:.7,fatigue:.3,resting:false,nourished:false,company:false,playing:false,exploring:false,stress:0};
const alone={...calm},together={...calm};
evolveMood(alone,context,30);
evolveMood(together,{...context,company:true,playing:true},30);
assert.ok(together.connection>alone.connection);
assert.ok(together.pleasure>alone.pleasure);
const oneStep=createMood(.6,.3),manySteps={...oneStep};
evolveMood(oneStep,context,1);
for(let step=0;step<60;step++)evolveMood(manySteps,context,1/60);
for(const key of Object.keys(oneStep))assert.ok(Math.abs(oneStep[key]-manySteps[key])<1e-12);
for(const stress of [0,1])for(const energy of [0,1])for(const fatigue of [0,1]){
 const mood=createMood(energy,fatigue);
 evolveMood(mood,{...context,stress,energy,fatigue},10000);
 for(const [key,value] of Object.entries(mood)){
  assert.ok(Number.isFinite(value));assert.ok(value<=1);assert.ok(value>=(key==='pleasure'?-1:0));
 }
}
const frozen={...calm};evolveMood(frozen,context,0);assert.deepEqual(frozen,calm);
const fed={...calm},emptyBowl={...calm};
enjoyFood(fed,.5);enjoyFood(emptyBowl,0);
assert.ok(fed.pleasure>calm.pleasure);assert.deepEqual(emptyBowl,calm);
enjoyFood(fed,100);assert.equal(fed.pleasure,1);
assert.equal(sunlightComfort(8,4),0);assert.equal(sunlightComfort(12,4),0);
assert.ok(sunlightComfort(3,4)>sunlightComfort(6,4));
assert.equal(sunlightComfort(NaN,4),0);
const nearSun={...calm},farFromSun={...calm};
evolveMood(nearSun,{...context,sunComfort:sunlightComfort(3,4)},12);
evolveMood(farFromSun,{...context,sunComfort:sunlightComfort(9,4)},12);
assert.ok(nearSun.safety>farFromSun.safety);
const content={...calm,connection:1};
assert.ok(actionWeights(content,.8,.2).play>0);
assert.ok(actionWeights(content,.8,.2).toy>0);
assert.ok(actionWeights(uneasy,.8,.2).sun>actionWeights(calm,.8,.2).sun);
assert.equal(acceptsCompany(content,.8,.2,.2),true);
assert.equal(companionshipRecovery(false),0);
assert.ok(companionshipRecovery(true)>.006+.012);
const soloToy={...calm},soloIdle={...calm};
evolveMood(soloToy,{...context,fun:true},10);evolveMood(soloIdle,context,10);
assert.ok(soloToy.pleasure>soloIdle.pleasure);
assert.equal(soloToy.connection,soloIdle.connection);
console.log('Passed: prior mood/food/sun rules, social desire without loneliness, toy/sun choices, nearby-company fatigue recovery, solo-toy pleasure without false companionship.');
