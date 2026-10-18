/* A construction and finish pass for the sanctuary itself. Josephus, War
 * 5.5.4–6, describes white stone, gilding around the inner entrance and a
 * golden vine above it. Profiles, jointing and the distribution of gold are
 * interpretive; the sacred chamber plan and its furnishings are unchanged.
 * Call after enrichSanctuaryDetail(). East is +X; all dimensions are metres.
 */
function refineSanctuaryRealism(T, ctx) {
  const { world, mats } = ctx;
  let sanctuary;
  world.traverse(o => { if (o.isGroup && o.userData.landmark === 'sanctuary') sanctuary = o; });
  if (!sanctuary) return { error: 'Sanctuary group not found' };
  if (sanctuary.userData.architecturalRealismV3) return sanctuary.userData.architecturalRealismV3;
  const north = sanctuary.getObjectByName('North walls and chambers — removable for cutaway') || sanctuary;
  const roofs = sanctuary.getObjectByName('Roof and upper chambers — removable for cutaway') || sanctuary;
  const batches = new Map(), cachedBoxes = new Map();
  let removedTriangles = 0, dressedBlocks = 0, windows = 0;
  const counts = { cornices: 0, cofferPanels: 0, doorLeaves: 0, grapeClusters: 0, formedGoldPlates:0, botanicalFriezeModules:0, wornStepStones:0, smallNoseChips:0 };

  function geometry(positions, indices, uvs) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    if (uvs) g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    if (indices) {
      // Sub-centimetre wear can collapse an otherwise valid cap triangle
      // after Float32 quantization. Exclude those before computing normals.
      const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),valid=[],p=g.attributes.position;
      for(let i=0;i<indices.length;i+=3){a.fromBufferAttribute(p,indices[i]);b.fromBufferAttribute(p,indices[i+1]);c.fromBufferAttribute(p,indices[i+2]);if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-18)valid.push(indices[i],indices[i+1],indices[i+2]);}
      g.setIndex(valid);
    }
    g.computeVertexNormals(); return g;
  }
  function append(parent, source, material, position = [0,0,0], rotation = [0,0,0], castShadow = true, tint = [1,1,1]) {
    let byMaterial = batches.get(parent);
    if (!byMaterial) { byMaterial = new Map(); batches.set(parent, byMaterial); }
    const key = `${material.uuid}:${castShadow}`;
    if (!byMaterial.has(key)) byMaterial.set(key, { material, castShadow, position: [], normal: [], uv: [], color: [] });
    const batch = byMaterial.get(key), transform = new T.Object3D();
    transform.position.set(...position); transform.rotation.set(...rotation); transform.updateMatrix();
    const g = source.index ? source.toNonIndexed() : source.clone();
    g.applyMatrix4(transform.matrix);
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i=0;i<p.count;i++) {
      batch.position.push(p.getX(i),p.getY(i),p.getZ(i));
      batch.normal.push(n.getX(i),n.getY(i),n.getZ(i));
      batch.uv.push(uv ? uv.getX(i) : 0,uv ? uv.getY(i) : 0);
      if(material.vertexColors)batch.color.push(...tint);
    }
    g.dispose();
  }
  // Bevels stay in physical units, independent of each block's aspect ratio.
  // Broad flats have flat normals; the tiny dressed arris carries the light.
  function softBox(w,h,d,bevel=.012) {
    const b=Math.max(.0005,Math.min(bevel,w*.12,h*.12,d*.2)),key=[w,h,d,b].join(',');
    if (cachedBoxes.has(key)) return cachedBoxes.get(key);
    const s=new T.Shape();
    s.moveTo(-w/2+b,-h/2+b);s.lineTo(w/2-b,-h/2+b);s.lineTo(w/2-b,h/2-b);s.lineTo(-w/2+b,h/2-b);s.closePath();
    const g=new T.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:3,steps:1,curveSegments:1});
    g.translate(0,0,-d/2+b);g.clearGroups();cachedBoxes.set(key,g);return g;
  }
  const block=(p,x,y,z,w,h,d,m=mats.stoneLight,b=.012,shadow=true,tint=[1,1,1])=>append(p,softBox(w,h,d,b),m,[x,y,z],[0,0,0],shadow,tint);
  function loose(p,g,m,position,rotation,shadow=true) { append(p,g,m,position,rotation,shadow);g.dispose(); }
  function tube(p,points,radius,m,segments=24,sides=10) {
    const curve=new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a)));
    loose(p,new T.TubeGeometry(curve,segments,radius,sides,false),m);
  }
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const stable=(a,b=0)=>.5+.5*Math.sin(a*12.9898+b*78.233);

  // Formed sheets have a quiet common finish. Fine folded seams, not color
  // patches, divide them; broad 3–8 mm bows change reflected light gently.
  // A supporting gold face remains beneath every joint. The thin finish is
  // excluded from the coarse complex-wide shadow map to prevent seam acne.
  function goldField(parent,axis,plane,u0,u1,v0,v1,normal,nominalWidth=1.95,nominalHeight=2.30) {
    const rows=Math.max(1,Math.round((v1-v0)/nominalHeight)),height=(v1-v0)/rows;
    for(let row=0;row<rows;row++) {
      const count=Math.max(1,Math.round((u1-u0)/nominalWidth)),width=(u1-u0)/count,offset=width*(.18+.45*stable(row+1,v0));
      const cuts=[u0];let cutIndex=0;for(let u=u0+width-offset;u<u1-.30;u+=width){const cut=u+(stable(cutIndex++,row)-.5)*width*.16;if(cut>cuts[cuts.length-1]+.30&&cut<u1-.30)cuts.push(cut);}cuts.push(u1);
      for(let col=0;col<cuts.length-1;col++) {
        const left=cuts[col]+.0008,right=cuts[col+1]-.0008,bottom=v0+row*height+.0008,top=v0+(row+1)*height-.0008,w=right-left,h=top-bottom;
        const us=[0,.004/w,.014/w,.32,.67,1-.014/w,1-.004/w,1],vs=[0,.004/h,.014/h,.32,.67,1-.014/h,1-.004/h,1];
        const p=[],idx=[],uv=[],bow=.003+.005*stable(left,top),tiltU=(stable(top,left)-.5)*.0015,tiltV=(stable(left+3,top+7)-.5)*.0015;
        const point=(u,v,projection)=>axis==='x'?[plane+normal*projection,bottom+v*h,left+u*w]:[left+u*w,bottom+v*h,plane+normal*projection];
        for(const v of vs)for(const u of us) {
          const edge=Math.min(u*w,(1-u)*w,v*h,(1-v)*h),envelope=Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
          const fold=.0024+.00025*smooth(edge/.003),ripple=.00045*Math.sin(u*5.1+left)*Math.sin(v*4.3+top);
          const depth=fold+envelope*(bow+tiltU*(u-.5)+tiltV*(v-.5)+ripple);
          p.push(...point(u,v,depth));uv.push(u,v);
        }
        const nx=us.length,ny=vs.length;
        for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){const a=y*nx+x,b=a+1,c=a+nx,d=c+1;idx.push(a,c,b,b,c,d);}
        const edge=[];for(let x=0;x<nx;x++)edge.push(x);for(let y=1;y<ny;y++)edge.push(y*nx+nx-1);for(let x=nx-2;x>=0;x--)edge.push((ny-1)*nx+x);for(let y=ny-2;y>0;y--)edge.push(y*nx);
        const backStart=p.length/3;
        for(const i of edge){const u=us[i%nx],v=vs[Math.floor(i/nx)];p.push(...point(u,v,.001));uv.push(u,v);}
        const center=p.length/3;p.push(...point(.5,.5,.001));uv.push(.5,.5);
        for(let k=0;k<edge.length;k++) {const next=(k+1)%edge.length,a=edge[k],b=edge[next],c=backStart+k,d=backStart+next;idx.push(a,b,d,a,d,c,center,c,d);}
        if(axis==='x'?normal<0:normal>0)for(let i=0;i<idx.length;i+=3)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];
        loose(parent,geometry(p,idx,uv),mats.gold,undefined,undefined,false);counts.formedGoldPlates++;
      }
    }
  }

  // Smooth, solid botanical relief. A turned tip and cupped blade catch
  // grazing light, while a shallow shell keeps the ornament attached to its
  // plated field. Its restrained vocabulary is a creative reconstruction.
  function friezeLeaf(parent,x,y,z,angle,length=.68,halfWidth=.075) {
    const p=[],idx=[],uv=[],rows=12,cols=6;
    for(let row=0;row<=rows;row++) {
      const t=row/rows,turn=smooth((t-.76)/.24),width=.002+halfWidth*Math.pow(Math.sin(Math.PI*t),.65);
      const cy=y+Math.cos(angle)*length*t-.045*turn*turn,cz=z+Math.sin(angle)*length*t+Math.sign(angle)*.03*turn;
      for(let k=0;k<=cols;k++){const u=k/cols*2-1,rib=.014*(1-Math.abs(u))*Math.sin(Math.PI*t);p.push(x+.016+.046*Math.sin(Math.PI*t)+.025*turn-.018*u*u+rib,cy-u*width*Math.sin(angle),cz+u*width*Math.cos(angle));uv.push(k/cols,t);}
    }
    for(let row=0;row<rows;row++)for(let k=0;k<cols;k++){const a=row*(cols+1)+k,b=a+1,c=a+cols+1,d=c+1;idx.push(a,c,b,b,c,d);}
    const front=p.length/3,frontIndices=idx.slice();
    for(let i=0;i<front;i++){p.push(p[i*3]-.012,p[i*3+1],p[i*3+2]);uv.push(uv[i*2],uv[i*2+1]);}
    for(let i=0;i<frontIndices.length;i+=3)idx.push(frontIndices[i]+front,frontIndices[i+2]+front,frontIndices[i+1]+front);
    const edge=[];for(let k=0;k<=cols;k++)edge.push(k);for(let j=1;j<=rows;j++)edge.push(j*(cols+1)+cols);for(let k=cols-1;k>=0;k--)edge.push(rows*(cols+1)+k);for(let j=rows-1;j>0;j--)edge.push(j*(cols+1));
    for(let k=0;k<edge.length;k++){const a=edge[k],b=edge[(k+1)%edge.length];idx.push(a,b,b+front,a,b+front,a+front);}
    loose(parent,geometry(p,idx,uv),mats.gold);
  }

  // Remove only complete triangles from identified detail batches. Tall
  // structural wall triangles cannot fit these bounded detail regions.
  function stripDetails(names, regions) {
    sanctuary.traverse(o=>{
      if (!o.isMesh || o.isInstancedMesh || !names.includes(o.name)) return;
      const old=o.geometry,g=old.index?old.toNonIndexed():old;
      const keys=['position','normal','uv'].filter(k=>g.attributes[k]);
      const arrays=Object.fromEntries(keys.map(k=>[k,[]]));
      o.updateMatrix();const v=new T.Vector3();let omitted=0;
      for(let i=0;i<g.attributes.position.count;i+=3) {
        const vertices=[0,1,2].map(k=>{v.fromBufferAttribute(g.attributes.position,i+k).applyMatrix4(o.matrix);return [v.x,v.y,v.z];});
        if(regions.some(r=>vertices.every(p=>p[0]>=r[0]&&p[0]<=r[1]&&p[1]>=r[2]&&p[1]<=r[3]&&p[2]>=r[4]&&p[2]<=r[5]))) {omitted++;continue;}
        for(const key of keys) {const a=g.attributes[key];for(let k=0;k<3;k++)for(let j=0;j<a.itemSize;j++)arrays[key].push(a.array[(i+k)*a.itemSize+j]);}
      }
      if(omitted) {
        const replacement=new T.BufferGeometry();
        for(const key of keys)replacement.setAttribute(key,new T.Float32BufferAttribute(arrays[key],g.attributes[key].itemSize));
        replacement.computeBoundingBox();replacement.computeBoundingSphere();o.geometry=replacement;old.dispose();removedTriangles+=omitted;
      }
      if(g!==old)g.dispose();
    });
  }

  // Fine-jointed, dressed white ashlar. The 14 mm projection and 6 mm arris
  // avoid the earlier dark, rustic boss grid. Existing 15 mm bonds survive.
  const oldAshlar=[];
  sanctuary.traverse(o=>{if(o.isInstancedMesh&&o.name==='Limestone ashlar courses')oldAshlar.push(o);});
  const matrix=new T.Matrix4(),position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3();
  const quarryMaterials=new Map();
  for(const o of oldAshlar) {
    if(!quarryMaterials.has(o.material)){const m=o.material.clone();m.onBeforeCompile=o.material.onBeforeCompile;m.customProgramCacheKey=o.material.customProgramCacheKey;m.vertexColors=true;m.name='Dressed sanctuary stone — restrained quarry variation';quarryMaterials.set(o.material,m);}
    const facingMaterial=quarryMaterials.get(o.material);
    for(let i=0;i<o.count;i++) {
      o.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
      const xFace=scale.x<.15, sign=xFace?(position.x<-60?-1:1):Math.sign(position.z);
      const axis=xFace?'x':'z',oldDepth=scale[axis],wallPlane=position[axis]-sign*oldDepth/2;
      position[axis]=wallPlane-sign*.0135;scale[axis]=.055;
      const shade=.985+.03*(.5+.5*Math.sin(position.x*2.73+position.y*4.19+position.z*1.63));
      const warmth=.002*Math.sin(position.x*1.71+position.z*3.19);
      block(o.parent,position.x,position.y,position.z,scale.x,scale.y,scale.z,facingMaterial,.006,false,[shade+warmth,shade,shade-warmth]);dressedBlocks++;
    }
    removedTriangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*o.count;
    // The original unit-box geometry is shared with other scene instances.
    o.parent.remove(o);
  }

  // Twelve broad original treads, remade from separate dressed limestone
  // units. Each rounded nose stays inside the old footprint. The shared
  // central traffic path lowers the tread by at most 18 mm; the flight is
  // cared for, not a ruin. Tiny losses are limited to a handful of arrises.
  const oldSteps=sanctuary.getObjectByName('Twelve porch steps');
  if(oldSteps) {
    removedTriangles+=(oldSteps.geometry.index?oldSteps.geometry.index.count:oldSteps.geometry.attributes.position.count)/3*oldSteps.count;
    oldSteps.parent.remove(oldSteps); // Its unit geometry is shared elsewhere.
    for(let stair=0;stair<12;stair++) {
      const height=3-stair*.25,cx=-23.48+stair*.58,nominal=2.15,offset=stair%2?nominal*.5:0,cuts=[-15.8];
      for(let z=-15.8+nominal-offset;z<15.75;z+=nominal)if(z>-15.75)cuts.push(z);cuts.push(15.8);
      for(let stone=0;stone<cuts.length-1;stone++) {
        const z0=cuts[stone]+(stone? .006:0),z1=cuts[stone+1]-(stone<cuts.length-2?.006:0),seed=stable(stair+31,stone+19),chipped=seed>.9985;
        const chipZ=z0+(z1-z0)*(.25+.5*stable(stone+81,stair)),samples=[z0,z0+.006,z0+.025,z0+(z1-z0)*.28,z0+(z1-z0)*.55,z0+(z1-z0)*.80,z1-.025,z1-.006,z1];
        if(chipped){samples.push(chipZ-.045,chipZ,chipZ+.045);counts.smallNoseChips++;}
        samples.sort((a,b)=>a-b);
        const section=[[-.3,.006],[-.3,height-.003],[-.297,height],[-.12,height],[.07,height],[.255,height]];
        for(let j=1;j<=8;j++){const a=j/8*Math.PI/2;section.push([.255+.045*Math.sin(a),height-.045+.045*Math.cos(a)]);}
        section.push([.3,.006],[.294,0],[-.294,0]);
        const p=[],idx=[],uv=[],n=section.length;
        for(const z of samples)for(const [x,y]of section) {
          const path=Math.exp(-Math.pow(z/5.8,4)),onTop=smooth((y-(height-.15))/.15),edge=Math.min(z-z0,z1-z),joint=.003*(1-smooth(edge/.008));
          const toe=.35+.65*smooth((x+.20)/.48),wear=.018*path*toe*onTop;
          const chip=chipped?.009*Math.exp(-Math.pow((z-chipZ)/.024,2))*smooth((x-.23)/.06)*onTop:0;
          p.push(cx+x,5.4+y-wear-joint*onTop-chip,z);uv.push((x+.3)/.6,z/2.15);
        }
        for(let row=0;row<samples.length-1;row++)for(let j=0;j<n;j++){const a=row*n+j,b=row*n+(j+1)%n,c=a+n,d=b+n;idx.push(a,c,b,b,c,d);}
        for(const row of[0,samples.length-1]) {
          const start=p.length/3;
          for(let j=0;j<n;j++){const i=row*n+j;p.push(p[i*3],p[i*3+1],p[i*3+2]);uv.push(0,0);}
          const center=p.length/3;p.push(cx,5.4+height*.40,samples[row]);uv.push(.5,.5);
          for(let j=0;j<n;j++){const a=start+j,b=start+(j+1)%n;if(row===0)idx.push(center,a,b);else idx.push(center,b,a);}
        }
        loose(sanctuary,geometry(p,idx,uv),mats.stoneLight);counts.wornStepStones++;
      }
    }
  }

  // A closed mitered rectangular molding. The profile returns behind the
  // wall face; its corona has a real underside and its top cannot float.
  function horizontalProfile(parent,x,z,w,d,base,profile,material=mats.stoneLight) {
    const p=[],idx=[],uv=[];
    for(let side=0;side<4;side++) {
      const start=p.length/3;
      for(const [outset,rise] of profile) {
        const a=w/2+outset,b=d/2+outset,corners=[[-a,-b],[a,-b],[a,b],[-a,b]];
        for(const k of [side,(side+1)%4]) {p.push(x+corners[k][0],base+rise,z+corners[k][1]);uv.push(k===side?0:(side%2?d:w),rise);}
      }
      for(let row=0;row<profile.length-1;row++){const a=start+row*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}
    }
    loose(parent,geometry(p,idx,uv),material);counts.cornices++;
  }
  const baseSection=[[-.08,0],[.24,0],[.24,.12],[.21,.17],[.13,.23],[.05,.27],[.02,.34],[.04,.42],[.11,.48],[.16,.55],[.17,.63],[.11,.69],[.04,.73],[.04,.83],[-.08,.83],[-.08,0]];
  for(const sign of [-1,1]) {
    const parent=sign<0?north:sanctuary;
    horizontalProfile(parent,-29,sign*17.5,10.4,15.4,8.82,baseSection);
    horizontalProfile(parent,-54,sign*10.9,40.15,8.15,8.48,baseSection.map(a=>[a[0]*.8,a[1]*.8]));
    // Continuous intermediate floor ledges have a drip, not dark painted seams.
    for(const y of [15.7,22.7]) horizontalProfile(parent,-54,sign*10.9,40.05,8.05,y,[[-.05,0],[.12,0],[.12,.07],[.19,.12],[.19,.19],[.11,.23],[-.05,.23],[-.05,0]]);
  }

  // Replace the old six nested ribbons with a carved solid U architrave.
  // Profile sections are mitered through the lintel corners and end-capped
  // at the threshold, so gold has depth when examined from the side.
  stripDetails(['Sculpted limestone moldings and nested portal reveals'],[[-24.48,-22.62,8.58,41.12,-10.47,10.47],[-35.25,-22.70,54.72,56.36,-26.30,26.30]]);
  stripDetails(['Sanctuary v2 — carved capitals, flutes and architectural relief'],[[-22.98,-22.84,8.60,40.61,-10.03,10.03]]);
  function architrave(parent,x,base,halfWidth,top,profile,material) {
    const p=[],idx=[],uv=[],paths=[];
    for(const [outset,projection] of profile) paths.push([[-halfWidth-outset,base],[-halfWidth-outset,top+outset],[halfWidth+outset,top+outset],[halfWidth+outset,base]].map(a=>[x+projection,a[1],a[0]]));
    for(let side=0;side<3;side++) {
      const start=p.length/3;
      for(let row=0;row<paths.length;row++)for(const k of [side,side+1]){p.push(...paths[row][k]);uv.push(k===side?0:1,row/(paths.length-1));}
      for(let row=0;row<paths.length-1;row++){const a=start+row*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}
    }
    // Triangulate the closed cross-section at both ends of the U.
    const section=profile.map(a=>new T.Vector2(a[0],a[1])),caps=T.ShapeUtils.triangulateShape(section,[]);
    for(const side of [0,3]) {
      const start=p.length/3;for(const path of paths){p.push(...path[side]);uv.push(0,0);}
      for(const cap of caps)idx.push(...(side===0?cap:cap.slice().reverse()).map(k=>start+k));
    }
    loose(parent,geometry(p,idx,uv),material);
  }
  const outerStone=[[0,0],[0,.12],[.025,.16],[.065,.20],[.10,.24],[.12,.30],[.10,.35],[.05,.39],[.05,.44],[.39,.44],[.44,.39],[.44,-.07],[0,-.07],[0,0]];
  architrave(sanctuary,-23.33,8.65,9.98,40.64,outerStone,mats.stoneLight);
  const outerGold=[[0,0],[0,.16],[.045,.21],[.09,.24],[.13,.31],[.13,.48],[.16,.55],[.22,.61],[.29,.65],[.40,.67],[.40,.76],[.59,.76],[.64,.83],[.66,.92],[.64,1.01],[.58,1.07],[.58,1.13],[.87,1.13],[.96,1.22],[1.02,1.34],[1.10,1.40],[1.15,1.40],[1.15,-.05],[0,-.05],[0,0]];
  architrave(sanctuary,-24.33,8.65,8.83,39.49,outerGold,mats.gold);

  // Proper assembled crown: the main wall carries a carved architrave,
  // spaced dentils, a deeply projecting corona/drip, a cyma and the coping.
  // The closed body also seats the previous 0.24 m floating coping gap.
  block(roofs,-29,55.65,0,10.45,1.90,50.45,mats.stoneLight,.018);
  const crown=[[-.08,0],[.10,0],[.10,.13],[.24,.16],[.24,.26],[.10,.31],[.10,.39],[.17,.43],[.17,.78],[.38,.78],[.38,.89],[.70,.89],[.70,1.10],[.63,1.14],[.59,1.22],[.59,1.30],[.65,1.39],[.75,1.46],[.84,1.53],[.87,1.62],[.87,1.72],[-.08,1.72],[-.08,0]];
  horizontalProfile(roofs,-29,0,10.45,50.45,54.80,crown);
  for(const sign of [-1,1]) {
    for(let z=-24.6;z<=24.6;z+=.74)block(roofs,-29+sign*5.40,55.38,z,.49,.36,.34,mats.stoneLight,.015);
    for(let x=-33.6;x<=-24.4;x+=.74)block(roofs,x,55.38,sign*25.40,.34,.36,.49,mats.stoneLight,.015);
  }
  horizontalProfile(roofs,-29,0,10.50,50.50,56.55,[[-.05,0],[.06,0],[.09,.07],[.09,.14],[.03,.19],[-.05,.19],[-.05,0]]);

  // A broad gilded frieze under the crown is based on the museum model's
  // architectural reading; exact plating divisions remain interpretive.
  for(const sign of [-1,1]) {
    const parent=sign<0?north:sanctuary;
    block(parent,-23.925,53.62,sign*17.5,.13,1.58,15.03,mats.gold,.010);
    for(const y of [52.78,54.46])block(parent,-23.82,y,sign*17.5,.16,.10,15.08,mats.gold,.014);
  }
  block(roofs,-23.925,53.62,0,.13,1.58,20.02,mats.gold,.010);
  for(const y of [52.78,54.46])block(roofs,-23.82,y,0,.16,.10,20.02,mats.gold,.014);
  // Remove the isolated modern-looking square rosettes, leaving calm dressed
  // white stone between the pilaster order and continuous gilded frieze.
  const panelRegions=[];
  for(const z of [-20.4,-14.4,14.4,20.4])panelRegions.push([-24.05,-22.20,47.18,52.22,z-2.48,z+2.48]);
  stripDetails(['Sanctuary v2 — carved capitals, flutes and architectural relief'],panelRegions);
  const middlePilasters=[-17.4,17.4].map(z=>[-24.8,-22.1,10.15,46.30,z-1.65,z+1.65]);
  stripDetails(['Baked architectural details','Sanctuary v2 — carved capitals, flutes and architectural relief'],middlePilasters);

  // A low, coherent botanical register, not a row of applied medallions.
  // Palmettes alternate with pomegranates over one flowing branch; all
  // figures remain plants. Its three spans follow the cutaway wall parents.
  for(const [from,to,parent]of[[-25,-10,north],[-10,10,roofs],[10,25,sanctuary]]) {
    const modules=Math.round((to-from)/2.1),span=(to-from)/modules;
    for(let i=0;i<modules;i++) {
      const z=from+(i+.5)*span,x=-23.832,base=53.25;
      tube(parent,[[x,base,from+i*span],[x+.008,base+.065,z-.44],[x,base+.005,z],[x+.012,base+.09,z+.44],[x,base,from+(i+1)*span]],.026,mats.gold,28,10);
      for(const sign of[-1,1])friezeLeaf(parent,x,base+.01,z+sign*.59,sign*1.05,.25,.035);
      if(i%2===0) {
        for(const angle of[-.95,-.49,0,.49,.95])friezeLeaf(parent,x,base+.10,z,angle,.70,.069);
        for(const sign of[-1,1]) {
          const points=[];
          for(let j=0;j<=32;j++){const t=j/32,a=-Math.PI*.57+t*Math.PI*2.05,r=.19*(1-t)+.022;points.push([x+.025,base+.17+Math.sin(a)*r,z+sign*(.27+Math.cos(a)*r)]);}
          tube(parent,points,.020,mats.gold,36,8);
        }
      } else {
        tube(parent,[[x,base,z],[x+.016,base+.20,z-.06],[x+.024,base+.31,z]],.025,mats.gold,18,10);
        const fruit=new T.SphereGeometry(1,24,16);fruit.scale(.080,.225,.170);
        loose(parent,fruit,mats.gold,[x+.025,base+.51,z]);
        for(const angle of[-.55,0,.55])friezeLeaf(parent,x+.02,base+.705,z,angle,.14,.022);
      }
      counts.botanicalFriezeModules++;
    }
  }

  // The inner entrance and wall around it were gilded (War 5.5.4). Gold
  // sheets here cover real wall faces and folded reveals, not a flat sticker
  // suspended in the porch opening. The door recess retains its full depth.
  block(roofs,-34.425,31.32,0,.13,15.78,13.12,mats.gold,.012);
  for(const sign of [-1,1]) {
    const parent=sign<0?north:sanctuary;
    // Full-depth porch returns replace the old shallow, exposed gray planes.
    // The foil is seated against a solid wall tied into the white porch wing.
    block(parent,-29.16,24.00,sign*9.415,9.75,30.60,1.30,mats.stoneLight,.012);
    block(parent,-29.16,24.00,sign*8.732,9.73,30.55,.078,mats.gold,.010);
    for(const y of [8.96,39.05])block(parent,-29.16,y,sign*8.671,9.74,.12,.13,mats.gold,.015);
    block(parent,-36.52,15.92,sign*4.94,4.08,14.54,3.28,mats.stoneLight,.015);
    block(parent,-34.425,15.92,sign*4.94,.13,14.54,3.28,mats.gold,.012);
    block(parent,-36.48,15.92,sign*3.285,4.03,14.54,.10,mats.gold,.010);
    for(const y of [9.08,22.81])block(parent,-36.48,y,sign*3.19,4.03,.15,.18,mats.gold,.020);
    // Folded sheet joints and narrow raised fillets emphasize the deep plane.
    for(const x of [-37.72,-36.50,-35.28])block(parent,x,15.92,sign*3.215,.07,13.55,.07,mats.gold,.010);
  }
  block(roofs,-36.50,23.30,0,4.10,.28,13.16,mats.gold,.015);
  architrave(sanctuary,-34.42,8.65,3.24,23.24,[[0,0],[0,.12],[.07,.20],[.12,.23],[.16,.30],[.18,.41],[.16,.49],[.10,.55],[.10,.62],[.34,.62],[.43,.54],[.43,-.08],[0,-.08],[0,0]],mats.gold);
  block(sanctuary,-36.53,8.68,0,4.10,.11,6.55,mats.stoneLight,.015);
  for(const z of [-2.93,0,2.93])block(sanctuary,-34.28,8.75,z,.48,.08,.13,mats.gold,.010);

  // Recessed raised-panel gilded joinery. Individual parts have real edge
  // radii, substantial stiles/rails, hinge barrels and ring backplates.
  for(const sign of [-1,1]) {
    const door=sanctuary.getObjectByName(sign<0?'North gilded door leaf':'South gilded door leaf');
    if(!door)continue;
    for(const child of [...door.children])if(child.isMesh){removedTriangles+=(child.geometry.index?child.geometry.index.count:child.geometry.attributes.position.count)/3;door.remove(child);child.geometry.dispose();}
    const z=-sign*1.45;
    block(door,0,6,z,.30,12,2.90,mats.wood,.020);
    block(door,.172,6,z,.055,11.98,2.88,mats.gold,.010);
    for(const offset of [-1.33,1.33])block(door,.235,6,z+offset,.13,11.88,.20,mats.gold,.025);
    for(const y of [.18,3.0,6.0,9.0,11.82])block(door,.235,y,z,.13,.23,2.70,mats.gold,.022);
    for(let row=0;row<4;row++) {
      const y=1.57+row*2.90;
      // A closed mitered panel molding, oriented in the door's YZ plane.
      const p=[],idx=[],uv=[],profile=[[0,0],[.025,.025],[.055,.07],[.075,.09],[.11,.095],[.14,.06],[.16,.015],[.16,-.015],[0,-.015],[0,0]];
      for(let side=0;side<4;side++) {
        const start=p.length/3;
        for(const [outset,projection]of profile){const a=1.035+outset,b=1.155+outset,c=[[-a,-b],[a,-b],[a,b],[-a,b]];for(const k of[side,(side+1)%4]){p.push(.206+projection,y+c[k][1],z+c[k][0]);uv.push(k===side?0:1,outset);}}
        for(let j=0;j<profile.length-1;j++){const a=start+j*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
      }
      loose(door,geometry(p,idx,uv),mats.gold);
      block(door,.228,y,z,.055,2.18,1.96,mats.gold,.035);
    }
    for(const y of [1.1,5.95,10.85]) {
      loose(door,new T.CylinderGeometry(.095,.095,.48,24),mats.gold,[.11,y,sign*.015]);
      block(door,.28,y,z+sign*.94,.055,.15,.70,mats.gold,.018);
    }
    const hz=z-sign*.70;
    const backplate=new T.SphereGeometry(1,20,12);backplate.scale(.028,.21,.16);
    loose(door,backplate,mats.gold,[.33,5.65,hz]);
    loose(door,new T.TorusGeometry(.19,.031,12,40),mats.gold,[.385,5.55,hz],[0,Math.PI/2,0]);
    counts.doorLeaves++;
  }

  // Coffered porch soffit: limestone structural cross rails enclose recessed
  // gilt panels. Every panel sits under the removable ceiling, with beveled
  // frames and a real 140 mm recess rather than a printed checkerboard.
  for(let ix=0;ix<3;ix++)for(let iz=0;iz<6;iz++) {
    const x=-32.10+ix*3.05,z=-7.35+iz*2.94;
    block(roofs,x,39.255,z,2.85,.10,2.73,mats.gold,.018);
    block(roofs,x,39.10,z-1.30,2.91,.22,.18,mats.stoneLight,.025);
    block(roofs,x,39.10,z+1.30,2.91,.22,.18,mats.stoneLight,.025);
    block(roofs,x-1.35,39.10,z,.18,.22,2.47,mats.stoneLight,.025);
    block(roofs,x+1.35,39.10,z,.18,.22,2.47,mats.stoneLight,.025);
    counts.cofferPanels++;
  }

  // Window voussoirs are true curved wedges with 10 mm radial joints. The
  // splayed reveal recedes into an opaque unclaimed chamber, matching the
  // existing reconstruction's treatment without inventing room interiors.
  const windowRegions=[];
  const windowSpecs=[];
  for(const sign of[-1,1]) {
    const parent=sign<0?north:sanctuary;
    for(let row=0;row<3;row++)for(let i=0;i<7;i++)windowSpecs.push({parent,x:-70.6+i*5.4,y:10.4+row*7,z:sign*15,sign,w:1.05,h:2.35});
    for(let i=0;i<8;i++)windowSpecs.push({parent:roofs,x:-70.8+i*4.6,y:39.2,z:sign*7,sign,w:1.25,h:3.4});
  }
  for(const s of windowSpecs)windowRegions.push([s.x-s.w/2-.35,s.x+s.w/2+.35,s.y-.20,s.y+s.h+.29,s.z-.36,s.z+.36]);
  stripDetails(['Baked architectural details'],windowRegions);
  function windowDetail(s) {
    const {parent,x,y,z,sign,w,h}=s,r=w/2,spring=h-r,front=.29,back=.025,ro=r+.31,ri=r+.11;
    const opening=new T.Shape();opening.moveTo(-r,0);opening.lineTo(r,0);opening.lineTo(r,spring);opening.absarc(0,spring,r,0,Math.PI,false);opening.closePath();
    loose(parent,new T.ShapeGeometry(opening,24),mats.dark,[x,y,z+sign*back],[0,sign<0?Math.PI:0,0],false);
    // Continuous inner splay, split only at the jamb/arch tangency.
    const p=[],idx=[],uv=[];
    const arc=[];arc.push([-r,0],[-r,spring]);for(let j=1;j<=24;j++){const a=Math.PI-j/24*Math.PI;arc.push([Math.cos(a)*r,spring+Math.sin(a)*r]);}arc.push([r,0]);
    for(let i=0;i<arc.length;i++){const a=arc[i],rr=i===0||i===arc.length-1?Math.sign(a[0])*ri:a[0]/r*ri;const yy=i===0||i===arc.length-1?-.04:spring+(a[1]-spring)/r*ri;p.push(x+a[0],y+a[1],z+sign*back,x+rr,y+yy,z+sign*front);uv.push(0,0,1,1);}
    for(let j=0;j<arc.length-1;j++){const a=j*2;if(sign>0)idx.push(a,a+2,a+1,a+1,a+2,a+3);else idx.push(a,a+1,a+2,a+1,a+3,a+2);}
    loose(parent,geometry(p,idx,uv),mats.stoneLight);
    const pieces=9;
    for(let j=0;j<pieces;j++) {
      const joint=.010/(ri+ro),a0=j/pieces*Math.PI+joint,a1=(j+1)/pieces*Math.PI-joint,shape=new T.Shape();
      shape.moveTo(Math.cos(a0)*ri,spring+Math.sin(a0)*ri);shape.absarc(0,spring,ri,a0,a1,false);shape.lineTo(Math.cos(a1)*ro,spring+Math.sin(a1)*ro);shape.absarc(0,spring,ro,a1,a0,true);shape.closePath();
      const g=new T.ExtrudeGeometry(shape,{depth:.27,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:2,curveSegments:5,steps:1});
      loose(parent,g,mats.stoneLight,[x,y,z+sign*.025],[0,sign<0?Math.PI:0,0]);
    }
    const rows=Math.ceil(spring/.48),height=spring/rows;
    for(const side of[-1,1])for(let j=0;j<rows;j++)block(parent,x+side*(ri+ro)/2,y+(j+.5)*height,z+sign*.16,ro-ri,height-.01,.27,mats.stoneLight,.006);
    block(parent,x,y-.08,z+sign*.20,w+.76,.18,.58,mats.stoneLight,.012);windows++;
  }
  for(const s of windowSpecs)windowDetail(s);

  // Sheet courses align to architectural fields; the white wings, carved
  // frames, and door joinery keep their separate dressed construction.
  goldField(roofs,'x',-34.36,-6.56,6.56,23.43,39.21,1);
  for(const sign of[-1,1]) {
    const parent=sign<0?north:sanctuary;
    goldField(parent,'z',sign*8.693,-34.025,-24.295,8.725,39.275,-sign);
    goldField(parent,'x',-34.36,sign<0?-6.58:3.30,sign<0?-3.30:6.58,8.65,23.19,1);
    goldField(parent,'z',sign*3.235,-38.495,-34.465,8.65,23.19,-sign);
    goldField(parent,'x',-23.86,sign<0?-25.015:10.01,sign<0?-10.01:25.015,52.83,54.41,1,1.80,1.58);
  }
  goldField(roofs,'x',-23.86,-10.01,10.01,52.83,54.41,1,1.80,1.58);

  // A living, asymmetrical gilded vine above the INNER entrance. Thin
  // chased grape leaves and staggered clusters replace the outer spike rail.
  const vine=sanctuary.getObjectByName('Golden grapevine above the sanctuary entrance');
  if(vine) {
    // Its backing is the removable upper entrance wall; both must disappear
    // together in cutaway rather than leaving gold branches in empty space.
    roofs.add(vine);
    for(const child of[...vine.children])if(child.isMesh){removedTriangles+=(child.geometry.index?child.geometry.index.count:child.geometry.attributes.position.count)/3*(child.isInstancedMesh?child.count:1);vine.remove(child);child.geometry.dispose();}
    const vx=-34.22,vy=25.42;
    tube(vine,[[vx,vy,-4.70],[vx+.12,vy+.38,-3.10],[vx+.03,vy+.08,-1.20],[vx+.16,vy+.46,.9],[vx+.04,vy+.18,3.1],[vx+.11,vy+.52,4.75]],.080,mats.gold,72,12);
    const berries=[];
    for(let cluster=0;cluster<7;cluster++) {
      const z=-4.10+cluster*1.34,raise=.10+.24*Math.sin(cluster*2.1),cy=vy+.03+raise;
      tube(vine,[[vx+.05,vy+.20,z-.22],[vx+.20,cy+.22,z],[vx+.30,cy-.09,z+.12]],.032,mats.gold,18,8);
      for(let row=0;row<5;row++) {
        const cols=Math.max(1,4-Math.floor(row*.75));
        for(let k=0;k<cols;k++) {
          const r=.125+.018*Math.sin(cluster*3+row*2+k),zz=z+(k-(cols-1)/2)*.235+(row%2)*.055;
          berries.push([vx+.25+.065*Math.cos(k*2+row),cy-.12-row*.22,zz,r]);
          if(row<3&&k<cols-1)berries.push([vx+.08,cy-.20-row*.22,zz+.12,r*.95]);
        }
      }
      // Branches diverge and leaves turn back toward the plated wall.
      const direction=cluster%2?1:-1,leafZ=z+direction*.43,leafY=cy+.38;
      tube(vine,[[vx+.07,cy+.09,z],[vx+.19,leafY-.10,leafZ],[vx+.22,leafY+.14,leafZ+direction*.16]],.025,mats.gold,18,8);
      const anchorY=leafY+.14,anchorZ=leafZ+direction*.16;
      const leafPoint=(u,v,lift=0)=>{
        const t=(v-.14)/.88,fold=.009+.018*Math.abs(u)/.65+.004*Math.sin(Math.PI*Math.max(0,Math.min(1,t)))+.006*Math.pow(Math.max(0,t),4)+.002*Math.sin(v*10+cluster)*u;
        return[vx+.22+fold+lift,anchorY+(v-.14)*.93,anchorZ+u*.83+direction*(v-.14)*.10];
      };
      // Five lobes, a basal cleft and small irregular teeth give a grape-leaf
      // silhouette. Its shallow V fold is sheet metal, not an inflated dome.
      const outline=[[0,.14],[-.19,.04],[-.44,.07],[-.52,.18],[-.44,.28],[-.65,.40],[-.52,.53],[-.58,.73],[-.35,.67],[-.31,.86],[-.14,.77],[0,1.02],[.16,.76],[.33,.85],[.36,.66],[.59,.72],[.52,.52],[.64,.39],[.44,.28],[.51,.17],[.43,.07],[.18,.04]],boundary=[];
      for(let k=0;k<outline.length;k++) {
        const a=outline[k],b=outline[(k+1)%outline.length],du=b[0]-a[0],dv=b[1]-a[1],length=Math.hypot(du,dv),tooth=.008+.009*stable(k+cluster,k*.23);
        boundary.push(a,[(a[0]+b[0])/2-dv/length*tooth,(a[1]+b[1])/2+du/length*tooth]);
      }
      const p=[],idx=[],uv=[],rings=5,n=boundary.length,center=[0,.48];
      p.push(...leafPoint(...center));uv.push(.5,.48);
      for(let ring=1;ring<=rings;ring++) {
        const t=ring/rings;
        for(const edge of boundary){const u=center[0]+(edge[0]-center[0])*t,v=center[1]+(edge[1]-center[1])*t;p.push(...leafPoint(u,v));uv.push((u+.65)/1.30,v);}
      }
      for(let k=0;k<n;k++)idx.push(0,1+k,1+(k+1)%n);
      for(let ring=0;ring<rings-1;ring++)for(let k=0;k<n;k++){const a=1+ring*n+k,b=1+ring*n+(k+1)%n,c=a+n,d=b+n;idx.push(a,c,b,b,c,d);}
      const frontCount=p.length/3,frontIndices=idx.slice();
      for(let i=0;i<frontCount;i++){p.push(p[i*3]-.003,p[i*3+1],p[i*3+2]);uv.push(uv[i*2],uv[i*2+1]);}
      for(let i=0;i<frontIndices.length;i+=3)idx.push(frontIndices[i]+frontCount,frontIndices[i+2]+frontCount,frontIndices[i+1]+frontCount);
      for(let k=0;k<n;k++){const a=1+(rings-1)*n+k,b=1+(rings-1)*n+(k+1)%n;idx.push(a,b+frontCount,b,a,a+frontCount,b+frontCount);}
      loose(vine,geometry(p,idx,uv),mats.gold);
      // Chased primary veins branch from the petiole; fine secondary veins
      // meet them instead of floating above the blade as separate wires.
      const vein=(points,radius,segments=16)=>tube(vine,points.map(point=>leafPoint(point[0],point[1],.0012)),radius,mats.gold,segments,6);
      vein([[0,.14],[.012,.42],[-.009,.72],[0,1.00]],.0038,28);
      for(const sign of[-1,1]) {
        vein([[0,.14],[sign*.20,.36],[sign*.40,.56],[sign*.51,.70]],.0032,20);
        vein([[0,.14],[sign*.24,.26],[sign*.56,.40]],.0030,18);
        vein([[sign*.006,.53],[sign*.15,.68],[sign*.28,.81]],.0020,14);
        vein([[sign*.31,.47],[sign*.42,.49],[sign*.50,.53]],.0018,12);
      }
      counts.grapeClusters++;
    }
    const sphere=new T.SphereGeometry(1,16,10),mesh=new T.InstancedMesh(sphere,mats.gold,berries.length),dummy=new T.Object3D();
    berries.forEach((b,i)=>{dummy.position.set(b[0],b[1],b[2]);dummy.scale.set(b[3]*.94,b[3]*1.12,b[3]);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.name='Gilded fruit — staggered solid clusters above the inner entrance';mesh.castShadow=true;mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();vine.add(mesh);
    vine.userData.realismLocation=[vx,vy,0];
  }

  // Older rosette meshes included collapsed center fans. Remove those
  // inherited zero-area faces and repair singular normals on surviving faces.
  let inheritedDegeneratesRemoved=0,inheritedNormalsRepaired=0;
  sanctuary.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh||!['Sanctuary v2 — carved capitals, flutes and architectural relief','Sculpted limestone moldings and nested portal reveals'].includes(o.name))return;
    const old=o.geometry,g=old.index?old.toNonIndexed():old,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
    const data={position:[],normal:[],uv:[]},a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),normal=new T.Vector3();let removed=0,repaired=0;
    for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);normal.subVectors(b,a).cross(c.sub(a));if(normal.lengthSq()<1e-18){removed++;continue;}normal.normalize();for(let k=0;k<3;k++){data.position.push(p.getX(i+k),p.getY(i+k),p.getZ(i+k));const len=n?Math.hypot(n.getX(i+k),n.getY(i+k),n.getZ(i+k)):0;if(len<.1){data.normal.push(normal.x,normal.y,normal.z);repaired++;}else data.normal.push(n.getX(i+k)/len,n.getY(i+k)/len,n.getZ(i+k)/len);data.uv.push(uv?uv.getX(i+k):0,uv?uv.getY(i+k):0);}}
    if(removed||repaired){const replacement=new T.BufferGeometry();for(const key of['position','normal','uv'])replacement.setAttribute(key,new T.Float32BufferAttribute(data[key],key==='uv'?2:3));replacement.computeBoundingBox();replacement.computeBoundingSphere();o.geometry=replacement;old.dispose();removedTriangles+=removed;inheritedDegeneratesRemoved+=removed;inheritedNormalsRepaired+=repaired;}
    if(g!==old)g.dispose();
  });
  let addedTriangles=0,addedDrawCalls=0,finite=true,badNormals=0;
  for(const [parent,byMaterial] of batches)for(const data of byMaterial.values()) {
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.position,3));g.setAttribute('normal',new T.Float32BufferAttribute(data.normal,3));g.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));
    if(data.material.vertexColors)g.setAttribute('color',new T.Float32BufferAttribute(data.color,3));
    g.computeBoundingBox();g.computeBoundingSphere();
    for(const value of data.position)if(!Number.isFinite(value))finite=false;
    for(let i=0;i<data.normal.length;i+=3){const n=Math.hypot(data.normal[i],data.normal[i+1],data.normal[i+2]);if(!Number.isFinite(n))finite=false;if(n<.90||n>1.10)badNormals++;}
    const mesh=new T.Mesh(g,data.material);mesh.name=data.castShadow?'Sanctuary v3 — dressed construction, gilt joinery and carved profiles':'Sanctuary v3 — fine-jointed dressed stone and recessed dark fields';mesh.castShadow=data.castShadow;mesh.receiveShadow=true;parent.add(mesh);
    addedTriangles+=data.position.length/9;addedDrawCalls++;
  }
  for(const g of cachedBoxes.values())g.dispose();
  if(vine){const fruit=vine.getObjectByName('Gilded fruit — staggered solid clusters above the inner entrance');if(fruit){addedTriangles+=(fruit.geometry.index?fruit.geometry.index.count:fruit.geometry.attributes.position.count)/3*fruit.count;addedDrawCalls++;}}
  const stats={addedTriangles,removedTriangles,netTriangles:addedTriangles-removedTriangles,addedDrawCalls,dressedBlocks,windows,pilasters:4,...counts,finite,badNormals,inheritedDegeneratesRemoved,inheritedNormalsRepaired,jointWidth:.015,stoneArris:.006,facadeFacingProjection:.014,goldSheetSeam:.0016,goldSheetEdgeFold:.00025,goldSheetBow:[.003,.008],vineLeafThickness:.003,chasedVeinsPerLeaf:9,maximumTreadWear:.018,closedCopingGap:.24,preservesHolyOfHolies:true,preservesCutaway:true,vinePoint:vine?.userData.realismLocation||null};
  sanctuary.userData.architecturalRealismV3=stats;world.userData.sanctuaryRealismV3=stats;return stats;
}
