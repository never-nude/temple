# Second Temple — paused rebuild handoff

Checkpoint: 2026-10-16. The user paused implementation and is switching to another account on the same computer. Preserve this checkpoint and resume only in response to the user's continuation instruction.

## Exact state

- Repository: https://github.com/never-nude/temple
- Live site: https://never-nude.github.io/temple/
- **Continue branch `codex/evidence-based-temple`, not `main`.** This branch contains the latest unpublished rebuild. The current live site is the earlier realism release from PR #2; PR #3 added the earlier transfer notes.
- `index.html` is still that working published release. It has **not** been regenerated from the unfinished source below. The latest rebuild has **not** been published.
- **The new build is incomplete:** `source/second-temple.fragment.html` references `source/viewer-controls.js`, which has not been written. `source/explorer.js` calls its planned `startTempleExplorer(T, ctx)` function. `python3 build.py` will fail until that missing integration is implemented.
- This is the Temple project, separate from Sniffari. Do not work on the unrelated Sniffari repository.

## Latest user direction

The user again asked for **much, much greater realism**, specifically better architectural plans. They then narrowed the scope: **the temple building itself is sufficient**; the entire mount/precinct is not required. Focus effort on a convincing, coherent temple and its interior. Keep surrounding precinct geometry only as optional schematic context.

The original sequence was model → publish live → AR. Model realism is the current priority again. **Do not switch to AR yet.** iPhone/iPad true-scale AR remains a later phase; regenerate future AR assets from the final geometry. Earlier experiments predate this rebuild.

## Research and architectural basis

Detailed plans and sections DO exist as scholarly reconstructions, although no complete original blueprint or sanctuary walls survive. This rebuild adopts one consistent **Middot / Patrich–Ritmeyer** dimensional scheme, using an explicitly conventional 0.5 m cubit. Josephus gives different aperture sizes; do not silently mix them.

