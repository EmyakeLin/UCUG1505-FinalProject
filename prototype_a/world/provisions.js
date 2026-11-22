import {nourishment,satietyOf} from 'nutrition-rules';
import * as THREE from 'three';
import {ITEMS,RECIPES,inventoryOf,roomFor,putItem,takeItem,transferItem,makeBatch,packMeal,applyItem,mealCredit} from 'provisions-rules';

export function createProvisions(api){
 const places=new Map(),jobs=new Map(),visuals=new Map();
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const awake=creature=>!creature.health||creature.health.state==='awake';
 function register(record){
  if(!['ball_restaurant','community_kitchen'].includes(record.key)||places.has(record.id))return;
  const restaurant=record.key==='ball_restaurant';
  const place={record,restaurant,raw:0,products:[],recipe:0,served:0};places.set(record.id,place);
  if(restaurant){const site={point:{x:record.model.position.x-3.6,z:record.model.position.z+4.8},state:{},foodMeshes:[],restaurant:true,capacity:8};Object.defineProperty(site.state,'bowl',{get:()=>place.raw,set:value=>{place.raw=value;}});place.deliverySite=site;api.deliverySites.push(site);}
 }
 function cancel(creature){const job=jobs.get(creature);if(!job)return;jobs.delete(creature);creature.provisionTarget=null;creature.provisionMode=null;inventoryOf(creature).held=null;}
 function finish(creature){cancel(creature);creature.nextProvision=api.time()+8;api.finish(creature);}
 function go(creature,place,mode,slot,extra={}){
  if(slot&&api.reservations.has(slot.id))return false;
  const target=slot?.point||api.positionOf(creature);
  if(!api.chooseGoal(creature,target,'go-provision',slot))return false;
  jobs.set(creature,{place,mode,target:{...creature.goal},slot,deadline:api.time()+80,progress:0,...extra});
  creature.provisionMode=mode;creature.provisionTarget=place?.record.id||extra.peer&&'friend-'+extra.peer.index;
  if(place){api.begin(creature,place.record,['eat','dine','eat-carried'].includes(mode)?'meal':mode);}
  return true;
 }
 function arrive(creature){if(creature.action!=='go-provision')return false;creature.action='provision';return true;}
 function closest(creature,filter){return [...places.values()].filter(place=>filter(place)&&(api.known(creature,place.record.id)||distance(api.positionOf(creature),place.record.model.position)<12)).sort((a,b)=>distance(api.positionOf(creature),a.record.model.position)-distance(api.positionOf(creature),b.record.model.position)-3*((api.preference?.(creature,a.record)||0)-(api.preference?.(creature,b.record)||0)));}
 function seat(place){return place.record.anchors.find(slot=>slot.service==='seat'&&!api.reservations.has(slot.id))||(!place.restaurant?place.record.anchors.find(slot=>slot.socialIndex>0&&!api.reservations.has(slot.id)):null);}
 function station(place,role){return place.record.anchors.find(slot=>slot.service===role)||place.record.anchors[0];}
 function fetch(creature,place){
  if(!roomFor(creature))return false;
  const bowls=api.foodSites.filter(site=>site.state.bowl>=1).sort((a,b)=>distance(api.positionOf(creature),a.point)-distance(api.positionOf(creature),b.point));
  for(const source of bowls){const slot={id:'ingredient-'+creature.index,point:source.point,kind:'provision'};if(go(creature,place,'fetch',slot,{source}))return true;}return false;
 }
 function emergencyFood(creature){
  if(!awake(creature)||jobs.has(creature))return false;
  const inventory=inventoryOf(creature),index=inventory.items.findIndex(item=>ITEMS[item.type]?.food!==undefined);
  if(index>=0&&go(creature,null,'eat-carried',null,{itemIndex:index})){inventory.held=index;return true;}
  return creature.carry.food>=1&&go(creature,null,'eat-raw',null);
 }
 function tryDecide(creature){
  if(!awake(creature)||jobs.has(creature))return false;
  const inventory=inventoryOf(creature),edible=inventory.items.findIndex(item=>ITEMS[item.type]?.food!==undefined);
  if(edible>=0&&(satietyOf(creature)<.45||creature.energy<.68||creature.mood.pleasure<-.2)){if(go(creature,null,'eat-carried',null,{itemIndex:edible})){inventory.held=edible;return true;}}
  for(const place of closest(creature,place=>place.products.length>0)){
   if(creature.energy<.76||satietyOf(creature)<.45){const index=place.products.findIndex(item=>item.type==='simple'&&![...jobs.values()].some(job=>job.product===item)),slot=seat(place);if(index>=0&&slot&&go(creature,place,'dine',slot,{product:place.products[index]}))return true;}
   if(roomFor(creature)&&inventory.items.filter(item=>ITEMS[item.type]?.food!==undefined).length<2&&(creature.energy<.8||Math.random()<.3)){
    const product=place.products.find(item=>item.type!=='simple'&&![...jobs.values()].some(job=>job.product===item));if(product&&go(creature,place,'collect',station(place,'takeaway'),{product}))return true;
   }
  }
  if(creature.energy<.35||creature.fatigue>.72||api.time()<(creature.nextProvision||0))return false;
  const shareIndex=inventory.items.findIndex(item=>['lunch','snack','packed'].includes(item.type));
  if(shareIndex>=0&&api.time()>(creature.nextGift||0)){
   const peer=api.creatures.filter(other=>other!==creature&&awake(other)&&roomFor(other)&&!other.path.length&&distance(api.positionOf(creature),api.positionOf(other))<8&&(other.energy<.5||other.mood.pleasure<.1)).sort((a,b)=>a.energy-b.energy)[0];
   if(peer){const target=api.approach(peer);if(target&&go(creature,null,'share',{id:'gift-'+creature.index,point:target,kind:'provision'},{peer,itemIndex:shareIndex,nextTrack:0})){inventory.held=shareIndex;return true;}}
  }
  for(const place of closest(creature,place=>place.restaurant)){
   const cook=station(place,'cook');
   if(place.raw>=1&&place.products.length<6&&!api.reservations.has(cook.id)&&creature.energy>.5&&creature.fatigue<.55){
    const types=['simple','lunch','snack'],type=types[place.recipe%3],recipe=RECIPES[type];
    const actual=place.raw>=recipe.cost?type:'simple';if(go(creature,place,'cook',cook,{recipe:actual}))return true;
   }
   if(place.raw<4&&![...jobs.values()].some(job=>job.place===place&&['fetch','supply'].includes(job.mode))){
    if(creature.carry.food>=1&&go(creature,place,'supply',station(place,'supply')))return true;
    if(place.products.length<6&&fetch(creature,place))return true;
   }
  }
  if(creature.energy<.8||creature.carry.food>=1||Math.random()<.25)for(const place of closest(creature,place=>!place.restaurant)){
   if(place.products.length>=6)continue;
   if(creature.carry.food>=1){if(go(creature,place,'cook',station(place,'cook'),{recipe:'simple'}))return true;}
   else if(fetch(creature,place))return true;
  }
  return false;
 }
 function eat(creature,item){
  if(!applyItem(creature,item))return;
  const cook=Number.isInteger(item.cook)?api.creatures[item.cook]:null;
  if(mealCredit(creature,cook,item)){cook.joyStart=api.time();api.announce(creature.name+'吃下了'+cook.name+'做的'+ITEMS[item.type].name+'，'+cook.name+'开心地跳了起来。');}
  else api.announce(creature.name+'吃下了'+(cook===creature?'自己做的':'随身带的')+ITEMS[item.type].name+'。');
 }
 function step(seconds){
  for(const [creature,job] of [...jobs]){
   if(!awake(creature)||api.time()>job.deadline||creature.fatigue>.9||creature.energy<.16&&!['eat-carried','eat-raw','dine'].includes(job.mode)){finish(creature);continue;}
   if(job.mode==='share'){
    if(!awake(job.peer)){finish(creature);continue;}
    if(distance(api.positionOf(creature),api.positionOf(job.peer))>1.65){
     if(api.time()>job.nextTrack){job.nextTrack=api.time()+.6;const target=api.approach(job.peer),path=target&&api.findPath(api.positionOf(creature),target);if(!path){finish(creature);continue;}creature.path=path;creature.goal=target;creature.action='go-provision';}continue;
    }
    if(!api.clearLine(api.positionOf(creature),api.positionOf(job.peer)))continue;
    if(transferItem(creature,job.peer,job.itemIndex)){job.peer.brain.lastThought='收到了'+creature.name+'递来的食物';creature.speakingUntil=api.time()+2;job.peer.speakingUntil=api.time()+2;api.announce(creature.name+'把随身的食物递给了'+job.peer.name+'。');}creature.nextGift=api.time()+35;finish(creature);continue;
   }
   if(creature.path.length||distance(api.positionOf(creature),job.target)>.5)continue;
   creature.action='provision';if(creature.experience)creature.experience.used=true;job.progress+=seconds;
   if(job.mode==='cook'){creature.labour+=seconds;creature.fatigue=Math.min(1,creature.fatigue+seconds*.006*(1+api.danger(creature))*nourishment(creature).fatigue);}
   const duration=job.mode==='cook'?RECIPES[job.recipe].seconds:['dine','eat-carried','eat-raw'].includes(job.mode)?4:1.5;
   if(job.progress<duration)continue;
   const place=job.place;
   if(job.mode==='fetch'){
    const count=Math.min(2,Math.floor(job.source.state.bowl),Math.max(0,4-inventoryOf(creature).items.length-Math.ceil(creature.carry.food)));
    if(count<1){finish(creature);continue;}job.source.state.bowl-=count;creature.carry.food+=count;
    const mode=place.restaurant?'supply':'cook',slot=station(place,place.restaurant?'supply':'cook');
    if(!go(creature,place,mode,slot,{recipe:'simple'}))finish(creature);continue;
   }
   if(job.mode==='supply'){const amount=Math.min(creature.carry.food,8-place.raw);place.raw+=amount;creature.carry.food-=amount;api.announce(creature.name+'为团团餐厅送来了食材。');}
   if(job.mode==='cook'){
    if(place.restaurant){if(makeBatch(place,job.recipe,creature.index,'restaurant')){place.recipe++;api.announce(creature.name+'做好了'+ITEMS[job.recipe].name+'，香气吸引着附近的小球。');}}
    else{
     const stock={raw:creature.carry.food,products:place.products};
     if(makeBatch(stock,'simple',creature.index,'kitchen')){
      creature.carry.food=stock.raw;const product=place.products[place.products.length-1];
      if(creature.energy>.6&&roomFor(creature)){putItem(creature,packMeal(product));place.products.pop();api.announce(creature.name+'把自己做的简餐打包，收进了物品栏。');}
      else{const slot=seat(place);if(slot&&go(creature,place,'dine',slot,{product}))continue;}
     }
    }
   }
   if(job.mode==='collect'){
    const index=place.products.indexOf(job.product);if(index>=0&&putItem(creature,job.product))place.products.splice(index,1);
   }
   if(job.mode==='dine'){
    const index=place.products.indexOf(job.product);if(index>=0){const [item]=place.products.splice(index,1);eat(creature,item);place.served++;}
   }
   if(job.mode==='eat-raw'&&creature.carry.food>=1){creature.carry.food--;eat(creature,{type:'raw',cook:null,origin:'legacy'});}
   if(job.mode==='eat-carried'){const item=takeItem(creature,job.itemIndex);if(item)eat(creature,item);}
   finish(creature);
  }
 }
 function draw(){
  for(const place of places.values()){
   place.record.model.traverse(mesh=>{
    if(/^Raw_food_/.test(mesh.name))mesh.visible=place.raw>Number(mesh.name.split('_').pop());
    if(/^Ready_meal_(bowl|food)_/.test(mesh.name))mesh.visible=place.products.filter(item=>item.type==='simple').length>Number(mesh.name.split('_').pop());
    if(/^Dining_food_/.test(mesh.name))mesh.visible=[...jobs.values()].some(job=>job.place===place&&job.mode==='dine'&&job.progress>0);
    if(/^Takeaway_(box|lid|handle)_/.test(mesh.name))mesh.visible=place.products.filter(item=>item.type!=='simple').length>Number(mesh.name.split('_').pop());
    if(/Visible_soup|Bowl_food/.test(mesh.name))mesh.visible=place.products.length>0||[...jobs.values()].some(job=>job.place===place&&job.mode==='cook');
   });
  }
  for(const creature of api.creatures){
   const inventory=inventoryOf(creature),job=jobs.get(creature);
   let type=inventory.held!==null?inventory.items[inventory.held]?.type:null;
   if(!type&&job&&['fetch','supply','cook'].includes(job.mode)&&creature.carry.food>0)type='raw';
   if(!type&&job?.mode==='dine'&&job.progress>0)type='simple';
   if(!type)type=inventory.items.find(item=>['energy','rest'].includes(item.type))?.type;
   let visual=visuals.get(creature);
   if(visual?.type!==type){if(visual)creature.heading.remove(visual.root);visual=null;visuals.delete(creature);
    const source=type&&api.models[ITEMS[type].model];if(source){const root=new THREE.Group(),mesh=source.clone(true);mesh.position.set(0,0,0);mesh.scale.setScalar(type==='raw'?.6:.7);mesh.updateMatrixWorld(true);const center=new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());mesh.position.sub(center);root.add(mesh);root.position.set(.46,.35,.28);creature.heading.add(root);visual={type,root};visuals.set(creature,visual);}}
   if(visual){visual.root.visible=awake(creature);visual.root.position.y=.35+Math.sin(api.time()*3)*.025;}
  }
 }
 function summary(creature){const inventory=inventoryOf(creature),counts={};if(creature.carry?.food>0)counts['食物']=creature.carry.food;for(const item of inventory.items)counts[ITEMS[item.type].name]=(counts[ITEMS[item.type].name]||0)+1;const contents=Object.entries(counts).map(([name,count])=>name+' ×'+count).join('、')||'空';const held=inventory.items[inventory.held],holdingRaw=creature.carry.food>0&&['supply','cook','fetch'].includes(jobs.get(creature)?.mode);return '物品栏：'+contents+(held?' · 抱着'+ITEMS[held.type].name:holdingRaw?' · 抱着食物':'');}
 function save(){return [...places.values()].map(place=>({id:place.record.id,raw:place.raw,products:place.products.map(item=>({...item})),recipe:place.recipe,served:place.served}));}
 function restore(data=[]){if(!data.length)for(const place of places.values())if(!place.restaurant&&place.record.state.meals){for(let index=0;index<Math.min(6,place.record.state.meals);index++)place.products.push({type:'simple',cook:null,origin:'legacy'});place.record.state.meals=0;}for(const item of data){const place=places.get(item.id);if(place){place.raw=item.raw;place.products=item.products.map(product=>({...product}));place.recipe=item.recipe||0;place.served=item.served||0;}}}
 return {register,cancel,arrive,tryDecide,emergencyFood,step,draw,summary,save,restore,activity:creature=>({fetch:'去食盆领取食材',supply:'给餐厅送食材',cook:'在灶台前做饭',dine:'坐下来享用简餐',collect:'领取随身餐食','eat-raw':'吃抱着的食物','eat-carried':'吃随身带着的食物',share:'把食物递给同伴'}[jobs.get(creature)?.mode]),owns:creature=>jobs.has(creature),eating:creature=>['dine','eat-carried','eat-raw'].includes(jobs.get(creature)?.mode),working:creature=>['cook','supply','fetch'].includes(jobs.get(creature)?.mode),status:()=>[...places.values()].filter(place=>place.restaurant).map(place=>'餐厅：原料 '+place.raw+' · 成品 '+place.products.length+' · 已用餐 '+place.served).join('；')};
}
