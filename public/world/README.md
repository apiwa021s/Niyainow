# NovelNow World production art

This directory contains the optimized WebP exports loaded by Phaser. The 38 environment, prop, landmark, portal, and VFX assets use the stable paths in `world/assets/manifest.ts` and follow `ART_ASSET_REQUIREMENTS.md`.

The artwork is original project-generated manga environment art. The supplied visual reference was used only for linework, lighting, palette, and mood; no characters, lettering, logos, composition, or specific architecture were copied.

- Raw generated PNGs: `art/world/raw`
- Normalized production masters: `art/world/masters`
- Alpha/edge review sheet: `art/world/review/world-assets-contact-sheet.png`
- Rebuild exports: `npm run world:art:build`
- Rebuild the QA sheet: `npm run world:art:review`

Character animation layers, interiors, and UI art remain separate production sets and continue to use their procedural/runtime implementations until those sets are registered and approved.
