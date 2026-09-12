import * as Phaser from "phaser";

import type { Player } from "@/world/entities/Player";
import type { CharacterDirection, CharacterState } from "@/world/types";

export class MovementSystem {
  private readonly keys: Record<"up" | "down" | "left" | "right" | "run", Phaser.Input.Keyboard.Key>;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private clickTarget: Phaser.Math.Vector2 | null = null;
  private enabled = true;
  private direction: CharacterDirection = "NE";
  private state: CharacterState = "idle";

  constructor(private readonly scene: Phaser.Scene, private readonly player: Player) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error("Keyboard input unavailable");
    this.keys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      run: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    };
    this.cursors = keyboard.createCursorKeys();
    scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.enabled && pointer.leftButtonDown()) this.clickTarget = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    });
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.clickTarget = null;
      this.player.body?.setVelocity(0, 0);
    }
  }

  update() {
    if (!this.enabled) return this.setState("idle", this.direction);
    let x = Number(this.keys.right.isDown || this.cursors.right.isDown) - Number(this.keys.left.isDown || this.cursors.left.isDown);
    let y = Number(this.keys.down.isDown || this.cursors.down.isDown) - Number(this.keys.up.isDown || this.cursors.up.isDown);
    if (x || y) this.clickTarget = null;
    if (!x && !y && this.clickTarget) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.clickTarget.x, this.clickTarget.y);
      if (distance < 12) this.clickTarget = null;
      else {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.clickTarget.x, this.clickTarget.y);
        x = Math.cos(angle);
        y = Math.sin(angle);
      }
    }

    if (!x && !y) {
      this.player.body.setVelocity(0, 0);
      return this.setState("idle", this.direction);
    }
    const vector = new Phaser.Math.Vector2(x, y).normalize();
    const running = this.keys.run.isDown;
    const speed = running ? 275 : 170;
    this.player.body.setVelocity(vector.x * speed, vector.y * speed);
    this.direction = vector.x < 0
      ? vector.y < 0 ? "NW" : "SW"
      : vector.y < 0 ? "NE" : "SE";
    return this.setState(running ? "run" : "walk", this.direction);
  }

  private setState(state: CharacterState, direction: CharacterDirection) {
    this.state = state;
    this.player.setMotion(state, direction);
    return { state, direction };
  }

  destroy() {
    this.scene.input.removeAllListeners("pointerdown");
    Object.values(this.keys).forEach((key) => key.destroy());
    Object.values(this.cursors).forEach((key) => key?.destroy());
  }
}
