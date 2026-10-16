# Second Temple Explorer

An interactive reconstruction of the Herodian Second Temple complex in Jerusalem, around 30 CE. The current release focuses on architectural realism and interactive exploration. AR is a later step.

## Continue on another computer

Read [HANDOFF.md](HANDOFF.md) for the current state, local startup steps, constraints and planned iPhone/iPad AR phase.

## Explore

- Orbit, zoom, and pan with mouse or touch.
- Inspect 22 landmarks and a 16-stop guided tour.
- Reveal the sanctuary with a cutaway and inspect its furnishings up close.
- Explore the sanctuary and Royal Stoa from close and human-height viewpoints.
- Change the sunlight and choose system, light, or dark appearance.
- Inspect carved moldings, fluted shafts, curved capitals, deep portal reveals, tiled roofs, cedar ceilings and pleated fabric.
- Read metre-scaled stone, timber, clay and metal surfaces under captured daylight, directional shadows and subtle contact shading.
- Use 32 human-scale figures and surrounding terrain to understand the precinct's size.

Open `index.html` through any static web server. For example, run `python3 -m http.server 5204` in this folder and visit `http://localhost:5204/`.

After editing `source/second-temple.fragment.html` or `source/page.html`, run `python3 build.py`. The build uses only Python's standard library. No backend, account or API key is needed. Three.js r160.1 loads from a CDN; the captured HDR lighting asset and loader are served from this repository. If captured lighting or floating-point render targets are unavailable, the viewer keeps procedural lighting or direct rendering.

On iPhone, open the published HTTPS URL in Safari. Drag to orbit and pinch to zoom; camera buttons and landmark controls provide another way to explore.

## GitHub Pages

The live site is https://never-nude.github.io/temple/. GitHub Pages publishes the root of `main`. Repository and Pages settings remain owner-managed.

## Historical interpretation

The layout follows ancient descriptions, while dimensions, decoration, finishes, and some placements remain interpretive. An illustrative cubit of 0.5 meters is used. The Holy of Holies is empty. The model is an educational reconstruction, not an archaeological survey.

- [Josephus, Jewish War 5, chapter 5](https://penelope.uchicago.edu/josephus/war-5.html)
- [Josephus, Antiquities 15, chapter 11](https://penelope.uchicago.edu/josephus/ant-15.html)
- [Israel Museum model photograph, University of Michigan](https://image-database.nes.lsa.umich.edu/items/show/179)
- [IAA: drafted Western Wall masonry](https://hadashot.iaa.org.il/Report_Detail_Eng.aspx?id=25662)
- [Excavators' reconstruction of Herodian stone floor patterns](https://tmsifting.org/en/2016/09/06/1374/)
- [Mishnah Middot](https://www.sefaria.org/Mishnah_Middot)
- [Menachot 28b](https://www.sefaria.org/Menachot.28b.13)
- [Traditional table proportions](https://www.sefaria.org/Exodus.25.23)
- [Traditional incense-altar proportions](https://www.sefaria.org/Exodus.30.2)

## Source and checks

`source/second-temple.fragment.html` contains the editable geometry, materials, rendering and interactions. `source/page.html` supplies the website layout and local preference storage. `index.html` is the generated browser version. Asset attribution is in `assets/README.md`; the vendored RGBE loader license is in `vendor/THREE-LICENSE.txt`.

Browser checks cover viewpoints, all 16 guided-tour stops and their automatic cutaway transitions, landmark controls, camera zoom/orbit, sunlight, saved interaction state, light/dark modes, and responsive layouts at 320 and 390 pixels. Graphics checks verify finite geometry, no WebGL errors, and successful HDR lighting. Phone layouts are browser previews; actual iPhone GPU performance remains a device check. Rendering runs only when the scene changes, with reduced pixel density/shadow resolution on phones and cached directional shadows.

Decorative stone panels are informed by excavated Herodian opus-sectile patterns, but their placement here is interpretive. The surrounding hills, olives and people are visual context, not an archaeological survey. Native AR is outside this release.
