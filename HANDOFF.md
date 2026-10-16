# Second Temple — desktop handoff

Prepared 2026-10-16. This repository contains the complete current website and model. It can be cloned onto a new computer without any laptop-specific folders, secrets or dependencies.

## Start here

- Repository: https://github.com/never-nude/temple
- Live model: https://never-nude.github.io/temple/
- Start from `main`. The architectural realism rebuild was merged in PR #2, commit `6ba63a67a177790d43d4de522562cd2d7c8c5ea0`.
- Read this file and `README.md` before continuing. This is a separate Temple project; do not work in the unrelated Sniffari repository.

Run from the repository folder:

```sh
python3 build.py
python3 -m http.server 5204
```

Open http://localhost:5204/. Three.js loads from a pinned CDN; the captured HDR lighting asset and loader are included locally. There is no package installation, backend or API key requirement.

## User intent and order

Build a fully interactive, highly detailed and convincing reconstruction of the Herodian Second Temple in Jerusalem. The user strongly rejected the early blocky appearance and wants architectural realism pushed much further where useful. Preserve that priority.

The requested sequence is **model → publish live → AR**. The model and publication phases are complete. The next planned phase is **true-scale AR for iPhone/iPad**; VR can follow later. Do not replace the detailed model with a simplistic AR proxy. Earlier experimental AR exports predate the realism rebuild; regenerate any assets from the current geometry rather than depending on those experiments.

This transfer does not itself require making more visual changes or starting AR immediately. First run and inspect the current model, then continue the user's instructions.

## Editable files

- `source/second-temple.fragment.html`: scene geometry, materials, lighting, contact shading, cameras, controls, landmarks and guided tour.
- `source/page.html`: website shell, theme controls, local preference storage and source links.
- `build.py`: standard-library build that combines those files into `index.html`. Rebuild after edits; do not edit generated `index.html` alone.
- `assets/` and `vendor/`: captured CC0 lighting, RGBE loader and attribution/licenses.

The live site publishes the root of `main` through GitHub Pages. Work on a `codex/` branch, commit, push and open a PR. The user has authorized publishing this project to `never-nude/temple`. Leave repository settings, Pages settings, Git configuration and secrets to the owner.

## Preserve these details

Coordinates are metres: east = +X, up = +Y, south = +Z. The sanctuary faces east; its western Holy of Holies is empty, with no Ark. Furnishings use physical dimensions. Ancient descriptions guide the main layout; detailed finishes, decoration, paving placement, people and landscape remain explicitly interpretive. Sources are in the README and website footer.

The current model includes 462 refined columns, carved cornices, recessed portals, tiled colonnade roofs, timber ceilings, pleated fabric, 32 scale figures, landscape, physical materials and captured daylight. Preserve the 22 landmarks, 16-stop tour, cutaways, close-up views, touch controls, theme independence and saved camera state.

## Validation and next checks

The realism release passed build/syntax checks, all 16 tour stops and cutaway transitions, viewpoints, lighting and theme controls, and browser layouts at 320/390 px. Geometry was finite, HDR lighting loaded, and WebGL reported no errors. Actual iPhone GPU performance remains a device check.

For AR, preserve metre scale through export and verify a known dimension on an actual iPhone/iPad. Distinguish full-size placement from tabletop viewing. Test sanctuary and complete-complex assets, material fidelity, HTTPS loading and memory/performance before presenting AR as complete. Continue publishing the working model throughout development.
