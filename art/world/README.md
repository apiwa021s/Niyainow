# NovelNow World art pipeline

The environment set was generated as original manga-inspired game art using the user-provided image only as a style reference. The shared prompt direction was: delicate clean manga ink, soft cel shading, subtle screentone, warm ivory paper highlights, restrained watercolor accents, 3/4 isometric framing, mature non-chibi proportions, quiet sage/blush/gold/sky palette, and no copied characters, text, logos, or architecture.

Each asset-specific prompt follows `ART_ASSET_REQUIREMENTS.md`. Ground, environment, props, landmarks/portal, and VFX are stored as one raw PNG per stable asset ID in `raw/`.

`npm run world:art:build` performs reproducible production processing:

1. Preserve each raw PNG unchanged.
2. Replace baked grayscale checkerboards, including checker components enclosed by leaves, hair, or architecture, with a real alpha channel.
3. Scale the matte feather to the actual raw-to-export ratio, decontaminate edge colors, and remove tiny detached generation artifacts.
4. Normalize to the required master PNG dimensions in `masters/`.
5. Export transparent artwork as lossless exact WebP, clearing hidden RGB and sub-threshold alpha pixels after resizing.
6. Report final dimensions and alpha range.

`npm run world:art:review` creates `review/world-assets-contact-sheet.png`, compositing every export over black, paper, cyan, and magenta backgrounds so halos, opaque checkerboards, color spill, and clipped silhouettes are visible during review. `npm run world:art:audit` verifies all 39 current exports, dimensions, full alpha range, hidden transparent RGB, alpha noise, per-file size, and the release payload budget. `npm run world:art:production` rebuilds and runs the complete art release gate.

Character production is kept separate because every paper-doll layer must share exact registration. The first pilot is `characters/raw/character_default_idle_001.png`: one canonical default character in the direction order `NE, NW, SE, SW`. `npm run world:character:build` extracts real alpha, applies one common scale across all four frames, aligns visible feet to the `(0.5, 0.92)` anchor, and exports a `4 x 128 x 192` WebP spritesheet. The registration QA image is written to `characters/review/character_default_idle_001-registration.png`.

The pilot prompt uses the same original manga-inspired visual language as the environment set, with elegant non-chibi anatomy, restrained academy clothing, consistent identity, and no copied character or composition. It is a composite baseline for proving registration and runtime integration; individual body/skin/face/hair/clothing/accessory layers and the walk/run/sit/wave/read states remain the next production batches.
