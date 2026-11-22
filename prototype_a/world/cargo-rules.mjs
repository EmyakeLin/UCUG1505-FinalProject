// Cargo is opaque to the container. Units describe occupied space, not item type.
export function createHold(capacity=4){return {capacity,entries:[]};}
export function remainingSpace(hold){return hold.capacity-hold.entries.reduce((sum,entry)=>sum+entry.units,0);}
export function loadCargo(hold,id,payload,units=1){if(!id||!payload||!Number.isFinite(units)||units<=0||units>remainingSpace(hold)||hold.entries.some(entry=>entry.id===id))return false;hold.entries.push({id,payload,units});return true;}
export function unloadCargo(hold,id){const index=hold.entries.findIndex(entry=>entry.id===id);if(index<0)return null;return hold.entries.splice(index,1)[0];}
export function moveCargo(first,second,id){const entry=first.entries.find(item=>item.id===id);if(!entry||!loadCargo(second,entry.id,entry.payload,entry.units))return false;unloadCargo(first,id);return true;}
