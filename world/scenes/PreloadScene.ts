import * as Phaser from "phaser";

import centralMapJson from "@/world/maps/central-plaza.json";
import type { WorldGameBridge } from "@/world/engine/bridge";
import {
  WORLD_ASSET_ENTRIES,
  WORLD_CHARACTER_SPRITESHEETS,
  WORLD_USES_PROCEDURAL_PLACEHOLDERS,
} from "@/world/assets/manifest";

const CENTRAL_WORLD_ASSET_KEYS = new Set([
  "ground_grass_001",
  "ground_plaza_stone_001",
  ...centralMapJson.objects.map((object) => object.asset),
]);

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("preload");
  }

  preload() {
    const bridge = this.registry.get("bridge") as WorldGameBridge;
    bridge.onLoading(0.05);
    this.load.on("progress", (progress: number) => bridge.onLoading(0.05 + progress * 0.9));

    if (!WORLD_USES_PROCEDURAL_PLACEHOLDERS) {
      for (const asset of WORLD_ASSET_ENTRIES) {
        if (CENTRAL_WORLD_ASSET_KEYS.has(asset.key)) this.load.image(asset.key, asset.path);
      }
      for (const atlas of WORLD_CHARACTER_SPRITESHEETS) {
        this.load.spritesheet(atlas.key, atlas.path, {
          frameWidth: atlas.frameWidth,
          frameHeight: atlas.frameHeight,
        });
      }
    }
  }

  create() {
    const bridge = this.registry.get("bridge") as WorldGameBridge;
    const sparkle = this.add.graphics();
    sparkle.fillStyle(0xfff9ee).fillCircle(4, 4, 3);
    sparkle.generateTexture("world-sparkle", 8, 8);
    sparkle.destroy();
    bridge.onLoading(1);
    this.scene.start("central-world");
  }
}
