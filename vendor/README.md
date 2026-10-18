# Vendored Three.js files

The application renderer remains Three.js **0.160.1** (`three.min.js`, revision 160), the same version previously loaded from the CDN. `RGBELoader.js` is its existing 0.160.1 addon. The renderer and loader use the MIT license in [THREE-LICENSE.txt](THREE-LICENSE.txt).

`OrbitControls.js` contains **Three.js 0.182.0 (r182)** `examples/jsm/controls/OrbitControls.js` and `src/extras/Controls.js`, copied from the installed Atrium website dependency. These are the controls used by Atrium's sculpture pages. The renderer has not been upgraded.

Upstream sources:

- [Three.js 0.160.1 UMD renderer](https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.min.js) — SHA-256 `170c6789f43217c96b3170f4b42fafe135de7f7cd48497a4218f9757ee1d49fa`; unchanged from the previously referenced CDN file.

- [OrbitControls, tag r182](https://github.com/mrdoob/three.js/blob/r182/examples/jsm/controls/OrbitControls.js) — SHA-256 `c5d5a92da069a9316344b327772486d6c1b78982ad4f2a83b9832e0a47219edd`
- [Controls, tag r182](https://github.com/mrdoob/three.js/blob/r182/src/extras/Controls.js) — SHA-256 `8cfc4e837b99a3edd5a939861dadbdc15dc2688690a79818f4e1a02561a6277d`

The source copy came from `node_modules/three` under the Atrium website checkout, whose package declares version 0.182.0. Only module packaging changes were made:

1. Both files are enclosed in one `(function (THREE) { … })(window.THREE)` closure.
2. ES module imports are replaced with destructuring of `EventDispatcher`, `MOUSE`, `TOUCH`, `Quaternion`, `Spherical`, `Vector2`, `Vector3`, `Plane`, `Ray` and `MathUtils` from the existing renderer namespace.
3. The r182 `Controls` base class is included locally, since r160 does not export it. Its imported `warn` helper is a local forwarding function to `console.warn`.
4. The ES module exports are removed; the final line exposes `THREE.OrbitControls`.
5. A provenance and full upstream MIT license header is added, including the addon sources’ 2010–2025 copyright notice. The MIT terms match the existing Three.js license.

The `Controls` and `OrbitControls` class bodies, including all input/event code, remain byte-for-byte unchanged. All shared math methods, camera properties, constants and EventDispatcher methods they use exist in Three.js 0.160.1. DOM pointer events, capture, wheel events, `getRootNode()` and `ownerDocument` are browser APIs rather than renderer-version dependencies. The control remains the canonical r182 implementation; site-specific limits, damping, presets and lifecycle integration belong in the application.
