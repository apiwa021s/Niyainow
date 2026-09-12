import * as Phaser from "phaser";

import type { WorldGameBridge } from "@/world/engine/bridge";
import { WORLD_ASSET_ENTRIES, WORLD_USES_PROCEDURAL_PLACEHOLDERS } from "@/world/assets/manifest";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("preload");
  }

  preload() {
    const bridge = this.registry.get("bridge") as WorldGameBridge;
    bridge.onLoading(0.05);
    this.load.on("progress", (progress: number) => bridge.onLoading(0.05 + progress * 0.9));

    if (!WORLD_USES_PROCEDURAL_PLACEHOLDERS) {
      for (const asset of WORLD_ASSET_ENTRIES) this.load.image(asset.key, asset.path);
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
