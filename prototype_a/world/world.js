import {NUTRITION,satietyOf,feed,nourishment,digest,wakeFromNight} from 'nutrition-rules';
import * as THREE from 'three';
import {GLTFLoader} from 'gltf-loader';
import {ENERGY_RATES,SUNLIGHT_FIELD,SUNLIGHT_OUTER_RADIUS,sunlightRecovery} from 'energy-rules';
import {createChargingEffects} from 'charging-effects';
import {createMood,evolveMood,actionWeights,chooseMoodAction,acceptsCompany,moodDescription,sunlightComfort,enjoyFood,companionshipRecovery} from 'mood-rules';
import {createFoodState} from 'food-rules';
import {createFoodLogistics} from 'food-logistics';
import {PLAY_NAMES,choosePlayStyle} from 'play-rules';
import {createConstruction,BUILDINGS} from 'construction';
import {overlaps,inside,floodGrid,gridRoute} from 'build-rules';
import {SOCIAL_ASSETS,MEDICAL_ASSET,CIVIC_ASSETS} from 'social-assets';
import {createSociety} from 'society';
import {importBrain} from 'cognition';
import {createBrainInspector} from 'brain-inspector';
import {createRomance} from 'romance';
import {recordLife} from 'analysis-rules';
import {createAnalysisBridge} from 'analysis-bridge';
import {WINTER,worldClimate,localDanger,healthOf,comaCause,advanceComa,retimeWorld} from 'winter-rules';
import {createMedical} from 'medical';
import {createNavigation,trackProgress} from 'navigation';
import {needsRecovery,routeBudget} from 'rescue-rules';
import {instinctIntent} from 'instinct-rules';
import {createProvisions} from 'provisions';
import {inventoryOf,validInventory,ITEMS} from 'provisions-rules';
import {LAYOUT_REVISION,CORE_LAYOUT,STARTER_BUILDINGS,worldDimensions,planBuildings,migrateLayout} from 'world-layout';
import {createHud} from 'hud';
import {INITIAL_POPULATION,INITIAL_KNOWLEDGE_VERSION,seedInitialKnowledge} from 'initial-world';

// World units use the model package's D = 1. Matter uses 100 units per D.
const MATTER=window.Matter;
const SAVE_KEY='ucug1505-living-society-v1';
let savedWorld=null;
try{const data=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(data?.version===1&&Number.isFinite(data.width)&&Number.isFinite(data.depth)&&data.width>=36&&data.depth>=24&&data.width<=256&&data.depth<=256)savedWorld=retimeWorld(data);}catch{}
const viewportAspect=Math.max(.6,innerWidth/innerHeight);
let initialKnowledgeVersion=savedWorld?.initialKnowledgeVersion||0,lifeRestored=false;
const mapSize=worldDimensions(viewportAspect,savedWorld);
const SCALE=100,STEP=1/60,CELL=.12,WORLD_WIDTH=mapSize.width,WORLD_DEPTH=mapSize.depth,RADIUS=.46;
const MIN_X=-WORLD_WIDTH/2,MIN_Z=-WORLD_DEPTH/2,MAX_X=WORLD_WIDTH/2,MAX_Z=WORLD_DEPTH/2;
const NX=Math.ceil(WORLD_WIDTH/CELL),NZ=Math.ceil(WORLD_DEPTH/CELL);
const stage=document.getElementById('stage'),loading=document.getElementById('loading'),eventText=document.getElementById('event');
const pauseButton=document.getElementById('pause'),restartButton=document.getElementById('restart');
const sunRangeButton=document.getElementById('sun-range');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xe7ecde);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;stage.appendChild(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-14,14,11,-11,.1,1000);
camera.position.set(0,28,34).multiplyScalar(Math.max(WORLD_WIDTH,WORLD_DEPTH)/24);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
const hemisphere=new THREE.HemisphereLight(0xfff5e1,0x869778,1.5);scene.add(hemisphere);
const sunlight=new THREE.DirectionalLight(0xfff6e8,2);sunlight.position.set(-12,26,18);sunlight.castShadow=true;sunlight.shadow.mapSize.set(2048,2048);sunlight.shadow.camera.left=-24;sunlight.shadow.camera.right=24;sunlight.shadow.camera.top=24;sunlight.shadow.camera.bottom=-24;sunlight.shadow.camera.near=1;sunlight.shadow.camera.far=80;sunlight.shadow.normalBias=.025;sunlight.shadow.bias=-.0001;scene.add(sunlight);
const ramp=new THREE.DataTexture(new Uint8Array([100,170,245]),3,1,THREE.RedFormat);ramp.minFilter=ramp.magFilter=THREE.NearestFilter;ramp.needsUpdate=true;
const groundWidth=WORLD_WIDTH+1,groundDepth=WORLD_DEPTH+1;
sunlight.position.multiplyScalar(Math.max(WORLD_WIDTH,WORLD_DEPTH)/36);sunlight.shadow.camera.far=Math.max(WORLD_WIDTH,WORLD_DEPTH)*4;sunlight.shadow.camera.left=-WORLD_WIDTH;sunlight.shadow.camera.right=WORLD_WIDTH;sunlight.shadow.camera.top=WORLD_DEPTH;sunlight.shadow.camera.bottom=-WORLD_DEPTH;sunlight.shadow.camera.updateProjectionMatrix();
const ground=new THREE.Mesh(new THREE.BoxGeometry(groundWidth,.18,groundDepth),new THREE.MeshToonMaterial({color:0xd5dfc6,gradientMap:ramp}));ground.position.y=-.12;ground.receiveShadow=true;scene.add(ground);
const engine=MATTER.Engine.create();engine.gravity.scale=0;
const occupied=new Uint8Array(NX*NZ),blocked=new Uint8Array(NX*NZ),heights=new Float32Array(NX*NZ);
const layouts=CORE_LAYOUT;
const models={},colliderMeshes=[],surfaceMeshes=[],emitters=[];
const outlineMaterial=new THREE.MeshBasicMaterial({color:0x333b36,side:THREE.BackSide});
const loader=new GLTFLoader();
const modelData=JSON.parse(document.getElementById('models').textContent);
let time=0,accumulator=0,paused=false,uiTimer=0,noticeUntil=0,logistics=null,society=null,romance=null,medical=null,provisions=null,hud=null;
let winterStart=Number.isFinite(savedWorld?.winterStart)?savedWorld.winterStart:(savedWorld?.time||0);
let climate=worldClimate((savedWorld?.time||0)-winterStart),deathAllowed=savedWorld?.deathAllowed!==false;
const foodState=createFoodState();
const creatures=[],reservations=new Map(),foodMeshes=[];
const playHistory=new Map();
const templates={},buildings=[],sunCenters=[],sunOverlays=[],chargeSystems=[],foodSites=[],deliverySites=[],foodControllers=[],toySlots=[],terrainBodies=[];
let buildingSerial=0,cartGrid=null,medicalGrid=null;

function gridIndex(x,z){const ix=Math.floor((x-MIN_X)/CELL),iz=Math.floor((z-MIN_Z)/CELL);if(ix<0||iz<0||ix>=NX||iz>=NZ)return -1;return iz*NX+ix;}
function pointAt(index){return {x:MIN_X+(index%NX+.5)*CELL,z:MIN_Z+(Math.floor(index/NX)+.5)*CELL};}
function ancestorName(object){let names='';while(object){names+=' '+object.name;object=object.parent;}return names;}
function addOutline(mesh){const outline=new THREE.Mesh(mesh.geometry,outlineMaterial);outline.name='outline';outline.scale.setScalar(1.008);mesh.add(outline);}
function toonMaterial(material){const luminous=material.emissive&&material.emissive.getHex()!==0;const converted=new THREE.MeshToonMaterial({color:material.color,map:material.map,gradientMap:ramp,side:material.side});converted.name=material.name;converted.transparent=material.transparent;converted.opacity=material.opacity;converted.depthWrite=!material.transparent;if(luminous){converted.emissive.copy(material.emissive);converted.emissiveMap=material.emissiveMap;converted.emissiveIntensity=material.emissiveIntensity;converted.userData.baseEmission=material.emissiveIntensity;emitters.push(converted);}return converted;}
// A concave shell must not receive a scaled copy of every recess: the copy's
// backfaces protrude into its channels and can mask the luminous inlays.
function outlineMonolith(mesh){mesh.geometry.computeBoundingBox();const bounds=mesh.geometry.boundingBox;const size=bounds.getSize(new THREE.Vector3());const center=bounds.getCenter(new THREE.Vector3());const silhouette=new THREE.Mesh(new THREE.BoxGeometry(size.x,size.y,size.z),outlineMaterial);silhouette.name='monolith_silhouette';silhouette.position.copy(center);silhouette.scale.setScalar(1.006);mesh.add(silhouette);}

for(const [key,base64] of Object.entries(modelData)){
 const bytes=Uint8Array.from(atob(base64),character=>character.charCodeAt(0));
 const gltf=await loader.parseAsync(bytes.buffer,'');models[key]=gltf.scene;
 if(key==='mote')continue;
 const layout=layouts[key];gltf.scene.position.set(layout?.x||0,0,layout?.z||0);if(key==='monolith')gltf.scene.rotation.y=Math.PI/8;if(layout)scene.add(gltf.scene);gltf.scene.updateMatrixWorld(true);
 const meshes=[];gltf.scene.traverse(object=>{if(object.isMesh)meshes.push(object);});
 for(const mesh of meshes){
  const name=ancestorName(mesh);
  if(layout&&/nest_wall|bowl_rim|arch_foot|monolith_body|interface_[nesw]_(hood|left|right)|sunlight_base/.test(name))colliderMeshes.push(mesh);
  if(layout&&key==='workshop'&&/Integrated_green|grow_basin|Trough_recessed|Wide_smoothly/.test(name))colliderMeshes.push(mesh);
  if(layout&&/nest_floor|nest_pad|bowl_floor/.test(name))surfaceMeshes.push(mesh);
  if(layout&&key==='workshop'&&/Single_broad|Central_cream|Central_lower/.test(name))surfaceMeshes.push(mesh);
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(toonMaterial):toonMaterial(mesh.material);
  mesh.castShadow=true;mesh.receiveShadow=true;
  if(key==='monolith'){
   const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const material of materials)material.userData.steadyEmission=true;
   const structural=/monolith_body|core_frame|interface_[nesw]_(hood|left|right)/.test(name);mesh.castShadow=structural;mesh.receiveShadow=structural;
   if(/monolith_body/.test(name))outlineMonolith(mesh);
  }else if(key==='sunlight'){
   const shell=/sunlight_base|sunlight_petal|sunlight_core_seat/.test(name);mesh.castShadow=shell;mesh.receiveShadow=shell;
   if(!/sunlight_energy_core/.test(name))addOutline(mesh);
  }else if(!(Array.isArray(mesh.material)?mesh.material.some(material=>material.transparent):mesh.material.transparent))addOutline(mesh);
 }
}
for(const [key,model] of Object.entries(models))if(key!=='mote')templates[key]=model.clone(true);
// A clipped ground overlay shows the actual r and 3r boundaries on demand.
const sunFieldMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{center:{value:new THREE.Vector2(layouts.sunlight.x,layouts.sunlight.z)},innerRadius:{value:SUNLIGHT_FIELD.radius},outerRadius:{value:SUNLIGHT_OUTER_RADIUS}},vertexShader:'varying vec2 worldXZ; void main(){vec4 world=modelMatrix*vec4(position,1.0);worldXZ=world.xz;gl_Position=projectionMatrix*viewMatrix*world;}',fragmentShader:'varying vec2 worldXZ; uniform vec2 center; uniform float innerRadius; uniform float outerRadius; void main(){float distanceToSun=distance(worldXZ,center);if(distanceToSun>outerRadius)discard;float weight=clamp(1.0-distanceToSun/innerRadius,0.0,1.0);float innerLine=1.0-smoothstep(0.025,0.07,abs(distanceToSun-innerRadius));float outerLine=1.0-smoothstep(0.025,0.07,abs(distanceToSun-outerRadius));float alpha=0.045+0.13*weight+0.22*max(innerLine,outerLine);gl_FragColor=vec4(0.98,0.72,0.28,alpha);}'});
const sunFieldOverlay=new THREE.Mesh(new THREE.PlaneGeometry(WORLD_WIDTH,WORLD_DEPTH),sunFieldMaterial);sunFieldOverlay.rotation.x=-Math.PI/2;sunFieldOverlay.position.y=-.024;sunFieldOverlay.visible=false;scene.add(sunFieldOverlay);sunOverlays.push(sunFieldOverlay);sunCenters.push(layouts.sunlight);
function addSunLight(point){const light=new THREE.PointLight(0xffdfa4,2,10,2);light.position.set(point.x,1.4,point.z);scene.add(light);}
addSunLight(layouts.sunlight);
loading.textContent='正在安排通道与休息位置…';

