// Fixed camera, unchanged D units. The extra area belongs to the world, not the HUD.
import {INITIAL_BUILDINGS} from './initial-world.mjs';
export const LAYOUT_REVISION=2;
export const CORE_LAYOUT=Object.fromEntries(INITIAL_BUILDINGS.filter(record=>record.point).map(record=>[record.key,{...record.point}]));
CORE_LAYOUT.cart={x:CORE_LAYOUT.workshop.x+2.42,z:CORE_LAYOUT.workshop.z+6};
export const LEGACY_LAYOUT={monolith:{x:-12,z:-7},sunlight:{x:-4,z:-6},nest:{x:-12,z:5},bowl:{x:-1,z:5.1},arch:{x:10,z:7},workshop:{x:8,z:-4.2}};
export const STARTER_BUILDINGS=INITIAL_BUILDINGS.filter(record=>!record.point).map(({id,key})=>({id,key}));
const ZONES={ball_home:{x:-17,z:-8},medical_station:{x:0,z:-13},ball_restaurant:{x:18,z:15},sunlight:{x:4,z:-2},nest:{x:-18,z:12},bowl:{x:5,z:6},workshop:{x:21,z:-13},monolith:{x:-27,z:-15},arch:{x:-4,z:15},community_kitchen:{x:13,z:17},quiet_garden:{x:-21,z:16},community_plaza:{x:-4,z:22},public_forum:{x:10,z:23},welcome_station:{x:-17,z:22},learning_room:{x:-23,z:3},repair_workshop:{x:26,z:0},material_processing:{x:26,z:-20},energy_research:{x:-15,z:-22}};
export const LAYOUT_GAP=4.5;
const PLACEMENT_ORDER=['ball_home','medical_station','ball_restaurant','sunlight','bowl','workshop','nest','arch'];
export function worldDimensions(aspect,saved){
 if(saved?.layoutRevision===LAYOUT_REVISION)return {width:saved.width,depth:saved.depth};
 const migrating=Boolean(saved&&saved.layoutRevision!==LAYOUT_REVISION);
 const count=saved?.buildings?.length||STARTER_BUILDINGS.length;
 const capacitySpan=Math.ceil(Math.sqrt(count+6))*19;
 const width=Math.max(72,64*aspect*.636,capacitySpan,(saved?.width||0)*(migrating?1.5:1));
 const depth=Math.max(64,72/aspect/.636,capacitySpan,(saved?.depth||0)*(migrating?1.5:1));
 return {width:Math.min(256,width),depth:Math.min(256,depth)};
}
export function translatedBox(box,point){return {minX:box.minX+point.x,maxX:box.maxX+point.x,minZ:box.minZ+point.z,maxZ:box.maxZ+point.z};}
export function separated(a,b,gap=LAYOUT_GAP){return a.maxX+gap<=b.minX||b.maxX+gap<=a.minX||a.maxZ+gap<=b.minZ||b.maxZ+gap<=a.minZ;}
export function planBuildings(records,footprints,width,depth,reserved){
 const occupied=reserved.map(box=>({...box})),planned=[];
 const priority=key=>{const index=PLACEMENT_ORDER.indexOf(key);return index<0?PLACEMENT_ORDER.length:index;};
 const ordered=[...records].sort((a,b)=>priority(a.key)-priority(b.key));
 for(const record of ordered){
  const local=footprints[record.key],preferred=ZONES[record.key];
  if(!local||!preferred)throw new Error('缺少设施布局信息：'+record.key);
  let choice=null,best=Infinity;
  // Keep the perimeter open, including headroom for tall models at the back.
  for(let z=Math.ceil(-depth/2+6-local.minZ);z<=depth/2-5-local.maxZ;z++)for(let x=Math.ceil(-width/2+5-local.minX);x<=width/2-5-local.maxX;x++){
   const score=(x-preferred.x)**2+(z-preferred.z)**2;
   if(score>=best)continue;
   const point={x,z},box=translatedBox(local,point);
   if(occupied.some(other=>!separated(box,other)))continue;
   choice={...record,...point};best=score;
  }
  if(!choice)throw new Error('新地图没有足够空间安置全部设施；原存档仍保留。');
  planned.push(choice);occupied.push(translatedBox(local,choice));
 }
 return planned;
}
export function migrateLayout(saved,planned){
 const data=structuredClone(saved),moves=new Map();
 for(const [key,old] of Object.entries(LEGACY_LAYOUT))moves.set('initial-'+key,{old,next:CORE_LAYOUT[key]});
 for(const item of saved.buildings){const next=planned.find(record=>record.id===item.id);if(!next)throw new Error('迁移缺少建筑：'+item.id);moves.set(item.id,{old:item,next});}
 const translate=(point,move)=>({x:point.x+move.next.x-move.old.x,z:point.z+move.next.z-move.old.z});
 for(const resident of data.residents){
  const clinic=moves.get(resident.health?.clinic);
  const nearest=clinic||[...moves.values()].reduce((best,move)=>Math.hypot(resident.point.x-move.old.x,resident.point.z-move.old.z)<Math.hypot(resident.point.x-best.old.x,resident.point.z-best.old.z)?move:best);
  resident.point=translate(resident.point,nearest);
 }
 // Unfinished journeys restart at their own depot; cargo and stock are untouched.
 for(const cart of data.carts||[]){const move=moves.get(cart.id);if(move){cart.position={x:move.next.x+2.42,z:move.next.z+6};cart.angle=Math.PI;}}
 for(const clinic of data.medical||[]){const move=moves.get(clinic.id);if(move)clinic.cart={x:move.next.x-2.5,z:move.next.z+2.55,angle:0};}
 for(const resident of data.society?.residents||[])for(const [id,memory] of Object.entries(resident.brain?.known||{})){const move=moves.get(id);if(move){memory.point={x:move.next.x,z:move.next.z};if(memory.cartPoint)memory.cartPoint={x:move.next.x+2.42,z:move.next.z+6};}}
 data.buildings=planned;data.layoutRevision=LAYOUT_REVISION;
 return data;
}
