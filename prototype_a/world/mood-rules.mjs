// Fictional life-simulation rules, not a psychological model.
const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));
export function createMood(energy,fatigue){
 return {pleasure:clamp(.25+energy*.3-fatigue*.4,-1,1),arousal:clamp(.65-fatigue*.5),safety:.7,connection:.55,comfort:.6};
}
export function sunlightComfort(distance,radius){
 if(!Number.isFinite(distance)||radius<=0)return 0;
 // Local comfort reaches 2r, independently of energy coverage at 3r.
 return clamp(1-distance/(radius*2));
}
export function enjoyFood(mood,amount){
 // Reward actual food consumed, never the mere intention to eat.
 mood.pleasure=clamp(mood.pleasure+Math.max(0,amount)*.28,-1,1);
}
export function companionshipRecovery(company){return company?.025:0;}
export function evolveMood(mood,context,seconds){
 const {energy,fatigue,resting,nourished,company,playing,exploring,stress,sunComfort=0,fun=false}=context;
 const hunger=clamp((.6-energy)/.6);
 const comfort=resting||nourished;
 const targets={
  pleasure:clamp(.3-hunger*.9-fatigue*.45+Number(nourished)*.5+Number(playing||fun)*.4+Number(exploring)*.12-stress*.6,-1,1),
  arousal:clamp(.22+(1-fatigue)*.36+Number(playing||fun)*.3+Number(exploring)*.18+stress*.45-Number(resting)*.3),
  safety:clamp(.72-hunger*.25+Number(comfort)*.2+Number(company)*.08-stress*.8+sunComfort*.45),
  connection:playing?.98:company?.68:.12
 };
 const times={pleasure:10,arousal:7,safety:12,connection:playing?8:company?18:65};
 for(const key of Object.keys(targets)){
  const blend=1-Math.exp(-Math.max(0,seconds)/times[key]);
  const minimum=key==='pleasure'?-1:0;
  mood[key]=clamp(mood[key]+(targets[key]-mood[key])*blend,minimum,1);
 }
 if(seconds>0){const target=clamp(.5+Number(resting)*.3+Number(nourished)*.2-fatigue*.2-stress*.35),blend=1-Math.exp(-seconds/30);mood.comfort=clamp((mood.comfort??.5)+(target-(mood.comfort??.5))*blend);}
 return mood;
}
export function actionWeights(mood,energy,fatigue){
 const hunger=1-energy,loneliness=1-mood.connection,unease=1-mood.safety,discomfort=1-(mood.comfort??.5);
 return {
  charge:energy<.88?hunger*hunger*5+unease*1.7:0,
  eat:energy<.88?hunger*hunger*5+(1-mood.pleasure)*.35:0,
  sleep:fatigue>.25?fatigue*fatigue*5+(1-mood.arousal)*.7+unease*.6+discomfort*.4:0,
  play:energy>.35&&fatigue<.75?(.7+loneliness*1.6+Math.max(0,mood.pleasure)*.8)*(.25+mood.safety)*(.5+mood.arousal):0,
  sun:energy>.25? .7+unease*2+fatigue*.5:0,
  toy:energy>.35&&fatigue<.75?.6+mood.arousal*1.5+Math.max(0,mood.pleasure)*.4:0,
  wander:energy>.3&&fatigue<.8?(.2+mood.arousal*1.8)*mood.safety*(1-fatigue):0,
  idle:.3+unease*.9+(1-mood.arousal)*.45
 };
}
export function chooseMoodAction(weights,draw){
 const entries=Object.entries(weights).filter(([,weight])=>Number.isFinite(weight)&&weight>0);
 // Squared utilities favor stronger desires while preserving occasional variation.
 const total=entries.reduce((sum,[,weight])=>sum+weight*weight,0);
 if(!total)return 'idle';
 let cursor=clamp(draw,0,1-Number.EPSILON)*total;
 for(const [action,weight] of entries){cursor-=weight*weight;if(cursor<0)return action;}
 return entries[entries.length-1][0];
}
export function acceptsCompany(mood,energy,fatigue,draw){
 if(energy<.35||fatigue>.75||mood.safety<.25)return false;
 const willingness=clamp(.35+(1-mood.connection)*.35+mood.safety*.2+Math.max(0,mood.pleasure)*.15-fatigue*.2);
 return draw<willingness;
}
export function moodDescription(mood){
 if(mood.safety<.42)return '有点不安，想找个安心的地方';
 if(mood.pleasure<-.25)return '有点低落，想照顾一下自己';
 if(mood.connection<.35)return '有些孤单，惦记着同伴';
 if(mood.arousal<.3)return '懒洋洋的，想安静待一会儿';
 if(mood.pleasure>.45&&mood.connection>.65)return '心里暖暖的，喜欢有人陪着';
 if(mood.arousal>.57&&mood.safety>.6)return '安心又好奇，想四处看看';
 return '心情平和，按自己的步调生活';
}