// Rasterize projected structural triangles. Floors and the overhead arch are excluded.
function rasterTriangle(a,b,c){
 const area=(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);if(Math.abs(area)<.000001)return;
 const left=Math.max(0,Math.floor((Math.min(a.x,b.x,c.x)-MIN_X)/CELL)),right=Math.min(NX-1,Math.floor((Math.max(a.x,b.x,c.x)-MIN_X)/CELL));
 const near=Math.max(0,Math.floor((Math.min(a.z,b.z,c.z)-MIN_Z)/CELL)),far=Math.min(NZ-1,Math.floor((Math.max(a.z,b.z,c.z)-MIN_Z)/CELL));
 for(let iz=near;iz<=far;iz++)for(let ix=left;ix<=right;ix++){
  const x=MIN_X+(ix+.5)*CELL,z=MIN_Z+(iz+.5)*CELL;
  const u=((b.x-x)*(c.z-z)-(b.z-z)*(c.x-x))/area;
  const v=((c.x-x)*(a.z-z)-(c.z-z)*(a.x-x))/area;
  if(u>=-.0001&&v>=-.0001&&u+v<=1.0001)occupied[iz*NX+ix]=1;
 }
}
function rebuildTerrain(commit=true){
occupied.fill(0);blocked.fill(0);heights.fill(0);cartGrid=null;medicalGrid=null;
if(commit){for(const body of terrainBodies)MATTER.Composite.remove(engine.world,body);terrainBodies.length=0;}
const addTerrainBody=body=>{if(commit){terrainBodies.push(body);MATTER.Composite.add(engine.world,body);}};
for(const mesh of colliderMeshes){
 const positions=mesh.geometry.attributes.position,indices=mesh.geometry.index;
 const count=indices?indices.count:positions.count;
 const vertices=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
 for(let offset=0;offset<count;offset+=3){for(let corner=0;corner<3;corner++){const index=indices?indices.getX(offset+corner):offset+corner;vertices[corner].fromBufferAttribute(positions,index).applyMatrix4(mesh.matrixWorld);}rasterTriangle(...vertices);}
}
// Merge horizontal runs vertically for compact static Matter rectangles.
let activeRuns=new Map();const rectangles=[];
for(let row=0;row<NZ;row++){
 const nextRuns=new Map();let column=0;
 while(column<NX){if(!occupied[row*NX+column]){column++;continue;}const first=column;while(column<NX&&occupied[row*NX+column])column++;const key=first+':'+column;const rect=activeRuns.get(key)||{first,end:column,row,rows:0};rect.rows++;nextRuns.set(key,rect);}
 for(const [key,rect] of activeRuns)if(!nextRuns.has(key))rectangles.push(rect);activeRuns=nextRuns;
}rectangles.push(...activeRuns.values());
for(const rect of rectangles){const width=(rect.end-rect.first)*CELL,depth=rect.rows*CELL;const x=MIN_X+rect.first*CELL+width/2,z=MIN_Z+rect.row*CELL+depth/2;addTerrainBody(MATTER.Bodies.rectangle(x*SCALE,z*SCALE,width*SCALE,depth*SCALE,{isStatic:true,friction:0}));}
const padding=Math.ceil((RADIUS+.05)/CELL);
for(let index=0;index<occupied.length;index++)if(occupied[index]){
 const column=index%NX,row=Math.floor(index/NX);
 for(let dz=-padding;dz<=padding;dz++)for(let dx=-padding;dx<=padding;dx++){
  if(Math.hypot(dx*CELL,dz*CELL)>RADIUS+.08)continue;
  const x=column+dx,z=row+dz;if(x>=0&&z>=0&&x<NX&&z<NZ)blocked[z*NX+x]=1;
 }
}
for(let row=0;row<NZ;row++)for(let column=0;column<NX;column++)if(row<5||column<5||row>=NZ-5||column>=NX-5)blocked[row*NX+column]=1;
for(const wall of [[0,MIN_Z,groundWidth,.3],[0,MAX_Z,groundWidth,.3],[MIN_X,0,.3,WORLD_DEPTH],[MAX_X,0,.3,WORLD_DEPTH]])addTerrainBody(MATTER.Bodies.rectangle(wall[0]*SCALE,wall[1]*SCALE,wall[2]*SCALE,wall[3]*SCALE,{isStatic:true}));

// Surface heights are sampled from real floor/pad geometry, then interpolated at runtime.
const downRay=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0),0,2);
for(const mesh of surfaceMeshes){const bounds=new THREE.Box3().setFromObject(mesh);const left=Math.max(0,Math.floor((bounds.min.x-MIN_X)/CELL)),right=Math.min(NX-1,Math.ceil((bounds.max.x-MIN_X)/CELL));const near=Math.max(0,Math.floor((bounds.min.z-MIN_Z)/CELL)),far=Math.min(NZ-1,Math.ceil((bounds.max.z-MIN_Z)/CELL));for(let row=near;row<=far;row++)for(let column=left;column<=right;column++){const index=row*NX+column,point=pointAt(index);downRay.ray.origin.set(point.x,1,point.z);const hits=downRay.intersectObject(mesh,false);if(hits.length)heights[index]=Math.max(heights[index],hits[0].point.y);}}
}
rebuildTerrain();
function floorHeight(x,z){const index=gridIndex(x,z);return index<0?0:heights[index];}
const navigation=createNavigation({occupied,blocked,width:NX,height:NZ,cell:CELL,minX:MIN_X,minZ:MIN_Z,radius:RADIUS+.035,dynamicBlocked:point=>Boolean(logistics&&logistics.blocks(point))});
function navigationBlocked(index){return index<0||blocked[index]||Boolean(logistics&&logistics.blocks(pointAt(index)));}
function freePoint(point){return navigation.free(point);}
function nearestFree(point){return navigation.nearest(point);}
function clearLine(a,b){return navigation.line(a,b);}
function findPath(start,end){return navigation.path(start,end);}

function meshCenter(key,name){let found=null;models[key].traverse(object=>{if(object.name===name)found=object;});if(!found)throw new Error('Missing model anchor '+name);return new THREE.Box3().setFromObject(found).getCenter(new THREE.Vector3());}
const beds=['nest_pad_a','nest_pad_b'].map((name,index)=>{const center=meshCenter('nest',name);return {id:'bed'+index,kind:'sleep',point:{x:center.x,z:center.z}};});
const bowls=[{id:'bowl0',kind:'eat',point:{x:layouts.bowl.x-.6,z:layouts.bowl.z}},{id:'bowl1',kind:'eat',point:{x:layouts.bowl.x+.6,z:layouts.bowl.z}}];
const workAnchor=models.workshop.getObjectByName('Work_Pad').getWorldPosition(new THREE.Vector3());
const workSlot={id:'workshop',kind:'work',point:{x:workAnchor.x,z:workAnchor.z}};
const outlets=[];
const outletNormals={n:[0,0,-1],e:[1,0,0],s:[0,0,1],w:[-1,0,0]};
for(const side of ['n','e','s','w']){
 const center=meshCenter('monolith','outlet_'+side);
 const normal=new THREE.Vector3(...outletNormals[side]).transformDirection(models.monolith.matrixWorld);
 const standing=center.clone().addScaledVector(normal,.78);
 outlets.push({id:'outlet'+side,kind:'charge',side,normal,port:center,occupant:null,point:{x:standing.x,z:standing.z}});
}
const sunSpots=Array.from({length:6},(_,index)=>{const angle=index*Math.PI/3;return {id:'sun'+index,kind:'sun',point:{x:layouts.sunlight.x+Math.cos(angle)*3.2,z:layouts.sunlight.z+Math.sin(angle)*3.2}};});
const toyEntry={x:layouts.arch.x,z:layouts.arch.z-1.6},toyExit={x:layouts.arch.x,z:layouts.arch.z+1.6};
const toySlot={id:'arch-toy',kind:'toy',point:toyEntry,entry:toyEntry,exit:toyExit};toySlots.push(toySlot);
const slots=[...beds,...bowls,...outlets,workSlot,...sunSpots,toySlot];
for(const slot of slots){const original=slot.point;const candidate=nearestFree(original);if(!candidate||Math.hypot(candidate.x-original.x,candidate.z-original.z)>.4)throw new Error('Unreachable interaction anchor '+slot.id);slot.point=candidate;}
// Check static connectivity as part of initialization, not as a claim of runtime QA.
for(const slot of slots)if(!findPath({x:0,z:0},slot.point))throw new Error('Disconnected interaction anchor '+slot.id);
const chargingEffects=createChargingEffects(scene,models.monolith,outlets,reduced,camera);chargeSystems.push(chargingEffects);
function makeMote(){
 const group=new THREE.Group(),mesh=models.mote.clone(true);
 const center=new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
 mesh.position.sub(center);group.add(mesh);return group;
}
for(let index=0;index<6;index++){const mote=makeMote();const angle=index*Math.PI/3;mote.position.set(layouts.bowl.x+Math.cos(angle)*.75,.47,layouts.bowl.z+Math.sin(angle)*.75);scene.add(mote);foodMeshes.push(mote);}
function cartClear(point,radius=2.12){
 for(let dz=-radius;dz<=radius;dz+=CELL)for(let dx=-radius;dx<=radius;dx+=CELL){
  if(dx*dx+dz*dz>radius*radius)continue;
  const index=gridIndex(point.x+dx,point.z+dz);
  if(index<0||occupied[index]||point.x+dx<MIN_X+.2||point.x+dx>MAX_X-.2||point.z+dz<MIN_Z+.2||point.z+dz>MAX_Z-.2)return false;
 }
 return true;
}

