// Functional domain tests of the actual medical controller. No renderer, UI,
// browser, Matter engine or full ecosystem is created. World services are deterministic fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from './vendor/three.module.js';
import {routeBudget} from './rescue-rules.mjs';
let source=fs.readFileSync(new URL('./medical.js',import.meta.url),'utf8');
for(const [name,file] of Object.entries({three:'vendor/three.module.js','winter-rules':'winter-rules.mjs','provisions-rules':'provisions-rules.mjs','cargo-rules':'cargo-rules.mjs','rescue-rules':'rescue-rules.mjs'}))source=source.replaceAll("from '"+name+"'","from '"+new URL('./'+file,import.meta.url).href+"'");
const {createMedical}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function creature(index,energy=.8,fatigue=.2){return {index,name:'resident-'+index,energy,fatigue,action:'provision',path:[],goal:null,carry:{food:0},mood:{pleasure:0,safety:.5,comfort:.5},brain:{},body:{position:{x:-2+index*5,y:0}},health:{state:'awake',cause:null,nightSeconds:0,clinic:null,bed:null},previous:{x:0,z:0},lastPoint:{x:0,z:0}};}
function fixture(residents,{food=0,snap=0}={}){
 let now=0,controller;const messages=[],bowl={point:{x:-3,z:1},state:{bowl:food}},model=new THREE.Group();
 const add=(name,x=0,z=0,box=false)=>{const node=box?new THREE.Mesh(new THREE.BoxGeometry(1,.2,1),new THREE.MeshBasicMaterial()):new THREE.Group();node.name=name;node.position.set(x,.2,z);model.add(node);return node;};
 add('Rescue_Cart_ROOT');for(let index=0;index<2;index++){add('Bed_'+index+'_cushion',2.25,index? .4:-1.62,true);add('Energy_Rescue_Kit_'+index+'_ROOT');add('Rest_Rescue_Kit_'+index+'_ROOT');}
 model.updateMatrixWorld(true);
 const api={creatures:residents,foodSites:[bowl],models:{Stretcher_Trolley:new THREE.Group()},scene:{add(){}},sunTemplate:new THREE.Group(),SCALE:1,
  MATTER:{Body:{setPosition:(body,point)=>{body.position={...point};},setVelocity(){},setStatic:(body,value)=>{body.static=value;}}},
  positionOf:resident=>({x:resident.body.position.x,z:resident.body.position.y}),floorHeight:()=>0,sunAt:()=>0,nearestFree:point=>({...point}),
  findPath:(start,end)=>[{x:end.x+snap,z:end.z}],widePath:(start,end)=>[{x:end.x,z:end.z}],freePoint:()=>true,clearLine:()=>true,wideClear:()=>true,carriers:()=>[],
  chooseGoal:(resident,target,action)=>{resident.goal={x:target.x+snap,z:target.z};resident.path=[resident.goal];resident.action=action;return true;},
  finish:resident=>{controller?.cancel(resident);resident.action='idle';resident.path=[];},announce:message=>messages.push(message),time:()=>now,senseRadius:100,
  eating:()=>false,transporting:()=>false,requestRecovery:resident=>{resident.action='recover';},
  travelBudget:(resident,start,path,speed)=>routeBudget(start,path,speed||1.4,()=>.006,()=>.006),workBudget:(resident,point,seconds)=>({energy:seconds*.006,fatigue:seconds*.006})};
 for(const resident of residents)resident.body.collisionFilter={mask:0xffffffff};
 controller=createMedical(api);controller.register({id:'clinic',key:'medical_station',model});
 function tick(seconds){for(let step=0;step<seconds*10;step++){
  now+=.1;controller.step(.1);
  for(const resident of residents){if(resident.health.state!=='awake'||controller.towing(resident)||!resident.path.length)continue;const target=resident.path[0],point=api.positionOf(resident),distance=Math.hypot(target.x-point.x,target.z-point.z),travel=Math.min(distance,.14);if(distance>.001){resident.body.position.x+=(target.x-point.x)/distance*travel;resident.body.position.y+=(target.z-point.z)/distance*travel;}if(distance<.15){resident.path.shift();resident.action='medical';}}
 }}
 return {controller,tick,bowl,messages,api};
}
const helper=creature(0,.4,.6),patient=creature(1,0,.2);patient.health.state='coma';patient.health.cause='energy';helper.inventory={items:[{type:'energy',cook:null,origin:'medical'}],held:null};
const direct=fixture([helper,patient]);direct.tick(12);assert.equal(patient.health.state,'awake','working mid-energy resident treats a patient');assert.equal(patient.energy,.4);assert.equal(helper.inventory.items.length,0);assert.ok(direct.messages.some(message=>message.includes('停下日常活动')));
const preparedWorker=creature(0,.95,.05),stock=fixture([preparedWorker],{food:6});stock.tick(50);assert.deepEqual(stock.controller.save()[0].kits,{energy:1,rest:1});assert.equal(stock.bowl.state.bowl,4,'two reserved kits consume exactly two real foods');assert.equal(preparedWorker.carry.food,0);
const carrier=creature(0,.95,.05),collapsed=creature(1,0,.8);collapsed.health.state='coma';collapsed.health.cause='energy';const transport=fixture([carrier,collapsed]);transport.tick(55);assert.equal(collapsed.health.clinic,'clinic','no-food rescue transports patient to a real bed');assert.equal(collapsed.health.carried,false);assert.equal(transport.controller.save()[0].kits.energy,0);
const snappedHelper=creature(0,.8,.1),snappedPatient=creature(1,0,.1);snappedPatient.health.state='coma';snappedPatient.health.cause='energy';snappedHelper.inventory={items:[{type:'energy',cook:null,origin:'medical'}],held:null};const snapped=fixture([snappedHelper,snappedPatient],{snap:.55});snapped.tick(15);assert.equal(snappedPatient.health.state,'awake','task arrival follows actual navigable endpoint');
const impatient=creature(0,.95,.05),distantPatient=creature(1,0,.8);distantPatient.health.state='coma';distantPatient.health.cause='energy';const distantFood=fixture([impatient,distantPatient],{food:6});distantFood.bowl.point={x:90,z:90};distantFood.tick(55);assert.equal(distantPatient.health.clinic,'clinic','a distant food bowl does not prevent a shorter stretcher rescue');assert.equal(distantFood.bowl.state.bowl,6);
const prep=creature(0,.95,.05),later=creature(1,.6,.2);later.action='sleep';const interruption=fixture([prep,later],{food:6});interruption.tick(1);later.health.state='coma';later.health.cause='energy';later.energy=0;interruption.tick(25);assert.ok(later.health.state==='awake'||later.health.clinic,'active stock preparation yields to a new patient');
const sick=creature(0,0,1);sick.health.state='coma';sick.health.cause='both';const alone=fixture([sick]);alone.tick(2);assert.equal(sick.health.state,'coma','no fake rescue or resurrection when everyone is down');assert.ok(alone.controller.summary().includes('同伴需要先补能或休息'));
console.log('Medical controller regressions passed: real treatment, proactive stock with food conservation, no-food stretcher transport, snapped endpoint completion, and honest no-responder status.');
