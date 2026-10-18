// Run with: node tests/navigation.cjs. Uses only Node and the vendored renderer.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const T=require('../vendor/three.min.js');
assert.equal(T.REVISION,'160');
const source=fs.readFileSync(require.resolve('../source/details/navigation.js'),'utf8');
const orbitSource=fs.readFileSync(require.resolve('../vendor/OrbitControls.js'),'utf8');
const fragment=fs.readFileSync(require.resolve('../source/second-temple.fragment.html'),'utf8');
const close=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
const vectorClose=(a,b,eps=1e-8)=>{close(a.x,b.x,eps);close(a.y,b.y,eps);close(a.z,b.z,eps);};
// Settled motion is judged at the renderer's 0.02-pixel scale, capped at 1mm.
const settledTolerance=(h,pose=h.pose)=>Math.max(1e-10,Math.min(.001,2*pose.radius*Math.tan(h.camera.getEffectiveFOV()*Math.PI/360)/h.canvas.clientHeight*.02));
let checks=0;
function test(name,run){try{run();checks++;}catch(error){error.message=`${name}: ${error.message}`;throw error;}}

// OrbitControls listens on both the canvas and its ownerDocument. This small
// DOM shim models capture/bubbling, including listener removal during reset.
class Surface {
 constructor(parent=null){this.parent=parent;this.listeners=new Map();this.style={};this.captured=new Set();this.clientWidth=800;this.clientHeight=500;}
 addEventListener(type,fn,options={}){const capture=options===true||Boolean(options?.capture),list=this.listeners.get(type)||[];if(!list.some(l=>l.fn===fn&&l.capture===capture))list.push({fn,capture});this.listeners.set(type,list);}
 removeEventListener(type,fn,options={}){const capture=options===true||Boolean(options?.capture);this.listeners.set(type,(this.listeners.get(type)||[]).filter(l=>l.fn!==fn||l.capture!==capture));}
 dispatchEvent(event){
  const path=[this];if(event.bubbles!==false)for(let p=this.parent;p;p=p.parent)path.push(p);
  event.target??=this;event.defaultPrevented=false;event.preventDefault=()=>{event.defaultPrevented=true;};event.stopPropagation=()=>{event.stopped=true;};event.stopImmediatePropagation=()=>{event.immediate=true;event.stopped=true;};
  const invoke=(node,capture)=>{event.currentTarget=node;for(const l of [...(node.listeners.get(event.type)||[])]){if(l.capture!==capture||!(node.listeners.get(event.type)||[]).includes(l))continue;l.fn.call(node,event);if(event.immediate)break;}};
  for(const node of [...path].reverse()){invoke(node,true);if(event.stopped)return !event.defaultPrevented;}
  for(const node of path){invoke(node,false);if(event.stopped)break;}
  return !event.defaultPrevented;
 }
 getBoundingClientRect(){return{left:0,top:0,width:this.clientWidth,height:this.clientHeight};}
 getRootNode(){return this.ownerDocument;}
 setPointerCapture(id){this.captured.add(id);}
 hasPointerCapture(id){return this.captured.has(id);}
 releasePointerCapture(id){this.captured.delete(id);}
 focus(){this.ownerDocument.activeElement=this;}
 count(type){return(this.listeners.get(type)||[]).length;}
}
function harness({reduced=false,floor=-10000}={}){
 let time=1000,nextTimer=0,picks=0,commits=0,starts=0,resets=0,changes=0,nav;
 const timers=new Map(),win=new Surface(),doc=new Surface(win),canvas=new Surface(doc);
 win.THREE=T;doc.ownerDocument=doc;doc.defaultView=win;doc.hidden=false;canvas.ownerDocument=doc;
 const context=vm.createContext({window:win,document:doc,performance:{now:()=>time},console,setTimeout(fn,delay){const id=++nextTimer;timers.set(id,{fn,at:time+delay});return id;},clearTimeout:id=>timers.delete(id)});
 vm.runInContext(orbitSource,context);vm.runInContext(source,context);
 const camera=new T.PerspectiveCamera(42,800/500,.002,5000),target=new T.Vector3();
 let radius=100,theta=0,phi=1;
 function project(){const c=context.templeConstrainCameraSphere({radius,phi,targetY:target.y},floor);radius=c.radius;phi=c.phi;target.y=c.targetY;camera.position.setFromSphericalCoords(radius,phi,theta).add(target);camera.lookAt(target);camera.updateMatrixWorld();}
 function accept(center){const offset=camera.position.clone().sub(center);radius=offset.length();theta=radius>1e-8?Math.atan2(offset.x,offset.z):0;phi=radius>1e-8?Math.acos(T.MathUtils.clamp(offset.y/radius,-1,1)):.025;target.copy(center);project();center.copy(target);changes++;}
 function resetPose(){radius=100;theta=0;phi=1;target.set(0,0,0);project();}
 resetPose();
 nav=context.createTempleNavigation(T,{canvas,camera,getPose:()=>({radius,theta,phi,target:target.clone()}),onStart(){starts++;},onCommit(){commits++;},onPick(){picks++;},onChangePose:accept,prefersReduced:()=>reduced,onZoom(factor){radius*=factor;project();nav.sync();},onReset(){resets++;nav.cancel();resetPose();nav.sync();}});
 const event=(type,props={},surface=canvas)=>{const e={type,bubbles:true,ctrlKey:false,metaKey:false,shiftKey:false,altKey:false,deltaMode:0,deltaX:0,deltaY:0,clientX:400,clientY:250,...props};surface.dispatchEvent(e);return e;};
 const pointer=(type,id,x,y,extra={})=>event(type,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,pageX:x,pageY:y,button:0,buttons:type==='pointerup'||type==='pointercancel'?0:1,...extra});
 const pose=()=>({radius:camera.position.distanceTo(target),theta:Math.atan2(camera.position.x-target.x,camera.position.z-target.z),phi:Math.acos(T.MathUtils.clamp((camera.position.y-target.y)/camera.position.distanceTo(target),-1,1)),target:target.clone(),eye:camera.position.clone()});
 function tick(ms){time+=ms;for(const[id,timer]of[...timers])if(timer.at<=time){timers.delete(id);timer.fn();}}
 function settle(){let quiet=0;for(let i=0;i<500;i++){const moving=nav.update();camera.updateMatrixWorld();tick(16);quiet=moving?0:quiet+1;if(quiet>=12)return;}assert.fail('Damping did not settle');}
 return{context,nav,camera,canvas,win,doc,event,pointer,tick,settle,get pose(){return pose();},get picks(){return picks;},get commits(){return commits;},get starts(){return starts;},get resets(){return resets;},get changes(){return changes;},setReduced(v){reduced=v;},setPose(p){radius=p.radius??radius;theta=p.theta??theta;phi=p.phi??phi;if(p.target)target.copy(p.target);project();nav.sync();},dispose(){nav.dispose();}};
}
const mouse=(h,type,x,y,button=0,extra={})=>h.pointer(type,1,x,y,{pointerType:'mouse',button,buttons:type==='pointerup'?0:button===1?4:button===2?2:1,...extra});
const wheel=(h,deltaY,extra={})=>h.event('wheel',{deltaY,...extra});

