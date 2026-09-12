import * as Phaser from "phaser";

const LIBRARIAN_TEXTURE = "character_librarian_idle_001";

export class NPC extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, label: string) {
    const figure = scene.textures.exists(LIBRARIAN_TEXTURE)
      ? scene.add.sprite(0, 0, LIBRARIAN_TEXTURE, 0).setOrigin(0.5, 0.92).setDisplaySize(84, 126)
      : scene.add.container(0, 0, [
        scene.add.ellipse(0, -24, 34, 54, 0x84937a).setStrokeStyle(1.5, 0x302a2a),
        scene.add.circle(0, -61, 17, 0xe7b995).setStrokeStyle(1.5, 0x302a2a),
      ]);
    const shadow = scene.add.ellipse(0, 3, 48, 14, 0x302a2a, 0.14);
    const name = scene.add.text(0, -136, label, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
      fontStyle: "600",
      color: "#302a2a",
      backgroundColor: "rgba(255,249,238,.86)",
      padding: { x: 7, y: 3 },
      stroke: "#fff9ee",
      strokeThickness: 2,
    }).setOrigin(0.5, 1).setResolution(2);
    super(scene, x, y, [shadow, figure, name]);
    scene.add.existing(this);
    this.setDepth(y);
  }
}
