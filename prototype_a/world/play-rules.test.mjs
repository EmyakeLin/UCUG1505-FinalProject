import assert from 'node:assert/strict';
import {PLAY_NAMES,choosePlayStyle} from './play-rules.mjs';

// Pure selection rules only: no renderer, navigation, physics, or scene execution.
for(const previous of [undefined,...Object.keys(PLAY_NAMES)]){
 for(const room of [false,true])for(const arousal of [0,.5,1]){
  for(let index=0;index<=100;index++){
   const style=choosePlayStyle(arousal,previous,room,index/100);
   assert.ok(Object.hasOwn(PLAY_NAMES,style));
   assert.notEqual(style,previous,'A pair should change activities at the next meeting');
   if(!room)assert.notEqual(style,'chase','Running requires open space');
  }
 }
}
const countChases=arousal=>{
 let count=0;
 for(let index=0;index<1000;index++)if(choosePlayStyle(arousal,undefined,true,index/1000)==='chase')count++;
 return count;
};
assert.ok(countChases(1)>countChases(0),'More active pairs should choose running more often');
console.log('Play selection checks passed: variety, space restriction, and mood preference.');