- [Middot 3](https://www.sefaria.org/Mishnah_Middot.3) and [Middot 4](https://www.sefaria.org/Mishnah_Middot.4): primary dimensional descriptions.
- [Joseph Patrich's 2024 publisher preview](https://api.pageplace.de/preview/DT0400.9783161632709_A48657804/preview-9783161632709_A48657804.pdf): PDF page 14, Plate I, detailed cutaway drawn by Ritmeyer/Rabinowitz.
- [Patrich/Ritmeyer 1988 article](https://library.biblicalarchaeology.org/article/reconstructing-the-magnificent-temple-herod-built/) and [accessible reference PDF](https://wisdomintorah.com/wp-content/uploads/2017/04/Reconstructing-the-Magnificent-Temple-Herod-Built.pdf): PDF pages 19–21, cutaway, plan and section.
- `source/temple-evidence.json` records dimensions, exact coordinate sequences, sources and disagreements. Totals were checked: 100 cubits E–W, 70 cubits lower-body width, 100 cubits height including foundation/spikes.

The published drawings are copyrighted research references. No published illustration is bundled as an application asset; our plan/section SVGs are original drawings of the dimensional facts.

Key corrections now modeled: 50 m E–W length; 50 m porch/front width; 35 m lower body; outer opening 10 × 20 m; inner door 5 × 10 m; 5.5 m deep porch; 20 m lower sacred rooms and 20 m upper chamber; 38 side cells across three levels; northern rising passage; southern drainage; staggered double curtains. The golden vine and four interpretive columns belong by the **inner** entrance within the porch, rather than on the outside facade. The outer porch entrance is doorless with five timber lintels. The Holy of Holies is empty: **no Ark**.

## Completed but not yet integrated

- `source/sanctuary.js`: complete replacement `buildSanctuary(THREE, ctx)`. Approximately 143,204 triangles / 75 draws in its standalone check. Canonical dimensions, connected cells, wall/roof assemblies, lintels, doors, four interior columns, gilding, vine, curtains and scaled furnishings. Returns `{group, cutawayParts, anchors, views, dimensions, plan, collisionBoxes, floorBoxes}`. Walk-start positions were checked clear. Further door/passage review was interrupted by the pause.
- `source/material-surfaces.js`: `loadTempleSurfaces(T, renderer, mats, onReady)` immediately supplies `mats.stoneFine`, `mats.column`, `mats.goldPlate`, then loads photographic finishes. Returns a disposal function with `.ready`. Six CC0 maps in `assets/surfaces/`, attribution included; about 2.73 MB download / 4.92 MiB additional GPU textures. Standalone shader/original/instanced loading checks passed.
- `source/drawings.js`: `createTempleDrawings(host, evidence, onSelect)` returns `{show, hide, dispose}`. `show('plan'|'section')` displays original interactive SVGs. Room selection emits `sanctuary`, `ulam`, `holies`, `cells`, `stairs`, `upper`. Dimension totals, layout, keyboard callbacks and disposal were checked independently.
- `source/materials.js`, `source/context-architecture.js`, `source/contact-renderer.js`: extracted existing helpers from the prior monolithic fragment.
- `source/explorer.js`: scene/bootstrap/context geometry extracted and partly rewired. It creates `activity={dirty:true}`, loads fine materials, builds optional context first, then the replacement sanctuary; adds a temple-only paved presentation floor and scale figures; calls the missing controller.
- `source/second-temple.fragment.html`: updated UI and inline bundle markers. New viewpoints: Exterior, Inside porch, Holy Place, Side cells, Upper chamber, Cutaway, Floor plan, Section; optional Show precinct. Includes a drawing layer and planned walking controls.
- `source/page.html`: preference key bumped to `temple-viewer-v3` so old camera coordinates do not corrupt the new model.
- `build.py`: now bundles these modules plus evidence JSON into `index.html` using Python's standard library.

## First work to resume

1. **Write `source/viewer-controls.js`**, defining `startTempleExplorer(T, ctx)`. Read the call at the end of `source/explorer.js` for its supplied objects: root, renderer, scene, camera, world, temple, contextRoots, ground, templeGround, sun/sunDirection, contactRenderer, cutawayParts, pickables, activity, updateShadow(target), disposeResources(). Use `activity.dirty` to request rendering.
2. Default to temple-only scope: hide `contextRoots` and old landscape ground, show `templeGround`; Show precinct reverses that presentation. Adapt landmarks/cameras to `temple.anchors` and `temple.views`. Preserve accessibility, sunlight, zoom/orbit, cutaway and saved state. Do not reapply the old `refineTempleSanctuary` or context-architecture helper to the new temple.
3. Wire original plan/section drawing overlay and evidence/source links. Interior cameras should convey real human scale. Walking was planned with drag-to-look, W/A/S/D or arrows and the touch buttons already in the fragment; use `collisionBoxes` and `floorBoxes` for light-weight wall collision and stair following. Camera eye height is 1.65 m above actual floors. Collision boxes are `{min:[x,y,z],max:[x,y,z]}`; floor boxes are `{x0,x1,z0,z1,y}` in absolute metres.
4. The previous controller can be consulted via `git show 6ba63a6:source/second-temple.fragment.html`. It has working orbit/pan/pinch, tour, labels, resize, theme/state and render cleanup patterns. Avoid cloning highlighted materials before async maps arrive; shared materials should remain physically consistent.
5. Update research/UI/README/HANDOFF descriptions to this temple-focused model. One evidence JSON facade-finish entry still says "gilded front"; reconcile its wording with the adopted restrained outer-porch / richly decorated inner-entry reconstruction.
6. Build, inspect visually, and test the **integrated** application. Individual helper tests do not establish that integration works. Verify narrow mobile layouts, all new viewpoints, drawing room links, walk collisions/steps, cuts, HDR/photographic loading and WebGL errors. Actual iPhone performance remains a device check.
7. Commit/push, open a PR, and publish only once complete and tested. The user previously authorized publishing to `never-nude/temple`; leave Git configuration, repository/Pages settings and secrets owner-managed.

Optional context caveat: the old precinct helper still adds speculative terracotta gables and generic fluted columns. Peleg-Barkat's excavation-led [Royal Portico reconstruction](https://publications.iaa.org.il/cornerstone/vol10/iss1/9/) instead proposes a lower, flat-roofed hall with smooth drum shafts. Since the user narrowed scope, do not make an entire precinct rebuild a prerequisite; keep context clearly schematic and correct obvious unsupported features if retained.

## Build and preview after integration

```sh
python3 build.py
python3 -m http.server 5204
```

Open http://localhost:5204/. A server may already occupy that port; reuse it or choose another available port. Three.js r160.1 is pinned to a CDN; all photographic/HDR assets are included. No backend, package installation or API key is required.
