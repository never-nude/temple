# Second Temple — desktop handoff

Updated 2026-10-17. This repository contains the complete current website and model. It can be cloned onto a new computer without any laptop-specific folders, secrets or dependencies.

## Start here

- Repository: https://github.com/never-nude/temple
- Live model: https://never-nude.github.io/temple/
- Start from `main` for the published model. This release extends the construction pass with a crafted sanctuary, photographed materials and smoother navigation.
- Read this file and `README.md` before continuing. This is a separate Temple project; do not work in the unrelated Sniffari repository.

Run from the repository folder:

```sh
python3 build.py
python3 -m http.server 5204
```

Open http://localhost:5204/. Three.js loads from a pinned CDN; the HDR lighting asset, stone texture maps and loader are included locally. There is no package installation, backend or API key requirement.

## User intent and order

Build a fully interactive, highly detailed and convincing architectural model of the Herodian Second Temple in Jerusalem. The user strongly rejected the early blocky and game-like appearance, and explicitly allowed imagined details when they make the architecture feel real. Prioritize the sanctuary itself over adding detail to the perimeter colonnades. Preserve that priority while clearly distinguishing historical evidence from creative finish work.

The requested sequence is **model → publish live → AR**. The model is published. The user subsequently chose **more architectural realism** for the current construction pass; continue model work before starting **true-scale AR for iPhone/iPad**. VR can follow later. Do not replace the detailed model with a simplistic AR proxy. Earlier experimental AR exports predate the realism rebuild; regenerate any assets from the current geometry rather than depending on those experiments.

First run and inspect the current model, then continue the user's latest instructions. AR prototype files outside this repository are not part of the published model.

## Editable files

- `source/second-temple.fragment.html`: base scene geometry and materials, lighting setup, cameras, interface, landmarks and guided tour.
- `source/details/sanctuary-realism.js` and `sanctuary-carving.js`: dressed construction, four-pilaster façade, deep gilded porch, joinery, formed gold sheets, botanical ornament, stone profiles and worn steps.
- `source/details/material-realism.js`: local photographed stone maps, restrained mineral/rain variation and shallow hand-worked gold reflections.
- `source/details/daylight-setting.js` and `rendering.js`: daylight context, HDR display resolve, supported desktop multisampling and nearby contact shading.
- Other `source/details/` modules: colonnades, Antonia, southern approaches and the navigation controller. The build inlines all detail modules.
- `tests/navigation.cjs`: dependency-free checks for the actual gesture controller.
- `source/page.html`: website shell, theme controls, local preference storage and source links.
- `build.py`: standard-library build that combines those files into `index.html`. Rebuild after edits; do not edit generated `index.html` alone.
- `assets/` and `vendor/`: captured CC0 lighting, the local 2K Marble 01 diffuse/height/roughness maps, RGBE loader and attribution/licenses.

The live site publishes the root of `main` through GitHub Pages. Work on a `codex/` branch, commit, push and open a PR. The user has authorized publishing this project to `never-nude/temple`. Leave repository settings, Pages settings, Git configuration and secrets to the owner.

## Preserve these details

Coordinates are metres: east = +X, up = +Y, south = +Z. The sanctuary faces east; its western Holy of Holies is empty, with no Ark. Furnishings use physical dimensions. Ancient descriptions guide the main layout. Detailed finishes, botanical decoration, gold-sheet layout, surface wear, paving placement, people and landscape remain explicitly interpretive; imagined craft details are authorized. Sources are in the README and website footer. Modern photographed material references do not identify the ancient quarry or a recovered ancient surface.

The sanctuary now has four fluted pilasters, finely jointed dressed stone, deeply assembled cornices, a gold-lined porch and inner entrance, subtly bowed and seamed gold sheets, botanical carving and worn stair noses. The wider complex retains 462 refined columns, tiled colonnade roofs, timber ceilings, pleated fabric, 32 scale figures, landscape, Antonia's open courtyard/towers and the broad southern approaches with 45-metre vaulted vestibules. Preserve the 24 landmarks, 16-stop tour, cutaways, Temple façade viewpoint, Reset view, touch controls, theme independence and saved camera state.

## Validation and next checks

Release validation includes build/syntax checks, all 16 tour stops and cutaway transitions, viewpoints, lighting and theme controls, and browser layouts at 320/390 px. Check finite geometry, successful local texture/HDR loading and WebGL errors after any geometry, shader or renderer change. Inspect both wide and close views: contact shading should fade out between 30 and 55 metres so tiny course edges do not stipple distant walls. Desktop multisampling is conditional on renderer support; phones use reduced pixel density and shadow resolution. Browser phone previews do not establish actual iPhone GPU performance or native gesture feel.

Trackpad controls: click-drag orbit, two-finger pan, pinch zoom. Mouse controls: left-drag orbit, right/middle-drag pan, wheel zoom. Touchscreen: one-finger orbit, simultaneous two-finger pan/pinch. Touch movement has a small tap threshold; switching between one and two fingers rebases the gesture to prevent jumps. Gesture hints follow the input stream, navigation mode is saved locally, and Reset view restores the selected preset. Run `node tests/navigation.cjs` after changing controls. Native Safari and physical trackpad/iPhone checks remain separate from synthetic event regression tests.

Material credits: [Marble 01 by Rob Tuytel](https://polyhaven.com/a/marble_01) and [Dry Meadow](https://polyhaven.com/a/dry_meadow), from Poly Haven under CC0. Keep their local files and `assets/README.md` attribution when transferring or publishing the repository.

For AR, preserve metre scale through export and verify a known dimension on an actual iPhone/iPad. Distinguish full-size placement from tabletop viewing. Test sanctuary and complete-complex assets, material fidelity, HTTPS loading and memory/performance before presenting AR as complete. Continue publishing the working model throughout development.
