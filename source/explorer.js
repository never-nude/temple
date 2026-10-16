(() => {
  const root=document.getElementById('temple-explorer');
  const $=s=>root.querySelector(s), $$=s=>Array.from(root.querySelectorAll(s));
  const loading=$('.temple-loading');
  const activity={dirty:true};
  if(!window.THREE){loading.textContent='The 3D library could not load. Reopen this view to try again.';loading.setAttribute('role','alert');return;}
  const T=window.THREE, stage=$('.temple-stage'), host=$('.temple-canvas'), labelLayer=$('.temple-labels');
  let renderer;
  try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}catch(e){loading.textContent='This view needs WebGL. Open it in a browser with 3D graphics enabled.';loading.setAttribute('role','alert');return;}
  const mobileGraphics=matchMedia("(max-width: 600px)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobileGraphics?1.5:1.75));
  renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
  renderer.setClearColor(0,0);host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','3D temple model. Use the viewpoint and camera buttons to explore; select landmarks for descriptions.');
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(42,1,.08,5000);
  const world=new T.Group();scene.add(world);
  const contactRenderer=createTempleContactRenderer(T,renderer,scene,camera);
  renderer.info.autoReset=false;
  const readColor=token=>{const el=document.createElement('span');el.style.color='var('+token+')';root.appendChild(el);const css=getComputedStyle(el).color;el.remove();const c=document.createElement('canvas');c.width=c.height=1;const q=c.getContext('2d');q.fillStyle=css;q.fillRect(0,0,1,1);const p=q.getImageData(0,0,1,1).data;return new T.Color().setRGB(p[0]/255,p[1]/255,p[2]/255,T.SRGBColorSpace);};
  let palette;
  function colors(){return {accent:readColor('--viz-series-1')};}
  palette=colors();
  const physicalMaterials=createTempleMaterials(T,renderer);
  const {mats,masonry,paving}=physicalMaterials;
  const disposeSurfaces=loadTempleSurfaces(T,renderer,mats,()=>{root.dataset.surfaces='ready';activity.dirty=true;});
  // A small real bevel catches the light; silhouettes no longer have razor edges.
  const boxCache=new Map();
  function softBox(w,h,d,requested=.075){
    const b=Math.min(requested,Math.min(w,h,d)*.16),key=[w,h,d,b].join(',');
    if(boxCache.has(key))return boxCache.get(key);
    const shape=new T.Shape();shape.moveTo(-w/2+b,-h/2+b);shape.lineTo(w/2-b,-h/2+b);shape.lineTo(w/2-b,h/2-b);shape.lineTo(-w/2+b,h/2-b);shape.closePath();
    const geometry=new T.ExtrudeGeometry(shape,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:2,steps:1,curveSegments:1});
    geometry.translate(0,0,-d/2+b);geometry.clearGroups();geometry.parameters={width:w,height:h,depth:d};geometry.userData.templeBox=true;boxCache.set(key,geometry);return geometry;
  }
  function box(parent,x,y,z,w,h,d,material=mats.stone){const m=new T.Mesh(softBox(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  const cylGeom=new T.CylinderGeometry(1,1,1,24), boxGeom=softBox(1,1,1,.025);
  function cylinder(parent,x,y,z,r,h,mat=mats.stone,top=r){const mesh=new T.Mesh(top===r?cylGeom:new T.CylinderGeometry(top/r,1,1,12),mat);mesh.position.set(x,y,z);mesh.scale.set(r,h,r);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function instance(parent,geometry,mat,transforms){const m=new T.InstancedMesh(geometry,mat,transforms.length);const dummy=new T.Object3D();transforms.forEach((p,i)=>{dummy.position.set(p[0],p[1],p[2]);dummy.scale.set(p[3],p[4],p[5]);dummy.rotation.set(p[6]||0,p[7]||0,p[8]||0);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);});m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function column(parent,x,z,baseY,height,radius,mat=mats.stoneLight){const g=new T.Group();parent.add(g);box(g,x,baseY+.18,z,radius*3.0,.36,radius*3.0,mat);cylinder(g,x,baseY+.54,z,radius*1.35,.36,mat);cylinder(g,x,baseY+height/2,z,radius,height-1.5,mat,radius*.82);cylinder(g,x,baseY+height-.7,z,radius*1.15,.7,mat,radius*1.45);box(g,x,baseY+height-.15,z,radius*2.8,.3,radius*2.8,mat);return g;}
  function columnSeries(parent,positions,base,height,radius){const shafts=[],bases=[],rings=[],caps=[],leaves=[];for(const [x,z]of positions){shafts.push([x,base+height/2,z,radius,height-1.3,radius]);bases.push([x,base+.16,z,radius*2.8,.32,radius*2.8]);rings.push([x,base+.45,z,radius*1.3,.3,radius*1.3]);caps.push([x,base+height-.15,z,radius*2.75,.3,radius*2.75]);for(let k=0;k<8;k++){const a=k*Math.PI/4;leaves.push([x+Math.sin(a)*radius*.85,base+height-.65,z+Math.cos(a)*radius*.85,radius*.45,.85,radius*.45,0,a,Math.sin(a)*.22]);}}
    instance(parent,new T.CylinderGeometry(.82,1,1,12),mats.stoneLight,shafts);instance(parent,boxGeom,mats.stoneLight,bases);instance(parent,cylGeom,mats.stoneLight,rings);instance(parent,boxGeom,mats.stoneLight,caps);instance(parent,new T.ConeGeometry(1,1,4),mats.stoneLight,leaves);
  }
  const textureObjects=[...physicalMaterials.textures];
  // Actual sky and earth reflections, independent of the interface's theme.
  const envCanvas=document.createElement('canvas');envCanvas.width=512;envCanvas.height=256;
  const eq=envCanvas.getContext('2d'),gradient=eq.createLinearGradient(0,0,0,256);
  for(const [position,color]of [[0,'#6f9cce'],[.30,'#b1cce3'],[.49,'#e8e6dd'],[.51,'#a69679'],[.75,'#7c7058'],[1,'#6e675b']])gradient.addColorStop(position,color);
  eq.fillStyle=gradient;eq.fillRect(0,0,512,256);
  const halo=eq.createRadialGradient(104,65,1,104,65,42);halo.addColorStop(0,'rgba(255,249,224,1)');halo.addColorStop(.12,'rgba(255,249,224,.98)');halo.addColorStop(1,'rgba(255,249,224,0)');eq.fillStyle=halo;eq.fillRect(60,20,90,90);
  const envTexture=new T.CanvasTexture(envCanvas);envTexture.mapping=T.EquirectangularReflectionMapping;envTexture.colorSpace=T.SRGBColorSpace;
  const pmrem=new T.PMREMGenerator(renderer);let envTarget=pmrem.fromEquirectangular(envTexture);scene.environment=envTarget.texture;pmrem.dispose();textureObjects.push(envTexture,envTarget.texture);
  // CC0 captured daylight adds real high-range reflections to gilded surfaces.
  if(window.RGBELoader)new window.RGBELoader().load('./assets/dry_meadow_1k.hdr',hdr=>{
    if(!root.isConnected){hdr.dispose();return;}
    hdr.mapping=T.EquirectangularReflectionMapping;const generator=new T.PMREMGenerator(renderer),captured=generator.fromEquirectangular(hdr);generator.dispose();hdr.dispose();envTarget.dispose();envTarget=captured;scene.environment=captured.texture;const calibrated=new Set([masonry,...Object.values(mats)]);scene.traverse(o=>{if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m.isMeshStandardMaterial)calibrated.add(m);});for(const m of calibrated)m.envMapIntensity=m.metalness>.8?.8:.18;root.dataset.capturedLight='ready';sun.shadow.needsUpdate=true;activity.dirty=true;
  },undefined,()=>{root.dataset.capturedLight='procedural-fallback';});
  const sky=new T.Mesh(new T.SphereGeometry(2400,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{zenith:{value:new T.Color('#6c97bd')},horizon:{value:new T.Color('#d6cbb5')}},vertexShader:'varying vec3 skyDirection; void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 skyDirection; uniform vec3 zenith; uniform vec3 horizon; void main(){float h=max(normalize(skyDirection).y,0.0);vec3 col=mix(horizon,zenith,pow(h,.48));gl_FragColor=vec4(col,1.0);#include <tonemapping_fragment>\n#include <colorspace_fragment>}',fog:false}));
  sky.material.fragmentShader=sky.material.fragmentShader.replace(';#include',';\n#include');sky.renderOrder=-10;scene.add(sky);
  scene.fog=new T.FogExp2('#d6cbb5',.00072);
  const groundGeometry=new T.PlaneGeometry(6000,6000,128,128);groundGeometry.rotateX(-Math.PI/2);
  const gp=groundGeometry.attributes.position;
  for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=gp.getZ(i),outside=T.MathUtils.smoothstep(Math.max(Math.abs(x)-200,Math.abs(z)-290),0,420);gp.setY(i,-25+outside*(5*Math.sin(x*.008)*Math.cos(z*.006)+2*Math.sin(z*.018)));}
  groundGeometry.computeVertexNormals();const ground=new T.Mesh(groundGeometry,mats.terrain);ground.name='Surrounding limestone hills — interpretive landscape';ground.receiveShadow=true;scene.add(ground);
  const hemi=new T.HemisphereLight(0xbad3ed,0x988566,.55);scene.add(hemi);
  const sun=new T.DirectionalLight(0xfff1d5,3.25);sun.castShadow=true;sun.shadow.mapSize.set(mobileGraphics?2048:4096,mobileGraphics?2048:4096);sun.shadow.camera.near=1;sun.shadow.camera.far=1500;sun.shadow.bias=-.00014;sun.shadow.normalBias=.17;sun.shadow.radius=2;scene.add(sun);scene.add(sun.target);
  const fill=new T.DirectionalLight(0xb8cbe1,.22);fill.position.set(-200,120,-200);scene.add(fill);
  let shadowSpan=0;const sunDirection=new T.Vector3(1,1,.55).normalize();
  function updateShadow(target){const distance=camera.position.distanceTo(target),span=distance<140?85:distance<320?180:370;if(span!==shadowSpan){shadowSpan=span;sun.shadow.camera.left=-span;sun.shadow.camera.right=span;sun.shadow.camera.top=span;sun.shadow.camera.bottom=-span;sun.shadow.camera.updateProjectionMatrix();sun.shadow.needsUpdate=true;}if(sun.target.position.distanceToSquared(target)>.001){sun.target.position.copy(target);sun.shadow.needsUpdate=true;}const position=target.clone().addScaledVector(sunDirection,650);if(sun.position.distanceToSquared(position)>.001){sun.position.copy(position);sun.shadow.needsUpdate=true;}if(sun.shadow.needsUpdate)renderer.shadowMap.needsUpdate=true;}
  const cutawayParts=[],pickables=[];
  function group(id){const g=new T.Group();g.userData.landmark=id;world.add(g);pickables.push(g);return g;}
  const platform=group('mount');
  box(platform,0,-20,0,330,8,500,mats.terrain);box(platform,0,-15,0,316,4,486,mats.stoneDark);
  box(platform,0,-9,0,300,16,470,masonry);box(platform,0,-.7,0,302,1.4,472,mats.stoneDark);
  const courtFloor=box(platform,0,-.1,0,298,.3,468,paving);
  // Drafted courses are supplied by the world-scaled masonry and fitted relief.
  const northPortico=group('outer'),westPortico=group('outer'),eastPortico=group('outer');
  function portico(g,axis,fixed,start,end,width=12,height=13){const p=[];for(let u=start;u<=end;u+=7){p.push(axis==='x'?[u,fixed-width/2]:[fixed-width/2,u],axis==='x'?[u,fixed+width/2]:[fixed+width/2,u]);}columnSeries(g,p,.1,height,.62);const length=end-start+8;box(g,axis==='x'?(start+end)/2:fixed,height+.4,axis==='x'?fixed:(start+end)/2,axis==='x'?length:width+3,.8,axis==='x'?width+3:length,mats.stoneLight);const roof=box(g,axis==='x'?(start+end)/2:fixed,height+1.3,axis==='x'?fixed:(start+end)/2,axis==='x'?length+1:width+4,1,axis==='x'?width+4:length+1,mats.roof);cutawayParts.push(roof);box(g,axis==='x'?(start+end)/2:fixed,height+2,axis==='x'?fixed:(start+end)/2,axis==='x'?length+1:width+4,.35,axis==='x'?width+4:length+1,mats.stoneLight);}
  portico(northPortico,'x',-220,-138,138);portico(westPortico,'z',-136,-207,175);portico(eastPortico,'z',136,-207,175);
  // Low precinct parapets, with actual entry openings at the east and south.
  box(platform,0,1.2,-234,300,2.4,2,masonry);box(platform,-149,1.2,0,2,2.4,470,masonry);box(platform,149,1.2,-125,2,2.4,220,masonry);box(platform,149,1.2,125,2,2.4,220,masonry);
  function arch(parent,axis,x,z,base,width,height,depth,mat=mats.stone,recess=false){const r=width/2, spring=base+height-r;const shape=new T.Shape();shape.moveTo(-r-1.4,0);shape.lineTo(-r-1.4,height+1.4);shape.lineTo(r+1.4,height+1.4);shape.lineTo(r+1.4,0);shape.lineTo(r,0);shape.lineTo(r,height-r);shape.absarc(0,height-r,r,0,Math.PI,false);shape.lineTo(-r,0);shape.lineTo(-r-1.4,0);const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:16});const mesh=new T.Mesh(geo,mat);mesh.position.set(x,base,z-depth/2);if(axis==='x'){mesh.rotation.y=Math.PI/2;mesh.position.set(x-depth/2,base,z);}mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);const vous=[];for(let i=0;i<11;i++){const a=i*Math.PI/10;const xx=Math.cos(a)*(r+.55),yy=Math.sin(a)*(r+.55);vous.push(axis==='z'?[x+xx,spring+yy,z,.8,1.1,depth+.15,0,0,a-Math.PI/2]:[x,spring+yy,z+xx,depth+.15,1.1,.8,a-Math.PI/2,0,0]);}instance(parent,boxGeom,mats.stoneLight,vous);if(recess){const inset=new T.Shape();inset.moveTo(-r,0);inset.lineTo(r,0);inset.lineTo(r,height-r);inset.absarc(0,height-r,r,0,Math.PI,false);inset.lineTo(-r,0);const mouth=new T.Mesh(new T.ShapeGeometry(inset,24),mats.dark);mouth.position.set(x,base,z+depth/2-.025);if(axis==='x'){mouth.rotation.y=Math.PI/2;mouth.position.set(x+depth/2-.025,base,z);}parent.add(mouth);}return mesh;}
  const easternGate=group('east');arch(easternGate,'x',149,0,0,8,11,5);box(easternGate,149,13,0,7,2,17,mats.stoneLight);for(let i=0;i<18;i++)box(easternGate,155+i*.85,-.5-i*.28,0,1.7,.7,19,mats.stone);
  // Soreg: a low boundary, distinct from the high walls of the inner courts.
  const soreg=group('soreg');const rail=[];for(let x=-94;x<=107;x+=3.7){rail.push([x,.65,-49,.4,1.3,.4],[x,.65,49,.4,1.3,.4]);}for(let z=-49;z<=49;z+=3.7){rail.push([-94,.65,z,.4,1.3,.4]);if(Math.abs(z)>8)rail.push([107,.65,z,.4,1.3,.4]);}instance(soreg,boxGeom,mats.stoneLight,rail);box(soreg,6.5,1.35,-49,203,.3,.6,mats.stoneLight);box(soreg,6.5,1.35,49,203,.3,.6,mats.stoneLight);box(soreg,-94,1.35,0,.6,.3,98,mats.stoneLight);box(soreg,107,1.35,-28.5,.6,.3,41,mats.stoneLight);box(soreg,107,1.35,28.5,.6,.3,41,mats.stoneLight);
  const azarah=group('priests'),women=group('women');
  for(let i=0;i<12;i++)box(azarah,-28.25,.2+i*.35,0,105-i*.95,.4,80-i*.65,mats.stoneDark);
  box(azarah,-28.25,4.95,0,93.5,.9,67.5,mats.pavement);
  for(let i=0;i<8;i++)box(women,52.25,.2+i*.38,0,74-i*.85,.45,74-i*.85,mats.stoneDark);
  box(women,52.25,3.05,0,67.5,.5,67.5,mats.pavement);
  // The Court of Israel is the narrow strip immediately inside the Nicanor Gate.
  const israel=group('israel');box(israel,15.75,5.46,0,5.5,.1,63,mats.stoneLight);
  const wallNorth=box(azarah,-28.25,10.9,-34.5,96,11,2,masonry);cutawayParts.push(wallNorth);
  box(azarah,-28.25,10.9,34.5,96,11,2,masonry);box(azarah,-76,10.9,0,2,11,71,masonry);
  const womenNorth=box(women,52.25,8.3,-34.5,67.5,10,2,masonry);cutawayParts.push(womenNorth);
  box(women,52.25,8.3,34.5,67.5,10,2,masonry);box(women,86.8,8.3,-21.5,2,10,26,masonry);box(women,86.8,8.3,21.5,2,10,26,masonry);arch(women,'x',86.8,0,3.3,9,10,3);
  const trim=[];for(const z of [-35.2,35.2]){trim.push([-28.25,16.5,z,98,.6,3],[52.25,13.6,z,70,.6,3]);}instance(azarah,boxGeom,mats.stoneLight,trim);
  // Women's court corner chambers and elevated surrounding gallery.
  for(const x of [29,75])for(const z of [-23,23]){box(women,x,6.2,z,17,5.8,17,mats.stone);const chamberRoof=box(women,x,9.4,z,18,.7,18,mats.stoneLight);cutawayParts.push(chamberRoof);arch(women,'x',x+8.6,z,3.3,4,5,1,mats.stone,true);}
  const galleryCols=[];for(let x=27;x<=78;x+=8){galleryCols.push([x,-29],[x,29]);}columnSeries(women,galleryCols,9.6,3.8,.35);const galleryRoofs=[box(women,52.25,13.9,-29,68,.6,7,mats.stoneLight),box(women,52.25,13.9,29,68,.6,7,mats.stoneLight)];cutawayParts.push(...galleryRoofs);
  // Fifteen semicircular steps rise westward toward the Nicanor Gate.
  const gate=group('nicanor');for(let i=0;i<15;i++){const radius=12-i*.46;const geo=new T.CylinderGeometry(radius,radius,.14,48,1,false,0,Math.PI);const mesh=new T.Mesh(geo,mats.stoneLight);mesh.rotation.y=0;mesh.position.set(18.5,3.37+i*.14,0);mesh.castShadow=mesh.receiveShadow=true;gate.add(mesh);}
  box(gate,18.5,10.5,-22,3,10.2,24,mats.stone);box(gate,18.5,10.5,22,3,10.2,24,mats.stone);arch(gate,'x',18.5,0,5.4,9,13,4,mats.stoneLight);box(gate,18.5,19.1,0,5,1.2,15,mats.stoneLight);
  // Bronze-toned double doors, parted to leave the processional axis legible.
  const doorMat=mats.bronze;const door1=box(gate,19.5,9.7,-4.6,.35,8.6,4.3,doorMat);door1.rotation.y=-.6;const door2=box(gate,19.5,9.7,4.6,.35,8.6,4.3,doorMat);door2.rotation.y=.6;
  const altar=group('altar');box(altar,-1,5.85,0,16,.9,16,mats.stoneDark);box(altar,-1,6.9,0,15,1.2,15,mats.stone);box(altar,-1,8.35,0,14,1.7,14,mats.stoneLight);box(altar,-1,9.45,0,12.5,.5,12.5,mats.stone);box(altar,-1,9.78,0,10.8,.18,10.8,mats.dark);
  for(const x of [-7,5])for(const z of [-6,6])box(altar,x,10.05,z,.8,1.3,.8,mats.stoneLight);
  const rampShape=new T.Shape();rampShape.moveTo(6.5,5.4);rampShape.lineTo(25,5.4);rampShape.lineTo(6.5,9.7);rampShape.closePath();const ramp=new T.Mesh(new T.ExtrudeGeometry(rampShape,{depth:8,bevelEnabled:false}),mats.stone);ramp.rotation.y=-Math.PI/2;ramp.position.x=3;altar.add(ramp);ramp.castShadow=ramp.receiveShadow=true;
  const logs=[];for(let i=0;i<9;i++)logs.push([-4.4+(i%3)*3.1,10.05+Math.floor(i/3)*.18,-2.7+Math.floor(i/3)*2.2,3.5,.22,.35,0,i%2?Math.PI/2:0,0]);instance(altar,boxGeom,mats.wood,logs);
  const laver=group('laver');cylinder(laver,-18,6,-13,1.1,1.2,doorMat);const basin=new T.Mesh(new T.SphereGeometry(2,24,12,0,Math.PI*2,Math.PI/2,Math.PI/2),doorMat);basin.position.set(-18,8,-13);laver.add(basin);const waterMat=new T.MeshStandardMaterial({color:0x68867f,metalness:.4,roughness:.15});const water=new T.Mesh(new T.CircleGeometry(1.85,32),waterMat);water.rotation.x=-Math.PI/2;water.position.set(-18,7.9,-13);laver.add(water);
  const stoa=group('stoa');box(stoa,0,.5,204,285,1,36,mats.stoneDark);
  const stoaColumns=[];for(let x=-136;x<=136;x+=7.4)for(const z of [189,199,209,219])stoaColumns.push([x,z]);columnSeries(stoa,stoaColumns,1,17,.95);
  for(const z of [189,199,209,219])box(stoa,0,18.4,z,282,1.5,3,mats.stoneLight);
  box(stoa,0,23.8,204,285,1.4,13,mats.roof);for(const z of [198,210]){box(stoa,0,19.95,z,283,.6,1,mats.stoneLight);box(stoa,0,23.45,z,283,.7,1,mats.stoneLight);}
  const beams=[];for(let x=-136;x<=136;x+=7.4){beams.push([x,23,204,.4,.6,12],[x,18.1,193,.5,.5,10],[x,18.1,215,.5,.5,10]);}instance(stoa,boxGeom,mats.wood,beams);
  const stoaRoofs=[box(stoa,0,19.4,193,285,.8,13,mats.roof),box(stoa,0,19.4,215,285,.8,13,mats.roof)];cutawayParts.push(...stoaRoofs,stoa.children.find(m=>m.position.y===23.8));
  // Clerestory openings separated by individual piers.
  const clerestory=[];for(let x=-137;x<140;x+=7.4)for(const z of [197.3,210.7])clerestory.push([x,21.8,z,.7,3.4,.8]);instance(stoa,boxGeom,mats.stoneLight,clerestory);
  const south=group('south');for(let i=0;i<34;i++)box(south,22,-17.5+i*.52,252.5-i*.51,92,.6,1.5,mats.stone);
  for(const x of [-16,39]){arch(south,'z',x,235,-14.5,7,11,5,mats.stoneLight,true);arch(south,'z',x+8,235,-14.5,7,11,5,mats.stoneLight,true);box(south,x+4,-2.2,235,20,1.7,6,mats.stoneLight);}
  const antonia=group('antonia');box(antonia,-120,2.5,-204,58,5,56,mats.stoneDark);box(antonia,-120,16,-204,55,24,53,masonry);const fortressRoof=box(antonia,-120,28.6,-204,57,1.2,55,mats.stoneLight);cutawayParts.push(fortressRoof);
  for(const x of [-144,-96])for(const z of [-228,-180]){const high=x===-96&&z===-180?44:34;box(antonia,x,high/2+3,z,13,high,13,masonry);box(antonia,x,high+3.4,z,14,1,14,mats.stoneLight);const crenels=[];for(let a=-6;a<=6;a+=3)crenels.push([x+a,high+4.6,z-6,1.4,1.8,1.4],[x+a,high+4.6,z+6,1.4,1.8,1.4],[x-6,high+4.6,z+a,1.4,1.8,1.4],[x+6,high+4.6,z+a,1.4,1.8,1.4]);instance(antonia,boxGeom,mats.stoneLight,crenels);for(let y=13;y<high;y+=8){box(antonia,x+6.51,y,z,.03,2.5,.8,mats.dark);box(antonia,x,y,z+6.51,.8,2.5,.03,mats.dark);}}
  // A schematic Robinson's Arch approach on the southwestern retaining wall.
  const bridge=group('arch');arch(bridge,'z',-161,173,-18,17,16,13,masonry);box(bridge,-162,-.2,173,28,2,14,mats.stoneLight);for(let i=0;i<22;i++)box(bridge,-180-i*.8,-1-i*.7,173,1.5,.9,14,mats.stone);
  // Mikveh pools outside the southern approaches: geometric context, not excavated survey positions.
  const pools=group('baths');for(let n=0;n<3;n++){const x=82+n*18,z=260+(n%2)*16;box(pools,x,-17.6,z,14,.8,11,mats.stoneDark);for(const s of [-1,1]){box(pools,x+s*6.5,-16,z,1,3.5,11,masonry);box(pools,x,-16,z+s*5,14,3.5,1,masonry);}for(let i=0;i<7;i++)box(pools,x-4+i*1.2,-15.1-i*.4,z,1.2,.5,9,mats.stone);}
  const architectureDiagnostics=enhanceTempleArchitecture(T,{world,mats,box,instance,cutawayParts,pickables,group});
  root.dataset.architecture=JSON.stringify(architectureDiagnostics);
  // Excavated decorative stonework informs these bands; exact locations are interpretive.
  for(const g of [northPortico,westPortico,eastPortico]){
    if(g===northPortico)box(g,0,.14,-220,267,.10,9,mats.mosaic);
    else box(g,g===eastPortico?136:-136,.14,0,9,.10,423,mats.mosaic);
  }
  box(stoa,0,1.08,204,276,.10,8.5,mats.mosaic);

  // The precinct remains optional context. The measured temple is built separately.
  const contextRoots=[...world.children];
  const sanctuary=buildSanctuary(T,{mats,box,column,unitBoxGeometry:boxGeom});
  world.add(sanctuary.group);pickables.push(sanctuary.group);cutawayParts.push(...sanctuary.cutawayParts);
  root.dataset.sanctuary=JSON.stringify(sanctuary.diagnostics||sanctuary.dimensions||{});
  const templeGround=new T.Group();scene.add(templeGround);
  const presentationFloor=new T.Mesh(new T.PlaneGeometry(1800,1800),mats.pavement);presentationFloor.rotation.x=-Math.PI/2;presentationFloor.position.y=5.385;presentationFloor.receiveShadow=true;templeGround.add(presentationFloor);
  // Small figures supply true physical scale; clothing and pose are interpretive.
  const robeMaterials=[0xc9bfab,0x8c7b65,0xc2b7a1].map(color=>new T.MeshStandardMaterial({color,roughness:.94,envMapIntensity:.16}));
  const skin=new T.MeshStandardMaterial({color:0x9e7152,roughness:.82,envMapIntensity:.15});
  const profile=[];for(let i=0;i<=12;i++){const h=i/12;profile.push(new T.Vector2(.21-.08*h+Math.sin(h*5)*.012,.07+h*1.19));}
  const robeGeometry=new T.LatheGeometry(profile,16),headGeometry=new T.SphereGeometry(1,12,8);
  for(const [index,x,z,turn]of [[0,-14,13,.6],[1,-12,14,-.3],[2,-21,-17,2.5],[3,-63,26,.8]]){
    const figure=new T.Group();figure.name='Human reference — 1.65 metres';figure.position.set(x,5.4,z);figure.rotation.y=turn;templeGround.add(figure);
    const robe=new T.Mesh(robeGeometry,robeMaterials[index%3]);robe.castShadow=robe.receiveShadow=true;figure.add(robe);
    const head=new T.Mesh(headGeometry,skin);head.position.y=1.50;head.scale.set(.105,.14,.10);head.castShadow=true;figure.add(head);
    for(const sign of [-1,1]){const arm=new T.Mesh(new T.CylinderGeometry(.075,.065,.49,10),robeMaterials[index%3]);arm.position.set(sign*.19,1.025,.02);arm.rotation.z=sign*.11;arm.castShadow=true;figure.add(arm);}
  }
  startTempleExplorer(T,{root,renderer,scene,camera,world,temple:sanctuary,contextRoots,ground,templeGround,sun,sunDirection,contactRenderer,cutawayParts,pickables,activity,updateShadow,
    disposeResources(){disposeSurfaces();const gs=new Set(),ms=new Set(Object.values(mats)),ts=new Set(textureObjects);scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))ms.add(m);});for(const m of ms){for(const v of Object.values(m))if(v?.isTexture)ts.add(v);m.dispose();}for(const g of gs)g.dispose();for(const t of ts)t.dispose();contactRenderer.dispose();envTarget.dispose();renderer.dispose();}
  });
})();
