function createTempleContactRenderer(T, renderer, scene, camera) {
  const supported = !new URLSearchParams(location.search).has('direct') && renderer.capabilities.isWebGL2 && renderer.extensions.has('EXT_color_buffer_float');
  const drawingSize = new T.Vector2();
  let disposed = false;
  if (!supported) return {
    render() { if (!disposed) renderer.render(scene, camera); },
    resize() {},
    dispose() { disposed = true; }
  };

  renderer.getDrawingBufferSize(drawingSize);
  const target = new T.WebGLRenderTarget(Math.max(1, drawingSize.x), Math.max(1, drawingSize.y), {
    type: T.HalfFloatType,
    format: T.RGBAFormat,
    minFilter: T.LinearFilter,
    magFilter: T.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false
  });
  target.texture.name = 'Temple linear HDR scene';
  target.texture.colorSpace = T.LinearSRGBColorSpace;
  target.texture.generateMipmaps = false;
  target.depthTexture = new T.DepthTexture(target.width, target.height, T.UnsignedIntType);
  target.depthTexture.name = 'Temple contact depth';
  target.depthTexture.format = T.DepthFormat;
  target.depthTexture.minFilter = target.depthTexture.magFilter = T.NearestFilter;

  const uniforms = {
    tColor: { value: target.texture },
    tDepth: { value: target.depthTexture },
    resolution: { value: new T.Vector2(target.width, target.height) },
    inverseProjection: { value: camera.projectionMatrixInverse.clone() },
    projectionScale: { value: camera.projectionMatrix.elements[5] },
    toneBackground: { value: 1 }
  };
  const material = new T.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    blending: T.NoBlending,
    toneMapped: true,
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

      vec3 viewPosition( vec2 uv, float depth ) {
        vec4 p = inverseProjection * vec4( uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0 );
        return p.xyz / p.w;
      }

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

      float contactShading( float depth ) {
        if (depth >= .9999999) return 1.0;
        vec3 p = viewPosition(vUv,depth);
        vec3 n = normalize(cross(dFdx(p),dFdy(p)));
        if (dot(n,-p) < 0.0) n = -n;

        // The radius remains 1.15 physical metres. At an overview distance the
        // effect naturally fades to subpixels rather than making dark outlines.
        float radius = 1.15;
        float pixelRadius = min(18.0, radius * projectionScale * resolution.y * .5 / max(.1,-p.z));
        if (pixelRadius < 1.0) return 1.0;
        float visible = smoothstep(1.0,2.5,pixelRadius);
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
        // This is a small contact correction, capped at 18%, not a broad
        // artificial shadow. Sunlight still supplies the principal modeling.
        return 1.0 - min(.18,occlusion * .18) * visible;
      }

      void main() {
        vec4 original = texture2D(tColor,vUv);
        float depth = texture2D(tDepth,vUv).r;
        gl_FragColor = vec4(sceneColor(vUv) * contactShading(depth),original.a);
        // Offscreen rendering in r160 is linear and skips tone mapping. Apply
        // the renderer's ACES / exposure once, here, before its output transfer.
        if (depth < .9999999 || toneBackground > .5) {
          #include <tonemapping_fragment>
        }
        #include <colorspace_fragment>
      }
    `
  });
  const geometry = new T.PlaneGeometry(2, 2);
  const quad = new T.Mesh(geometry, material);
  quad.frustumCulled = false;
  const postScene = new T.Scene();
  postScene.add(quad);
  const postCamera = new T.Camera();
  const viewport = new T.Vector4(), scissor = new T.Vector4();

  function resize(w, h) {
    if (disposed) return;
    const pixelRatio = renderer.getPixelRatio();
    const width = Math.max(1, Math.round(w * pixelRatio)), height = Math.max(1, Math.round(h * pixelRatio));
    if (target.width !== width || target.height !== height) target.setSize(width, height);
    uniforms.resolution.value.set(width, height);
  }
  function render() {
    if (disposed) return;
    // Let any future immersive renderer use its own XR framebuffer and cameras.
    if (renderer.xr && renderer.xr.isPresenting) { renderer.render(scene, camera); return; }
    renderer.getDrawingBufferSize(drawingSize);
    if (target.width !== drawingSize.x || target.height !== drawingSize.y) {
      target.setSize(Math.max(1,drawingSize.x),Math.max(1,drawingSize.y));
      uniforms.resolution.value.copy(drawingSize);
    }
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
      renderer.setRenderTarget(previousTarget);
      renderer.render(postScene, postCamera);
    } finally {
      renderer.setRenderTarget(previousTarget);
      renderer.autoClear = autoClear;
      renderer.setViewport(viewport);
      renderer.setScissor(scissor);
      renderer.setScissorTest(scissorTest);
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    target.depthTexture.dispose(); target.dispose();
    geometry.dispose(); material.dispose();
  }
  return { render, resize, dispose };
}
