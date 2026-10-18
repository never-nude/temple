/* Navigation keeps physical input streams separate: a pinch is applied once,
   and two touch points use a fixed baseline for simultaneous pan and zoom. */
function templeWheelPixels(event, height, width=height) {
  const unitX=event.deltaMode===1?16:event.deltaMode===2?Math.max(1,width):1;
  const unitY=event.deltaMode===1?16:event.deltaMode===2?Math.max(1,height):1;
  return {x:(Number.isFinite(event.deltaX)?event.deltaX:0)*unitX,y:(Number.isFinite(event.deltaY)?event.deltaY:0)*unitY};
}
// Make the floor constraint feasible even after panning the orbit target below
// the floor and then zooming in. The polar interval must never be inverted.
function templeConstrainCameraSphere(pose, lowest, limits={min:1.5,max:1800,minPhi:.025,maxPhi:Math.PI-.035}) {
  const radius=Math.max(limits.min,Math.min(limits.max,pose.radius));
  const targetY=Math.max(pose.targetY,lowest-radius*Math.cos(limits.minPhi));
  const ratio=Math.max(-1,Math.min(1,(lowest-targetY)/radius));
  const maxPhi=Math.max(limits.minPhi,Math.min(limits.maxPhi,Math.acos(ratio)));
  const phi=Math.max(limits.minPhi,Math.min(maxPhi,pose.phi));
  return {radius,targetY,phi};
}
// Narrow screens need more horizontal distance, without moving a low camera
// underneath its floor when it is looking upward at the architecture.
function templeFitCameraPreset(eye, target, fit=1, lowest=-24.75) {
  const dx=(eye[0]-target[0])*fit,dz=(eye[2]-target[2])*fit;
  const dy=(eye[1]-target[1])*(eye[1]<target[1]?1:fit);
  const length=Math.hypot(dx,dy,dz),theta=Math.atan2(dx,dz);
  const phi=length>1e-8?Math.acos(Math.max(-1,Math.min(1,dy/length))):.025;
  const sphere=templeConstrainCameraSphere({radius:length,phi,targetY:target[1]},lowest);
  const center=[target[0],sphere.targetY,target[2]],r=sphere.radius,p=sphere.phi;
  return {eye:[center[0]+r*Math.sin(p)*Math.sin(theta),center[1]+r*Math.cos(p),center[2]+r*Math.sin(p)*Math.cos(theta)],target:center};
}
function templeGestureProjection(start, current, limits={min:1.5,max:1800}) {
  const distance=Math.max(.001,Number.isFinite(current.distance)?current.distance:.001);
  const wanted=start.radius*Math.max(.001,start.distance)/distance;
  const radius=Math.max(limits.min,Math.min(limits.max,wanted));
  const unit=2*Math.tan(start.fov*Math.PI/360)/Math.max(1,start.height);
  const oldUnit=start.radius*unit,newUnit=radius*unit;
  return {radius,right:(start.x-start.centerX)*oldUnit-(current.x-start.centerX)*newUnit,
    up:-(start.y-start.centerY)*oldUnit+(current.y-start.centerY)*newUnit,clamped:radius!==wanted};
}
function createTemplePinchOwnership() {
  let owner=null,until=0;
  const active=(now)=>{if(owner!=='native'&&owner!=='pointers'&&now>=until)owner=null;return owner;};
  return {
    pointerStart(){owner='pointers';until=Infinity;},
    pointerEnd(now){if(owner==='pointers'){owner='pointer-tail';until=now+180;}},
    nativeStart(now){const o=active(now);if(o==='pointers'||o==='wheel'||o==='pointer-tail')return false;owner='native';until=Infinity;return true;},
    nativeEnd(now){if(owner==='native'){owner='native-tail';until=now+180;}},
    wheel(now){const o=active(now);if(o&&o!=='wheel')return false;owner='wheel';until=now+180;return true;},
    blocksPan(now){const o=active(now);return Boolean(o);},
    reset(){owner=null;until=0;}
  };
}
function createTempleNavigation(T,options) {
  const {canvas,camera,stage}=options, points=new Map(),ownership=createTemplePinchOwnership();
  const listeners=[];let baseline=null,nativeBaseline=null,dragged=false,wasMultiple=false,firstDown=null,wheelTimer=null,changed=false;
  const now=()=>performance.now();
  const listen=(target,type,handler,settings)=>{target.addEventListener(type,handler,settings);listeners.push([target,type,handler,settings]);};
  const basis=()=>({right:new T.Vector3(1,0,0).applyQuaternion(camera.quaternion),up:new T.Vector3(0,1,0).applyQuaternion(camera.quaternion)});
  const touches=()=>[...points.entries()].filter(([,p])=>p.type==='touch').slice(0,2);
  const directPointer=()=>[...points.values()].some(p=>p.type!=='mouse');
  const samePair=pair=>baseline&&pair.length===2&&baseline.ids.every((id,i)=>id===pair[i][0]);
  function sample(pair){const a=pair[0][1],b=pair[1][1];return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.max(.001,Math.hypot(a.x-b.x,a.y-b.y))};}
  function snapshot(x,y,distance,ids=null){const rect=canvas.getBoundingClientRect(),pose=options.getPose();return{...pose,target:pose.target.clone(),...basis(),x,y,distance,ids,centerX:rect.left+rect.width/2,centerY:rect.top+rect.height/2,height:rect.height,fov:camera.getEffectiveFOV()};}
  function change(action){const before=options.getPose(),result=action(),after=options.getPose();if(['radius','theta','phi'].some(k=>before[k]!==after[k])||['x','y','z'].some(k=>before.target[k]!==after.target[k]))changed=true;return result;}
  function commit(){if(changed){changed=false;options.onCommit();}}
  function rebase(){const pair=touches();if(pair.length!==2){baseline=null;return;}const p=sample(pair);baseline=snapshot(p.x,p.y,p.distance,pair.map(([id])=>id));}
  function commitSoon(){clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>{wheelTimer=null;commit();},220);}
  function applyProjected(start,current){const result=templeGestureProjection(start,current);const target=start.target.clone().addScaledVector(start.right,result.right).addScaledVector(start.up,result.up);const constrained=change(()=>options.applyPose({radius:result.radius,target}));if(result.clamped||constrained){if(start===nativeBaseline)nativeBaseline=snapshot(current.x,current.y,current.distance);else rebase();}}
  function pan(dx,dy){const pose=options.getPose(),unit=2*pose.radius*Math.tan(camera.getEffectiveFOV()*Math.PI/360)/Math.max(1,stage.clientHeight),axes=basis();change(()=>options.applyPose({radius:pose.radius,target:pose.target.clone().addScaledVector(axes.right,-dx*unit).addScaledVector(axes.up,dy*unit)}));}
  function zoom(factor,event){const rect=canvas.getBoundingClientRect(),x=Number.isFinite(event.clientX)?event.clientX:rect.left+rect.width/2,y=Number.isFinite(event.clientY)?event.clientY:rect.top+rect.height/2;const start=snapshot(x,y,1);applyProjected(start,{x,y,distance:1/factor});}
  function clear(commitChanges=false){if(commitChanges)commit();changed=false;const ids=[...points.keys()];points.clear();baseline=null;nativeBaseline=null;firstDown=null;dragged=false;wasMultiple=false;ownership.reset();clearTimeout(wheelTimer);wheelTimer=null;for(const id of ids)try{if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}catch(e){}}
  listen(canvas,'pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button>2)return;e.preventDefault();
    const type=e.pointerType||'mouse',active=points.values().next().value;
    if(points.has(e.pointerId)||(active&&(active.type!==type||type!=='touch')))return;
    change(options.onStart);options.onInput?.(type==='mouse'?options.getMode():'touch');
    if(points.size===0){firstDown={x:e.clientX,y:e.clientY,time:now(),button:e.button,type:e.pointerType};dragged=false;wasMultiple=false;}
    if(!active&&type!=='mouse'){nativeBaseline=null;ownership.reset();}
    points.set(e.pointerId,{x:e.clientX,y:e.clientY,type,button:e.button,anchorX:e.clientX,anchorY:e.clientY,orbitReady:false});try{canvas.setPointerCapture(e.pointerId);}catch(error){}
    const pair=touches();if(pair.length===2){wasMultiple=true;dragged=true;nativeBaseline=null;ownership.pointerStart();if(!samePair(pair))rebase();}
  },{passive:false});
  listen(canvas,'pointermove',e=>{
    const previous=points.get(e.pointerId);if(!previous)return;e.preventDefault();
    if(previous.type==='mouse'&&e.buttons===0){release(e,true);return;}
    const dx=e.clientX-previous.x,dy=e.clientY-previous.y;points.set(e.pointerId,{...previous,x:e.clientX,y:e.clientY});
    if(dx===0&&dy===0)return;
    const pair=touches();
    if(pair.length===2){
      if(!samePair(pair))rebase();
      if(baseline&&baseline.ids.includes(e.pointerId))applyProjected(baseline,sample(pair));
      dragged=true;wasMultiple=true;return;
    }
    if(previous.type==='mouse'){
      if(firstDown&&Math.hypot(e.clientX-firstDown.x,e.clientY-firstDown.y)>4)dragged=true;
      if(e.buttons&6||e.shiftKey)pan(dx,dy);else change(()=>options.orbit(dx,dy));
    }else{
      let orbitX=dx,orbitY=dy;
      if(!previous.orbitReady){orbitX=e.clientX-previous.anchorX;orbitY=e.clientY-previous.anchorY;if(Math.hypot(orbitX,orbitY)<=4)return;points.get(e.pointerId).orbitReady=true;}
      dragged=true;change(()=>options.orbit(orbitX,orbitY));
    }
  },{passive:false});
  function release(e,cancelled){
    if(!points.has(e.pointerId))return;
    const single=points.size===1,pairBefore=touches();points.delete(e.pointerId);const pairAfter=touches();
    if(!cancelled&&single&&!dragged&&!wasMultiple&&firstDown&&(firstDown.type!=='mouse'||firstDown.button===0)&&now()-firstDown.time<600)options.onPick(e);
    const pairChanged=pairBefore.length===2&&(pairAfter.length!==2||pairBefore.some(([id],i)=>id!==pairAfter[i][0]));
    if(pairChanged){ownership.pointerEnd(now());baseline=null;dragged=true;wasMultiple=true;
      if(pairAfter.length===2){ownership.pointerStart();rebase();}
      else if(points.size===1){const remaining=points.values().next().value;remaining.anchorX=remaining.x;remaining.anchorY=remaining.y;remaining.orbitReady=false;}
    }
    if(points.size===0){firstDown=null;baseline=null;commit();}else dragged=true;
  }
  listen(canvas,'pointerup',e=>release(e,false));
  listen(canvas,'pointercancel',e=>release(e,true));
  listen(canvas,'lostpointercapture',e=>release(e,true));
  listen(canvas,'contextmenu',e=>e.preventDefault());listen(canvas,'auxclick',e=>e.preventDefault());
  listen(canvas,'wheel',e=>{
    e.preventDefault();if(directPointer())return;const delta=templeWheelPixels(e,stage.clientHeight,stage.clientWidth);if(delta.x===0&&delta.y===0)return;
    if(e.ctrlKey){if(delta.y===0||!ownership.wheel(now()))return;change(options.onStart);options.onInput?.('trackpad');nativeBaseline=null;zoom(Math.exp(Math.max(-100,Math.min(100,delta.y))*.01),e);}
    else{if(ownership.blocksPan(now()))return;change(options.onStart);options.onInput?.(options.getMode());if(options.getMode()==='mouse')zoom(Math.exp(Math.max(-200,Math.min(200,delta.y))*.0018),e);else pan(-delta.x,-delta.y);}
    commitSoon();
  },{passive:false});
  listen(canvas,'gesturestart',e=>{e.preventDefault();if(directPointer()||!ownership.nativeStart(now()))return;change(options.onStart);options.onInput?.('trackpad');const rect=canvas.getBoundingClientRect();nativeBaseline=snapshot(Number.isFinite(e.clientX)?e.clientX:rect.left+rect.width/2,Number.isFinite(e.clientY)?e.clientY:rect.top+rect.height/2,1);},{passive:false});
  listen(canvas,'gesturechange',e=>{e.preventDefault();if(!nativeBaseline||directPointer())return;const scale=Math.max(.001,Number.isFinite(e.scale)?e.scale:1);applyProjected(nativeBaseline,{x:nativeBaseline.x,y:nativeBaseline.y,distance:scale});},{passive:false});
  listen(canvas,'gestureend',e=>{e.preventDefault();if(nativeBaseline){nativeBaseline=null;ownership.nativeEnd(now());commit();}},{passive:false});
  listen(window,'blur',()=>clear(true));listen(document,'visibilitychange',()=>{if(document.hidden)clear(true);});
  return {cancel:clear,dispose(){clear();for(const[target,type,handler,settings]of listeners)target.removeEventListener(type,handler,settings);}};
}
