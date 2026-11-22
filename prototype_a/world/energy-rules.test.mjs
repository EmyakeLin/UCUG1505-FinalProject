// Numerical unit checks only. Does not create a renderer or run the scene.
import assert from 'node:assert/strict';
import {ENERGY_RATES,SUNLIGHT_FIELD,SUNLIGHT_MIN_RATE,SUNLIGHT_MAX_RATE,SUNLIGHT_OUTER_RADIUS,sunlightRecovery} from './energy-rules.mjs';
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-12,`${actual} != ${expected}`);
close(SUNLIGHT_FIELD.radius,4);
close(sunlightRecovery(0),ENERGY_RATES.monolithRestore*.2);
close(sunlightRecovery(2),.0088);
close(sunlightRecovery(4),ENERGY_RATES.restDrain*.2);
close(sunlightRecovery(8),SUNLIGHT_MIN_RATE);
close(sunlightRecovery(12),SUNLIGHT_MIN_RATE);
close(sunlightRecovery(12.000001),0);
close(sunlightRecovery(4-1e-10),SUNLIGHT_MIN_RATE);
close(sunlightRecovery(4+1e-10),SUNLIGHT_MIN_RATE);
for(let distance=0;distance<4;distance+=.125){assert.ok(sunlightRecovery(distance)>=sunlightRecovery(distance+.125));assert.ok(sunlightRecovery(distance)<=SUNLIGHT_MAX_RATE);}
assert.ok(sunlightRecovery(SUNLIGHT_OUTER_RADIUS)-ENERGY_RATES.restDrain<0);
assert.ok(sunlightRecovery(SUNLIGHT_OUTER_RADIUS)-ENERGY_RATES.moveDrain<0);
close(sunlightRecovery(-1),SUNLIGHT_MAX_RATE);
close(sunlightRecovery(NaN),0);
console.log('Passed: sunlight peak, linear falloff, r continuity, outer plateau, 3r cutoff, fixed consumption baseline, and bounded/invalid distances.');
