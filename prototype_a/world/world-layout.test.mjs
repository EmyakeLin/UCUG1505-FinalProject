// Domain/asset geometry checks only: no browser, renderer, UI or physics runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Matrix4,Vector3,Quaternion,Box3} from './vendor/three.module.js';
import {CORE_LAYOUT,STARTER_BUILDINGS,LAYOUT_REVISION,worldDimensions,translatedBox,separated,planBuildings,migrateLayout} from './world-layout.mjs';
import {SOCIAL_ASSETS,CIVIC_ASSETS} from './social-assets.mjs';
import {floodGrid} from './build-rules.mjs';
const files={monolith:'building_monolith_v08',sunlight:'building_sunlight_center_v01',nest:'building_nest_v03',bowl:'building_bowl_v03',arch:'building_arch_v03',workshop:'building_food_workshop_dispatch_v5',medical_station:'medical_station'};
for(const key of Object.keys({...SOCIAL_ASSETS,...CIVIC_ASSETS}))files[key]=key;
const footprints={};
for(const [key,file] of Object.entries(files)){
 const bytes=fs.readFileSync(new URL('../assets/models/'+file+'.glb',import.meta.url));
 const data=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12))),box=new Box3();
 function walk(index,parent){
  const node=data.nodes[index],matrix=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(new Vector3(...(node.translation||[0,0,0])),new Quaternion(...(node.rotation||[0,0,0,1])),new Vector3(...(node.scale||[1,1,1])));matrix.premultiply(parent);
  if(node.mesh!==undefined)for(const primitive of data.meshes[node.mesh].primitives){const accessor=data.accessors[primitive.attributes.POSITION];for(const x of [accessor.min[0],accessor.max[0]])for(const y of [accessor.min[1],accessor.max[1]])for(const z of [accessor.min[2],accessor.max[2]])box.expandByPoint(new Vector3(x,y,z).applyMatrix4(matrix));}
  for(const child of node.children||[])walk(child,matrix);
 }
 const rotation=new Matrix4().makeRotationY(key==='monolith'?Math.PI/8:0);
 for(const root of data.scenes[data.scene||0].nodes)walk(root,rotation);
 footprints[key]={minX:box.min.x-.04,maxX:box.max.x+.04,minZ:box.min.z-.04,maxZ:box.max.z+.04};
 if(key==='workshop'){footprints[key].maxX=Math.max(footprints[key].maxX,4.54);footprints[key].maxZ=Math.max(footprints[key].maxZ,8.12);}
}
const reserved=Object.entries(CORE_LAYOUT).filter(([key])=>key!=='cart').map(([key,point])=>translatedBox(footprints[key],point));
for(let a=0;a<reserved.length;a++)for(let b=a+1;b<reserved.length;b++)assert(separated(reserved[a],reserved[b]),'core buildings need a 4.5D corridor');
for(const aspect of [16/9,4/3,21/9,.6]){
 const size=worldDimensions(aspect,null),planned=planBuildings(STARTER_BUILDINGS,footprints,size.width,size.depth,reserved);
 const boxes=[...reserved,...planned.map(item=>translatedBox(footprints[item.key],item))];
 for(let a=0;a<boxes.length;a++)for(let b=a+1;b<boxes.length;b++)assert(separated(boxes[a],boxes[b]));
 for(const box of boxes){assert(box.minX>-size.width/2&&box.maxX<size.width/2);assert(box.minZ>-size.depth/2&&box.maxZ<size.depth/2);}
 // Conservative exterior corridors: even solid bounding boxes inflated by the
 // full food-cart radius leave a connected circuit around every facility.
 const cell=.24,width=Math.ceil(size.width/cell),height=Math.ceil(size.depth/cell),blocked=new Uint8Array(width*height);
 const grid=point=>Math.floor((point.z+size.depth/2)/cell)*width+Math.floor((point.x+size.width/2)/cell);
 const pointAt=index=>({x:-size.width/2+(index%width+.5)*cell,z:-size.depth/2+(Math.floor(index/width)+.5)*cell});
 for(let index=0;index<blocked.length;index++){const point=pointAt(index);blocked[index]=Number(boxes.some(box=>point.x>box.minX-2.12&&point.x<box.maxX+2.12&&point.z>box.minZ-2.12&&point.z<box.maxZ+2.12));}
 const reached=floodGrid(blocked,width,height,grid({x:0,z:0}));
 for(const box of boxes){const point={x:(box.minX+box.maxX)/2,z:box.maxZ+2.28};assert(reached[grid(point)]>=0,'cart corridor disconnected');}
 if(aspect===16/9)console.log('Default layout:',size,planned);
}
const old={version:1,width:48,depth:42.45,buildings:STARTER_BUILDINGS.map((item,index)=>({...item,x:index*11,z:5})),residents:[{point:{x:1,z:5},health:{state:'coma',nightSeconds:41,clinic:'built-1'},inventory:{items:[{type:'lunch'}]}}],carts:[{id:'initial-workshop',position:{x:11,z:1},state:{cargo:2}}],medical:[{id:'built-2',kits:{energy:1,rest:2},cart:{x:2,z:3,angle:1}}],society:{residents:[{brain:{w1:[.1,.2],episodes:[{reward:1}],known:{'built-2':{point:{x:11,z:5},visits:5}}}}]}};
const original=structuredClone(old),size=worldDimensions(16/9,old),planned=planBuildings(old.buildings,footprints,size.width,size.depth,reserved),migrated=migrateLayout(old,planned);
assert.deepEqual(old,original,'migration must not mutate the source save');
assert.equal(migrated.layoutRevision,LAYOUT_REVISION);assert.equal(migrated.residents[0].health.nightSeconds,41);
assert.deepEqual(migrated.residents[0].inventory,old.residents[0].inventory);assert.deepEqual(migrated.carts[0].state,old.carts[0].state);assert.deepEqual(migrated.medical[0].kits,old.medical[0].kits);
assert.deepEqual(migrated.society.residents[0].brain.w1,old.society.residents[0].brain.w1);assert.deepEqual(migrated.society.residents[0].brain.episodes,old.society.residents[0].brain.episodes);
assert.deepEqual(migrated.society.residents[0].brain.known['built-2'].point,{x:planned[1].x,z:planned[1].z});
assert.deepEqual(worldDimensions(.6,{...migrated,width:size.width,depth:size.depth}),size,'reloading cannot relocate or resize the new layout');
const all=Object.keys(files).map((key,index)=>({id:'built-'+(index+1),key}));
const large=worldDimensions(16/9,{...old,buildings:all});assert.equal(planBuildings(all,footprints,large.width,large.depth,reserved).length,all.length);
console.log('Layout domain checks passed: real GLB bounds, four aspect ratios, cart corridors, all facility types, non-destructive save migration and stable reload.');
