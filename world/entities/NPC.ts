import * as Phaser from "phaser";

export class NPC extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, label: string) {
    const body = scene.add.ellipse(0, -24, 34, 54, 0x84937a).setStrokeStyle(1.5, 0x302a2a);
    const head = scene.add.circle(0, -61, 17, 0xe7b995).setStrokeStyle(1.5, 0x302a2a);
    const name = scene.add.text(0, -92, label, { fontSize: "12px", color: "#302a2a", backgroundColor: "rgba(255,249,238,.8)", padding: { x: 5, y: 2 } }).setOrigin(0.5);
    super(scene, x, y, [body, head, name]);
    scene.add.existing(this);
    this.setDepth(y);
  }
}
