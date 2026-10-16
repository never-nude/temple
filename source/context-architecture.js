function enhanceTempleArchitecture(T, ctx) {
  const { world, mats, instance, cutawayParts } = ctx;
  const originalMeshes = [];
  world.traverse(o => { if (o.isMesh) originalMeshes.push(o); });
  const triangleCount = o => (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
  const before = originalMeshes.reduce((n, o) => n + triangleCount(o), 0);
  const cube = new T.BoxGeometry(1, 1, 1);
  let seed = 30070;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const semantic = id => world.children.find(g => g.userData.landmark === id);
  const makeGroup = (parent, name) => { const g = new T.Group(); g.name = name; parent.add(g); return g; };
  const mesh = (p, geometry, material, name) => { const m = new T.Mesh(geometry, material); m.name = name; m.castShadow = m.receiveShadow = true; p.add(m); return m; };
  function batch(parent, geometry, material, entries, name, colored = false) {
    if (!entries.length) return null;
    const m = instance(parent, geometry, material, entries);
    m.name = name;
    if (colored) {
      const c = new T.Color();
      entries.forEach((_, i) => { const v = .82 + random() * .18; c.setRGB(v, v, v); m.setColorAt(i, c); });
      m.instanceColor.needsUpdate = true;
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    return m;
  }
  const boxes = (p, a, mat, name, colored = false) => batch(p, cube, mat, a, name, colored);
  function profileGeometry(profile, segments = 12) {
    return new T.LatheGeometry(profile.map(p => new T.Vector2(p[0], p[1])), segments);
  }

  // Fine flutes are carved into a tapered shaft rather than painted vertical
  // stripes. End faces lie inside the molded base and capital.
  const shaftPosition = [], shaftUV = [], shaftIndex = [];
  const shaftSegments = 48;
  for (let row = 0; row < 2; row++) for (let i = 0; i <= shaftSegments; i++) {
    const a = i / shaftSegments * Math.PI * 2;
    const r = (row ? .82 : 1) * (1 - .055 * (.5 + .5 * Math.cos(a * 16)));
    shaftPosition.push(Math.sin(a) * r, row - .5, Math.cos(a) * r);
    shaftUV.push(i / shaftSegments, row);
  }
  for (let i = 0; i < shaftSegments; i++) {
    const j = i + shaftSegments + 1;
    shaftIndex.push(i, i + 1, j, j, i + 1, j + 1);
  }
  const shafts = new T.BufferGeometry();
  shafts.setAttribute('position', new T.Float32BufferAttribute(shaftPosition, 3));
  shafts.setAttribute('uv', new T.Float32BufferAttribute(shaftUV, 2));
  shafts.setIndex(shaftIndex); shafts.computeVertexNormals(); shafts.computeBoundingSphere();

  // Curved acanthus leaves have a pronounced central rib and an outward curl.
  // The original diamond-shaped cones are replaced, retaining the instance
  // arrangement and the semantic/cutaway parent of each colonnade.
  const leafPosition = [], leafUV = [], leafIndex = [];
  const leafRows = [[-.5,.28,-.08],[-.15,1,.08],[.23,.72,.48],[.5,.015,.88]];
  leafRows.forEach(([y,w,z], j) => {
    leafPosition.push(-w,y,z, 0,y+.035,z+.19, w,y,z);
    leafUV.push(0,j/3,.5,j/3,1,j/3);
  });
  for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) {
    const a = j * 3 + i, b = a + 3;
    leafIndex.push(a,a+1,b,b,a+1,b+1);
  }
  const leaves = new T.BufferGeometry();
  leaves.setAttribute('position', new T.Float32BufferAttribute(leafPosition, 3));
  leaves.setAttribute('uv', new T.Float32BufferAttribute(leafUV, 2));
  leaves.setIndex(leafIndex); leaves.computeVertexNormals(); leaves.computeBoundingSphere();
  const leafMat = mats.stoneLight.clone();
  leafMat.side = T.DoubleSide;
  leafMat.onBeforeCompile = mats.stoneLight.onBeforeCompile;
  leafMat.customProgramCacheKey = mats.stoneLight.customProgramCacheKey;
  const baseProfile = profileGeometry([[1.06,-.5],[.94,-.1],[1.06,.2],[.93,.5]], 12);
  const capitalProfile = profileGeometry([[.8,-.5],[.96,.05],[1.29,.5]], 8);
  const voluteGeom = new T.TorusGeometry(1, .17, 3, 6);
  const matrix = new T.Matrix4(), p = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3();
  const columnGroups = [];
  for (const m of originalMeshes) {
    const a = m.geometry.parameters || {};
    if (!m.isInstancedMesh) continue;
    if (m.geometry.type === 'CylinderGeometry' && a.radiusTop === .82 && a.radiusBottom === 1 && a.height === 1) {
      m.geometry = shafts;
      m.name = 'Tapered limestone shafts with carved flutes';
      columnGroups.push(m);
    } else if (m.geometry.type === 'ConeGeometry' && a.radius === 1 && a.height === 1 && a.radialSegments === 4) {
      m.geometry = leaves; m.material = leafMat; m.name = 'Curved ribbed acanthus leaves';
    } else if (m.geometry.type === 'CylinderGeometry' && a.radiusTop === 1 && a.radiusBottom === 1 && a.height === 1 && m.count > 8) {
      // Column-series base rings all use the same unit cylinder. Sanctuary
      // vessels and individual sculpted bases are not instanced this way.
      const first = new T.Matrix4(); m.getMatrixAt(0, first); first.decompose(p,q,s);
      if (s.y < .4 && s.x > .3 && s.x < 1.5) { m.geometry = baseProfile; m.name = 'Turned torus and scotia base moldings'; }
    }
  }
  for (const m of columnGroups) {
    const bells = [], volutes = [];
    const isStoa = m.parent.userData.landmark === 'stoa';
    for (let i = 0; i < m.count; i++) {
      m.getMatrixAt(i, matrix); matrix.decompose(p,q,s);
      const radius = s.x, height = s.y + 1.3, base = p.y - height / 2;
      bells.push([p.x,base+height-.71,p.z,radius,.78,radius]);
      // The lateral scrolls curl under the projecting abacus. The Royal Stoa
      // has all four corner scrolls, the other colonnades two visible scrolls.
      for (const side of [-1,1]) {
        if (isStoa || i%2===0) volutes.push([p.x+side*radius*.91,base+height-.39,p.z+radius*.82,radius*.24,radius*.24,radius*.24,0,0,side*.36]);
        if (isStoa) volutes.push([p.x+side*radius*.91,base+height-.39,p.z-radius*.82,radius*.24,radius*.24,radius*.24,0,0,side*.36]);
      }
    }
    batch(m.parent, capitalProfile, mats.stoneLight, bells, 'Sculpted Corinthian capital bells');
    batch(m.parent, voluteGeom, mats.stoneLight, volutes, 'Corinthian capital corner scrolls');
  }

  // Deeply profiled stone cornices and projecting dentils cast actual shadows.
  // Roof components are children of the existing removable roof, so every
  // layer disappears with the Cutaway control.
  const roofs = originalMeshes.filter(m => m.material === mats.roof && m.geometry.parameters?.width && m.geometry.parameters?.height && m.geometry.parameters?.depth && ['outer','stoa'].includes(m.parent.userData.landmark));
  function roofAssembly(roof) {
    const { width:w, height:h, depth:d } = roof.geometry.parameters;
    const alongX = w > d, length = Math.max(w,d), span = Math.min(w,d);
    const g = makeGroup(roof, 'Pitched terracotta roof, tiled eaves and timber ceiling');
    const eave = h/2 + (roof.parent.userData.landmark === 'outer' ? .4 : .12), rise = span * .095;
    const ceiling = -h/2 - (roof.parent.userData.landmark === 'outer' ? .82 : 0);
    const pos = [], uv = [], index = [];
    function vertex(u,y,v) { pos.push(alongX?u:v,y,alongX?v:u); }
    // UVs preserve metre dimensions for the world's triplanar clay shader.
    for (const side of [-1,1]) {
      const n=pos.length/3;
      vertex(-length/2-.25,eave,side*(span/2+.6)); vertex(length/2+.25,eave,side*(span/2+.6));
      vertex(-length/2-.25,eave+rise,0); vertex(length/2+.25,eave+rise,0);
      uv.push(0,0,length,0,0,span/2,length,span/2);
      if ((side > 0) === alongX) index.push(n,n+1,n+2,n+1,n+3,n+2);
      else index.push(n,n+2,n+1,n+1,n+2,n+3);
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position',new T.Float32BufferAttribute(pos,3)); geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); geo.setIndex(index); geo.computeVertexNormals(); geo.computeBoundingSphere();
    const roofMaterial = mats.roof.clone(); roofMaterial.side = T.DoubleSide;
    roofMaterial.onBeforeCompile = mats.roof.onBeforeCompile;
    roofMaterial.customProgramCacheKey = mats.roof.customProgramCacheKey;
    mesh(g,geo,roofMaterial,'Shallow pitched tile roof');
    const trims=[], dentils=[], rafters=[], coffers=[];
    for (const sign of [-1,1]) {
      for (const [dy,projection,thickness] of [[-.2,.63,.19],[-.44,.36,.22],[-.7,.1,.15]]) {
        trims.push(alongX?[0,eave+dy,sign*(span/2+projection/2),length+.8,thickness,.25+projection]:[sign*(span/2+projection/2),eave+dy,0,.25+projection,thickness,length+.8]);
      }
      const exposed=roof.parent.userData.landmark==='outer'?(alongX?sign===1:(roof.position.x<0?sign===1:sign===-1)):(roof.position.z===193?sign===-1:roof.position.z===215?sign===1:true);
      if(exposed)for (let u=-length/2+.7;u<length/2;u+=2.15) dentils.push(alongX?[u,eave-.88,sign*(span/2-.16),.65,.29,.52]:[sign*(span/2-.16),eave-.88,u,.52,.29,.65]);
    }
    for(let u=-length/2+.8;u<length/2;u+=3.7) {
      rafters.push(alongX?[u,ceiling-.16,0,.18,.28,span-.4]:[0,ceiling-.16,u,span-.4,.28,.18]);
      for(const v of [-span*.27,0,span*.27]) coffers.push(alongX?[u,ceiling-.035,v,3.35,.08,span*.25]:[v,ceiling-.035,u,span*.25,.08,3.35]);
    }
    boxes(g,trims.concat(dentils),mats.stoneLight,'Profiled stone cornices and recessed dentils');
    // The recessed coffer faces are thin plane geometry. Visible depth and
    // shadow come from the surrounding three-dimensional timber beams.
    const cofferGeo=new T.PlaneGeometry(1,1);cofferGeo.rotateX(Math.PI/2);
    batch(g,cofferGeo,mats.wood,coffers,'Deep recessed timber ceiling coffers',true);
    // Raised half-round imbrices. Longitudinal tile seams come from the clay
    // material; relief is real geometry and survives grazing views.
    const ridgePos=[],ridgeUV=[],ridgeIndex=[];
    for(let u=0;u<2;u++)for(let a=0;a<=3;a++){
      const angle=a/3*Math.PI;
      ridgePos.push(u-.5,Math.sin(angle),Math.cos(angle));ridgeUV.push(u,a/3);
    }
    for(let i=0;i<3;i++)ridgeIndex.push(i,i+4,i+1,i+1,i+4,i+5);
    const ridgeGeo=new T.BufferGeometry();ridgeGeo.setAttribute('position',new T.Float32BufferAttribute(ridgePos,3));ridgeGeo.setAttribute('uv',new T.Float32BufferAttribute(ridgeUV,2));ridgeGeo.setIndex(ridgeIndex);ridgeGeo.computeVertexNormals();ridgeGeo.computeBoundingSphere();
    const ridges=[], slope=Math.atan(rise/(span/2+.6)), strip=2.4;
    // Clay channels run DOWN the roof pitch. Only the 2.4 m eave strips need
    // silhouette geometry; the rest of the tile field is metre-scaled PBR.
    // Alternate channels use normal relief alone, reducing distant geometry.
    for(let u=-length/2+.3;u<length/2;u+=1.14)for(const sign of [-1,1]){
      const v=sign*(span/2+.6-strip/2),height=eave+rise*(1-Math.abs(v)/(span/2+.6));
      ridges.push(alongX?[u,height+.035,v,strip/Math.cos(slope),.105,.125,sign*slope,sign*Math.PI/2,0]:[v,height+.035,u,strip/Math.cos(slope),.105,.125,0,0,-sign*slope]);
    }
    // The ridge line has a visibly larger protective cap course.
    ridges.push(alongX?[0,eave+rise+.06,0,length+.9,.17,.23]:[0,eave+rise+.06,0,length+.9,.17,.23,0,Math.PI/2,0]);
    batch(g,ridgeGeo,mats.roof,ridges,'Raised rounded clay tiles and ridge caps',true);
    // Repeated exposed rafter ends make the eave more than a solid slab.
    const rafterEnds=[];
    for(let u=-length/2+.5;u<length/2;u+=2.45)for(const sign of [-1,1])rafterEnds.push(alongX?[u,eave-.25,sign*(span/2+.1),.17,.2,1.0]:[sign*(span/2+.1),eave-.25,u,1.0,.2,.17]);
    boxes(g,rafters.concat(rafterEnds),mats.wood,'Exposed cedar rafters and individual eave tails');
  }
  roofs.forEach(roofAssembly);

  // Drafted margins surround a projecting, slightly beveled block boss. One
  // instanced relief mesh keeps several thousand joints inexpensive.
  const bossPos=[],bossUV=[],bossIndex=[];
  const corners=[[-.5,-.5,0],[.5,-.5,0],[.5,.5,0],[-.5,.5,0],[-.465,-.43,1],[.465,-.43,1],[.465,.43,1],[-.465,.43,1]];
  corners.forEach(([x,y,z])=>{bossPos.push(x,y,z);bossUV.push(x+.5,y+.5);});
  bossIndex.push(4,5,6,4,6,7);
  for(let j=0;j<4;j++){const k=(j+1)%4;bossIndex.push(j,k,j+4,k,k+4,j+4);}
  const bossGeo=new T.BufferGeometry();bossGeo.setAttribute('position',new T.Float32BufferAttribute(bossPos,3));bossGeo.setAttribute('uv',new T.Float32BufferAttribute(bossUV,2));bossGeo.setIndex(bossIndex);bossGeo.computeVertexNormals();bossGeo.computeBoundingSphere();
  const mount=semantic('mount'), bosses=[];
  const bondRandom=(()=>{let s=602734;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);})();
  const bonds=[];
  for(let row=0;row<4;row++){
    const widths=Array.from({length:5},()=>.15+bondRandom()*.1),sum=widths.reduce((a,b)=>a+b,0),edges=[0];
    for(const w of widths)edges.push(edges[edges.length-1]+w/sum);
    bonds.push({edges,offset:row%2?.107:.013});for(let j=0;j<5;j++)bondRandom();
  }
  const mod=(a,n)=>((a%n)+n)%n;
  const addCourses=(length,fixed,axis,angle)=>{
    for(let row=0;row<13;row++){
      const y=-16.2+row*1.2;
      // CanvasTexture rows flip vertically: reflect the material's four-row
      // pattern before generating real margins at the same 1.2 m courses.
      const bond=bonds[3-mod(Math.floor(y/1.2),4)];
      for(let repeat=Math.floor(-length/2/10.4)-1;repeat<=Math.ceil(length/2/10.4);repeat++)for(let j=0;j<5;j++){
        const u=(repeat+bond.edges[j]-bond.offset)*10.4, end=(repeat+bond.edges[j+1]-bond.offset)*10.4;
        const a=Math.max(-length/2,u),b=Math.min(length/2,end);
        if(b-a<.3)continue;
        // Most joints follow the same irregular 10.4 m bond as the material.
        // Small differences in projection produce grazing-light variation.
        bosses.push(axis==='x'?[(a+b)/2,y,fixed,b-a-.065,1.12,.028+random()*.055,0,angle,0]:[fixed,y,(a+b)/2,b-a-.065,1.12,.028+random()*.055,0,angle,0]);
      }
    }
  };
  addCourses(300,235.025,'x',0); addCourses(470,150.025,'z',Math.PI/2); addCourses(470,-150.025,'z',-Math.PI/2);
  batch(mount,bossGeo,mats.stoneLight,bosses,'Dressed Herodian retaining ashlar with drafted margins',true);
  const coping=[];
  for(const z of [-234,234])coping.push([0,2.52,z,300,.21,2.25],[0,2.36,z,300,.18,2.5]);
  for(const x of [-149,149]){coping.push([x,2.52,-125,2.25,.21,220],[x,2.52,125,2.25,.21,220]);}
  boxes(mount,coping,mats.stoneLight,'Beveled precinct parapet coping');

  // Gate leaves receive panels and bronze bosses in their own local frames.
  // Decorations follow the already-parted door leaf transforms exactly.
  const nicanor=semantic('nicanor');
  if(nicanor)for(const door of [...nicanor.children]){
    const d=door.geometry?.parameters;
    if(!d||d.width!==.35||d.height!==8.6)continue;
    const g=makeGroup(door,'Recessed bronze door panels and forged fittings');
    const rails=[],pins=[];
    for(const x of [-.2,.2]){
      for(const z of [-1.99,1.99])rails.push([x,0,z,.07,8.25,.14]);
      for(const y of [-4,-2,0,2,4])rails.push([x,y,0,.07,.12,4.1]);
      for(const y of [-3,-1,1,3])for(const z of [-1.65,1.65])pins.push([x*1.18,y,z,.085,.085,.085]);
    }
    boxes(g,rails,door.material,'Bronze door panel framework');
    batch(g,new T.SphereGeometry(1,8,4),door.material,pins,'Round-headed bronze door bosses');
    const ring=new T.Mesh(new T.TorusGeometry(.22,.035,4,12),door.material);ring.position.set(.27,0,0);ring.rotation.y=Math.PI/2;g.add(ring);
  }

  // True-sized people are deliberately sparse. Broad cloth volumes, heads,
  // sleeves and sandals provide a scale cue without oversized stick figures.
  const robeMats=[0xd3c7ac,0x978168,0xb7ad97,0x68675d].map(color=>new T.MeshStandardMaterial({color,roughness:.98}));
  const skin=new T.MeshStandardMaterial({color:0xa57550,roughness:.91});
  const sandals=new T.MeshStandardMaterial({color:0x4a3d31,roughness:.98});
  const robeGeo=new T.CylinderGeometry(.145,.245,1.17,8,1,false), headGeo=new T.SphereGeometry(1,8,4), armGeo=new T.CylinderGeometry(1,1,1,5,1,true);
  const figures=[];
  while(figures.length<16){const x=(random()-.5)*242,z=(random()-.5)*380;if(x>-104&&x<114&&Math.abs(z)<65)continue;if(x<-83&&z<-171)continue;figures.push({x,z,y:.07,parent:semantic('outer')});}
  for(let i=0;i<8;i++)figures.push({x:-94+i*25+random()*8,z:196+random()*17,y:1.05,parent:semantic('stoa')});
  for(let i=0;i<6;i++)figures.push({x:43+random()*20,z:(i%2?1:-1)*(7+random()*8),y:3.31,parent:semantic('women')});
  figures.push({x:-12,z:-23,y:5.43,parent:semantic('priests'),priest:true},{x:-30,z:26,y:5.43,parent:semantic('priests'),priest:true});
  const peopleByParent=new Map();
  figures.forEach((f,i)=>{if(!peopleByParent.has(f.parent))peopleByParent.set(f.parent,[]);peopleByParent.get(f.parent).push({...f,index:i});});
  for(const[parent,people]of peopleByParent){
    const g=makeGroup(parent,'Visitors and priests — 1.65 m human scale');const robes=[[],[],[],[]],heads=[],arms=[],feet=[],belts=[];
    for(const f of people){const angle=random()*Math.PI*2, scale=.93+random()*.1;
      const transform=(lx,ly,lz,sx,sy,sz,rz=0)=>[f.x+(lx*Math.cos(angle)+lz*Math.sin(angle))*scale,f.y+ly*scale,f.z+(-lx*Math.sin(angle)+lz*Math.cos(angle))*scale,sx*scale,sy*scale,sz*scale,0,angle,rz];
      robes[f.priest?0:f.index%4].push(transform(0,.72,0,1,1,1));
      heads.push(transform(0,1.51,0,.105,.13,.1));
      for(const sign of [-1,1]){arms.push(transform(sign*.18,1.025,0,.065,.49,.065,sign*.11));feet.push(transform(sign*.095,.045,.045,.1,.09,.23));}
      belts.push(transform(0,.91,0,.325,.045,.29));
    }
    robes.forEach((r,i)=>batch(g,robeGeo,robeMats[i],r,'Draped undyed wool garments'));
    batch(g,headGeo,skin,heads,'Human heads at true architectural scale');
    batch(g,armGeo,robeMats[1],arms,'Loose cloth sleeves');boxes(g,feet,sandals,'Sandals');boxes(g,belts,sandals,'Woven garment belts');
  }

  // The surrounding rock shelf is interpretive context, not a survey of
  // ancient Jerusalem. Its uneven edge removes the display-plinth silhouette.
  const landscape=makeGroup(world,'Interpretive limestone landscape outside the precinct');
  const rockMat=new T.MeshStandardMaterial({color:0x9b8d73,roughness:1});
  const foliageMat=new T.MeshStandardMaterial({color:0x757b5a,roughness:1});
  const trunkMat=new T.MeshStandardMaterial({color:0x655644,roughness:1});
  const terrainPos=[],terrainUV=[],terrainIndex=[];
  const outline=[];
  for(let side=0;side<4;side++)for(let i=0;i<24;i++){
    const t=i/24;
    outline.push(side===0?[-165+330*t,-250]:side===1?[165,-250+500*t]:side===2?[165-330*t,250]:[-165,250-500*t]);
  }
  const rings=3,n=outline.length;
  for(let ring=0;ring<rings;ring++)outline.forEach(([x,z])=>{
    const outward=ring===0?0:ring===1?32:72+random()*18;
    const ratio=Math.max(Math.abs(x)/165,Math.abs(z)/250);
    const ux=x/Math.hypot(x,z),uz=z/Math.hypot(x,z);
    const xx=x+ux*outward,zz=z+uz*outward;
    let y=ring===0?-21.4+random()*1.3:ring===1?-22.8+random()*1.1:-24.8+random()*.14;
    // Southern bath shelf joins the illustrative bath foundations.
    if(ring<2&&xx>66&&xx<140&&zz>245&&zz<288)y=-18.3+random()*.1;
    terrainPos.push(xx,y,zz);terrainUV.push(xx*.035,zz*.035);
  });
  for(let r=0;r<rings-1;r++)for(let i=0;i<n;i++){const j=(i+1)%n,a=r*n+i,b=r*n+j,c=(r+1)*n+i,d=(r+1)*n+j;terrainIndex.push(a,b,c,b,d,c);}
  const terrain=new T.BufferGeometry();terrain.setAttribute('position',new T.Float32BufferAttribute(terrainPos,3));terrain.setAttribute('uv',new T.Float32BufferAttribute(terrainUV,2));terrain.setIndex(terrainIndex);terrain.computeVertexNormals();terrain.computeBoundingSphere();mesh(landscape,terrain,rockMat,'Uneven weathered bedrock skirt');
  const rocks=[];
  for(let i=0;i<155;i++){
    const side=i%4,u=random(),offset=8+random()*50;
    const x=side===0?-165- offset:side===1?165+offset:-160+u*320;
    const z=side===2?-250-offset:side===3?250+offset:-245+u*490;
    if(z>245&&x>-35&&x<144)continue;
    const r=.5+random()*2.1;
    rocks.push([x,-23.8+random()*.5,z,r*(1+random()),r*.45,r*(.8+random()),random(),random()*Math.PI,random()*.3]);
  }
  batch(landscape,new T.IcosahedronGeometry(1,0),rockMat,rocks,'Irregular natural limestone outcrops',true);
  const trees=[];
  for(let i=0;i<10;i++)trees.push({x:(i%2?1:-1)*(191+random()*30),z:-160+random()*340,y:-23.7});
  const treeTrunks=[],branches=[],crowns=[];
  trees.forEach(t=>{
    const h=3.2+random()*1.6;treeTrunks.push([t.x,t.y+h*.39,t.z,.22,h*.78,.22,0,0,.04]);
    for(let j=0;j<3;j++){const a=j*Math.PI*2/3+.3,reach=.65+random()*.7;branches.push([t.x+Math.sin(a)*reach*.45,t.y+h*.72,t.z+Math.cos(a)*reach*.45,.11,h*.55,.11,Math.sin(a)*.48,0,-Math.cos(a)*.48]);crowns.push([t.x+Math.sin(a)*reach,t.y+h+random()*.4,t.z+Math.cos(a)*reach,1.2+random()*.7,.8+random()*.5,1.2+random()*.7,random(),a,random()]);}
  });
  batch(landscape,new T.CylinderGeometry(.7,1,1,6,1,true),trunkMat,treeTrunks,'Gnarled olive trunks');
  batch(landscape,new T.CylinderGeometry(.5,1,1,5,1,true),trunkMat,branches,'Olive branches');
  batch(landscape,new T.IcosahedronGeometry(1,1),foliageMat,crowns,'Sparse silver olive canopies',true);

  // Root may expose these diagnostics to its browser checks.
  let after=0,finite=true;world.traverse(o=>{if(o.isMesh){after+=triangleCount(o);const a=o.geometry.attributes.position?.array;if(a)for(let i=0;i<a.length;i++)if(!Number.isFinite(a[i]))finite=false;}});
  const diagnostics={addedTriangles:Math.round(after-before),columns:columnGroups.reduce((n,m)=>n+m.count,0),figures:figures.length,pitchedRoofs:roofs.length,finite};
  world.userData.realismArchitecture=diagnostics;
  return diagnostics;
}
