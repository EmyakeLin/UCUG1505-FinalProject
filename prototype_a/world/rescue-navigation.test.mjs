import assert from 'node:assert/strict';
import {createNavigation,trackProgress} from './navigation.mjs';
import {canOfferHelp,needsRecovery,routeBudget,affordableRescue} from './rescue-rules.mjs';
import {instinctIntent,preserveInnateWeight} from './instinct-rules.mjs';
const resident={energy:.4,fatigue:.6,action:'provision',health:{state:'awake'}};
assert.equal(canOfferHelp(resident),true,'mid-energy chef is no longer excluded by idle-only/55% requirements');
assert.equal(canOfferHelp({...resident,action:'chat'}),true);
assert.equal(canOfferHelp({...resident,energy:.1}),false);
assert.equal(canOfferHelp({...resident,health:{state:'coma'}}),false);
assert.equal(canOfferHelp(resident,{eating:true}),false);
assert.equal(canOfferHelp(resident,{transporting:true}),false);
assert.equal(needsRecovery(resident,3),true,'prepare before the original 18% emergency threshold');
const shortTrip=routeBudget({x:0,z:0},[{x:2,z:0}],1,()=>.006,()=>.006);
assert.equal(affordableRescue(resident,shortTrip),true);
assert.equal(affordableRescue(resident,routeBudget({x:0,z:0},[{x:30,z:0}],1,()=>.024,()=>.024)),false,'do not start a fatal round trip');
assert.equal(instinctIntent({...resident,energy:.8,fatigue:.2},{night:true,sheltered:false,food:10}), 'shelter');
assert.equal(instinctIntent({...resident,energy:.8,fatigue:.2},{food:0,population:6}), 'food');
assert.equal(instinctIntent({...resident,energy:.1},{night:true,food:0}), 'recover');
for(const action of ['charge','eat','sleep','sun','work','delivery'])assert.equal(preserveInnateWeight(action,2,false),2,'no training prerequisite for '+action);

const width=26,height=24,occupied=new Uint8Array(width*height),blocked=new Uint8Array(width*height);
// A wall with one accessible end. Occupied cells are physical rectangles.
for(let row=1;row<19;row++)occupied[row*width+12]=1;
for(let index=0;index<occupied.length;index++)blocked[index]=occupied[index];
const navigation=createNavigation({occupied,blocked,width,height,cell:.2,minX:0,minZ:0,radius:.22});
const start={x:1,z:1},end={x:4,z:1},path=navigation.path(start,end);
assert.ok(path&&path.length>1,'route goes around the wall');let previous=start;
for(const point of path){assert.equal(navigation.line(previous,point),true,'every smoothed segment clears the whole body');previous=point;}
assert.deepEqual(path.at(-1),end,'reachable original endpoint is retained');
const squeezed={x:2.21,z:1.1},escape=navigation.path(squeezed,{x:1,z:1});
assert.ok(escape&&escape.length>=2,'blocked origin requires an explicit escape waypoint');
assert.equal(navigation.line(squeezed,escape[0],true),true,'escape cannot cross further into a wall');
const obstructed={x:2.5,z:1},resolved=navigation.path(start,obstructed);
assert.ok(resolved);assert.ok(navigation.free(resolved.at(-1)));assert.notDeepEqual(resolved.at(-1),obstructed);
// A genuinely unreachable free destination must not silently become a point on this side of a wall.
for(let row=0;row<height;row++){occupied[row*width+12]=1;blocked[row*width+12]=1;}
assert.equal(navigation.path(start,end),null);
const walker={path:[{x:4,z:0}]};assert.equal(trackProgress(walker,{x:0,z:0},0),false);
assert.equal(trackProgress(walker,{x:.001,z:.006},1),false);
assert.equal(trackProgress(walker,{x:0,z:-.006},1.6),true,'wall-contact jitter cannot reset the progress watchdog');
assert.equal(trackProgress(walker,{x:.2,z:0},1.7),false);
console.log('Rescue/navigation policy regressions passed: non-idle responders, route reserve, untrained instincts, body-clear routes, explicit origin escape, reachable endpoints and jitter deadlock detection.');
