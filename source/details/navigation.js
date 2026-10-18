/* Atrium interaction settings, with the temple’s metre-scale inspection limits. */
const TEMPLE_CAMERA_LIMITS=Object.freeze({min:.05,max:1800,minPhi:.025,maxPhi:Math.PI-.035});
// Millimetre near clipping keeps carvings visible at the closest inspection scale.
function templeCameraNearPlane(radius){return Math.max(.002,Math.min(1.2,radius*.002));}
// Make the floor constraint feasible even after panning the orbit target below
// the floor and then zooming in. The polar interval must never be inverted.
function templeConstrainCameraSphere(pose, lowest, limits=TEMPLE_CAMERA_LIMITS) {
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
const TEMPLE_ATRIUM_CONTROLS=Object.freeze({damping:.08,rotateSpeed:.9,zoomSpeed:1.35,zoomIn:.68,zoomOut:1.46});
function createTempleNavigation(T,options) {
  const {canvas,camera}=options,listeners=[],points=new Set();
  let controls,disposed=false,suppressed=false,changed=false,commitTimer=null,tap=null,lastTap=null;
  let nativeActive=false,nativeScale=1,nativeUntil=0,lastPinchWheel=-Infinity,lastReset=-Infinity;
  const reportedPosition=new T.Vector3(),reportedTarget=new T.Vector3();
  const reportPose=()=>{reportedPosition.copy(camera.position);reportedTarget.copy(controls.target);};
  const now=()=>performance.now();
  const listen=(target,type,fn,settings)=>{target.addEventListener(type,fn,settings);listeners.push([target,type,fn,settings]);};
  function commit(){clearTimeout(commitTimer);commitTimer=null;if(changed){changed=false;options.onCommit();}}
  function changedPose(){
    if(suppressed||disposed)return;
    options.onChangePose(controls.target);reportPose();changed=true;
    clearTimeout(commitTimer);commitTimer=setTimeout(commit,220);
  }
  function sync(){
    if(disposed)return;
    const position=camera.position.clone(),center=options.getPose().target.clone(),damping=controls.enableDamping;
    suppressed=true;
    try{
      controls.enableDamping=false;controls.update();
      camera.position.copy(position);controls.target.copy(center);controls.update();
    }finally{controls.enableDamping=damping;suppressed=false;reportPose();}
  }
  function makeControls(){
    const position=camera.position.clone(),center=options.getPose().target.clone();
    controls=new T.OrbitControls(camera,canvas);
    controls.enableDamping=!options.prefersReduced?.();controls.dampingFactor=TEMPLE_ATRIUM_CONTROLS.damping;
    controls.enablePan=true;controls.screenSpacePanning=true;controls.zoomToCursor=false;
    controls.rotateSpeed=TEMPLE_ATRIUM_CONTROLS.rotateSpeed;controls.zoomSpeed=TEMPLE_ATRIUM_CONTROLS.zoomSpeed;
    controls.minDistance=TEMPLE_CAMERA_LIMITS.min;controls.maxDistance=TEMPLE_CAMERA_LIMITS.max;
    controls.minPolarAngle=TEMPLE_CAMERA_LIMITS.minPhi;controls.maxPolarAngle=TEMPLE_CAMERA_LIMITS.maxPhi;
    controls.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.PAN};
    controls.touches={ONE:T.TOUCH.ROTATE,TWO:T.TOUCH.DOLLY_PAN};
    camera.position.copy(position);controls.target.copy(center);controls.update();
    controls.addEventListener('start',()=>options.onStart());controls.addEventListener('change',changedPose);reportPose();
  }
  function cancel(){
    if(disposed)return;
    clearTimeout(commitTimer);commitTimer=null;changed=false;nativeActive=false;nativeUntil=0;lastPinchWheel=-Infinity;
    controls.dispose();
    for(const id of points)try{if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}catch(e){}
    points.clear();tap=null;lastTap=null;makeControls();
  }
  function reset(){if(now()-lastReset<300)return;lastReset=now();options.onReset();}
  // Tap picking and reset are separate from OrbitControls' camera movement.
  // Capture listeners also prevent a duplicate native pinch stream reaching it.
  listen(canvas,'pointerdown',e=>{
    points.add(e.pointerId);options.onInput?.(e.pointerType==='touch'?'touch':'pointer');canvas.focus?.({preventScroll:true});
    if(points.size===1)tap={id:e.pointerId,x:e.clientX,y:e.clientY,time:now(),type:e.pointerType,button:e.button,moved:false,multiple:false};
    else if(tap){tap.multiple=true;lastTap=null;}
  },true);
  listen(canvas,'pointermove',e=>{if(tap&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>4){tap.moved=true;lastTap=null;}},true);
  listen(canvas,'pointerup',e=>{
    points.delete(e.pointerId);
    if(tap&&tap.id===e.pointerId&&!tap.moved&&!tap.multiple&&(tap.type!=='mouse'||tap.button===0)&&now()-tap.time<600){
      if(tap.type==='touch'&&lastTap&&now()-lastTap.time<350&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<24){lastTap=null;reset();}
      else{if(tap.type==='touch')lastTap={time:now(),x:e.clientX,y:e.clientY};options.onPick(e);}
    }
    if(points.size===0)tap=null;
  },true);
  listen(canvas,'pointercancel',e=>{points.delete(e.pointerId);tap=null;lastTap=null;},true);
  listen(canvas,'dblclick',e=>{e.preventDefault();reset();});
  listen(canvas,'keydown',e=>{
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key==='+'||e.key==='='){e.preventDefault();options.onZoom(TEMPLE_ATRIUM_CONTROLS.zoomIn);}
    else if(e.key==='-'||e.key==='_'){e.preventDefault();options.onZoom(TEMPLE_ATRIUM_CONTROLS.zoomOut);}
    else if(e.key==='0'){e.preventDefault();reset();}
  });
  listen(canvas,'wheel',e=>{
    if(nativeActive||now()<nativeUntil||points.size>0){e.preventDefault();e.stopImmediatePropagation();return;}
    options.onInput?.('pointer');if(e.ctrlKey)lastPinchWheel=now();
  },{capture:true,passive:false});
  // Safari may emit gesture events instead of ctrl-wheel. Keep the same
  // centered scale^1.35 zoom as Atrium and accept only one native stream.
  listen(canvas,'gesturestart',e=>{
    e.preventDefault();if(points.size>0||now()-lastPinchWheel<180)return;
    options.onStart();options.onInput?.('pointer');sync();nativeActive=true;nativeScale=Number.isFinite(e.scale)?Math.max(.001,e.scale):1;
  },{passive:false});
  listen(canvas,'gesturechange',e=>{
    e.preventDefault();if(!nativeActive)return;
    const scale=Number.isFinite(e.scale)?Math.max(.001,e.scale):1,factor=Math.pow(nativeScale/scale,TEMPLE_ATRIUM_CONTROLS.zoomSpeed);
    nativeScale=scale;
    const offset=camera.position.clone().sub(controls.target),length=offset.length();
    const distance=Math.max(TEMPLE_CAMERA_LIMITS.min,Math.min(TEMPLE_CAMERA_LIMITS.max,length*factor));
    if(length>1e-8)camera.position.copy(controls.target).addScaledVector(offset,distance/length);
    controls.update();
  },{passive:false});
  listen(canvas,'gestureend',e=>{e.preventDefault();if(nativeActive){nativeActive=false;nativeUntil=now()+180;commit();}},{passive:false});
  listen(window,'blur',()=>{commit();cancel();});
  listen(document,'visibilitychange',()=>{if(document.hidden){commit();cancel();}});
  canvas.tabIndex=0;makeControls();
  return {cancel,sync,update(){if(!disposed){controls.enableDamping=!options.prefersReduced?.();const updated=controls.update();
    // Stock change events have a 1mm position threshold. Our dirty renderer
    // also tracks submillimetre movement, which is many pixels in a 5cm view.
    const epsilon=Math.max(1e-10,Math.min(.001,2*camera.position.distanceTo(controls.target)*Math.tan(camera.getEffectiveFOV()*Math.PI/360)/Math.max(1,canvas.clientHeight)*.02));
    if(camera.position.distanceToSquared(reportedPosition)>epsilon*epsilon||controls.target.distanceToSquared(reportedTarget)>epsilon*epsilon){changedPose();return true;}return updated;}},dispose(){if(disposed)return;disposed=true;clearTimeout(commitTimer);controls.dispose();for(const[target,type,fn,settings]of listeners)target.removeEventListener(type,fn,settings);points.clear();}};
}
