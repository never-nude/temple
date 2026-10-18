/* Photographed, physically scaled mineral detail for dressed sanctuary stone.
   The CC0 source is Poly Haven's Marble 01 by Rob Tuytel. This is a material
   reference, not a sampled archaeological surface or identification of a quarry.
   The original image is shipped unchanged. A single slab interior is sampled
   in the shader so the source photograph's tile joints never cross a carving. */
function refineTempleMaterials(T, ctx) {
  const { mats, renderer, root } = ctx;
  const textures = [], pending = [];
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const diagnostics = {
    source: 'Poly Haven Marble 01 / Rob Tuytel / CC0',
    textureResolution: 2048,
    sampledSlabMetres: [.3955, .2490],
    textureBytes: 1782090,
    mineralCloudMetres: [2.27, 3.92],
    rainTraceMaximumDarkening: .03,
    goldWaveMaximumSlopeDegrees: .86,
    surfaceTreatment: 'Interpretive honed stone and hand-worked gilding',
    loaded: 0,
    failed: [],
    ready: false
  };
  let disposed = false;
  const report = () => {
    if (!disposed && root) root.dataset.materialRealism = JSON.stringify(diagnostics);
  };
  // Keep usable local placeholder images while the three files load. Texture
  // objects are assigned synchronously, before architectural clones are made.
  function load(name, fallback, color) {
    const texture = new T.Texture(fallback.image);
    texture.wrapS = texture.wrapT = T.ClampToEdgeWrapping;
    texture.minFilter = T.LinearMipmapLinearFilter;
    texture.magFilter = T.LinearFilter;
    texture.anisotropy = anisotropy;
    texture.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace;
    texture.needsUpdate = true;
    textures.push(texture);
    pending.push(new Promise(resolve => {
      new T.ImageLoader().load(new URL(`assets/textures/${name}`, document.baseURI).href,
        image => {
          if (!disposed) {
            texture.image = image;
            texture.needsUpdate = true;
            diagnostics.loaded++;
            report();
          }
          resolve(true);
        }, undefined, () => {
          diagnostics.failed.push(name);
          report();
          resolve(false);
        });
    }));
    return texture;
  }
  const color = load('marble_01_diff_2k.jpg', mats.stone.map, true);
  const height = load('marble_01_disp_2k.jpg', mats.stone.bumpMap, false);
  const roughness = load('marble_01_rough_2k.jpg', mats.stone.roughnessMap, false);

  // Continuous world-space variation supplies larger mineral structure than
  // the photographed sub-metre detail. It is deliberately low contrast: the
  // precinct is a maintained working building rather than an excavated ruin.
  const finishNoise = `
    float templeFinishHash( vec3 p ) {
      p = fract( p * .1031 );
      p += dot( p, p.yzx + 33.33 );
      return fract( ( p.x + p.y ) * p.z );
    }
    float templeFinishNoise( vec3 p ) {
      vec3 i = floor( p ), f = fract( p );
      f = f * f * ( 3.0 - 2.0 * f );
      float z0 = mix(
        mix( templeFinishHash( i ), templeFinishHash( i + vec3( 1., 0., 0. ) ), f.x ),
        mix( templeFinishHash( i + vec3( 0., 1., 0. ) ),
             templeFinishHash( i + vec3( 1., 1., 0. ) ), f.x ), f.y );
      float z1 = mix(
        mix( templeFinishHash( i + vec3( 0., 0., 1. ) ),
             templeFinishHash( i + vec3( 1., 0., 1. ) ), f.x ),
        mix( templeFinishHash( i + vec3( 0., 1., 1. ) ),
             templeFinishHash( i + vec3( 1., 1., 1. ) ), f.x ), f.y );
      return mix( z0, z1, f.z );
    }
  `;

  function photographedStone(material, colorHex, surfaceRoughness, environmentIntensity) {
    material.map = color;
    material.bumpMap = height;
    material.roughnessMap = roughness;
    material.color.setHex(colorHex);
    material.roughness = surfaceRoughness;
    material.bumpScale = .0024;
    material.metalness = 0;
    material.envMapIntensity = environmentIntensity;
    material.userData.templeEnvironmentIntensity = environmentIntensity;
    material.userData.worldTextureScale = [.3955, .2490];
    material.userData.photographedSurface = 'polyhaven:marble_01';
    material.onBeforeCompile = shader => {
      const declarations = 'varying vec3 vTempleWorldPosition;\nvarying vec3 vTempleWorldNormal;\n';
      shader.vertexShader = declarations + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <defaultnormal_vertex>', `#include <defaultnormal_vertex>
        vTempleWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );`);
      shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        vec4 templeWorld = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          templeWorld = instanceMatrix * templeWorld;
        #endif
        vTempleWorldPosition = ( modelMatrix * templeWorld ).xyz;`);
      shader.fragmentShader = declarations + finishNoise + `
        vec2 templeStoneFinish( vec3 p ) {
          float broad = templeFinishNoise( p * .255 + vec3( 11.7, 31.2, 7.4 ) );
          float mineral = templeFinishNoise( p * .440 + vec3( -4.8, 17.1, 29.6 ) );
          float cloud = broad * .70 + mineral * .30 - .50;
          float vertical = pow( 1.0 - abs( normalize( vTempleWorldNormal ).y ), 2.0 );
          float footprint = max( length( dFdx( p ) ), length( dFdy( p ) ) );
          float fineVisibility = 1.0 - smoothstep( .018, .075, footprint );
          // Sparse, narrow, gravity-aligned traces; they do not run over roofs.
          float trace = templeFinishNoise( p * vec3( 13.7, .32, 13.7 )
            + vec3( 43.3, 5.7, 19.1 ) );
          float rain = smoothstep( .66, .84, trace )
            * smoothstep( .10, .70, broad ) * vertical * fineVisibility;
          return vec2( cloud, rain );
        }
        // Mirror a 0.3955 x 0.249 m interior of the original 1.5 m photograph.
        // Reflection keeps value continuity without introducing artificial grout.
        vec2 templeSlabUV( vec2 p ) {
          vec2 mirrored = 1.0 - abs( mod( p, 2.0 ) - 1.0 );
          return vec2( 0.361328125, 0.814453125 )
            + mirrored * vec2( 0.263671875, 0.166015625 );
        }
        vec4 templeSample( sampler2D tex, vec3 p ) {
          vec3 blend = pow( abs( normalize( vTempleWorldNormal ) ), vec3( 7.0 ) );
          blend /= max( blend.x + blend.y + blend.z, 0.0001 );
          vec2 axisScale = vec2( 2.528445, 4.016064 );
          vec2 uvX = templeSlabUV( p.zy * axisScale );
          vec2 uvY = templeSlabUV( p.xz * axisScale );
          vec2 uvZ = templeSlabUV( p.xy * axisScale );
          return texture2D( tex, uvX ) * blend.x
            + texture2D( tex, uvY ) * blend.y
            + texture2D( tex, uvZ ) * blend.z;
        }
      ` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        vec2 templeFinish = templeStoneFinish( vTempleWorldPosition );
        float templeScannedHeight = .72;
        #ifdef USE_BUMPMAP
          templeScannedHeight = templeSample( bumpMap, vTempleWorldPosition ).r;
        #endif
        float templePores = 1.0 - smoothstep( .53, .67, templeScannedHeight );
        #ifdef USE_MAP
          vec4 sampledDiffuseColor = templeSample( map, vTempleWorldPosition );
          // A restrained warm-white finish: retain photographed mineral detail
          // while calibrating this cream reference to clean pale dressed stone.
          // Values are linear albedo; they remain below a white paint reference.
          sampledDiffuseColor.rgb = clamp( vec3( .510, .500, .470 ) *
            ( vec3( 1.0 ) + ( sampledDiffuseColor.rgb /
              vec3( .42954, .31538, .17553 ) - vec3( 1.0 ) ) * .52 ),
            vec3( .035 ), vec3( .78 ) );
          sampledDiffuseColor.rgb *= vec3( 1.0 )
            + templeFinish.x * vec3( .052, .043, .027 );
          sampledDiffuseColor.rgb *= vec3( 1.0 )
            - templeFinish.y * vec3( .029, .030, .031 );
          sampledDiffuseColor.rgb *= 1.0 - templePores * .007;
          diffuseColor *= sampledDiffuseColor;
        #endif
      `);
      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = roughness;
        #ifdef USE_ROUGHNESSMAP
          roughnessFactor *= mix( .86, 1.12,
            templeSample( roughnessMap, vTempleWorldPosition ).g );
        #endif
        roughnessFactor = clamp( roughnessFactor + templeFinish.x * .035
          + templeFinish.y * .025 + templePores * .018, .32, .82 );
      `);
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
        #ifdef USE_BUMPMAP
          normal = perturbNormalArb( -vViewPosition, normal,
            vec2( dFdx( templeScannedHeight ), dFdy( templeScannedHeight ) ) * bumpScale,
            faceDirection );
        #endif
      `);
    };
    material.customProgramCacheKey = () => 'temple-photographed-dressed-stone-v3';
    material.needsUpdate = true;
  }

  photographedStone(mats.stoneLight, 0xffffff, .44, .10);
  photographedStone(mats.stone, 0xf1eee6, .52, .10);
  photographedStone(mats.stoneDark, 0xd9d1bf, .64, .08);
  // Real gold reflects a warm spectrum rather than a dark orange diffuse tint.
  // The existing world-space hammered microtexture remains, at restrained depth.
  mats.gold.color.setRGB(.95, .73, .31, T.LinearSRGBColorSpace);
  mats.gold.roughness = .30;
  mats.gold.bumpScale = .0004;
  mats.gold.envMapIntensity = .75;
  mats.gold.userData.templeEnvironmentIntensity = .75;
  // Add hand-worked reflection variation to the existing world-space metal
  // shader. These waves are below a millimetre, distinct from the larger plate
  // curvature supplied by geometry. Their combined maximum tangent slope is
  // below one degree; the surface remains visibly planar at building scale.
  const originalGoldCompile = mats.gold.onBeforeCompile;
  const originalGoldCacheKey = mats.gold.customProgramCacheKey;
  mats.gold.onBeforeCompile = shader => {
    originalGoldCompile.call(mats.gold, shader);
    shader.fragmentShader = finishNoise + `
      float templeGoldWave( vec3 p ) {
        float footprint = max( length( dFdx( p ) ), length( dFdy( p ) ) );
        float visible = 1.0 - smoothstep( .10, .30, footprint );
        return visible * (
          .00065 * sin( ( p.x + p.z ) * 11.423973 + .6 )
          + .00045 * sin( p.y * 7.391983 + p.z * .7 + 1.7 )
          + .00015 * sin( ( p.x - p.z ) * 16.981582 + p.y * .7 ) );
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      'float templeHeight = templeSample( bumpMap, vTempleWorldPosition ).r;', `
        float templeGrain = clamp(
          templeSample( bumpMap, vTempleWorldPosition ).r - .5, -.05, .05 );
        float templeHeight = templeGrain * bumpScale
          + templeGoldWave( vTempleWorldPosition );`);
    shader.fragmentShader = shader.fragmentShader.replace(
      /vec2\(\s*dFdx\(\s*templeHeight\s*\),\s*dFdy\(\s*templeHeight\s*\)\s*\)\s*\*\s*bumpScale/g,
      'vec2( dFdx( templeHeight ), dFdy( templeHeight ) )');
    shader.fragmentShader = shader.fragmentShader.replace('#include <metalnessmap_fragment>', `
      roughnessFactor = clamp( roughnessFactor + .014 * (
        templeFinishNoise( vTempleWorldPosition * vec3( 2.3, 3.1, 2.7 )
          + vec3( 8.1, 23.7, 4.9 ) ) - .5 ), .18, .48 );
      #include <metalnessmap_fragment>
    `);
  };
  mats.gold.customProgramCacheKey = () => `${originalGoldCacheKey.call(mats.gold)}-hand-worked-v2`;
  mats.gold.needsUpdate = true;
  report();

  const ready = Promise.all(pending).then(() => {
    diagnostics.ready = true;
    report();
    return diagnostics;
  });
  return {
    textures,
    diagnostics,
    ready,
    dispose() {
      if (disposed) return;
      disposed = true;
      textures.forEach(texture => texture.dispose());
    }
  };
}
