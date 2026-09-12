import * as Phaser from "phaser";

/** Reserved for later walkable interiors; V1 opens the library as a React reading overlay. */
export class InteriorScene extends Phaser.Scene {
  constructor() {
    super("interior");
  }

  create() {
    this.cameras.main.setBackgroundColor("#f7eedc");
  }
}
