// Pure numeric rules: energy is normalized to [0, 1], rates are per second.
export const ENERGY_RATES=Object.freeze({restDrain:.003,moveDrain:.006,monolithRestore:.085});
export const SUNLIGHT_FIELD=Object.freeze({radius:4,outerMultiplier:3,maxFraction:.2,minFraction:.2});
export const SUNLIGHT_MIN_RATE=ENERGY_RATES.restDrain*SUNLIGHT_FIELD.minFraction;
export const SUNLIGHT_MAX_RATE=ENERGY_RATES.monolithRestore*SUNLIGHT_FIELD.maxFraction;
export const SUNLIGHT_OUTER_RADIUS=SUNLIGHT_FIELD.radius*SUNLIGHT_FIELD.outerMultiplier;

export function sunlightRecovery(distance){
 if(!Number.isFinite(distance)||distance>SUNLIGHT_OUTER_RADIUS)return 0;
 if(distance>=SUNLIGHT_FIELD.radius)return SUNLIGHT_MIN_RATE;
 const closeness=1-Math.max(0,distance)/SUNLIGHT_FIELD.radius;
 const rateRange=SUNLIGHT_MAX_RATE-SUNLIGHT_MIN_RATE;
 return SUNLIGHT_MIN_RATE+rateRange*closeness;
}
