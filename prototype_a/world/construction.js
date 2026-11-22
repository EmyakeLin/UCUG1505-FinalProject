import * as THREE from 'three';
import {SOCIAL_ASSETS,MEDICAL_ASSET,CIVIC_ASSETS} from 'social-assets';

// The catalog owns presentation; the world supplies each type's functional adapter.
export const BUILDINGS=[
 ...Object.entries(CIVIC_ASSETS).map(([key,definition])=>({key,name:definition.name,note:definition.note})),
 {key:'medical_station',name:MEDICAL_ASSET.name,note:MEDICAL_ASSET.note},
 {key:'sunlight',name:'阳光中心',note:'温暖的光'},
 {key:'nest',name:'睡眠窝',note:'安静的角落'},
 {key:'arch',name:'玩耍拱门',note:'钻来钻去'},
 {key:'bowl',name:'食盆',note:'等待送来的食物'},
 {key:'workshop',name:'食物工坊',note:'附带小推车'},
 {key:'monolith',name:'供能巨碑',note:'陌生的能量来源'},
 ...Object.entries(SOCIAL_ASSETS).map(([key,definition])=>({key,name:definition.name,note:definition.note}))
];
export function createConstruction(api){
 const status=document.getElementById('build-status'),confirm=document.getElementById('build-confirm');
 const cancel=document.getElementById('build-cancel'),catalog=document.getElementById('build-catalog');
 const pointer=new THREE.Vector2(),ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
 const ghostMaterial=new THREE.MeshBasicMaterial({color:0x6b9872,transparent:true,opacity:.38,depthWrite:false});
 let draft=null,selected=null,position={x:0,z:0},located=false,savedPause=false;
 const originals=new Map(),buttons=new Map();
 function restore(){for(const [mesh,material] of originals)mesh.material=material;originals.clear();}
 function close(){
  if(!draft)return;
  restore();api.discard(draft);draft=null;selected=null;api.stage.classList.remove('placing');
  for(const button of buttons.values())button.setAttribute('aria-pressed','false');
  api.setPaused(savedPause);api.pauseButton.disabled=false;
  api.onPlacement?.(false);
 }
 function refresh(){
  if(!draft)return;
  api.position(draft,position);draft.root.visible=located;
  const reason=located?api.inspect(draft,false):'点击地面，为建筑选择一个位置。';
  confirm.disabled=Boolean(reason);status.textContent=reason||'位置合适，确认后建筑就会留在这里。';
  ghostMaterial.color.setHex(reason?0xb66c59:0x6b9872);
 }
 function select(definition){
  const alreadyBuilding=Boolean(draft);
  if(alreadyBuilding){restore();api.discard(draft);}else{savedPause=api.isPaused();api.setPaused(true);}
  api.pauseButton.disabled=true;selected=definition;draft=api.draft(definition.key);located=false;
  draft.root.traverse(mesh=>{if(mesh.isMesh){originals.set(mesh,mesh.material);mesh.material=ghostMaterial;}});
  api.stage.classList.add('placing');
  for(const [key,button] of buttons)button.setAttribute('aria-pressed',String(key===definition.key));
  refresh();
  api.onPlacement?.(true,definition.name);
 }
 function commit(){
  if(!draft||!located)return;
  const reason=api.inspect(draft,true);
  if(reason){status.textContent=reason;confirm.disabled=true;ghostMaterial.color.setHex(0xb66c59);return;}
  restore();const built=draft,name=selected.name;draft=null;selected=null;
  api.commit(built);api.stage.classList.remove('placing');
  for(const button of buttons.values())button.setAttribute('aria-pressed','false');
  api.setPaused(savedPause);api.pauseButton.disabled=false;api.announce(name+'落在了世界里，小球们可以自己去发现它。');
  api.onPlacement?.(false);
 }
 const categories=[
  {name:'能量与食物',keys:['sunlight','bowl','workshop','ball_restaurant','community_kitchen','monolith']},
  {name:'居住与照护',keys:['ball_home','nest','medical_station','quiet_garden']},
  {name:'玩耍与交往',keys:['arch','community_plaza','welcome_station','public_forum']},
  {name:'学习与生产',keys:['learning_room','repair_workshop','material_processing','energy_research']}
 ];
 const groups=new Map();
 for(const category of categories){const section=document.createElement('section'),heading=document.createElement('h3'),options=document.createElement('div');section.className='catalog-group';heading.className='catalog-heading';heading.textContent=category.name;options.className='catalog-options';section.append(heading,options);catalog.append(section);for(const key of category.keys)groups.set(key,options);}
 for(const definition of BUILDINGS){
  const button=document.getElementById('building-option').content.firstElementChild.cloneNode(true);
  button.querySelector('span').textContent=definition.name;button.querySelector('small').textContent=definition.note;
  button.addEventListener('click',()=>select(definition));(groups.get(definition.key)||catalog).appendChild(button);buttons.set(definition.key,button);
 }
 function locate(event){
  if(!draft)return;
  const bounds=api.canvas.getBoundingClientRect();
  pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
  ray.setFromCamera(pointer,api.camera);
  if(!ray.ray.intersectPlane(plane,hit))return;
  position={x:Math.round(hit.x*4)/4,z:Math.round(hit.z*4)/4};located=true;api.canvas.focus({preventScroll:true});refresh();
 }
 api.canvas.addEventListener('pointerdown',locate);
 confirm.addEventListener('click',commit);cancel.addEventListener('click',close);
 document.addEventListener('keydown',event=>{
  if(!draft)return;
  if(event.key==='Escape'){event.preventDefault();close();return;}
  const arrows={ArrowLeft:[-.25,0],ArrowRight:[.25,0],ArrowUp:[0,-.25],ArrowDown:[0,.25]};
  if(arrows[event.key]){event.preventDefault();const [dx,dz]=arrows[event.key];position={x:position.x+dx,z:position.z+dz};located=true;api.canvas.focus({preventScroll:true});refresh();}
  if(event.key==='Enter'&&event.target===api.canvas){event.preventDefault();commit();}
 });
 api.canvas.tabIndex=0;api.canvas.setAttribute('aria-label','世界地面；建造时可用方向键定位，Enter 放置');
 document.getElementById('build-toggle').disabled=false;
 return {cancel:close};
}
