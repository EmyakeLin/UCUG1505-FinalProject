import {nourishment} from 'nutrition-rules';
import * as THREE from 'three';
import {FOOD,canWork,workFood,growFood,loadFood,unloadFood} from 'food-rules';
import {createHold,loadCargo,unloadCargo} from 'cargo-rules';
import {ITEMS} from 'provisions-rules';

// A single shared cart and resumable work job. Creature needs always retain priority.
export function createFoodLogistics(api){
 const {scene,models,state,creatures,MATTER,engine,SCALE,STEP,workSlot}=api;
 const cart=models.cart,hold=createHold(4);let rescueOwner=null,cargoSerial=0;
 const initialCargo=state.cargo||0;
 Object.defineProperty(state,'cargo',{configurable:true,get:()=>hold.entries.filter(entry=>entry.payload.kind==='item'&&entry.payload.item?.type==='raw').length,set:value=>{let count=hold.entries.filter(entry=>entry.payload.kind==='item'&&entry.payload.item?.type==='raw').length;while(count<value){if(!loadCargo(hold,'raw-'+cargoSerial++,{kind:'item',item:{type:'raw'}},1))break;count++;}while(count>value){const entry=hold.entries.find(entry=>entry.payload.kind==='item'&&entry.payload.item?.type==='raw');unloadCargo(hold,entry.id);count--;}}});state.cargo=initialCargo;
 const cargoViews=new Map();
 const hasOtherCargo=()=>hold.entries.some(entry=>!(entry.payload.kind==='item'&&entry.payload.item?.type==='raw'));
 const destinations=()=>[...api.foodSites,...api.deliverySites];
 const node=(model,name)=>model.getObjectByName(name.replaceAll(' ','_'));
 const anchor=(model,name)=>node(model,name).getWorldPosition(new THREE.Vector3());
 const home=anchor(models.workshop,'Dock_Cart');home.z=models.workshop.position.z+6;
 let foodSite=api.foodSites[0];
 Object.defineProperty(state,'bowl',{configurable:true,get:()=>foodSite?foodSite.state.bowl:FOOD.bowlCapacity,set:value=>{if(foodSite)foodSite.state.bowl=value;}});
 const destination=new THREE.Vector3();
 const homeAngle=Math.PI;
 let deliveryAngle=0;
 cart.position.copy(home);cart.rotation.y=homeAngle;cart.updateMatrixWorld(true);
 const wheels=['Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR'].map(name=>node(cart,name));
 const gate=node(cart,'Gate_Pivot');
 const pad=node(models.workshop,'Central cream upper disc');
 const padHeight=pad.position.y;
 const cargoNodes=['Cargo_01','Cargo_02','Cargo_03','Cargo_04'].map(name=>node(cart,name));
 const cargoMeshes=cargoNodes.map(cargo=>{const mesh=api.makeMote();cargo.add(mesh);return mesh;});
 const cropPoints=[[-2.6,1.46,-.7],[-1.55,1.46,-.55],[1.4,1.46,-.65],[2.5,1.46,-.55]];
 const crops=cropPoints.map(point=>{const mesh=api.makeMote();mesh.position.set(...point);models.workshop.add(mesh);return mesh;});
 const stockPoint=anchor(models.workshop,'Spawn_Food');
 stockPoint.y=Math.max(.9,stockPoint.y);
 const stockMeshes=Array.from({length:FOOD.stockCapacity},(_,index)=>{
  const mesh=api.makeMote();mesh.position.copy(stockPoint);
  mesh.position.x+=(index%3-1)*.72;mesh.position.z+=Math.floor(index/3)*.72-.6;
  scene.add(mesh);return mesh;
 });
 const transfer=api.makeMote();transfer.visible=false;scene.add(transfer);
 const cartBody=MATTER.Bodies.rectangle(home.x*SCALE,home.z*SCALE,1.8*SCALE,2.2*SCALE,{isStatic:true,friction:0});
 MATTER.Composite.add(engine.world,cartBody);
 let worker=null,mode='parked',route=null,phase=0,wait=0,flight=null;
 let arrival='home',cooldown=0,gateOpen=0,rolling=0,wear=0,mechanic=null;
 const runningActions=['load','deliver','unload','return-cart'];
 const ownerActive=()=>worker&&worker.cartOwner===cartBody.id&&runningActions.includes(worker.action);
 const pusher=()=>{cart.updateMatrixWorld(true);return anchor(cart,'Pusher_Center');};
 function pauseJob(){
  const previous=worker;worker=null;route=null;mode='parked';flight=null;transfer.visible=false;
  const stillOnJob=previous&&previous.cartOwner===cartBody.id&&['go-cart','cart',...runningActions].includes(previous.action);
  if(previous&&previous.cartOwner===cartBody.id)previous.cartOwner=null;
  if(stillOnJob)api.finish(previous);
 }
 function routeTo(target,angle,next){
  const points=api.cartPath(cart.position,target);
  if(!points){pauseJob();return;}
  route={target:target.clone(),points,angle,next};phase=0;wait=0;
  mode='driving';worker.action=next==='home'?'return-cart':'deliver';
 }
 function attachWorker(){
  const position=pusher();
  MATTER.Body.setPosition(worker.body,{x:position.x*SCALE,y:position.z*SCALE});
  MATTER.Body.setVelocity(worker.body,{x:0,y:0});worker.turn=cart.rotation.y;
  worker.body.force.x=0;worker.body.force.y=0;
 }
 function otherClear(position){
  return creatures.every(creature=>{
   if(creature===worker||creature.health?.state==='dead')return true;
   const other=api.positionOf(creature);
   return Math.hypot(other.x-position.x,other.z-position.z)>2.65;
  });
 }
 function poseClear(position){return api.cartClear(position);}
 // Pick a reachable independent bowl. Its inventory remains owned by that bowl.
 function selectBowl(requireSpace=true){
  const candidates=destinations().filter(site=>!requireSpace||site.state.bowl<=Math.min(FOOD.bowlCapacity,site.capacity||FOOD.bowlCapacity)-1).sort((a,b)=>a.state.bowl-b.state.bowl||Math.hypot(a.point.x-home.x,a.point.z-home.z)-Math.hypot(b.point.x-home.x,b.point.z-home.z));
  for(const site of candidates)for(const offset of [[3.1,-3.3],[-3.1,-3.3],[3.1,3.3],[-3.1,3.3]]){
   const target=new THREE.Vector3(site.point.x+offset[0],0,site.point.z+offset[1]);
   if(!api.cartPath(cart.position,target))continue;
   foodSite=site;destination.copy(target);deliveryAngle=Math.atan2(site.point.x-target.x,site.point.z-target.z);return true;
  }
  return false;
 }
 function startTransfer(kind,time){
  let source,target,index;
  if(kind==='load'){
   if(!loadFood(state))return false;
   index=state.cargo-1;source=stockMeshes[state.stock].position.clone();target=anchor(cart,'Cargo_0'+(index+1));
  }else{
   if(state.cargo<1||state.bowl>FOOD.bowlCapacity-1)return false;
   index=state.cargo-1;source=anchor(cart,'Cargo_0'+(index+1));
   const foodIndex=Math.min(5,Math.ceil(state.bowl));
   target=foodSite.restaurant?new THREE.Vector3(foodSite.point.x,.7,foodSite.point.z):foodSite.foodMeshes[foodIndex].position.clone();
  }
  flight={kind,index,source,target,start:time,duration:1.1};return true;
 }
 return {
  workPoint:()=>workSlot.point,
  weights(creature){
   const capable=creature.energy>.45&&creature.fatigue<.65;
   const lowest=destinations().reduce((minimum,site)=>Math.min(minimum,site.state.bowl),FOOD.bowlCapacity);
   const need=1-lowest/FOOD.bowlCapacity;
   const willingness=(.4+creature.mood.safety*.6)*(.6+creature.mood.arousal*.4);
   const production=capable&&canWork(state)&&!api.reservations.has(workSlot.id);
   const needsDelivery=lowest<=5&&(state.cargo>0||state.stock>=1);
   const needsReturn=state.cargo===0&&cart.position.distanceTo(home)>.2;
   const delivery=capable&&!worker&&!mechanic&&!rescueOwner&&!hasOtherCargo()&&(needsDelivery||needsReturn);
   return {work:production?(1+need*3)*willingness:0,delivery:delivery?(1.5+need*4)*willingness:0};
  },
  tryJob(action,creature,time){
   if(action==='work')return canWork(state)&&!api.reservations.has(workSlot.id)&&api.chooseGoal(creature,workSlot.point,'go-work',workSlot);
   if(action!=='delivery'||worker||mechanic||rescueOwner||hasOtherCargo()||time<cooldown)return false;
   const returning=state.cargo===0&&cart.position.distanceTo(home)>.2;
   if(!returning&&!selectBowl())return false;
   const target=pusher();
   if(!api.chooseGoal(creature,target,'go-cart'))return false;
   worker=creature;worker.cartOwner=cartBody.id;mode='waiting';return true;
  },
  owns(creature){return worker===creature&&ownerActive();},
  blocks(point){
   const dx=point.x-cart.position.x,dz=point.z-cart.position.z;
   const cosine=Math.cos(cart.rotation.y),sine=Math.sin(cart.rotation.y);
   const localX=dx*cosine-dz*sine,localZ=dx*sine+dz*cosine;
   return Math.abs(localX)<1.4&&Math.abs(localZ)<1.57;
  },
  step(time){
   // Ambient daylight grows tended crops; the nearby sunlight center adds a small bonus.
   growFood(state,STEP,api.naturalLight());
   for(const creature of creatures){
    if(creature.action!=='work'||creature.slot!==workSlot)continue;
    const position=api.positionOf(creature);
    const near=Math.hypot(position.x-workSlot.point.x,position.z-workSlot.point.z)<.3;
    if(!near||creature.energy<.3||creature.fatigue>.72||!canWork(state)){api.finish(creature);continue;}
    creature.fatigue=Math.min(1,creature.fatigue+STEP*.012*(1+(api.activityDanger?.(creature)||0))*nourishment(creature).fatigue);
    if(workFood(state,STEP)){
     const message=state.stage==='growing'?'照料好了作物，等它们慢慢成熟。':'收好了食物，放进出货槽。';
     api.announce(creature.name+message);api.finish(creature);
    }
   }
   if(!worker)return;
   const valid=worker.cartOwner===cartBody.id&&['go-cart','cart',...runningActions].includes(worker.action);
   if(!valid){pauseJob();return;}
   if(mode==='waiting'){
    if(worker.action!=='cart')return;
    const position=api.positionOf(worker),target=pusher();
    if(Math.hypot(position.x-target.x,position.z-target.z)>.3){pauseJob();return;}
    mode='docked';arrival=cart.position.distanceTo(home)<.2?'home':cart.position.distanceTo(destination)<.2?'bowl':'resume';
    worker.action=arrival==='bowl'?'unload':'load';attachWorker();
   }
   if(ownerActive())attachWorker();
   if(flight){
    if(time-flight.start<flight.duration)return;
    if(flight.kind==='unload')unloadFood(state);
    flight=null;transfer.visible=false;
   }
   if(worker.energy<.28||worker.fatigue>.76){pauseJob();return;}
   if(mode==='docked'){
    if(arrival==='home'){
     if(worker.action==='return-cart'){pauseJob();return;}
     worker.action='load';
     if(startTransfer('load',time))return;
     if(state.cargo>0){routeTo(destination,deliveryAngle,'bowl');return;}
     pauseJob();return;
    }
    if(arrival==='bowl'){
     worker.action='unload';
     if(gateOpen<1.35)return;
     if(startTransfer('unload',time))return;
     if(state.cargo>0){pauseJob();return;}
     api.announce(worker.name+(foodSite.restaurant?'把食材送到了团团餐厅。':'把食物送到了食盆。'));routeTo(home,homeAngle,'home');return;
    }
    if(state.cargo>0)routeTo(destination,deliveryAngle,'bowl');else routeTo(home,homeAngle,'home');
   }
   if(mode==='driving'){
    worker.action=route.next==='home'?'return-cart':'deliver';
    const waypoint=route.points[0]||route.target;
    const dx=waypoint.x-cart.position.x,dz=waypoint.z-cart.position.z;
    const remaining=Math.hypot(dx,dz);
    const travelAngle=Math.atan2(dx,dz);
    const targetAngle=phase===2?route.angle:travelAngle;
    const difference=Math.atan2(Math.sin(targetAngle-cart.rotation.y),Math.cos(targetAngle-cart.rotation.y));
    const nextPosition={x:cart.position.x+Math.sin(travelAngle)*.12,z:cart.position.z+Math.cos(travelAngle)*.12};
    const clear=otherClear(cart.position)&&api.otherCartsClear(nextPosition)&&poseClear(nextPosition);
    if(!clear){wait+=STEP;if(wait>6){cooldown=time+3;pauseJob();}return;}wait=0;
    if(phase===0||phase===2){
     const turn=Math.max(-STEP*.9,Math.min(STEP*.9,difference));cart.rotation.y+=turn;
     if(Math.abs(difference)<.025){cart.rotation.y=targetAngle;if(phase===0)phase=1;else{mode='docked';arrival=route.next;route=null;}}
    }else{
     const speed=(state.cargo>0?.72:1)*(1-wear*.45);
     const distance=Math.min(remaining,STEP*speed);
     if(remaining>.001){cart.position.x+=dx/remaining*distance;cart.position.z+=dz/remaining*distance;rolling+=distance/.225;wear=Math.min(1,wear+distance/160);}
     if(remaining<.02){route.points.shift();phase=route.points.length?0:2;}
    }
   }
   if(ownerActive())attachWorker();
  },
  draw(time){
   for(const [id,view] of cargoViews)if(!hold.entries.some(entry=>entry.id===id)){cart.remove(view);cargoViews.delete(id);}
   for(const [index,entry] of hold.entries.entries()){
    if(entry.payload.kind==='resident'||entry.payload.item?.type==='raw')continue;
    const key=entry.payload.modelKey||ITEMS[entry.payload.item?.type]?.model,source=key&&models[key];if(!source)continue;
    let view=cargoViews.get(entry.id);if(!view){view=new THREE.Group();const mesh=source.clone(true);mesh.position.set(0,0,0);mesh.scale.setScalar(.65);mesh.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(mesh),center=box.getCenter(new THREE.Vector3());mesh.position.sub(center);view.add(mesh);cart.add(view);cargoViews.set(entry.id,view);}view.position.set((index%2-.5)*.7,1.15,(Math.floor(index/2)-.5)*.7);
   }
   // Fixed-step gate animation is advanced below through sync, not render frame time.
   gate.rotation.x=gateOpen;
   for(const wheel of wheels)wheel.rotation.x=rolling;
   for(let index=0;index<cargoMeshes.length;index++)cargoMeshes[index].visible=index<state.cargo&&(!flight||flight.index!==index);
   for(let index=0;index<stockMeshes.length;index++)stockMeshes[index].visible=index<state.stock;
   const growth=state.stage==='ripe'?1:state.stage==='growing'?state.growth:0;
   for(const crop of crops){crop.visible=growth>0;crop.scale.setScalar(.15+growth*.85);}
   const working=creatures.some(creature=>creature.action==='work'&&creature.slot===workSlot);
   pad.position.y=padHeight+(working?Math.sin(time*4)*.025:0);
   if(flight){
    const progress=Math.min(1,(time-flight.start)/flight.duration);
    transfer.visible=true;transfer.position.copy(flight.source).lerp(flight.target,progress);
    transfer.position.y+=Math.sin(progress*Math.PI)*1.25;
   }
  },
  sync(){
   const open=worker&&worker.action==='unload'?Math.PI*.47:0;
   gateOpen+=(open-gateOpen)*STEP*5;
   MATTER.Body.setPosition(cartBody,{x:cart.position.x*SCALE,y:cart.position.z*SCALE});
   MATTER.Body.setAngle(cartBody,-cart.rotation.y);
  },
  pauseFor(creature){if(worker===creature)pauseJob();},
  status(){return {wear,busy:Boolean(worker||mechanic||rescueOwner),facility:models.workshop.userData.facilityId};},
  reserveRepair(creature){if(rescueOwner||hasOtherCargo()||worker||mechanic&&mechanic!==creature)return false;mechanic=creature;return true;},
  releaseRepair(creature){if(mechanic===creature)mechanic=null;},
  repairPoint(){const point=pusher();return {x:point.x,z:point.z};},
  repair(creature){if(mechanic!==creature)return false;wear=Math.max(0,wear-.65);mechanic=null;return true;},
  save(){return {hold:{capacity:hold.capacity,entries:hold.entries.filter(entry=>entry.payload.kind!=='resident')},state:{stock:state.stock,cargo:state.cargo,stage:state.stage,work:state.work,growth:state.growth},wear,position:{x:cart.position.x,z:cart.position.z},angle:cart.rotation.y};},
  restore(data){pauseJob();mechanic=null;rescueOwner=null;hold.entries=[];for(const key of ['stock','cargo','work','growth'])if(Number.isFinite(data.state[key]))state[key]=Math.max(0,data.state[key]);state.stock=Math.min(8,state.stock);state.cargo=Math.min(4,state.cargo);if(data.hold){hold.entries=[];for(const entry of data.hold.entries)loadCargo(hold,entry.id,entry.payload,entry.units);cargoSerial=Date.now();}state.growth=Math.min(1,state.growth);if(['untended','growing','ripe'].includes(data.state.stage))state.stage=data.state.stage;wear=Math.max(0,Math.min(1,data.wear||0));if(api.cartClear(data.position)){cart.position.set(data.position.x,0,data.position.z);cart.rotation.y=data.angle||0;}},
  carrier(){return {pivot:cart,home:{x:home.x,z:home.z},radius:2.12,height:1.05,hold,wheels,roll:distance=>{rolling+=distance/.225;},pullDistance:2.15,external:true,
 available:()=>!worker&&!mechanic&&!rescueOwner&&!hold.entries.length,
 reserve:owner=>{if(worker||mechanic||rescueOwner||hold.entries.length)return false;rescueOwner=owner;return true;},
 release:owner=>{if(rescueOwner===owner)rescueOwner=null;},
 load:(id,payload,units=1)=>Boolean(rescueOwner)&&loadCargo(hold,id,payload,units),unload:id=>unloadCargo(hold,id),
 sync:()=>{MATTER.Body.setPosition(cartBody,{x:cart.position.x*SCALE,y:cart.position.z*SCALE});MATTER.Body.setAngle(cartBody,-cart.rotation.y);}};},
  clearance(){return {cart,home:{x:home.x,z:home.z},position:{x:cart.position.x,z:cart.position.z},destination:worker?{x:destination.x,z:destination.z}:null,route:route?route.points:[]};},
  summary(){const stages={untended:'等待照料',growing:'作物生长中',ripe:'等待收获'};return '工坊：'+stages[state.stage]+' · 待配送 '+state.stock+' 份 · 车上 '+state.cargo+' 份 · 食盆 '+Math.floor(state.bowl)+' 份';}
 };
}
