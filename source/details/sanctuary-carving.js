/* Sanctuary detail pass: interpretive carved classical profiles, rather than
 * a claim that an intact sanctuary elevation survives. Josephus AJ 15.11 and
 * the Israel Museum model inform the architectural language. The particular
 * leaf carving, panel rosettes and profiles below are reconstruction choices.
 * Call after buildSanctuary() and refineTempleSanctuary(). No layout changes.
 */
function enrichSanctuaryDetail(T, ctx) {
  const { world, mats } = ctx;
  let sanctuary;
  world.traverse(object => {
    if (object.isGroup && object.userData.landmark === 'sanctuary') sanctuary = object;
  });
  if (!sanctuary) return { error: 'Sanctuary group not found' };
  if (sanctuary.userData.architecturalDetailV2) return sanctuary.userData.architecturalDetailV2;
  const north = sanctuary.getObjectByName('North walls and chambers — removable for cutaway') || sanctuary;
  // A dressed sanctuary face has shallow mortar reveals. The earlier 90 mm
  // overlay made each small ashlar edge a dark tooth at normal viewing range.
  // Retain the bond and joints, but seat the facing 12 mm proud of its wall;
  // the central head and wings now share one dressed facade plane, with
  // equally shallow joints on the two short porch return walls.
  let dressedAshlarInstances = 0;
  const ashlarMatrix = new T.Matrix4(), ashlarPosition = new T.Vector3();
  const ashlarScale = new T.Vector3(), ashlarRotation = new T.Quaternion();
  sanctuary.traverse(object => {
    if (!object.isInstancedMesh || object.name !== 'Limestone ashlar courses') return;
    let changed = false;
    for (let i = 0; i < object.count; i++) {
      object.getMatrixAt(i, ashlarMatrix);
      ashlarMatrix.decompose(ashlarPosition, ashlarRotation, ashlarScale);
      if (ashlarPosition.y < 8.4 || ashlarPosition.y > 55.4) continue;
      const frontFace = Math.abs(ashlarScale.x-.09) < .001 && ashlarPosition.x >= -24.1 && ashlarPosition.x <= -23.8 && Math.abs(ashlarPosition.z) <= 25.1;
      const porchReturn = Math.abs(ashlarScale.z-.09) < .001 && Math.abs(Math.abs(ashlarPosition.z)-25.045) < .01 && ashlarPosition.x >= -34.1 && ashlarPosition.x <= -23.9;
      if (!frontFace && !porchReturn) continue;
      if (frontFace) { ashlarPosition.x = -23.994; ashlarScale.x = .012; }
      else { ashlarPosition.z = Math.sign(ashlarPosition.z)*25.006; ashlarScale.z = .012; }
      ashlarMatrix.compose(ashlarPosition, ashlarRotation, ashlarScale);
      object.setMatrixAt(i, ashlarMatrix);
      dressedAshlarInstances++; changed = true;
    }
    if (changed) {
      object.castShadow = false;
      object.instanceMatrix.needsUpdate = true;
      object.computeBoundingSphere(); object.computeBoundingBox();
    }
  });
  const regions = [];
  for (const sign of [-1, 1]) {
    for (const z of [sign*11.4, sign*17.4, sign*23.3]) {
      // Remove the original whole shaft, black painted flute strips, stepped
      // base blocks, two cap boxes and torus-shaped scroll placeholders.
      regions.push([-24.052,-23.248,10.248,44.852,z-.662,z+.662]);
      regions.push([-23.231,-23.169,12.298,43.702,z-.45,z+.45]);
      regions.push([-24.21,-22.70,10.19,11.81,z-1.11,z+1.11]);
      regions.push([-24.31,-22.30,44.04,46.10,z-1.32,z+1.32]);
    }
    for (const z of [sign*14.4, sign*20.4]) {
      regions.push([-24.00,-23.65,47.30,52.10,z-2.25,z+2.25]);
    }
  }
  // Replace the spherical studs in the central gold frieze with real relief.
  regions.push([-23.15,-23.00,41.20,41.80,-9.20,9.20]);
  let removedTriangles = 0;
  sanctuary.traverse(object => {
    if (!object.isMesh || object.isInstancedMesh || object.name !== 'Baked architectural details') return;
    const original = object.geometry;
    const geometry = original.index ? original.toNonIndexed() : original;
    const attributes = Object.keys(geometry.attributes).filter(key => ['position','normal','uv'].includes(key));
    const arrays = Object.fromEntries(attributes.map(key => [key, []]));
    const position = geometry.attributes.position;
    object.updateMatrix();
    const point = new T.Vector3();
    let removed = 0;
    for (let i = 0; i < position.count; i += 3) {
      const points = [0,1,2].map(k => {
        point.fromBufferAttribute(position, i+k).applyMatrix4(object.matrix);
        return [point.x, point.y, point.z];
      });
      const omit = regions.some(r => points.every(p => p[0]>=r[0] && p[0]<=r[1] && p[1]>=r[2] && p[1]<=r[3] && p[2]>=r[4] && p[2]<=r[5]));
      if (omit) { removed++; continue; }
      for (const key of attributes) {
        const a = geometry.attributes[key];
        for (let k = 0; k < 3; k++) for (let n = 0; n < a.itemSize; n++) arrays[key].push(a.array[(i+k)*a.itemSize+n]);
      }
    }
    if (removed) {
      const replacement = new T.BufferGeometry();
      for (const key of attributes) replacement.setAttribute(key, new T.Float32BufferAttribute(arrays[key], geometry.attributes[key].itemSize));
      replacement.computeBoundingSphere(); replacement.computeBoundingBox();
      object.geometry = replacement; original.dispose(); removedTriangles += removed;
    }
    if (geometry !== original) geometry.dispose();
  });

  // One draw per material for each cutaway parent. All geometry is local to
  // its architectural group; no independent animation or runtime allocation.
  const batches = new Map();
  function append(parent, geometry, material, x=0, y=0, z=0, rotation=null, scale=null) {
    if (!batches.has(parent)) batches.set(parent, new Map());
    const byMaterial = batches.get(parent);
    if (!byMaterial.has(material)) byMaterial.set(material, { position:[], normal:[], uv:[] });
    const batch = byMaterial.get(material), transform = new T.Object3D();
    transform.position.set(x,y,z);
    if (rotation) transform.rotation.set(...rotation);
    if (scale) transform.scale.set(...scale);
    transform.updateMatrix();
    const clone = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    clone.applyMatrix4(transform.matrix);
    if (!clone.attributes.normal) clone.computeVertexNormals();
    const p=clone.attributes.position, n=clone.attributes.normal, u=clone.attributes.uv;
    for (let i=0;i<p.count;i++) {
      batch.position.push(p.getX(i),p.getY(i),p.getZ(i));
      batch.normal.push(n.getX(i),n.getY(i),n.getZ(i));
      batch.uv.push(u?u.getX(i):0,u?u.getY(i):0);
    }
    clone.dispose(); geometry.dispose();
  }
  const block = (parent,x,y,z,w,h,d,material=mats.stoneLight) => append(parent,new T.BoxGeometry(w,h,d),material,x,y,z);
  function surface(positions, indices, uvs) {
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
    geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
  }

  // Sweep a carved horizontal section around a slightly concave abacus plan.
  // The concavity gives Corinthian corners their projection and silhouette.
  function rectangularProfile(parent,x,y,z,width,depth,profile,concavity=0,material=mats.stoneLight) {
    const positions=[],indices=[],uvs=[],sideSteps=6;
    for(let side=0;side<4;side++) {
      const start=positions.length/3;
      for(let row=0;row<profile.length;row++) {
        const [outset,rise]=profile[row];
        const a=width/2+outset,b=depth/2+outset;
        const corners=[[-a,-b],[a,-b],[a,b],[-a,b]];
        for(let k=0;k<=sideSteps;k++) {
          const t=k/sideSteps,first=corners[side],second=corners[(side+1)%4];
          let px=first[0]*(1-t)+second[0]*t,pz=first[1]*(1-t)+second[1]*t;
          const inset=Math.sin(t*Math.PI)*concavity;
          if(side===0)pz+=inset;if(side===1)px-=inset;if(side===2)pz-=inset;if(side===3)px+=inset;
          positions.push(px,rise,pz);uvs.push(t,row/(profile.length-1));
        }
      }
      for(let row=0;row<profile.length-1;row++)for(let k=0;k<sideSteps;k++) {
        const a=start+row*(sideSteps+1)+k,b=a+1,c=a+sideSteps+1,d=c+1;
        indices.push(a,c,b,b,c,d);
      }
    }
    append(parent,surface(positions,indices,uvs),material,x,y,z);
  }

  // The front face is genuinely fluted. Five concave channels terminate in
  // softly rounded heads and feet; their shadows do not depend on dark decals.
  function flutedPilaster(parent,z) {
    const bottom=11.94,height=31.82,front=-23.12,half=.66;
    block(parent,-23.68,bottom+height/2,z,.75,height,half*2);
    const samples=[-half,-.605];
    for(const center of [-.48,-.24,0,.24,.48]) {
      for(let j=0;j<=10;j++) samples.push(center-.095+j*.019);
    }
    samples.push(.605,half);samples.sort((a,b)=>a-b);
    const ys=[0,.08,.18,.32,.50,.74,1.03,1.4,height-1.4,height-1.03,height-.74,height-.5,height-.32,height-.18,height-.08,height];
    const positions=[],indices=[],uvs=[];
    for(let row=0;row<ys.length;row++) {
      const y=ys[row],v=Math.min(1,y/1.03,(height-y)/1.03),envelope=Math.sin(v*Math.PI/2);
      for(const s of samples) {
        let depth=0;
        for(const center of [-.48,-.24,0,.24,.48]) {
          const q=Math.abs(s-center)/.095;
          if(q<1)depth=Math.max(depth,.105*Math.sqrt(1-q*q)*envelope);
        }
        positions.push(front-depth,bottom+y,z+s);uvs.push((s+half)/(half*2),y/height);
      }
    }
    for(let row=0;row<ys.length-1;row++)for(let k=0;k<samples.length-1;k++) {
      const a=row*samples.length+k,b=a+1,c=a+samples.length,d=c+1;
      // East-facing facade, +X normal.
      indices.push(a,c,b,b,c,d);
    }
    append(parent,surface(positions,indices,uvs),mats.stoneLight);
    // Narrow return faces meet the rear shaft block with a dressed arris.
    block(parent,-23.20,bottom+height/2,z-half+.025,.18,height,.05);
    block(parent,-23.20,bottom+height/2,z+half-.025,.18,height,.05);
    const baseProfile=[[-.04,0],[.12,0],[.12,.12],[.08,.18],[.03,.22],[.00,.28],[-.02,.34],[.01,.40],[.08,.47],[.15,.53],[.18,.60],[.18,.69],[.13,.76],[.04,.83],[.00,.88],[.00,.96],[-.04,.96],[-.04,0]];
    rectangularProfile(parent,-23.64,10.98,z,.96,1.59,baseProfile);
    rectangularProfile(parent,-23.64,10.30,z,1.18,1.96,[[0,0],[0,.20],[-.04,.25],[-.1,.31],[-.1,.43],[-.07,.51],[.02,.58],[.04,.64],[-.07,.68],[-.1,.68],[-.1,0]]);
    rectangularProfile(parent,-23.64,43.70,z,.97,1.53,[[-.03,0],[.02,0],[.07,.04],[.10,.10],[.07,.16],[.02,.20],[.02,.27],[-.03,.27],[-.03,0]]);
  }

  // Smooth-leaf capital: a flared bell, two offset leaf ranks, cauliculi and
  // actual spiral scrolls. Leaves curve away from the bell and turn at the tip;
  // a raised central rib catches light across the carved blade.
  function capital(parent,z) {
    const cx=-23.69,base=43.95;
    const bell=[new T.Vector2(.76,0),new T.Vector2(.77,.10),new T.Vector2(.81,.34),new T.Vector2(.88,.73),new T.Vector2(1.0,1.15),new T.Vector2(1.12,1.54)];
    append(parent,new T.LatheGeometry(bell,28),mats.stoneLight,cx,base,z,null,[.58,1,.81]);
    function leaf(angle,leafBase,height,halfWidth,rank) {
      const positions=[],indices=[],uvs=[],rows=12,columns=8;
      for(let row=0;row<=rows;row++) {
        const t=row/rows;
        const width=halfWidth*(.12+.88*Math.pow(Math.sin(Math.PI*t),.72));
        const bend=Math.pow(Math.max(0,(t-.77)/.23),2);
        const y=leafBase+height*(t-.16*bend);
        const bellRadius=.77+.35*Math.min(1,(y-base)/1.54);
        for(let column=0;column<=columns;column++) {
          const u=column/columns*2-1,a=angle+u*width;
          const rib=.07*Math.pow(1-Math.abs(u),1.6)*Math.sin(Math.PI*t);
          const lobe=.018*Math.cos(u*Math.PI*3)*Math.sin(Math.PI*t);
          const projection=.028+.10*Math.sin(Math.PI*t)+.29*Math.pow(t,5)+rib+lobe;
          const r=bellRadius+projection;
          positions.push(cx+Math.cos(a)*r*.58,y,z+Math.sin(a)*r*.81);
          uvs.push((u+1)/2,t);
        }
      }
      for(let row=0;row<rows;row++)for(let column=0;column<columns;column++) {
        const a=row*(columns+1)+column,b=a+1,c=a+columns+1,d=c+1;
        indices.push(a,c,b,b,c,d);
      }
      append(parent,surface(positions,indices,uvs),mats.stoneLight);
    }
    for(const degrees of [-72,-36,0,36,72])leaf(degrees*Math.PI/180,base+.02,1.00,.29,0);
    for(const degrees of [-54,-18,18,54])leaf(degrees*Math.PI/180,base+.28,1.29,.32,1);
    // Spiral geometry in the facade plane, connected to rising leaf stems.
    for(const sign of [-1,1]) {
      const points=[new T.Vector3(-23.20,44.66,z+sign*.35),new T.Vector3(-23.01,44.94,z+sign*.66)];
      const cy=45.22,cz=z+sign*.94;
      for(let j=0;j<=26;j++) {
        const t=j/26,angle=-Math.PI/2+t*Math.PI*2.65,r=.31*(1-t)+.035*t;
        points.push(new T.Vector3(-22.96+.035*t,cy+Math.sin(angle)*r,cz+sign*Math.cos(angle)*r));
      }
      append(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points),34,.057,6,false),mats.stoneLight);
    }
    rectangularProfile(parent,-23.61,45.49,z,1.42,2.23,[[0,0],[.02,.04],[.07,.08],[.10,.14],[.10,.19],[.07,.24],[.03,.28],[.03,.34],[-.05,.34],[-.05,0]],.105);
    block(parent,-23.61,45.80,z,1.32,.06,2.13);
    reliefRosette(parent,-22.79,45.64,z,.20,.085,6,mats.stoneLight);
  }

  // A low-relief rosette is a carved field with continuous curved petals and
  // a small central boss. The perimeter returns to its recessed backing.
  function reliefRosette(parent,x,y,z,radius,depth,petals,material) {
    const positions=[],indices=[],uvs=[],rings=6,segments=petals*8;
    for(let ring=0;ring<=rings;ring++) {
      const r=ring/rings;
      for(let k=0;k<=segments;k++) {
        const angle=k/segments*Math.PI*2;
        const petal=.5+.5*Math.cos(angle*petals);
        const outer=radius*(.78+.22*petal);
        const wave=Math.pow(Math.max(0,Math.sin(Math.PI*r)),.8);
        const raised=depth*(.12+.88*petal)*wave+depth*.25*Math.exp(-r*r*35);
        positions.push(x+raised,y+Math.sin(angle)*outer*r,z+Math.cos(angle)*outer*r);
        uvs.push(.5+Math.cos(angle)*r/2,.5+Math.sin(angle)*r/2);
      }
    }
    for(let ring=0;ring<rings;ring++)for(let k=0;k<segments;k++) {
      const a=ring*(segments+1)+k,b=a+1,c=a+segments+1,d=c+1;
      indices.push(a,b,c,b,d,c);
    }
    append(parent,surface(positions,indices,uvs),material);
  }

  // A continuous frame in the YZ plane; its cross-section has a cavetto,
  // rounded bead and fillet, rather than a stack of square overlay boxes.
  function wallFrame(parent,x,y,z,width,height,profile,material) {
    const positions=[],indices=[],uvs=[];
    for(let side=0;side<4;side++) {
      const start=positions.length/3;
      for(const [outset,projection] of profile) {
        const a=width/2+outset,b=height/2+outset;
        const corners=[[-a,-b],[a,-b],[a,b],[-a,b]];
        for(const k of [side,(side+1)%4]) {
          positions.push(x+projection,y+corners[k][1],z+corners[k][0]);uvs.push(k===side?0:1,outset);
        }
      }
      for(let row=0;row<profile.length-1;row++) {
        const a=start+row*2,b=a+1,c=a+2,d=c+1;
        indices.push(a,b,c,b,d,c);
      }
    }
    append(parent,surface(positions,indices,uvs),material);
  }
  const panelProfile=[[-.08,0],[-.02,.025],[.025,.06],[.055,.105],[.05,.14],[.015,.165],[.015,.19],[.09,.19],[.14,.16],[.17,.11],[.19,.09],[.24,.09],[.24,.02],[-.08,0]];
  for(const sign of [-1,1]) {
    const parent=sign<0?north:sanctuary;
    for(const z of [sign*11.4,sign*17.4,sign*23.3]) {
      flutedPilaster(parent,z);capital(parent,z);
    }
    for(const z of [sign*14.4,sign*20.4]) {
      block(parent,-23.83,49.7,z,.13,4.43,4.13,mats.stoneDark);
      block(parent,-23.735,49.7,z,.08,4.12,3.82,mats.stoneLight);
      wallFrame(parent,-23.70,49.7,z,3.9,4.2,panelProfile,mats.stoneLight);
      reliefRosette(parent,-23.665,49.7,z,.83,.17,8,mats.stoneLight);
      // A small recessed roundel bead separates the central carving from
      // the panel field. Stone, rather than more gold, carries the relief.
      const ring=new T.TorusGeometry(1.06,.035,6,64);
      append(parent,ring,mats.stoneLight,-23.65,49.7,z,[0,Math.PI/2,0]);
    }
  }
  for(let z=-8.8;z<9;z+=1.6)reliefRosette(sanctuary,-23.10,41.5,z,.255,.085,6,mats.gold);

  // A fine continuous round bead on the existing outer gold portal reveal.
  // Keep its backing and all U-shaped nested frames from the earlier pass.
  for(const sign of [-1,1]) {
    const points=[new T.Vector3(-22.91,8.72,sign*9.91),new T.Vector3(-22.91,40.53,sign*9.91)];
    append(sign<0?north:sanctuary,new T.TubeGeometry(new T.LineCurve3(points[0],points[1]),1,.043,8,false),mats.gold);
  }
  append(sanctuary,new T.TubeGeometry(new T.LineCurve3(new T.Vector3(-22.91,40.53,-9.91),new T.Vector3(-22.91,40.53,9.91)),1,.043,8,false),mats.gold);

  let addedTriangles=0,addedDrawCalls=0;
  for(const [parent,byMaterial] of batches)for(const [material,data] of byMaterial) {
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(data.position,3));
    geometry.setAttribute('normal',new T.Float32BufferAttribute(data.normal,3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));
    geometry.computeBoundingSphere();geometry.computeBoundingBox();
    const mesh=new T.Mesh(geometry,material);
    mesh.name='Sanctuary v2 — carved capitals, flutes and architectural relief';
    mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
    addedTriangles+=data.position.length/9;addedDrawCalls++;
  }
  const stats={addedTriangles,removedTriangles,netTriangles:addedTriangles-removedTriangles,addedDrawCalls,dressedAshlarInstances,facadeFacingDepth:.012,capitals:6,flutesPerPilaster:5,reliefPanels:4,preservesHolyOfHolies:true,preservesCutaway:true};
  sanctuary.userData.architecturalDetailV2=stats;
  return stats;
}
