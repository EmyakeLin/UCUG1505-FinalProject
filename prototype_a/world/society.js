import {feed} from 'nutrition-rules';
import {nourishment} from 'nutrition-rules';
import {createBrain,inputVector,discover,uncertainty,learnedValue,snapshotBody,outcomeBetween,remember,replay,exportBrain,importBrain,actionClass} from 'cognition';
import {planFor,proposal,resolveCouncil,updateBelief,welcomeReady,fetchIngredients,cookMeal,processParts,collectPart} from 'society-rules';
import {SOCIAL_ASSETS} from 'social-assets';
import {preserveInnateWeight} from 'instinct-rules';
import {familiarMemory} from 'initial-world';

const clamp=value=>Math.max(0,Math.min(1,value));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const durations={garden:14,study:16,plaza:14,council:20,welcome:14,inspect:5,process:8,'collect-part':2,prepare:5,repair:8,experiment:12,'fetch-food':2,cook:9,meal:5};
const thoughts={garden:'想自己安静待一会儿',study:'想和同伴分享发现',plaza:'想找同伴聚一聚',council:'想听听大家怎么想',welcome:'在等新伙伴来',inspect:'正在试着理解这里',process:'想把原料做成零件','collect-part':'收好接下来要用的零件',prepare:'准备维修用的零件',repair:'想让小推车重新轻快起来',experiment:'想再试一次，看看结果','fetch-food':'先去拿准备餐食的原料',cook:'想为大家准备一顿饭',meal:'和同伴一起吃点东西'};
const defaults={quiet_garden:'garden',learning_room:'study',community_plaza:'plaza',public_forum:'council',welcome_station:'welcome',repair_workshop:'inspect',material_processing:'process',energy_research:'inspect',community_kitchen:'inspect'};

