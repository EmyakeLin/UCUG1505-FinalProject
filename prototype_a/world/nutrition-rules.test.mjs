import assert from 'node:assert/strict';
import {NUTRITION,satietyOf,feed,nourishment,digest,wakeFromNight} from './nutrition-rules.mjs';
import {applyItem} from './provisions-rules.mjs';
const make=()=>({energy:.2,fatigue:.8,satiety:0,mood:{pleasure:0,comfort:0,safety:0},health:{state:'awake'}});
const ball=make();feed(ball,'raw',2);assert.equal(ball.satiety,.7);
feed(ball,'lunch');assert.equal(ball.satiety,1);
assert.deepEqual(nourishment(ball),{energy:.6,fatigue:.7});
digest(ball,360);assert.equal(ball.satiety,.5);
digest(ball,720);assert.equal(ball.satiety,0);assert.deepEqual(nourishment(ball),{energy:1,fatigue:1});
for(const [type,gain] of Object.entries({raw:.35,simple:.55,packed:.45,lunch:.75,snack:.2})){const eater=make();applyItem(eater,{type});assert.equal(eater.satiety,gain);}
for(const type of ['energy','rest']){const patient=make();applyItem(patient,{type});assert.equal(patient.satiety,0);}
const sleeper=make();sleeper.satiety=.4;sleeper.nightSleep={bedId:'bed0'};
const stored=JSON.parse(JSON.stringify(sleeper));digest(sleeper,1080);assert.deepEqual(sleeper,stored);
wakeFromNight(sleeper);assert.equal(sleeper.energy,1);assert.equal(sleeper.fatigue,0);assert.equal(sleeper.satiety,.4);assert.equal(sleeper.nightSleep,null);assert.equal(sleeper.mood.comfort,1);
assert.equal(satietyOf({}),NUTRITION.initial);
console.log('Nutrition checks passed: every food, continuous bowl portions, bounded benefits, digestion, medical exclusion, sleep preservation, dawn restoration and legacy defaults.');
