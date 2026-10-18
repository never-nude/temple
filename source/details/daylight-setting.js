/* An imagined Mediterranean daylight setting. The hills are visual context,
   not a topographic or archaeological survey. No animation or extra assets. */
function createTempleDaylightSetting(T, {scene, mats}) {
  const direction = new T.Vector3(.55,.8,.6).normalize();
  const uniforms = {
    sunDirection:{value:direction},
    zenith:{value:new T.Color('#6d9fc9')},
    horizon:{value:new T.Color('#d7e0e1')},
    warmth:{value:0}
  };
  const material = new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,fog:false,uniforms,
    vertexShader:`varying vec3 skyDirection;void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`
      varying vec3 skyDirection;
      uniform vec3 sunDirection;uniform vec3 zenith;uniform vec3 horizon;uniform float warmth;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0)),f.x),f.y);}
      float clouds(vec2 p){float n=.54*noise(p);p=p*2.03+vec2(4.2,7.8);n+=.28*noise(p);p=p*2.09+vec2(9.4,2.3);return n+.13*noise(p);}
      void main(){
        vec3 ray=normalize(skyDirection);float h=max(ray.y,0.0);
        vec3 low=mix(horizon,vec3(.84,.66,.43),warmth*.25);
        vec3 color=mix(low,zenith,smoothstep(0.0,.80,pow(h,.60)));
        float glare=pow(max(dot(ray,sunDirection),0.0),12.0);
        color+=vec3(.23,.19,.12)*glare;
        vec2 projected=ray.xz/max(.17,h+.15);
        float cloud=smoothstep(.58,.81,clouds(projected*1.25+vec2(2.4,-.6)));
        cloud*=smoothstep(.025,.20,h)*(1.0-smoothstep(.65,.95,h));
        color=mix(color,vec3(.86,.89,.90),cloud*.38);
        float disk=smoothstep(.99987,.99997,dot(ray,sunDirection));
        color+=vec3(3.0,2.6,1.9)*disk;
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const sky=new T.Mesh(new T.SphereGeometry(2400,32,16),material);
  sky.name='Mediterranean daylight, high thin cloud and atmospheric horizon';sky.renderOrder=-10;scene.add(sky);
  scene.fog=new T.FogExp2('#d7e0e1',.00085);
  const geometry=new T.PlaneGeometry(6000,6000,160,160);geometry.rotateX(-Math.PI/2);
  const p=geometry.attributes.position;let low=Infinity,high=-Infinity;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),edge=Math.max(Math.abs(x)-240,Math.abs(z)-340);
    const outside=T.MathUtils.smoothstep(edge,0,540);
    const west=Math.exp(-((x+920)**2/720**2+(z+200)**2/1000**2));
    const east=Math.exp(-((x-1050)**2/880**2+(z-280)**2/1200**2));
    const folds=13*Math.sin(x*.0034+Math.sin(z*.0017))*Math.cos(z*.0026)+5*Math.sin(z*.009+x*.002);
    const y=-25+outside*(48*west+40*east+folds);
    p.setY(i,y);low=Math.min(low,y);high=Math.max(high,y);
  }
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  // Distant terrain carries more aerial haze than the nearby architecture.
  // Preserve the existing metre-scaled surface hook on this cloned material.
  const groundMaterial=mats.terrain.clone();groundMaterial.color.set('#b4aa97');
  const terrainCompile=mats.terrain.onBeforeCompile,terrainKey=mats.terrain.customProgramCacheKey;
  groundMaterial.onBeforeCompile=function(shader){
    terrainCompile.call(this,shader);
    shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`#include <fog_fragment>
      #ifdef USE_FOG
        float distantHaze=1.0-exp(-pow(max(vFogDepth-260.0,0.0)*.0017,2.0));
        gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,distantHaze);
      #endif`);
  };
  groundMaterial.customProgramCacheKey=()=>terrainKey.call(mats.terrain)+'-distant-aerial-haze-v1';
  const ground=new T.Mesh(geometry,groundMaterial);ground.receiveShadow=true;
  ground.name='Imagined limestone ridges beyond the precinct';scene.add(ground);
  return {sky,ground,updateSun(vector,value){direction.copy(vector);uniforms.warmth.value=Math.abs(value-50)/50;},diagnostics:{hills:[low,high],interpretive:true}};
}
