/* Sculptural colonnades for the Herodian-period interpretive reconstruction.
 * Jerusalem's smooth-leaf Corinthian morphology, two crowns of eight leaves,
 * and Attic bases with two tori inform these details. Sources: the discussion
 * and opposing addenda in IMSA 8 (2016–17), pp. 74–95, particularly pp.90,92,94.
 * The Royal Stoa attribution and exact capital form remain interpretive.
 * Run after enhanceTempleArchitecture; all units are metres. */
function enrichTempleColonnades(T, ctx) {
  const { world, mats, instance } = ctx;
  if (world.userData.colonnadeDetailV2) return world.userData.colonnadeDetailV2;
  const initial = [];
  world.traverse(o => { if (o.isMesh) initial.push(o); });
  const tris = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
  const countObject = o => tris(o.geometry) * (o.isInstancedMesh ? o.count : 1);
  const before = initial.reduce((n,o) => n + countObject(o),0);
  const matrix = new T.Matrix4(), position = new T.Vector3(), rotation = new T.Quaternion(), scale = new T.Vector3();
  const columns = [];
  const oldNames = new Set(['Tapered limestone shafts with carved flutes','Curved ribbed acanthus leaves','Turned torus and scotia base moldings','Sculpted Corinthian capital bells','Corinthian capital corner scrolls']);
  const batch = (parent,g,material,entries,name) => {
    if (!entries.length) return null;
    const m = instance(parent,g,material,entries); m.name=name;
    m.instanceMatrix.needsUpdate=true; m.computeBoundingSphere(); return m;
  };
  function mergeParts(parts) {
    const positions=[],normals=[],uvs=[];
    for(const {geometry,transform} of parts){
      const g=geometry.index?geometry.toNonIndexed():geometry.clone();
      if(transform)g.applyMatrix4(transform);
      if(!g.attributes.normal)g.computeVertexNormals();
      const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;
      for(let i=0;i<p.count;i++){
        positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));
        uvs.push(u?u.getX(i):0,u?u.getY(i):0);
      }
      g.dispose();
    }
    const out=new T.BufferGeometry();
    out.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    out.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
    out.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));out.computeBoundingSphere();out.computeBoundingBox();
    return out;
  }
  function transform(x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1){
    const o=new T.Object3D();o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.scale.set(sx,sy,sz);o.updateMatrix();return o.matrix;
  }
  function lathe(profile,segments){return new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),segments);}
  const quality={
    high:{shaftR:72,shaftY:8,flutes:24,leafU:9,leafV:8,latheR:32,voluteU:20,voluteV:5,abacus:8},
    medium:{shaftR:48,shaftY:4,flutes:16,leafU:5,leafV:5,latheR:20,voluteU:12,voluteV:4,abacus:4},
    low:{shaftR:24,shaftY:2,flutes:12,leafU:3,leafV:3,latheR:10,voluteU:5,voluteV:3,abacus:2}
  };
  const baseProfile=[
    [1.27,.245],[1.32,.265],[1.37,.305],[1.395,.365],[1.39,.425],[1.35,.48],
    [1.29,.51],[1.26,.535],[1.14,.57],[1.065,.625],[1.025,.69],[1.025,.74],
    [1.065,.795],[1.14,.84],[1.195,.875],[1.225,.93],[1.22,.985],[1.19,1.035],
    [1.13,1.07],[1.075,1.09],[1.03,1.115],[1.0,1.16]
  ];
  const bellProfile=[[.83,0],[.84,.08],[.845,.22],[.87,.45],[.94,.74],[1.025,1.02],[1.1,1.32],[1.15,1.56],[1.2,1.79]];

  // These are closed, thick, curled stone leaves. The oval section wraps a
  // curved centerline; the back and rounded margins are modeled as well as
  // the gently raised central rib. Smooth margins avoid generic serrated
  // foliage that would obscure the characteristic Jerusalem treatment.
  function smoothLeaf(q,height,width,curl=.40,flare=.21){
    const p=[],uv=[],indices=[];
    const center=t=>{
      const a=1-t;
      return {y:height*(3*a*a*t*.72+3*a*t*t*1.15+t*t*t*.95),
        z:3*a*a*t*(-.03)+3*a*t*t*.16+t*t*t*curl+flare*t*(1-t*.5),
        dy:height*(3*a*a*.72+6*a*t*(1.15-.72)+3*t*t*(.95-1.15)),
        dz:3*a*a*(-.03)+6*a*t*(.16+.03)+3*t*t*(curl-.16)+flare*(1-t)};
    };
    for(let i=0;i<=q.leafU;i++){
      const t=i/q.leafU,c=center(t),inv=1/Math.hypot(c.dy,c.dz),ny=-c.dz*inv,nz=c.dy*inv;
      const envelope=Math.pow(Math.max(0,Math.sin(Math.PI*t)),.72);
      const w=Math.max(.004,width*envelope),thick=.045*(.3+.7*envelope);
      for(let j=0;j<=q.leafV;j++){
        const a=j/q.leafV*Math.PI*2,sn=Math.sin(a),cs=Math.cos(a);
        const rib=.035*Math.pow(Math.max(0,cs),5)*envelope;
        const normal=(cs*thick+rib);
        p.push(sn*w,c.y+ny*normal,c.z+nz*normal);uv.push(j/q.leafV,t);
      }
    }
    const stride=q.leafV+1;
    for(let i=0;i<q.leafU;i++)for(let j=0;j<q.leafV;j++){
      const a=i*stride+j,b=a+stride;indices.push(a,a+1,b,a+1,b+1,b);
    }
    // Root and tip caps are independent rings, making the leaf a true solid.
    const rootCenter=p.length/3;p.push(0,0,0);uv.push(.5,0);
    const tip=center(1),tipCenter=p.length/3;p.push(0,tip.y,tip.z);uv.push(.5,1);
    for(let j=0;j<q.leafV;j++){indices.push(rootCenter,j+1,j);const a=q.leafU*stride+j;indices.push(tipCenter,a,a+1);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
    // Keep the UV seam smooth; it is not a visible crease in carved stone.
    const n=g.attributes.normal;
    for(let row=0;row<=q.leafU;row++){const a=row*stride,b=a+q.leafV,v=new T.Vector3(n.getX(a)+n.getX(b),n.getY(a)+n.getY(b),n.getZ(a)+n.getZ(b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}
    return g;
  }
  function shaftGeometry(q,height){
    const p=[],uv=[],index=[],stride=q.shaftR+1;
    for(let row=0;row<=q.shaftY;row++){
      const t=row/q.shaftY,bodyRadius=1-.18*t+.026*Math.sin(Math.PI*t);
      for(let j=0;j<=q.shaftR;j++){
        const a=j/q.shaftR*Math.PI*2;
        const flute=.028*(.5+.5*Math.cos(a*q.flutes));
        const r=bodyRadius*(1-flute);
        p.push(Math.sin(a)*r,t*height,Math.cos(a)*r);uv.push(j/q.shaftR,t);
      }
    }
    for(let row=0;row<q.shaftY;row++)for(let j=0;j<q.shaftR;j++){const a=row*stride+j,b=a+stride;index.push(a,a+1,b,b,a+1,b+1);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();
    const n=g.attributes.normal;
    for(let row=0;row<=q.shaftY;row++){const a=row*stride,b=a+q.shaftR,v=new T.Vector3(n.getX(a)+n.getX(b),n.getY(a)+n.getY(b),n.getZ(a)+n.getZ(b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}
    return g;
  }
  // A concave four-sided abacus is swept through a cyma/ovolo section. It has
  // actual cut corners and a recessed face rather than stacked square slabs.
  function abacusGeometry(q){
    const detail=q===quality.high?'high':q===quality.medium?'medium':'low';
    const section=detail==='high'?[[0,1.79],[.0,1.82],[.045,1.86],[.058,1.90],[.045,1.93],[.025,1.955],[.025,1.99],[.085,2.015],[.112,2.065],[.116,2.115],[.10,2.16]]:
      detail==='medium'?[[0,1.79],[.055,1.88],[.025,1.955],[.085,2.015],[.115,2.10],[.10,2.16]]:[[0,1.79],[.045,1.94],[.115,2.10],[.10,2.16]];
    const contour=[];
    for(let side=0;side<4;side++)for(let j=0;j<=q.abacus;j++){
      const t=j/q.abacus,x=-1.36+.10+t*(2.72-.20),z=-1.36+.22*Math.sin(Math.PI*t);
      const a=side*Math.PI/2;contour.push([x*Math.cos(a)-z*Math.sin(a),x*Math.sin(a)+z*Math.cos(a)]);
    }
    const p=[],uv=[],index=[],count=contour.length;
    for(const [outset,y]of section)for(const[x,z]of contour){const f=(1.36+outset)/1.36;p.push(x*f,y,z*f);uv.push(x,z);}
    for(let row=0;row<section.length-1;row++)for(let j=0;j<count;j++){const k=(j+1)%count,a=row*count+j,b=row*count+k,c=a+count,d=b+count;index.push(a,c,b,b,c,d);}
    const bottomCenter=p.length/3;p.push(0,section[0][1],0);uv.push(.5,.5);
    const topCenter=p.length/3;p.push(0,section.at(-1)[1],0);uv.push(.5,.5);
    const top=(section.length-1)*count;
    for(let j=0;j<count;j++){const k=(j+1)%count;index.push(bottomCenter,j,k,topCenter,top+k,top+j);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return g;
  }
  function spiral(q,small=false){
    const points=[],radius=small?.16:.29,cy=small?1.69:1.62,radial=small?1.18:1.29;
    if(!small){points.push(new T.Vector3(-.17,.94,1.03),new T.Vector3(-.07,1.21,1.17));}
    const samples=q.voluteU;
    for(let i=0;i<=samples;i++){
      const t=i/samples,a=-Math.PI/2+t*Math.PI*2.35,r=.025+radius*Math.pow(1-t,.80);
      points.push(new T.Vector3(Math.cos(a)*r,cy+Math.sin(a)*r,radial+.06*t));
    }
    const curve=new T.CatmullRomCurve3(points);
    // Angularly spaced spiral controls need parameter-space sampling. Uniform
    // arc-length sampling spends most vertices on the outer sweep and leaves
    // a visibly polygonal inner eye, even at the high-detail setting.
    curve.getPointAt=function(u,target){return this.getPoint(u,target);};
    curve.getTangentAt=function(u,target){return this.getTangent(u,target);};
    const g=new T.TubeGeometry(curve,q.voluteU,small?.035:.052,q.voluteV,false);
    // Close the stone scrolls. Uncapped tubes would read as hollow pipes when
    // the spiral eye is inspected from the side.
    const p=Array.from(g.attributes.position.array),n=Array.from(g.attributes.normal.array),uv=Array.from(g.attributes.uv.array),index=Array.from(g.index.array),stride=q.voluteV+1;
    for(const end of [0,1]){
      const c=curve.getPointAt(end),normal=curve.getTangentAt(end).multiplyScalar(end?1:-1),center=p.length/3,offset=end?q.voluteU*stride:0;
      p.push(c.x,c.y,c.z);n.push(normal.x,normal.y,normal.z);uv.push(.5,.5);
      const a=new T.Vector3().fromArray(p,offset*3).sub(c),b=new T.Vector3().fromArray(p,(offset+1)*3).sub(c),forward=a.cross(b).dot(normal)>0;
      for(let j=0;j<q.voluteV;j++)if(forward)index.push(center,offset+j,offset+j+1);else index.push(center,offset+j+1,offset+j);
    }
    g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);return g;
  }
  function plinth(q){
    if(q===quality.low)return new T.BoxGeometry(2.8,.245,2.8).translate(0,.1225,0);
    const s=new T.Shape(),a=1.4,r=.045;
    s.moveTo(-a+r,-a);s.lineTo(a-r,-a);s.quadraticCurveTo(a,-a,a,-a+r);s.lineTo(a,a-r);s.quadraticCurveTo(a,a,a-r,a);s.lineTo(-a+r,a);s.quadraticCurveTo(-a,a,-a,a-r);s.lineTo(-a,-a+r);s.quadraticCurveTo(-a,-a,-a+r,-a);
    const g=new T.ExtrudeGeometry(s,{depth:.20,bevelEnabled:true,bevelSegments:q===quality.high?3:2,steps:1,bevelSize:.018,bevelThickness:.018,curveSegments:q===quality.high?4:2});
    g.rotateX(-Math.PI/2);g.translate(0,.022,0);return g;
  }
  const templateCache=new Map();
  function columnTemplate(q,capitalTop){
    const key=Object.keys(quality).find(k=>quality[k]===q)+':'+capitalTop.toFixed(6);
    if(templateCache.has(key))return templateCache.get(key);
    const capY=capitalTop-2.16,shaftY=1.12,shaftHeight=capY-shaftY+.025;
    const parts=[],owned=new Set();
    const add=(g,m)=>{parts.push({geometry:g,transform:m});owned.add(g);};
    add(plinth(q));
    const bp=q===quality.low?baseProfile.filter((_,i)=>[0,2,5,9,12,16,21].includes(i)):q===quality.medium?baseProfile.filter((_,i)=>i%2===0||i===21):baseProfile;
    add(lathe(bp,q.latheR));
    add(shaftGeometry(q,shaftHeight),transform(0,shaftY,0));
    const bell=q===quality.low?bellProfile.filter((_,i)=>[0,3,6,8].includes(i)):bellProfile;
    add(lathe(bell,q===quality.low?8:q.latheR),transform(0,capY,0));
    // Two narrow astragals articulate the shaft/capital joint.
    const neck=q===quality.low?[[.83,-.03],[.855,.015],[.835,.075]]:[[.83,-.055],[.84,-.035],[.86,.005],[.855,.035],[.835,.06],[.83,.10]];
    add(lathe(neck,q===quality.low?8:q.latheR),transform(0,capY,0));
    const lower=smoothLeaf(q,1.10,.36,.41,.21),upper=smoothLeaf(q,1.32,.39,.42,.43);
    for(let crown=0;crown<2;crown++)for(let j=0;j<8;j++){
      const angle=j*Math.PI/4+crown*Math.PI/8,r=crown?.87:.81,y=capY+(crown?.40:.055);
      parts.push({geometry:crown?upper:lower,transform:transform(Math.sin(angle)*r,y,Math.cos(angle)*r,0,angle)});
    }
    owned.add(lower);owned.add(upper);
    const large=spiral(q,false);owned.add(large);
    for(let j=0;j<4;j++)parts.push({geometry:large,transform:transform(0,capY,0,0,Math.PI/4+j*Math.PI/2)});
    if(q!==quality.low){const small=spiral(q,true);owned.add(small);for(let j=0;j<4;j++)parts.push({geometry:small,transform:transform(0,capY,0,0,j*Math.PI/2)});}
    add(abacusGeometry(q),transform(0,capY,0));
    const g=mergeParts(parts);g.name='Smooth-leaf Corinthian column — '+key;
    for(const ownedGeometry of owned)ownedGeometry.dispose();templateCache.set(key,g);return g;
  }

  // All columns share three instanced detail tiers per architectural parent.
  // A camera hook selects the nearest sculptures without one draw per column.
  const shaftGroups=[];
  const tierKeys=['high','medium','low'];
  const shafts=initial.filter(m=>m.isInstancedMesh&&m.name==='Tapered limestone shafts with carved flutes');
  let allLowTriangles=0;
  for(const old of shafts){
    const parent=old.parent,id=parent.userData.landmark,specs=[];
    for(let i=0;i<old.count;i++){
      old.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
      const r=scale.x,h=scale.y+1.3,base=position.y-h/2,top=h+(id==='stoa'?-.35:id==='women'?.18:-.10);
      const spec={id:columns.length,x:position.x,z:position.z,base,r,h,top,parent,worldCenter:new T.Vector3(),distance2:Infinity};
      spec.localMatrix=transform(spec.x,spec.base,spec.z,0,0,0,r,r,r);
      specs.push(spec);columns.push(spec);
    }
    for(const o of [...parent.children]){
      if(oldNames.has(o.name)){parent.remove(o);continue;}
      if(!o.isInstancedMesh||o.count!==old.count)continue;
      o.getMatrixAt(0,matrix);matrix.decompose(position,rotation,scale);
      const first=specs[0];
      const isBase=Math.abs(scale.y-.32)<.01&&Math.abs(position.y-(first.base+.16))<.02;
      const isAbacus=Math.abs(scale.y-.3)<.01&&Math.abs(position.y-(first.base+first.h-.15))<.02;
      if(isBase||isAbacus)parent.remove(o);
    }
    const first=specs[0],capTop=first.top/first.r,state={parent,specs,meshes:{},membership:{high:[],medium:[],low:specs.map(s=>s.id)},worldMatrix:new T.Matrix4()};
    parent.updateWorldMatrix(true,false);state.worldMatrix.copy(parent.matrixWorld);
    for(const spec of specs)spec.worldCenter.set(spec.x,spec.base+spec.top/2,spec.z).applyMatrix4(parent.matrixWorld);
    for(const key of tierKeys){
      const geometry=columnTemplate(quality[key],capTop),capacity=key==='high'?Math.min(32,specs.length):specs.length;
      const m=new T.InstancedMesh(geometry,mats.stoneLight,capacity);m.name='Instanced volumetric Corinthian colonnade — '+key;
      m.userData.templeColumnBatch=true;m.userData.detailTier=key;m.castShadow=m.receiveShadow=true;
      m.count=key==='low'?specs.length:0;m.visible=m.count>0;
      if(key==='low'){for(let i=0;i<specs.length;i++)m.setMatrixAt(i,specs[i].localMatrix);m.instanceMatrix.needsUpdate=true;m.computeBoundingBox();m.computeBoundingSphere();allLowTriangles+=tris(geometry)*specs.length;}
      else{m.boundingSphere=new T.Sphere(new T.Vector3(),0);m.boundingBox=new T.Box3(new T.Vector3(),new T.Vector3());}
      state.meshes[key]=m;parent.add(m);
    }
    shaftGroups.push(state);
  }
  const lastCameraPosition=new T.Vector3(Infinity,Infinity,Infinity),cameraPosition=new T.Vector3();
  const activeDetail={high:0,medium:0,low:columns.length,activeTriangles:allLowTriangles,changed:false,changedBatches:0,boundingSpheresFinite:true};
  let result;
  function updateTempleColumnDetail(camera){
    activeDetail.changed=false;activeDetail.changedBatches=0;
    if(!camera?.isCamera)return activeDetail;
    camera.getWorldPosition(cameraPosition);
    let transformed=false;
    // Only the five shaft parents are visited; the full scene is not traversed.
    for(const state of shaftGroups){
      state.parent.updateWorldMatrix(true,false);
      if(!state.worldMatrix.equals(state.parent.matrixWorld)){
        transformed=true;state.worldMatrix.copy(state.parent.matrixWorld);
        for(const spec of state.specs)spec.worldCenter.set(spec.x,spec.base+spec.top/2,spec.z).applyMatrix4(state.parent.matrixWorld);
      }
    }
    if(!transformed&&cameraPosition.equals(lastCameraPosition))return activeDetail;
    lastCameraPosition.copy(cameraPosition);
    activeDetail.changed=transformed;
    const near=[];
    for(const spec of columns){spec.distance2=spec.worldCenter.distanceToSquared(cameraPosition);if(spec.distance2<45*45)near.push(spec);}
    near.sort((a,b)=>a.distance2-b.distance2||a.id-b.id);
    const highIds=new Set(near.slice(0,32).map(s=>s.id));
    let high=0,medium=0,low=0,activeTriangles=0,boundsFinite=true;
    for(const state of shaftGroups){
      const members={high:[],medium:[],low:[]};
      for(const spec of state.specs){const key=highIds.has(spec.id)?'high':spec.distance2<110*110?'medium':'low';members[key].push(spec);}
      for(const key of tierKeys){
        const chosen=members[key],previous=state.membership[key],mesh=state.meshes[key];
        const changed=previous.length!==chosen.length||chosen.some((s,i)=>s.id!==previous[i]);
        if(changed){
          state.membership[key]=chosen.map(s=>s.id);mesh.count=chosen.length;mesh.visible=chosen.length>0;
          for(let i=0;i<chosen.length;i++)mesh.setMatrixAt(i,chosen[i].localMatrix);
          mesh.instanceMatrix.needsUpdate=true;
          if(chosen.length){mesh.computeBoundingBox();mesh.computeBoundingSphere();}
          else{mesh.boundingSphere.set(new T.Vector3(),0);mesh.boundingBox.set(new T.Vector3(),new T.Vector3());}
          activeDetail.changed=true;activeDetail.changedBatches++;
        }
        const sphere=mesh.boundingSphere;
        if(!sphere||![sphere.center.x,sphere.center.y,sphere.center.z,sphere.radius].every(Number.isFinite))boundsFinite=false;
        activeTriangles+=tris(mesh.geometry)*mesh.count;
      }
      high+=members.high.length;medium+=members.medium.length;low+=members.low.length;
    }
    Object.assign(activeDetail,{high,medium,low,activeTriangles,boundingSpheresFinite:boundsFinite});
    if(result){result.activeDetail=activeDetail;result.activeAddedTriangles=result.addedDistantTriangles+activeTriangles-allLowTriangles;}
    return activeDetail;
  }

  // A true profiled eave replaces the earlier stack of thin flat strips.
  function eaveSweep(length,axis,spanEdge,baseY,sign,material,parent){
    const section=[[0,0],[.025,.03],[.08,.07],[.115,.13],[.12,.19],[.095,.235],[.045,.265],[.04,.29],[.24,.29],[.24,.36],[.29,.39],[.34,.445],[.35,.51],[.30,.55],[0,.55]];
    const p=[],uv=[],idx=[];
    for(let end=0;end<2;end++)for(const[outset,y]of section){
      const u=(end-.5)*length,v=spanEdge+sign*outset;
      p.push(axis==='x'?u:v,baseY+y,axis==='x'?v:u);uv.push(u,y);
    }
    const n=section.length;
    const flip=axis==='x'?sign>0:sign<0;
    for(let j=0;j<n;j++){const k=(j+1)%n;if(flip)idx.push(j,j+n,k,k,j+n,k+n);else idx.push(j,k,j+n,k,k+n,j+n);}
    const caps=T.ShapeUtils.triangulateShape(section.map(([x,y])=>new T.Vector2(x,y)),[]);
    for(const end of [0,1])for(const face of caps){
      const [a,b,c]=face.map(i=>i+end*n),pa=new T.Vector3().fromArray(p,a*3),pb=new T.Vector3().fromArray(p,b*3),pc=new T.Vector3().fromArray(p,c*3);
      const normal=pb.sub(pa).cross(pc.sub(pa)),outward=(axis==='x'?normal.x:normal.z)*(end?1:-1)>0;
      if(outward)idx.push(a,b,c);else idx.push(a,c,b);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    // The profiled fascia has solid end caps as well as its carved long face.
    const m=new T.Mesh(g,material);m.name='Continuous carved ovolo and cyma eave profile';m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  let profiledEaves=0,leanToRoofs=0;
  const rootRoofs=[];world.traverse(o=>{if(o.isMesh&&o.material===mats.roof&&o.geometry.parameters?.width&&['outer','stoa'].includes(o.parent?.userData.landmark))rootRoofs.push(o);});
  for(const roof of rootRoofs){
    const d=roof.geometry.parameters;
    const isSide=roof.parent.userData.landmark==='stoa'&&(Math.abs(roof.position.z-193)<.01||Math.abs(roof.position.z-215)<.01);
    if(isSide)continue;
    const assembly=roof.children.find(g=>g.name==='Pitched terracotta roof, tiled eaves and timber ceiling');
    if(!assembly)continue;
    for(const old of [...assembly.children])if(old.name==='Profiled stone cornices and recessed dentils')assembly.remove(old);
    const alongX=d.width>d.depth,length=Math.max(d.width,d.depth),span=Math.min(d.width,d.depth),eave=d.height/2+(roof.parent.userData.landmark==='outer'?.4:.12);
    for(const sign of [-1,1]){eaveSweep(length+.6,alongX?'x':'z',sign*span/2,eave-.77,sign,mats.stoneLight,assembly);profiledEaves++;}
  }

  // Basilica side aisles are lean-to roofs abutting the raised nave, rather
  // than two additional small gables. Their exact pitch remains interpretive.
  function leanTo(roof){
    const north=roof.position.z<204,lowZ=north?-6.6:6.6,highZ=north?5.3:-5.3;
    const lowY=19.0-roof.position.y,highY=21.2-roof.position.y,length=285.6,thickness=.18;
    const yAt=z=>lowY+(z-lowZ)/(highZ-lowZ)*(highY-lowY);
    const z0=Math.min(lowZ,highZ),z1=Math.max(lowZ,highZ),y0=yAt(z0),y1=yAt(z1),a=length/2;
    const p=[-a,y0,z0,a,y0,z0,a,y1,z1,-a,y1,z1,-a,y0-thickness,z0,a,y0-thickness,z0,a,y1-thickness,z1,-a,y1-thickness,z1];
    const index=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7];
    const base=new T.BufferGeometry();base.setAttribute('position',new T.Float32BufferAttribute(p,3));base.setIndex(index);
    const g=base.toNonIndexed();base.dispose();g.computeVertexNormals();g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));g.computeBoundingSphere();
    g.parameters={width:length,height:highY-lowY+thickness,depth:Math.abs(highZ-lowZ)};roof.geometry=g;
    for(const child of [...roof.children])if(child.name==='Pitched terracotta roof, tiled eaves and timber ceiling')roof.remove(child);
    const assembly=new T.Group();assembly.name='Sloping basilica aisle roof with timber underside and clay eaves';roof.add(assembly);
    const sign=north?-1:1;
    eaveSweep(length,'x',lowZ,lowY-.70,sign,mats.stoneLight,assembly);profiledEaves++;
    const slope=Math.atan((highY-lowY)/(highZ-lowZ)),span=Math.abs(highZ-lowZ),centerZ=(lowZ+highZ)/2,centerY=(lowY+highY)/2;
    const beams=[],coffers=[];
    for(let x=-141.5;x<142;x+=3.7){
      beams.push([x,centerY-.28,centerZ,.18,.28,span/Math.cos(slope),-slope]);
      for(let j=0;j<4;j++){const z=z0+(j+.5)*span/4;coffers.push([x,yAt(z)-.205,z,3.35,.02,span/4-.18,-slope]);}
    }
    batch(assembly,new T.BoxGeometry(1,1,1),mats.wood,beams,'Sloping cedar roof rafters');
    const panel=new T.PlaneGeometry(1,1);panel.rotateX(Math.PI/2);batch(assembly,panel,mats.wood,coffers,'Recessed sloping cedar ceiling panels');
    // Rounded eave imbrices run up the slope; the material continues tile
    // joints across the remaining field. There is no ridge on a lean-to roof.
    const hp=[],huv=[],hi=[];
    for(let u=0;u<2;u++)for(let j=0;j<=4;j++){const t=j/4*Math.PI;hp.push(0.13*Math.cos(t),.105*Math.sin(t),u-.5);huv.push(j/4,u);}
    for(let j=0;j<4;j++)hi.push(j,j+1,j+5,j+1,j+6,j+5);
    const hg=new T.BufferGeometry();hg.setAttribute('position',new T.Float32BufferAttribute(hp,3));hg.setAttribute('uv',new T.Float32BufferAttribute(huv,2));hg.setIndex(hi);hg.computeVertexNormals();
    const channels=[],strip=2.4,zc=lowZ+(north?1:-1)*strip/2;
    for(let x=-142;x<142;x+=.57)channels.push([x,yAt(zc)+.025,zc,1,1,strip/Math.cos(slope),-slope]);
    batch(assembly,hg,mats.roof,channels,'Hollow rounded clay eave tiles on lean-to pitch');leanToRoofs++;
  }
  for(const roof of rootRoofs)if(roof.parent.userData.landmark==='stoa'&&(Math.abs(roof.position.z-193)<.01||Math.abs(roof.position.z-215)<.01))leanTo(roof);
  const stoa=world.children.find(g=>g.userData.landmark==='stoa');
  if(stoa)batch(stoa,new T.BoxGeometry(1,1,1),mats.stoneLight,[[0,19.4,198,283,.5,1],[0,19.4,210,283,.5,1]],'Clerestory sill blocks seated continuously on the architrave');

  // Snapshot the initial all-distant scene. Tier templates are shared, while
  // runtime diagnostics report the actual active triangles for the camera.
  let after=0,finite=true,draws=0;
  const seen=new Set();
  world.traverse(o=>{if(o.isMesh){after+=countObject(o);draws++;const g=o.geometry;if(!seen.has(g)){seen.add(g);for(const key of ['position','normal']){const attr=g.attributes[key];if(attr)for(const n of attr.array)if(!Number.isFinite(n))finite=false;}}}});
  const templates=[...templateCache.values()];
  const allHigh=columns.map(spec=>({gain:tris(columnTemplate(quality.high,spec.top/spec.r))-tris(columnTemplate(quality.medium,spec.top/spec.r)),medium:tris(columnTemplate(quality.medium,spec.top/spec.r))}));
  const theoreticalColumnMaximum=allHigh.reduce((n,s)=>n+s.medium,0)+allHigh.map(s=>s.gain).sort((a,b)=>b-a).slice(0,32).reduce((a,b)=>a+b,0);
  result={columns:columns.length,inspectableColumns:columns.length,maximumHighDetailColumns:32,dynamicInstancedLOD:true,volumetricLeavesPerCapital:16,leanToRoofs,profiledEaves,
    addedDistantTriangles:Math.round(after-before),activeAddedTriangles:Math.round(after-before),addedNearUpperBoundTriangles:Math.round(after-before+theoreticalColumnMaximum-allLowTriangles),
    storedTemplateTriangles:templates.reduce((n,g)=>n+tris(g),0),sceneMeshes:draws,finite,activeDetail,
    capitalDetailView:{eye:[126,17.1,202.5],target:[123,16.7,199]},
    source:'IMSA 8 (2016–17), pp.74–95; smooth-leaf form and Royal Stoa attribution remain interpretive'};
  world.userData.updateTempleColumnDetail=updateTempleColumnDetail;
  world.userData.colonnadeDetailV2=result;return result;
}
