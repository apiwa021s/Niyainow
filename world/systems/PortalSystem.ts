import * as Phaser from "phaser";

export class PortalSystem {
  constructor(private readonly scene: Phaser.Scene) {}

  transition(x: number, y: number) {
    const camera = this.scene.cameras.main;
    camera.flash(280, 255, 249, 238, false);
    for (let index = 0; index < 12; index += 1) {
      const line = this.scene.add.line(x, y, 0, 0, Phaser.Math.Between(-210, 210), Phaser.Math.Between(-170, 60), 0x302a2a, 0.35)
        .setOrigin(0).setDepth(20_000).setLineWidth(1.2);
      this.scene.tweens.add({ targets: line, alpha: 0, scaleX: 1.7, duration: 420, onComplete: () => line.destroy() });
    }
  }
}
