# NovelNow World — production art requirements

Production V1 ships processed original artwork for the central world, with procedural drawing retained only as a load-failure fallback. The stable IDs below match `world/assets/manifest.ts`, so approved revisions can replace artwork without changing game systems.

## Shared art direction

All environment assets use a 3/4 isometric camera, delicate clean ink linework, soft cel shading, subtle screentone, warm ivory paper highlights, restrained watercolor accents, and a transparent background unless the table says otherwise. Avoid photorealism, PBR, chibi proportions, thick outlines, neon, and saturated mobile-game rendering. The default ground contact/anchor is bottom-center; collision bounds cover only the walk-blocking footprint, not foliage, roofs, or shadows.

## Ground

| ID | Purpose | Master / export | Transparent | Camera / anchor / collision | Asset-specific art prompt |
|---|---|---|---|---|---|
| `ground_grass_001` | Seamless base terrain | 1024² / 512² WebP | No | Orthographic tile / center / none | Warm sage meadow paper texture, sparse ink stipple, seamless edges. |
| `ground_plaza_stone_001` | Central Plaza paving | 1024² / 512² WebP | No | Orthographic tile / center / none | Ivory limestone setts, fine manga hatching, quiet worn paths, seamless. |
| `ground_path_straight_001` | North–south/east–west path | 1024² / 512² WebP | Yes | 3/4 isometric / bottom-center / none | Pale stone path strip with irregular hand-inked edges. |
| `ground_path_corner_001` | Turning path | 1024² / 512² WebP | Yes | 3/4 isometric / bottom-center / none | Matching ninety-degree pale stone path, seamless joins. |
| `ground_bridge_001` | Future stream crossing | 1536×1024 / 768×512 WebP | Yes | 3/4 isometric / bottom-center / full deck | Elegant small European stone bridge, thin ink contour, sage moss. |

## Environment

| ID | Purpose | Master / export | Transparent | Camera / anchor / collision | Asset-specific art prompt |
|---|---|---|---|---|---|
| `env_tree_oak_001` | Plaza oak, round silhouette | 1024² / 512² | Yes | 3/4 / bottom-center / 22% trunk footprint | Elegant fantasy oak, rounded crown, sage watercolor, fine hatching. |
| `env_tree_oak_002` | Plaza oak, leaning right | 1024² / 512² | Yes | 3/4 / bottom-center / 22% trunk footprint | Mature oak leaning gently right, airy ink foliage. |
| `env_tree_oak_003` | Plaza oak, tall silhouette | 1024² / 512² | Yes | 3/4 / bottom-center / 20% trunk footprint | Tall academy-garden oak, simplified upper leaves, detailed roots. |
| `env_tree_oak_004` | Plaza oak, split crown | 1024² / 512² | Yes | 3/4 / bottom-center / 23% trunk footprint | Split-crown oak with drifting leaves and restrained gold light. |
| `env_tree_flower_001` | Blush flowering tree | 1024² / 512² | Yes | 3/4 / bottom-center / 20% trunk footprint | Elegant flowering tree, pale blush petals, not cherry-blossom cliché. |
| `env_tree_flower_002` | Ivory flowering tree | 1024² / 512² | Yes | 3/4 / bottom-center / 20% trunk footprint | Ivory and dusty-rose blossoms, asymmetric ink silhouette. |
| `env_bush_001` | Low round hedge | 512² / 256² | Yes | 3/4 / bottom-center / 65% footprint | Sage clipped hedge, delicate leaf marks. |
| `env_bush_002` | Loose garden shrub | 512² / 256² | Yes | 3/4 / bottom-center / 55% footprint | Loose watercolor shrub with ink twig accents. |
| `env_bush_003` | Flowering hedge | 512² / 256² | Yes | 3/4 / bottom-center / 60% footprint | Low hedge dotted with blush flowers. |
| `env_flowers_001` | Blush flower patch | 512² / 256² | Yes | 3/4 / bottom-center / none | Sparse blush academy-garden flowers, transparent gaps. |
| `env_flowers_002` | Gold flower patch | 512² / 256² | Yes | 3/4 / bottom-center / none | Restrained gold wildflowers with fine ink stems. |
| `env_flowers_003` | Blue flower patch | 512² / 256² | Yes | 3/4 / bottom-center / none | Muted sky-blue flowers, watercolor wash. |
| `env_flowers_004` | Mixed flower patch | 512² / 256² | Yes | 3/4 / bottom-center / none | Ivory, sage, and blush mixed flowers; quiet palette. |
| `env_rock_001` | Small moss rock | 512² / 256² | Yes | 3/4 / bottom-center / 70% footprint | Pale angular garden rock, sage moss, screentone shadow. |
| `env_rock_002` | Flat sitting rock | 512² / 256² | Yes | 3/4 / bottom-center / 80% footprint | Flat warm-gray reading-garden stone. |
| `env_rock_003` | Tall marker rock | 512² / 256² | Yes | 3/4 / bottom-center / 55% footprint | Slender story-marker stone with subtle ink rune, no glow. |

## Props

