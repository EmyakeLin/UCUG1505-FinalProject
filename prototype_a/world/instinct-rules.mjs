import {needsRecovery} from './rescue-rules.mjs';
export const INNATE_ACTIONS=['charge','eat','sleep','sun','work','delivery'];
export function instinctIntent(creature,{danger=0,night=false,sheltered=false,food=0,population=1}={}){
 if(creature.health?.state&&creature.health.state!=='awake')return null;
 if(needsRecovery(creature,danger))return 'recover';
 if(night&&(!sheltered||creature.fatigue>.3))return 'shelter';
 if(food<Math.max(2,population*.75))return creature.energy>.45&&creature.fatigue<.65?'food':'recover';
 return null;
}
export function preserveInnateWeight(action,weight,hasExperience){return hasExperience||INNATE_ACTIONS.includes(action)?weight:0;}
