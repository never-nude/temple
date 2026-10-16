/*
 * Herodian sanctuary, rebuilt from a dimensional architectural schedule.
 * Coordinates: +X east, +Y up, +Z south; all distances are metres.
 * Adopted cubit: 0.5 m. This is an interpretive Middot / Patrich–Ritmeyer
 * reconstruction, not a surviving measured survey of the lost building.
 *
 * Sources: Mishnah Middot 3:6–8 and 4:1–7; Joseph Patrich, “Reconstructing
 * the Magnificent Temple Herod Built”, with Leen Ritmeyer's plan/section.
 * https://www.sefaria.org/Mishnah_Middot.3.6
 * https://www.sefaria.org/Mishnah_Middot.4.7
 * https://wisdomintorah.com/wp-content/uploads/2017/04/Reconstructing-the-Magnificent-Temple-Herod-Built.pdf
 *
 * E → W: 5 wall + 11 Ulam + 6 wall + 40 Holy Place + 1 veil passage +
 *        20 Holy of Holies + 6 wall + 6 cell + 5 wall = 100 cubits.
 * N → S: 5 wall + 3 mesibbah + 5 wall + 6 cell + 6 wall + 20 sanctuary +
 *        6 wall + 6 cell + 5 wall + 3 drainage + 5 wall = 70 cubits.
 * Vertical above court: 6 foundation + 40 hall + 5 ceiling + 40 upper
 *        chamber + 5 ceiling + 3 parapet + 1 spikes = 100 cubits.
 * Porch is 100 cubits wide; its open doorway is 20 × 40 cubits (Middot
 * 3:7). Josephus's 25 × 70 cubit opening is a different recorded scheme.
 * No exterior cell windows are invented. The four Corinthian columns and
 * exact carved ornament are interpretive details within the drawn Ulam.
 */
