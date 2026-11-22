// Data-only spatial rules shared by placement and vehicle navigation.
export function overlaps(a,b,gap=0){return a.minX<b.maxX+gap&&a.maxX>b.minX-gap&&a.minZ<b.maxZ+gap&&a.maxZ>b.minZ-gap;}
export function inside(box,bounds,margin=0){return box.minX>=bounds.minX+margin&&box.maxX<=bounds.maxX-margin&&box.minZ>=bounds.minZ+margin&&box.maxZ<=bounds.maxZ-margin;}
export function floodGrid(blocked,width,height,origin){
 const previous=new Int32Array(width*height);previous.fill(-1);
 if(origin<0||origin>=previous.length||blocked[origin])return previous;
 const queue=new Int32Array(previous.length);let head=0,tail=1;queue[0]=origin;previous[origin]=origin;
 while(head<tail){const index=queue[head++],column=index%width;
  const neighbors=[index-width,index+width,column>0?index-1:-1,column<width-1?index+1:-1];
  for(const next of neighbors){if(next<0||next>=previous.length||blocked[next]||previous[next]!==-1)continue;previous[next]=index;queue[tail++]=next;}
 }
 return previous;
}
export function gridRoute(blocked,width,height,from,to){
 if(to<0||to>=blocked.length||blocked[to])return null;
 const previous=floodGrid(blocked,width,height,from);if(previous[to]===-1)return null;
 const route=[];let cursor=to;while(cursor!==from){route.push(cursor);cursor=previous[cursor];}route.reverse();return route;
}