export function createSociety(api){
 const facilities=new Map();let lastSense=-Infinity,lastCommunity=-Infinity;
 const community={policy:null,until:0,round:0,lastDecision:'还没有共同决定'};
 function attach(creature){
  creature.brain=createBrain(317+creature.index*7919);creature.carry={food:0,part:0};creature.plan=null;creature.socialJob=null;creature.experience=null;creature.labour=0;creature.nextSociety=0;creature.nextShare=0;creature.tour=null;
 }
 function register(record,visible){
  record.id??='initial-'+record.key;record.model.userData.facilityId=record.id;
  record.visible=visible;record.anchors??=[];
  record.state??={raw:12,parts:0,meals:0,arrivals:0,born:api.time(),lastMeeting:-90,experiments:0};
  for(const slot of record.anchors)slot.facility=record;
  facilities.set(record.id,record);
  const moving=[];record.model.traverse(mesh=>{if(mesh.isMesh&&/separate_press_head|separate_piston|separate_needle|Communal_ladle_handle|Visible_soup|Bowl_food|Output_.*finished_block/.test(mesh.name))moving.push({mesh,y:mesh.position.y,angle:mesh.rotation.z});});record.moving=moving;
 }
 function known(creature,record){return record&&creature.brain.known[record.id];}
 function perceive(creature,record){
  const position=api.positionOf(creature),point=record.model.position;
  return distance(position,point)<9&&record.anchors.some(slot=>distance(position,slot.point)<8&&api.clearLine(position,slot.point));
 }
 function sense(creature){
  for(const record of facilities.values())if(perceive(creature,record)){
   const memory=discover(creature.brain,record.id,record.visible,record.model.position,api.time());
   if(record.key==='bowl')memory.food=record.anchors[0]?.foodSite.state.bowl||0;
   if(SOCIAL_ASSETS[record.key]){memory.meals=record.state.meals;memory.parts=record.state.parts;memory.raw=record.state.raw;}
  }
  for(const cart of api.carts()){const point=cart.clearance().position,memory=creature.brain.known[cart.status().facility];if(memory&&distance(api.positionOf(creature),point)<8&&api.clearLine(api.positionOf(creature),cart.repairPoint())){memory.cartWear=cart.status().wear;memory.cartPoint={...point};}}
 }
 function input(creature,record,mode='try'){
  const memory=known(creature,record),company=api.creatures.some(other=>other!==creature&&distance(api.positionOf(other),api.positionOf(creature))<2.4);
  const body={energy:creature.energy,fatigue:creature.fatigue,mood:creature.mood,company,familiarity:Math.min(1,(memory?.visits||0)/8)};
  return inputVector(body,memory?.visible||record.visible,actionClass(mode),record.id);
 }
 function begin(creature,record,mode){
  endExperience(creature);
  if(!record)return;
  const witnesses=api.creatures.filter(other=>other!==creature&&(!other.health||other.health.state==='awake')&&distance(api.positionOf(other),api.positionOf(creature))<5&&api.clearLine(api.positionOf(other),api.positionOf(creature))).map(other=>other.index);
  creature.experience={record,mode,input:input(creature,record,mode),before:snapshotBody(creature),start:api.time(),used:false,witnesses};
 }
 function endExperience(creature){
  const episode=creature.experience;creature.experience=null;if(!episode||!episode.used)return;
  const seconds=api.time()-episode.start;if(seconds<2)return;
  const target=outcomeBetween(episode.before,snapshotBody(creature),seconds),record=episode.record;
  remember(creature.brain,{place:record.id,input:episode.input,target,source:'self',time:api.time(),action:episode.mode});
  const memory=known(creature,record);if(memory)memory.purpose=record.key;
  for(const other of api.creatures){
   if(other.health&&other.health.state!=='awake')continue;
   if(record.id==='friend-'+other.index)continue;
   if(!episode.witnesses.includes(other.index)||distance(api.positionOf(other),api.positionOf(creature))>5||!api.clearLine(api.positionOf(other),api.positionOf(creature)))continue;
   discover(other.brain,record.id,record.visible,record.model.position,api.time());
   const visibleTarget=target.map((value,index)=>index<2?0:Math.round(value*5)/5);
   remember(other.brain,{place:record.id,input:input(other,record,episode.mode),target:visibleTarget,source:'observed',teacher:String(creature.index),time:api.time(),action:episode.mode});
   other.brain.lastThought='看见'+creature.name+'试过这里，想自己也试试';
  }
 }
 function cancel(creature){
  endExperience(creature);
  if(creature.socialJob?.cart)creature.socialJob.cart.releaseRepair(creature);
  creature.socialJob=null;
  if(creature.tour){const partner=creature.tour.partner;creature.tour=null;if(partner?.tour?.partner===creature){partner.tour=null;api.finish(partner);}}
 }
 function allows(creature,slot,urgent=false){
  if(slot?.kind==='charge')return Boolean(known(creature,slot.facility));
  if(['charge','eat','sleep','sun','work'].includes(slot?.kind))return true;
  const record=slot?.facility;if(!record)return true;
  const memory=known(creature,record);
  return Boolean(familiarMemory(memory)||memory&&urgent&&perceive(creature,record));
 }
 function value(creature,slot){const record=slot?.facility;if(!record||!known(creature,record))return 0;return learnedValue(creature.brain,input(creature,record,slot.kind),creature);}
 function visit(creature,record,mode,slot=null){
  const available=slot?[slot]:record.anchors.filter(point=>!api.reservations.has(point.id));
  const eligible=record.key==='community_kitchen'?available.filter(point=>mode==='cook'?point.socialIndex===0:point.socialIndex!==0):available;
  eligible.sort((a,b)=>distance(a.point,api.positionOf(creature))-distance(b.point,api.positionOf(creature)));
  for(const point of eligible){
   if(!api.chooseGoal(creature,point.point,'go-society',point))continue;
   begin(creature,record,mode);
   creature.socialJob={record,mode,start:null,progress:0};creature.until=api.time()+45;
   creature.brain.lastThought=thoughts[mode]||'想再看看这里';return true;
  }return false;
 }
 function familiar(creature,key){return [...facilities.values()].filter(record=>record.key===key&&familiarMemory(known(creature,record)));}
 function factsFor(creature){return {
  carryFood:creature.carry.food>0,carryPart:creature.carry.part>0,
  foodKnown:familiar(creature,'bowl').some(record=>(known(creature,record)?.food||0)>=1),
  kitchenKnown:familiar(creature,'community_kitchen').length>0,
  processingKnown:familiar(creature,'material_processing').length>0,
  partsKnown:familiar(creature,'material_processing').some(record=>known(creature,record).parts>0),
  repairKnown:familiar(creature,'repair_workshop').length>0,
  researchKnown:familiar(creature,'energy_research').length>0,
  cartKnown:Object.values(creature.brain.known).some(memory=>memory.cartWear>.12)
 };}
 function followPlan(creature){
  const plan=creature.plan;if(!plan)return false;
  if(api.time()>plan.expires){creature.plan=null;return false;}
  const mode=plan.steps[0];if(!mode){creature.plan=null;return false;}
  let choices=[];
  if(mode==='fetch-food')choices=familiar(creature,'bowl').filter(record=>known(creature,record).food>=1);
  if(mode==='cook')choices=familiar(creature,'community_kitchen').filter(record=>known(creature,record).meals<4);
  if(mode==='process'||mode==='collect-part')choices=familiar(creature,'material_processing').filter(record=>mode==='process'?known(creature,record).raw>0&&known(creature,record).parts<6:known(creature,record).parts>0);
  if(mode==='experiment')choices=familiar(creature,'energy_research');
  if(mode==='repair')choices=familiar(creature,'repair_workshop');
  for(const record of choices)if(visit(creature,record,mode==='repair'?'prepare':mode))return true;
  creature.plan=null;creature.brain.lastThought='这次还缺一些条件，先做别的事';return false;
 }
 function makePlan(creature){
  const facts=factsFor(creature),draw=Math.random();let goal=null;
  if(facts.cartKnown&&facts.repairKnown&&draw<.8)goal='repair';
  else if(facts.researchKnown&&draw<(community.policy==='energy'?.9:.55))goal='research';
  if(!goal)return false;
  const steps=planFor(goal,facts);if(!steps.length)return false;
  creature.plan={goal,steps,expires:api.time()+150};return followPlan(creature);
 }
 function tryDecide(creature,urgent=false){
  sense(creature);
  if(!urgent&&creature.energy>.35&&creature.fatigue<.75){if(followPlan(creature))return true;if(Math.random()<.45&&makePlan(creature))return true;}
  const candidates=[];
  for(const record of facilities.values()){
   if(['community_kitchen','ball_restaurant','medical_station'].includes(record.key))continue;
   const memory=known(creature,record);if(!memory||!record.anchors.length)continue;
   const fresh=memory.visits===0;
   if(!fresh&&!SOCIAL_ASSETS[record.key])continue;
   if(urgent&&!fresh)continue;
   if(!urgent&&api.time()<creature.nextSociety)continue;
   let mode=fresh?'inspect':defaults[record.key];
   if(record.key==='community_kitchen'&&!fresh)mode=memory.meals>0?'meal':'inspect';
   const motivation=fresh?1.2:record.key==='quiet_garden'?.6+(1-creature.mood.safety)*2:record.key==='community_kitchen'&&memory.meals>0?(1-creature.energy)*3:record.key==='public_forum'?.35: .65;
   const sharingPriority=community.policy==='learning'&&record.key==='learning_room'?1.4:0;
   const score=Math.max(.08,motivation+sharingPriority+learnedValue(creature.brain,input(creature,record,mode),creature)+uncertainty(creature.brain,record.id)*.5-distance(api.positionOf(creature),record.model.position)*.025);
   candidates.push({record,mode,score,fresh});
  }
  if(!candidates.length||!urgent&&Math.random()>.64)return false;
  let cursor=Math.random()*candidates.reduce((sum,candidate)=>sum+candidate.score,0);
  const selected=candidates.find(candidate=>(cursor-=candidate.score)<=0)||candidates[0];
  if(selected.fresh){
   for(const slot of selected.record.anchors){if(api.reservations.has(slot.id))continue;if(api.chooseGoal(creature,slot.point,'go-discover',slot)){creature.brain.lastThought='发现了陌生的地方，想靠近试一试';creature.until=api.time()+45;return true;}}
   return false;
  }
  return visit(creature,selected.record,selected.mode);
 }
 function arrive(creature){
  if(creature.experience)creature.experience.used=true;
  if(creature.action==='go-discover'){creature.action='discover';creature.until=api.time()+3;return true;}
  if(creature.action==='go-society'){
   creature.action='society';creature.socialJob.start=api.time();
   const practised=['process','prepare','repair','experiment','cook'].includes(creature.socialJob.mode),experience=creature.brain.practice[creature.socialJob.record.id]||0;
   const pace=practised?1-Math.min(.25,experience*.015):1;creature.until=api.time()+(durations[creature.socialJob.mode]||8)*pace;
   if(creature.experience)creature.experience.mode=creature.socialJob.mode;
   return true;
  }
  if(creature.action==='go-guide'||creature.action==='guide'){creature.action='guide';return true;}
  return false;
 }
 function finishJob(creature,success=true){
  const mode=creature.socialJob?.mode;
  if(creature.plan&&success&&creature.plan.steps[0]===mode)creature.plan.steps.shift();
  if(!success)creature.plan=null;
  creature.nextSociety=api.time()+5;api.finish(creature);
 }
 function invite(creature,record,mode){
  const peer=api.creatures.filter(other=>other!==creature&&!other.playPartner&&!other.socialJob&&['idle','wander','sun','toy-rest'].includes(other.action)&&other.energy>.4&&other.fatigue<.7).sort((a,b)=>distance(api.positionOf(a),api.positionOf(creature))-distance(api.positionOf(b),api.positionOf(creature)))[0];
  if(!peer||distance(api.positionOf(peer),api.positionOf(creature))>8||Math.random()>.65)return;
  discover(peer.brain,record.id,record.visible,record.model.position,api.time(),'invited');
  if(visit(peer,record,mode))api.announce(creature.name+'招呼'+peer.name+'过来，一起待一会儿。');
 }
 function share(teacher,learner){
  const choices=teacher.brain.episodes.filter(episode=>episode.source==='self'&&facilities.has(episode.place));if(!choices.length)return;
  const episode=choices[Math.floor(Math.random()*choices.length)],record=facilities.get(episode.place);
  discover(learner.brain,record.id,record.visible,record.model.position,api.time(),'told');
  const target=episode.target.map((value,index)=>index<2?0:Math.round(value*5)/5);
  remember(learner.brain,{place:record.id,input:input(learner,record,episode.action),target,source:'told',teacher:String(teacher.index),time:api.time(),action:episode.action});
  learner.brain.lastThought='听'+teacher.name+'分享了一个地方，想亲自去看看';teacher.brain.lastThought='把自己试过的事告诉了'+learner.name;
  teacher.speakingUntil=api.time()+1.5;learner.mood.connection=clamp(learner.mood.connection+.05);
 }
 function peersAt(record){return api.creatures.filter(creature=>creature.action==='society'&&creature.socialJob?.record===record);}
 function council(record,peers){
  if(peers.length<2||api.time()-record.state.lastMeeting<70)return;
  const longest=Math.min(...peers.map(creature=>api.time()-creature.socialJob.start));if(longest<6)return;
  const speaker=peers[Math.floor(longest/1.5)%peers.length];speaker.speakingUntil=api.time()+.2;
  if(longest<10)return;
  const votes=peers.map(creature=>{
   const memories=Object.values(creature.brain.known),shortage=memories.some(memory=>memory.food!==undefined&&memory.food<1)?1:0;
   const average=memories.length?memories.reduce((sum,memory)=>sum+memory.error,0)/memories.length:1;
   const energyMemories=memories.filter(memory=>['monolith','sunlight'].includes(memory.purpose));
   const energyError=energyMemories.length?energyMemories.reduce((sum,memory)=>sum+memory.error,0)/energyMemories.length:0;
   return proposal({shortage,energy:creature.energy,fatigue:creature.fatigue,labour:creature.labour,uncertainty:average,energyError});
  });
  const decision=resolveCouncil(votes);record.state.lastMeeting=api.time();community.round++;
  const names={food:'先照顾缺粮的地方',rotation:'让较少劳动的同伴先接班',learning:'多花一点时间分享经验',energy:'再做一些能源比较'};
  if(decision){community.policy=decision;community.until=api.time()+100;community.lastDecision=names[decision];api.announce('大家商量后决定：'+names[decision]+'。');}
  else{community.lastDecision='这次意见不同，先各自再看看';api.announce('小球们提出了不同意见，决定先观察一阵再聊。');}
  for(const creature of peers){creature.brain.lastThought=decision?'愿意试试大家刚刚商量的安排':'大家的经历不一样，还想再想一想';creature.until=api.time()+2;}
 }
 function startTour(host,visitor){
  const places=[...familiar(host,'bowl'),...familiar(host,'nest')].slice(0,2);if(!places.length)return;
  const target=places[0].anchors[0].point;
  if(!api.chooseGoal(host,target,'go-guide'))return;
  const first={partner:visitor,leader:true,places,index:0,next:0,expires:api.time()+50},second={partner:host,leader:false,next:0,expires:first.expires};
  host.tour=first;visitor.tour=second;visitor.action='guide';host.brain.lastThought='想带新伙伴认识这里';visitor.brain.lastThought='跟着这位同伴，看看新的家';
 }
 function tourStep(creature){
  const tour=creature.tour;if(!tour)return false;
  if(api.time()>tour.expires||creature.energy<.2||creature.fatigue>.9){api.finish(creature);return false;}
  const position=api.positionOf(creature),other=api.positionOf(tour.partner),gap=distance(position,other);
  if(tour.leader){
   if(gap>3&&creature.path.length){tour.held=creature.path;creature.path=[];}
   else if(gap<2.5&&tour.held){creature.path=tour.held;tour.held=null;}
   const place=tour.places[tour.index];
   if(gap<2.4&&distance(position,place.anchors[0].point)<.4){
    sense(tour.partner);share(creature,tour.partner);tour.index++;
    if(tour.index>=tour.places.length){api.announce(creature.name+'陪新伙伴认识了附近的生活设施。');api.finish(creature);return false;}
    const path=api.findPath(position,tour.places[tour.index].anchors[0].point);if(!path){api.finish(creature);return false;}creature.path=path;creature.goal=path[path.length-1];creature.action='go-guide';
   }
  }else if(api.time()>tour.next){
   tour.next=api.time()+.6;
   if(gap>1.4){const divisor=Math.max(.01,gap),target={x:other.x-(other.x-position.x)/divisor*1.1,z:other.z-(other.z-position.z)/divisor*1.1};creature.path=api.findPath(position,target)||[];creature.goal=target;}else creature.path=[];
  }
  return true;
 }
 function stepCreature(creature){
  if(creature.health&&creature.health.state!=='awake')return;
  if(creature.energy<.18&&creature.carry.food>=1){creature.carry.food--;feed(creature,'raw');creature.energy=clamp(creature.energy+.24);creature.mood.pleasure=Math.min(1,creature.mood.pleasure+.2);creature.brain.lastThought='先吃一点自己带着的食物，再继续';}
  if(tourStep(creature))return;
  if(creature.action==='sleep'&&api.time()-creature.brain.lastReplay>2){replay(creature.brain);creature.brain.lastReplay=api.time();}
  if(['go-society','go-discover'].includes(creature.action)&&api.time()>creature.until){creature.plan=null;api.finish(creature);return;}
  if(creature.action==='discover'&&api.time()>=creature.until){
   const slot=creature.slot,record=slot.facility;
   if(SOCIAL_ASSETS[record.key]){
    creature.socialJob={record,mode:defaults[record.key],start:api.time(),progress:0};creature.action='society';creature.until=api.time()+durations[creature.socialJob.mode];creature.brain.lastThought='试试看，这里会发生什么';
   }else{creature.action='go-'+slot.kind;api.arrive(creature);}
   return;
  }
  if(creature.action!=='society'||!creature.socialJob)return;
  const job=creature.socialJob,record=job.record,elapsed=api.time()-job.start,peers=peersAt(record);
  job.company=peers.length>1;
  if(['study','plaza','council','welcome','meal'].includes(job.mode)){
   const partner=peers.find(other=>other!==creature),target=partner?api.positionOf(partner):record.model.position,position=api.positionOf(creature);
   const angle=Math.atan2(target.x-position.x,target.z-position.z+.25),difference=Math.atan2(Math.sin(angle-creature.turn),Math.cos(angle-creature.turn));creature.turn+=difference*.06;
  }
  if(job.mode!=='meal'&&(creature.energy<.2||creature.fatigue>.9)){finishJob(creature,false);return;}
  if(distance(api.positionOf(creature),creature.slot.point)>.6){finishJob(creature,false);return;}
  if(['process','prepare','repair','experiment','cook'].includes(job.mode)){creature.labour+=api.step;creature.fatigue=clamp(creature.fatigue+api.step*.006*(1+(api.danger?.(creature)||0))*nourishment(creature).fatigue);}
  if(job.mode==='garden'){creature.mood.safety=clamp(creature.mood.safety+api.step*.035);creature.fatigue=clamp(creature.fatigue-api.step*.018);}
  if(['study','plaza','council','welcome','meal'].includes(job.mode)&&peers.length>1){creature.mood.connection=clamp(creature.mood.connection+api.step*.025);creature.mood.pleasure=Math.min(1,creature.mood.pleasure+api.step*.015);}
  if(['study','plaza','council','welcome'].includes(job.mode)&&!job.invited&&elapsed>1){job.invited=true;invite(creature,record,job.mode);}
  if(['study','plaza'].includes(job.mode)&&api.time()>creature.nextShare){creature.nextShare=api.time()+5;const peer=peers.find(other=>other!==creature);if(peer)share(creature,peer);}
  if(job.mode==='council')council(record,peers);
  if(job.mode==='welcome'&&record.state.arrivals<1){
   const ready=welcomeReady({population:api.creatures.length,beds:api.bedCount(),food:api.foodTotal(),elapsed:api.time()-record.state.born});
   if(ready){const point=api.nearestFree({x:record.model.position.x,z:record.model.position.z+2.5});if(point&&!api.creatures.some(other=>distance(api.positionOf(other),point)<1.1)){
    const visitor=api.spawn(point);record.state.arrivals++;api.announce('一位新伙伴来到了迎接站。'+creature.name+'想带它认识这里。');api.finish(creature);startTour(creature,visitor);return;
   }}
  }
  if(api.time()<creature.until)return;
  if(job.mode==='fetch-food'){
   if(!fetchIngredients(creature.slot.foodSite.state,creature.carry)){finishJob(creature,false);return;}
  }
  // Kitchen cooking and dining are owned by provisions.js.

  if(job.mode==='process'){
   if(!processParts(record.state)){finishJob(creature,false);return;}api.announce(creature.name+'把原料加工成了两份零件。');
  }
  if(job.mode==='collect-part'){
   if(!collectPart(record.state,creature.carry)){finishJob(creature,false);return;}
  }
  if(job.mode==='prepare'){
   const cart=api.carts().find(controller=>{const status=controller.status();return status.wear>.12&&creature.brain.known[status.facility]&&controller.reserveRepair(creature);});
   if(!cart||creature.carry.part<1){if(cart)cart.releaseRepair(creature);finishJob(creature,false);return;}
   const target=cart.repairPoint();endExperience(creature);
   if(!api.chooseGoal(creature,target,'go-society')){cart.releaseRepair(creature);finishJob(creature,false);return;}
   creature.socialJob={record,mode:'repair',cart,start:null};creature.until=api.time()+40;
   // A temporary work point uses the same reservation lifecycle, without owning the cart slot.
   creature.slot={id:'repair-'+creature.index,kind:'society',point:target,facility:record};begin(creature,record,'repair');return;
  }
  if(job.mode==='repair'){
   if(creature.carry.part<1||!job.cart?.repair(creature)){finishJob(creature,false);return;}creature.carry.part--;api.announce(creature.name+'修好了小推车，轮子又轻快起来。');
  }
  if(job.mode==='experiment'){
   if(creature.carry.part<1){finishJob(creature,false);return;}
   const separation=1+(record.state.experiments%4),measurement=api.measureEnergy(separation);
   const previous=creature.brain.beliefs.energy?.mean||0;
   creature.brain.beliefs.energy=updateBelief(creature.brain.beliefs.energy,measurement.sun/measurement.monolith);
   creature.brain.beliefs['distance-'+separation]=updateBelief(creature.brain.beliefs['distance-'+separation],measurement.sun);
   creature.carry.part--;record.state.experiments++;
   creature.brain.lastThought=Math.abs(previous-creature.brain.beliefs.energy.mean)>.02?'这次的结果和原来想的不太一样':'又比较了一次，对这个结果更有把握了';
   api.announce(creature.name+'比较了两种样本，记录了不同距离下的恢复效果。');
  }
  if(job.mode==='inspect')creature.brain.lastThought='知道这里可以尝试什么了，还需要准备一些东西';
  finishJob(creature);
 }
 function step(){
  if(api.time()-lastSense>=1){lastSense=api.time();for(const creature of api.creatures)if(!creature.health||creature.health.state==='awake')sense(creature);}
  if(api.time()>community.until)community.policy=null;
  if(api.time()-lastCommunity>=1){lastCommunity=api.time();for(const creature of api.creatures)if(creature.action==='work'||api.isDelivering(creature))creature.labour+=1;}
 }
 function modulate(creature,weights){
  for(const [action,weight] of Object.entries(weights)){
   const kind={charge:'monolith',eat:'bowl',sleep:'nest',sun:'sunlight',toy:'arch',work:'workshop',delivery:'workshop'}[action];
   if(kind){const choices=kind==='nest'?[...familiar(creature,'nest'),...familiar(creature,'ball_home')]:familiar(creature,kind);if(!choices.length)weights[action]=preserveInnateWeight(action,weight,false);else{const learned=Math.max(...choices.map(record=>learnedValue(creature.brain,input(creature,record,action),creature)));weights[action]=weight*Math.max(.15,Math.min(2.5,1+learned));}}
  }
  if(community.policy==='food'){weights.work*=1.7;weights.delivery*=2;}
  if(community.policy==='rotation'){const minimum=Math.min(...api.creatures.map(other=>other.labour));const willingness=creature.labour>minimum+8?.25:1.7;weights.work*=willingness;weights.delivery*=willingness;}
  const peers=api.creatures.filter(other=>other!==creature&&creature.brain.known['friend-'+other.index]&&distance(api.positionOf(other),api.positionOf(creature))<8);
  if(peers.length){const preference=Math.max(...peers.map(peer=>{const id='friend-'+peer.index,memory=creature.brain.known[id];return learnedValue(creature.brain,inputVector(creature,memory.visible,'social',id),creature);}));weights.play*=Math.max(.2,Math.min(2,1+preference));}
 }
 function draw(now){
  const motion=api.motion();
  for(const record of facilities.values()){
   const workers=peersAt(record),active=workers.some(creature=>['process','cook','experiment','prepare'].includes(creature.socialJob.mode));
   for(const item of record.moving){const name=item.mesh.name;
    if(/separate_press_head|separate_piston/.test(name))item.mesh.position.y=item.y+(active?Math.sin(now*3)*.12*motion:0);
    if(/separate_needle|Communal_ladle_handle/.test(name))item.mesh.rotation.z=item.angle+(active?Math.sin(now*2)*.25*motion:0);
    if(/Visible_soup|Bowl_food/.test(name))item.mesh.visible=record.state.meals>0||active;
    if(/Output_.*finished_block/.test(name))item.mesh.visible=record.state.parts>0;
   }
  }
 }
 function summary(creature){
  const knowledge=Object.keys(creature.brain.known).length,experiences=creature.brain.episodes.length;
  return creature.brain.lastThought+' · 认得 '+knowledge+' 个地方和伙伴，记着 '+experiences+' 段经历';
 }
 function save(){return {version:1,community:{...community},facilities:[...facilities.values()].map(record=>({id:record.id,state:record.state})),residents:api.creatures.map(creature=>({index:creature.index,brain:exportBrain(creature.brain),carry:creature.carry,labour:creature.labour}))};}
 function restore(data){
  if(data?.version!==1)throw new Error('社会存档版本不匹配');
  const brains=data.residents.map(resident=>({resident,brain:importBrain(resident.brain)}));
  for(const {resident,brain} of brains){const creature=api.creatures[resident.index];if(!creature)continue;creature.brain=brain;creature.carry={food:Math.max(0,Math.min(12,resident.carry?.food||0)),part:Math.max(0,Math.min(12,resident.carry?.part||0))};creature.labour=Math.max(0,resident.labour||0);}
  for(const item of data.facilities){const record=facilities.get(item.id);if(record)for(const key of Object.keys(record.state))if(Number.isFinite(item.state[key])&&item.state[key]>=0)record.state[key]=item.state[key];}
  if(data.community&&['food','rotation','learning','energy',null].includes(data.community.policy))Object.assign(community,data.community);
 }
 function social(creature,partner,kind){
  const record={id:'friend-'+partner.index,visible:[.1,.1,.5,.5,.5,0,0,1],model:{position:api.positionOf(partner)},anchors:[]};
  discover(creature.brain,record.id,record.visible,record.model.position,api.time());begin(creature,record,kind);creature.experience.used=true;
  const relation=creature.brain.relations[String(partner.index)]??={trust:.5,affinity:.5};relation.affinity=clamp(relation.affinity+.02);
 }
 return {attach,register,begin,social,endExperience,cancel,allows,value,tryDecide,arrive,stepCreature,step,modulate,draw,summary,save,restore,facilities,community,knows:(creature,id)=>familiarMemory(creature.brain.known[id])};
}
