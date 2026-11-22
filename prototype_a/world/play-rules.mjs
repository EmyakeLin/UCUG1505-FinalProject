export const PLAY_NAMES={imitate:'轮流蹦跳',dance:'摇摆合拍',chase:'转圈追逐'};
export function choosePlayStyle(arousal,previous,roomToRun,draw){
 const weights={imitate:1,dance:1.5-arousal*.5,chase:roomToRun?.5+arousal*2:0};
 const candidates=Object.entries(weights).filter(([name,weight])=>weight>0&&name!==previous);
 const total=candidates.reduce((sum,[,weight])=>sum+weight,0);
 let cursor=Math.max(0,Math.min(1-Number.EPSILON,draw))*total;
 for(const [name,weight] of candidates){cursor-=weight;if(cursor<0)return name;}
 return candidates[candidates.length-1][0];
}
