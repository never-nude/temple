/* Southern approaches: broad stepped flights, a landing at the entrance floor,
   and genuine vaulted openings through the retaining mass. Positions and exact
   profiles remain interpretive; the Double/Triple Gate and passage arrangement
   follows the excavated southern approaches rather than later facade carving. */
function rebuildSouthernApproaches(T, ctx) {
  const {world,mats,masonry,box,cutawayParts,instance}=ctx;
  const south=world.children.find(g=>g.userData.landmark==='south');
  const mount=world.children.find(g=>g.userData.landmark==='mount');
  if(!south||!mount)return;
  south.clear();
  const B=(p,x,y,z,w,h,d,m=mats.stone)=>box(p,x,y,z,w,h,d,m);
  const add=(p,geo,mat,x=0,y=0,z=0)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;p.add(m);return m;};
  // Remove the oversized display-plinth tiers. A footing at the retaining
  // footprint now reaches the surrounding ground instead of hovering above it.
  for(const o of [...mount.children]){
    const d=o.geometry?.parameters;
    if(!d)continue;
    if((d.width===330&&d.height===8&&d.depth===500)||(d.width===316&&d.height===4&&d.depth===486)||(d.width===300&&d.height===16&&d.depth===470))mount.remove(o);
  }
  B(mount,0,-21,0,300,8,470,masonry);
  B(mount,0,-9,-22.5,300,16,425,masonry);
  const vestibule=new T.Group();vestibule.name='Double and Triple southern entrance passages';south.add(vestibule);
  const centers=[-16,-8,39,47,55],floor=-14.5,back=190,front=235,depth=front-back,r=3.5,spring=7.5;
  const solidIntervals=[[-150,-20],[-4,35],[59,150]];
  for(const [a,b]of solidIntervals)B(mount,(a+b)/2,-9,212.5,b-a,16,45,masonry);
  B(mount,0,-15.75,212.5,300,2.5,45,masonry);
  // Spandrels include the curved soffit, not a dark picture of an arch.
  function spandrel(){
    const s=new T.Shape();s.moveTo(-4,0);s.lineTo(-4,13.5);s.lineTo(4,13.5);s.lineTo(4,0);s.lineTo(r,0);s.lineTo(r,spring);s.absarc(0,spring,r,0,Math.PI,false);s.lineTo(-r,0);s.lineTo(-4,0);s.closePath();
    return new T.ExtrudeGeometry(s,{depth,steps:1,curveSegments:32,bevelEnabled:false});
  }
  const vaultGeo=spandrel();
  function annular(inner,outer,a,b,d){
    const s=new T.Shape();s.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);s.absarc(0,0,inner,a,b,false);s.lineTo(Math.cos(b)*outer,Math.sin(b)*outer);s.absarc(0,0,outer,b,a,true);s.closePath();
    return new T.ExtrudeGeometry(s,{depth:d,steps:1,curveSegments:8,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:1});
  }
  const doors=new T.Group();doors.name='Recessed southern gate jambs and lintels';south.add(doors);
  for(const x of centers){
    add(vestibule,vaultGeo,masonry,x,floor,back);
    B(vestibule,x,floor+.035,212.5,7,.07,45,mats.pavement);
    // Dressed, individually cut voussoirs and narrow mortarless joints.
    for(let k=0;k<15;k++)add(doors,annular(3.5,4.02,k*Math.PI/15+.004,(k+1)*Math.PI/15-.004,.6),mats.stoneLight,x,floor+spring,234.8);
    for(const sign of [-1,1]){
      for(let row=0;row<6;row++)B(doors,x+sign*3.75,floor+.63+row*1.25,235.12,.49,1.21,.48,mats.stoneLight);
      B(doors,x+sign*3.56,floor+3.75,234.7,.18,7.5,.62,mats.stoneLight);
      B(doors,x+sign*3.77,floor+.2,235.2,.65,.4,.85,mats.stoneDark);
    }
    for(const z of [198,205.5,213,220.5,228]){
      add(vestibule,annular(3.36,3.52,0,Math.PI,.3),mats.stoneLight,x,floor+spring,z);
      for(const sign of [-1,1])B(vestibule,x+sign*3.43,floor+3.75,z+.15,.14,7.5,.3,mats.stoneLight);
    }
    // A shadowed back plane makes the unmodeled continuation explicit, while
    // the vestibule itself remains a physically open, deep architectural space.
    B(vestibule,x,floor+5.4,190.08,6.95,10.8,.06,mats.dark);
  }
  for(const [x,w]of [[-12,17.6],[47,25.6]]){
    B(doors,x,-2.0,235.3,w,.32,1.0,mats.stoneLight);
    B(doors,x,-1.74,235.15,w+.4,.2,1.25,mats.stoneLight);
  }
  // A long landing serves both entrances at the gateway floor. The former
  // staircase incorrectly climbed all the way to the precinct surface.
  B(south,0,-14.63,238.3,280,.26,6.6,mats.pavement);
  const stepReport=[];
  function flight(cx,width,base,count){
    const rise=(floor-base)/count, runs=[];let z=241.6;
    for(let i=0;i<count;i++){const run=i%2===0?.42:.88;runs.push(run);z+=run;}
    const length=z-241.6,shape=new T.Shape();shape.moveTo(241.6,base-.3);shape.lineTo(241.6,floor);
    let cursor=241.6;
    for(let i=0;i<count;i++){
      const y=floor-i*rise,run=runs[i];cursor+=run;shape.lineTo(cursor,y);shape.lineTo(cursor,y-rise);
      B(south,cx,y-.045,cursor-run/2,width,.09,run+.012,mats.stoneLight);
    }
    shape.lineTo(cursor,base-.3);shape.closePath();
    const geo=new T.ExtrudeGeometry(shape,{depth:width,steps:1,curveSegments:1,bevelEnabled:false});
    const baseMesh=add(south,geo,masonry,cx-width/2,0,0);baseMesh.rotation.y=-Math.PI/2;
    // Extruded profile's local X maps into south +Z and local Z into +X.
    // The rotation maps local X into +Z, hence local extrusion points west.
    baseMesh.position.x=cx+width/2;
    // Paved foot landing and low stone edges give the broad flight a proper end.
    B(south,cx,base-.08,cursor+1.5,width+.6,.16,3,mats.pavement);
    for(const sign of [-1,1]){
      const sideGeo=geo.clone();const side=add(south,sideGeo,mats.stoneDark,cx+sign*(width/2+.24),0,0);side.rotation.y=-Math.PI/2;side.scale.z=.48/width;side.position.x=cx+sign*(width/2+.24)+.24;
    }
    stepReport.push({width,rise,steps:count,length,base,top:floor});
  }
  flight(-12,62,-25,58);flight(47,44,-24.0,53);
  // Clear a shallow bedrock channel under the approach instead of allowing
  // the old landscape skirt to swallow its lower treads.
  const rock=world.getObjectByName('Uneven weathered bedrock skirt');
  if(rock?.geometry?.attributes.position){const p=rock.geometry.attributes.position;for(let i=0;i<p.count;i++)if(p.getX(i)>-49&&p.getX(i)<73&&p.getZ(i)>234&&p.getZ(i)<320)p.setY(i,Math.min(-25.05,p.getY(i)));p.needsUpdate=true;rock.geometry.computeVertexNormals();rock.geometry.computeBoundingSphere();}
  // The illustrative bath floors must also meet the bedrock. Clearing the
  // stair channel changes adjacent terrain triangles, so the first bath can
  // otherwise hover several metres above their interpolated surface. Quiet,
  // slightly battered footings stop below each existing floor; their western
  // edge remains east of the stair-clearance channel at x=73.
  const baths=world.children.find(g=>g.userData.landmark==='baths');
  const bathSupport={count:0,triangles:0,finite:true,foundations:[]};
  if(baths){
    const name='Seated bedrock foundations beneath the illustrative ritual baths';
    const old=baths.getObjectByName(name);if(old){old.parent.remove(old);old.geometry.dispose();}
    rock?.updateWorldMatrix(true,false);
    const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),positions=[],uvs=[];
    const faces=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7];
    for(let n=0;n<3;n++){
      const x=82+n*18,z=260+(n%2)*16,halfWidth=7.04,halfDepth=5.54,top=-17.99,spread=.32;
      let lowest=Infinity;
      for(const dx of [-halfWidth-spread,0,halfWidth+spread])for(const dz of [-halfDepth-spread,0,halfDepth+spread]){
        ray.set(new T.Vector3(x+dx,10,z+dz),down);
        const hit=rock?ray.intersectObject(rock,false)[0]:null;
        lowest=Math.min(lowest,hit?hit.point.y:-25.1);
      }
      const bottom=Math.min(top-.25,lowest-.15);
      const corners=[[-halfWidth,top,-halfDepth],[halfWidth,top,-halfDepth],[halfWidth,top,halfDepth],[-halfWidth,top,halfDepth],
        [-halfWidth-spread,bottom,-halfDepth-spread],[halfWidth+spread,bottom,-halfDepth-spread],[halfWidth+spread,bottom,halfDepth+spread],[-halfWidth-spread,bottom,halfDepth+spread]];
      for(const i of faces){const c=corners[i];positions.push(x+c[0],c[1],z+c[2]);uvs.push(x+c[0],c[1]);}
      bathSupport.foundations.push({x,z,top,bottom});bathSupport.count++;
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeVertexNormals();g.computeBoundingSphere();
    const footing=new T.Mesh(g,mats.terrain||mats.stoneDark);footing.name=name;footing.castShadow=footing.receiveShadow=true;baths.add(footing);
    bathSupport.triangles=positions.length/9;bathSupport.finite=positions.every(Number.isFinite);
  }
  // Retaining-wall boss relief must leave actual openings; it cannot bridge
  // the clear arch span now that the dark placeholder planes are gone.
  const facing=world.getObjectByName('Dressed Herodian retaining ashlar with drafted margins');
  if(facing?.isInstancedMesh){const matrix=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();let out=0;for(let i=0;i<facing.count;i++){
    facing.getMatrixAt(i,matrix);matrix.decompose(p,q,s);
    let overlap=false;if(p.z>234&&p.y+s.y/2>floor&&p.y-s.y/2<floor+11.1){for(const x of centers){const nearY=Math.min(spring,Math.max(0,p.y-floor-s.y/2));const allowance=p.y-s.y/2<=floor+spring?r:Math.sqrt(Math.max(0,r*r-(p.y-floor-s.y/2-spring)**2));if(p.x+s.x/2>x-allowance&&p.x-s.x/2<x+allowance)overlap=true;}}
    if(!overlap){facing.setMatrixAt(out,matrix);if(facing.instanceColor){const c=new T.Color();facing.getColorAt(i,c);facing.setColorAt(out,c);}out++;}
  }facing.count=out;facing.instanceMatrix.needsUpdate=true;if(facing.instanceColor)facing.instanceColor.needsUpdate=true;facing.computeBoundingSphere();}
  // Merge the fixed architecture by material, preserving shared source box
  // geometries. No extra render object is needed for every tread or voussoir.
  function mergeStatic(parent){
    const buckets=new Map();for(const o of [...parent.children]){
      if(!o.isMesh||o.isInstancedMesh)continue;o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);
      if(!g.attributes.normal)g.computeVertexNormals();let b=buckets.get(o.material);if(!b){b={position:[],normal:[],uv:[]};buckets.set(o.material,b);}const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;
      for(let i=0;i<p.count;i++){b.position.push(p.getX(i),p.getY(i),p.getZ(i));b.normal.push(n.getX(i),n.getY(i),n.getZ(i));b.uv.push(u?u.getX(i):0,u?u.getY(i):0);}g.dispose();parent.remove(o);
    }
    for(const [m,b]of buckets){const g=new T.BufferGeometry();for(const[name,size]of [['position',3],['normal',3],['uv',2]])g.setAttribute(name,new T.Float32BufferAttribute(b[name],size));g.computeBoundingSphere();add(parent,g,m).name='Southern approach: joined dressed stone and paved steps';}
    for(const c of parent.children)if(c.isGroup)mergeStatic(c);
  }
  mergeStatic(south);
  let triangles=0,draws=0,finite=true;south.traverse(o=>{if(o.isMesh){draws++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;for(const v of o.geometry.attributes.position.array)if(!Number.isFinite(v))finite=false;}});
  const report={gates:5,vestibuleDepth:depth,landingY:floor,flights:stepReport,triangles,draws,finite,bathSupport};south.userData.construction=report;return report;
}
