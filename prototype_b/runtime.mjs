import {createPlacementController} from 'prototype-b-placement';

const FACILITY='quiet_garden';
const UX_ID='prototype-b-software-check';
const PHASE_COPY={
  empty:'区域为空。放下测试物件开始。',
  settling:'物件正在稳定。保持不动约两秒。',
  placed:'安静花园已落地。即使拿走物件，它也会留在世界里。',
  blocked:'这里不能落地。',
};

export function startPrototypeB(api) {
  const {THREE,scene,camera,canvas,creatures}=api;
  const committedIds=new Set(), foundForCreature=new WeakMap(), indirectDiscoveryTimes=new WeakMap(), indicators=new Map();
  let simPoint=null, mode='simulated', lastResult=null, chooseOnNextPointer=false;
  const marker=new THREE.Mesh(new THREE.RingGeometry(.58,.8,40),new THREE.MeshBasicMaterial({
    color:0xffd369,opacity:.85,transparent:true,depthWrite:false,side:THREE.DoubleSide,
  }));
  marker.rotation.x=-Math.PI/2;marker.position.y=.04;marker.visible=false;scene.add(marker);

  const image=document.createElement('canvas');image.width=image.height=96;
  const ctx=image.getContext('2d');
  ctx.fillStyle='#fff4bc';ctx.beginPath();ctx.arc(48,48,40,0,2*Math.PI);ctx.fill();
  ctx.lineWidth=5;ctx.strokeStyle='#3e594e';ctx.stroke();
  ctx.font='bold 65px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#3e594e';ctx.fillText('?',48,51);
  const cueTexture=new THREE.CanvasTexture(image);

  function commit(point) {
    if (!api.canPlace()) return {ok:false,reason:'先退出 A 的建造菜单，再测试放置。'};
    const {minX,maxX,minZ,maxZ}=api.limits;
    if (point.x<minX || point.x>maxX || point.z<minZ || point.z>maxZ) {
      return {ok:false,reason:'物件位置不在世界内。'};
    }
    const draft=api.createDraft(FACILITY);
    let committed=false;
    try {
      api.positionDraft(draft,point);
      const reason=api.inspectDraft(draft,true);
      if (reason) return {ok:false,reason};
      api.commitDraft(draft);
      committed=true;
      committedIds.add(draft.id);
      return {ok:true};
    } finally {
      if (!committed) api.discardDraft(draft);
    }
  }

  const controller=createPlacementController({commit,stableMs:2000,removeMs:300,tolerance:.35});
  const box=document.createElement('details');
  box.id=UX_ID;box.open=true;
  box.style.cssText='position:fixed;right:12px;top:12px;z-index:1000;max-width:310px;width:calc(100vw - 24px);box-sizing:border-box;background:#f7f5df;color:#233b34;border:1px solid #9daa8e;border-radius:12px;padding:10px 12px;box-shadow:0 3px 17px #20372d42;font:14px/1.45 system-ui,sans-serif;';
  const summary=document.createElement('summary');
  summary.textContent='Prototype B · 模拟输入（非现场试玩）';summary.style.fontWeight='700';box.append(summary);
  const guidance=document.createElement('p');
  guidance.textContent='测试用：选两个不同的空地，依次放下、拿走。未接摄像头；橙圈是位置提示，不是实时障碍。';
  box.append(guidance);
  const status=document.createElement('p');status.setAttribute('role','status');box.append(status);
  const controls=document.createElement('div');controls.style.cssText='display:flex;gap:6px;flex-wrap:wrap';box.append(controls);
  const button=(label,click)=>{
    const b=document.createElement('button');b.type='button';b.textContent=label;
    b.style.cssText='padding:5px 8px;background:#fffbe8;border:1px solid #9daa8e;border-radius:5px;color:#233b34;cursor:pointer;';
    b.addEventListener('click',click);controls.append(b);return b;
  };
  button('选地面并模拟放下',()=>{
    if (mode!=='simulated') return;
    if (!api.canPlace()) {status.textContent='请先关闭原来的建造菜单。';return;}
    chooseOnNextPointer=true;status.textContent='点击画面上的一块空地，模拟物件放下。';
  });
  button('模拟拿走',()=>{
    if(mode!=='simulated')return;
    chooseOnNextPointer=false;simPoint=null;
    applySample(null,performance.now());
  });
  document.body.append(box);

  const ray=new THREE.Raycaster(), ground=new THREE.Plane(new THREE.Vector3(0,1,0),0), hit=new THREE.Vector3();
  canvas.addEventListener('pointerdown',event=>{
    if (!chooseOnNextPointer || mode!=='simulated' || !api.canPlace()) return;
    const bounds=canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    ray.setFromCamera(new THREE.Vector2(2*(event.clientX-bounds.left)/bounds.width-1,1-2*(event.clientY-bounds.top)/bounds.height),camera);
    if (!ray.ray.intersectPlane(ground,hit)) return;
    chooseOnNextPointer=false;
    simPoint={x:hit.x,z:hit.z};
    applySample(simPoint,performance.now());
  });

  function applySample(point,now){
    lastResult=controller.sample(point,now);
    return lastResult;
  }

  function renderPosition() {
    const phase=lastResult?.phase??'empty',point=lastResult?.point;
    marker.visible=Boolean(point&&(phase==='settling'||phase==='blocked'));
    if (marker.visible) {
      marker.position.set(point.x,.04,point.z);
      marker.material.color.setHex(phase==='blocked'?0xd05b4d:0xffd369);
      marker.scale.setScalar(phase==='blocked'?1:1+(lastResult.progress??0)*.7);
    }
    if (!chooseOnNextPointer) {
      const next=PHASE_COPY[phase]+(lastResult?.reason?' '+lastResult.reason:'');
      if(status.textContent!==next)status.textContent=next;
    }
  }

  function renderDiscovery(now) {
    for(const creature of creatures) {
      let seen=foundForCreature.get(creature);
      if(!seen){seen=new Set();foundForCreature.set(creature,seen);}
      let indirectSince=indirectDiscoveryTimes.get(creature);
      if(!indirectSince){indirectSince=new Map();indirectDiscoveryTimes.set(creature,indirectSince);}
      let newDiscovery=false;
      for(const id of committedIds) {
        const memory=creature.brain?.known?.[id];
        if (seen.has(id) || !memory) continue;
        // A's cognition remembers the original source, but updates lastSeen on direct sensing.
        if(memory.source!=='seen'){
          if(!indirectSince.has(id)){indirectSince.set(id,memory.lastSeen);continue;}
          if(!(memory.lastSeen>indirectSince.get(id)))continue;
        }
        seen.add(id);indirectSince.delete(id);newDiscovery=true;
      }
      let cue=indicators.get(creature);
      if(newDiscovery){
        if (!cue) {
          const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:cueTexture,depthWrite:false,depthTest:false,transparent:true}));
          sprite.scale.set(1.7,1.7,1);sprite.renderOrder=20;scene.add(sprite);
          cue={sprite,until:0};indicators.set(creature,cue);
        }
        cue.until=now+1500;
      }
      if(cue){
        cue.sprite.visible=now<cue.until;
        if(cue.sprite.visible)cue.sprite.position.copy(creature.root.position).add(new THREE.Vector3(0,2.1,0));
      }
    }
  }

  // Future local sensor adapter can feed world-coordinate observations here.
  // For an explicitly clear region submit null; never submit null for a lost/unknown frame.
  // The switch is one-way for the page to prevent the debug driver fighting a sensor.
  window.prototypeB=Object.freeze({
    submitObservation(point){
      if(point!==null&&point!==undefined&&(!point||!Number.isFinite(point.x)||!Number.isFinite(point.z))){
        throw new TypeError('观察必须是有效世界坐标 {x,z}、明确无物件的 null，或未知状态的 undefined。');
      }
      if(mode==='simulated'&&simPoint!==null)throw new Error('请先模拟拿走，并等待空区状态，再接传感器。');
      if(mode==='simulated'&&lastResult?.phase!=='empty'&&lastResult!==null)throw new Error('请先等到测试区域为空。');
      mode='external';chooseOnNextPointer=false;controls.hidden=true;controls.style.display='none';
      summary.textContent='Prototype B · 外部输入接口';
      guidance.textContent='这里显示外部观察结果；本程序不自行接入摄像头。';
      return applySample(point,performance.now());
    },
  });

  return Object.freeze({
    draw(){
      const now=performance.now();
      if(mode==='simulated')applySample(simPoint,now);
      renderPosition();renderDiscovery(now);
    },
  });
}
