export const NUTRITION={initial:.6,decay:1/720,hungry:.45,full:.9,energySaving:.4,fatigueSaving:.3};
export const SATIETY_GAIN={raw:.35,simple:.55,packed:.45,lunch:.75,snack:.2};
const clamp=value=>Math.max(0,Math.min(1,value));
export function satietyOf(creature){return Number.isFinite(creature.satiety)?clamp(creature.satiety):NUTRITION.initial;}
export function feed(creature,type,amount=1){creature.satiety=clamp(satietyOf(creature)+(SATIETY_GAIN[type]||0)*Math.max(0,amount));}
export function nourishment(creature){const fullness=satietyOf(creature);return {energy:1-fullness*NUTRITION.energySaving,fatigue:1-fullness*NUTRITION.fatigueSaving};}
export function digest(creature,seconds){if(creature.nightSleep||creature.health?.state&&creature.health.state!=='awake')return;creature.satiety=clamp(satietyOf(creature)-Math.max(0,seconds)*NUTRITION.decay);if(creature.satiety>=.6){creature.mood.pleasure=Math.min(1,creature.mood.pleasure+seconds*.001);creature.mood.comfort=clamp((creature.mood.comfort??.5)+seconds*.002);}}
export function wakeFromNight(creature){creature.nightSleep=null;creature.energy=1;creature.fatigue=0;creature.mood.comfort=1;creature.mood.safety=1;creature.mood.pleasure=Math.max(.6,creature.mood.pleasure);}
