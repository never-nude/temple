# Second Temple Explorer

An interactive reconstruction of the Herodian Second Temple complex in Jerusalem, around 30 CE. This first release focuses on the model; AR is a later step.

## Explore

- Orbit, zoom, and pan with mouse or touch.
- Inspect 22 landmarks and a 16-stop guided tour.
- Reveal the sanctuary with a cutaway and inspect its furnishings up close.
- Change the sunlight and follow the system's light or dark appearance.

Open `index.html` through any static web server. No build, backend, account, or API key is needed. The pinned Three.js library loads from a CDN.

On iPhone, open the published HTTPS URL in Safari. Drag to orbit and pinch to zoom; camera buttons and landmark controls provide another way to explore.

## GitHub Pages

The site is prepared for `https://never-nude.github.io/temple/`. Once the changes are on `main`, the owner can enable it in **Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save**. Repository and Pages settings are intentionally left to the owner.

## Historical interpretation

The layout follows ancient descriptions, while dimensions, decoration, finishes, and some placements remain interpretive. An illustrative cubit of 0.5 meters is used. The Holy of Holies is empty. The model is an educational reconstruction, not an archaeological survey.

- [Josephus, Jewish War 5, chapter 5](https://penelope.uchicago.edu/josephus/war-5.html)
- [Josephus, Antiquities 15, chapter 11](https://penelope.uchicago.edu/josephus/ant-15.html)
- [Mishnah Middot](https://www.sefaria.org/Mishnah_Middot)
- [Menachot 28b](https://www.sefaria.org/Menachot.28b.13)
- [Traditional table proportions](https://www.sefaria.org/Exodus.25.23)
- [Traditional incense-altar proportions](https://www.sefaria.org/Exodus.30.2)

## Source and checks

`source/second-temple.fragment.html` contains the editable geometry and interactions. `index.html` is the standalone browser version.

Browser checks passed for viewpoints, landmarks, cutaways, tour navigation, scale-preserving camera controls, real two-finger zoom, saved interaction state, light/dark modes, and layouts down to 320 pixels. Native AR is outside this release.
