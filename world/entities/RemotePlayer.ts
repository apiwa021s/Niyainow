import type * as Phaser from "phaser";

import { Player } from "@/world/entities/Player";
import { InterpolationBuffer } from "@/world/multiplayer/interpolation";
import type { NetworkPlayer } from "@/world/types";

export class RemotePlayer extends Player {
  private readonly interpolation = new InterpolationBuffer();

  constructor(scene: Phaser.Scene, player: NetworkPlayer) {
    super(scene, { ...player, physics: false });
    this.setMotion(player.state, player.direction);
    this.interpolation.push(player);
  }

  push(player: NetworkPlayer) {
    this.interpolation.push(player);
  }

  update(delta: number) {
    const sample = this.interpolation.sample();
    if (sample) {
      this.x = sample.x;
      this.y = sample.y;
      this.setMotion(sample.state, sample.direction);
    }
    this.updateMotion(delta);
  }
}
