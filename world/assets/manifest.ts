const TREE_ALPHA_REVISION = "20260912-alpha2";

export const WORLD_ASSETS = {
  ground: {
    grass: "/world/ground/ground_grass_001.webp",
    plazaStone: "/world/ground/ground_plaza_stone_001.webp",
    pathStraight: "/world/ground/ground_path_straight_001.webp",
    pathCorner: "/world/ground/ground_path_corner_001.webp",
    bridge: "/world/ground/ground_bridge_001.webp",
  },
  environment: {
    oak: [1, 2, 3, 4].map((index) => `/world/environment/env_tree_oak_00${index}.webp?v=${TREE_ALPHA_REVISION}`),
    floweringTree: [1, 2].map((index) => `/world/environment/env_tree_flower_00${index}.webp?v=${TREE_ALPHA_REVISION}`),
    bush: [1, 2, 3].map((index) => `/world/environment/env_bush_00${index}.webp`),
    flowers: [1, 2, 3, 4].map((index) => `/world/environment/env_flowers_00${index}.webp`),
    rock: [1, 2, 3].map((index) => `/world/environment/env_rock_00${index}.webp`),
  },
  props: {
    bench: "/world/props/prop_bench_001.webp",
    lamp: "/world/props/prop_lamp_001.webp",
    fountain: "/world/props/prop_fountain_001.webp",
    noticeBoard: "/world/props/prop_notice_board_001.webp",
    bookCart: "/world/props/prop_book_cart_001.webp",
    bookStack: "/world/props/prop_book_stack_001.webp",
    sign: "/world/props/prop_sign_001.webp",
  },
  buildings: {
    library: "/world/buildings/bld_library_001.webp",
    cafe: "/world/buildings/bld_cafe_001.webp",
    communityHall: "/world/buildings/bld_community_hall_001.webp",
    residentialEntrance: "/world/buildings/bld_residential_entrance_001.webp",
  },
  portals: { worldGate: "/world/portals/portal_world_gate_001.webp" },
  vfx: {
    sparkle: "/world/vfx/vfx_sparkle_001.webp",
    floatingPaper: "/world/vfx/vfx_floating_paper_001.webp",
    fallingLeaves: "/world/vfx/vfx_falling_leaves_001.webp",
    portalGlow: "/world/vfx/vfx_portal_glow_001.webp",
    firefly: "/world/vfx/vfx_firefly_001.webp",
  },
} as const;

export const WORLD_ASSET_ENTRIES = [
  ...Object.values(WORLD_ASSETS.ground),
  ...WORLD_ASSETS.environment.oak,
  ...WORLD_ASSETS.environment.floweringTree,
  ...WORLD_ASSETS.environment.bush,
  ...WORLD_ASSETS.environment.flowers,
  ...WORLD_ASSETS.environment.rock,
  ...Object.values(WORLD_ASSETS.props),
  ...Object.values(WORLD_ASSETS.buildings),
  ...Object.values(WORLD_ASSETS.portals),
  ...Object.values(WORLD_ASSETS.vfx),
].map((assetPath) => {
  const pathname = assetPath.split("?")[0];
  return {
    key: pathname.slice(pathname.lastIndexOf("/") + 1, -".webp".length),
    path: assetPath,
  };
});

export const WORLD_CHARACTER_SPRITESHEETS = [
  {
    key: "character_default_idle_001",
    path: "/world/characters/composite/character_default_idle_001.webp",
    frameWidth: 128,
    frameHeight: 192,
  },
  {
    key: "character_librarian_idle_001",
    path: "/world/characters/composite/character_librarian_idle_001.webp",
    frameWidth: 128,
    frameHeight: 192,
  },
] as const;

/** Keep the procedural renderer available as a graceful load-failure fallback. */
export const WORLD_USES_PROCEDURAL_PLACEHOLDERS = false;
