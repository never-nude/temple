/* Linear-light contact shading followed by a perceptual FXAA display resolve.
   Older GPUs retain the native renderer; no added rendering dependency. */
function createTempleContactRenderer(T, renderer, scene, camera) {
  // Narrow screens use native multisample antialiasing and one render pass.
  // This preserves fine masonry without allocating several phone-sized buffers.
  const supported = !matchMedia('(max-width: 600px)').matches && !new URLSearchParams(location.search).has('direct') && renderer.capabilities.isWebGL2 && renderer.extensions.has('EXT_color_buffer_float');
  const drawingSize = new T.Vector2();
  let disposed = false;
  if (!supported) return {
    async prepare() { if (!disposed && renderer.compileAsync) await renderer.compileAsync(scene,camera); },
    render() { if (!disposed) renderer.render(scene, camera); },
    resize() {},
    dispose() { disposed = true; }
  };

  // Float color MSAA is optional even when ordinary color supports it.
  // Depth and color must agree on their sample count for a complete framebuffer.
  const gl=renderer.getContext();
  const colorSamples=Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER,gl.RGBA16F,gl.SAMPLES)||[]);
  const depthSamples=Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,gl.SAMPLES)||[]);
  const samples=matchMedia("(max-width: 600px)").matches?0:Math.max(0,...colorSamples.filter(n=>n<=4&&depthSamples.includes(n)));
  renderer.getDrawingBufferSize(drawingSize);
  const target = new T.WebGLRenderTarget(Math.max(1, drawingSize.x), Math.max(1, drawingSize.y), {
    type: T.HalfFloatType,
    format: T.RGBAFormat,
    minFilter: T.LinearFilter,
    magFilter: T.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
    samples
  });
  target.texture.name = 'Temple linear HDR scene';
  target.texture.colorSpace = T.LinearSRGBColorSpace;
  target.texture.generateMipmaps = false;
  target.depthTexture = new T.DepthTexture(target.width, target.height, T.UnsignedIntType);
  target.depthTexture.name = 'Temple contact depth';
  target.depthTexture.format = T.DepthFormat;
  target.depthTexture.minFilter = target.depthTexture.magFilter = T.NearestFilter;

  const displayTarget = new T.WebGLRenderTarget(target.width,target.height,{type:T.UnsignedByteType,format:T.RGBAFormat,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:false,stencilBuffer:false});
  displayTarget.texture.name = 'Temple perceptual display resolve';
  displayTarget.texture.colorSpace = T.NoColorSpace;
  displayTarget.texture.generateMipmaps = false;
  const uniforms = {
    tColor: { value: target.texture },
    tDepth: { value: target.depthTexture },
    resolution: { value: new T.Vector2(target.width, target.height) },
    inverseProjection: { value: camera.projectionMatrixInverse.clone() },
    projectionScale: { value: camera.projectionMatrix.elements[5] },
    toneBackground: { value: 1 },
    toneMappingExposure: { value: renderer.toneMappingExposure }
  };
  const material = new T.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    blending: T.NoBlending,
    toneMapped: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4( position.xy, 0.0, 1.0 );
      }
    `,
    fragmentShader: `
      uniform sampler2D tColor;
      uniform sampler2D tDepth;
      uniform vec2 resolution;
      uniform mat4 inverseProjection;
      uniform float projectionScale;
      uniform float toneBackground;
      varying vec2 vUv;
      #include <common>
      #include <tonemapping_pars_fragment>

      vec3 viewPosition( vec2 uv, float depth ) {
        vec4 p = inverseProjection * vec4( uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0 );
        return p.xyz / p.w;
      }

      float contactShading( float depth ) {
        if (depth >= .9999999) return 1.0;
        vec3 p = viewPosition(vUv,depth);
        // Use the nearer depth neighbor on each axis. Screen derivatives across
        // thin joints otherwise tilt the normal and pepper broad stone faces.
        vec2 texel = 1.0 / resolution;
        vec3 l = viewPosition(vUv-vec2(texel.x,0.0),texture2D(tDepth,vUv-vec2(texel.x,0.0)).r);
        vec3 r = viewPosition(vUv+vec2(texel.x,0.0),texture2D(tDepth,vUv+vec2(texel.x,0.0)).r);
        vec3 d = viewPosition(vUv-vec2(0.0,texel.y),texture2D(tDepth,vUv-vec2(0.0,texel.y)).r);
        vec3 u = viewPosition(vUv+vec2(0.0,texel.y),texture2D(tDepth,vUv+vec2(0.0,texel.y)).r);
        vec3 dx = abs(p.z-l.z)<abs(r.z-p.z)?p-l:r-p;
        vec3 dy = abs(p.z-d.z)<abs(u.z-p.z)?p-d:u-p;
        vec3 crossed = cross(dx,dy);
        vec3 n = crossed * inversesqrt(max(dot(crossed,crossed),1e-12));
        if (dot(n,-p) < 0.0) n = -n;

        // The radius remains 1.15 physical metres. At an overview distance the
        // effect naturally fades to subpixels rather than making dark outlines.
        float radius = 1.15;
        float pixelRadius = min(18.0, radius * projectionScale * resolution.y * .5 / max(.1,-p.z));
        if (pixelRadius < 1.0) return 1.0;
        float visible = smoothstep(1.0,2.5,pixelRadius) * (1.0-smoothstep(30.0,55.0,-p.z));
        float occlusion = 0.0;
        for (int i=0; i<12; i++) {
          float fi = float(i);
          float angle = fi * 2.39996323 + .42;
          float spiral = sqrt((fi + .55) / 12.0);
          vec2 sampleUv = vUv + vec2(cos(angle),sin(angle)) * pixelRadius * spiral / resolution;
          if (sampleUv.x <= 0.0 || sampleUv.x >= 1.0 || sampleUv.y <= 0.0 || sampleUv.y >= 1.0) continue;
          float sd = texture2D(tDepth,sampleUv).r;
          if (sd >= .9999999) continue;
          vec3 delta = viewPosition(sampleUv,sd) - p;
          float distanceToSurface = length(delta);
          float range = 1.0 - smoothstep(radius*.25,radius,distanceToSurface);
          float horizon = max(0.0,dot(n,delta / max(distanceToSurface,.0001)) - .25);
          float selfBias = smoothstep(.06,.16,distanceToSurface);
          occlusion += horizon * range * selfBias;
        }
        // Restrict the correction to nearby cavities. Subpixel stone joints at
        // architectural viewing distances must not become dotted dark edges.
        return 1.0 - min(.14,occlusion * .18) * visible;
      }

      void main() {
        vec4 original = texture2D(tColor,vUv);
        float depth = texture2D(tDepth,vUv).r;
        vec3 color = original.rgb * contactShading(depth);
        // Correct contact in linear light, then resolve display-referred edges
        // in a separate pass. Each pixel is tone mapped and encoded once.
        if (depth < .9999999 || toneBackground > .5) color=ACESFilmicToneMapping(color);
        color=max(color,vec3(0.0));
        vec3 encoded=mix(color*12.92,1.055*pow(color,vec3(1.0/2.4))-.055,step(vec3(.0031308),color));
        gl_FragColor=vec4(encoded,original.a);
      }
    `
  });
  const geometry = new T.PlaneGeometry(2, 2);
  const quad = new T.Mesh(geometry, material);
  quad.frustumCulled = false;
  const postScene = new T.Scene();
  postScene.add(quad);
  const postCamera = new T.Camera();
  const resolveMaterial = new T.ShaderMaterial({
    uniforms:{tColor:{value:displayTarget.texture},resolution:uniforms.resolution},
    depthTest:false,depthWrite:false,blending:T.NoBlending,toneMapped:false,
    vertexShader:material.vertexShader,
    fragmentShader:`
      uniform sampler2D tColor;uniform vec2 resolution;varying vec2 vUv;
      float luma( vec3 c ) { return dot( c, vec3( 0.299, 0.587, 0.114 ) ); }

      // A small FXAA resolve restores smooth silhouettes because the scene is
      // rendered to a non-multisampled, readable depth attachment.
      vec3 sceneColor( vec2 uv ) {
        vec2 texel = 1.0 / resolution;
        vec3 c = texture2D( tColor, uv ).rgb;
        vec3 nw = texture2D( tColor, uv + vec2(-1.0, 1.0) * texel ).rgb;
        vec3 ne = texture2D( tColor, uv + vec2( 1.0, 1.0) * texel ).rgb;
        vec3 sw = texture2D( tColor, uv + vec2(-1.0,-1.0) * texel ).rgb;
        vec3 se = texture2D( tColor, uv + vec2( 1.0,-1.0) * texel ).rgb;
        float lc = luma(c), lnw = luma(nw), lne = luma(ne), lsw = luma(sw), lse = luma(se);
        float lo = min(lc, min(min(lnw,lne), min(lsw,lse)));
        float hi = max(lc, max(max(lnw,lne), max(lsw,lse)));
        if (hi - lo < max(.035, hi * .12)) return c;
        vec2 direction = vec2(-((lnw+lne)-(lsw+lse)), (lnw+lsw)-(lne+lse));
        float reduce = max((lnw+lne+lsw+lse) * .0078125, .0078125);
        direction = clamp(direction / (min(abs(direction.x),abs(direction.y)) + reduce), vec2(-4.0), vec2(4.0)) * texel;
        vec3 a = .5 * (texture2D(tColor,uv-direction/6.0).rgb + texture2D(tColor,uv+direction/6.0).rgb);
        vec3 b = a * .5 + .25 * (texture2D(tColor,uv-direction*.5).rgb + texture2D(tColor,uv+direction*.5).rgb);
        float lb = luma(b);
        return lb < lo || lb > hi ? a : b;
      }

      void main(){gl_FragColor=vec4(sceneColor(vUv),texture2D(tColor,vUv).a);}
    `
  });
  const resolveQuad=new T.Mesh(geometry,resolveMaterial);resolveQuad.frustumCulled=false;
  const resolveScene=new T.Scene();resolveScene.add(resolveQuad);

  const viewport = new T.Vector4(), scissor = new T.Vector4();

  function resize(w, h) {
    if (disposed) return;
    const pixelRatio = renderer.getPixelRatio();
    const width = Math.max(1, Math.round(w * pixelRatio)), height = Math.max(1, Math.round(h * pixelRatio));
    if (target.width !== width || target.height !== height) {target.setSize(width,height);displayTarget.setSize(width,height);}
    uniforms.resolution.value.set(width, height);
  }
  function render() {
    if (disposed) return;
    // Let any future immersive renderer use its own XR framebuffer and cameras.
    if (renderer.xr && renderer.xr.isPresenting) { renderer.render(scene, camera); return; }
    renderer.getDrawingBufferSize(drawingSize);
    if (target.width !== drawingSize.x || target.height !== drawingSize.y) {
      target.setSize(Math.max(1,drawingSize.x),Math.max(1,drawingSize.y));
      displayTarget.setSize(target.width,target.height);
      uniforms.resolution.value.copy(drawingSize);
    }
    uniforms.toneMappingExposure.value=renderer.toneMappingExposure;
    uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);
    uniforms.projectionScale.value = camera.projectionMatrix.elements[5];
    // Solid-color backgrounds are cleared without tone mapping by the normal
    // renderer; preserve that behavior. Environment / sky backgrounds are HDR.
    uniforms.toneBackground.value = scene.background && scene.background.isColor ? 0 : 1;

    const previousTarget = renderer.getRenderTarget(), autoClear = renderer.autoClear;
    const scissorTest = renderer.getScissorTest();
    renderer.getViewport(viewport); renderer.getScissor(scissor);
    try {
      renderer.autoClear = true;
      renderer.setScissorTest(false);
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(displayTarget);
      renderer.render(postScene, postCamera);
      renderer.setRenderTarget(previousTarget);
      renderer.render(resolveScene,postCamera);
    } finally {
      renderer.setRenderTarget(previousTarget);
      renderer.autoClear = autoClear;
      renderer.setViewport(viewport);
      renderer.setScissor(scissor);
      renderer.setScissorTest(scissorTest);
    }
  }
  async function prepare() {
    if(disposed || !renderer.compileAsync)return;
    const previousTarget=renderer.getRenderTarget();
    try {
      renderer.setRenderTarget(target);await renderer.compileAsync(scene,camera);
      if(disposed)return;
      renderer.setRenderTarget(displayTarget);await renderer.compileAsync(postScene,postCamera);
      if(disposed)return;
      renderer.setRenderTarget(null);await renderer.compileAsync(resolveScene,postCamera);
    } finally {renderer.setRenderTarget(previousTarget);}
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    target.depthTexture.dispose(); target.dispose(); displayTarget.dispose();
    geometry.dispose(); material.dispose(); resolveMaterial.dispose();
  }
  return { prepare, render, resize, dispose };
}