function cartPath(start,end,radius=2.12){
 const poseClear=point=>cartClear(point,radius);let pathGrid=radius===2.12?cartGrid:radius===.88?medicalGrid:null;
 const cell=.48,width=Math.ceil(WORLD_WIDTH/cell),depth=Math.ceil(WORLD_DEPTH/cell);
 const pointAtCart=index=>({x:MIN_X+(index%width+.5)*cell,z:MIN_Z+(Math.floor(index/width)+.5)*cell});
 const clearSegment=(a,b)=>{const distance=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(distance/.12));for(let step=0;step<=steps;step++){const weight=step/steps;if(!poseClear({x:a.x+(b.x-a.x)*weight,z:a.z+(b.z-a.z)*weight}))return false;}return true;};
 if(!poseClear(start)||!poseClear(end))return null;
 if(clearSegment(start,end))return [{x:end.x,z:end.z}];
 if(!pathGrid){pathGrid=new Uint8Array(width*depth);for(let index=0;index<pathGrid.length;index++)pathGrid[index]=poseClear(pointAtCart(index))?0:1;}
 if(radius===2.12)cartGrid=pathGrid;else if(radius===.88)medicalGrid=pathGrid;
 const nearest=point=>{
  const column=Math.floor((point.x-MIN_X)/cell),row=Math.floor((point.z-MIN_Z)/cell);
  for(let ring=0;ring<=2;ring++)for(let dz=-ring;dz<=ring;dz++)for(let dx=-ring;dx<=ring;dx++){
   const x=column+dx,z=row+dz,index=z*width+x;
   if(x<0||z<0||x>=width||z>=depth||pathGrid[index])continue;
   if(clearSegment(point,pointAtCart(index)))return index;
  }return -1;
 };
 const from=nearest(start),to=nearest(end);if(from<0||to<0)return null;
 const cells=gridRoute(pathGrid,width,depth,from,to);if(!cells)return null;
 const route=[pointAtCart(from),...cells.map(pointAtCart),{x:end.x,z:end.z}];
 const smooth=[];let anchor=start,index=0;
 while(index<route.length){if(!clearSegment(anchor,route[index]))return null;let last=index;while(last+1<route.length&&clearSegment(anchor,route[last+1]))last++;smooth.push(route[last]);anchor=route[last];index=last+1;}
 return smooth;
}
function footprint(root){const bounds=new THREE.Box3().setFromObject(root);return {minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z};}
function visibleFeatures(record){
 const box=new THREE.Box3().setFromObject(record.model),size=box.getSize(new THREE.Vector3());let red=0,green=0,blue=0,light=0,count=0;
 record.model.traverse(mesh=>{if(!mesh.isMesh||mesh.name==='outline'||mesh.name==='monolith_silhouette')return;const material=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;if(!material.color)return;red+=material.color.r;green+=material.color.g;blue+=material.color.b;light+=material.emissiveIntensity||0;count++;});
 return [Math.min(1,size.x/12),Math.min(1,size.y/6),Math.min(1,size.z/12),red/Math.max(1,count),green/Math.max(1,count),blue/Math.max(1,count),Math.min(1,light/Math.max(1,count)),Math.min(1,record.anchors.length/6)];
}
function modelParts(root,key){
 const colliders=[],surfaces=[];
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.name==='outline'||mesh.name==='monolith_silhouette')return;
  const name=ancestorName(mesh);
  const social=key==='medical_station'?MEDICAL_ASSET:(CIVIC_ASSETS[key]||SOCIAL_ASSETS[key]);if(social){if(social.surface.test(name))surfaces.push(mesh);else if(social.solid.test(name))colliders.push(mesh);return;}
  if(/nest_wall|bowl_rim|arch_foot|monolith_body|interface_[nesw]_(hood|left|right)|sunlight_base/.test(name)||key==='workshop'&&/Integrated_green|grow_basin|Trough_recessed|Wide_smoothly/.test(name))colliders.push(mesh);
  if(/nest_floor|nest_pad|bowl_floor/.test(name)||key==='workshop'&&/Single_broad|Central_cream|Central_lower/.test(name))surfaces.push(mesh);
 });return {colliders,surfaces};
}
function buildingAnchors(draft){
 const {key,model,id}=draft,point=model.position,result=[];
 const slot=(kind,suffix,position,extra={})=>({id:id+'-'+suffix,kind,point:{x:position.x,z:position.z},...extra});
 if(key==='nest')for(const name of ['nest_pad_a','nest_pad_b']){const center=new THREE.Box3().setFromObject(model.getObjectByName(name)).getCenter(new THREE.Vector3());result.push(slot('sleep',name,center));}
 if(key==='bowl')for(const offset of [-.6,.6])result.push(slot('eat',String(offset),{x:point.x+offset,z:point.z}));
 if(key==='sunlight')for(let index=0;index<6;index++){const angle=index*Math.PI/3;result.push(slot('sun',String(index),{x:point.x+Math.cos(angle)*3.2,z:point.z+Math.sin(angle)*3.2}));}
 if(key==='arch'){
  const entry={x:point.x,z:point.z-1.6},exit={x:point.x,z:point.z+1.6};result.push(slot('toy','toy',entry,{entry,exit}));
 }
 if(key==='workshop'){const center=model.getObjectByName('Work_Pad').getWorldPosition(new THREE.Vector3());result.push(slot('work','work',center));}
 if(key==='monolith')for(const side of ['n','e','s','w']){
  const port=new THREE.Box3().setFromObject(model.getObjectByName('outlet_'+side)).getCenter(new THREE.Vector3());
  const normal=new THREE.Vector3(...outletNormals[side]).transformDirection(model.matrixWorld);
  const standing=port.clone().addScaledVector(normal,.78);result.push(slot('charge',side,standing,{side,normal,port,occupant:null}));
 }
 if(CIVIC_ASSETS[key])for(const [index,offset] of CIVIC_ASSETS[key].points.entries()){const kind=key==='ball_home'?'sleep':'provision',service=['supply','cook','takeaway','seat','seat','seat','seat'][index];result.push(slot(kind,String(index),{x:point.x+offset[0],z:point.z+offset[1]},{service}));}
 if(key==='medical_station')for(const [index,offset] of MEDICAL_ASSET.points.entries())result.push(slot('medical',String(index),{x:point.x+offset[0],z:point.z+offset[1]}));
 if(SOCIAL_ASSETS[key])for(const [index,offset] of SOCIAL_ASSETS[key].points.entries())result.push(slot('society',String(index),{x:point.x+offset[0],z:point.z+offset[1]},{socialIndex:index}));
 return result;
}
function createDraft(key){
 const root=new THREE.Group(),model=templates[key].clone(true),id='built-'+(++buildingSerial);root.add(model);
 model.position.set(0,0,0);let cart=null;
 if(key==='workshop'){cart=templates.cart.clone(true);cart.position.set(2.42,0,6);cart.rotation.y=Math.PI;root.add(cart);}
 root.traverse(mesh=>{if(mesh.isMesh){const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];const cloned=materials.map(material=>material.clone());mesh.material=Array.isArray(mesh.material)?cloned:cloned[0];}});
 scene.add(root);root.updateMatrixWorld(true);
 return {key,id,root,model,cart,...modelParts(model,key),anchors:[]};
}
function positionDraft(draft,point){
 // Models keep world coordinates so existing food/charging adapters need no parent offsets.
 draft.model.position.set(point.x,0,point.z);
 if(draft.cart)draft.cart.position.set(point.x+2.42,0,point.z+6);
 draft.root.updateMatrixWorld(true);draft.anchors=buildingAnchors(draft);draft.box=footprint(draft.root);
 if(draft.cart){draft.box.minX=Math.min(draft.box.minX,point.x+.3);draft.box.maxX=Math.max(draft.box.maxX,point.x+4.54);draft.box.maxZ=Math.max(draft.box.maxZ,point.z+8.12);}
}
function inspectDraft(draft,thorough){
 const box=draft.box,bounds={minX:MIN_X,maxX:MAX_X,minZ:MIN_Z,maxZ:MAX_Z};
 if(!inside(box,bounds,1))return '这里靠近世界边缘，请往里面一些。';
 const top=new THREE.Box3().setFromObject(draft.root).max.y;
 for(const x of [box.minX,box.maxX])for(const z of [box.minZ,box.maxZ]){const projected=new THREE.Vector3(x,top,z).project(camera);if(Math.abs(projected.x)>.98||Math.abs(projected.y)>.98)return '建筑会超出当前视野，请往画面中间一些。';}
 if(buildings.some(building=>overlaps(box,building.box,.75)))return '这里离现有建筑太近，请留出通行的空间。';
 for(const creature of creatures){if(healthOf(creature).state==='dead')continue;const point=positionOf(creature),space={minX:point.x-.9,maxX:point.x+.9,minZ:point.z-.9,maxZ:point.z+.9};if(overlaps(box,space))return '这里有小球，请换一个位置。';}
 for(const controller of foodControllers){
  const clearance=controller.clearance();
  const points=[clearance.home,clearance.position,...clearance.route];
  for(const point of points){const space={minX:point.x-2.12,maxX:point.x+2.12,minZ:point.z-2.12,maxZ:point.z+2.12};if(overlaps(box,space))return '请给小推车的停靠和配送留出空间。';}
  let previous=clearance.position;
  for(const point of clearance.route){const swept={minX:Math.min(previous.x,point.x)-2.12,maxX:Math.max(previous.x,point.x)+2.12,minZ:Math.min(previous.z,point.z)-2.12,maxZ:Math.max(previous.z,point.z)+2.12};if(overlaps(box,swept))return '这里正在配送途中，请保留当前路线。';previous=point;}
 }
 for(const clearance of medical?.clearances()||[]){let previous=clearance.position;for(const point of [clearance.position,...clearance.route]){const area={minX:Math.min(point.x,previous.x)-(clearance.radius+.6),maxX:Math.max(point.x,previous.x)+(clearance.radius+.6),minZ:Math.min(point.z,previous.z)-(clearance.radius+.6),maxZ:Math.max(point.z,previous.z)+(clearance.radius+.6)};if(overlaps(box,area))return '请为救援车保留当前通道。';previous=point;}}
 if(!thorough)return '';
 const savedOccupied=occupied.slice(),savedBlocked=blocked.slice(),savedHeights=heights.slice(),savedCartGrid=cartGrid,savedMedicalGrid=medicalGrid;
 const colliderCount=colliderMeshes.length,surfaceCount=surfaceMeshes.length;
 colliderMeshes.push(...draft.colliders);surfaceMeshes.push(...draft.surfaces);
 try{
  rebuildTerrain(false);
  const corrected=[];
  for(const slot of draft.anchors){const candidate=nearestFree(slot.point);if(!candidate||Math.hypot(candidate.x-slot.point.x,candidate.z-slot.point.z)>.4)return '入口没有足够的空间，小球暂时进不去。';corrected.push(candidate);}
  const reference=creatures.find(creature=>healthOf(creature).state==='awake')||creatures[0];
  const origin=gridIndex(reference.body.position.x/SCALE,reference.body.position.y/SCALE);
  const reached=floodGrid(blocked,NX,NZ,origin);
  const destinations=[...slots.map(slot=>slot.point),...corrected,...creatures.filter(creature=>healthOf(creature).state!=='dead').map(positionOf)];
  if(draft.key==='medical_station'&&!cartPath({x:draft.model.position.x-2.5,z:draft.model.position.z+2.55},{x:draft.model.position.x,z:draft.model.position.z+4.8},.88))return '救援车无法驶出医疗站，请保留入口通道。';
  if(draft.key==='arch')destinations.push(draft.anchors[0].exit);
  if(destinations.some(point=>{const index=gridIndex(point.x,point.z);return index<0||reached[index]<0;}))return '这会隔断小球的通路，请换一个位置。';
  const sites=draft.key==='bowl'?[...foodSites,{point:draft.model.position}]:foodSites;
  const serves=home=>sites.some(site=>[[3.1,-3.3],[-3.1,-3.3],[3.1,3.3],[-3.1,3.3]].some(([dx,dz])=>cartPath(home,{x:site.point.x+dx,z:site.point.z+dz})));
  for(const controller of foodControllers){const clearance=controller.clearance();if(!cartPath(clearance.position,clearance.home)||!serves(clearance.home))return '放下后小推车无法回家或送货，请留一条更宽的路。';if(clearance.destination&&!cartPath(clearance.position,clearance.destination))return '这会挡住正在配送的小推车。';}
  if(draft.key==='workshop'&&!serves(draft.cart.position))return '工坊还没有通往食盆的宽路，请靠近食盆或留出更宽通道。';
  if(draft.key==='bowl'&&!foodControllers.some(controller=>[[3.1,-3.3],[-3.1,-3.3],[3.1,3.3],[-3.1,3.3]].some(([dx,dz])=>cartPath(controller.clearance().home,{x:draft.model.position.x+dx,z:draft.model.position.z+dz}))))return '小推车暂时到不了这个食盆，请换个位置。';
  for(let index=0;index<draft.anchors.length;index++)draft.anchors[index].point=corrected[index];
  return '';
 }finally{colliderMeshes.length=colliderCount;surfaceMeshes.length=surfaceCount;occupied.set(savedOccupied);blocked.set(savedBlocked);heights.set(savedHeights);cartGrid=savedCartGrid;medicalGrid=savedMedicalGrid;}
}
function discardDraft(draft){scene.remove(draft.root);draft.root.traverse(mesh=>{if(mesh.isMesh){const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const material of materials)material.dispose();}});}
function commitDraft(draft){
 colliderMeshes.push(...draft.colliders);surfaceMeshes.push(...draft.surfaces);rebuildTerrain();
 slots.push(...draft.anchors);buildings.push(draft);if(society)society.register(draft,visibleFeatures(draft));
 for(const slot of draft.anchors){if(slot.kind==='sleep')beds.push(slot);if(slot.kind==='charge')outlets.push(slot);if(slot.kind==='sun')sunSpots.push(slot);if(slot.kind==='toy')toySlots.push(slot);}
 draft.root.traverse(mesh=>{if(mesh.isMesh){const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const material of materials)if(material.userData.baseEmission!==undefined)emitters.push(material);}});
 if(draft.key==='monolith')chargeSystems.push(createChargingEffects(scene,draft.model,draft.anchors,reduced,camera));
 if(draft.key==='sunlight'){
  addSunLight(draft.model.position);
  sunCenters.push({x:draft.model.position.x,z:draft.model.position.z});
  const material=sunFieldMaterial.clone();material.uniforms.center.value.set(draft.model.position.x,draft.model.position.z);
  const overlay=new THREE.Mesh(sunFieldOverlay.geometry,material);overlay.rotation.copy(sunFieldOverlay.rotation);overlay.position.copy(sunFieldOverlay.position);overlay.visible=sunFieldOverlay.visible;scene.add(overlay);sunOverlays.push(overlay);
 }
 if(draft.key==='bowl'){
  const point={x:draft.model.position.x,z:draft.model.position.z},site={point,state:{bowl:0},foodMeshes:[]};
  for(let index=0;index<6;index++){const mote=makeMote(),angle=index*Math.PI/3;mote.position.set(point.x+Math.cos(angle)*.75,.47,point.z+Math.sin(angle)*.75);mote.visible=false;scene.add(mote);site.foodMeshes.push(mote);}
  for(const slot of draft.anchors){slot.foodSite=site;bowls.push(slot);}foodSites.push(site);
 }
 if(draft.key==='ball_home'){const roof=draft.model.getObjectByName('Removable_Roof_ROOT');roof?.traverse(mesh=>{if(mesh.isMesh){mesh.material=mesh.material.clone();mesh.material.transparent=true;mesh.material.opacity=.22;mesh.material.depthWrite=false;}});}
 if(draft.key==='medical_station')medical?.register(draft);
 provisions?.register(draft);
 if(draft.key==='workshop')registerWorkshop(draft.model,draft.cart,draft.anchors[0],createFoodState());
 // Replan only walkers. Sleeping, charging, work, and active vehicle ownership remain intact.
 for(const creature of creatures){if(!creature.path.length||logistics.owns(creature))continue;const path=findPath(positionOf(creature),creature.goal);if(path)creature.path=path;else finish(creature);}
 updateUI();
}

