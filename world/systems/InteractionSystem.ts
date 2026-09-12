import * as Phaser from "phaser";

import type { Player } from "@/world/entities/Player";
import type { WorldGameBridge } from "@/world/engine/bridge";
import type { WorldInteraction } from "@/world/types";

export class InteractionSystem {
  private readonly key: Phaser.Input.Keyboard.Key;
  private active: WorldInteraction | null = null;
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    private readonly player: Player,
    private readonly interactions: WorldInteraction[],
    private readonly bridge: WorldGameBridge,
  ) {
    if (!scene.input.keyboard) throw new Error("Keyboard input unavailable");
    this.key = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && this.active) {
      this.active = null;
      this.bridge.onPrompt(null);
    }
  }

  update() {
    if (!this.enabled) return;
    let nearest: WorldInteraction | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const interaction of this.interactions) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, interaction.x, interaction.y);
      if (distance <= interaction.radius && distance < nearestDistance) {
        nearest = interaction;
        nearestDistance = distance;
      }
    }
    if (nearest?.id !== this.active?.id) {
      this.active = nearest;
      this.bridge.onPrompt(nearest);
    }
    if (this.active && Phaser.Input.Keyboard.JustDown(this.key)) this.bridge.onInteraction(this.active);
  }

  interactActive() {
    if (this.enabled && this.active) this.bridge.onInteraction(this.active);
  }

  destroy() {
    this.key.destroy();
  }
}