| ID | Purpose | Master / export | Transparent | Camera / anchor / collision | Asset-specific art prompt |
|---|---|---|---|---|---|
| `prop_bench_001` | Interactive seating | 1024×512 / 512×256 | Yes | 3/4 / bottom-center / seat footprint | European academy garden bench, warm wood, fine wrought iron. |
| `prop_lamp_001` | Plaza lighting | 512×1024 / 256×512 | Yes | 3/4 / bottom-center / narrow post | Slender storybook lamp, dim gold glass, thin ink metal. |
| `prop_fountain_001` | Story monument landmark | 1536² / 768² | Yes | 3/4 / bottom-center / basin footprint | Circular limestone fountain with floating-page star monument, pale sky water. |
| `prop_notice_board_001` | Community interaction | 1024² / 512² | Yes | 3/4 / bottom-center / two posts | Academy notice board, layered paper notes, no legible tiny text. |
| `prop_book_cart_001` | Novel discovery display | 1024² / 512² | Yes | 3/4 / bottom-center / cart footprint | Rolling walnut book cart with restrained colorful spines. |
| `prop_book_stack_001` | Ambient books | 512² / 256² | Yes | 3/4 / bottom-center / 75% footprint | Uneven stack of clothbound fantasy novels, inked page edges. |
| `prop_sign_001` | Wayfinding | 512² / 256² | Yes | 3/4 / bottom-center / post footprint | Hand-lettered wooden district sign with replaceable blank panels. |

## Landmarks

| ID | Purpose | Master / export | Transparent | Camera / anchor / collision | Asset-specific art prompt |
|---|---|---|---|---|---|
| `bld_library_001` | Grand Library entrance | 3072×2048 / 1536×1024 | Yes | 3/4 / bottom-center / lower 20% façade | Grand European fantasy library, academy towers, large arched door, ivory stone, restrained gold roof, detailed foreground, simplified upper silhouette. Export base, roof/foreground, shadow, and window-light layers. |
| `bld_cafe_001` | Reader Café | 2048² / 1024² | Yes | 3/4 / bottom-center / lower 23% façade | Refined small European café, blush awning, reading terrace, warm window light; mature not cute. Export base/awning/shadow/light. |
| `bld_community_hall_001` | Community Hall | 2048² / 1024² | Yes | 3/4 / bottom-center / lower 22% façade | Collegiate guild hall without weapons or heraldry, sage roof, paper notices, welcoming doors. Export base/roof/shadow/banner. |
| `portal_world_gate_001` | Genre portal landmark | 2048² / 1024² | Yes | 3/4 / bottom-center / stone feet | Tall weathered book-arch portal, floating paper motes, pale blue interior, elegant ink speed lines. Export arch/glow/foreground/shadow. |
| `bld_residential_entrance_001` | Future player-room district | 2048×1024 / 1024×512 | Yes | 3/4 / bottom-center / gate footprint | Quiet academy residential gate with ivy and closed paper lanterns; clearly inaccessible, no barricades. |

## VFX

| ID | Purpose | Master / export | Transparent | Camera / anchor / collision | Asset-specific art prompt |
|---|---|---|---|---|---|
| `vfx_sparkle_001` | Ambient sparkle atlas | 1024² / 512² atlas | Yes | Camera-facing / center / none | Six delicate four-point ink-and-gold sparkles, soft cel glow. |
| `vfx_floating_paper_001` | Library ambience atlas | 1024² / 512² atlas | Yes | 3/4 / center / none | Eight turning ivory page frames, readable silhouette, no text. |
| `vfx_falling_leaves_001` | Garden ambience atlas | 1024² / 512² atlas | Yes | Camera-facing / center / none | Eight sage and blush leaf rotation frames. |
| `vfx_portal_glow_001` | World Gate loop | 1024² / 512² atlas | Yes | Camera-facing / center / none | Pale sky watercolor aura with manga speed-line pulse, eight frames. |
| `vfx_firefly_001` | Low-cost night mote | 256² / 128² atlas | Yes | Camera-facing / center / none | Four tiny restrained gold firefly pulses, no neon bloom. |

## Character production set

The shipped pilot uses two production composite atlases: `character_default_idle_001` for the player and `character_librarian_idle_001` for Librarian Lin. Each atlas contains `NE`, `NW`, `SE`, and `SW` in that order. Master frame: 512×768; game frame: 128×192 WebP, transparent, bottom-center anchor at `(0.5, 0.92)`, foot collision `38×24` game pixels.

The next character expansion uses one four-direction atlas per layer and state (`idle`, `walk`, `run`, `sit`, `wave`, `read`). Required layer IDs are `body_{classic,slender,athletic}`, `skin_{porcelain,warm,golden,deep}`, `face_{gentle,bright,calm}`, `eyes_{round,soft,sharp}`, `hair_{page,bob,long,wave}`, `top_{academy,cardigan,blouse}`, `bottom_{tailored,pleated,relaxed}`, `shoes_{loafers,boots,sneakers}`, and `accessory_{glasses,ribbon,earring,satchel}`.

Character prompt: manga/anime young-adult reader, elegant non-chibi proportions, readable silhouette, delicate ink contour, soft cel shading, subtle screentone, 3/4 isometric four-direction game sprite, consistent anatomy and bottom-center registration across every layer and animation frame.

## Production export gate

Run `npm run world:art:production` before release. It rebuilds transparent masters/exports, registers character feet to a common baseline, generates the multi-background contact sheet plus a full-resolution tree transparency review, and audits dimensions, alpha range, hidden matte RGB, low-alpha noise, enclosed checker leaks, per-file size, and the 12 MiB world-art budget.