const sphereGeometry=new THREE.SphereGeometry(.48,32,24),eyeGeometry=new THREE.SphereGeometry(1,12,8),eyeMaterial=new THREE.MeshBasicMaterial({color:0x333934});
const chatCanvas=document.createElement('canvas');chatCanvas.width=128;chatCanvas.height=80;
const chatInk=chatCanvas.getContext('2d');
chatInk.fillStyle='#fff9e9';chatInk.strokeStyle='#465348';chatInk.lineWidth=5;
chatInk.beginPath();chatInk.ellipse(64,32,54,25,0,0,Math.PI*2);chatInk.fill();chatInk.stroke();
chatInk.beginPath();chatInk.moveTo(39,49);chatInk.lineTo(31,70);chatInk.lineTo(62,55);chatInk.fill();
chatInk.fillStyle='#465348';for(const x of [42,64,86]){chatInk.beginPath();chatInk.arc(x,32,5,0,Math.PI*2);chatInk.fill();}
const chatTexture=new THREE.CanvasTexture(chatCanvas);chatTexture.colorSpace=THREE.SRGBColorSpace;
const chatMaterial=new THREE.SpriteMaterial({map:chatTexture,depthWrite:false});
function makeCreature(name,color,x,z,energy,fatigue,index){
 const root=new THREE.Group(),heading=new THREE.Group(),pose=new THREE.Group();root.add(heading);heading.add(pose);scene.add(root);
 const mesh=new THREE.Mesh(sphereGeometry,new THREE.MeshToonMaterial({color,gradientMap:ramp}));pose.add(mesh);const outline=new THREE.Mesh(sphereGeometry,outlineMaterial.clone());outline.scale.setScalar(1.045);pose.add(outline);
 const eyes=[];for(const side of [-1,1]){const eye=new THREE.Mesh(eyeGeometry,eyeMaterial);eye.position.set(side*.145,.065,.447);eye.scale.set(.039,.075,.026);pose.add(eye);eyes.push(eye);}
 const blush=new THREE.MeshBasicMaterial({color:0xe4ad9e});for(const side of [-1,1]){const cheek=new THREE.Mesh(eyeGeometry,blush);cheek.position.set(side*.245,-.04,.41);cheek.scale.set(.06,.022,.015);pose.add(cheek);}
 const mouth=new THREE.Mesh(new THREE.TorusGeometry(.035,.009,6,16,Math.PI),eyeMaterial);mouth.rotation.z=Math.PI;mouth.position.set(0,-.065,.479);pose.add(mouth);
 const bubble=new THREE.Sprite(chatMaterial);bubble.position.set(0,1.35,0);bubble.scale.set(.9,.56,1);bubble.visible=false;root.add(bubble);
 const carriedFood=[-1,1].map(side=>{const mote=makeMote();mote.scale.setScalar(.5);mote.position.set(side*.59,.33,.1);mote.visible=false;heading.add(mote);return mote;});
 const carriedPart=new THREE.Mesh(new THREE.BoxGeometry(.24,.18,.24),new THREE.MeshToonMaterial({color:0xe3b19c,gradientMap:ramp}));carriedPart.position.set(.6,.34,-.3);carriedPart.visible=false;heading.add(carriedPart);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.52,32),new THREE.MeshBasicMaterial({color:0x60725b,opacity:.2,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
 const body=MATTER.Bodies.circle(x*SCALE,z*SCALE,RADIUS*SCALE,{frictionAir:.08,restitution:.06,friction:0});MATTER.Body.setInertia(body,Infinity);MATTER.Composite.add(engine.world,body);
 const card=document.getElementById('card-template').content.firstElementChild.cloneNode(true);card.querySelector('strong').textContent=name;document.getElementById('cards').appendChild(card);
 const residentColor='#'+color.toString(16).padStart(6,'0'),detailsId='resident-details-'+index;
 card.querySelector('.resident-dot').style.setProperty('--resident-color',residentColor);card.querySelector('.card-details').id=detailsId;card.querySelector('.card-details-toggle').setAttribute('aria-controls',detailsId);
 return {name,color,index,root,heading,pose,eyes,mouth,bubble,carriedFood,carriedPart,shadow,body,bodyMesh:mesh,bodyOutline:outline,baseColor:new THREE.Color(color),mood:createMood(energy,fatigue),stress:0,lastStartle:-Infinity,nextChat:0,nextPursuit:0,nextJoy:3+index*2,joyStart:-Infinity,toyPasses:0,playPartner:null,socialIntent:'play',playRole:0,playStyle:'imitate',playSession:null,playBlend:0,playElapsed:0,chargeNormal:new THREE.Vector3(),chargePose:0,chargeGlow:0,chargeStarted:0,chargingReady:false,previous:{x,z},energy,fatigue,satiety:NUTRITION.initial,nightSleep:null,nextBedSearch:0,sunRate:0,action:'idle',slot:null,path:[],goal:null,until:0,decision:0,stuck:0,lastPoint:{x,z},turn:0,sleep:0,lift:0,impact:0,phase:index*2.4,nextBlink:1+index,blinkUntil:0,card,speed:index===0?1.65:1.45};
}
const residents=[
 {name:'奶团',color:0xffe8bf,x:0,z:0,energy:.4,fatigue:.2},
 {name:'小雾',color:0xc9e0df,x:0,z:2,energy:.8,fatigue:.76},
 {name:'桃桃',color:0xf2bcae,x:2,z:-1,energy:.85,fatigue:.15},
 {name:'豆豆',color:0xc8d9ac,x:4,z:0,energy:.72,fatigue:.28}
];
for(const [index,resident] of residents.entries())creatures.push(makeCreature(resident.name,resident.color,resident.x,resident.z,resident.energy,resident.fatigue,index));
document.getElementById('residents').textContent=creatures.map(creature=>creature.name).join('、')+'，一起生活在这里。';
const initialFoodSite={point:layouts.bowl,state:{bowl:foodState.bowl},foodMeshes};
foodSites.push(initialFoodSite);for(const slot of bowls)slot.foodSite=initialFoodSite;
function sunAt(point){return Math.max(medical?.rateAt(point)||0,sunCenters.reduce((best,center)=>Math.max(best,sunlightRecovery(Math.hypot(point.x-center.x,point.z-center.z))),0));}
function dangerAt(point){const sheltered=sunCenters.some(center=>Math.hypot(point.x-center.x,point.z-center.z)<=WINTER.safeRadius)||medical?.shelterAt(point);return localDanger(climate,sheltered);}
function nearMonolith(point){return buildings.some(record=>{if(record.key!=='monolith')return false;const box=record.box,dx=Math.max(box.minX-point.x,0,point.x-box.maxX),dz=Math.max(box.minZ-point.z,0,point.z-box.maxZ);return Math.hypot(dx,dz)<=WINTER.monolithRadius;});}
function comfortAt(point){return sunCenters.reduce((best,center)=>Math.max(best,sunlightComfort(Math.hypot(point.x-center.x,point.z-center.z),SUNLIGHT_FIELD.radius)),0);}
function availableBowls(){return bowls.filter(slot=>slot.foodSite.state.bowl>=.01);}
function registerWorkshop(model,cart,slot,state){
 const otherCartsClear=point=>foodControllers.every(controller=>{const clearance=controller.clearance();return clearance.cart===cart||Math.hypot(clearance.position.x-point.x,clearance.position.z-point.z)>4.3;})&&(medical?.clearances()||[]).every(clearance=>Math.hypot(clearance.position.x-point.x,clearance.position.z-point.z)>3.2);
 const controller=createFoodLogistics({scene,models:{...models,workshop:model,cart},state,creatures,MATTER,engine,SCALE,STEP,workSlot:slot,makeMote,positionOf,chooseGoal,finish,announce,reservations,cartClear,foodSites,deliverySites,cartPath,otherCartsClear,known:creature=>!society||society.knows(creature,model.userData.facilityId),activityDanger:creature=>dangerAt(positionOf(creature)),naturalLight:()=>.6*(1-climate.darkness)+.4*sunAt(model.position)/(ENERGY_RATES.monolithRestore*.2)});
 foodControllers.push(controller);return controller;
}
registerWorkshop(models.workshop,models.cart,workSlot,foodState);
logistics={
 weights(creature){return foodControllers.reduce((best,controller)=>{const weights=controller.weights(creature);return {work:Math.max(best.work,weights.work),delivery:Math.max(best.delivery,weights.delivery)};},{work:0,delivery:0});},
 tryJob(action,creature,now){return foodControllers.some(controller=>controller.weights(creature)[action]>0&&controller.tryJob(action,creature,now));},
 owns(creature){return foodControllers.some(controller=>controller.owns(creature));},
 blocks(point){return foodControllers.some(controller=>controller.blocks(point));},
 step(now){for(const controller of foodControllers)controller.step(now);},sync(){for(const controller of foodControllers)controller.sync();},draw(now){for(const controller of foodControllers)controller.draw(now);},
 summary(){const total=foodSites.reduce((sum,site)=>sum+site.state.bowl,0);return '食盆共 '+Math.floor(total)+' 份食物 · '+foodControllers.length+' 座工坊 · '+buildings.length+' 座建筑';}
};
function positionOf(creature){return {x:creature.body.position.x/SCALE,z:creature.body.position.y/SCALE};}
function announce(message){eventText.textContent=message;noticeUntil=time+5;}
function endPlayLink(creature){
 const partner=creature.playPartner;creature.playPartner=null;creature.playSession=null;creature.socialIntent='play';
 if(partner&&partner.playPartner===creature){
  society?.endExperience(partner);partner.playPartner=null;partner.playSession=null;partner.socialIntent='play';
  if(['go-play','play','chat','date'].includes(partner.action)){partner.action='idle';partner.path=[];partner.until=time+1;partner.decision=time+1;}
 }
}
function socialCandidates(creature){
 const position=positionOf(creature);
 return creatures.filter(other=>other!==creature&&!other.playPartner&&!other.playSession&&['idle','wander','sun','toy-rest'].includes(other.action)&&other.energy>.35&&other.fatigue<.75&&Math.hypot(positionOf(other).x-position.x,positionOf(other).z-position.z)<8&&clearLine(position,positionOf(other))).sort((a,b)=>{
  const first=positionOf(a),second=positionOf(b);
  const preferenceA=creature.brain?.relations[String(a.index)]?.affinity||.5,preferenceB=creature.brain?.relations[String(b.index)]?.affinity||.5;
  return Math.hypot(first.x-position.x,first.z-position.z)-Math.hypot(second.x-position.x,second.z-position.z)-3*(preferenceA-preferenceB);
 });
}
function release(creature){if(creature.slot&&reservations.get(creature.slot.id)===creature){reservations.delete(creature.slot.id);creature.slot.occupant=null;}creature.slot=null;creature.chargingReady=false;}
function chooseGoal(creature,goal,action,slot=null){if(healthOf(creature).state!=='awake'||creature.nightSleep)return false;if(action!=='go-medical')medical?.cancel(creature);if(action!=='go-provision')provisions?.cancel(creature);const path=findPath(positionOf(creature),goal);if(!path||!path.length||slot&&Math.hypot(path.at(-1).x-goal.x,path.at(-1).z-goal.z)>(['charge','work'].includes(slot.kind)?.15:.45))return false;society?.cancel(creature);endPlayLink(creature);release(creature);creature.slot=slot;if(slot)reservations.set(slot.id,creature);creature.path=path;creature.goal=path[path.length-1];creature.action=action;creature.stuck=0;creature.navWatch=null;creature.navFailures=0;creature.navBestGoalDistance=Math.hypot(creature.goal.x-positionOf(creature).x,creature.goal.z-positionOf(creature).z);society?.begin(creature,slot?.facility,slot?.kind||action);return true;}
function pursuitPath(creature,partner){
 const start=positionOf(creature),other=positionOf(partner);
 const distance=Math.hypot(other.x-start.x,other.z-start.z);
 if(distance<1.75&&clearLine(start,other))return [];
 const divisor=Math.max(.01,distance),standOff=.9;
 const goal={x:other.x-(other.x-start.x)/divisor*standOff,z:other.z-(other.z-start.z)/divisor*standOff};
 return findPath(start,goal);
}
function inviteForPlay(creature,romantic=false){
 const candidates=socialCandidates(creature);
 if(romantic)candidates.sort((a,b)=>romance.score(creature,b)-romance.score(creature,a));
 for(const partner of candidates){
  if(romantic&&!romance.available(creature,partner))continue;
  if(!romantic&&!acceptsCompany(partner.mood,partner.energy,partner.fatigue,Math.random()))continue;
  const firstRoute=pursuitPath(creature,partner),secondRoute=pursuitPath(partner,creature);
  if(!firstRoute||!secondRoute)continue;
  if(romantic&&!romance.consider(creature,partner))return false;
  for(const [member,route] of [[creature,firstRoute],[partner,secondRoute]]){
   society?.cancel(member);release(member);member.path=route;member.goal=route.length?route[route.length-1]:positionOf(member);
   member.action='go-play';member.socialIntent=romantic?'date':'play';member.until=time+40;member.nextPursuit=time+.6;member.stuck=0;
  }
  creature.playPartner=partner;partner.playPartner=creature;
  const message=romantic?creature.name+'轻轻约了'+partner.name+'，它们朝彼此靠近，想单独待一会儿。':creature.name+'招呼'+partner.name+'一起玩，它们朝彼此跑去。';
  announce(message);return true;
 }
 return false;
}
function roomForChase(center,first,second){
 for(let dx=-1.35;dx<=1.35;dx+=CELL*.5)for(let dz=-1.35;dz<=1.35;dz+=CELL*.5){
  if(Math.hypot(dx,dz)>1.35)continue;
  const point={x:center.x+dx,z:center.z+dz};
  if(!freePoint(point))return false;
 }
 return creatures.every(other=>{if(other===first||other===second)return true;const point=positionOf(other);return Math.hypot(point.x-center.x,point.z-center.z)>2.3;});
}
function beginSocial(first,second,kind){
 const duration=kind==='date'?14:kind==='chat'?5:7+(first.mood.arousal+second.mood.arousal)*2;
 const session={start:time,end:time+duration,kind};
 if(kind==='play'){
  const firstPosition=positionOf(first),secondPosition=positionOf(second);
  const center={x:(firstPosition.x+secondPosition.x)/2,z:(firstPosition.z+secondPosition.z)/2};
  const pairKey=[first.index,second.index].sort((a,b)=>a-b).join(':');
  const arousal=(first.mood.arousal+second.mood.arousal)/2;
  const variant=choosePlayStyle(arousal,playHistory.get(pairKey),roomForChase(center,first,second),Math.random());
  session.variant=variant;session.center=center;session.pairKey=pairKey;
  session.angle=Math.atan2(firstPosition.x-center.x,firstPosition.z-center.z);
  playHistory.set(pairKey,variant);
 }
 first.playPartner=second;second.playPartner=first;first.playRole=0;second.playRole=1;
 for(const creature of [first,second]){
  society?.cancel(creature);release(creature);creature.path=[];creature.action=kind;creature.playSession=session;creature.until=session.end;
  society?.social(creature,creature===first?second:first,kind);
  if(kind==='play')creature.playStyle=session.variant;
  MATTER.Body.setVelocity(creature.body,{x:0,y:0});
 }
 if(kind==='date')romance.begin(first,second,session);
 const message=kind==='date'?'靠在一起，有点害羞地看着对方。':kind==='chat'?'碰面后停下来，你一句我一句地聊了起来。':'碰到一起，玩起了'+PLAY_NAMES[session.variant]+'。';
 announce(first.name+'和'+second.name+message);
}
function chooseSlot(creature,options){const position=positionOf(creature);const available=options.filter(slot=>(!reservations.has(slot.id)||reservations.get(slot.id)===creature)&&(!society||society.allows(creature,slot,creature.energy<.25||creature.fatigue>.88))).sort((a,b)=>Math.hypot(a.point.x-position.x,a.point.z-position.z)-Math.hypot(b.point.x-position.x,b.point.z-position.z)-3*((society?.value(creature,a)||0)-(society?.value(creature,b)||0)));for(const slot of available)if(chooseGoal(creature,slot.point,'go-'+slot.kind,slot))return true;return false;}
function travelBudget(creature,start,path,speed){
 const pace=speed||creature.speed*.8;
 return routeBudget(start,path,pace,point=>ENERGY_RATES.moveDrain*(1+dangerAt(point))*nourishment(creature).energy-sunAt(point),point=>.006*(1+dangerAt(point))*nourishment(creature).fatigue+(climate.fullNight&&nearMonolith(point)?WINTER.monolithFatigue*nourishment(creature).fatigue:0));
}
function workBudget(creature,point,seconds){return {energy:Math.max(0,ENERGY_RATES.moveDrain*(1+dangerAt(point))*nourishment(creature).energy-sunAt(point))*seconds,fatigue:(.006*(1+dangerAt(point))*nourishment(creature).fatigue+(climate.fullNight&&nearMonolith(point)?WINTER.monolithFatigue*nourishment(creature).fatigue:0))*seconds};}
function seekRecovery(creature,force=false,nightShelter=false){
 const position=positionOf(creature),danger=dangerAt(position),tired=creature.fatigue>.72||nightShelter&&creature.fatigue>.15;
 if(!force&&!needsRecovery(creature,danger))return false;
 if(creature.energy<.65&&provisions?.emergencyFood(creature))return true;
 const candidates=[];
 for(const slot of [...availableBowls(),...outlets,...beds]){
  if(slot.kind==='charge'&&society&&!society.allows(creature,slot))continue;
  if(reservations.has(slot.id)&&reservations.get(slot.id)!==creature)continue;
  if(nightShelter&&slot.kind!=='sleep')continue;
  if(slot.kind==='sleep'&&!tired||slot.kind!=='sleep'&&creature.energy>.8||slot.kind==='charge'&&creature.fatigue>.8)continue;
  candidates.push({point:slot.point,slot,kind:slot.kind,energyRate:slot.kind==='eat'?.24*.42:slot.kind==='charge'?ENERGY_RATES.monolithRestore*(climate.fullNight?4:1):0,restRate:slot.kind==='sleep'?.055:0});
 }
 const refugePoints=[];
 if(sunAt(position)>ENERGY_RATES.restDrain)refugePoints.push(position);
 for(const center of sunCenters)for(const radius of [2.2,2.8,3.2])for(let index=0;index<12;index++){const angle=index*Math.PI/6;refugePoints.push({x:center.x+Math.sin(angle)*radius,z:center.z+Math.cos(angle)*radius});}
 for(const record of buildings)if(record.key==='medical_station')refugePoints.push({x:record.model.position.x,z:record.model.position.z-.5});
 for(const point of refugePoints)if(freePoint(point)&&sunAt(point)>ENERGY_RATES.restDrain+.0001)candidates.push({point,kind:'recover',energyRate:0,restRate:.012});
 let chosen=null,best=Infinity,checked=0;
 candidates.sort((a,b)=>Math.hypot(a.point.x-position.x,a.point.z-position.z)-Math.hypot(b.point.x-position.x,b.point.z-position.z));
 for(const candidate of candidates){
  if(chosen&&checked>=8)break;checked++;
  const path=findPath(position,candidate.point);if(!path||!path.length)continue;
  const endpoint=path.at(-1);if(Math.hypot(endpoint.x-candidate.point.x,endpoint.z-candidate.point.z)>.4)continue;
  const cost=travelBudget(creature,position,path),arrivalEnergy=creature.energy-cost.energy,arrivalFatigue=creature.fatigue+cost.fatigue;
  if(arrivalEnergy<.025||arrivalFatigue>=.97)continue;
  const gain=candidate.energyRate+sunAt(endpoint)-ENERGY_RATES.restDrain;
  const energyTime=arrivalEnergy<.7?(gain>0?(.7-arrivalEnergy)/gain:Infinity):0;
  const restTime=arrivalFatigue>.5?(candidate.restRate>0?(arrivalFatigue-.5)/candidate.restRate:Infinity):0;
  if(candidate.kind==='sleep'&&(arrivalEnergy<.34+.05*dangerAt(endpoint)||arrivalEnergy+Math.min(0,gain)*restTime<.08))continue;
  const score=cost.seconds+(tired?restTime:energyTime)*.15;
  if(score<best){chosen=candidate;best=score;}
 }
 if(!chosen)return false;
 if(!chooseGoal(creature,chosen.point,'go-'+chosen.kind,chosen.slot||null))return false;
 if(chosen.kind==='recover')creature.recoveryTarget=force?.94:.82;
 creature.brain.lastThought=force?'先补足能量和精力，才能把同伴安全带回来':'先照顾自己，避免在路上耗尽';return true;
}
function currentInstinct(creature){const point=positionOf(creature);return instinctIntent(creature,{danger:dangerAt(point),night:climate.isNight,sheltered:dangerAt(point)<climate.danger||sunAt(point)>ENERGY_RATES.restDrain,food:foodSites.reduce((sum,site)=>sum+site.state.bowl,0),population:creatures.filter(other=>healthOf(other).state==='awake').length});}
function provideEssentialFood(creature){
 const controllers=[...foodControllers].sort((a,b)=>Math.hypot(a.workPoint().x-positionOf(creature).x,a.workPoint().z-positionOf(creature).z)-Math.hypot(b.workPoint().x-positionOf(creature).x,b.workPoint().z-positionOf(creature).z));
 for(const action of ['delivery','work'])for(const controller of controllers){
  if(climate.isNight&&dangerAt(controller.workPoint())>=climate.danger)continue;
  if(controller.weights(creature)[action]>0&&controller.tryJob(action,creature,time)){creature.brain.lastThought='食物不够了，先去'+(action==='work'?'照料和收获作物':'把现有食物送到大家身边');return true;}
 }return false;
}
function seekNightBed(creature){
 const options=beds.filter(slot=>{if(reservations.has(slot.id)&&reservations.get(slot.id)!==creature)return false;const path=findPath(positionOf(creature),slot.point);if(!path)return false;const cost=travelBudget(creature,positionOf(creature),path);return creature.energy-cost.energy>.02&&creature.fatigue+cost.fatigue<.98;});
 if(!chooseSlot(creature,options))return false;
 for(const controller of foodControllers)controller.pauseFor(creature);
 creature.brain.lastThought='天黑了，回床上睡到天亮';return true;
}
function decide(creature){
 if(climate.isNight&&seekNightBed(creature))return;
 if(satietyOf(creature)<NUTRITION.hungry){if(provisions?.emergencyFood(creature)||chooseSlot(creature,availableBowls())||provisions?.tryDecide(creature))return;}
 // Acute needs are safeguards; everyday choices use the entire mood vector.
 if(seekRecovery(creature))return;
 const instinct=currentInstinct(creature);
 if(instinct==='recover'&&seekRecovery(creature,true))return;
 if(instinct==='shelter'&&seekRecovery(creature,true,true))return;
 if(instinct==='food'&&provideEssentialFood(creature))return;
 if(provisions?.tryDecide(creature))return;
 if(climate.isNight&&creature.energy>.35&&creature.fatigue>.3&&chooseSlot(creature,beds))return;
 if(creature.energy<.25){
  const options=[...availableBowls(),...outlets];
  if(chooseSlot(creature,options))return;
 }
 if(creature.fatigue>.88&&chooseSlot(creature,beds))return;
 if(romance&&creature.energy>.38&&creature.fatigue<.72&&Math.random()<.32&&inviteForPlay(creature,true))return;
 if(society?.tryDecide(creature,creature.energy<.25))return;
 const partnerAvailable=socialCandidates(creature).length>0;
 const weights=actionWeights(creature.mood,creature.energy,creature.fatigue);
 Object.assign(weights,logistics.weights(creature));society?.modulate(creature,weights);
 if(creature.energy<.3)weights.wander=.7;
 weights.eat*=.2+(1-satietyOf(creature))*2;
 if(!availableBowls().length)weights.eat=0;
 if(!partnerAvailable)weights.play=0;
 for(let attempt=0;attempt<10;attempt++){
  const action=chooseMoodAction(weights,Math.random());weights[action]=0;
  if((action==='work'||action==='delivery')&&logistics.tryJob(action,creature,time))return;
  if(action==='charge'&&chooseSlot(creature,outlets))return;
  if(action==='eat'&&chooseSlot(creature,availableBowls()))return;
  if(action==='sleep'&&chooseSlot(creature,beds))return;
  if(action==='sun'&&chooseSlot(creature,sunSpots))return;
  if(action==='toy'&&chooseSlot(creature,toySlots))return;
  if(action==='play'&&inviteForPlay(creature))return;
  if(action==='wander'){
   const position=positionOf(creature);
   const radius=2+creature.mood.safety*5+creature.mood.arousal*2;
   for(let search=0;search<12;search++){
    const angle=Math.random()*Math.PI*2,distance=radius*(.3+Math.random()*.7);
    const goal={x:position.x+Math.cos(angle)*distance,z:position.z+Math.sin(angle)*distance};
    if(freePoint(goal)&&chooseGoal(creature,goal,'wander')){creature.until=time+8+creature.mood.arousal*12;return;}
   }
  }
  if(action==='idle')break;
 }
 finish(creature);creature.until=time+2+(1-creature.mood.arousal)*4;
}
function arrive(creature){
 if(provisions?.arrive(creature))return;
 if(society?.arrive(creature))return;
 if(creature.action==='play'||creature.action==='date')return;
 if(creature.action==='go-play'){creature.nextPursuit=0;return;}
 if(creature.action==='go-toy'||creature.action==='toy-cross'){
  if(creature.action==='go-toy')creature.toyPasses=2;else creature.toyPasses--;
  if(creature.toyPasses<=0){creature.action='toy-rest';creature.until=time+3;return;}
  const target=creature.toyPasses===2?creature.slot.exit:creature.slot.entry;
  if(!clearLine(positionOf(creature),target)){finish(creature);return;}
  creature.action='toy-cross';creature.path=[target];creature.goal=target;
  announce(creature.name+'钻过拱门，又转身跑回来。');return;
 }
 if(creature.action.startsWith('go-')){
  creature.action=creature.action.slice(3);creature.until=time+7;
  if(creature.action==='sun'){creature.until=time+12+(1-creature.mood.safety)*8;announce(creature.name+'在阳光中心旁停下来，慢慢放松。');}
  if(creature.action==='sleep'&&climate.isNight){creature.nightSleep={bedId:creature.slot.id};MATTER.Body.setStatic(creature.body,true);}
  if(creature.action==='sleep')announce(creature.name+'钻进窝里，慢慢闭上眼睛。');
  if(creature.action==='charge'){creature.chargeStarted=time;creature.slot.occupant=creature;announce(creature.name+'轻轻贴住供能口，眯起了眼睛。');}
  if(creature.action==='eat')announce(creature.name+'找到了一点可以吃的能量。');
  if(creature.action==='work')announce(creature.name+'走上工作垫，准备照料食物。');
 }else{creature.action='idle';creature.until=time+2+Math.random()*3;}
}
function finish(creature){if(creature.nightSleep)return;provisions?.cancel(creature);medical?.cancel(creature);society?.cancel(creature);endPlayLink(creature);release(creature);creature.action='idle';creature.path=[];creature.until=time+1;creature.decision=time+1;}
function updatePlaySession(){
 for(const first of creatures){
 const second=first.playPartner;
 if(!second||second.playPartner!==first||first.index>second.index)continue;
 const firstPosition=positionOf(first),secondPosition=positionOf(second);
 const distance=Math.hypot(firstPosition.x-secondPosition.x,firstPosition.z-secondPosition.z);
 const inReach=distance<2.4&&clearLine(firstPosition,secondPosition);
 if(first.playSession&&first.playSession===second.playSession){
  const session=first.playSession;
  if(!inReach||time>=session.end){finish(first);continue;}
  if(session.kind==='date'){
   if([first,second].some(member=>member.energy<.3||member.fatigue>.8)){finish(first);continue;}
   if(distance>1.14){
    const center={x:(firstPosition.x+secondPosition.x)/2,z:(firstPosition.z+secondPosition.z)/2};
    for(const member of [first,second]){
     const position=positionOf(member),length=Math.max(.01,distance/2);
     const target={x:center.x+(position.x-center.x)/length*.54,z:center.z+(position.z-center.z)/length*.54};
     if(freePoint(target)&&clearLine(position,target)){member.path=[target];member.goal=target;}
    }
   }else{first.path=[];second.path=[];}
  }
  if(session.variant==='chase'){
   if(!roomForChase(session.center,first,second)){
    session.variant='dance';session.start=time;playHistory.set(session.pairKey,'dance');
    for(const member of [first,second]){member.path=[];member.playStyle='dance';}
    announce(first.name+'和'+second.name+'停下追逐，面对面摇摆起来。');
   }else{
    for(const member of [first,second]){
     const angle=session.angle+(time-session.start+.3)*.85+member.playRole*Math.PI;
     const target={x:session.center.x+Math.sin(angle)*.9,z:session.center.z+Math.cos(angle)*.9};
     if(clearLine(positionOf(member),target)){member.path=[target];member.goal=target;}
     else {member.path=[];}
    }
   }
  }
  continue;
 }
 if(first.action==='go-play'&&second.action==='go-play'&&distance<1.75&&inReach){const kind=first.socialIntent==='date'&&second.socialIntent==='date'?'date':'play';beginSocial(first,second,kind);continue;}
 if(time>=first.until||time>=second.until)finish(first);
 }
}
function collapse(creature){
 if(creature.nightSleep)return;
 const health=healthOf(creature),cause=comaCause(creature.energy,creature.fatigue);if(health.state!=='awake'||!cause)return;
 finish(creature);health.state='coma';health.cause=cause;health.nightSeconds=0;health.fellAt=time;creature.action='coma';creature.path=[];
 MATTER.Body.setVelocity(creature.body,{x:0,y:0});MATTER.Body.setStatic(creature.body,true);creature.body.collisionFilter.mask=0;creature.body.force.x=0;creature.body.force.y=0;
 creature.brain.lastThought='已经昏迷，正在等待救援';announce(creature.name+'耗尽了'+(cause==='energy'?'能量':cause==='rest'?'精力':'能量和精力')+'，瘫倒在地上。');
}
function updateCreature(creature){
 const health=healthOf(creature);
 if(health.state!=='awake'){
  if(health.state==='coma'){medical?.rest(creature,STEP);if(advanceComa(health,STEP,climate.isNight,deathAllowed)){health.state='dead';health.diedAt=time;medical?.releasePatient(creature);creature.action='dead';creature.brain.lastThought='生命已经结束';announce(creature.name+'在昏迷中累计经历了18小时黑夜，离开了这个世界。');}}
  creature.path=[];creature.body.force.x=0;creature.body.force.y=0;return;
 }
 if(creature.action==='sleep'&&climate.isNight&&!creature.nightSleep){creature.nightSleep={bedId:creature.slot?.id};MATTER.Body.setStatic(creature.body,true);}
 if(creature.nightSleep){
  if(climate.isNight){creature.path=[];MATTER.Body.setVelocity(creature.body,{x:0,y:0});creature.body.force.x=0;creature.body.force.y=0;creature.sleep+=(1-creature.sleep)*.06;creature.sunRate=0;return;}
  wakeFromNight(creature);MATTER.Body.setStatic(creature.body,false);creature.restedUntil=time+120;finish(creature);creature.until=time+1;announce(creature.name+'睡了一个好觉，精神满满地醒来了。');return;
 }
 digest(creature,STEP);
 if(climate.isNight&&!['go-sleep','sleep'].includes(creature.action)&&!medical?.owns(creature)&&!provisions?.eating(creature)&&time>creature.nextBedSearch){creature.nextBedSearch=time+5;seekNightBed(creature);}
 const position=positionOf(creature),travelling=creature.path.length>0;
 const working=logistics.owns(creature)||medical?.owns(creature)||provisions?.working(creature)||creature.action==='work'||creature.action==='society'&&['process','prepare','repair','experiment','cook'].includes(creature.socialJob?.mode);
 const learnedEfficiency=Math.min(.08,(creature.brain?.beliefs.energy?.count||0)*.015);
 const danger=dangerAt(position),active=travelling||working||['play','chat','date','toy-cross'].includes(creature.action);
 const consumptionRate=(travelling||working?ENERGY_RATES.moveDrain:ENERGY_RATES.restDrain)*(1-learnedEfficiency)*(active?1+danger:1)*nourishment(creature).energy;
 creature.sunRate=sunAt(position);
 const passiveChange=STEP*(creature.sunRate-consumptionRate);
 creature.energy=THREE.MathUtils.clamp(creature.energy+passiveChange,0,1);
 const companion=creature.playPartner;
 const company=creatures.some(other=>{if(other===creature||healthOf(other).state!=='awake')return false;const nearby=positionOf(other);return Math.hypot(nearby.x-position.x,nearby.z-position.z)<2.4&&clearLine(position,nearby);});
 const playingTogether=Boolean(companion&&creature.action==='play'&&companion.action==='play'&&creature.playSession!==null&&creature.playSession===companion.playSession);
 const chatting=Boolean(companion&&creature.action==='chat'&&creature.playSession===companion.playSession);
 const dating=Boolean(companion&&creature.action==='date'&&creature.playSession===companion.playSession);
 const resting=['sleep','idle','sun','recover','chat','date'].includes(creature.action);
 const nourished=creature.chargingReady||(creature.action==='eat'&&creature.slot?.foodSite.state.bowl>0);
 creature.stress*=Math.exp(-STEP/8);
 const sunComfort=comfortAt(position);
 const moodContext={energy:creature.energy,fatigue:creature.fatigue,resting,nourished,company,playing:playingTogether,fun:creature.action==='toy-cross',exploring:creature.action==='wander',stress:creature.stress,sunComfort};
 evolveMood(creature.mood,moodContext,STEP);
 if(dating){creature.mood.pleasure=Math.min(1,creature.mood.pleasure+STEP*.018);creature.mood.safety=Math.min(1,creature.mood.safety+STEP*.008);creature.mood.connection=Math.min(1,creature.mood.connection+STEP*.018);}
 const playTarget=playingTogether?1:0;
 creature.playBlend+=(playTarget-creature.playBlend)*STEP*5;
 if(playingTogether||chatting){
  creature.playElapsed=time-creature.playSession.start;
 }
 const facesPartner=dating||chatting||playingTogether&&creature.playStyle!=='chase';
 if(facesPartner){
  const companionPosition=positionOf(companion);
  const faceX=(companionPosition.x-position.x)*.85;
  const faceZ=(companionPosition.z-position.z)*.85+.3;
  const faceAngle=Math.atan2(faceX,faceZ);
  const turnDifference=Math.atan2(Math.sin(faceAngle-creature.turn),Math.cos(faceAngle-creature.turn));
  creature.turn+=turnDifference*.1;
 }
 const fatigueRate=(travelling||working)?.006:['sun','recover'].includes(creature.action)?-.012:creature.action==='idle'?-.004:.003;
 const companyRecovery=companionshipRecovery(company);
 creature.fatigue=THREE.MathUtils.clamp(creature.fatigue+STEP*(fatigueRate*(fatigueRate>0?nourishment(creature).fatigue:1)*(active?1+danger:1)*(fatigueRate>0&&time<(creature.restedUntil||0)?.8:1)-companyRecovery+(climate.fullNight&&nearMonolith(position)?WINTER.monolithFatigue*nourishment(creature).fatigue:0)),0,1);
 society?.stepCreature(creature);
 if(logistics.owns(creature)||medical?.towing(creature)){
  creature.sleep*=.94;creature.chargePose*=.95;creature.chargeGlow*=.99;
  if(time>creature.nextBlink){creature.blinkUntil=time+.15;creature.nextBlink=time+3;}
  return;
 }
 if(creature.action==='recover'&&!climate.isNight&&(creature.energy>=.6&&creature.fatigue<.45||satietyOf(creature)<NUTRITION.hungry&&availableBowls().length))finish(creature);
 if(creature.action==='sleep'){creature.fatigue=Math.max(0,creature.fatigue-STEP*.058);creature.mood.safety=Math.min(1,creature.mood.safety+STEP*.015);if(creature.energy<.28+.05*dangerAt(position)||creature.fatigue===0&&!climate.isNight){if(creature.fatigue===0)creature.restedUntil=time+48;finish(creature);}}
 const atPort=Boolean(creature.slot&&creature.slot.kind==='charge'&&!travelling);
 const closeToPort=atPort&&Math.hypot(position.x-creature.slot.point.x,position.z-creature.slot.point.z)<.28;
 if(atPort&&!closeToPort){
  const slot=creature.slot;
  if(!chooseGoal(creature,slot.point,'go-charge',slot))finish(creature);
 }
 const restingAtPort=creature.action==='charge-rest';
 creature.chargingReady=Boolean(closeToPort&&creature.action==='charge'&&time-creature.chargeStarted>.9);
 if(creature.chargingReady){
  creature.energy=Math.min(1,creature.energy+STEP*ENERGY_RATES.monolithRestore*(climate.fullNight?4:1));
  if(creature.energy>.93){creature.action='charge-rest';creature.until=time+.8+(1-creature.mood.safety)*1.6+(1-creature.mood.arousal)*.8;creature.chargingReady=false;announce(creature.name+'充好了，还依依不舍地靠了一小会儿。');}
 }
 if(restingAtPort&&time>=creature.until)finish(creature);
 const leaning=Boolean(closeToPort&&(creature.action==='charge'||creature.action==='charge-rest'));
 const poseTarget=leaning?1:0;
 creature.chargePose+=(poseTarget-creature.chargePose)*STEP*3;
 const glowTarget=creature.chargingReady?1:0;
 const glowSpeed=creature.chargingReady?2.5:.6;
 creature.chargeGlow+=(glowTarget-creature.chargeGlow)*STEP*glowSpeed;
 if(leaning){
  creature.chargeNormal.copy(creature.slot.normal);
  const view=camera.getWorldDirection(new THREE.Vector3()).negate();view.y=0;view.normalize();
  const tangent=new THREE.Vector3(creature.slot.normal.z,0,-creature.slot.normal.x);
  if(tangent.dot(view)<0)tangent.negate();
  const faceDirection=view.multiplyScalar(.85).addScaledVector(tangent,.55).normalize();
  const targetTurn=Math.atan2(faceDirection.x,faceDirection.z);
  const difference=Math.atan2(Math.sin(targetTurn-creature.turn),Math.cos(targetTurn-creature.turn));
  creature.turn+=difference*.08;
 }
 if(creature.action==='eat'){const state=creature.slot.foodSite.state;const consumed=Math.min(state.bowl,STEP*.42);state.bowl-=consumed;feed(creature,'raw',consumed);creature.energy=Math.min(1,creature.energy+consumed*.24);enjoyFood(creature.mood,consumed);if(creature.energy>.93&&satietyOf(creature)>=NUTRITION.full||state.bowl<.01)finish(creature);}
 if(creature.action==='play'&&time>creature.until)finish(creature);
 if(['sun','toy-rest','chat','date'].includes(creature.action)&&time>creature.until)finish(creature);
 if(creature.action==='wander'&&time>creature.until)finish(creature);
 const mealInProgress=provisions?.eating(creature)||creature.socialJob?.mode==='meal'&&['society','go-society'].includes(creature.action);
 const instinct=currentInstinct(creature),safeRoutine=['work','go-work','load','deliver','unload','return-cart','go-cart'];
 const urgent=(instinct==='recover'||instinct==='shelter'||instinct==='food'&&!safeRoutine.includes(creature.action)&&!provisions?.working(creature))&&!medical?.owns(creature)&&!mealInProgress&&!['charge','eat','go-charge','go-eat','sleep','go-sleep','recover','go-recover'].includes(creature.action);
 if(urgent&&time>creature.decision){finish(creature);creature.decision=time+2;decide(creature);}
 const exhausted=creature.fatigue>.92&&['idle','wander','play','go-play','chat','date','sun','toy-cross','toy-rest','go-toy','go-sun','society','go-society','discover','go-discover'].includes(creature.action);
 if(exhausted&&time>creature.decision){finish(creature);decide(creature);}
 if(creature.action==='idle'&&time>=creature.until&&time>=creature.decision){creature.decision=time+1;decide(creature);}
 // Follow the living partner, not a fixed rendezvous marker. Meeting is proximity-based.
 if(creature.action==='go-play'&&time>=creature.nextPursuit){
  const partner=creature.playPartner;
  const route=partner?pursuitPath(creature,partner):null;
  if(!route)finish(creature);
  else {creature.path=route;if(route.length)creature.goal=route[route.length-1];creature.nextPursuit=time+.6;}
 }
 const canLeap=['idle','wander','sun','toy-rest'].includes(creature.action)||creature.action==='play'&&creature.playStyle==='imitate';
 if(canLeap&&creature.mood.pleasure>.4&&creature.fatigue<.7&&time>=creature.nextJoy){creature.joyStart=time;creature.nextJoy=time+9+Math.random()*7;}
 let desiredX=0,desiredZ=0;
 if(creature.path.length){
  let waypoint=creature.path[0],dx=waypoint.x-position.x,dz=waypoint.z-position.z,distance=Math.hypot(dx,dz);
  if(distance<.10&&(creature.path.length===1||clearLine(position,creature.path[1]))){creature.path.shift();const goalDistance=Math.hypot(creature.goal.x-position.x,creature.goal.z-position.z);if(goalDistance<(creature.navBestGoalDistance??Infinity)-.2){creature.navFailures=0;creature.navBestGoalDistance=goalDistance;}if(!creature.path.length)arrive(creature);}
  else{
   const moodSpeed=.65+creature.mood.arousal*.45+creature.mood.safety*.15;
   const socialRun=creature.action==='go-play'?1.25:1;
   const baseSpeed=creature.speed*moodSpeed*socialRun;
   const final=creature.path.length===1;let speed=Math.min(baseSpeed,distance*(final?2:4));
   for(const partner of creatures){
    if(partner===creature||healthOf(partner).state==='dead'||healthOf(partner).carried)continue;
    const other=positionOf(partner),separation=Math.hypot(other.x-position.x,other.z-position.z);
    const forward=(other.x-position.x)*dx+(other.z-position.z)*dz;
    const yields=creature.index>partner.index||partner.path.length===0;
    if(separation<1.25&&forward>0&&yields){speed*=.12;break;}
   }
   desiredX=dx/distance*speed;desiredZ=dz/distance*speed;
   const targetTurn=Math.atan2(dx,dz),difference=Math.atan2(Math.sin(targetTurn-creature.turn),Math.cos(targetTurn-creature.turn));creature.turn+=difference*.09;
  }
 }
 const gain=creature.body.mass*.0007;
 MATTER.Body.applyForce(creature.body,creature.body.position,{x:(desiredX*SCALE/60-creature.body.velocity.x)*gain,y:(desiredZ*SCALE/60-creature.body.velocity.y)*gain});
 if(trackProgress(creature,position,time)){
  creature.navFailures=(creature.navFailures||0)+1;const destination=creature.goal;
  let detour=null;for(const direction of [1,-1]){const angle=creature.turn+direction*Math.PI/2,candidate={x:position.x+Math.sin(angle)*.7,z:position.z+Math.cos(angle)*.7};if(freePoint(candidate)&&navigation.line(position,candidate,true)){const remaining=findPath(candidate,destination);if(remaining){detour=[candidate,...remaining];break;}}}
  let route=detour||findPath(position,destination);
  if(route&&Math.hypot(route.at(-1).x-destination.x,route.at(-1).z-destination.z)>.15)route=null;
  if(!route||creature.navFailures>=3){finish(creature);creature.decision=time+3;creature.until=time+3;creature.brain.lastThought='这条路被挡住了，先停下来重新安排';MATTER.Body.setVelocity(creature.body,{x:0,y:0});}
  else{creature.path=route;creature.navWatch=null;}
 }
 creature.lastPoint=position;
 const sleeping=creature.action==='sleep'?1:0;creature.sleep+=(sleeping-creature.sleep)*.06;creature.impact*=.86;
 if(time>creature.nextBlink){creature.blinkUntil=time+.15;creature.nextBlink=time+2.5+Math.random()*3;}
}
MATTER.Events.on(engine,'collisionStart',event=>{for(const pair of event.pairs){
 const first=creatures.find(creature=>creature.body===pair.bodyA),second=creatures.find(creature=>creature.body===pair.bodyB);
 if(first&&second){
  const available=[first,second].every(creature=>!creature.playPartner&&['idle','wander','sun','toy-rest'].includes(creature.action)&&creature.energy>.3&&creature.fatigue<.8&&time>=creature.nextChat);
  if(available){
   first.nextChat=time+12;second.nextChat=time+12;
   if(Math.random()<.3)beginSocial(first,second,'chat');
  }
 }
 for(const creature of creatures)if(pair.bodyA===creature.body||pair.bodyB===creature.body){
  creature.impact=.45;
  const moving=MATTER.Body.getSpeed(creature.body)>.45;
  if(!(first&&second)&&moving&&time-creature.lastStartle>3){creature.stress=Math.min(1,creature.stress+.4);creature.lastStartle=time;}
 }
}});
function physicsStep(){
 time+=STEP;climate=worldClimate(time-winterStart);medical?.step(STEP);provisions?.step(STEP);
 society?.step();updatePlaySession();romance?.step(STEP);
 for(const creature of creatures){creature.previous=positionOf(creature);updateCreature(creature);recordLife(creature,STEP,time);}
 logistics.step(time);logistics.sync();for(const creature of creatures)collapse(creature);
 MATTER.Engine.update(engine,STEP*1000);
 for(const effects of chargeSystems)effects.step(time,STEP);
 for(const creature of creatures){if(creature.health?.carried||creature.health?.clinic)continue;const position=positionOf(creature);const target=floorHeight(position.x,position.z);creature.lift+=(target-creature.lift)*.3;}
 uiTimer+=STEP;if(uiTimer>.35){updateUI();uiTimer=0;}
}
const labels={'go-recover':'去阳光下补能休息',recover:'在安全的阳光下恢复','go-provision':'去搬食材、做饭或取餐',provision:'做饭、用餐或分享食物',coma:'昏迷，等待救援',dead:'已经离世','go-medical':'前往救援地点',medical:'准备药包或救治同伴','medical-tow':'牵引救援小车',idle:'发一会儿呆',wander:'到处逛逛','go-charge':'去巨碑补充能量',charge:'贴着供能口充电','charge-rest':'充好了，再靠一小会儿','go-eat':'去食盆找吃的',eat:'正在吃东西','go-sleep':'去找睡垫',sleep:'挨着睡垫打盹','go-play':'朝同伴跑去',play:'和同伴待一会儿',chat:'碰面后聊几句',date:'和喜欢的小球靠在一起','go-sun':'去阳光中心旁放松',sun:'晒着阳光，安心歇一会儿','go-toy':'去拱门玩耍','toy-cross':'钻过拱门，再跑回来','toy-rest':'玩够了，开心歇一会儿','go-work':'去工坊照料作物',work:'在工作垫上照料、收获','go-cart':'去接手小推车',cart:'准备推动小车',load:'把食物装进小车',deliver:'推着食物去食盆',unload:'给食盆补充食物','return-cart':'把小推车送回工坊'};
function updateUI(){
 const hour=Math.floor(climate.hour),minute=Math.floor((climate.hour-hour)*60);
 document.getElementById('day-clock').textContent='第 '+climate.day+' 天 · '+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')+' · '+climate.phase;
 document.getElementById('winter-status').textContent='白天 '+climate.daylight.toFixed(1)+' 小时 · 黑夜 '+climate.nightHours.toFixed(1)+' 小时 · 当前危险 '+climate.danger.toFixed(2);
 document.getElementById('medical-status').textContent=medical?.summary()||'尚无医疗站';
 document.getElementById('food-status').textContent=(logistics?.summary()||'正在准备食物')+' · '+(provisions?.status()||'尚无餐厅');
 const awakeCount=creatures.filter(creature=>healthOf(creature).state==='awake').length,comaCount=creatures.filter(creature=>healthOf(creature).state==='coma').length,deadCount=creatures.length-awakeCount-comaCount;
 document.getElementById('resident-count').textContent=String(creatures.length);
 document.getElementById('resident-health').textContent=awakeCount+' 只正在生活 · '+comaCount+' 只昏迷 · '+deadCount+' 只已经离世';
 for(const creature of creatures){
 const playActivity='和同伴'+PLAY_NAMES[creature.playStyle];
 const socialActivity={society:'在设施里活动','go-society':'去完成接下来要做的事',discover:'靠近后试探一下','go-discover':'去看看陌生的地方',guide:'陪新伙伴认识这里','go-guide':'带新伙伴往前走'};
 const activity=provisions?.activity(creature)||(creature.action==='play'?playActivity:socialActivity[creature.action]||labels[creature.action]);
 const dateActivity=creature.playSession?.dateStyle==='duet'?'同步摇摆':'轻轻贴贴';
 const health=healthOf(creature),healthLine=health.state==='coma'?'昏迷 · 夜间累计 '+(health.nightSeconds/WINTER.secondsPerHour).toFixed(1)+'/18h'+(health.clinic?' · 在医疗站静养':' · 等待救援'):health.state==='dead'?'已经离世':null;
 creature.card.dataset.health=health.state;
 creature.card.querySelector('.satiety').value=satietyOf(creature)*100;creature.card.querySelector('.satiety-value').textContent=Math.round(satietyOf(creature)*100)+'%';
 creature.card.querySelector('.energy-value').textContent=Math.round(creature.energy*100)+'%';creature.card.querySelector('.rest-value').textContent=Math.round((1-creature.fatigue)*100)+'%';
 creature.card.querySelector('.activity').textContent=healthLine|| (creature.action==='date'?'和'+creature.playPartner.name+dateActivity:creature.action==='go-play'&&creature.socialIntent==='date'?'朝喜欢的小球跑去':activity);
 creature.card.querySelector('.relationship').textContent=romance?romance.summary(creature):'关系：还在慢慢认识彼此';
 let inventoryLine=creature.card.querySelector('.inventory');if(!inventoryLine){inventoryLine=document.createElement('p');inventoryLine.className='inventory';creature.card.appendChild(inventoryLine);}inventoryLine.textContent='饱腹 '+Math.round(satietyOf(creature)*100)+'% · '+(provisions?.summary(creature)||'随身：空')+' · 舒适 '+Math.round((creature.mood.comfort??.5)*100)+'%'+(time<(creature.restedUntil||0)?' · 精力充沛':'');
 creature.card.querySelector('.mood').textContent=moodDescription(creature.mood);creature.card.querySelector('.thought').textContent=(society?society.summary(creature):'')+(health.state==='awake'&&health.noticedComa!==null&&health.noticedComa!==undefined?' · 感知到'+(creatures[health.noticedComa]?.name||'同伴')+'正昏迷':'');creature.card.querySelector('.energy').value=creature.energy*100;creature.card.querySelector('.rest').value=(1-creature.fatigue)*100;const sunPercent=(creature.sunRate*100).toFixed(2);const sunMessage=creature.sunRate>0?'阳光补给 +'+sunPercent+' 个百分点/秒（消耗另计）':'暂时没有阳光补给';creature.card.querySelector('.sun-benefit').textContent=health.state==='awake'?sunMessage+' · 本地危险 '+dangerAt(positionOf(creature)).toFixed(1):health.state==='coma'?(health.clinic?'床位静养中，基础耗能已停止':'昏迷中，基础耗能已停止'):'';
 }if(time>noticeUntil)eventText.textContent=logistics.summary();if(society)document.getElementById('society-status').textContent='最近的商量：'+society.community.lastDecision;}
function drawCreature(creature,alpha){
 for(let index=0;index<creature.carriedFood.length;index++)creature.carriedFood[index].visible=index<(creature.carry?.food||0)&&!provisions?.owns(creature);creature.carriedPart.visible=(creature.carry?.part||0)>0;
 const position=positionOf(creature),x=THREE.MathUtils.lerp(creature.previous.x,position.x,alpha),z=THREE.MathUtils.lerp(creature.previous.z,position.z,alpha);creature.root.position.set(x,creature.lift,z);creature.heading.rotation.y=creature.turn;
 const pushedSpeed=Math.hypot(position.x-creature.previous.x,position.z-creature.previous.z)/STEP;
 const speed=logistics.owns(creature)?Math.min(1,pushedSpeed):Math.min(1,MATTER.Body.getSpeed(creature.body)/2),motion=reduced.matches ? .15 : 1;
 const rhythm=6+creature.mood.arousal*5;
 const phase=time*rhythm+creature.phase,gait=Math.sin(phase)*speed*motion,breath=Math.sin(time*2+creature.phase)*.025;
 const playfulness=.35+creature.mood.arousal*.4+Math.max(0,creature.mood.pleasure)*.25;
 const playTime=creature.playElapsed;
 const dance=creature.playStyle==='dance',chase=creature.playStyle==='chase';
 const turnPhase=dance?playTime%4:(playTime+3.2-creature.playRole*1.6)%3.2;
 const jumpPhase=THREE.MathUtils.clamp((turnPhase-.22)/.7,0,1);
 const jump=Math.sin(jumpPhase*Math.PI);
 const crouch=turnPhase<.22?Math.sin(turnPhase/.22*Math.PI):0;
 const landing=turnPhase>.92&&turnPhase<1.16?Math.sin((turnPhase-.92)/.24*Math.PI):0;
 const playMotion=creature.playBlend*motion;
 const danceJumpPhase=THREE.MathUtils.clamp((turnPhase-2.8)/.8,0,1);
 const danceJump=Math.sin(danceJumpPhase*Math.PI);
 const playHeight=chase?0:dance?danceJump*.48:jump*.32;
 const playing=playHeight*playfulness*playMotion;
 const playSquash=chase?0:dance?danceJump*.08*playMotion:(jump*.09-crouch*.16-landing*.14)*playMotion;
 const joyTime=time-creature.joyStart;
 const joyPhase=THREE.MathUtils.clamp((joyTime-.15)/.8,0,1);
 const joyJump=Math.sin(joyPhase*Math.PI)*.78*motion;
 const joyCrouch=joyTime>=0&&joyTime<.15?Math.sin(joyTime/.15*Math.PI)*.15*motion:0;
 const joyLanding=joyTime>.95&&joyTime<1.15?Math.sin((joyTime-.95)/.2*Math.PI)*.15*motion:0;
 const socialWorking=provisions?.working(creature)||creature.action==='society'&&['process','prepare','repair','experiment','cook'].includes(creature.socialJob?.mode);
 const workPulse=creature.action==='work'||socialWorking?Math.sin(time*4)*.07*motion:0;
 const height=.94+breath+gait*.08-creature.sleep*.2-creature.impact*.12-creature.chargePose*.055+playSquash+workPulse-joyCrouch-joyLanding+joyJump*.1,wide=1/Math.sqrt(height);
 const depth=wide;creature.pose.scale.set(wide,height,depth);
 // The face turns toward the viewer, while the lean remains toward the port.
 const lean=creature.chargeNormal.clone().multiplyScalar(-creature.chargePose*.16);
 lean.applyAxisAngle(THREE.Object3D.DEFAULT_UP,-creature.turn);
 creature.pose.position.x=lean.x;creature.pose.position.z=lean.z;
 creature.pose.rotation.x=-creature.chargePose*.18;
 const swayAmplitude=dance?.26:chase?.035:.12;
 const swayPhase=dance?creature.playRole*Math.PI:0;
 const playSway=Math.sin(playTime*Math.PI*1.25+swayPhase)*swayAmplitude*playMotion;
 const chatting=creature.action==='chat'&&creature.playSession;
 const speaking=Boolean(chatting&&Math.floor((time-creature.playSession.start)/.9)%2===creature.playRole);
 const socialSpeaking=time<(creature.speakingUntil||0);
 const chatNod=chatting||socialSpeaking?Math.sin(time*7+creature.playRole)*.04*motion:0;
 creature.pose.rotation.x+=chatNod;
 creature.bubble.visible=speaking||time<(creature.speakingUntil||0);
 creature.pose.rotation.z=Math.sin(time*1.6+creature.phase)*creature.chargePose*.025*motion+playSway;
 const emission=creature.chargeGlow*(.16+Math.sin(time*2)*.025*motion);
 creature.bodyMesh.material.emissive.copy(creature.bodyMesh.material.color);creature.bodyMesh.material.emissiveIntensity=emission;
 const gathering=creature.socialJob?.mode==='plaza'&&creature.socialJob.company?Math.max(0,Math.sin(time*3))*.12*motion:0;
 const hop=Math.max(0,gait)*.06+Math.max(playing,joyJump,gathering);creature.pose.position.y=.48*height+hop;
 const alertness=.7+creature.mood.arousal*.3;
 const happyEyes=1-creature.playBlend*.35;
 const blink=time<creature.blinkUntil,openness=blink ? .08 : (1-creature.sleep*.92)*(1-creature.chargePose*.82)*alertness*happyEyes;for(const eye of creature.eyes)eye.scale.y=.075*openness;
 const chatter=speaking||socialSpeaking?Math.sin(time*13)*.2:0;
 creature.mouth.scale.y=.25+creature.mood.pleasure*.75+creature.playBlend*.25+chatter;
 const health=healthOf(creature),down=health.state!=='awake',fall=down?THREE.MathUtils.clamp((time-(health.fellAt||0))/.8,0,1):0;
 for(const material of [creature.bodyMesh.material,creature.bodyOutline.material]){if(material.transparent!==down){material.transparent=down;material.needsUpdate=true;}material.opacity=down?1-fall*(health.state==='dead'?.82:.58):1;material.depthWrite=!down;}
 creature.bodyMesh.material.color.copy(creature.baseColor).multiplyScalar(1-fall*.6);
 const departed=health.state==='dead'&&time-(health.diedAt||0)>6;creature.root.visible=!departed;creature.shadow.visible=!departed;
 if(down){creature.pose.scale.set(1+fall*.35,1-fall*.76,1+fall*.2);creature.pose.position.set(0,.48-fall*.35,0);creature.pose.rotation.set(0,0,-.04);creature.bodyMesh.material.emissiveIntensity=0;creature.bubble.visible=false;creature.mouth.visible=false;for(const eye of creature.eyes)eye.visible=false;}else{creature.mouth.visible=true;for(const eye of creature.eyes)eye.visible=true;}
 creature.shadow.position.set(x,creature.lift+.012,z);creature.shadow.scale.setScalar(down?1.2:1-hop*.4);
}
function resize(){const width=stage.clientWidth,height=stage.clientHeight,aspect=width/height;
 const verticalPadding=WORLD_DEPTH*.318,horizontalPadding=WORLD_WIDTH/2;
 const vertical=Math.max(verticalPadding,horizontalPadding/aspect);camera.left=-vertical*aspect;camera.right=vertical*aspect;camera.top=vertical;camera.bottom=-vertical;camera.updateProjectionMatrix();renderer.setSize(width,height);}
new ResizeObserver(resize).observe(stage);resize();
const initialAnchors={monolith:outlets,sunlight:sunSpots,nest:beds,bowl:bowls,arch:toySlots,workshop:[workSlot]};
for(const definition of BUILDINGS){if(!layouts[definition.key])continue;const model=models[definition.key];buildings.push({id:'initial-'+definition.key,key:definition.key,root:model,model,anchors:[...initialAnchors[definition.key]],box:footprint(model)});}
function spawnResident(point){
 const index=creatures.length,names=['糯糯','栗栗','泡泡','绵绵'],colors=[0xe5c9ec,0xe8c99e,0xc7ddea,0xd9e0ae];
 const creature=makeCreature(names[index-4]||'新伙伴',colors[index-4]||0xe4d8bd,point.x,point.z,.72,.3,index);creatures.push(creature);society.attach(creature);creature.until=time+3;
 document.getElementById('residents').textContent=creatures.map(resident=>resident.name).join('、')+'，一起生活在这里。';return creature;
}
society=createSociety({creatures,positionOf,clearLine,findPath,nearestFree,chooseGoal,finish,arrive,announce,reservations,step:STEP,danger:creature=>dangerAt(positionOf(creature)),time:()=>time,carts:()=>foodControllers,motion:()=>reduced.matches?.15:1,isDelivering:creature=>logistics.owns(creature),bedCount:()=>beds.length,foodTotal:()=>foodSites.reduce((sum,site)=>sum+site.state.bowl,0),spawn:spawnResident,measureEnergy:distance=>({sun:sunlightRecovery(distance),monolith:ENERGY_RATES.monolithRestore})});
for(const creature of creatures)society.attach(creature);
for(const record of buildings)society.register(record,visibleFeatures(record));
provisions=createProvisions({creatures,foodSites,deliverySites,models,positionOf,chooseGoal,finish,announce,reservations,findPath,clearLine,time:()=>time,danger:creature=>dangerAt(positionOf(creature)),preference:(creature,record)=>society.value(creature,{facility:record,kind:'meal'}),begin:(...args)=>society.begin(...args),known:(creature,id)=>Boolean(creature.brain.known[id]),approach:peer=>{const point=positionOf(peer);for(let angle=0;angle<Math.PI*2;angle+=Math.PI/6){const target={x:point.x+Math.sin(angle)*1.2,z:point.z+Math.cos(angle)*1.2};if(freePoint(target)&&clearLine(target,point))return target;}return null;}});
 for(const record of buildings)provisions.register(record);
 medical=createMedical({travelBudget,workBudget,eating:creature=>Boolean(provisions?.eating(creature)),transporting:creature=>Boolean(logistics.owns(creature)),requestRecovery:creature=>{finish(creature);seekRecovery(creature,true);},creatures,buildings,foodSites,scene,models,sunTemplate:templates.sunlight,MATTER,SCALE,positionOf,chooseGoal,finish,announce,findPath,freePoint,clearLine,floorHeight,sunAt,nearestFree,carriers:()=>foodControllers.map(controller=>controller.carrier()),widePath:(start,end,radius=.88)=>cartPath(start,end,radius),wideClear:(point,radius=.88,own=null)=>cartClear(point,radius)&&foodControllers.every(controller=>{const clearance=controller.clearance();return clearance.cart===own||Math.hypot(point.x-clearance.position.x,point.z-clearance.position.z)>3;}),time:()=>time,senseRadius:Math.hypot(WORLD_WIDTH,WORLD_DEPTH)});
function saveLife(){
 const data={version:1,initialKnowledgeVersion,clockDaySeconds:WINTER.daySeconds,layoutRevision:LAYOUT_REVISION,width:WORLD_WIDTH,depth:WORLD_DEPTH,time,paused,deathAllowed,winterStart,medical:medical.save(),provisions:provisions.save(),
  buildings:buildings.filter(record=>record.id.startsWith('built-')).map(record=>({id:record.id,key:record.key,x:record.model.position.x,z:record.model.position.z})),
  residents:creatures.map(creature=>({name:creature.name,color:creature.color,point:positionOf(creature),energy:creature.energy,fatigue:creature.fatigue,mood:{...creature.mood},health:{...healthOf(creature)},inventory:inventoryOf(creature),satiety:satietyOf(creature),nightSleep:creature.nightSleep?{...creature.nightSleep}:null,restedUntil:creature.restedUntil||0})),
  bowls:buildings.filter(record=>record.key==='bowl').map(record=>({id:record.id,food:record.anchors[0].foodSite.state.bowl})),
  carts:foodControllers.map(controller=>({id:controller.status().facility,...controller.save()})),society:society.save()};
 localStorage.setItem(SAVE_KEY,JSON.stringify(data));savedWorld=data;
 document.getElementById('load-life').disabled=false;document.getElementById('save-status').textContent='已保存这段生活，包括建筑、库存和每只小球的学习结果。';
}
function restoreLife(data){
 // Validate before changing the scene. Active jobs restart; carried resources and completed experience survive.
 const validPoint=point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.z)&&point.x>MIN_X+.6&&point.x<MAX_X-.6&&point.z>MIN_Z+.6&&point.z<MAX_Z-.6;
 if(!Array.isArray(data.residents)||data.residents.length<4||data.residents.length>8||data.residents.some(resident=>!validPoint(resident.point)||!Number.isFinite(resident.energy)||!Number.isFinite(resident.fatigue)||!resident.mood||!['pleasure','arousal','safety','connection'].every(key=>Number.isFinite(resident.mood[key]))))throw new Error('居民存档不完整');
 if(!Array.isArray(data.buildings)||data.buildings.length>64||data.buildings.some(record=>!validPoint(record)||!BUILDINGS.some(definition=>definition.key===record.key)||!/^built-\d+$/.test(record.id))||new Set(data.buildings.map(record=>record.id)).size!==data.buildings.length)throw new Error('建筑存档不完整');
 for(const resident of data.residents)if(resident.inventory&&!validInventory(resident.inventory))throw new Error('物品栏存档无效');
 if(data.provisions!==undefined&&(!Array.isArray(data.provisions)||data.provisions.some(place=>typeof place.id!=='string'||!Number.isFinite(place.raw)||place.raw<0||place.raw>8||!Array.isArray(place.products)||place.products.length>8||place.products.some(item=>!['simple','packed','lunch','snack'].includes(item.type)||item.cook!==null&&(!Number.isInteger(item.cook)||item.cook<0||item.cook>=8)||!['restaurant','kitchen','legacy'].includes(item.origin)))))throw new Error('餐食库存存档无效');
 if(data.medical!==undefined&&!Array.isArray(data.medical))throw new Error('医疗存档不完整');
 for(const item of data.medical||[])if(typeof item.id!=='string'||!validPoint(item.cart)||!Number.isFinite(item.cart.angle)||!['energy','rest'].every(key=>Number.isFinite(item.kits?.[key])&&item.kits[key]>=0&&item.kits[key]<=2))throw new Error('医疗物资或救援车存档无效');
 for(const resident of data.residents)if(resident.health&&(!['awake','coma','dead'].includes(resident.health.state)||!Number.isFinite(resident.health.nightSeconds)||resident.health.nightSeconds<0))throw new Error('生命状态存档不完整');
 if(data.society?.version!==1||data.society.residents?.length!==data.residents.length||!Array.isArray(data.society.facilities)||!Array.isArray(data.bowls)||!Array.isArray(data.carts)||!Number.isFinite(data.time))throw new Error('生活存档版本不匹配');
 for(const resident of data.society.residents)importBrain(resident.brain);
 for(const cart of data.carts)if(cart.hold&&(!Array.isArray(cart.hold.entries)||cart.hold.entries.length>4||cart.hold.entries.some(entry=>typeof entry.id!=='string'||!entry.payload||!Number.isFinite(entry.units)||entry.units<=0)||cart.hold.entries.reduce((sum,entry)=>sum+entry.units,0)>4||new Set(cart.hold.entries.map(entry=>entry.id)).size!==cart.hold.entries.length))throw new Error('载具物品存档无效');
 for(const cart of data.carts)if(!validPoint(cart.position)||!cart.state||!['stock','cargo','work','growth'].every(key=>Number.isFinite(cart.state[key])))throw new Error('物流存档不完整');
 time=Math.max(0,data.time);winterStart=Number.isFinite(data.winterStart)?Math.min(time,data.winterStart):time;climate=worldClimate(time-winterStart);deathAllowed=data.deathAllowed!==false;
 while(creatures.length<data.residents.length)spawnResident(data.residents[creatures.length].point);
 for(const [index,resident] of data.residents.entries()){
  const creature=creatures[index];MATTER.Body.setPosition(creature.body,{x:resident.point.x*SCALE,y:resident.point.z*SCALE});MATTER.Body.setVelocity(creature.body,{x:0,y:0});creature.previous={...resident.point};creature.lastPoint={...resident.point};
  creature.energy=THREE.MathUtils.clamp(resident.energy,0,1);creature.fatigue=THREE.MathUtils.clamp(resident.fatigue,0,1);
  for(const key of ['pleasure','arousal','safety','connection'])creature.mood[key]=THREE.MathUtils.clamp(resident.mood[key],key==='pleasure'?-1:0,1);
  creature.mood.comfort=THREE.MathUtils.clamp(resident.mood.comfort??.5,0,1);creature.restedUntil=Math.max(0,Number(resident.restedUntil)||0);creature.satiety=satietyOf(resident);
  if(resident.health&&['awake','coma','dead'].includes(resident.health.state)){creature.health={...healthOf(creature),...resident.health,nightSeconds:Math.max(0,Number(resident.health.nightSeconds)||0)};}
  creature.until=time+1;creature.decision=time+1;
 }
 for(const item of data.buildings){const draft=createDraft(item.key);draft.id=item.id;positionDraft(draft,item);commitDraft(draft);buildingSerial=Math.max(buildingSerial,Number(item.id.slice(6)));}
 for(const item of data.bowls){const record=buildings.find(building=>building.id===item.id&&building.key==='bowl');if(record&&Number.isFinite(item.food))record.anchors[0].foodSite.state.bowl=THREE.MathUtils.clamp(item.food,0,6);}
 for(const item of data.carts){const controller=foodControllers.find(cart=>cart.status().facility===item.id);if(controller)controller.restore(item);}
 logistics.sync();society.restore(data.society);
 for(const [index,resident] of data.residents.entries())if(resident.inventory)creatures[index].inventory=structuredClone(resident.inventory);
 provisions.restore(data.provisions||[]);medical.restore(data.medical||[]);
 for(const [index,resident] of data.residents.entries())if(resident.nightSleep&&healthOf(creatures[index]).state==='awake'){
  const creature=creatures[index],bed=beds.find(slot=>slot.id===resident.nightSleep.bedId);
  if(bed&&!reservations.has(bed.id)){creature.slot=bed;reservations.set(bed.id,creature);creature.action='sleep';creature.nightSleep={bedId:bed.id};MATTER.Body.setPosition(creature.body,{x:bed.point.x*SCALE,y:bed.point.z*SCALE});creature.previous={...bed.point};creature.lastPoint={...bed.point};MATTER.Body.setStatic(creature.body,true);}
 }
 for(const creature of creatures)if(!creature.health?.clinic)creature.lift=floorHeight(creature.previous.x,creature.previous.z);
 lifeRestored=true;setPaused(Boolean(data.paused));document.getElementById('save-status').textContent='已接着上次保存的生活继续；未完成的行动会重新安排。';
}
// Plan from the user's real model extents, including the factory's cart berth.
function plannedAdditions(records){
 const footprints={};
 for(const definition of BUILDINGS){
  const model=templates[definition.key],box=footprint(model),point=model.position;
  const local={minX:box.minX-point.x,maxX:box.maxX-point.x,minZ:box.minZ-point.z,maxZ:box.maxZ-point.z};
  if(definition.key==='workshop'){local.maxX=Math.max(local.maxX,4.54);local.maxZ=Math.max(local.maxZ,8.12);}
  footprints[definition.key]=local;
 }
 const reserved=buildings.map(record=>{const box={...record.box};if(record.key==='workshop'){box.maxX=Math.max(box.maxX,record.model.position.x+4.54);box.maxZ=Math.max(box.maxZ,record.model.position.z+8.12);}return box;});
 return planBuildings(records,footprints,WORLD_WIDTH,WORLD_DEPTH,reserved);
}
function settleResidents(){
 const placed=creatures.filter(creature=>creature.health?.clinic||creature.nightSleep).map(positionOf);
 for(const creature of creatures){
  if(creature.health?.clinic||creature.nightSleep)continue;
  const original=positionOf(creature),preferred={x:THREE.MathUtils.clamp(original.x,MIN_X+2,MAX_X-2),z:THREE.MathUtils.clamp(original.z,MIN_Z+2,MAX_Z-2)};
  let arrival=null;
  const limit=Math.max(WORLD_WIDTH,WORLD_DEPTH);
  for(let radius=0;radius<limit&&!arrival;radius+=.6)for(let step=0;step<24;step++){
   const angle=step*Math.PI/12,point={x:preferred.x+Math.cos(angle)*radius,z:preferred.z+Math.sin(angle)*radius};
   const insideWorld=point.x>MIN_X+1&&point.x<MAX_X-1&&point.z>MIN_Z+1&&point.z<MAX_Z-1;
   const apart=placed.every(other=>Math.hypot(point.x-other.x,point.z-other.z)>1.2);
   if(insideWorld&&apart&&freePoint(point)){arrival=point;break;}
  }
  if(!arrival)throw new Error('找不到安全的居民位置');
  placed.push(arrival);MATTER.Body.setPosition(creature.body,{x:arrival.x*SCALE,y:arrival.z*SCALE});creature.previous={...arrival};creature.lastPoint={...arrival};creature.lift=floorHeight(arrival.x,arrival.z);
 }
}
if(savedWorld){try{
 const relocating=savedWorld.layoutRevision!==LAYOUT_REVISION;
 if(relocating){
  const planned=plannedAdditions(savedWorld.buildings),migrated=migrateLayout(savedWorld,planned);
  migrated.width=WORLD_WIDTH;migrated.depth=WORLD_DEPTH;
  for(const resident of migrated.residents){resident.point.x=THREE.MathUtils.clamp(resident.point.x,MIN_X+2,MAX_X-2);resident.point.z=THREE.MathUtils.clamp(resident.point.z,MIN_Z+2,MAX_Z-2);}
  // Keep the original save available even after the first save in the expanded world.
  localStorage.setItem(SAVE_KEY+'-before-layout-2',JSON.stringify(savedWorld));
  restoreLife(migrated);savedWorld=migrated;settleResidents();
  document.getElementById('save-status').textContent='已扩大地图并重新安置设施；记忆、生命状态和库存保留，旧布局已备份。保存生活可保留新布局。';
 }else restoreLife(savedWorld);
}catch(error){setPaused(true);document.getElementById('save-status').textContent='读取或布局迁移未完成：'+error.message+'；已暂停，原存档保留。';}}
else{
 for(const item of plannedAdditions(STARTER_BUILDINGS)){const draft=createDraft(item.key);draft.id=item.id;positionDraft(draft,item);commitDraft(draft);buildingSerial=Math.max(buildingSerial,Number(item.id.slice(6)));}
 settleResidents();
}
// Also add the two new companions to older four/five-resident saves, without replacing memories.
function welcomeInitialCompanions(){
 const desiredPopulation=INITIAL_POPULATION;
 while(creatures.length<desiredPopulation){
  const preferred=creatures.length===4?{x:-1,z:3}:{x:3,z:2};
  let arrival=null;
  const searchRadius=Math.max(WORLD_WIDTH,WORLD_DEPTH);
  for(let radius=0;radius<searchRadius&&!arrival;radius+=.8){
   for(let step=0;step<24;step++){
    const angle=step*Math.PI/12,point={x:preferred.x+Math.cos(angle)*radius,z:preferred.z+Math.sin(angle)*radius};
    const inBounds=point.x>MIN_X+1&&point.x<MAX_X-1&&point.z>MIN_Z+1&&point.z<MAX_Z-1;
    const separated=creatures.every(other=>Math.hypot(positionOf(other).x-point.x,positionOf(other).z-point.z)>1.2);
    const awayFromCarts=foodControllers.every(controller=>{const cart=controller.clearance().position;return Math.hypot(cart.x-point.x,cart.z-point.z)>3;});
    if(inBounds&&freePoint(point)&&separated&&awayFromCarts){arrival=point;break;}
   }
  }
  if(!arrival){document.getElementById('save-status').textContent+=' 地面太拥挤，新伙伴暂时无法加入。';break;}
  const creature=spawnResident(arrival);creature.lift=floorHeight(arrival.x,arrival.z);
 }
}
welcomeInitialCompanions();
if((!savedWorld||lifeRestored)&&initialKnowledgeVersion<INITIAL_KNOWLEDGE_VERSION){seedInitialKnowledge(creatures,buildings,positionOf,time);initialKnowledgeVersion=INITIAL_KNOWLEDGE_VERSION;}
romance=createRomance({creatures,positionOf,clearLine,time:()=>time,announce,motion:()=>reduced.matches?.15:1});
function setPaused(value){paused=value;accumulator=0;pauseButton.textContent=paused?'继续观察':'暂停观察';pauseButton.setAttribute('aria-pressed',String(paused));}
const construction=createConstruction({scene,camera,stage,canvas:renderer.domElement,pauseButton,isPaused:()=>paused,setPaused,draft:createDraft,position:positionDraft,inspect:inspectDraft,commit:commitDraft,discard:discardDraft,announce,onPlacement:(active,name)=>hud?.placement(active,name)});
hud=createHud({cancelBuilding:()=>construction.cancel()});
const deathToggle=document.getElementById('allow-death');deathToggle.checked=deathAllowed;deathToggle.addEventListener('change',()=>{deathAllowed=deathToggle.checked;});
const brainInspector=createBrainInspector(creatures);
createAnalysisBridge({creatures,buildings,catalog:BUILDINGS,positionOf,time:()=>time,climate:()=>({...climate,deathAllowed})});
pauseButton.disabled=false;restartButton.disabled=false;sunRangeButton.disabled=false;
sunRangeButton.addEventListener('click',()=>{const visible=!sunFieldOverlay.visible;for(const overlay of sunOverlays)overlay.visible=visible;sunRangeButton.setAttribute('aria-pressed',String(visible));sunRangeButton.textContent=visible?'收起阳光范围':'查看阳光范围';});
pauseButton.addEventListener('click',()=>{paused=!paused;accumulator=0;pauseButton.textContent=paused?'继续观察':'暂停观察';pauseButton.setAttribute('aria-pressed',String(paused));});
restartButton.addEventListener('click',()=>{try{localStorage.removeItem(SAVE_KEY);}catch{}location.reload();});
const saveButton=document.getElementById('save-life'),loadButton=document.getElementById('load-life');saveButton.disabled=false;loadButton.disabled=!savedWorld;
saveButton.addEventListener('click',()=>{try{saveLife();}catch{document.getElementById('save-status').textContent='浏览器未允许保存或空间不足；当前生活仍可继续，请先不要关闭页面。';}});
loadButton.addEventListener('click',()=>location.reload());
document.addEventListener('visibilitychange',()=>{accumulator=0;});
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();paused=true;loading.hidden=false;loading.textContent='画面暂时中断，请重新打开场景。';});
new window.p5(sketch=>{
 sketch.setup=()=>{sketch.noCanvas();loading.hidden=true;updateUI();};
 sketch.draw=()=>{
  if(!paused&&!document.hidden){accumulator+=Math.min(sketch.deltaTime/1000,.1);while(accumulator>=STEP){physicsStep();accumulator-=STEP;}}
  const alpha=paused?1:accumulator/STEP;for(const creature of creatures)drawCreature(creature,alpha);
  for(const site of foodSites)for(let index=0;index<site.foodMeshes.length;index++)site.foodMeshes[index].visible=index<Math.ceil(site.state.bowl);
  const daylight=1-climate.darkness;hemisphere.intensity=.5+daylight;sunlight.intensity=.2+daylight*1.8;
  renderer.setClearColor(new THREE.Color(0x67788f).lerp(new THREE.Color(0xe7ecde),daylight));ground.material.color.setHex(0x889bb0).lerp(new THREE.Color(0xd5dfc6),daylight);
  medical?.draw();romance?.draw();logistics.draw(time);society?.draw(time);provisions?.draw();brainInspector.refresh();
  for(let index=0;index<emitters.length;index++){const material=emitters[index];if(material.userData.chargeControlled)continue;const pulse=material.userData.steadyEmission?1:.9+Math.sin(time*2-index*.3)*.1;material.emissiveIntensity=material.userData.baseEmission*pulse;}
  scene.updateMatrixWorld(true);for(const effects of chargeSystems)effects.draw(time);
  renderer.render(scene,camera);
 };
});
