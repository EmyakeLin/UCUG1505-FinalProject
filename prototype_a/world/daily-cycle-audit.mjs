// Controlled whole-day audit of the shipped decision/update functions and production controllers.
// No DOM, renderer, browser or UI. Straight-line path service and kinematic bodies substitute geometry/physics.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import * as nutrition from './nutrition-rules.mjs';import * as winter from './winter-rules.mjs';import * as mood from './mood-rules.mjs';import * as energy from './energy-rules.mjs';import * as rescue from './rescue-rules.mjs';import * as instinct from './instinct-rules.mjs';
import {createFoodState} from './food-rules.mjs';import {createBrain} from './cognition.mjs';import {CORE_LAYOUT} from './world-layout.mjs';
async function load(file){let source=fs.readFileSync(new URL(file,import.meta.url),'utf8');source=source.replace(/from '([^']+)'/g,(_,name)=>{const target=name==='three'?'vendor/three.module.js':name+'.mjs';return "from '"+new URL(target,import.meta.url).href+"'";});return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));}
const {createFoodLogistics}=await load('food-logistics.js'),{createProvisions}=await load('provisions.js');
const world=fs.readFileSync(new URL('world.js',import.meta.url),'utf8');
function extract(name){const start=world.indexOf('function '+name+'(');assert(start>=0,name);const lineEnd=world.indexOf('\n',start);if(world.slice(start,lineEnd).trimEnd().endsWith('}'))return world.slice(start,lineEnd);return world.slice(start,world.indexOf('\n}',start)+2);}
const names=['release','chooseGoal','chooseSlot','travelBudget','workBudget','seekRecovery','currentInstinct','provideEssentialFood','seekNightBed','decide','arrive','finish','collapse','updateCreature'];
export function audit(seed=1,options={}){const originalRandom=Math.random;try{return runAudit(seed,options);}finally{Math.random=originalRandom;}}
function runAudit(seed,{empty=false,seconds=1440}={}){
 let randomState=seed;const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
 Math.random=random;
 const STEP=1/30,SCALE=100,scene=new THREE.Group(),reservations=new Map(),events=[];
 let serial=0;const body=(x,y)=>({id:++serial,position:{x,y},velocity:{x:0,y:0},force:{x:0,y:0},mass:1,collisionFilter:{mask:0xffffffff}});
 const MATTER={Bodies:{rectangle:(x,y)=>body(x,y)},Composite:{add(){}},Body:{setPosition:(b,p)=>{b.position={...p};},setVelocity:(b,v)=>{b.velocity={...v};},setStatic:(b,v)=>{b.static=v;},setAngle(){},applyForce:(b,p,f)=>{if(b.static)return;b.velocity={x:b.velocity.x+f.x/.0007,y:b.velocity.y+f.y/.0007};}},};
 const positionOf=c=>({x:c.body.position.x/SCALE,z:c.body.position.y/SCALE});
 const creatures=Array.from({length:6},(_,index)=>({index,name:'ball'+index,body:body((index%3)*150,Math.floor(index/3)*160),energy:[.4,.8,.85,.72,.72,.72][index],fatigue:[.2,.76,.15,.28,.3,.3][index],satiety:.6,mood:mood.createMood(.7,.3),brain:createBrain(index+1),carry:{food:0,part:0},inventory:{items:[],held:null},health:{state:'awake',nightSeconds:0},action:'idle',path:[],slot:null,goal:null,nightSleep:null,nextBedSearch:0,until:0,decision:0,speed:1.45,stress:0,playBlend:0,playSession:null,playPartner:null,chargePose:0,chargeGlow:0,sleep:0,impact:0,nextBlink:0,nextJoy:0,turn:0,chargeNormal:new THREE.Vector3(),lastPoint:{x:0,z:0}}));
 const node=(root,name,x=0,z=0)=>{const n=new THREE.Group();n.name=name;n.position.set(x,0,z);root.add(n);return n;};
 const workshop=new THREE.Group(),cart=new THREE.Group();workshop.position.set(CORE_LAYOUT.workshop.x,0,CORE_LAYOUT.workshop.z);node(workshop,'Dock_Cart',2.42,6);node(workshop,'Central_cream_upper_disc');node(workshop,'Spawn_Food');
 for(const name of ['Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR','Gate_Pivot','Cargo_01','Cargo_02','Cargo_03','Cargo_04'])node(cart,name);node(cart,'Pusher_Center',0,-2.15);workshop.updateMatrixWorld(true);
 const models={workshop,cart};for(const name of ['mote','Takeaway_Light_Meal','Takeaway_Meal_Pack','Takeaway_Snack_Pack','Energy_Rescue_Kit','Rest_Care_Kit'])models[name]=new THREE.Group();
 const state=createFoodState();if(empty)state.bowl=0;
 const site={point:{...CORE_LAYOUT.bowl},state:{bowl:state.bowl},foodMeshes:Array.from({length:6},()=>new THREE.Group())};for(const mesh of site.foodMeshes)mesh.position.set(site.point.x,0,site.point.z);
 const foodSites=[site],deliverySites=[],beds=Array.from({length:8},(_,i)=>({id:'bed'+i,kind:'sleep',point:{x:-17+(i<4?-2.75:2.75),z:-8+2.7-(i%4)*1.85}}));
 const bowls=[-.6,.6].map((dx,i)=>({id:'bowl'+i,kind:'eat',point:{x:site.point.x+dx,z:site.point.z},foodSite:site}));
 const workSlot={id:'work',kind:'work',point:{x:17,z:-8}},sunCenters=[CORE_LAYOUT.sunlight],sunSpots=[];
 const context={...nutrition,...winter,...mood,...energy,...rescue,...instinct,THREE,MATTER,STEP,SCALE,scene,models,state,creatures,reservations,beds,bowls,foodSites,deliverySites,workSlot,sunCenters,sunSpots,outlets:[],toySlots:[],buildings:[],foodControllers:[],time:0,climate:winter.worldClimate(0),deathAllowed:true,positionOf,Math:Object.assign(Object.create(Math),{random}),console,
  availableBowls:()=>bowls.filter(slot=>slot.foodSite.state.bowl>.01),sunAt:p=>energy.sunlightRecovery(Math.hypot(p.x+5,p.z+1)),comfortAt:p=>mood.sunlightComfort(Math.hypot(p.x+5,p.z+1),4),nearMonolith:()=>false,
  clearLine:()=>true,freePoint:p=>Math.hypot(p.x+5,p.z+1)>2.65,findPath:(a,b)=>[{x:b.x,z:b.z}],floorHeight:()=>0,announce:message=>events.push({t:context.time,message}),
  society:{arrive:()=>false,cancel(){},begin(){},endExperience(){},stepCreature(){},allows:()=>true,value:()=>0,tryDecide:()=>false,modulate(){}},medical:null,romance:null,endPlayLink(){},socialCandidates:()=>[],inviteForPlay:()=>false,trackProgress:()=>false,camera:{getWorldDirection:v=>v.set(0,-1,-1)},navigation:{line:()=>true},pursuitPath:()=>null};
 context.dangerAt=p=>winter.localDanger(context.climate,Math.hypot(p.x+5,p.z+1)<=4);
 vm.createContext(context);vm.runInContext(names.map(extract).join('\n'),context);
 const controller=createFoodLogistics({...context,engine:{world:{}},makeMote:()=>new THREE.Group(),cartClear:()=>true,cartPath:(a,b)=>[{x:b.x,z:b.z}],otherCartsClear:()=>true,activityDanger:c=>context.dangerAt(positionOf(c)),naturalLight:()=>.6*(1-context.climate.darkness)+.4*context.sunAt(workshop.position)/.017});context.foodControllers.push(controller);
 context.logistics={owns:c=>controller.owns(c),weights:c=>controller.weights(c),tryJob:(a,c,t)=>controller.tryJob(a,c,t)};
 const provisions=createProvisions({...context,time:()=>context.time,danger:c=>context.dangerAt(positionOf(c)),known:()=>true,preference:()=>0,begin(){},approach:c=>positionOf(c)});context.provisions=provisions;
 const restaurant=new THREE.Group();restaurant.position.set(18,0,15);const offsets=[[-3.6,-.45],[0,-3.05],[3.35,.25],[-2.25,3.55],[-2.25,.15],[2.25,3.55],[2.25,.15]];provisions.register({id:'built-3',key:'ball_restaurant',model:restaurant,anchors:offsets.map(([x,z],i)=>({id:'restaurant'+i,kind:'provision',service:['supply','cook','takeaway','seat','seat','seat','seat'][i],point:{x:x+18,z:z+15}}))});
 for(const c of creatures)c.mood=mood.createMood(c.energy,c.fatigue);
 const stats=creatures.map(c=>({name:c.name,actions:{},ate:0,slept:0,woke:0,coma:0,nightInterrupted:0,nightEnergyLoss:0,nightFatigueGain:0,badWake:0,sunSeconds:0,daySeconds:0}));let previousStock=0,harvested=0;
 for(let tick=0;tick<seconds/STEP;tick++){
  const beforeNutrition=creatures.map(c=>c.satiety);context.time+=STEP;context.climate=winter.worldClimate(context.time);provisions.step(STEP);
  for(const c of creatures){const before=beforeNutrition[c.index],locked=c.nightSleep,oldEnergy=c.energy,oldFatigue=c.fatigue,was=c.health.state;context.updateCreature(c);const st=stats[c.index];if(c.satiety>before+1e-6)st.ate+=c.satiety-before;if(!locked&&c.nightSleep)st.slept++;if(locked&&!c.nightSleep){st.woke++;if(context.climate.isNight)st.nightInterrupted++;if(c.energy!==1||c.fatigue!==0)st.badWake++;}if(locked&&c.nightSleep){st.nightEnergyLoss+=Math.max(0,oldEnergy-c.energy);st.nightFatigueGain+=Math.max(0,c.fatigue-oldFatigue);}context.collapse(c);if(was==='awake'&&c.health.state!=='awake')st.coma++;st.actions[c.action]=(st.actions[c.action]||0)+STEP;if(!context.climate.isNight){st.daySeconds+=STEP;if(Math.hypot(positionOf(c).x+5,positionOf(c).z+1)<4)st.sunSeconds+=STEP;}}
  controller.step(context.time);controller.sync();controller.draw(context.time);if(state.stock>previousStock)harvested+=state.stock-previousStock;previousStock=state.stock;
  for(const c of creatures)if(!c.body.static&&!controller.owns(c)){c.body.position.x+=c.body.velocity.x*60*STEP;c.body.position.y+=c.body.velocity.y*60*STEP;}
 }
 return {seed,empty,seconds,harvested,food:site.state.bowl,restaurant:provisions.save(),residents:stats.map((st,i)=>({...st,actions:Object.fromEntries(Object.entries(st.actions).map(([k,v])=>[k,Math.round(v)])),sunDayPercent:Math.round(st.sunSeconds/st.daySeconds*100),health:creatures[i].health.state,energy:creatures[i].energy,fatigue:creatures[i].fatigue})),events};
}
if(process.argv[1]?.endsWith('daily-cycle-audit.mjs')){const result=audit(Number(process.argv[2])||1,{empty:process.argv.includes('--empty')});console.log(JSON.stringify({...result,events:result.events.filter(e=>/昏迷|醒来/.test(e.message))},null,2));}


