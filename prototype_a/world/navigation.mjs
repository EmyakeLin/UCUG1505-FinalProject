// Numerical navigation over the same occupied cells used to create Matter walls.
export function createNavigation({occupied,blocked,width,height,cell,minX,minZ,radius,dynamicBlocked=()=>false}){
 const indexOf=point=>{const x=Math.floor((point.x-minX)/cell),z=Math.floor((point.z-minZ)/cell);return x<0||z<0||x>=width||z>=height?-1:z*width+x;};
 const pointAt=index=>({x:minX+(index%width+.5)*cell,z:minZ+(Math.floor(index/width)+.5)*cell});
 function penetration(point){
  const column=Math.floor((point.x-minX)/cell),row=Math.floor((point.z-minZ)/cell),padding=Math.ceil(radius/cell)+1;let overlap=0;
  for(let dz=-padding;dz<=padding;dz++)for(let dx=-padding;dx<=padding;dx++){
   const x=column+dx,z=row+dz;if(x<0||z<0||x>=width||z>=height||!occupied[z*width+x])continue;
   const left=minX+x*cell,near=minZ+z*cell;
   const separation=Math.hypot(Math.max(left-point.x,0,point.x-left-cell),Math.max(near-point.z,0,point.z-near-cell));
   overlap=Math.max(overlap,radius-separation);
  }
  return overlap;
 }
 function free(point){const index=indexOf(point);return index>=0&&!blocked[index]&&!dynamicBlocked(point)&&penetration(point)<=1e-8;}
 function line(first,second,escape=false){
  const length=Math.hypot(second.x-first.x,second.z-first.z),steps=Math.max(1,Math.ceil(length/(cell*.45)));let last=penetration(first),cleared=last<=1e-8;
  for(let step=0;step<=steps;step++){
   const weight=step/steps,point={x:first.x+(second.x-first.x)*weight,z:first.z+(second.z-first.z)*weight};
   if(!escape){if(!free(point))return false;continue;}
   if(indexOf(point)<0||dynamicBlocked(point))return false;
   const depth=penetration(point);if(depth>last+1e-7||cleared&&depth>1e-8)return false;last=depth;if(depth<=1e-8)cleared=true;
  }
  return true;
 }
 function candidates(point,maxDistance=1.2){
  const points=[];if(free(point))points.push({...point});
  const column=Math.floor((point.x-minX)/cell),row=Math.floor((point.z-minZ)/cell),padding=Math.ceil(maxDistance/cell);
  for(let dz=-padding;dz<=padding;dz++)for(let dx=-padding;dx<=padding;dx++){const x=column+dx,z=row+dz;if(x<0||z<0||x>=width||z>=height)continue;const target=pointAt(z*width+x);if(Math.hypot(target.x-point.x,target.z-point.z)<=maxDistance&&free(target))points.push(target);}
  return points.sort((a,b)=>Math.hypot(a.x-point.x,a.z-point.z)-Math.hypot(b.x-point.x,b.z-point.z));
 }
 function nearest(point){return candidates(point)[0]||null;}
 function path(start,end){
  const origin=free(start)?{...start}:candidates(start).find(point=>line(start,point,true));
  if(!origin)return null;
  const targets=free(end)?[{...end}]:candidates(end);if(!targets.length)return null;
  const prefix=Math.hypot(origin.x-start.x,origin.z-start.z)>.001?[origin]:[];
  if(line(origin,targets[0]))return [...prefix,targets[0]];
  const from=indexOf(origin),previous=new Int32Array(width*height),queue=new Int32Array(width*height);previous.fill(-1);previous[from]=from;queue[0]=from;let head=0,tail=1;
  // Prefer the requested endpoint; only use a nearby reachable endpoint when it is blocked.
  const targetIndices=new Set(targets.map(indexOf));let reached=-1;
  while(head<tail){const index=queue[head++],column=index%width;if(targetIndices.has(index)){reached=index;if(index===indexOf(targets[0]))break;}
   for(const next of [index-width,index+width,column>0?index-1:-1,column<width-1?index+1:-1]){
    if(next<0||next>=previous.length||previous[next]!==-1||blocked[next])continue;
    const point=pointAt(next);if(!free(point))continue;previous[next]=index;queue[tail++]=next;
   }
  }
  const finish=targets.find(point=>previous[indexOf(point)]!==-1&&line(pointAt(indexOf(point)),point));if(!finish||reached<0)return null;
  const route=[];let cursor=indexOf(finish);while(cursor!==from){route.push(pointAt(cursor));cursor=previous[cursor];}route.reverse();route.push(finish);
  const smooth=[...prefix];let anchor=origin,position=0;
  while(position<route.length){if(!line(anchor,route[position]))return null;let furthest=position;while(furthest+1<route.length&&line(anchor,route[furthest+1]))furthest++;smooth.push(route[furthest]);anchor=route[furthest];position=furthest+1;}
  return smooth;
 }
 return {free,line,nearest,path,penetration};
}

export function trackProgress(creature,point,now){
 const waypoint=creature.path[0];if(!waypoint){creature.navWatch=null;return false;}
 const distance=Math.hypot(point.x-waypoint.x,point.z-waypoint.z),watch=creature.navWatch;
 if(!watch||watch.target!==waypoint){creature.navWatch={target:waypoint,best:distance,at:now};return false;}
 if(distance<watch.best-.04){watch.best=distance;watch.at=now;return false;}
 return now-watch.at>1.5;
}