test('wheel zooms around a fixed target at every cursor position',()=>{
 for(const ctrlKey of[false,true]){
  const a=harness(),b=harness();a.setPose({target:new T.Vector3(4,8,-3)});b.setPose({target:new T.Vector3(4,8,-3)});
  const before=a.pose;wheel(a,-60,{ctrlKey,clientX:20,clientY:30});wheel(b,-60,{ctrlKey,clientX:780,clientY:470});
  close(a.pose.radius,100*Math.pow(.95,1.35*.60*(ctrlKey?10:1)));vectorClose(a.pose.target,before.target);vectorClose(a.pose.eye,b.pose.eye);close(a.pose.theta,before.theta);close(a.pose.phi,before.phi);
  assert.ok(a.starts>0);a.dispose();b.dispose();
 }
 const horizontal=harness();const before=horizontal.pose;horizontal.event('wheel',{deltaX:60,deltaY:0});vectorClose(horizontal.pose.target,before.target);close(horizontal.pose.radius,before.radius);horizontal.dispose();
});
test('canonical wheel pixel, line and page normalization',()=>{
 const a=harness(),b=harness(),c=harness();wheel(a,48);wheel(b,3,{deltaMode:1});wheel(c,.48,{deltaMode:2});close(a.pose.radius,b.pose.radius);close(a.pose.radius,c.pose.radius);a.dispose();b.dispose();c.dispose();
});
test('middle drag zooms; right and modifier-left dragging pan',()=>{
 const zoom=harness();const before=zoom.pose;mouse(zoom,'pointerdown',400,250,1);mouse(zoom,'pointermove',400,290,1);mouse(zoom,'pointerup',400,290,1);zoom.settle();assert.ok(zoom.pose.radius>before.radius);vectorClose(zoom.pose.target,before.target);assert.equal(zoom.picks,0);zoom.dispose();
 for(const extra of[{button:2},{shiftKey:true},{ctrlKey:true},{metaKey:true}]){
  const h=harness();const button=extra.button??0,before=h.pose;mouse(h,'pointerdown',400,250,button,extra);mouse(h,'pointermove',440,275,button,extra);mouse(h,'pointerup',440,275,button,extra);h.settle();assert.ok(h.pose.target.distanceTo(before.target)>1);close(h.pose.radius,before.radius,1e-6);close(h.pose.theta,before.theta,2e-5);assert.equal(h.picks,0);h.dispose();
 }
});
test('one-pixel pan at 5cm notifies below the stock change-event threshold',()=>{
 const h=harness();h.setPose({radius:.05});const before=h.pose,changes=h.changes;
 mouse(h,'pointerdown',400,250,2);mouse(h,'pointermove',401,250,2);
 assert.equal(h.nav.update(),true);assert.ok(h.changes>changes);
 const distance=h.pose.target.distanceTo(before.target);assert.ok(distance>1e-7&&distance<.001,`Expected sub-millimetre target movement, received ${distance}`);
 close(h.pose.radius,.05);mouse(h,'pointerup',401,250,2);h.dispose();
});
test('one finger orbits, damps and saves after settling',()=>{
 const h=harness(),before=h.pose;h.pointer('pointerdown',1,400,250);h.pointer('pointermove',1,445,270);h.pointer('pointerup',1,445,270);const release=h.pose;close(release.theta-before.theta,-2*Math.PI*.9*45/500*.08);vectorClose(release.target,before.target);h.nav.update();assert.ok(Math.abs(h.pose.theta-release.theta)>.0001);h.settle();close(h.pose.theta-before.theta,-2*Math.PI*.9*45/500,settledTolerance(h)/h.pose.radius);h.tick(300);assert.equal(h.commits,1);assert.equal(h.picks,0);const stable=h.pose;for(let i=0;i<30;i++)h.nav.update();assert.ok(h.pose.eye.distanceTo(stable.eye)<settledTolerance(h,stable),'Settled damping moved by more than 0.02 pixels / 1mm');h.dispose();
 const reduced=harness({reduced:true});reduced.pointer('pointerdown',1,400,250);reduced.pointer('pointermove',1,440,270);reduced.pointer('pointerup',1,440,270);const still=reduced.pose;for(let i=0;i<20;i++)reduced.nav.update();vectorClose(reduced.pose.eye,still.eye);reduced.dispose();
});
test('two fingers pan and pinch with canonical OrbitControls mapping',()=>{
 const pan=harness({reduced:true}),before=pan.pose;pan.pointer('pointerdown',1,300,250);pan.pointer('pointerdown',2,500,250);pan.pointer('pointermove',1,330,270);pan.pointer('pointermove',2,530,270);assert.ok(pan.pose.target.distanceTo(before.target)>1);close(pan.pose.radius,before.radius,1e-6);close(pan.pose.theta,before.theta,1e-6);close(pan.pose.phi,before.phi,1e-6);pan.pointer('pointerup',1,330,270);pan.pointer('pointerup',2,530,270);assert.equal(pan.picks,0);pan.dispose();
 for(const order of[[1,2],[2,1]]){
  const h=harness({reduced:true}),before=h.pose;h.pointer('pointerdown',1,300,250);h.pointer('pointerdown',2,500,250);for(const id of order)h.pointer('pointermove',id,id===1?200:600,250);assert.ok(h.pose.radius<before.radius*.5);close(h.pose.theta,before.theta,1e-6);close(h.pose.phi,before.phi,1e-6);for(const v of[...h.pose.eye,...h.pose.target])assert.ok(Number.isFinite(v));h.pointer('pointerup',1,200,250);const lift=h.pose;h.pointer('pointermove',2,600,250);vectorClose(h.pose.eye,lift.eye);h.pointer('pointerup',2,600,250);assert.equal(h.picks,0);h.dispose();
 }
});
test('cancel clears captures, document drag and momentum without saving',()=>{
 const h=harness();mouse(h,'pointerdown',400,250);mouse(h,'pointermove',450,280);assert.ok(h.canvas.hasPointerCapture(1));const stopped=h.pose;h.nav.cancel();assert.equal(h.canvas.captured.size,0);assert.equal(h.doc.count('pointermove'),0);assert.equal(h.doc.count('pointerup'),0);mouse(h,'pointermove',600,350);mouse(h,'pointerup',600,350);for(let i=0;i<30;i++)h.nav.update();h.tick(500);vectorClose(h.pose.eye,stopped.eye);vectorClose(h.pose.target,stopped.target);assert.equal(h.commits,0);assert.equal(h.picks,0);h.dispose();
});
test('sync preserves an external preset and flushes old damping',()=>{
 const h=harness();mouse(h,'pointerdown',400,250);mouse(h,'pointermove',450,280);mouse(h,'pointerup',450,280);h.nav.cancel();const changes=h.changes;h.setPose({radius:36,theta:.7,phi:1.6,target:new T.Vector3(-39,28,5)});const preset=h.pose;for(let i=0;i<30;i++)h.nav.update();vectorClose(h.pose.eye,preset.eye);vectorClose(h.pose.target,preset.target);assert.equal(h.changes,changes);h.tick(500);assert.equal(h.commits,0);h.dispose();
 // sync alone, without cancel, must flush pending angular/pan velocity too.
 const s=harness();mouse(s,'pointerdown',400,250);mouse(s,'pointermove',450,280);mouse(s,'pointerup',450,280);s.setPose({radius:80,theta:-.4,phi:1.2,target:new T.Vector3(2,7,11)});const synced=s.pose;for(let i=0;i<30;i++)s.nav.update();vectorClose(s.pose.eye,synced.eye);vectorClose(s.pose.target,synced.target);s.dispose();
});
test('wheel reaches 5cm and 1800m, and first reverse event responds',()=>{
 for(const ctrlKey of[false,true])for(const direction of[-1,1]){
  const h=harness();for(let i=0;i<160;i++)wheel(h,direction*200,{ctrlKey});const limit=direction<0?.05:1800;close(h.pose.radius,limit,1e-6);wheel(h,-direction*20,{ctrlKey});assert.ok(direction<0?h.pose.radius>limit:h.pose.radius<limit);h.dispose();
 }
});
test('touch pinch can inspect below 1.5m and reverse both limits',()=>{
 for(const direction of[-1,1]){
  const h=harness({reduced:true});h.setPose({radius:direction<0?.06:1700});h.pointer('pointerdown',1,300,250);h.pointer('pointerdown',2,500,250);h.pointer('pointermove',2,direction<0?1500:310,250);const limit=direction<0?.05:1800;close(h.pose.radius,limit,1e-6);h.pointer('pointermove',2,direction<0?1400:320,250);assert.ok(direction<0?h.pose.radius>limit:h.pose.radius<limit);h.pointer('pointerup',1,300,250);h.pointer('pointerup',2,direction<0?1400:320,250);h.dispose();
 }
});
test('Safari scale is centered, cumulative and never delivered twice',()=>{
 const h=harness();h.event('gesturestart',{scale:1,clientX:30,clientY:40});const target=h.pose.target;for(const scale of[1.1,1.2,1.5])h.event('gesturechange',{scale});close(h.pose.radius,100/Math.pow(1.5,1.35));vectorClose(h.pose.target,target);const radius=h.pose.radius;wheel(h,-50,{ctrlKey:true});close(h.pose.radius,radius);h.event('gestureend');wheel(h,-50,{ctrlKey:true});close(h.pose.radius,radius);h.tick(181);wheel(h,-20,{ctrlKey:true});assert.ok(h.pose.radius<radius);h.dispose();
 const wheelOwned=harness();wheel(wheelOwned,-20,{ctrlKey:true});const before=wheelOwned.pose;wheelOwned.event('gesturestart',{scale:1});wheelOwned.event('gesturechange',{scale:2});vectorClose(wheelOwned.pose.eye,before.eye);wheelOwned.tick(181);wheelOwned.event('gesturestart',{scale:1});wheelOwned.event('gesturechange',{scale:2});assert.ok(wheelOwned.pose.radius<before.radius);wheelOwned.dispose();
 const fingers=harness();fingers.pointer('pointerdown',1,400,250);const fixed=fingers.pose;wheel(fingers,-50,{ctrlKey:true});fingers.event('gesturestart',{scale:1});fingers.event('gesturechange',{scale:2});vectorClose(fingers.pose.eye,fixed.eye);fingers.pointer('pointerup',1,400,250);fingers.dispose();
});
test('native pinch reverses immediately after both clamps',()=>{
 for(const [scale,reverse,limit]of[[10000,9000,.05],[.001,.0011,1800]]){
  const h=harness();h.event('gesturestart',{scale:1});h.event('gesturechange',{scale});close(h.pose.radius,limit,1e-6);h.event('gesturechange',{scale:reverse});close(h.pose.radius,limit*Math.pow(scale/reverse,1.35),1e-6);h.dispose();
 }
});
test('keyboard zoom, reset, double click and double tap use root callbacks',()=>{
 const h=harness();const plus=h.event('keydown',{key:'+'});close(h.pose.radius,68);assert.ok(plus.defaultPrevented);h.event('keydown',{key:'-'});close(h.pose.radius,68*1.46);const before=h.pose;h.event('keydown',{key:'+',ctrlKey:true});vectorClose(h.pose.eye,before.eye);mouse(h,'pointerdown',400,250);mouse(h,'pointermove',450,280);mouse(h,'pointerup',450,280);h.event('keydown',{key:'0'});assert.equal(h.resets,1);const reset=h.pose;for(let i=0;i<30;i++)h.nav.update();vectorClose(h.pose.eye,reset.eye);close(h.pose.radius,100);h.tick(350);h.event('dblclick');assert.equal(h.resets,2);h.dispose();
 const touch=harness();touch.pointer('pointerdown',1,400,250);touch.pointer('pointerup',1,400,250);assert.equal(touch.picks,1);touch.tick(100);touch.pointer('pointerdown',2,405,253);touch.pointer('pointerup',2,405,253);assert.equal(touch.resets,1);assert.equal(touch.picks,1);touch.tick(400);touch.pointer('pointerdown',3,400,250);touch.pointer('pointermove',3,450,270);touch.pointer('pointerup',3,450,270);assert.equal(touch.picks,1);touch.dispose();
});
test('blur/hidden commit once and dispose removes input effects',()=>{
 for(const surface of['blur','hidden']){
  const h=harness();wheel(h,-50);assert.equal(h.commits,0);if(surface==='hidden'){h.doc.hidden=true;h.event('visibilitychange',{bubbles:false},h.doc);}else h.event('blur',{bubbles:false},h.win);assert.equal(h.commits,1);h.tick(500);assert.equal(h.commits,1);const fixed=h.pose;for(let i=0;i<20;i++)h.nav.update();vectorClose(h.pose.eye,fixed.eye);h.dispose();wheel(h,-50);mouse(h,'pointerdown',400,250);mouse(h,'pointermove',480,280);mouse(h,'pointerup',480,280);h.event('keydown',{key:'0'});vectorClose(h.pose.eye,fixed.eye);assert.equal(h.resets,0);
 }
});
test('camera math keeps every constrained floor feasible down to 5cm',()=>{
 const h=harness(),constrain=h.context.templeConstrainCameraSphere;
 for(const lowest of[-24.75,-14.32,1.18,8.68])for(const radius of[0,.001,.05,.1,1.5,20,1800,2000])for(const targetY of[-24,0,100])for(const phi of[-1,.025,1.5,Math.PI]){
  const r=constrain({radius,phi,targetY},lowest);assert.ok(Number.isFinite(r.radius)&&Number.isFinite(r.phi)&&Number.isFinite(r.targetY));assert.ok(r.radius>=.05&&r.radius<=1800);assert.ok(r.phi>=.025&&r.phi<=Math.PI-.035);assert.ok(r.targetY+r.radius*Math.cos(r.phi)>=lowest-1e-9);
 }
 const valid=constrain({radius:100,phi:1,targetY:12},1.18);close(valid.radius,100);close(valid.phi,1);close(valid.targetY,12);h.dispose();
 const floor=harness({floor:1.18});floor.setPose({radius:.05,phi:1.5,target:new T.Vector3(0,-5,0)});for(let i=0;i<20;i++)wheel(floor,-200);close(floor.pose.radius,.05);assert.ok(floor.camera.position.y>=1.18-1e-9);assert.ok(Number.isFinite(floor.pose.phi));floor.dispose();
});
test('5cm near clipping updates even for sub-5mm changes',()=>{
 const h=harness(),near=h.context.templeCameraNearPlane;
 for(const radius of[.05,.1,.5,1.5,10,100,1800]){const clip=near(radius);assert.ok(clip>0&&clip<radius);assert.ok(clip<=radius*.04+1e-12);}
 close(near(.05),.002);close(near(1.5),.003);close(near(1800),1.2);
 const clipUpdate=fragment.match(/const near=templeCameraNearPlane[^}]+}/)[0];let updates=0;
 const camera={near:.006,position:{distanceTo:()=>.05},updateProjectionMatrix(){updates++;}};
 vm.runInNewContext(clipUpdate,{camera,target:{},templeCameraNearPlane:near});close(camera.near,.002);assert.equal(updates,1);vm.runInNewContext(clipUpdate,{camera,target:{},templeCameraNearPlane:near});assert.equal(updates,1);h.dispose();
});
test('phone presets and saved coincident camera retain floor clearance',()=>{
 const h=harness(),start=fragment.indexOf('  const views={'),end=fragment.indexOf('  const select=',start),floors=fragment.match(/  const cameraFloors=\{[^\n]+\};/)[0];
 assert.ok(start>=0&&end>start);vm.runInContext(fragment.slice(start,end)+'\n'+floors+'\nthis.qaPresets=views;this.qaFloors=cameraFloors;',h.context);
 for(const width of[320,390]){const height=Math.max(380,Math.min(500,844*.58)),fit=Math.max(1,height/(width-24));for(const name of['approach','stoa','gateway','vault']){const p=h.context.qaPresets[name],floor=h.context.qaFloors[name],r=h.context.templeFitCameraPreset(p.eye,p.target,fit,floor);close(r.eye[1],p.eye[1]);assert.ok(r.eye[1]>=floor);for(const value of[...r.eye,...r.target])assert.ok(Number.isFinite(value));close(r.eye[0]-r.target[0],(p.eye[0]-p.target[0])*fit);close(r.eye[2]-r.target[2],(p.eye[2]-p.target[2])*fit);}}
 const sync=fragment.match(/  function syncSpherical\(\)\{[^\n]+\}/)[0],project=fragment.match(/  function cameraFromSpherical\(\)\{[^\n]+\}/)[0],camera=new T.PerspectiveCamera(),target=new T.Vector3(0,-5,0);camera.position.copy(target);
 const restored=vm.runInNewContext('let radius,theta,phi,dirty=false;'+floors+sync+project+'syncSpherical();cameraFromSpherical();({radius,theta,phi,dirty})',{camera,target,state:{view:'stoa'},templeConstrainCameraSphere:h.context.templeConstrainCameraSphere,T});
 assert.ok(Number.isFinite(restored.phi)&&Number.isFinite(restored.theta));close(restored.radius,.05);assert.ok(camera.position.y>=1.18-1e-9);assert.equal(restored.dirty,true);h.dispose();
});
console.log(`${checks} navigation checks passed with real Three.js and OrbitControls.`);
