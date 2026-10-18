# Lighting asset

`dry_meadow_1k.hdr` is the 1K Dry Meadow HDRI from Poly Haven, photographed by Sergej Majboroda and processed by Greg Zaal.

- Source: https://polyhaven.com/a/dry_meadow
- Download: https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/dry_meadow_1k.hdr
- License: CC0 (https://polyhaven.com/license)

Used only as a daylight reflection and illumination probe. The visible landscape is procedural and interpretive, not the HDRI location or a survey of ancient Jerusalem.

# Photographed dressed stone

The three files in `textures/` are the unmodified 2K JPG diffuse, displacement, and roughness maps for **Marble 01**, photographed by **Rob Tuytel**, from Poly Haven.

- Source: https://polyhaven.com/a/marble_01
- Diffuse: https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/marble_01/marble_01_diff_2k.jpg
- Displacement: https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/marble_01/marble_01_disp_2k.jpg
- Roughness: https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/marble_01/marble_01_rough_2k.jpg
- License: CC0 (https://polyhaven.com/license)
- Original measured extent: 1.5 metres across.
- Total added texture payload: 1,782,090 bytes (about 1.70 MiB).

`material-realism.js` samples a single slab interior, approximately 0.396 × 0.249 metres, using mirrored world-space coordinates. This keeps the photograph's floor-tile joints off the modeled columns and carving. A shader calibration adjusts the cream reference toward clean pale dressed stone while retaining subtle photographed mineral variation. Surface roughness and shallow bump describe a honed finish.

These modern material references are interpretive. They do not identify the sanctuary's ancient quarry, prove that a particular stone species was used on a particular element, or reproduce a recovered ancient surface. Existing ashlar courses, paving layouts, timber, and archaeological reconstruction details remain separate.
