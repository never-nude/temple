# Second Temple Explorer

An interactive, historically informed model of the Herodian Second Temple complex in Jerusalem, around 30 CE. The current release concentrates on a convincing architectural model of the sanctuary itself. Its crafted finishes and ornament include freely imagined details, as requested; it is not an exact replica. AR remains a later step.

## Continue on another computer

Read [HANDOFF.md](HANDOFF.md) for the current state, local startup steps, constraints and planned iPhone/iPad AR phase.

## Explore

- On a trackpad, click-drag to orbit; scroll with two fingers or pinch to zoom. Zoom stays centered on the orbit target. Secondary-click-drag, or hold Shift/Ctrl/Meta while click-dragging, pans.
- With a mouse, left-drag orbits, right-drag pans, and the wheel or middle-drag zooms. Shift/Ctrl/Meta-left-drag also pans. There is no device selector.
- On a touchscreen, one finger orbits; two fingers pan and pinch to zoom together.
- Double-click or double-tap the model to restore the current viewpoint. Reset view and the 0 key do the same; the +/− keys and camera buttons zoom.
- Zoom down to a 5 cm orbit radius for close inspection, with adaptive near clipping reaching 2 mm.
- Inspect 24 landmarks and a 16-stop guided tour.
- Reveal the sanctuary with a cutaway and inspect its furnishings up close.
- Use Temple façade for a closer look at the sanctuary, or explore the Royal Stoa and courtyards from human-height viewpoints.
- Change the sunlight and choose system, light, or dark appearance.
- Inspect the sanctuary's four fluted pilasters, deep gilded porch and recessed inner entrance, assembled stone cornices, botanical carving, finely jointed dressed blocks, subtly bowed gold sheets and worn stair noses.
- Explore volumetric carved capitals, tiled roofs, timber ceilings and pleated fabric. All 462 columns can show fine carving as you approach; shared geometry keeps distant colonnades efficient.
- Enter the southern vaulted vestibules, inspect the broad approach stairs, and look into Antonia’s open courtyard and roof terraces.
- Read metre-scaled stone, timber, clay and metal surfaces under captured daylight and directional shadows. Local photographed stone maps supply mineral detail; restrained clouding, rain traces and hand-worked gold reflections add an imagined maintained finish.
- Use 32 human-scale figures and surrounding terrain to understand the precinct's size.

Open `index.html` through any static web server. For example, run `python3 -m http.server 5204` in this folder and visit `http://localhost:5204/`.

After editing `source/second-temple.fragment.html`, `source/details/*.js` or `source/page.html`, run `python3 build.py`. The build uses only Python's standard library. No backend, account or API key is needed. Three.js r160.1, the OrbitControls implementation used by Atrium, the HDR loader, lighting and photographed stone maps are served locally from this repository; the viewer makes no external runtime requests. Supported desktop GPUs use multisampling and an HDR display resolve. Narrow screens use a single native antialiased render pass to preserve fine edges with less GPU memory. Contact shading is confined to nearby surfaces and fades away in wider views. If captured lighting or floating-point render targets are unavailable, the viewer keeps procedural lighting or direct rendering.

On iPhone, open the published HTTPS URL in Safari. Use one finger to orbit and two fingers to pan and pinch to zoom. Camera buttons and landmark controls provide another way to explore.

## GitHub Pages

The live site is https://never-nude.github.io/temple/. GitHub Pages publishes the root of `main`. Repository and Pages settings remain owner-managed.

## Historical interpretation

The main layout follows ancient descriptions, while dimensions, decoration, finishes and some placements remain interpretive. Detailed molding profiles, botanical ornament, stone wear, gold-sheet work and surface treatments are imaginative reconstructions intended to make the architecture feel built and inhabited. An illustrative cubit of 0.5 meters is used. The Holy of Holies is empty. The model is an educational interpretation, not an archaeological survey.

- [Josephus, Jewish War 5, chapter 5](https://penelope.uchicago.edu/josephus/war-5.html)
- [Josephus, Antiquities 15, chapter 11](https://penelope.uchicago.edu/josephus/ant-15.html)
- [Israel Museum model photograph, University of Michigan](https://image-database.nes.lsa.umich.edu/items/show/179)
- [IAA: drafted Western Wall masonry](https://hadashot.iaa.org.il/Report_Detail_Eng.aspx?id=25662)
- [Excavators' reconstruction of Herodian stone floor patterns](https://tmsifting.org/en/2016/09/06/1374/)
- [Herodian smooth-leaf capital study, Israel Museum Studies in Archaeology 8](https://museum.imj.org.il/journal/archive/2017/pdf/IMSA-8_Herodian%20-Ionic-Capital.pdf)
- [IAA: excavation near the Triple Gate](https://publications.iaa.org.il/atiqot/vol85/iss1/9/)
- [Southern approaches and passages, Penn Museum excavation report](https://www.penn.museum/sites/expedition/recent-excavations-in-jerusalem/)
- [Mishnah Middot](https://www.sefaria.org/Mishnah_Middot)
- [Menachot 28b](https://www.sefaria.org/Menachot.28b.13)
- [Traditional table proportions](https://www.sefaria.org/Exodus.25.23)
- [Traditional incense-altar proportions](https://www.sefaria.org/Exodus.30.2)

## Source and checks

`source/second-temple.fragment.html` contains the base scene, materials and interface. `source/details/` contains the sanctuary construction and carving, colonnades, Antonia, southern approaches, photographed material refinement, daylight setting, rendering passes and navigation integration. `build.py` inlines these modules into the standalone viewer. `source/page.html` supplies the website layout and local preference storage. `index.html` is the generated browser version. Asset attribution is in `assets/README.md`. [vendor/README.md](vendor/README.md) records the local Three.js r160.1 renderer, RGBE loader and r182 OrbitControls provenance and packaging; MIT terms are in `vendor/THREE-LICENSE.txt` and the controls header.

The local CC0 material references are [Marble 01 by Rob Tuytel](https://polyhaven.com/a/marble_01) and [Dry Meadow HDRI](https://polyhaven.com/a/dry_meadow), both from Poly Haven. The modern stone photograph is calibrated and sampled in world space; it does not identify an ancient quarry or reproduce a recovered Temple surface.

Run `node tests/navigation.cjs` for checks against the actual vendored OrbitControls and renderer math, including wheel zoom, orbit/pan mappings, simultaneous touch pan/pinch, limits, damping and preset integration. These checks require no package installation or network access. Native device behavior remains a separate browser/hardware check.

Browser checks cover viewpoints, all 16 guided-tour stops and their automatic cutaway transitions, landmark controls, camera zoom/orbit, sunlight, saved interaction state, light/dark modes, and responsive layouts at 320 and 390 pixels. Graphics checks include finite geometry, no WebGL errors, successful local texture/HDR loading and clean rendering at wide and close distances. Phone layouts are browser previews; actual iPhone GPU performance and native trackpad/Safari gesture feel remain device checks. Column detail follows the camera across all 462 assemblies, using shared instanced geometry with up to 32 nearby columns at the finest level. Rendering runs only when the scene changes, with reduced pixel density/shadow resolution on phones and cached directional shadows.

Decorative stone panels are informed by excavated Herodian opus-sectile patterns, but their placement here is interpretive. The surrounding hills, olives and people are visual context, not an archaeological survey. Antonia’s courtyard and tower interiors, the southern stair profiles, carved decoration and passage continuation are interpretive. The southern vestibules are open for 45 metres; the passage network beyond is schematic. Native AR is outside this release.
