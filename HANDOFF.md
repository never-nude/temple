# Second Temple — desktop handoff

Updated 2026-10-17. This repository contains the complete current website and model. It can be cloned onto a new computer without any laptop-specific folders, secrets or dependencies.

## Start here

- Repository: https://github.com/never-nude/temple
- Live model: https://never-nude.github.io/temple/
- Start from `main` for the published model. This release retains the crafted sanctuary and photographed materials, and uses the same OrbitControls implementation as Atrium for navigation.
- Read this file and `README.md` before continuing. This is a separate Temple project; do not work in the unrelated Sniffari repository.

Run from the repository folder:

```sh
python3 build.py
python3 -m http.server 5204
```

Open http://localhost:5204/. The renderer, controls, HDR loader, lighting and stone texture maps are included locally; there are no external runtime requests. There is no package installation, backend or API key requirement.

## User intent and order

Build a fully interactive, highly detailed and convincing architectural model of the Herodian Second Temple in Jerusalem. The user strongly rejected the early blocky and game-like appearance, and explicitly allowed imagined details when they make the architecture feel real. Prioritize the sanctuary itself over adding detail to the perimeter colonnades. Preserve that priority while clearly distinguishing historical evidence from creative finish work.

The requested sequence is **model → publish live → AR**. The model is published. The user subsequently chose **more architectural realism** for the current construction pass; continue model work before starting **true-scale AR for iPhone/iPad**. VR can follow later. Do not replace the detailed model with a simplistic AR proxy. Earlier experimental AR exports predate the realism rebuild; regenerate any assets from the current geometry rather than depending on those experiments.

First run and inspect the current model, then continue the user's latest instructions. AR prototype files outside this repository are not part of the published model.

## Editable files

- `source/second-temple.fragment.html`: base scene geometry and materials, lighting setup, cameras, interface, landmarks and guided tour.
- `source/details/sanctuary-realism.js` and `sanctuary-carving.js`: dressed construction, four-pilaster façade, deep gilded porch, joinery, formed gold sheets, botanical ornament, stone profiles and worn steps.
- `source/details/material-realism.js`: local photographed stone maps, restrained mineral/rain variation and shallow hand-worked gold reflections.
- `source/details/daylight-setting.js` and `rendering.js`: daylight context, HDR display resolve, supported desktop multisampling and nearby contact shading.
- Other `source/details/` modules: colonnades, Antonia, southern approaches and navigation integration around the vendored OrbitControls. The build inlines all detail modules.
- `tests/navigation.cjs`: dependency-free checks using the actual vendored controller and renderer math.
- `source/page.html`: website shell, theme controls, local preference storage and source links.
- `build.py`: standard-library build that combines those files into `index.html`. Rebuild after edits; do not edit generated `index.html` alone.
- `assets/` and `vendor/`: captured CC0 lighting, local 2K Marble 01 diffuse/height/roughness maps, Three.js r160.1 renderer, RGBE loader, r182 OrbitControls and attribution/licenses.

`vendor/README.md` documents the controls copied from Atrium's Three.js r182 dependency and their wrapper for the existing r160.1 renderer. The renderer remains the same Three.js version previously served by CDN. Preserve the provenance notes, upstream links, controls license header and `vendor/THREE-LICENSE.txt`.

The live site publishes the root of `main` through GitHub Pages. Work on a `codex/` branch, commit, push and open a PR. The user has authorized publishing this project to `never-nude/temple`. Leave repository settings, Pages settings, Git configuration and secrets to the owner.

## Preserve these details

Coordinates are metres: east = +X, up = +Y, south = +Z. The sanctuary faces east; its western Holy of Holies is empty, with no Ark. Furnishings use physical dimensions. Ancient descriptions guide the main layout. Detailed finishes, botanical decoration, gold-sheet layout, surface wear, paving placement, people and landscape remain explicitly interpretive; imagined craft details are authorized. Sources are in the README and website footer. Modern photographed material references do not identify the ancient quarry or a recovered ancient surface.

The sanctuary now has four fluted pilasters, finely jointed dressed stone, deeply assembled cornices, a gold-lined porch and inner entrance, subtly bowed and seamed gold sheets, botanical carving and worn stair noses. The wider complex retains 462 refined columns, tiled colonnade roofs, timber ceilings, pleated fabric, 32 scale figures, landscape, Antonia's open courtyard/towers and the broad southern approaches with 45-metre vaulted vestibules. Preserve the 24 landmarks, 16-stop tour, cutaways, Temple façade viewpoint, Reset view, touch controls, theme independence and saved camera state.

## Validation and next checks

Release validation includes build/syntax checks, all 16 tour stops and cutaway transitions, viewpoints, lighting and theme controls, and browser layouts at 320/390 px. Check finite geometry, successful local texture/HDR loading and WebGL errors after any geometry, shader or renderer change. Inspect both wide and close views: contact shading should fade out between 30 and 55 metres so tiny course edges do not stipple distant walls. Desktop multisampling is conditional on renderer support; phones use reduced pixel density and shadow resolution. Browser phone previews do not establish actual iPhone GPU performance or native gesture feel.

Navigation now uses the actual Atrium OrbitControls implementation (Three.js r182), with damping factor 0.08, rotation speed 0.9 and zoom speed 1.35. Trackpad scroll and mouse-wheel events zoom toward the orbit target without cursor drift; trackpad click-drag and mouse left-drag orbit. Right-drag or Shift/Ctrl/Meta-left-drag pans; middle-drag zooms. Touchscreen controls are one-finger orbit and simultaneous two-finger pan/pinch. There is no device selector or custom saved device mode.

Double-click or double-tap the canvas, use Reset view, or press 0 to restore the current preset. The +/− keys and camera buttons use distance factors 0.68/1.46. Preserve preset transitions, tour integration and camera persistence when changing the controls. The shared minimum orbit radius is 0.05 metres; adaptive near clipping reaches 0.002 metres for inspection. Run `node tests/navigation.cjs` after changing controls. Native Safari and physical trackpad/iPhone checks remain separate from synthetic event regression tests.

Material credits: [Marble 01 by Rob Tuytel](https://polyhaven.com/a/marble_01) and [Dry Meadow](https://polyhaven.com/a/dry_meadow), from Poly Haven under CC0. Keep their local files and `assets/README.md` attribution when transferring or publishing the repository.

For AR, preserve metre scale through export and verify a known dimension on an actual iPhone/iPad. Distinguish full-size placement from tabletop viewing. Test sanctuary and complete-complex assets, material fidelity, HTTPS loading and memory/performance before presenting AR as complete. Continue publishing the working model throughout development.
