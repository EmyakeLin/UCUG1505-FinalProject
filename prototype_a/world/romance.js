import * as THREE from 'three';
import {romanceState,feelings,spendTime,canDate,wantsDate,confirmBond} from 'romance-rules';

export function createRomance(api){
 const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
 const ink=canvas.getContext('2d');
 // World-space affection effect, drawn above the body so it cannot hide behind its face.
 ink.beginPath();ink.moveTo(48,80);ink.bezierCurveTo(32,67,8,50,8,30);ink.bezierCurveTo(8,6,38,3,48,24);ink.bezierCurveTo(58,3,88,6,88,30);ink.bezierCurveTo(88,50,64,67,48,80);
 ink.closePath();ink.fillStyle='#ed9eac';ink.strokeStyle='#774e59';ink.lineWidth=5;ink.fill();ink.stroke();
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const effects=new Map();let lastNearby=0;
 function effect(creature){
  if(effects.has(creature))return effects.get(creature);
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false});
  const heart=new THREE.Sprite(material);heart.renderOrder=12;heart.visible=false;creature.root.add(heart);
  const state={heart,until:0,blend:0,wasDating:false};effects.set(creature,state);return state;
 }
 function score(first,second){const preferred=romanceState(first).partner===second.index;return (feelings(first,second)?.affection||0)+(preferred?2:0);}
 function available(first,second){const now=api.time();return now>=romanceState(first).nextInvite&&now>=romanceState(second).nextInvite&&canDate(first,second);}
 function consider(first,second){
  if(!available(first,second))return false;
  const now=api.time();romanceState(first).nextInvite=now+24;
  if(!wantsDate(second,Math.random())){romanceState(second).nextInvite=now+12;api.announce(first.name+'想约'+second.name+'待一会儿；对方现在想自己休息，它便没有催促。');return false;}
  romanceState(first).nextInvite=now+38;romanceState(second).nextInvite=now+38;return true;
 }
 function begin(first,second,session){
  const established=romanceState(first).partner===second.index;
  session.dateStyle=established&&Math.random()<.5?'duet':'snuggle';
  effect(first);effect(second);
 }
 function step(seconds){
  const now=api.time(),sampleNearby=now-lastNearby>=1,nearbySeconds=Math.min(1,now-lastNearby);
  if(sampleNearby)lastNearby=now;
  for(const first of api.creatures){
   romanceState(first);const visual=effect(first),dating=first.action==='date';
   if(visual.wasDating&&!dating)visual.until=Math.max(visual.until,now+.7);
   visual.wasDating=dating;
   const target=dating?1:0;visual.blend+=(target-visual.blend)*Math.min(1,seconds*4);
   for(const second of api.creatures){
    if(first.index>=second.index)continue;
    const together=first.playPartner===second&&first.playSession&&first.playSession===second.playSession;
    const active=together&&['play','chat','date'].includes(first.action)&&first.action===second.action;
    if(!active&&!sampleNearby)continue;
    const a=api.positionOf(first),b=api.positionOf(second),distance=Math.hypot(a.x-b.x,a.z-b.z);
    if(distance>2.4||!api.clearLine(a,b))continue;
    const relaxed=[first,second].every(creature=>['idle','sun','toy-rest'].includes(creature.action));
    if(active)spendTime(first,second,seconds,first.action);else if(relaxed)spendTime(first,second,nearbySeconds,'nearby');
    if(active&&first.action==='date'&&confirmBond(first,second,now)){
     for(const creature of [first,second]){effect(creature).until=now+7;creature.joyStart=now;creature.nextJoy=now+12;}
     api.announce(first.name+'和'+second.name+'互相回应了心意，决定成为恋人。');
    }
   }
  }
 }
 function draw(){
  const now=api.time(),motion=api.motion();
  for(const creature of api.creatures){
   const visual=effects.get(creature);if(!visual)continue;
   const partner=creature.playPartner,dating=creature.action==='date'&&partner&&creature.playSession;
   const progress=dating?now-creature.playSession.start:0,pulse=(now+creature.index*.7)%2.6;
   // A small fading heart rises above each participant, even when a body occludes the other.
   const visible=dating||now<visual.until;
   visual.heart.visible=visible;visual.heart.position.set(.13*Math.sin(now*2)*motion,1.45+pulse*.16*motion,0);
   visual.heart.scale.setScalar(.38+Math.sin(pulse/2.6*Math.PI)*.13*motion);
   const fade=dating?visual.blend:Math.min(1,Math.max(0,(visual.until-now)/.7));
   visual.heart.material.opacity=visible?(.35+Math.sin(pulse/2.6*Math.PI)*.6)*fade:0;
   if(!dating)continue;
   const a=api.positionOf(creature),b=api.positionOf(partner),dx=b.x-a.x,dz=b.z-a.z,length=Math.max(.01,Math.hypot(dx,dz));
   const lean=Math.sin(Math.min(1,progress/3)*Math.PI/2)*.15*visual.blend;
   creature.pose.position.x+=(dx*Math.cos(creature.turn)-dz*Math.sin(creature.turn))/length*lean;
   creature.pose.position.z+=(dx*Math.sin(creature.turn)+dz*Math.cos(creature.turn))/length*lean;
   const duet=creature.playSession.dateStyle==='duet',sway=Math.sin(progress*2.4)*(duet?.13:.055)*motion;
   creature.pose.rotation.z+=sway*visual.blend;
   if(duet)creature.pose.position.y+=Math.max(0,Math.sin(progress*2.4))*.09*motion;
   for(const eye of creature.eyes)eye.scale.y*=.55;
   creature.mouth.scale.y=Math.max(.65,creature.mouth.scale.y);
  }
 }
 function summary(creature){
  const state=romanceState(creature),partner=api.creatures.find(other=>other.index===state.partner);
  if(partner)return '恋人：'+partner.name+' · 想和对方慢慢生活';
  const crush=api.creatures.filter(other=>other!==creature&&(feelings(creature,other)?.affection||0)>=.34).sort((a,b)=>score(creature,b)-score(creature,a))[0];
  if(!crush)return '关系：还在慢慢认识彼此';
  const crushPartner=romanceState(crush).partner;
  if(crushPartner!==null&&crushPartner!==creature.index)return '和'+crush.name+'很亲近，也尊重对方的关系';
  const reciprocal=(feelings(crush,creature)?.affection||0)>=.34;
  return reciprocal?'和'+crush.name+'互有好感，还没有确认心意':'有点在意'+crush.name+'，还在慢慢靠近';
 }
 return {score,available,consider,begin,step,draw,summary};
}
