// Offline geometry/data check only. Does not load a scene, renderer, UI, or physics engine.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {Matrix4,Vector3,Quaternion,PropertyBinding} from './vendor/three.module.js';
import {SOCIAL_ASSETS,MEDICAL_ASSET,CIVIC_ASSETS} from './social-assets.mjs';
import {floodGrid} from './build-rules.mjs';
import {createNavigation} from './navigation.mjs';
const cell=.12,width=100,min=-6;
const gridIndex=(x,z)=>{const column=Math.floor((x-min)/cell),row=Math.floor((z-min)/cell);return column<0||row<0||column>=width||row>=width?-1:row*width+column;};
const pointAt=index=>({x:min+(index%width+.5)*cell,z:min+(Math.floor(index/width)+.5)*cell});
for(const [key,definition] of Object.entries({...SOCIAL_ASSETS,...CIVIC_ASSETS,medical_station:MEDICAL_ASSET})){
 const bytes=fs.readFileSync(fileURLToPath(new URL('../assets/models/'+key+'.glb',import.meta.url)));
 const length=bytes.readUInt32LE(12),data=JSON.parse(bytes.subarray(20,20+length)),binary=28+length;
 const occupied=new Uint8Array(width*width),blocked=new Uint8Array(width*width);
 function accessor(index){const item=data.accessors[index],view=data.bufferViews[item.bufferView],offset=binary+(view.byteOffset||0)+(item.byteOffset||0),components=item.type==='VEC3'?3:1,size=item.componentType===5126||item.componentType===5125?4:2,stride=view.byteStride||components*size;return {count:item.count,read:(element,component=0)=>{const position=offset+element*stride+component*size;return item.componentType===5126?bytes.readFloatLE(position):item.componentType===5125?bytes.readUInt32LE(position):bytes.readUInt16LE(position);}};}
 function triangle(a,b,c){const area=(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);if(Math.abs(area)<1e-6)return;
  const left=Math.max(0,Math.floor((Math.min(a.x,b.x,c.x)-min)/cell)),right=Math.min(width-1,Math.floor((Math.max(a.x,b.x,c.x)-min)/cell));
  const near=Math.max(0,Math.floor((Math.min(a.z,b.z,c.z)-min)/cell)),far=Math.min(width-1,Math.floor((Math.max(a.z,b.z,c.z)-min)/cell));
  for(let row=near;row<=far;row++)for(let column=left;column<=right;column++){const x=min+(column+.5)*cell,z=min+(row+.5)*cell,u=((b.x-x)*(c.z-z)-(b.z-z)*(c.x-x))/area,v=((c.x-x)*(a.z-z)-(c.z-z)*(a.x-x))/area;if(u>=-.0001&&v>=-.0001&&u+v<=1.0001)occupied[row*width+column]=1;}
 }
 function walk(index,parent){const node=data.nodes[index],matrix=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(new Vector3(...(node.translation||[0,0,0])),new Quaternion(...(node.rotation||[0,0,0,1])),new Vector3(...(node.scale||[1,1,1])));matrix.premultiply(parent);
  const name=PropertyBinding.sanitizeNodeName(node.name||'');
  if(node.mesh!==undefined&&!definition.surface.test(name)&&definition.solid.test(name))for(const primitive of data.meshes[node.mesh].primitives){const positions=accessor(primitive.attributes.POSITION),indices=primitive.indices===undefined?null:accessor(primitive.indices),count=indices?indices.count:positions.count;
   for(let offset=0;offset<count;offset+=3){const vertices=[];for(let corner=0;corner<3;corner++){const vertex=indices?indices.read(offset+corner):offset+corner;vertices.push(new Vector3(positions.read(vertex,0),positions.read(vertex,1),positions.read(vertex,2)).applyMatrix4(matrix));}triangle(...vertices);}
  }
  for(const child of node.children||[])walk(child,matrix);
 }
 for(const root of data.scenes[data.scene||0].nodes)walk(root,new Matrix4());
 for(let index=0;index<occupied.length;index++)if(occupied[index]){const column=index%width,row=Math.floor(index/width);for(let dz=-5;dz<=5;dz++)for(let dx=-5;dx<=5;dx++){if(Math.hypot(dx*cell,dz*cell)>.54)continue;const x=column+dx,z=row+dz;if(x>=0&&z>=0&&x<width&&z<width)blocked[z*width+x]=1;}}
 const connected=floodGrid(blocked,width,width,gridIndex(0,5.8));
 const failures=[];
 for(const [index,[x,z]] of definition.points.entries()){
  let found=false;for(let radius=0;radius<=.36;radius+=.12)for(let angle=0;angle<Math.PI*2;angle+=Math.PI/12){const grid=gridIndex(x+Math.cos(angle)*radius,z+Math.sin(angle)*radius);if(grid>=0&&!blocked[grid]&&connected[grid]>=0)found=true;}
  if(!found)failures.push(index);
 }
 if(key==='medical_station'){
  const wide=new Uint8Array(occupied.length);
  for(let index=0;index<occupied.length;index++)if(occupied[index]){const column=index%width,row=Math.floor(index/width);for(let dz=-8;dz<=8;dz++)for(let dx=-8;dx<=8;dx++){if(Math.hypot(dx*cell,dz*cell)>.9)continue;const x=column+dx,z=row+dz;if(x>=0&&z>=0&&x<width&&z<width)wide[z*width+x]=1;}}
  const reached=floodGrid(wide,width,width,gridIndex(0,4.8));
  for(const [name,x,z] of [['cart parking',-2.5,2.55],['departure',-2.5,4.05],['bed 0 berth',0,-.27],['bed 1 berth',0,1.75]]){const index=gridIndex(x,z);if(index<0||wide[index]||reached[index]<0)throw new Error('Medical cart approach blocked: '+name);}
  console.log('medical_station: parking, departure and both bed berths connect with 0.9D clearance');
 }
 const navigation=createNavigation({occupied,blocked,width,height:width,cell,minX:min,minZ:min,radius:.495});
 for(const [index,[x,z]] of definition.points.entries()){const route=navigation.path({x:0,z:5.8},{x,z});if(!route||Math.hypot(route.at(-1).x-x,route.at(-1).z-z)>.4)throw new Error(key+' new body-clear navigation cannot reach anchor '+index);}
 if(failures.length)throw new Error(key+' inaccessible static anchor(s): '+failures.join(','));
 console.log(key+': '+definition.points.length+' anchors have a static approach within 0.36D');
}
