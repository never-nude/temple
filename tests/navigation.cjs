// Run with: node tests/navigation.cjs. No browser, network or dependencies.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class V3{constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}clone(){return new V3(this.x,this.y,this.z);}set(x,y,z){Object.assign(this,{x,y,z});return this;}sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}length(){return Math.hypot(this.x,this.y,this.z);}addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this;}applyQuaternion(){return this;}}
class Canvas extends EventTarget{constructor(){super();this.ids=new Set();}getBoundingClientRect(){return{left:0,top:0,width:800,height:500};}setPointerCapture(id){this.ids.add(id);}hasPointerCapture(id){return this.ids.has(id);}releasePointerCapture(id){this.ids.delete(id);}}
const close=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
function harness(mode='trackpad'){
 let time=0,picks=0,commits=0,orbitCalls=[],pose={radius:100,theta:0,phi:1,target:new V3()},canvas=new Canvas(),win=new EventTarget(),doc=new EventTarget(),nextTimer=0;
 const timers=new Map(),setTimer=(fn,delay)=>{const id=++nextTimer;timers.set(id,{fn,at:time+delay});return id;};
 const context=vm.createContext({performance:{now:()=>time},window:win,document:doc,setTimeout:setTimer,clearTimeout:id=>timers.delete(id),console});
 vm.runInContext(fs.readFileSync(require.resolve('../source/details/navigation.js'),'utf8'),context);
 const nav=context.createTempleNavigation({Vector3:V3},{canvas,camera:{quaternion:{},getEffectiveFOV:()=>42},stage:{clientHeight:500,clientWidth:800},getMode:()=>mode,getPose:()=>({...pose,target:pose.target.clone()}),onStart(){},onCommit(){commits++;},onPick(){picks++;},orbit(dx,dy){orbitCalls.push([dx,dy]);pose.theta-=dx*.007;pose.phi-=dy*.006;},applyPose(p){pose={...pose,radius:p.radius,target:p.target.clone()};return false;}});
 const event=(type,props={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,props);canvas.dispatchEvent(e);return e;};
 const pointer=(type,id,x,y,extra={})=>event(type,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,button:0,buttons:type==='pointerup'?0:1,...extra});
 return{context,nav,event,pointer,win,doc,get pose(){return pose;},get picks(){return picks;},get commits(){return commits;},orbitCalls,tick(n){time+=n;for(const[id,timer]of[...timers])if(timer.at<=time){timers.delete(id);timer.fn();}}};
}
// Pan and zoom reach the same final pose regardless of pointer event ordering.
for(const order of [[1,2],[2,1]]){
 const h=harness();h.pointer('pointerdown',1,300,250);h.pointer('pointerdown',2,500,250);
 for(const id of order)h.pointer('pointermove',id,id===1?200:600,250);
 close(h.pose.radius,50);close(h.pose.target.x,0);close(h.pose.target.y,0);
 h.pointer('pointerup',1,200,250);h.pointer('pointermove',2,600,250);h.pointer('pointerup',2,600,250);assert.equal(h.picks,0);h.nav.dispose();
}
{
 const h=harness();h.pointer('pointerdown',1,300,250);h.pointer('pointerdown',2,500,250);h.pointer('pointermove',1,330,270);h.pointer('pointermove',2,530,270);
 close(h.pose.radius,100);close(h.pose.target.x,-4.60636842042499);close(h.pose.target.y,3.0709122802833266);h.nav.dispose();
}
// Three-to-two transition, pointer cancellation and capture loss never jump/pick.
{
 const h=harness();h.pointer('pointerdown',1,300,250);h.pointer('pointerdown',2,500,250);h.pointer('pointerdown',3,400,350);const before=h.pose;
 h.pointer('pointerup',1,300,250);h.pointer('pointermove',2,500,250);close(h.pose.radius,before.radius);close(h.pose.target.x,before.target.x);close(h.pose.target.y,before.target.y);
 h.pointer('pointercancel',2,500,250);h.pointer('lostpointercapture',2,500,250);h.pointer('pointerup',3,400,350);assert.equal(h.picks,0);h.nav.dispose();
}
// Safari cumulative scale is absolute from gesturestart, never compounded.
{
 const h=harness();h.event('gesturestart',{clientX:400,clientY:250,scale:1});
 for(const scale of [1.1,1.2,1.5])h.event('gesturechange',{scale});close(h.pose.radius,100/1.5);
 h.event('wheel',{deltaX:0,deltaY:-50,deltaMode:0,ctrlKey:true,clientX:400,clientY:250});close(h.pose.radius,100/1.5);
 h.event('gestureend',{});h.event('wheel',{deltaX:0,deltaY:-50,deltaMode:0,ctrlKey:true});close(h.pose.radius,100/1.5);h.nav.dispose();
}
// A wheel-owned pinch ignores duplicate native gesture delivery.
{
 const h=harness();h.event('wheel',{deltaX:0,deltaY:-Math.log(2)*100,deltaMode:0,ctrlKey:true,clientX:400,clientY:250});close(h.pose.radius,50);
 h.event('gesturestart',{scale:1});h.event('gesturechange',{scale:2});close(h.pose.radius,50);h.nav.dispose();
}
// Native pinch reversal responds immediately after either radius limit.
for(const [scale,reverse,limit]of [[100,99,1.5],[.01,.011,1800]]){
 const h=harness();h.event('gesturestart',{clientX:400,clientY:250,scale:1});h.event('gesturechange',{scale});close(h.pose.radius,limit);
 h.event('gesturechange',{scale:reverse});close(h.pose.radius,limit*scale/reverse);
 assert.ok(limit===1.5?h.pose.radius>limit:h.pose.radius<limit);h.nav.dispose();
}
// Ordinary wheel pans on a trackpad and zooms in Mouse mode; units normalize.
{
 const p=harness();p.event('wheel',{deltaX:30,deltaY:20,deltaMode:0,ctrlKey:false});close(p.pose.radius,100);assert.ok(p.pose.target.x>0&&p.pose.target.y<0);p.nav.dispose();
 const m=harness('mouse');m.event('wheel',{deltaX:0,deltaY:120,deltaMode:0,ctrlKey:false,clientX:400,clientY:250});assert.ok(m.pose.radius>100);close(m.pose.target.x,0);m.nav.dispose();
 const h=harness();const a=h.context.templeWheelPixels({deltaX:0,deltaY:48,deltaMode:0},500),b=h.context.templeWheelPixels({deltaX:0,deltaY:3,deltaMode:1},500);close(a.y,b.y);
 const page=h.context.templeWheelPixels({deltaX:.5,deltaY:.5,deltaMode:2},500,800);close(page.x,400);close(page.y,250);h.nav.dispose();
}
// Mouse right/middle dragging pans and never picks a landmark.
for(const [button,buttons]of [[1,4],[2,2]]){
 const h=harness('mouse');h.pointer('pointerdown',1,400,250,{pointerType:'mouse',button,buttons});h.pointer('pointermove',1,420,250,{pointerType:'mouse',button,buttons});h.pointer('pointerup',1,420,250,{pointerType:'mouse',button,buttons:0});assert.ok(h.pose.target.x<0);assert.equal(h.picks,0);h.nav.dispose();
}
// Clear on blur and viewpoint cancellation; stray moves cannot alter the view.
{
 const h=harness();h.pointer('pointerdown',1,400,250);h.nav.cancel();h.pointer('pointermove',1,500,300);assert.equal(h.orbitCalls.length,0);h.nav.dispose();
 const r=h.context.templeGestureProjection({radius:100,distance:0,x:0,y:0,centerX:0,centerY:0,height:0,fov:42},{distance:0,x:0,y:0});assert.ok(Number.isFinite(r.radius)&&Number.isFinite(r.right)&&Number.isFinite(r.up));
}
// Interrupted changes are saved once; preset cancellation never saves stale pose.
{
 const h=harness();h.event('wheel',{deltaX:30,deltaY:20,deltaMode:0,ctrlKey:false});assert.equal(h.commits,0);h.win.dispatchEvent(new Event('blur'));assert.equal(h.commits,1);h.tick(300);assert.equal(h.commits,1);h.win.dispatchEvent(new Event('blur'));assert.equal(h.commits,1);h.nav.dispose();
 const p=harness();p.pointer('pointerdown',1,400,250);p.pointer('pointermove',1,430,270);p.doc.hidden=true;p.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(p.commits,1);const calls=p.orbitCalls.length;p.pointer('pointermove',1,460,280);assert.equal(p.orbitCalls.length,calls);p.pointer('pointerup',1,460,280);assert.equal(p.picks,0);assert.equal(p.commits,1);p.nav.dispose();
 const cancelled=harness();cancelled.event('wheel',{deltaX:30,deltaY:20,deltaMode:0,ctrlKey:false});cancelled.nav.cancel();cancelled.tick(300);assert.equal(cancelled.commits,0);cancelled.nav.dispose();
}
// A floor remains reachable after near-floor pan/zoom, never an inverted clamp.
{
 const h=harness(),constrain=h.context.templeConstrainCameraSphere;
 const p=constrain({radius:1.5,phi:1.5,targetY:-5},1.18);assert.ok(p.targetY+p.radius*Math.cos(p.phi)>=1.18-1e-9);assert.ok(p.phi>=.025);
 const valid=constrain({radius:100,phi:1,targetY:12},1.18);close(valid.radius,100);close(valid.phi,1);close(valid.targetY,12);
 for(const lowest of[-24.75,-14.32,1.18,8.68])for(const radius of[.1,1.5,20,1800,2000])for(const targetY of[-24,0,100])for(const phi of[-1,.025,1.5,Math.PI]){
  const r=constrain({radius,phi,targetY},lowest);assert.ok(Number.isFinite(r.radius)&&Number.isFinite(r.phi)&&Number.isFinite(r.targetY));assert.ok(r.radius>=1.5&&r.radius<=1800);assert.ok(r.phi>=.025&&r.phi<=Math.PI-.035);assert.ok(r.targetY+r.radius*Math.cos(r.phi)>=lowest-1e-9);
 }
 h.nav.dispose();
}
// Actual low-view presets retain their eye heights when fitted to phone ratios.
{
 const h=harness(),fragment=fs.readFileSync(require.resolve('../source/second-temple.fragment.html'),'utf8');
 const start=fragment.indexOf('  const views={'),end=fragment.indexOf('  const select=',start);
 assert.ok(start>=0&&end>start);const floors=fragment.match(/  const cameraFloors=\{[^\n]+\};/)[0];
 vm.runInContext(fragment.slice(start,end)+'\n'+floors+'\nthis.qaPresets=views;this.qaFloors=cameraFloors;',h.context);
 for(const width of[320,390]){
  const height=Math.max(380,Math.min(500,844*.58)),fit=Math.max(1,height/(width-24));
  for(const name of['approach','stoa','gateway','vault']){
   const preset=h.context.qaPresets[name],floor=h.context.qaFloors[name],r=h.context.templeFitCameraPreset(preset.eye,preset.target,fit,floor);
   close(r.eye[1],preset.eye[1]);assert.ok(r.eye[1]>=floor);for(const value of [...r.eye,...r.target])assert.ok(Number.isFinite(value));
   close(r.eye[0]-r.target[0],(preset.eye[0]-preset.target[0])*fit);close(r.eye[2]-r.target[2],(preset.eye[2]-preset.target[2])*fit);
  }
 }
 // Exercise the actual restoration math with a coincident, underground pose.
 const sync=fragment.match(/  function syncSpherical\(\)\{[^\n]+\}/)[0],project=fragment.match(/  function cameraFromSpherical\(\)\{[^\n]+\}/)[0];
 const camera={position:new V3(0,-5,0),lookAt(){}},target=new V3(0,-5,0);
 const restored=vm.runInNewContext('let radius,theta,phi,dirty=false;'+floors+sync+project+'syncSpherical();cameraFromSpherical();({radius,theta,phi,dirty})',{camera,target,state:{view:'stoa'},templeConstrainCameraSphere:h.context.templeConstrainCameraSphere,T:{MathUtils:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v))}}});
 assert.ok(Number.isFinite(restored.phi)&&Number.isFinite(restored.theta));close(restored.radius,1.5);assert.ok(camera.position.y>=1.18-1e-9);assert.equal(restored.dirty,true);h.nav.dispose();
}
console.log('Navigation invariants and event-sequence checks passed.');
