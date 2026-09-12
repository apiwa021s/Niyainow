import type * as Phaser from "phaser";

export class DepthSystem {
  static update(object: Phaser.GameObjects.GameObject & { y: number; setDepth(depth: number): unknown }, offset = 0) {
    object.setDepth(object.y + offset);
  }
}
