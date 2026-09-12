# NovelNow World production art

This directory contains the optimized WebP exports loaded by Phaser. The 38 environment, prop, landmark, portal, and VFX assets use the stable paths in `world/assets/manifest.ts` and follow `ART_ASSET_REQUIREMENTS.md`.

The artwork is original project-generated manga environment art. The supplied visual reference was used only for linework, lighting, palette, and mood; no characters, lettering, logos, composition, or specific architecture were copied.

- Raw generated PNGs: `art/world/raw`
- Normalized production masters: `art/world/masters`
- Alpha/edge review sheet: `art/world/review/world-assets-contact-sheet.png`
- Rebuild exports: `npm run world:art:build`
- Rebuild the QA sheet: `npm run world:art:review`
- Run the complete release gate: `npm run world:art:production`

Transparent exports use lossless exact WebP with adaptive alpha feathering and zero hidden matte RGB. Production serves these versioned paths outside the authentication proxy with one-year immutable browser/CDN caching. Phaser preloads only ground and assets referenced by the active central map; the full catalog remains available for future maps.

The first registered character pilot is `characters/composite/character_default_idle_001.webp`, a four-frame `NE, NW, SE, SW` spritesheet with `128x192` frames and a `(0.5, 0.92)` foot anchor. Phaser uses it for the exact default appearance while retaining the procedural paper-doll renderer for customization combinations that do not have approved production art yet.

Additional character layers and animation states, interiors, and UI art remain separate production sets.
