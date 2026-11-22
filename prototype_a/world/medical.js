import * as THREE from 'three';
import {WINTER,healthOf,applyKit,fullyRecovered,prepareKit,collectKit} from 'winter-rules';
import {inventoryOf,putItem,takeItem,roomFor} from 'provisions-rules';
import {createHold,loadCargo,unloadCargo} from 'cargo-rules';
import {RESCUE,canOfferHelp,affordableRescue,urgentOrder} from 'rescue-rules';

export function createMedical(api){
 const clinics=new Map(),jobs=new Map(),claimed=new Map();let lastDispatch=-10,dispatchStatus='暂无待救援同伴';
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 function carrierState(creature,preferred=null){
  const inventory=inventoryOf(creature),health=healthOf(creature);
  if(health.kit){putItem(creature,{type:health.kit,cook:null,origin:'medical'});health.kit=null;}
  if(health.supply){creature.carry.food+=health.supply;health.supply=0;}
  return {get kit(){return (inventory.items.find(item=>item.type===preferred)||inventory.items.find(item=>['energy','rest'].includes(item.type)))?.type||null;},set kit(type){const selected=this.kit,index=inventory.items.findIndex(item=>item.type===selected);if(index>=0)takeItem(creature,index);if(type)putItem(creature,{type,cook:null,origin:'medical'});},get supply(){return creature.carry.food;},set supply(value){creature.carry.food=value;}};
 }
 function position(creature,point,lift){api.MATTER.Body.setPosition(creature.body,{x:point.x*api.SCALE,y:point.z*api.SCALE});api.MATTER.Body.setVelocity(creature.body,{x:0,y:0});creature.previous={x:point.x,z:point.z};creature.lastPoint={...creature.previous};if(lift!==undefined)creature.lift=lift;}
 function register(record){
  if(record.key!=='medical_station'||clinics.has(record.id))return;
  const point=record.model.position,original=record.model.getObjectByName('Rescue_Cart_ROOT');original.visible=false;
  const root=api.models.Stretcher_Trolley.clone(true);root.position.set(0,0,0);
  const pivot=new THREE.Group();pivot.position.set(point.x-2.5,0,point.z+2.55);api.scene.add(pivot);pivot.add(root);
  const clinic={record,pivot,home:{x:pivot.position.x,z:pivot.position.z},entry:{x:point.x,z:point.z+3.35},supply:{x:point.x-1.05,z:point.z-.5},kits:{energy:0,rest:0},beds:[null,null],busy:null,wheels:[],stock:[]};
  root.traverse(mesh=>{if(/wheel/i.test(mesh.name)&&mesh.isMesh)clinic.wheels.push({mesh,angle:mesh.rotation.x});});
  for(const type of ['energy','rest'])for(let index=0;index<2;index++){const name=(type==='energy'?'Energy':'Rest')+'_Rescue_Kit_'+index+'_ROOT';clinic.stock.push({type,index,root:record.model.getObjectByName(name)});}
  clinic.bedPoints=[0,1].map(index=>{const mesh=record.model.getObjectByName('Bed_'+index+'_cushion'),box=new THREE.Box3().setFromObject(mesh),center=box.getCenter(new THREE.Vector3());return {x:center.x,z:center.z,height:box.max.y};});
  const sun=api.sunTemplate.clone(true);sun.scale.setScalar(.18);sun.position.set(point.x,1.5,point.z-2.1);api.scene.add(sun);
  const light=new THREE.PointLight(0xffe3a2,1.8,7,2);light.position.set(point.x,1.9,point.z-2.1);api.scene.add(light);clinic.sun=sun;clinic.light=light;
  const hold=createHold(4);clinic.carrier={pivot,home:clinic.home,radius:.88,height:.62,pullDistance:1.3,hold,wheels:clinic.wheels.map(item=>item.mesh),external:false,load:(id,payload,units)=>loadCargo(hold,id,payload,units),unload:id=>unloadCargo(hold,id),sync:()=>{},release:()=>{}};
  clinics.set(record.id,clinic);
 }
 function rateAt(point){for(const clinic of clinics.values())if(distance(point,clinic.light.position)<3.3)return WINTER.clinicEnergy;return 0;}
 function shelterAt(point){return rateAt(point)>0;}
 function cancel(worker){
  const job=jobs.get(worker);if(!job)return;
  if(job.loaded){const patient=job.patient,cart=job.vehicle.pivot.position,drop=api.nearestFree({x:cart.x+job.vehicle.radius+1,z:cart.z})||api.positionOf(worker);position(patient,drop,api.floorHeight(drop.x,drop.z));healthOf(patient).carried=false;}
  if(job.vehicle){job.vehicle.unload('patient-'+job.patient.index);job.vehicle.release(worker);}
  if(job.bed!==null&&job.clinic.beds[job.bed]===job.patient.index&&healthOf(job.patient).clinic!==job.clinic.record.id)job.clinic.beds[job.bed]=null;
  if(claimed.get(job.patient)===worker)claimed.delete(job.patient);job.clinic.busy=null;jobs.delete(worker);worker.medicalTarget=null;
 }
 function finish(worker){cancel(worker);if(healthOf(worker).state==='awake')api.finish(worker);}
 function walk(worker,job,target,phase){
  if(!api.chooseGoal(worker,target,'go-medical'))return false;
  job.phase=phase;job.target={...worker.goal};job.elapsed=0;job.deadline=api.time()+90;return true;
 }
 function cartRoute(job,target,phase){
  const start=job.vehicle.pivot.position,home=job.vehicle.home,exit={x:home.x,z:home.z+1.5};
  let route;
  if(!job.vehicle.external&&distance(start,home)<.5&&phase!=='return'){const departure=api.widePath(start,exit,job.vehicle.radius),remaining=api.widePath(exit,target,job.vehicle.radius);if(!departure||!remaining)return false;route=[...departure,...remaining];}
  else route=api.widePath(start,target,job.vehicle.radius);
  if(!route)return false;job.route=route;job.phase=phase;job.elapsed=0;job.deadline=api.time()+120;job.worker.action='medical-tow';job.worker.path=[];return true;}
 function stopPoint(origin,patient,radius=.88){
  const point=api.positionOf(patient);
  for(const offset of [radius+1,radius+1.6,radius+2.2])for(let angle=0;angle<Math.PI*2;angle+=Math.PI/6){
   const target={x:point.x+Math.cos(angle)*offset,z:point.z+Math.sin(angle)*offset};
   if(api.clearLine(target,point)&&api.widePath(origin,target,radius))return target;
  }return null;
 }
 function approach(patient){const point=api.positionOf(patient);for(let angle=0;angle<Math.PI*2;angle+=Math.PI/6){const target={x:point.x+Math.cos(angle)*1.1,z:point.z+Math.sin(angle)*1.1};if(api.freePoint(target)&&api.clearLine(target,point))return target;}return null;}
 function selectFood(worker){return api.foodSites.filter(site=>site.state.bowl>=1).sort((a,b)=>distance(api.positionOf(worker),a.point)-distance(api.positionOf(worker),b.point)).find(site=>api.findPath(api.positionOf(worker),site.point));}
 function dispatch(worker,patient,clinic){
  const type=healthOf(patient).cause==='energy'?'energy':'rest',state=carrierState(worker,type),origin=api.positionOf(worker),target=approach(patient),plans=[];
  function offer(mode,legs,extra={},workSeconds=3){
   const cost={energy:0,fatigue:0,seconds:workSeconds};
   for(const leg of legs){const route=leg.vehicle?api.widePath(leg.from,leg.to,leg.vehicle.radius):api.findPath(leg.from,leg.to);if(!route)return;
    const estimate=api.travelBudget(worker,leg.from,route,leg.vehicle?.72:undefined);
    cost.energy+=estimate.energy;cost.fatigue+=estimate.fatigue;cost.seconds+=estimate.seconds;
   }
   const work=api.workBudget(worker,extra.workPoint||clinic.supply,workSeconds);cost.energy+=work.energy;cost.fatigue+=work.fatigue;
   if(!affordableRescue(worker,cost)){worker.rescueNeedsRecovery=true;return;}
   plans.push({mode,cost,...extra});
  }
  const walkLeg=(from,to)=>({from,to});
  if(target&&state.kit===type)offer('reach',[walkLeg(origin,target)],{target,workPoint:target});
  if(state.kit&&state.kit!==type&&clinic.kits[state.kit]<2)offer('return-kit',[walkLeg(origin,clinic.supply)],{target:clinic.supply},1);
  if(target&&!state.kit){
   if(clinic.kits[type]>0&&roomFor(worker))offer('take-kit',[walkLeg(origin,clinic.supply),walkLeg(clinic.supply,target)],{target:clinic.supply},4);
   if(state.supply>=1)offer('prepare',[walkLeg(origin,clinic.supply),walkLeg(clinic.supply,target)],{target:clinic.supply},6);
   if(roomFor(worker))for(const food of api.foodSites.filter(site=>site.state.bowl>=1))offer('food',[walkLeg(origin,food.point),walkLeg(food.point,clinic.supply),walkLeg(clinic.supply,target)],{target:food.point,food},7);
  }
  const bed=clinic.beds.findIndex(value=>value===null);
  if(bed>=0){
   const vehicles=[clinic.carrier,...api.carriers().filter(vehicle=>vehicle.available())];
   for(const vehicle of vehicles){
    const pickup=stopPoint(vehicle.pivot.position,patient,vehicle.radius);if(!pickup)continue;
    const berth=vehicle.external?{x:clinic.entry.x,z:clinic.entry.z+4}:{x:clinic.entry.x,z:clinic.bedPoints[bed].z+1.35};
    const handle={x:vehicle.pivot.position.x+Math.sin(vehicle.pivot.rotation.y)*vehicle.pullDistance,z:vehicle.pivot.position.z+Math.cos(vehicle.pivot.rotation.y)*vehicle.pullDistance};
    const legs=[walkLeg(origin,handle),{from:vehicle.pivot.position,to:pickup,vehicle},{from:pickup,to:berth,vehicle}];
    if(vehicle.external)legs.push(walkLeg({x:berth.x,z:berth.z+vehicle.pullDistance},{x:clinic.entry.x,z:clinic.bedPoints[bed].z}));
    offer('take-cart',legs,{target:handle,vehicle,bed,pickup,berth},4);
   }
  }
  // Compare complete, reachable routes; an existing distant food bowl must not suppress transport.
  plans.sort((a,b)=>a.cost.seconds-b.cost.seconds);
  for(const plan of plans){
   if(plan.vehicle?.external&&!plan.vehicle.reserve(worker))continue;
   // Interrupt the old activity before claiming the new task, so its cleanup cannot erase the claim.
   api.finish(worker);
   const job={worker,patient,clinic,type,bed:plan.bed??null,phase:'',elapsed:0,loaded:false,route:[],food:plan.food||null,vehicle:plan.vehicle,pickup:plan.pickup,berth:plan.berth};
   jobs.set(worker,job);claimed.set(patient,worker);clinic.busy=worker;worker.medicalTarget='friend-'+patient.index;
   if(job.bed!==null)clinic.beds[job.bed]=patient.index;
   if(walk(worker,job,plan.target,plan.mode)){worker.rescueNeedsRecovery=false;return true;}
   cancel(worker);
  }
  return false;
 }

 function prepareStock(worker,clinic,type){
  const state=carrierState(worker,type),source=state.supply>=1?null:selectFood(worker);
  if(state.supply<1&&(!source||!roomFor(worker)||source.state.bowl<2))return false;
  const legs=source?[{from:api.positionOf(worker),to:source.point},{from:source.point,to:clinic.supply}]:[{from:api.positionOf(worker),to:clinic.supply}];
  const cost={energy:0,fatigue:0};
  for(const leg of legs){const path=api.findPath(leg.from,leg.to);if(!path)return false;const estimate=api.travelBudget(worker,leg.from,path);cost.energy+=estimate.energy;cost.fatigue+=estimate.fatigue;}
  const work=api.workBudget(worker,clinic.supply,3);cost.energy+=work.energy;cost.fatigue+=work.fatigue;if(!affordableRescue(worker,cost))return false;
  api.finish(worker);const job={worker,patient:worker,clinic,type,stockOnly:true,bed:null,loaded:false,food:source,elapsed:0,route:[]};jobs.set(worker,job);clinic.busy=worker;worker.medicalTarget=clinic.record.id;
  if(!walk(worker,job,source?source.point:clinic.supply,source?'food':'prepare')){cancel(worker);return false;}
  worker.brain.lastThought='趁现在有余力，给医疗站准备备用药包';return true;
 }

 function wake(creature){
  const health=healthOf(creature);if(health.state!=='coma'||creature.energy<=0||creature.fatigue>=1)return;
  releasePatient(creature);
  health.state='awake';health.nightSeconds=0;health.cause=null;health.clinic=null;health.bed=null;health.carried=false;
  api.MATTER.Body.setStatic(creature.body,false);creature.body.collisionFilter.mask=0xffffffff;api.finish(creature);
  creature.mood.safety=Math.max(.55,creature.mood.safety);creature.joyStart=api.time();api.announce(creature.name+'慢慢睁开眼睛，重新站了起来。');
 }
 function releasePatient(patient){
  const worker=claimed.get(patient);if(worker)finish(worker);
  const health=healthOf(patient),clinic=clinics.get(health.clinic);
  if(clinic&&clinic.beds[health.bed]===patient.index)clinic.beds[health.bed]=null;health.clinic=null;health.bed=null;health.carried=false;
 }
 function rest(creature,seconds){
  const health=healthOf(creature),clinic=clinics.get(health.clinic);
  const recovery=clinic?WINTER.clinicEnergy:api.sunAt(api.positionOf(creature));
  creature.energy=Math.min(1,creature.energy+seconds*recovery);
  creature.fatigue=Math.max(0,creature.fatigue-seconds*(clinic?WINTER.clinicRest:.004));
  if(fullyRecovered(creature))wake(creature);
 }
 function step(seconds){
  const now=api.time();
  for(const creature of api.creatures)if(healthOf(creature).state==='awake'){const nearby=api.creatures.find(other=>healthOf(other).state==='coma'&&distance(api.positionOf(creature),api.positionOf(other))<api.senseRadius);creature.health.noticedComa=nearby?.index??null;}
  const emergency=api.creatures.some(creature=>healthOf(creature).state==='coma'&&!creature.health.clinic);
  for(const [worker,job] of [...jobs]){
   if(job.stockOnly&&emergency){finish(worker);continue;}
   const state=carrierState(worker,job.type),patientState=healthOf(job.patient);
   if(healthOf(worker).state!=='awake'||worker.energy<RESCUE.stopEnergy||worker.fatigue>RESCUE.stopFatigue||!job.stockOnly&&patientState.state!=='coma'||now>job.deadline){finish(worker);continue;}
   job.elapsed+=seconds;
   if(job.phase==='tow-out'||job.phase==='tow-home'||job.phase==='return'){
    const target=job.route[0];if(!target){
     job.elapsed=0;
     if(job.phase==='tow-out'){job.phase='load';job.patientStart=api.positionOf(job.patient);worker.action='medical';}
     else if(job.phase==='tow-home'){
      if(job.vehicle.external){job.vehicle.unload('patient-'+job.patient.index);const target={x:job.clinic.entry.x,z:job.clinic.bedPoints[job.bed].z};if(!walk(worker,job,target,'escort'))finish(worker);}
      else{job.phase='unload';worker.action='medical';}
     }
     else finish(worker);
     continue;
    }
    const pivot=job.vehicle.pivot,remaining=distance(pivot.position,target),travel=Math.min(remaining,seconds*.72),angle=Math.atan2(target.x-pivot.position.x,target.z-pivot.position.z);
    const candidate={x:pivot.position.x+Math.sin(angle)*travel,z:pivot.position.z+Math.cos(angle)*travel};
    const reversing=!job.vehicle.external&&job.phase==='return'&&distance(candidate,job.vehicle.home)<2.5,heading=reversing?angle+Math.PI:angle;
    const pull={x:candidate.x+Math.sin(heading)*job.vehicle.pullDistance,z:candidate.z+Math.cos(heading)*job.vehicle.pullDistance};
    const clear=[...clinics.values()].every(clinic=>clinic.pivot===job.vehicle.pivot||distance(clinic.pivot.position,candidate)>job.vehicle.radius+.9)&&api.wideClear(candidate,job.vehicle.radius,job.vehicle.pivot)&&api.freePoint(pull)&&api.creatures.every(other=>other===worker||other===job.patient||healthOf(other).state==='dead'||distance(api.positionOf(other),candidate)>1.5);
    if(!clear){job.wait=(job.wait||0)+seconds;if(job.wait>8)finish(worker);continue;}job.wait=0;
    pivot.position.set(candidate.x,job.vehicle.external?0:api.floorHeight(candidate.x,candidate.z),candidate.z);pivot.rotation.y=heading;job.vehicle.sync();
    if(job.vehicle.roll)job.vehicle.roll(travel);else for(const wheel of job.vehicle.wheels)wheel.rotation.x+=travel/.22;
    position(worker,pull,api.floorHeight(pull.x,pull.z));worker.turn=heading;
    if(job.loaded)position(job.patient,candidate,api.floorHeight(candidate.x,candidate.z)+job.vehicle.height);
    if(remaining<.08)job.route.shift();continue;
   }
   if(job.phase==='escort'){const point=api.positionOf(worker);position(job.patient,point,api.floorHeight(point.x,point.z)+.65);if(distance(point,job.target)<.4){job.phase='unload';job.elapsed=0;worker.path=[];job.unloadStart={...point};}continue;}
   if(job.phase==='load'){
    const blend=Math.min(1,job.elapsed/2),cart=job.vehicle.pivot.position,target={x:job.patientStart.x+(cart.x-job.patientStart.x)*blend,z:job.patientStart.z+(cart.z-job.patientStart.z)*blend};
    position(job.patient,target,api.floorHeight(cart.x,cart.z)+job.vehicle.height*blend+Math.sin(blend*Math.PI)*.3);
    if(!job.loaded&&!job.vehicle.load('patient-'+job.patient.index,{kind:'resident',resident:job.patient.index},4)){finish(worker);continue;}patientState.carried=true;job.loaded=true;
    if(blend>=1&&!cartRoute(job,job.berth,'tow-home'))finish(worker);continue;
   }
   if(job.phase==='unload'){
    const bed=job.clinic.bedPoints[job.bed],cart=job.unloadStart||job.vehicle.pivot.position,blend=Math.min(1,job.elapsed/2),target={x:cart.x+(bed.x-cart.x)*blend,z:cart.z+(bed.z-cart.z)*blend};
    position(job.patient,target,.62+(bed.height-.62)*blend+Math.sin(blend*Math.PI)*.6);
    if(blend>=1){patientState.clinic=job.clinic.record.id;patientState.bed=job.bed;patientState.carried=false;job.loaded=false;job.vehicle.unload('patient-'+job.patient.index);claimed.delete(job.patient);job.phase='return';api.announce(worker.name+'把'+job.patient.name+'安置到恢复床，小太阳开始补充能量。');if(job.vehicle.external){job.vehicle.release(worker);finish(worker);}else if(!cartRoute(job,job.vehicle.home,'return'))finish(worker);}continue;
   }
   if(distance(api.positionOf(worker),job.target)>.4)continue;
   worker.path=[];worker.action='medical';
   if(job.phase==='return-kit'){if(state.kit&&job.clinic.kits[state.kit]<2){job.clinic.kits[state.kit]++;state.kit=null;}finish(worker);continue;}
   if(job.phase==='food'){
    if(job.food.state.bowl<1){finish(worker);continue;}
    if(!roomFor(worker)){finish(worker);continue;}job.food.state.bowl-=1;state.supply++;if(!walk(worker,job,job.clinic.supply,'prepare'))finish(worker);continue;
   }
   if(job.phase==='prepare'){
    if(!job.started){job.started=now;job.elapsed=0;}if(job.elapsed<3)continue;
    if(!prepareKit(job.clinic.kits,state,job.type)){finish(worker);continue;}if(job.stockOnly){api.announce(worker.name+'为医疗站备好了一份'+(job.type==='energy'?'能源包':'蓝色急救包')+'。');finish(worker);continue;}job.phase='take-kit';
   }
   if(job.phase==='take-kit'){
    if(!roomFor(worker)||!collectKit(job.clinic.kits,state,job.type)){finish(worker);continue;}
    const target=approach(job.patient);if(!target||!walk(worker,job,target,'reach'))finish(worker);continue;
   }
   if(job.phase==='reach'){job.phase='treat';job.elapsed=0;continue;}
   if(job.phase==='treat'&&job.elapsed>=3){if(state.kit&&applyKit(job.patient,state.kit)){state.kit=null;wake(job.patient);}finish(worker);continue;}
   if(job.phase==='take-cart'){if(!cartRoute(job,job.pickup,'tow-out'))finish(worker);}
  }
  if(now-lastDispatch<.5)return;lastDispatch=now;
  const patients=api.creatures.filter(creature=>healthOf(creature).state==='coma'&&!creature.health.clinic&&!claimed.has(creature)).sort(urgentOrder);
  let offers=0,assignedCount=0;
  for(const patient of patients){
   const helpers=api.creatures.filter(creature=>canOfferHelp(creature,{busy:jobs.has(creature),eating:api.eating(creature),transporting:api.transporting(creature)})&&distance(api.positionOf(creature),api.positionOf(patient))<api.senseRadius).sort((a,b)=>distance(api.positionOf(a),api.positionOf(patient))-distance(api.positionOf(b),api.positionOf(patient)));
   offers+=helpers.length;
   let assigned=false;
   for(const worker of helpers){for(const clinic of clinics.values()){if(clinic.busy)continue;if(dispatch(worker,patient,clinic)){worker.brain.lastThought='看见'+patient.name+'倒下了，先停下手边的事去帮它';api.announce(worker.name+'停下日常活动，去救援'+patient.name+'。');assigned=true;assignedCount++;break;}}if(assigned)break;}
  }
  const pending=patients.length-assignedCount;
  dispatchStatus=!pending?'暂无未分配的救援':!clinics.size?'等待建造医疗站':!offers?'同伴需要先补能或休息': '等待可完成的路线、物资或床位';
  for(const creature of api.creatures)if(creature.rescueNeedsRecovery&&!jobs.has(creature)&&canOfferHelp(creature,{eating:api.eating(creature),transporting:api.transporting(creature)})){creature.rescueNeedsRecovery=false;api.requestRecovery(creature);}

  if(!emergency)for(const clinic of clinics.values()){
   if(clinic.busy)continue;const type=['energy','rest'].find(key=>clinic.kits[key]<1);if(!type)continue;
   const helpers=api.creatures.filter(creature=>canOfferHelp(creature,{busy:jobs.has(creature),eating:api.eating(creature),transporting:api.transporting(creature)})&&creature.energy>.55&&creature.fatigue<.45).sort((a,b)=>distance(api.positionOf(a),clinic.supply)-distance(api.positionOf(b),clinic.supply));
   for(const worker of helpers)if(prepareStock(worker,clinic,type))break;
  }

 }
 function draw(){
  for(const clinic of clinics.values()){
   for(const stock of clinic.stock)stock.root.visible=clinic.kits[stock.type]>stock.index;
   for(let index=0;index<2;index++){const lamp=clinic.record.model.getObjectByName('Bed_'+index+'_lamp');lamp.material.emissive.setHex(clinic.beds[index]===null?0x4c6854:0xffc96d);lamp.material.emissiveIntensity=clinic.beds[index]===null?.15:.8;}
  }

 }
 function save(){return [...clinics.values()].map(clinic=>({id:clinic.record.id,kits:{...clinic.kits},cart:{x:clinic.pivot.position.x,z:clinic.pivot.position.z,angle:clinic.pivot.rotation.y}}));}
 function restore(data=[]){
  for(const item of data){const clinic=clinics.get(item.id);if(!clinic)continue;for(const key of ['energy','rest'])clinic.kits[key]=Math.max(0,Math.min(2,Number(item.kits?.[key])||0));if(item.cart&&api.wideClear(item.cart)){clinic.pivot.position.set(item.cart.x,api.floorHeight(item.cart.x,item.cart.z),item.cart.z);clinic.pivot.rotation.y=item.cart.angle||0;}}
  for(const creature of api.creatures){const health=healthOf(creature);carrierState(creature);if(health.carried&&!health.clinic){const point=api.positionOf(creature),drop=api.nearestFree({x:point.x+3,z:point.z});if(drop)position(creature,drop,api.floorHeight(drop.x,drop.z));}health.carried=false;if(health.state!=='awake'){api.MATTER.Body.setStatic(creature.body,true);creature.body.collisionFilter.mask=0;creature.action=health.state==='dead'?'dead':'coma';}const clinic=clinics.get(health.clinic);if(health.state==='coma'&&clinic&&Number.isInteger(health.bed)&&health.bed>=0&&health.bed<2&&clinic.beds[health.bed]===null){clinic.beds[health.bed]=creature.index;const bed=clinic.bedPoints[health.bed];position(creature,bed,bed.height);}else{health.clinic=null;health.bed=null;}}
 }
 return {register,rateAt,shelterAt,cancel,releasePatient,wake,rest,step,draw,save,restore,owns:creature=>jobs.has(creature),towing:creature=>['tow-out','tow-home','return'].includes(jobs.get(creature)?.phase),clearances:()=>[...clinics.values()].map(clinic=>{const job=clinic.busy&&jobs.get(clinic.busy);return {position:job?.vehicle?.pivot.position||clinic.pivot.position,route:job?.route||[],radius:job?.vehicle?.radius||.88};}),summary:()=>{const list=[...clinics.values()];return list.length+' 座医疗站 · '+list.reduce((sum,clinic)=>sum+clinic.kits.energy+clinic.kits.rest,0)+' 份药包 · '+list.reduce((sum,clinic)=>sum+clinic.beds.filter(value=>value===null).length,0)+' 张空床 · '+[...jobs.values()].filter(job=>!job.stockOnly).length+' 位救援 / '+[...jobs.values()].filter(job=>job.stockOnly).length+' 位备药 · '+dispatchStatus;}};
}