function buildSanctuary(THREE, ctx) {
  const T = THREE, { mats } = ctx, CU = .5;
  const fine = mats.stoneFine || mats.stoneLight;
  const columnStone = mats.column || fine;
  const gilding = mats.goldPlate || mats.gold;
  const court = 5.4, floor = court + 6 * CU;
  const hallTop = floor + 40 * CU, upperFloor = hallTop + 5 * CU;
  const upperTop = upperFloor + 40 * CU, roofTop = upperTop + 5 * CU;
  const parapetTop = roofTop + 3 * CU, spikeTop = parapetTop + CU;
  const X = { east: -24, porchFront: -26.5, porchBack: -32, hallEast: -35,
    hallWest: -55, holiesEast: -55.5, holiesWest: -65.5, westWall: -68.5,
    westCells: -71.5, west: -74 };
  const group = new T.Group(); group.name = 'The sanctuary';
  group.userData.landmark = 'sanctuary';
  group.userData.reconstruction = 'Middot / Patrich–Ritmeyer, 0.5 m cubit';
  const north = new T.Group(); north.name = 'North walls and chambers — removable for cutaway';
  const roofs = new T.Group(); roofs.name = 'Roof and upper chambers — removable for cutaway';
  const northCells = new T.Group(); northCells.name = 'Fifteen northern cells and ascending mesibbah';
  const southCells = new T.Group(); southCells.name = 'Fifteen southern cells and roof drainage';
  const westCells = new T.Group(); westCells.name = 'Eight western cells';
  group.add(north, roofs, northCells, southCells, westCells);
  const important = new Set();
  const collisionBoxes=[],floorBoxes=[];
  const worldParents=new Set([group,north,roofs,northCells,southCells,westCells]);
  const B = (p,x,y,z,w,h,d,m=fine,name) => {
    const o = ctx.box(p,x,y,z,w,h,d,m);
    if (name) o.name = name;
    if(worldParents.has(p)){
      if(h>=2&&w>=.35&&d>=.35)collisionBoxes.push({min:[x-w/2,y-h/2,z-d/2],max:[x+w/2,y+h/2,z+d/2]});
      if(h<=3&&w>=.25&&d>=.25)floorBoxes.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,y:y+h/2});
    }
    return o;
  };
  const M = (p,geometry,material,x=0,y=0,z=0,name) => {
    const o = new T.Mesh(geometry,material); o.position.set(x,y,z);
    o.castShadow = o.receiveShadow = true; if(name)o.name=name; p.add(o); return o;
  };
  const cylinder = (p,x,y,z,r,h,m,rt=r,sides=24) => M(p,new T.CylinderGeometry(rt,r,h,sides),m,x,y,z);
  const torus = (p,x,y,z,r,t,m,rotation) => {
    const o=M(p,new T.TorusGeometry(r,t,6,24),m,x,y,z); if(rotation)o.rotation.set(...rotation); return o;
  };
  const tube = (p,points,r,m,segments=20) => M(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),segments,r,8,false),m);
  const unit = new T.BoxGeometry(1,1,1);
  // Front-beveled unit panel: shallow folded edges, rather than a full costly
  // high-subdivision box for every sheet or cut stone.
  const ps=new T.Shape(); ps.moveTo(-.47,-.47);ps.lineTo(.47,-.47);ps.lineTo(.47,.47);ps.lineTo(-.47,.47);ps.closePath();
  const panelGeometry=new T.ExtrudeGeometry(ps,{depth:.94,steps:1,bevelEnabled:true,bevelSize:.03,bevelThickness:.03,bevelSegments:1,curveSegments:1});
  panelGeometry.translate(0,0,-.5);panelGeometry.clearGroups();
  function boxes(p,entries,m,name,geometry=unit,colored=false) {
    if(!entries.length)return;
    const inst=new T.InstancedMesh(geometry,m,entries.length),dummy=new T.Object3D(),c=new T.Color();
    entries.forEach((e,i)=>{
      dummy.position.set(e[0],e[1],e[2]);dummy.scale.set(e[3],e[4],e[5]);dummy.rotation.set(e[6]||0,e[7]||0,e[8]||0);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);
      if(colored){const shade=.965+.035*(.5+.5*Math.sin(i*2.39996));c.setRGB(shade,shade,shade);inst.setColorAt(i,c);}
    });
    inst.name=name;inst.castShadow=inst.receiveShadow=true;inst.instanceMatrix.needsUpdate=true;
    if(/porch steps|Mesibbah/.test(name))for(const e of entries)floorBoxes.push({x0:e[0]-e[3]/2,x1:e[0]+e[3]/2,z0:e[2]-e[5]/2,z1:e[2]+e[5]/2,y:e[1]+e[4]/2});
    if(inst.instanceColor)inst.instanceColor.needsUpdate=true;inst.computeBoundingSphere();p.add(inst);return inst;
  }
  function wallX(p,x0,x1,z,y0,y1,thickness,openings=[],material=fine) {
    const holes=openings.map(o=>({a:o[0]-o[1]/2,b:o[0]+o[1]/2,h:o[2],s:o[3]||y0})).sort((a,b)=>a.a-b.a);
    let cursor=x0;
    for(const h of holes){
      if(h.a>cursor)B(p,(cursor+h.a)/2,(y0+y1)/2,z,h.a-cursor,y1-y0,thickness,material);
      if(h.s>y0)B(p,(h.a+h.b)/2,(y0+h.s)/2,z,h.b-h.a,h.s-y0,thickness,material);
      if(h.s+h.h<y1)B(p,(h.a+h.b)/2,(h.s+h.h+y1)/2,z,h.b-h.a,y1-h.s-h.h,thickness,material);
      cursor=h.b;
    }
    if(cursor<x1)B(p,(cursor+x1)/2,(y0+y1)/2,z,x1-cursor,y1-y0,thickness,material);
  }
  function wallZ(p,z0,z1,x,y0,y1,thickness,openings=[],material=fine) {
    const holes=openings.map(o=>({a:o[0]-o[1]/2,b:o[0]+o[1]/2,h:o[2],s:o[3]||y0})).sort((a,b)=>a.a-b.a);
    let cursor=z0;
    for(const h of holes){
      if(h.a>cursor)B(p,x,(y0+y1)/2,(cursor+h.a)/2,thickness,y1-y0,h.a-cursor,material);
      if(h.s>y0)B(p,x,(y0+h.s)/2,(h.a+h.b)/2,thickness,h.s-y0,h.b-h.a,material);
      if(h.s+h.h<y1)B(p,x,(h.s+h.h+y1)/2,(h.a+h.b)/2,thickness,y1-h.s-h.h,h.b-h.a,material);
      cursor=h.b;
    }
    if(cursor<z1)B(p,x,(y0+y1)/2,(cursor+z1)/2,thickness,y1-y0,z1-cursor,material);
  }
  function floorWithHatch(p,x0,x1,z0,z1,y,h,hx,hz,material){
    const a=hx-.45,b=hx+.45,c=hz-.52,d=hz+.52;
    for(const r of[[x0,a,z0,z1],[b,x1,z0,z1],[a,b,z0,c],[a,b,d,z1]]){
      if(r[1]-r[0]>.01&&r[3]-r[2]>.01)B(p,(r[0]+r[1])/2,y,(r[2]+r[3])/2,r[1]-r[0],h,r[3]-r[2],material);
    }
  }
  // A continuous mitered profile gives cornices an actual undercut and drip.
  function molding(p,x,z,w,d,y,profile,m) {
    const pos=[],uv=[],indices=[];
    for(let side=0;side<4;side++){
      const start=pos.length/3;
      for(const [out,h]of profile){const corners=[[-w/2-out,-d/2-out],[w/2+out,-d/2-out],[w/2+out,d/2+out],[-w/2-out,d/2+out]];
        for(const k of[side,(side+1)%4]){pos.push(corners[k][0],h,corners[k][1]);uv.push(k===side?0:(side%2?d:w),h);}}
      for(let j=0;j<profile.length-1;j++){const a=start+j*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return M(p,g,m,x,y,z);
  }
  const corniceProfile=[[-.04,0],[.04,0],[.04,.10],[.11,.12],[.18,.17],[.22,.23],[.22,.30],[.16,.35],[.09,.37],[.09,.44],[.26,.44],[.26,.52],[.38,.57],[.48,.66],[.52,.78],[.52,.87],[.44,.91],[.44,.98],[.72,.98],[.72,1.15],[.64,1.19],[.58,1.26],[.59,1.34],[.66,1.43],[.77,1.49],[.77,1.58],[-.04,1.58],[-.04,0]];
  function cornice(p,x,z,w,d,y,scale=1,gold=false){
    molding(p,x,z,w,d,y,corniceProfile.map(a=>a.map(v=>v*scale)),fine);
    B(p,x,y+1.53*scale,z,w,.1*scale,d,fine);
    if(gold)molding(p,x,z,w,d,y,[[.27*scale,.51*scale],[.34*scale,.53*scale],[.38*scale,.57*scale],[.34*scale,.61*scale],[.27*scale,.62*scale]],gilding);
    const a=[];for(const s of[-1,1]){for(let u=-w/2+.7;u<w/2-.5;u+=.8*scale)a.push([x+u,y+.35*scale,z+s*(d/2+.05),.32*scale,.24*scale,.42*scale]);for(let v=-d/2+.7;v<d/2-.5;v+=.8*scale)a.push([x+s*(w/2+.05),y+.35*scale,z+v,.42*scale,.24*scale,.32*scale]);}
    boxes(p,a,fine,'Individually separated cornice dentils');
  }
  // Foundation and lower paved floor. The foundation is part of the stated
  // 100-cubit height, rather than an extra platform added underneath it.
  B(group,-53,court+1.47,0,42,2.94,35,fine,'Six-cubit sanctuary foundation including finish');
  B(group,-28,court+1.47,0,8,2.94,50,fine,'Porch foundation including finish');
  B(group,-50.25,floor-.03,0,30.5,.06,10,mats.pavement,'Sacred rooms floor');
  B(group,-29.25,floor-.03,0,5.5,.06,45,mats.pavement,'Ulam paved floor');
  B(group,-25.25,floor-.03,0,2.5,.06,10,mats.pavement,'Open porch threshold');
  B(group,-33.5,floor-.03,0,3,.06,5,mats.pavement,'Hekhal threshold');
  const holyFloor=B(group,-60.5,floor+.015,0,10,.03,10,fine,'Holy of Holies — an empty chamber');
  holyFloor.userData.landmark='holies';important.add(holyFloor);
  // Twelve risers of half a cubit; one-cubit treads (Middot 3:6).
  const steps=[];for(let i=0;i<12;i++){const h=3-i*.25;steps.push([X.east+.25+i*.5,court+h/2,0,.5,h,15]);}
  boxes(group,steps,fine,'Twelve half-cubit porch steps',panelGeometry,true);
  // Thin dressed foundation plinths step down into the priestly pavement.
  molding(group,-53,0,42,35,court,[[0,0],[.18,0],[.18,.20],[.08,.34],[.04,.46],[.04,.6]],fine);
  molding(group,-28,0,8,50,court,[[0,0],[.18,0],[.18,.20],[.08,.34],[.04,.46],[.04,.6]],fine);

  // Thirty-eight cells: five along each flank on all three levels; three,
  // three and two across the west. The sacred wall steps inward half a cubit
  // per tier, widening the cells from five to six to seven cubits.
  const cellA=-68.5,cellB=-35,cellPitch=(cellB-cellA)/5;
  for(let tier=0;tier<3;tier++){
    const y0=floor+tier*7,y1=y0+6,inner=8.5-tier*.5,cellWidth=11-inner;
    for(const s of[-1,1]){
      const p=s<0?northCells:southCells;
      // Continuous sacred walls, with a discreet first-cell access on the
      // northern lower tier as described by Middot 4:2 / the adopted plan.
      const openings=s<0&&tier===0?[[-37.4,1.15,2.2,y0]]:[];
      wallX(s<0?north:p,X.holiesWest,X.hallEast,s*(5+inner)/2,y0,y1,inner-5,openings,fine);
      if(tier<2)B(s<0?north:p,(X.holiesWest+X.hallEast)/2,y1+.5,s*(5+inner)/2,X.hallEast-X.holiesWest,1,inner-5,fine);
      if(tier===0)B(p,(cellA+cellB)/2,y0-.03,s*(inner+11)/2,cellB-cellA,.06,cellWidth,mats.pavement);
      else floorWithHatch(p,cellA,cellB,s<0?-11:inner,s<0?-inner:11,y0+.015,.03,-38,s*9.6,mats.pavement);
      if(tier<2)floorWithHatch(p,cellA,cellB,s<0?-11:inner,s<0?-inner:11,y1+.5,1,-38,s*9.6,fine);
      for(let k=0;k<=5;k++){
        const x=cellA+k*cellPitch;
        wallZ(p,s<0?-11:inner,s<0?-inner:11,x,y0,y1,.42,[[s*(inner+11)/2,1.25,2.25,y0]],fine);
      }
      wallX(s<0?north:p,cellA,cellB,s*12.25,y0,y1,2.5,tier===0&&s<0?[[-37.4,1.25,2.25,y0]]:[],fine);
      B(s<0?north:p,(cellA+cellB)/2,y1+.5,s*12.25,cellB-cellA,1,2.5,fine);
    }
    const rearFace=-69+tier*.5;
    const rearCellWidth=rearFace-X.westCells;
    B(westCells,(rearFace+X.holiesWest)/2,(y0+y1)/2,0,X.holiesWest-rearFace,6,10,fine);
    if(tier<2)B(westCells,(rearFace+X.holiesWest)/2,y1+.5,0,X.holiesWest-rearFace,1,10,fine);
    B(westCells,(rearFace+X.westCells)/2,y0+(tier?.015:-.03),0,rearCellWidth,tier?.03:.06,22,mats.pavement);
    const count=tier===2?2:3;
    for(let k=0;k<=count;k++){
      const z=-11+k*22/count;
      wallX(westCells,X.westCells,rearFace,z,y0,y1,.42,k===0||k===count?[]:[[(X.westCells+rearFace)/2,1.25,2.25,y0]],fine);
    }
    if(tier<2)B(westCells,(rearFace+X.westCells)/2,y1+.5,0,rearCellWidth,1,22,fine);
  }
  // The outer wrappers are unbroken dressed masonry, not rows of invented
  // windows. Northern wrapper belongs to the removable cutaway side.
  B(north,-53.5,floor+10,-16.25,37,20,2.5,fine);
  B(southCells,-53.5,floor+10,16.25,37,20,2.5,fine);
  B(westCells,-72.75,floor+10,0,2.5,20,35,fine);
  // Small doorways in the two back corners connect the western cells to
  // the flank sequence. Their opening continues through the corner return.

  // North ascending mesibbah: three flights with level landings, climbing
  // 22.5 m over the 33 m northern run. This is the adopted reconstruction
  // of the ancient text's winding route, not a recovered staircase.
  const passageZ=-14.25, stairEntries=[];
  let at=-35.4,level=floor;
  const flights=[{landing:3.5,run:7,rise:7},{landing:3.5,run:7,rise:7},{landing:3.5,run:8.5,rise:8.5}];
  for(const f of flights){
    B(northCells,at-f.landing/2,level-.12,passageZ,f.landing,.24,1.5,mats.pavement);at-=f.landing;
    const n=Math.round(f.rise/.25),run=f.run/n;
    for(let i=0;i<n;i++){const h=(i+1)*f.rise/n;stairEntries.push([at-(i+.5)*run,level+h/2,passageZ,run,h,1.5]);}
    at-=f.run;level+=f.rise;
  }
  boxes(northCells,stairEntries,fine,'Mesibbah — three rising flights and landings');
  // At roof level the route turns around the western cells, follows the
  // southern roof, and arrives at the southern upper-chamber doorway.
  B(roofs,-70,upperFloor+.015,0,3,.03,29,mats.pavement);
  B(roofs,-52.75,upperFloor+.015,14.25,34.5,.03,1.5,mats.pavement);
  // The southern passage is a narrow roof-water channel, with a lower
  // stone bed and dressed gutters instead of a second conjectural stair.
  B(southCells,-53.5,floor-.02,14.25,37,.16,1.5,mats.stoneDark);
  B(southCells,-53.5,floor+.15,13.62,37,.35,.16,fine);
  B(southCells,-53.5,floor+.15,14.88,37,.35,.16,fine);
  // Ladders are functional connections between the cells' three tiers.
  for(const s of[-1,1])for(let tier=0;tier<2;tier++){
    const p=s<0?northCells:southCells,z=s*9.6,y=floor+tier*7;
    for(const dx of[-.32,.32])B(p,-38+dx,y+3.5,z,.09,7,.09,mats.wood);
    for(let k=1;k<18;k++)B(p,-38,y+k*.38,z,.72,.055,.08,mats.wood);
  }

  // Three-metre-deep eastern sacred wall, with the smaller Hekhal doorway
  // and paired low wickets to the flanking cells. These are real openings.
  wallZ(group,-17.5,17.5,-33.5,floor,hallTop,3,[[0,5,10,floor],[-9.75,1.4,2.4,floor],[9.75,1.4,2.4,floor]],fine);
  // Broad Ulam: the two wings and returns enclose a genuinely walkable
  // 5.5 m deep vestibule. Its central 10 m opening has no outer curtain.
  wallZ(north,-25,-5,-25.25,floor,roofTop,2.5,[],fine);
  wallZ(group,5,25,-25.25,floor,roofTop,2.5,[],fine);
  B(roofs,-25.25,(hallTop+roofTop)/2,0,2.5,roofTop-hallTop,10,fine);
  for(const s of[-1,1]){
    const p=s<0?north:group;
    B(p,-29.25,(floor+roofTop)/2,s*23.75,5.5,roofTop-floor,2.5,fine);
    B(p,-33.5,(floor+roofTop)/2,s*21.25,3,roofTop-floor,7.5,fine);
    // Stone benches in the projecting knife-storage wings are illustrative.
    B(p,-30.95,floor+.5,s*20.25,.55,1,3.4,fine);
    B(p,-29.25,floor+.08,s*20.5,5.5,.16,4,mats.pavement);
  }
  // Five visible carved timber lintels, progressively 22–30 cubits long.
  // Stone courses separate them; cedar ties behind the facade span the Ulam.
  for(let i=0;i<5;i++){
    const w=(22+i*2)*CU,y=hallTop+.24+i*.56;
    B(roofs,-24.0,y,0,.48,.34,w,mats.wood,'Carved timber porch lintel '+(i+1));
    B(roofs,-24.05,y+.27,0,.42,.20,w+.12,fine);
    const carving=[];
    for(let z=-w/2+.26;z<w/2-.18;z+=.38)carving.push([-23.74,y,z,.035,.19,.12]);
    boxes(roofs,carving,mats.wood,'Rhythmic carved lintel recesses');
  }
  const ties=[];for(const z of[-19,-10,0,10,19])ties.push([-29.25,35.2,z,5.7,.38,.38],[-29.25,44.3,z,5.7,.38,.38]);
  boxes(roofs,ties,mats.wood,'Cedar ties across the Ulam');

  // Upper chamber and both five-cubit roof/ceiling assemblies. The entire
  // upper house lifts with the cutaway, exposing the actual sacred volume.
  B(roofs,-50.25,(upperFloor+upperTop)/2,-6.5,30.5,20,3,fine);
  wallX(roofs,X.holiesWest,X.hallEast,6.5,upperFloor,upperTop,3,[[-39,1.2,2.3,upperFloor]],fine);
  B(roofs,-67,(upperFloor+upperTop)/2,0,3,20,16,fine);
  B(roofs,-33.5,(hallTop+upperTop)/2,0,3,upperTop-hallTop,35,fine);
  // Cell roofs stop at the high central house; no roof slab fills the
  // stair passage or silently bridges the cutaway interior.
  B(roofs,-53.5,hallTop+1.25,-12.75,37,2.5,9.5,fine);
  B(roofs,-53.5,hallTop+1.25,12.75,37,2.5,9.5,fine);
  B(roofs,-71.25,hallTop+1.25,0,5.5,2.5,16,fine);
  B(roofs,-50.25,upperTop+1.25,0,36.5,2.5,16,fine);
  B(roofs,-29.25,upperTop+1.25,0,10.5,2.5,50,fine);
  // Lower coffered ceiling is assembled from beams and recessed fields.
  B(roofs,-50.25,hallTop+1.55,0,30.5,1.9,10,fine);
  const ceilingBeams=[],coffers=[];
  for(let x=-65;x<-35.4;x+=2.0)ceilingBeams.push([x,hallTop+.25,0,.22,.5,10]);
  for(const z of[-4.85,-2.5,0,2.5,4.85])ceilingBeams.push([-50.25,hallTop+.25,z,30.5,.5,.18]);
  for(let x=-64.0;x<-35.7;x+=2)for(const z of[-3.65,-1.2,1.2,3.65])coffers.push([x,hallTop+.56,z,1.72,.18,2.12]);
  boxes(roofs,ceilingBeams,gilding,'Gilded structural ceiling beams');boxes(roofs,coffers,gilding,'Recessed gilded coffers');
  // Trapdoors above the Holy of Holies are closed; the sacred room remains
  // empty. Cedar ladders lead from the upper chamber to the roof access.
  for(const x of[-63.7,-57.5])B(roofs,x,upperFloor+.03,-3.6,1.4,.06,1.25,mats.wood,'Closed maintenance trapdoor');
  for(const z of[-1,1]){
    B(roofs,-34.3,upperFloor+10,z*.6,.16,20,.16,mats.wood);
    for(let k=0;k<40;k++)B(roofs,-34.3,upperFloor+.2+k*.49,0,.12,.09,1.3,mats.wood);
  }
  // The quiet exterior is finely dressed stone. Real but very shallow
  // stone joints supply believable courses without a cartoon brick grid.
  function ashlar(p,axis,fixed,a0,a1,y0,y1,direction=1,exclude) {
    const entries=[],course=1.25,length=3.6;
    for(let row=0,y=y0;y<y1-.01;y+=course,row++)for(let a=a0-(row%2)*length/2;a<a1;a+=length){
      const lo=Math.max(a,a0),hi=Math.min(a+length,a1),h=Math.min(course,y1-y);
      if(hi-lo<.12)continue; const c=(lo+hi)/2,cy=y+h/2;
      if(exclude&&exclude(c,cy))continue;
      entries.push(axis==='x'?[fixed+direction*.018,cy,c,.036,h-.018,hi-lo-.018]:[c,cy,fixed+direction*.018,hi-lo-.018,h-.018,.036]);
    }
    const o=boxes(p,entries,fine,'Individually bedded fine limestone ashlar',panelGeometry,true);if(o)o.castShadow=false;
  }
  ashlar(north,'x',-24,-25,-5,floor,roofTop,1);
  ashlar(group,'x',-24,5,25,floor,roofTop,1);
  ashlar(roofs,'x',-24,-5,5,hallTop+3,roofTop,1);
  ashlar(north,'z',-17.5,-72,-35,floor,hallTop,-1);
  ashlar(southCells,'z',17.5,-72,-35,floor,hallTop,1);
  ashlar(westCells,'x',-74,-17.5,17.5,floor,hallTop,-1);
  ashlar(roofs,'z',-8,-68.5,-32,upperFloor,upperTop,-1);
  ashlar(roofs,'z',8,-68.5,-32,upperFloor,upperTop,1,(x,y)=>x>-39.7&&x<-38.3&&y<upperFloor+2.4);
  // Restrained carved exterior cornices, flat roofs, parapets and the
  // attested crow-deterring spikes, all below the stated 100-cubit summit.
  cornice(roofs,-29.25,0,10.5,50,roofTop-1.58,1,true);
  cornice(roofs,-50.25,0,36.5,16,roofTop-1.58,.8,true);
  cornice(roofs,-53.5,0,37,35,upperFloor-1.1,.65,false);
  for(const s of[-1,1]){
    B(roofs,-50.25,(roofTop+parapetTop)/2,s*7.72,36.5,1.5,.56,fine);
    B(roofs,-29.25,(roofTop+parapetTop)/2,s*24.72,10.5,1.5,.56,fine);
  }
  B(roofs,-68.22,(roofTop+parapetTop)/2,0,.56,1.5,16,fine);
  B(roofs,-24.28,(roofTop+parapetTop)/2,0,.56,1.5,50,fine);
  const spikePoints=[];
  for(let x=-67.9;x<=-32.6;x+=1.15)for(const s of[-1,1])spikePoints.push([x,parapetTop+.25,s*7.72,1,1,1]);
  for(let z=-24.3;z<=24.3;z+=1.15)spikePoints.push([-24.28,parapetTop+.25,z,1,1,1]);
  boxes(roofs,spikePoints,gilding,'Half-cubit golden roof spikes',new T.ConeGeometry(.075,.5,6));

  // Architectural order INSIDE the Ulam: four substantial engaged columns
  // flank the smaller sacred doorway, with actual curved bases/capitals.
  function lathe(p,x,y,z,profile,m,segments=32){return M(p,new T.LatheGeometry(profile.map(v=>new T.Vector2(v[0],v[1])),segments),m,x,y,z);}
  function corinthianColumn(p,x,z){
    const base=floor,h=13.6,r=.46;
    B(p,x,base+.19,z,1.55,.38,1.55,columnStone);
    lathe(p,x,base+.38,z,[[.68,0],[.68,.09],[.60,.13],[.54,.20],[.58,.29],[.63,.34],[.63,.42],[.53,.48],[.49,.56]],columnStone);
    const shaftProfile=[[r,0],[r*.99,.9],[r*1.025,3.1],[r*1.018,5.2],[r*.97,8],[r*.87,10.85],[r*.86,11.1]];
    const shaft=lathe(p,x,base+.94,z,shaftProfile,columnStone,80);
    collisionBoxes.push({min:[x-.62,base,z-.62],max:[x+.62,base+h,z+.62]});
    // Twenty shallow concave flutes in the shaft surface. Their scale stays
    // subordinate to the real radius instead of turning it into a wire rod.
    const attr=shaft.geometry.attributes.position;
    for(let i=0;i<attr.count;i++){const px=attr.getX(i),pz=attr.getZ(i),a=Math.atan2(pz,px),rad=Math.hypot(px,pz),flute=.018*(.5+.5*Math.cos(a*20));if(rad>.1){attr.setX(i,px*(rad-flute)/rad);attr.setZ(i,pz*(rad-flute)/rad);}}
    shaft.geometry.computeVertexNormals();
    lathe(p,x,base+12.02,z,[[.40,0],[.48,.08],[.54,.28],[.59,.62],[.68,.97],[.71,1.15]],columnStone);
    B(p,x,base+13.35,z,1.55,.32,1.55,columnStone);
    // Two staggered acanthus rows: double-curved leaves, each with central
    // ridge and tapered scalloped tip. Capitals are carved volumes.
    for(let row=0;row<2;row++)for(let k=0;k<8;k++){
      const angle=(k+(row?.5:0))*Math.PI/4,pos=[],indices=[];
      for(let j=0;j<=7;j++){
        const t=j/7,height=.22+t*(row?.72:.62),rr=.48+Math.sin(t*Math.PI*.7)*.17+t*t*.10;
        const width=.18*Math.sin(Math.PI*(.12+.88*t))+.025;
        for(const side of[-1,0,1]){const bend=side===0?.035:0,aa=angle+side*width/rr;pos.push(Math.cos(aa)*(rr+bend),height,Math.sin(aa)*(rr+bend));}
      }
      for(let j=0;j<7;j++)for(let k2=0;k2<2;k2++){const q=j*3+k2;indices.push(q,q+3,q+1,q+1,q+3,q+4);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(indices);g.computeVertexNormals();const leaf=M(p,g,columnStone,x,base+12.08+row*.35,z);leaf.material.side=T.DoubleSide;
    }
    for(const a of[0,Math.PI/2,Math.PI,3*Math.PI/2]){
      const v=torus(p,x+Math.cos(a)*.55,base+13.0,z+Math.sin(a)*.55,.20,.065,columnStone);
      v.rotation.y=-a;
    }
  }
  for(const z of[-6.5,-3.6,3.6,6.5])corinthianColumn(group,-31.25,z);
  B(group,-31.25,floor+13.65,0,1.55,.55,15.5,fine,'Inner-entry column entablature');
  cornice(group,-31.25,0,1.55,15.5,floor+13.92,.4,true);
  // Deep Hekhal reveal: two pairs of gold-covered folding leaves sit on
  // the outer and inner wall faces, opening clear of the five-metre passage.
  for(const s of[-1,1]){
    B(group,-31.82,floor+5,s*2.71,.44,10.3,.42,gilding);
    B(group,-35.14,floor+5,s*2.71,.32,10.3,.42,gilding);
  }
  B(group,-31.82,floor+10.15,0,.44,.36,5.8,gilding);
  B(group,-35.14,floor+10.15,0,.32,.36,5.8,gilding);
  for(const s of[-1,1])for(const face of[0,1]){
    const leaf=new T.Group();leaf.name=(s<0?'North':'South')+(face?' inner':' outer')+' gilded door leaf';
    leaf.position.set(face?-35.18:-31.92,floor,s*2.5);leaf.rotation.y=s*(face?1.45:-1.45);group.add(leaf);
    B(leaf,0,5,-s*1.21,.20,10,2.42,mats.wood);
    B(leaf,.115,5,-s*1.21,.05,9.96,2.38,gilding);
    const panels=[];for(let row=0;row<4;row++)panels.push([.16,1.26+row*2.48,-s*1.21,.06,2.12,2.05]);
    boxes(leaf,panels,gilding,'Raised gilded door panels',panelGeometry,true);
    for(let row=0;row<=4;row++)B(leaf,.21,.13+row*2.43,-s*1.21,.10,.12,2.34,gilding);
    const handle=torus(leaf,.24,4.7,-s*1.95,.15,.036,gilding);handle.rotation.y=Math.PI/2;
  }
  // Interior gold is assembled in shallow sheets with fine seams and frame
  // moldings. The walls remain actual three-metre structural stone behind it.
  for(const s of[-1,1]){
    const goldPanels=[];
    for(let x=-65.48;x<-35.01;x+=1.5)for(let y=floor+.1;y<hallTop-.1;y+=2){const w=Math.min(1.5,-35-x),h=Math.min(2,hallTop-.1-y);if(w>.1)goldPanels.push([x+w/2,y+h/2,s*4.98,w-.018,h-.018,.035]);}
    boxes(s<0?north:group,goldPanels,gilding,'Fine-seamed gold sheets lining the sacred rooms',panelGeometry,true);
  }
  const goldWest=[];for(let z=-4.98;z<4.99;z+=1.25)for(let y=floor+.1;y<hallTop-.1;y+=2)goldWest.push([-65.47,y+Math.min(2,hallTop-.1-y)/2,z+.615,.035,Math.min(2,hallTop-.1-y)-.018,1.215]);
  boxes(group,goldWest,gilding,'Gold-covered western sacred wall',panelGeometry,true);
  for(const s of[-1,1]){
    const interiorRibs=[];
    interiorRibs.push([-50.25,floor+.21,s*4.91,30.5,.38,.13],[-50.25,hallTop-.25,s*4.91,30.5,.36,.13]);
    for(let x=-64.9;x<-35.1;x+=3)interiorRibs.push([x,floor+10,s*4.91,.075,19.1,.1]);
    boxes(s<0?north:group,interiorRibs,gilding,'Gilded interior baseboards and panel frames');
  }

  // Double woven partition, its openings at opposite ends of the half-metre
  // passage. Pleats have three-dimensional thickness and a hemmed edge.
  const veils=new T.Group();veils.name='Purple and scarlet sanctuary curtain';veils.userData.landmark='veil';group.add(veils);
  function curtain(x,openSouth,name){
    const z0=openSouth?-5:-4.25,z1=openSouth?4.25:5,w=z1-z0;
    const g=new T.PlaneGeometry(w,20,180,20),a=g.attributes.position;
    for(let i=0;i<a.count;i++){
      const z=a.getX(i)+w/2+z0,y=a.getY(i)+10,fold=.045*Math.sin((z-z0)*Math.PI*7)+.014*Math.sin((z-z0)*Math.PI*14);
      a.setXYZ(i,x+fold,floor+y,z);
    }
    g.computeVertexNormals();M(veils,g,mats.veil,0,0,0,name);
    B(veils,x,floor+.10,(z0+z1)/2,.07,.20,w,gilding);
    B(veils,x,hallTop-.12,(z0+z1)/2,.07,.20,w,gilding);
    const rod=cylinder(veils,x,hallTop-.03,0,.065,10.3,gilding,.065,16);rod.rotation.x=Math.PI/2;
  }
  curtain(-55.06,true,'Eastern curtain — opening at the south');
  curtain(-55.44,false,'Western curtain — opening at the north');

  // The golden vine hangs on posts OVER THE INNER ENTRY, as Middot 3:8 and
  // Ritmeyer's drawn reconstruction show, rather than on the outer facade.
  const vine=new T.Group();vine.name='Golden grapevine above the sanctuary entrance';vine.userData.landmark='vine';group.add(vine);
  tube(vine,[[-31.55,20,-5],[-31.45,20.7,-3],[-31.40,20.3,0],[-31.45,20.7,3],[-31.55,20,5]],.075,gilding,40);
  const grapes=[];for(let k=0;k<11;k++){
    const z=-4.5+k*.9; tube(vine,[[-31.43,20.5,z],[-31.38,20,z+.08],[-31.32,19.5,z+.06]],.025,gilding,8);
    for(let row=0;row<5;row++)for(let j=0;j<Math.max(1,4-row);j++)grapes.push([-31.26,19.8-row*.16,z+(j-(3-row)/2)*.16,1,1,1]);
    const shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(-.16,.13);shape.lineTo(-.09,.25);shape.lineTo(-.20,.34);shape.lineTo(0,.52);shape.lineTo(.20,.34);shape.lineTo(.09,.25);shape.lineTo(.16,.13);shape.closePath();
    const leaf=M(vine,new T.ShapeGeometry(shape),gilding,-31.18,20.35,z);leaf.rotation.y=Math.PI/2;
  }
  boxes(vine,grapes,gilding,'Golden grape clusters',new T.SphereGeometry(.085,8,6));
  for(const z of[-7.5,7.5])tube(group,[[-30.2,roofTop-.4,z],[-30.5,35,z],[-30.2,24.3,z]],.026,gilding,24);

  // Furnishings use the project's existing detailed interpretation, reduced
  // to their traditional stated scale. They stand on the new canonical floor.
  const menorah=new T.Group();menorah.name='Seven-branched golden menorah';menorah.userData.landmark='menorah';menorah.position.set(-44.6,floor+.03,2.7);group.add(menorah);
  cylinder(menorah,0,.12,0,.65,.24,gilding,.59,8);cylinder(menorah,0,.31,0,.46,.18,gilding,.36,8);cylinder(menorah,0,1.6,0,.085,2.45,gilding);
  for(let j=1;j<=3;j++)for(const s of[-1,1]){
    const reach=j*.62;tube(menorah,[[0,.5+(3-j)*.25,0],[s*reach*.55,.8+(3-j)*.28,0],[s*reach,1.8,0],[s*reach,2.74,0]],.075,gilding);
    cylinder(menorah,s*reach,2.75,0,.105,.25,gilding,.17);torus(menorah,s*reach,2.9,0,.155,.035,gilding,[Math.PI/2,0,0]);cylinder(menorah,s*reach,2.94,0,.125,.06,mats.dark);
  }
  cylinder(menorah,0,2.75,0,.105,.25,gilding,.17);torus(menorah,0,2.9,0,.155,.035,gilding,[Math.PI/2,0,0]);cylinder(menorah,0,2.94,0,.125,.06,mats.dark);
  for(let y=.6;y<2.6;y+=.4){const o=M(menorah,new T.SphereGeometry(.14,12,8),gilding,0,y,0);o.scale.y=.8;}
  menorah.scale.setScalar(1.5/2.97);
  const table=new T.Group();table.name='Table of the twelve showbreads';table.userData.landmark='bread';table.position.set(-44.6,floor+.03,-2.7);group.add(table);
  B(table,0,.69,0,1,.12,.5,gilding);B(table,0,.77,0,1.06,.04,.54,gilding);
  for(const x of[-.4,.4])for(const z of[-.18,.18]){B(table,x,.34,z,.055,.68,.055,gilding);cylinder(table,x,.05,z,.055,.10,gilding,.045,12);}
  for(const z of[-.23,.23])B(table,0,.56,z,.94,.045,.035,gilding);
  const loafGeo=new T.SphereGeometry(1,16,10);for(const x of[-.25,.25])for(let n=0;n<6;n++){const loaf=M(table,loafGeo,mats.wood,x,.82+n*.045,0);loaf.scale.set(.16,.027,.17);}
  const incense=new T.Group();incense.name='Golden altar of incense';incense.userData.landmark='incense';incense.position.set(-52.3,floor+.03,0);group.add(incense);
  B(incense,0,.06,0,.5,.12,.5,gilding);B(incense,0,.47,0,.42,.76,.42,gilding);B(incense,0,.89,0,.5,.08,.5,gilding);B(incense,0,.94,0,.36,.025,.36,mats.dark);
  for(const x of[-.21,.21])for(const z of[-.21,.21])cylinder(incense,x,.965,z,.035,.07,gilding,.02,12);
  // Several human-sized priests at the approach communicate the building's
  // scale; these restrained figures are illustrative, not historical portraits.
  const skin=mats.skin||new T.MeshStandardMaterial({color:0x987252,roughness:.86});
  const linen=mats.linen||new T.MeshStandardMaterial({color:0xded5c1,roughness:.94});
  for(const[x,z,a]of[[-17.2,5.8,.7],[-19.8,-5.6,-.5],[-29.4,12.8,.2]]){
    const person=new T.Group();person.name='Human figure for scale — 1.7 m';person.position.set(x,x>X.east?court:floor,z);person.rotation.y=a;group.add(person);
    M(person,new T.CylinderGeometry(.16,.25,1.22,10),linen,0,.73,0);M(person,new T.SphereGeometry(.12,12,8),skin,0,1.57,0);cylinder(person,0,1.46,0,.065,.1,skin);
    for(const s of[-1,1]){const arm=cylinder(person,s*.23,1.06,0,.065,.57,linen,.07,10);arm.rotation.z=s*.17;cylinder(person,s*.08,.095,.02,.07,.19,skin,.07,10);}
  }

  // Merge ordinary static detail within each semantic/cutaway parent. All
  // InstancedMeshes, furnishing groups and named room selections survive.
  function bake(p){
    for(const child of[...p.children])if(child.isGroup)bake(child);
    const batches=new Map();
    for(const child of[...p.children]){
      if(!child.isMesh||child.isInstancedMesh||important.has(child)||child.userData.landmark)continue;
      let a=batches.get(child.material);if(!a){a={position:[],normal:[],uv:[],children:[]};batches.set(child.material,a);}
      child.updateMatrix();const geo=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geo.applyMatrix4(child.matrix);if(!geo.attributes.normal)geo.computeVertexNormals();
      const pos=geo.attributes.position,norm=geo.attributes.normal,uv=geo.attributes.uv;
      for(let i=0;i<pos.count;i++){a.position.push(pos.getX(i),pos.getY(i),pos.getZ(i));a.normal.push(norm.getX(i),norm.getY(i),norm.getZ(i));a.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0);}
      a.children.push(child);geo.dispose();
    }
    for(const[m,a]of batches){
      const geometry=new T.BufferGeometry();for(const key of['position','normal','uv'])geometry.setAttribute(key,new T.Float32BufferAttribute(a[key],key==='uv'?2:3));geometry.computeBoundingSphere();const o=M(p,geometry,m);o.name='Baked architectural assembly';
      for(const child of a.children)p.remove(child);
    }
  }
  bake(group);
  const anchors={sanctuary:[-29,55.4,0],holies:[-60.5,12,0],menorah:[-44.6,floor+1.1,2.7],bread:[-44.6,floor+.8,-2.7],incense:[-52.3,floor+.6,0],veil:[-55.25,18.4,0],vine:[-31.3,20.2,0],ulam:[-29.25,12,0],cells:[-52,19,-10],mesibbah:[-52,20,-14.25],upper:[-50,40,0]};
  const views={
    sanctuary:{eye:[35,27,62],target:[-43,26,0]},
    approach:{eye:[-6,7.1,0],target:[-25,22,0]},
    ulam:{eye:[-27.3,10.1,1.5],target:[-33.5,15,0]},
    holy:{eye:[-38.0,10.05,0],target:[-55.2,15,0]},
    cell:{eye:[-37.4,10.05,-9.75],target:[-44,10.05,-9.75]},
    upper:{eye:[-38,32.55,0],target:[-61,35,0]},
    interior:{eye:[-41,31,-32],target:[-49,16,0]},
    menorah:{eye:[-42.5,10.4,.4],target:[-44.6,9.2,2.7]},
    bread:{eye:[-42.7,10.2,-4.8],target:[-44.6,9.2,-2.7]},
    incense:{eye:[-49.8,10.4,-2],target:[-52.3,9.1,0]},
    veil:{eye:[-49.5,16,-13],target:[-55.25,17,0]},
    vine:{eye:[-28.5,18.5,-3.0],target:[-31.3,20.2,0]},
    plan:{eye:[-49,112,.001],target:[-49,8.4,0]},
    section:{eye:[-48,24,-90],target:[-48,24,0]}
  };
  const dimensions={cubit:CU,length:50,porchWidth:50,bodyWidth:35,height:50,foundation:3,hallHeight:20,upperHeight:20,porchDepth:5.5,porchOpening:[10,20],hekhalOpening:[5,10],holyPlace:[20,10],holyOfHolies:[10,10],cellCount:38,cellTiers:[13,13,12],floor,court,roofTop,spikeTop};
  const plan={bounds:[-74,-24,-25,25],axis:'east +X, south +Z',eastWest:[['Porch wall',2.5],['Ulam',5.5],['Hekhal wall',3],['Holy Place',20],['Double veil',.5],['Holy of Holies',10],['West wall',3],['Western cells',3],['Outer wall',2.5]],spaces:[{id:'ulam',label:'Ulam · portico',x0:-32,x1:-26.5,z0:-22.5,z1:22.5},{id:'holy',label:'Holy Place',x0:-55,x1:-35,z0:-5,z1:5},{id:'holies',label:'Holy of Holies',x0:-65.5,x1:-55.5,z0:-5,z1:5},{id:'north-cells',label:'Northern cells',x0:-68.5,x1:-35,z0:-11,z1:-8},{id:'south-cells',label:'Southern cells',x0:-68.5,x1:-35,z0:8,z1:11},{id:'west-cells',label:'Western cells',x0:-71.5,x1:-68.5,z0:-11,z1:11},{id:'mesibbah',label:'Ascending passage',x0:-68.5,x1:-35,z0:-15,z1:-13.5},{id:'drain',label:'Water channel',x0:-68.5,x1:-35,z0:13.5,z1:15}],section:[['Foundation',court,floor],['Sacred rooms',floor,hallTop],['Lower ceiling',hallTop,upperFloor],['Upper chamber',upperFloor,upperTop],['Upper ceiling',upperTop,roofTop],['Parapet',roofTop,parapetTop],['Spikes',parapetTop,spikeTop]]};
  let triangles=0,drawCalls=0;group.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);drawCalls++;}});
  group.userData.architectureStats={triangles,drawCalls,cellCount:38};
  return {group,cutawayParts:[north,roofs],anchors,views,dimensions,plan,collisionBoxes,floorBoxes};
}
