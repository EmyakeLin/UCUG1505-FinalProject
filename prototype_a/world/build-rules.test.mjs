import assert from 'node:assert/strict';
import {overlaps,inside,floodGrid,gridRoute} from './build-rules.mjs';
import {createFoodState,loadFood,unloadFood} from './food-rules.mjs';

// Only data rules; no DOM, Three.js renderer, Matter world, or UI simulation.
const bounds={minX:-10,maxX:10,minZ:-10,maxZ:10};
const footprint={minX:-2,maxX:2,minZ:-2,maxZ:2};
assert.ok(inside(footprint,bounds,1));
assert.equal(inside({...footprint,maxX:10},bounds,1),false);
assert.equal(overlaps(footprint,{minX:3,maxX:4,minZ:0,maxZ:1},.75),false);
assert.ok(overlaps(footprint,{minX:2.5,maxX:4,minZ:0,maxZ:1},.75));
const grid=new Uint8Array(35),width=7,height=5;
for(let row=0;row<height;row++)grid[row*width+3]=1;
assert.equal(gridRoute(grid,width,height,15,19),null,'A closed wall separates the endpoints');
grid[3]=0;
const route=gridRoute(grid,width,height,15,19);
assert.ok(route&&route.includes(3),'The path uses the open doorway');
let previous=15;
for(const cell of route){assert.equal(grid[cell],0);assert.equal(Math.abs(cell%width-previous%width)+Math.abs(Math.floor(cell/width)-Math.floor(previous/width)),1);previous=cell;}
assert.equal(previous,19);
assert.equal(floodGrid(grid,width,height,-1).every(value=>value===-1),true);
assert.equal(gridRoute(grid,width,height,0,-1),null);
assert.equal(gridRoute(grid,width,height,0,35),null);
assert.deepEqual(gridRoute(grid,width,height,0,0),[]);
// Two independent factories may deliver into one bowl without duplicating food.
const bowl={bowl:5},first=createFoodState(),second=createFoodState();
for(const factory of [first,second]){Object.defineProperty(factory,'bowl',{configurable:true,get:()=>bowl.bowl,set:value=>{bowl.bowl=value;}});factory.stock=2;assert.ok(loadFood(factory));}
assert.ok(unloadFood(first));assert.equal(unloadFood(second),false);
assert.equal(bowl.bowl,6);assert.equal(second.cargo,1);
const anotherBowl={bowl:0};Object.defineProperty(second,'bowl',{configurable:true,get:()=>anotherBowl.bowl,set:value=>{anotherBowl.bowl=value;}});
assert.ok(unloadFood(second));assert.equal(anotherBowl.bowl,1);assert.equal(bowl.bowl,6);
console.log('Build data checks passed: spacing, boundaries, connected routes, and shared bowl capacity.');
