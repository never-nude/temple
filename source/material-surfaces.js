/* Small photographic surface finishes. Geometry supplies all architectural joints.
   The stone scan is a material proxy, not a sample from the Jerusalem Temple.
   Source files and licenses are recorded in assets/surfaces/README.md. */
function loadTempleSurfaces(T, renderer, mats, onReady) {
  const ownedTextures = new Set(), ownedMaterials = new Set();
  const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  let disposed = false;
  const root = new URL('assets/surfaces/', document.baseURI);
  const smooth = v => v * v * (3 - 2 * v);

  // Real-world projection keeps finely carved members, rotated columns and large
  // facade panels at the same grain scale. Instanced geometry is respected.
  function projected(material, horizontal, vertical = horizontal, finish = 'natural') {
    material.onBeforeCompile = shader => {
      const vars = 'varying vec3 vTempleSurfacePosition;\nvarying vec3 vTempleSurfaceNormal;\n';
      shader.vertexShader = vars + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <defaultnormal_vertex>', `#include <defaultnormal_vertex>
        vTempleSurfaceNormal = inverseTransformDirection( transformedNormal, viewMatrix );`);
      shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        vec4 surfaceWorld = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          surfaceWorld = instanceMatrix * surfaceWorld;
        #endif
        vTempleSurfacePosition = ( modelMatrix * surfaceWorld ).xyz;`);
      shader.fragmentShader = vars + `
        vec4 templeSurfaceSample( sampler2D tex, vec3 p ) {
          vec3 blend = pow( abs( normalize( vTempleSurfaceNormal ) ), vec3( 7.0 ) );
          blend /= max( blend.x + blend.y + blend.z, .0001 );
          vec2 uvX = p.zy * vec2( ${(1 / horizontal).toFixed(8)}, ${(1 / vertical).toFixed(8)} );
          vec2 uvY = p.xz * vec2( ${(1 / horizontal).toFixed(8)}, ${(1 / vertical).toFixed(8)} );
          vec2 uvZ = p.xy * vec2( ${(1 / horizontal).toFixed(8)}, ${(1 / vertical).toFixed(8)} );
          return texture2D( tex, uvX ) * blend.x + texture2D( tex, uvY ) * blend.y + texture2D( tex, uvZ ) * blend.z;
        }
      ` + shader.fragmentShader;
      const colorFinish = finish === 'white-stone' ? `
          // Scan color is normalized to the pale, finely dressed finish of the
          // reconstruction. Only photographic pores, fossil flecks and grain
          // remain; no donor masonry grid is projected onto the architecture.
          float surfaceLuma = dot( sampledDiffuseColor.rgb, vec3( .2126, .7152, .0722 ) );
          float fineGrain = clamp( ( surfaceLuma - .42 ) * .34, -.048, .038 );
          sampledDiffuseColor.rgb = vec3( .88, .872, .846 ) + fineGrain;
        ` : '';
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec4 sampledDiffuseColor = templeSurfaceSample( map, vTempleSurfacePosition );
          ${colorFinish}
          diffuseColor *= sampledDiffuseColor;
        #endif
      `);
      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = roughness;
        #ifdef USE_ROUGHNESSMAP
          float surfaceRoughness = templeSurfaceSample( roughnessMap, vTempleSurfacePosition ).g;
          ${finish === 'white-stone' ? 'surfaceRoughness = .66 + surfaceRoughness * .29;' : ''}
          roughnessFactor *= surfaceRoughness;
        #endif
      `);
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
        #ifdef USE_BUMPMAP
          float surfaceHeight = templeSurfaceSample( bumpMap, vTempleSurfacePosition ).r;
          normal = perturbNormalArb( -vViewPosition, normal,
            vec2( dFdx( surfaceHeight ), dFdy( surfaceHeight ) ) * bumpScale, faceDirection );
        #endif
      `);
    };
    material.customProgramCacheKey = () => `temple-photo-surface-v2-${horizontal}-${vertical}-${finish}`;
    material.userData.worldTextureScale = [horizontal, vertical];
    material.userData.surfaceFinish = finish;
    material.needsUpdate = true;
    return material;
  }
  function clone(source, name, options, scale, finish = 'natural') {
    const material = source.clone();
    Object.assign(material, options);
    if (options.color !== undefined) material.color = new T.Color(options.color);
    material.name = name;
    ownedMaterials.add(material);
    return projected(material, scale, scale, finish);
  }

  // These exist immediately, before image requests resolve. New sanctuary
  // geometry can safely retain these references while the fallback is visible.
  mats.stoneFine = clone(mats.stoneLight, 'Finely dressed pale Temple limestone',
    { color: 0xffffff, roughness: .81, bumpScale: .006, envMapIntensity: .62 }, .65, 'white-stone');
  mats.column = clone(mats.stoneLight, 'Smooth finely dressed limestone columns',
    { color: 0xffffff, roughness: .75, bumpScale: .0035, envMapIntensity: .68 }, .52, 'white-stone');
  mats.goldPlate = clone(mats.gold, 'Fine hammered gold plate',
    { color: 0xffd66b, metalness: 1, roughness: .255, bumpScale: .00035, envMapIntensity: 1.35 }, .085);

  function textureFrom(canvas, color = false) {
    const texture = new T.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace;
    texture.anisotropy = anisotropy;
    ownedTextures.add(texture);
    return texture;
  }
  function image(path) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load ${path}`));
      img.src = new URL(path, root).href;
    });
  }
  function prepare(img, size, crop = [0, 0, 1, 1], feather = true) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, img.width * crop[0], img.height * crop[1], img.width * crop[2], img.height * crop[3], 0, 0, size, size);
    if (!feather) return canvas;
    // Match opposite edges only within the outer six percent. The photographed
    // central grain stays intact and the crop repeats without a square seam.
    const data = ctx.getImageData(0, 0, size, size), original = new Uint8ClampedArray(data.data);
    const border = size * .06;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const wx = .5 * (1 - smooth(Math.min(1, Math.min(x, size - 1 - x) / border)));
      const wy = .5 * (1 - smooth(Math.min(1, Math.min(y, size - 1 - y) / border)));
      const a = (y * size + x) * 4, b = (y * size + size - 1 - x) * 4;
      const c = ((size - 1 - y) * size + x) * 4, d = ((size - 1 - y) * size + size - 1 - x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        data.data[a + channel] = (original[a + channel] * (1 - wx) + original[b + channel] * wx) * (1 - wy)
          + (original[c + channel] * (1 - wx) + original[d + channel] * wx) * wy;
      }
    }
    ctx.putImageData(data, 0, 0);
    return canvas;
  }
  function assign(materials, surface) {
    for (const material of materials) {
      material.map = surface.color;
      material.bumpMap = surface.height;
      material.roughnessMap = surface.roughness;
      material.needsUpdate = true;
    }
  }
  async function scan(prefix, crop, dimensions) {
    const images = await Promise.all(['diff', 'disp', 'rough'].map(suffix => image(`${prefix}_${suffix}.jpg`)));
    if (disposed) return null;
    return {
      color: textureFrom(prepare(images[0], dimensions[0], crop), true),
      height: textureFrom(prepare(images[1], dimensions[1], crop)),
      roughness: textureFrom(prepare(images[2], dimensions[2], crop))
    };
  }

  // A subtle microscopic finish catches broad gold reflections without turning
  // sheets into coarse mottled bronze. This is illustrative handwork, not a scan.
  const goldHeight = document.createElement('canvas'); goldHeight.width = goldHeight.height = 128;
  const goldRough = document.createElement('canvas'); goldRough.width = goldRough.height = 128;
  const gh = goldHeight.getContext('2d'), gr = goldRough.getContext('2d');
  const hi = gh.createImageData(128, 128), ri = gr.createImageData(128, 128);
  let seed = 47391;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const hammer = new Float32Array(16 * 16); for (let i = 0; i < hammer.length; i++) hammer[i] = random();
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const u = x / 8, v = y / 8, ix = Math.floor(u), iy = Math.floor(v), a = smooth(u % 1), b = smooth(v % 1);
    const p = hammer[iy * 16 + ix] * (1 - a) + hammer[iy * 16 + (ix + 1) % 16] * a;
    const q = hammer[((iy + 1) % 16) * 16 + ix] * (1 - a) + hammer[((iy + 1) % 16) * 16 + (ix + 1) % 16] * a;
    const field = p * (1 - b) + q * b, i = (y * 128 + x) * 4;
    const h = 128 + (field - .5) * 42 + (random() - .5) * 3;
    const r = 202 + (field - .5) * 20;
    hi.data[i] = hi.data[i + 1] = hi.data[i + 2] = h; hi.data[i + 3] = 255;
    ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = r; ri.data[i + 3] = 255;
  }
  gh.putImageData(hi, 0, 0); gr.putImageData(ri, 0, 0);
  mats.goldPlate.map = null;
  mats.goldPlate.bumpMap = textureFrom(goldHeight);
  mats.goldPlate.roughnessMap = textureFrom(goldRough);
  mats.goldPlate.needsUpdate = true;

  const pending = [
    scan('marble_01', [.38, .25, .24, .16], [512, 512, 256]).then(surface => {
      if (!surface) return;
      assign([mats.stoneFine, mats.column], surface);
      // General dressed stone retains a warmer, rougher finish than the Temple.
      for (const [material, color, roughness, bump] of [[mats.stone, 0xe6e0d2, .94, .014], [mats.stoneLight, 0xf6f3e9, .88, .010]]) {
        material.color.setHex(color); material.roughness = roughness; material.bumpScale = bump;
        projected(material, .8, .8, 'white-stone');
        assign([material], surface);
      }
      if (onReady) onReady();
    }),
    scan('wooden_planks', [0, 0, 1, 1], [512, 256, 128]).then(surface => {
      if (!surface) return;
      mats.wood.color.setHex(0xd4b28b); mats.wood.roughness = .86; mats.wood.bumpScale = .008;
      projected(mats.wood, 2, 2); assign([mats.wood], surface);
      if (onReady) onReady();
    })
  ];
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const texture of ownedTextures) texture.dispose();
    for (const material of ownedMaterials) material.dispose();
  }
  dispose.ready = Promise.allSettled(pending);
  dispose.materials = { stoneFine: mats.stoneFine, column: mats.column, goldPlate: mats.goldPlate };
  // All mip levels included: 512/512/256 stone + 512/256/128 wood + 2*128 gold.
  dispose.estimatedTextureBytes = Math.ceil((512*512*3 + 256*256*2 + 128*128*3) * 4 * 4 / 3);
  return dispose;
}
