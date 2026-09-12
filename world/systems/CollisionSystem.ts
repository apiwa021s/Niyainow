import * as Phaser from "phaser";

import type { Player } from "@/world/entities/Player";
import type { WorldObject } from "@/world/types";

export class CollisionSystem {
  private readonly zones: Phaser.GameObjects.Rectangle[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly player: Player) {}

  add(object: WorldObject) {
    if (!object.collision) return;
    const isTree = object.type === "tree";
    const isBench = object.type === "seating";
    const height = isTree ? 38 : isBench ? 34 : Math.max(42, object.height * (object.type === "building" ? 0.22 : 0.28));
    const width = isTree ? Math.max(44, object.width * 0.25) : object.width * (object.type === "building" ? 0.88 : 0.75);
    const zone = this.scene.add.rectangle(object.x, object.y - height / 2, width, height, 0x000000, 0);
    this.scene.physics.add.existing(zone, true);
    this.scene.physics.add.collider(this.player, zone);
    this.zones.push(zone);
  }

  destroy() {
    this.zones.forEach((zone) => zone.destroy());
    this.zones.length = 0;
  }
}
