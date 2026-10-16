# Photographic surface finishes

The browser uses small crops of genuine photographed PBR material maps. These are **generic material proxies**, not scans of the Temple or proof of its exact finish. All architectural joints, masonry courses and moldings are supplied by the model, rather than copied from a donor texture grid.

## Fine dressed stone

- Asset: [Marble 01, Poly Haven](https://polyhaven.com/a/marble_01)
- Author: Rob Tuytel.
- Original download resolution: 2K JPEG color, displacement and roughness.
- Files: `marble_01_diff.jpg`, `marble_01_disp.jpg`, `marble_01_rough.jpg`.
- Download base: `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/marble_01/`
- License: [CC0](https://polyhaven.com/license).
- Runtime adaptation: only an interior portion of one finely dressed stone slab is sampled; donor joints are excluded. Its color is normalized to a restrained pale limestone proxy. Color and height are reduced to 512px and roughness to 256px, with opposite crop edges blended to repeat cleanly. The Temple's fine finish and columns use a smaller bump amplitude than general dressed masonry. The scan is not being used to claim the Temple's columns were marble.

## Timber

- Asset: [Wooden Planks, Poly Haven](https://polyhaven.com/a/wooden_planks)
- Photography: Charlotte Baglioni. Processing: Dario Barresi.
- Original download resolution: 1K JPEG color, displacement and roughness.
- Files: `wooden_planks_diff.jpg`, `wooden_planks_disp.jpg`, `wooden_planks_rough.jpg`.
- Download base: `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wooden_planks/`
- License: [CC0](https://polyhaven.com/license).
- Runtime adaptation: 512px color, 256px height, 128px roughness; 2m repeat and restrained warm tone. A generic timber-grain proxy, not an identification of the ancient wood species.

## Gold

Gold uses a small deterministic illustrative hammering-height/roughness map and physical metallic reflections. It does not use the stone scan. Its submillimeter relief is deliberately much finer than the architectural stonework. The microfinish is interpretive; sheet placement follows the model's separate historical reconstruction.

The six downloaded JPEGs total about 2.73 MB. The new runtime textures occupy about 4.92 MiB including mip levels, shared by all related materials. The original photographic assets are CC0; their redistribution and adaptation are permitted. See [Poly Haven's FAQ](https://docs.polyhaven.com/en/faq).
