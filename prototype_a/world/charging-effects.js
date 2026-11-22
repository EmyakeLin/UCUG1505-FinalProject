import * as THREE from 'three';

// Centerlines from the supplied v08 model's four conduit ribbons (D, Y-up).
// Keep their bends and recess depth: particles must follow the existing stone grooves.
const FLOW={interval:.22,travel:1.65,absorb:1.4,count:16,radius:.05};
const COLD=new THREE.Color(0xc6f5f2);
export function createChargingEffects(scene,model,outlets,reduced,camera){
 const geometry=new THREE.SphereGeometry(FLOW.radius,8,6);
 const channels=outlets.map(slot=>{
  const normal=slot.normal;
  const tangent=new THREE.Vector3(normal.z,0,-normal.x);
  const center=new THREE.Vector3().setFromMatrixPosition(model.matrixWorld);
  const route=[[0,.5,4.935],[0,1.435,4.935],[0,1.435,2.6],[.35,1.435,2.6],[.35,1.435,.4]];
  const points=route.map(([across,outward,height])=>{
   const point=center.clone().addScaledVector(normal,outward).addScaledVector(tangent,across);
   point.y=height;return point;
  });
  const curve=new THREE.CurvePath();
  for(let index=1;index<points.length;index++){
   const segment=new THREE.LineCurve3(points[index-1],points[index]);curve.add(segment);
  }
  const materials=[];
  for(const name of ['conduit_'+slot.side,'outlet_'+slot.side]){
   const object=model.getObjectByName(name);
   object.traverse(child=>{if(child.isMesh){
    const list=Array.isArray(child.material)?child.material:[child.material];
    for(const material of list){material.userData.chargeControlled=true;materials.push(material);}
   }});
  }
  const particles=Array.from({length:FLOW.count},(_,index)=>{
   const material=new THREE.MeshBasicMaterial({color:COLD,transparent:true,opacity:0,depthWrite:false});
   const mesh=new THREE.Mesh(geometry,material);mesh.visible=false;scene.add(mesh);
   return {mesh,born:-Infinity,owner:null,index};
  });
  return {slot,normal,tangent,curve,materials,particles,next:0,strength:0};
 });
 const target=new THREE.Vector3();
 const view=camera.getWorldDirection(new THREE.Vector3()).negate();
 const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0).normalize();
 return {
  step(time,step){
   for(const channel of channels){
    const owner=channel.slot.occupant;
    const active=Boolean(owner&&owner.action==='charge'&&owner.chargingReady);
    const strengthTarget=active?1:0;
    channel.strength+=(strengthTarget-channel.strength)*step*3;
    if(!active){channel.next=time;continue;}
    if(time<channel.next)continue;
    channel.next=time+FLOW.interval;
    if(reduced.matches)continue;
    const particle=channel.particles.find(item=>time-item.born>FLOW.travel+FLOW.absorb);
    if(particle){particle.born=time;particle.owner=owner;}
   }
  },
  draw(time){
   for(const channel of channels){
    for(const material of channel.materials){
     const base=material.userData.baseEmission??1;
     material.emissiveIntensity=base*(.25+channel.strength*2.75);
    }
    for(const particle of channel.particles){
     const age=time-particle.born;
     const alive=age>=0&&age<FLOW.travel+FLOW.absorb&&!reduced.matches;
     particle.mesh.visible=alive;if(!alive)continue;
     const owner=particle.owner;
     if(age<FLOW.travel){
      const progress=age/FLOW.travel;
      channel.curve.getPoint(progress,particle.mesh.position);
      // A slight outward lift keeps each dot above its luminous ribbon.
      particle.mesh.position.addScaledVector(channel.normal,.012);
      particle.mesh.scale.setScalar(1);
      particle.mesh.material.color.copy(COLD);
      particle.mesh.material.opacity=Math.min(1,age*8)*.9;
     }else{
      const progress=(age-FLOW.travel)/FLOW.absorb;
      owner.pose.getWorldPosition(target);
      const outlet=channel.slot.port;
      // Travel around the silhouette, then enter the camera-facing surface.
      // Keep depth testing: these particles are physically in front, not an overlay.
      const sourceSide=outlet.clone().sub(target).dot(right);
      const sideSign=sourceSide<0?-1:1;
      const spread=Math.sin(particle.index*2.4)*.10;
      const shoulderOffset=sideSign*(.85+spread);
      const departure=outlet.clone().addScaledVector(channel.normal,.2).addScaledVector(right,shoulderOffset);
      departure.y+=.35;
      const shoulder=target.clone().addScaledVector(right,shoulderOffset).addScaledVector(view,.8);
      const surfaceDistance=.54-THREE.MathUtils.smoothstep(progress,.82,1)*.13;
      const surface=target.clone().addScaledVector(view,surfaceDistance).addScaledVector(right,sideSign*.12);
      const remaining=1-progress;
      particle.mesh.position.copy(outlet).multiplyScalar(remaining**3);
      particle.mesh.position.addScaledVector(departure,3*remaining**2*progress);
      particle.mesh.position.addScaledVector(shoulder,3*remaining*progress**2);
      particle.mesh.position.addScaledVector(surface,progress**3);
      const warmBlend=THREE.MathUtils.smoothstep(progress,.65,1);
      particle.mesh.material.color.copy(COLD).lerp(owner.bodyMesh.material.color,warmBlend);
      const fade=THREE.MathUtils.smoothstep(progress,.7,1);
      particle.mesh.material.opacity=.95*(1-fade);
      particle.mesh.scale.setScalar(1-fade*.8);
     }
    }
   }
  }
 };
}
