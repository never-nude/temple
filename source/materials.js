function createTempleMaterials(T, renderer) {
  const textures = [];
  const resources = new Set();
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const clamp = (n, lo = 0, hi = 255) => Math.max(lo, Math.min(hi, n));
  const smooth = t => t * t * (3 - 2 * t);
  function rng(seed) {
    return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  }
  // Wrapped value-noise grids avoid the visible seams of random-pixel textures.
  function noiseGrid(size, seed) {
    const random = rng(seed), values = new Float32Array(size * size);
    for (let i = 0; i < values.length; i++) values[i] = random();
    return (u, v) => {
      const x = ((u % 1 + 1) % 1) * size, y = ((v % 1 + 1) % 1) * size;
      const ix = Math.floor(x), iy = Math.floor(y), a = smooth(x - ix), b = smooth(y - iy);
      const x1 = (ix + 1) % size, y1 = (iy + 1) % size;
      const p = values[iy * size + ix] * (1 - a) + values[iy * size + x1] * a;
      const q = values[y1 * size + ix] * (1 - a) + values[y1 * size + x1] * a;
      return p * (1 - b) + q * b;
    };
  }
  const broadNoise = noiseGrid(5, 20941), cloudNoise = noiseGrid(17, 8271);
  const grainNoise = noiseGrid(67, 92941), fineNoise = noiseGrid(211, 44272);
  const randomNoise = noiseGrid(503, 63827);
  function stoneField(u, v) {
    const broad = broadNoise(u, v), cloud = cloudNoise(u, v), grain = grainNoise(u, v);
    const fine = fineNoise(u, v), fleck = randomNoise(u, v);
    const vein = Math.pow(Math.max(0, 1 - Math.abs(cloud * 2 - 1) * 16), 3);
    const fossil = Math.pow(Math.max(0, (grain - .72) / .28), 3);
    const pore = Math.pow(Math.max(0, (fleck - .77) / .23), 3);
    const variation = (broad - .5) * 12 + (cloud - .5) * 9 + (grain - .5) * 7 + (fine - .5) * 5;
    return { r: 211 + variation - vein * 9 - fossil * 13 - pore * 24,
      g: 199 + variation - vein * 9 - fossil * 17 - pore * 25,
      b: 176 + variation - vein * 6 - fossil * 15 - pore * 23,
      h: .58 + (grain - .5) * .1 + (fine - .5) * .08 - pore * .17 - fossil * .035,
      rough: .86 + (grain - .5) * .13 + pore * .11 };
  }
  function canvas(size) {
    const c = document.createElement('canvas'); c.width = c.height = size; return c;
  }
  function texture(c, color = false) {
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = anisotropy;
    t.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace;
    textures.push(t); return t;
  }
  function surface(size, painter) {
    const c = canvas(size), h = canvas(size), r = canvas(size);
    const cq = c.getContext('2d'), hq = h.getContext('2d'), rq = r.getContext('2d');
    const ci = cq.createImageData(size, size), hi = hq.createImageData(size, size), ri = rq.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const p = painter(x / size, y / size, x, y), i = (y * size + x) * 4;
      ci.data[i] = clamp(p.r); ci.data[i + 1] = clamp(p.g); ci.data[i + 2] = clamp(p.b); ci.data[i + 3] = 255;
      hi.data[i] = hi.data[i + 1] = hi.data[i + 2] = clamp(p.h * 255); hi.data[i + 3] = 255;
      ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = clamp(p.rough * 255); ri.data[i + 3] = 255;
    }
    cq.putImageData(ci, 0, 0); hq.putImageData(hi, 0, 0); rq.putImageData(ri, 0, 0);
    return { color: texture(c, true), height: texture(h), roughness: texture(r) };
  }
  const stone = surface(512, stoneField);

  // The face is lightly dressed; a narrow smooth margin surrounds the boss.
  // Staggered, unequal courses and small corner losses keep this from reading
  // as a brick-grid overlay. One tile represents 10.4 m across, 4.8 m high.
  const courseRows = 4, masonryRandom = rng(602734), courseEdges = [];
  for (let row = 0; row < courseRows; row++) {
    const lengths = Array.from({ length: 5 }, () => .15 + masonryRandom() * .1);
    const total = lengths.reduce((a, b) => a + b, 0), edges = [0];
    for (const length of lengths) edges.push(edges[edges.length - 1] + length / total);
    courseEdges.push({ edges, offset: row % 2 ? .107 : .013, shades: Array.from({ length: 5 }, () => masonryRandom()) });
  }
  const masonrySurface = surface(1024, (u, v) => {
    const p = stoneField(u * 2, v * 2), row = Math.min(courseRows - 1, Math.floor(v * courseRows));
    const course = courseEdges[row], x = (u + course.offset) % 1, localY = (v * courseRows) % 1;
    let block = 0; while (block < course.edges.length - 2 && x > course.edges[block + 1]) block++;
    const left = x - course.edges[block], right = course.edges[block + 1] - x;
    const edgeMetres = Math.min(left * 10.4, right * 10.4, localY * 1.2, (1 - localY) * 1.2);
    const shade = (course.shades[block] - .5) * 15;
    const grain = grainNoise(u * 3, v * 3);
    // Fine joints, smoother drafted bands and a shallow irregular central boss.
    const joint = 1 - smooth(clamp((edgeMetres - .009) / .018, 0, 1));
    const margin = 1 - smooth(clamp((edgeMetres - .075) / .032, 0, 1));
    const chip = edgeMetres < .075 && randomNoise(u * 2, v * 2) > .86 ? .1 : 0;
    p.r += shade + margin * 4 - joint * 57; p.g += shade + margin * 4 - joint * 55; p.b += shade + margin * 4 - joint * 46;
    p.h = joint > .1 ? .24 + (1 - joint) * .2 : .61 - margin * .105 + (grain - .5) * (margin ? .018 : .04) - chip;
    p.rough = clamp(p.rough - margin * .06 + joint * .18, .55, 1);
    return p;
  });

  // Limestone flags: varied warm slabs, shallow irregular seams and worn edges.
  const pavingRandom = rng(792617), pavingRows = [];
  for (let row = 0; row < 9; row++) {
    const lengths = Array.from({ length: 8 }, () => .09 + pavingRandom() * .07);
    const total = lengths.reduce((a, b) => a + b, 0), edges = [0];
    lengths.forEach(length => edges.push(edges[edges.length - 1] + length / total));
    pavingRows.push({ edges, offset: (row % 2) * .063, shades: Array.from({ length: 8 }, () => pavingRandom()) });
  }
  const pavingSurface = surface(1024, (u, v) => {
    const p = stoneField(u * 3, v * 3), row = Math.min(8, Math.floor(v * 9)), c = pavingRows[row];
    const x = (u + c.offset) % 1, localY = (v * 9) % 1;
    let block = 0; while (block < c.edges.length - 2 && x > c.edges[block + 1]) block++;
    const e = Math.min((x - c.edges[block]) * 13.2, (c.edges[block + 1] - x) * 13.2, localY * 1.467, (1 - localY) * 1.467);
    const joint = 1 - smooth(clamp((e - .013) / .025, 0, 1));
    const bevel = 1 - smooth(clamp((e - .035) / .04, 0, 1));
    const shade = (c.shades[block] - .5) * 22, dirt = broadNoise(u * 2, v * 2) * joint;
    p.r += shade - joint * 49 - dirt * 9; p.g += shade - joint * 46 - dirt * 9; p.b += shade - joint * 38 - dirt * 7;
    p.h = .6 - joint * .32 - bevel * .035 + (fineNoise(u * 3, v * 3) - .5) * .05;
    p.rough = .84 + joint * .15 + (grainNoise(u, v) - .5) * .12;
    return p;
  });
  // Interpretive opus-sectile panels use a Roman-foot module (approximately
  // 0.296 m). The cream field predominates; red and dark stone form alternating
  // diamonds, triangular corners and a restrained square border.
  const mosaicSurface = surface(512, (u, v) => {
    const p = stoneField(u * 3, v * 3), mx = Math.floor(u * 8), my = Math.floor(v * 8);
    const x = (u * 8) % 1, y = (v * 8) % 1, dx = Math.abs(x - .5), dy = Math.abs(y - .5);
    const parity = (mx + my) % 2, edge = Math.min(x, 1 - x, y, 1 - y);
    const diamondDistance = Math.abs(dx + dy - .34) / Math.SQRT2;
    const borderDistance = Math.abs(edge - .085);
    const diamond = dx + dy < .34, corner = dx + dy > .85;
    const border = edge > .052 && edge < .085;
    let base = [218, 208, 184];
    if (diamond) base = parity ? [137, 87, 73] : [67, 70, 65];
    if (corner) base = parity ? [67, 70, 65] : [137, 87, 73];
    if (border) base = [112, 108, 91];
    const stoneVariation = (cloudNoise(u * 3, v * 3) - .5) * 11 + (fineNoise(u, v) - .5) * 5;
    const jointDistance = Math.min(edge, diamondDistance, borderDistance);
    const seam = 1 - smooth(clamp((jointDistance - .003) / .005, 0, 1));
    p.r = base[0] + stoneVariation - seam * 21;
    p.g = base[1] + stoneVariation - seam * 20;
    p.b = base[2] + stoneVariation - seam * 17;
    p.h = .57 - seam * .12 + (fineNoise(u, v) - .5) * .025;
    p.rough = .72 + grainNoise(u, v) * .1 + seam * .13;
    return p;
  });
  const woodSurface = surface(512, (u, v) => {
    const grain = Math.sin((u * 124 + cloudNoise(u, v) * 2.8 + Math.sin(v * Math.PI * 2) * .3) * Math.PI * 2);
    const fiber = Math.sin((u * 244 + grainNoise(u, v) * 1.4) * Math.PI * 2);
    const plank = ((u * 6) % 1), seam = Math.exp(-Math.min(plank, 1 - plank) * 130);
    const knots = Math.sin(Math.hypot((u - .39) * 8, (v - .56) * 2) * 55) * Math.exp(-Math.hypot((u - .39) * 8, (v - .56) * 2) * 5);
    const variation = (cloudNoise(u, v) - .5) * 14 + grain * 4 + fiber * 2 + knots * 14 - seam * 28;
    return { r: 119 + variation, g: 85 + variation * .84, b: 53 + variation * .55,
      h: .55 + grain * .028 + fiber * .012 - seam * .22 + knots * .04,
      rough: .78 + fineNoise(u, v) * .16 };
  });
  const roofSurface = surface(512, (u, v) => {
    const row = Math.floor(v * 10), tx = ((u * 8 + (row % 2) * .5) % 1), ty = (v * 10) % 1;
    const arc = Math.sin(tx * Math.PI), join = Math.exp(-Math.min(tx, 1 - tx) * 90);
    const lip = Math.exp(-ty * 65), shade = (cloudNoise(u * 2, v * 2) - .5) * 29;
    const grit = (fineNoise(u, v) - .5) * 11, wear = Math.max(0, grainNoise(u, v) - .64) * 21;
    return { r: 169 + shade + grit - join * 30 - lip * 19 + wear,
      g: 113 + shade * .8 + grit - join * 29 - lip * 17 + wear,
      b: 76 + shade * .6 + grit * .7 - join * 21 - lip * 12 + wear,
      h: .35 + arc * .32 - join * .12 + lip * .11 + grit * .001,
      rough: .86 + fineNoise(u, v) * .12 };
  });
  const fabricSurface = surface(512, (u, v, x, y) => {
    const warp = Math.sin(x * Math.PI), weft = Math.cos(y * Math.PI);
    const fold = Math.sin(u * Math.PI * 8) * 2.8, fiber = (randomNoise(u, v) - .5) * 4;
    const weave = ((x + Math.floor(y / 2)) % 4 < 2 ? 1 : -1) * 1.7;
    return { r: 88 + fold + fiber + weave, g: 39 + fold * .7 + fiber * .5, b: 95 + fold + fiber + weave,
      h: .5 + warp * .04 + weft * .04 + weave * .012,
      rough: .79 + warp * .025 + weft * .025 };
  });
  const metalSurface = surface(256, (u, v) => {
    const scratch = Math.pow(Math.max(0, Math.sin((v * 153 + cloudNoise(u, v) * .09) * Math.PI * 2)), 30) * grainNoise(u, v);
    const hammer = grainNoise(u, v), variation = (hammer - .5) * 9 - scratch * 5;
    return { r: 249 + variation, g: 248 + variation, b: 243 + variation,
      h: .5 + (hammer - .5) * .055 - scratch * .11,
      rough: .78 + hammer * .14 + scratch * .08 };
  });
  const bronzeCanvas = canvas(256), bronzeContext = bronzeCanvas.getContext('2d');
  const bronzeImage = bronzeContext.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = x / 256, v = y / 256, i = (y * 256 + x) * 4;
    const patina = smooth(clamp((broadNoise(u, v) * .6 + cloudNoise(u, v) * .4 - .57) / .18, 0, 1)) * .8;
    const grain = (fineNoise(u, v) - .5) * 10;
    bronzeImage.data[i] = 148 - patina * 68 + grain;
    bronzeImage.data[i + 1] = 112 - patina * 4 + grain;
    bronzeImage.data[i + 2] = 67 + patina * 24 + grain;
    bronzeImage.data[i + 3] = 255;
  }
  bronzeContext.putImageData(bronzeImage, 0, 0);
  const bronzeSurface = { ...metalSurface, color: texture(bronzeCanvas, true) };

  // Use world coordinates instead of box UVs. A 300 m wall and a small stair
  // therefore show the same stone grain scale; instance transforms are respected.
  // StandardMaterial still supplies physically based BRDF, lights and shadows.
  function worldTexture(material, horizontal, vertical = horizontal) {
    material.onBeforeCompile = shader => {
      const declarations = 'varying vec3 vTempleWorldPosition;\nvarying vec3 vTempleWorldNormal;\n';
      shader.vertexShader = declarations + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvTempleWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );');
      shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        vec4 templeWorld = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          templeWorld = instanceMatrix * templeWorld;
        #endif
        vTempleWorldPosition = ( modelMatrix * templeWorld ).xyz;`);
      const sample = `
        vec4 templeSample( sampler2D tex, vec3 p ) {
          vec3 blend = pow( abs( normalize( vTempleWorldNormal ) ), vec3( 7.0 ) );
          blend /= max( blend.x + blend.y + blend.z, 0.0001 );
          vec2 uvX = p.zy * vec2( ${(1 / horizontal).toFixed(8)}, ${(1 / vertical).toFixed(8)} );
          vec2 uvY = p.xz * ${((1 / horizontal)).toFixed(8)};
          vec2 uvZ = p.xy * vec2( ${(1 / horizontal).toFixed(8)}, ${(1 / vertical).toFixed(8)} );
          return texture2D( tex, uvX ) * blend.x + texture2D( tex, uvY ) * blend.y + texture2D( tex, uvZ ) * blend.z;
        }
      `;
      shader.fragmentShader = declarations + sample + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec4 sampledDiffuseColor = templeSample( map, vTempleWorldPosition );
          diffuseColor *= sampledDiffuseColor;
        #endif
      `);
      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = roughness;
        #ifdef USE_ROUGHNESSMAP
          roughnessFactor *= templeSample( roughnessMap, vTempleWorldPosition ).g;
        #endif
      `);
      // Screen-space height derivatives are derived from the same world-space
      // samples as the color. This avoids stretched UV bumps on long walls.
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
        #ifdef USE_BUMPMAP
          float templeHeight = templeSample( bumpMap, vTempleWorldPosition ).r;
          normal = perturbNormalArb( -vViewPosition, normal,
            vec2( dFdx( templeHeight ), dFdy( templeHeight ) ) * bumpScale, faceDirection );
        #endif
      `);
    };
    material.customProgramCacheKey = () => `temple-world-material-v1-${horizontal}-${vertical}`;
    material.userData.worldTextureScale = [horizontal, vertical];
    return material;
  }
  function make(s, options, scale, vertical = scale) {
    const m = new T.MeshStandardMaterial({ map: s.color, bumpMap: s.height, roughnessMap: s.roughness,
      color: 0xffffff, roughness: 1, bumpScale: .018, metalness: 0, envMapIntensity: .65, ...options });
    resources.add(m); return worldTexture(m, scale, vertical);
  }
  const mats = {
    stone: make(stone, {}, 2.8),
    stoneLight: make(stone, { color: 0xf8f4e9, bumpScale: .012 }, 2.8),
    stoneDark: make(stone, { color: 0xc4b49a, bumpScale: .025 }, 2.8),
    terrain: make(stone, { color: 0x9a8868, bumpScale: .12, envMapIntensity: .45 }, 8),
    pavement: make(pavingSurface, { bumpScale: .065 }, 13.2),
    mosaic: make(mosaicSurface, { bumpScale: .009, envMapIntensity: .85 }, .296 * 8),
    gold: make(metalSurface, { color: 0xe8bd5b, metalness: 1, roughness: .33, bumpScale: .0015, envMapIntensity: 1.55 }, .65),
    bronze: make(bronzeSurface, { color: 0xffffff, metalness: .86, roughness: .5, bumpScale: .003, envMapIntensity: 1.2 }, .85),
    roof: make(roofSurface, { bumpScale: .052, envMapIntensity: .55 }, 3.6, 4.5),
    veil: make(fabricSurface, { side: T.DoubleSide, bumpScale: .0025, envMapIntensity: .35 }, .7),
    dark: make(stone, { color: 0x71614e, bumpScale: .025, envMapIntensity: .3 }, 2.8),
    wood: make(woodSurface, { bumpScale: .012, envMapIntensity: .4 }, 1.5, 5.6)
  };
  const masonry = make(masonrySurface, { bumpScale: .12 }, 10.4, 4.8);
  const paving = mats.pavement;
  let disposed = false;
  function dispose() {
    if (disposed) return; disposed = true;
    for (const material of resources) material.dispose();
    for (const t of textures) t.dispose();
  }
  return { mats, masonry, paving, textures, dispose };
}
