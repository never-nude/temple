/* Interpretive architectural refinement, not an excavated plan of Antonia.
 * Josephus, War 5.5.8 describes a stone-clad rock, palatial rooms and courts,
 * four corner towers (the southeast higher), and passages to both cloisters.
 * Existing footprint and tower heights are retained; courts, window profiles,
 * roof terraces and circulation are architectural interpretation in metres.
 */
function rebuildAntonia(T, ctx) {
  const { world, mats, cutawayParts } = ctx;
  const antonia = world.children.find(o => o.userData.landmark === 'antonia');
  if (!antonia) return { error: 'Antonia landmark not found' };
  if (antonia.userData.architectureV2) return antonia.userData.architectureV2;
  antonia.updateWorldMatrix(true, true);
  const beforeBounds = new T.Box3().setFromObject(antonia);
  const old = new Set(); antonia.traverse(o => old.add(o));
  const wasCutaway = cutawayParts.some(o => old.has(o) && !o.visible);
  for (let i = cutawayParts.length - 1; i >= 0; i--) if (old.has(cutawayParts[i])) cutawayParts.splice(i, 1);
  const oldGeometries = new Set(); antonia.traverse(o => { if (o.geometry) oldGeometries.add(o.geometry); });
  antonia.clear();
  // Geometry may be shared with the rest of the temple. Dispose only orphans.
  const used = new Set(); world.traverse(o => { if (o.geometry) used.add(o.geometry); });
  for (const g of oldGeometries) if (!used.has(g)) g.dispose();

  const masonry = ctx.masonry || mats.stone;
  const staticParts = new T.Group(); staticParts.name = 'Antonia — stone scarp, court, galleries and four towers'; antonia.add(staticParts);
  const roofParts = new T.Group(); roofParts.name = 'Antonia — removable roof terraces'; roofParts.visible=!wasCutaway; antonia.add(roofParts); cutawayParts.push(roofParts);
  const batches = new Map();
  const unitBox = new T.BoxGeometry(1, 1, 1);
  const matrix = new T.Matrix4(), transform = new T.Object3D(), v = new T.Vector3(), n = new T.Vector3();
  const normalMatrix = new T.Matrix3();
  function append(parent, geometry, material, x=0, y=0, z=0, sx=1, sy=1, sz=1, ry=0, rx=0, rz=0) {
    let byMaterial = batches.get(parent); if (!byMaterial) { byMaterial = new Map(); batches.set(parent, byMaterial); }
    let b = byMaterial.get(material); if (!b) { b={ p:[], n:[], uv:[] }; byMaterial.set(material,b); }
    transform.position.set(x,y,z); transform.scale.set(sx,sy,sz); transform.rotation.set(rx,ry,rz); transform.updateMatrix(); matrix.copy(transform.matrix); normalMatrix.getNormalMatrix(matrix);
    const p=geometry.attributes.position, normal=geometry.attributes.normal, uv=geometry.attributes.uv, index=geometry.index, count=index ? index.count : p.count;
    for(let i=0;i<count;i++) { const j=index ? index.getX(i) : i; v.fromBufferAttribute(p,j).applyMatrix4(matrix); n.fromBufferAttribute(normal,j).applyNormalMatrix(normalMatrix); b.p.push(v.x,v.y,v.z); b.n.push(n.x,n.y,n.z); b.uv.push(uv?uv.getX(j):0,uv?uv.getY(j):0); }
  }
  const box=(p,x,y,z,w,h,d,m=mats.stone)=>{if(w>0&&h>0&&d>0)append(p,unitBox,m,x,y,z,w,h,d);};
  const slab=(x,z,w,d,y,h=.22,p=staticParts,m=mats.stoneLight)=>box(p,x,y,z,w,h,d,m);

  // Actual hollow reveal. Its back is recessed within the wall, leaving four
  // lit splayed stone surfaces between the facade and the shaded interior.
  function reveal(axis,u,fixed,y,width,height,thickness,outward,parent=staticParts) {
    const positions=[],uvs=[];
    const front=outward*thickness/2+.012*outward, back=-outward*thickness/2;
    const fw=width/2,fh=height/2,bw=fw*.72,bh=fh*.84;
    const corners=[[-fw,-fh,front],[fw,-fh,front],[fw,fh,front],[-fw,fh,front],[-bw,-bh,back],[bw,-bh,back],[bw,bh,back],[-bw,bh,back]];
    for(let j=0;j<4;j++){const k=(j+1)%4;for(const i of outward>0?[j,k,j+4,k,k+4,j+4]:[j,j+4,k,k,j+4,k+4]){const a=corners[i];positions.push(a[0],a[1],a[2]);uvs.push(a[0],a[1]);}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeVertexNormals();
    const x=axis==='x'?u:fixed,z=axis==='x'?fixed:u,ry=axis==='x'?0:Math.PI/2;
    append(parent,g,mats.stoneLight,x,y,z,1,1,1,ry);
    const backZ=back-.025*outward;
    if(axis==='x')box(parent,u,y,fixed+backZ,width*.74,height*.86,.055,mats.dark);
    else box(parent,fixed+backZ,y,u,.055,height*.86,width*.74,mats.dark);
    // Dressed, projecting sill and thin lintel relieve each otherwise plain bay.
    if(axis==='x'){box(parent,u,y-height/2-.12,fixed+outward*(thickness/2+.13),width+.48,.24,.55,mats.stoneLight);box(parent,u,y+height/2+.1,fixed+outward*(thickness/2+.06),width+.34,.2,.3,mats.stoneLight);}
    else{box(parent,fixed+outward*(thickness/2+.13),y-height/2-.12,u,.55,.24,width+.48,mats.stoneLight);box(parent,fixed+outward*(thickness/2+.06),y+height/2+.1,u,.3,.2,width+.34,mats.stoneLight);}
    g.dispose();
  }
  // Walls are built around openings, rather than laying black rectangles over
  // solid boxes. Each row is a band and piers, merged in the final draw batches.
  function wall(axis,center,fixed,length,bottom,top,thickness,rows,outward,material=masonry,parent=staticParts) {
    const B=(a,b,lo,hi)=>{if(axis==='x')box(parent,center+(a+b)/2,(lo+hi)/2,fixed,b-a,hi-lo,thickness,material);else box(parent,fixed,(lo+hi)/2,center+(a+b)/2,thickness,hi-lo,b-a,material);};
    let cursor=bottom;
    for(const row of rows){const lo=Math.max(bottom,row.y-row.h/2),hi=Math.min(top,row.y+row.h/2);if(hi<=lo)continue;if(lo>cursor)B(-length/2,length/2,cursor,lo);let u=-length/2;
      for(const c of row.centers){const a=c-row.w/2,b=c+row.w/2;if(a>u)B(u,a,lo,hi);u=b;if(!row.noReveal)reveal(axis,center+c,fixed,row.y,row.w,row.h,thickness,outward,parent);}
      if(u<length/2)B(u,length/2,lo,hi);cursor=hi;
    }
    if(cursor<top)B(-length/2,length/2,cursor,top);
  }

  // Low battered stone-clad scarp respects the previous plinth's extent and
  // model elevation. It does not claim to recover the rock's ancient height.
  function batterWall(axis,u,fixed,length,outward) {
    const lower=outward*.66,upper=0,positions=[],uv=[];
    const points=[[-length/2,0,lower],[length/2,0,lower],[-length/2,4.1,upper],[length/2,4.1,upper]];
    for(const j of outward>0?[0,1,2,1,3,2]:[0,2,1,1,2,3]){const p=points[j];positions.push(p[0],p[1],p[2]);uv.push(p[0],p[1]);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();append(staticParts,g,masonry,axis==='x'?u:fixed,0,axis==='x'?fixed:u,1,1,1,axis==='x'?0:Math.PI/2);g.dispose();
  }
  batterWall('x',-120,-232,58,-1);batterWall('z',-204,-149,56,-1);batterWall('z',-204,-91,56,1);
  // The southern foundation is split around a genuine descending passage.
  batterWall('x',-135.6,-176,26.8,1);batterWall('x',-104.4,-176,26.8,1);
  // Separate floor rings leave the descending main entrance genuinely open.
  slab(-120,-204,27,25,4.16,.28,staticParts,mats.pavement);
  slab(-140.5,-204,14,53,4.16,.28);slab(-99.5,-204,14,53,4.16,.28);slab(-120,-223.5,27,14,4.16,.28);
  slab(-128.0,-184.5,11,14,4.16,.28);slab(-112.0,-184.5,11,14,4.16,.28);
  const windows=[-16,-8,0,8,16];
  const regularRows=[{y:12.8,h:2.8,w:1.55,centers:windows},{y:20.2,h:2.8,w:1.55,centers:windows}];
  // The permanent wall masonry supports the copings independently of the
  // removable roof slabs. Stop below the terrace's top to avoid coincident
  // horizontal faces when the roof is present.
  const wallTop=28.36;
  wall('x',-120,-230.5,55,4.3,wallTop,1.55,regularRows,-1);
  wall('x',-120,-177.5,55,0,wallTop,1.55,[{y:3.25,h:6.5,w:4.6,centers:[0],noReveal:true},...regularRows],1);
  wall('z',-204,-147.5,53,4.3,wallTop,1.55,regularRows,-1);
  wall('z',-204,-92.5,53,4.3,wallTop,1.55,regularRows,1);

  // An annular barrel forms a real soffit and deep stone opening. Its ends
  // remain open; only the shadowed side chambers beyond the court are closed.
  function arch(axis,u,fixed,base,width,height,depth,outward=1) {
    if(base===0)base=.035; // Keep the entrance's beveled sill above the old datum.
    const r=width/2,outer=r+.52,spring=base+height-r,shape=new T.Shape();
    shape.moveTo(-outer,0);shape.lineTo(-outer,height+.52);shape.lineTo(outer,height+.52);shape.lineTo(outer,0);shape.lineTo(r,0);shape.lineTo(r,height-r);shape.absarc(0,height-r,r,0,Math.PI,false);shape.lineTo(-r,0);shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:1,curveSegments:12});
    const x=axis==='x'?u:fixed-depth/2,z=axis==='x'?fixed-depth/2:u;append(staticParts,g,mats.stoneLight,x,base,z,1,1,1,axis==='x'?0:Math.PI/2);g.dispose();
    for(let i=0;i<11;i++){const a=(i+.5)*Math.PI/11,cu=Math.cos(a)*(r+.26),cy=spring+Math.sin(a)*(r+.26);if(axis==='x')append(staticParts,unitBox,mats.stone,u+cu,cy,fixed+outward*(depth/2+.055),.46,.44,.14,0,0,a-Math.PI/2);else append(staticParts,unitBox,mats.stone,fixed+outward*(depth/2+.055),cy,u+cu,.14,.44,.46,0,Math.PI/2-a);}
  }
  arch('x',-120,-177.5,0,4.6,6.5,2.2,1);
  // A long, gentle stair gives the entrance actual depth and a visible floor.
  for(let i=0;i<22;i++){const h=.195*(i+1);box(staticParts,-120,h/2,-175.0-i*.74,3.8,h,.76,mats.stoneLight);}
  slab(-120,-191.3,4.8,1.8,4.3,.25);

  // Fill only the spaces outside adjacent arch frames. A whole rectangular
  // wall here would cover their curved soffits and close the real openings.
  let arcadeInfillPiers=0;
  function infillArcade(axis,center,fixed,length,centers,width) {
    const halfFrame=width/2+.52;
    let cursor=-length/2;
    const fill=(a,b)=>{
      if(b-a<.001)return;
      if(axis==='x')box(staticParts,center+(a+b)/2,8.35,fixed,b-a,8.1,1.05,mats.stoneLight);
      else box(staticParts,fixed,8.35,center+(a+b)/2,1.05,8.1,b-a,mats.stoneLight);
      arcadeInfillPiers++;
    };
    for(const position of centers){fill(cursor,position-halfFrame);cursor=position+halfFrame;}
    fill(cursor,length/2);
  }
  const innerX=[-10.8,-5.4,0,5.4,10.8],innerZ=[-9.4,-3.14,3.14,9.4];
  for(const sign of [-1,1]){
    const z=-204+sign*12.5,x=-120+sign*13.5;
    for(const u of innerX)arch('x',-120+u,z,4.3,4.25,7.7,1.05,-sign);
    for(const u of innerZ)arch('z',-204+u,x,4.3,4.8,7.7,1.05,-sign);
    infillArcade('x',-120,z,27,innerX,4.25);
    infillArcade('z',-204,x,25,innerZ,4.8);
    wall('x',-120,z,27,12.4,wallTop,1.05,[{y:17.0,h:2.8,w:1.8,centers:innerX},{y:23.0,h:2.4,w:1.6,centers:innerX}],-sign,mats.stone);
    wall('z',-204,x,25,12.4,wallTop,1.05,[{y:17.0,h:2.8,w:1.8,centers:innerZ},{y:23.0,h:2.4,w:1.6,centers:innerZ}],-sign,mats.stone);
    // Gallery stringcourse and actual walk surface behind the court arcade.
    slab(-120,z,28.0,1.65,12.55,.42);slab(x,-204,1.65,25,12.55,.42);
  }
  // Broad, quiet roof terraces. Open center remains visible without cutaway.
  for(const [x,z,w,d]of[[-140.5,-204,14,53],[-99.5,-204,14,53],[-120,-223.5,27,14],[-120,-184.5,27,14]])slab(x,z,w,d,28.15,.55,roofParts,mats.pavement);
  for(const sign of[-1,1]){
    const x=-120+sign*27.5,z=-204+sign*26.5;
    slab(-120,z,55.8,.62,28.42,.4);slab(x,-204,.62,53.8,28.42,.4);
    box(staticParts,-120,29.03,z,55,.84,.5,mats.stone);box(staticParts,x,29.03,-204,.5,.84,53,mats.stone);
    slab(-120,z,55.7,.82,29.52,.18);slab(x,-204,.82,53.7,29.52,.18);
    slab(-120,-204+sign*12.5,28.2,.6,28.48,.3);slab(-120+sign*13.5,-204,.6,25.5,28.48,.3);
    box(staticParts,-120,29.02,-204+sign*12.5,27,.8,.4,mats.stoneLight);box(staticParts,-120+sign*13.5,29.02,-204,.4,.8,25,mats.stoneLight);
  }

  // Internal dogleg flights emerge at the existing cloister roof elevation.
  // Architecture only: no conjectural barracks furniture or Roman statuary.
  function guardStair(x,z,ry) {
    const g=new T.Group();g.name='Guard stair passage toward the north/west cloisters';g.position.set(x,4.3,z);g.rotation.y=ry;staticParts.add(g);
    for(let i=0;i<24;i++){const h=.2*(i+1);box(g,-.92,h/2,-3.6+i*.3,1.52,h,.32,mats.stoneLight);box(g,.92,4.8+h/2,3.6-i*.3,1.52,h,.32,mats.stoneLight);}
    box(g,0,4.68,3.9,3.5,.24,1.1,mats.stoneLight);box(g,.92,9.48,-4.0,1.6,.24,1.0,mats.stoneLight);
    // Solid low parapets at the landings avoid a modern metal-rail appearance.
    box(g,0,5.13,4.38,3.6,.72,.2,mats.stone);box(g,1.75,9.95,-4.0,.2,.8,1.1,mats.stone);
  }
  guardStair(-140,-204,0);guardStair(-120,-184.5,Math.PI/2);
  slab(-139.08,-216.9,1.6,17.0,13.98,.24);slab(-133.0,-183.58,17.0,1.6,13.98,.24);

  const towers=[];
  for(const x of[-144,-96])for(const z of[-228,-180]){
    const southeast=x===-96&&z===-180,high=southeast?44:34,top=3+high;
    towers.push({x,z,height:high,top,southeast});
    const rows=[];for(let y=13;y<top-2;y+=8)rows.push({y,h:2.55,w:1.05,centers:[0]});
    for(const sign of[-1,1]){
      wall('x',x,z+sign*5.85,13,3,top-.25,1.3,rows,sign,masonry);
      wall('z',z,x+sign*5.85,13,3,top-.25,1.3,rows,sign,masonry);
      // Thin stringcourses and chamfer-like successive cap layers add actual
      // shadow geometry while staying within the original fourteen-metre cap.
      for(let y=11;y<top-2;y+=8){slab(x,z+sign*6.53,13.2,.24,y,.18);slab(x+sign*6.53,z,.24,13.2,y,.18);}
    }
    for(const y of[11,19,27,35,43])if(y<top-2)slab(x,z,10.8,10.8,y,.22,roofParts,mats.stoneDark);
    const ring=(outer,y,h)=>{const inner=11.3,t=(outer-inner)/2;for(const sign of[-1,1]){slab(x,z+sign*(inner/2+t/2),outer,t,y,h);slab(x+sign*(inner/2+t/2),z,t,inner,y,h);}};
    ring(13.35,top-.15,.3);ring(13.75,top+.12,.22);ring(14,top+.37,.28);
    slab(x,z,11.3,11.3,top+.54,.15,roofParts,mats.pavement);
    // Continuous parapet and distinct merlons, with corner duplicates removed.
    for(const sign of[-1,1]){box(staticParts,x,top+.95,z+sign*6.45,13.3,.8,.5,mats.stoneLight);box(staticParts,x+sign*6.45,top+.95,z,.5,.8,12.5,mats.stoneLight);}
    const merlons=new Set();for(let a=-6;a<=6;a+=3)for(const pos of[[a,-6],[a,6],[-6,a],[6,a]]){const key=pos.join(',');if(merlons.has(key))continue;merlons.add(key);box(staticParts,x+pos[0],top+1.75,z+pos[1],1.4,1.5,1.4,mats.stoneLight);}
  }
  // Flush geometry into a small number of material draws per semantic parent.
  let triangles=0,drawCalls=0,finite=true;
  for(const[parent,byMaterial]of batches)for(const[material,b]of byMaterial){if(!b.p.length)continue;for(const a of[b.p,b.n,b.uv])for(const value of a)if(!Number.isFinite(value))finite=false;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.computeBoundingBox();g.computeBoundingSphere();const m=new T.Mesh(g,material);m.name=parent===roofParts?'Removable Antonia terrace and upper floors':'Dressed Antonia architecture, courts and passage reveals';m.castShadow=m.receiveShadow=true;parent.add(m);triangles+=b.p.length/9;drawCalls++;}
  unitBox.dispose();world.updateMatrixWorld(true);
  const afterBounds=new T.Box3().setFromObject(antonia);
  const bounds=b=>({min:b.min.toArray(),max:b.max.toArray(),size:b.getSize(new T.Vector3()).toArray()});
  const result={finite,triangles,drawCalls,arcadeInfillPiers,permanentWallTop:wallTop,towers:towers.length,towerHeights:towers.map(t=>({southeast:t.southeast,height:t.height})),beforeBounds:bounds(beforeBounds),bounds:bounds(afterBounds),removableRoofGroups:1};
  antonia.userData.architectureV2=result;
  return result;
}
