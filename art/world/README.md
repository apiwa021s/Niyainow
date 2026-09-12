# NovelNow World art pipeline

The environment set was generated as original manga-inspired game art using the user-provided image only as a style reference. The shared prompt direction was: delicate clean manga ink, soft cel shading, subtle screentone, warm ivory paper highlights, restrained watercolor accents, 3/4 isometric framing, mature non-chibi proportions, quiet sage/blush/gold/sky palette, and no copied characters, text, logos, or architecture.

Each asset-specific prompt follows `ART_ASSET_REQUIREMENTS.md`. Ground, environment, props, landmarks/portal, and VFX are stored as one raw PNG per stable asset ID in `raw/`.

`npm run world:art:build` performs reproducible production processing:

1. Preserve each raw PNG unchanged.
2. Replace any baked grayscale transparency preview that touches the canvas edge with a real alpha channel.
3. Normalize to the required master PNG dimensions in `masters/`.
4. Export the required WebP dimensions and stable filename into `public/world/`.
5. Report final dimensions and alpha range.

`npm run world:art:review` creates `review/world-assets-contact-sheet.png`, compositing every export over split dark and warm backgrounds so halos, opaque checkerboards, and clipped silhouettes are visible during review.

The character production contract is intentionally separate: its layer/state/direction atlases need shared registration and animation QA rather than unrelated one-off generation.
