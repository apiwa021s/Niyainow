import * as Phaser from "phaser";

import type { CharacterDirection, CharacterState, WorldCharacterAppearance, WorldEmote } from "@/world/types";

const SKIN_COLORS: Record<WorldCharacterAppearance["skinTone"], number> = {
  porcelain: 0xf5d8c6,
  warm: 0xe7b995,
  golden: 0xc98b5c,
  deep: 0x805239,
};
const HAIR_COLORS: Record<WorldCharacterAppearance["hairColor"], number> = {
  ink: 0x29262c,
  chestnut: 0x684536,
  ash: 0x857e78,
  rose: 0x9b6268,
};
const TOP_COLORS: Record<WorldCharacterAppearance["topId"], number> = {
  academy: 0x4f5b52,
  cardigan: 0x8f6657,
  blouse: 0xe9dfce,
};
const BOTTOM_COLORS: Record<WorldCharacterAppearance["bottomId"], number> = {
  tailored: 0x37343b,
  pleated: 0x675765,
  relaxed: 0x56626b,
};
const EMOTE_GLYPHS: Record<WorldEmote, string> = {
  wave: "〰",
  heart: "♥",
  laugh: "ハハ",
  surprise: "!",
  book: "▤",
  sparkle: "✦",
};

const DIRECTION_FRAME: Record<CharacterDirection, number> = { NE: 0, NW: 1, SE: 2, SW: 3 };
const PILOT_CHARACTER_TEXTURE = "character_default_idle_001";

function usesPilotCharacterArt(appearance: WorldCharacterAppearance) {
  return appearance.bodyPreset === "classic" &&
    appearance.skinTone === "warm" &&
    appearance.faceId === "gentle" &&
    appearance.eyeId === "soft" &&
    appearance.hairId === "page" &&
    appearance.hairColor === "ink" &&
    appearance.topId === "academy" &&
    appearance.bottomId === "tailored" &&
    appearance.shoesId === "loafers" &&
    appearance.accessoryIds.length === 0;
}

export class Player extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;

  readonly playerId: string;
  readonly displayName: string;
  direction: CharacterDirection;
  state: CharacterState = "idle";
  private readonly figure: Phaser.GameObjects.Container;
  private readonly nameplate: Phaser.GameObjects.Text;
  private bubble?: Phaser.GameObjects.Container;
  private emote?: Phaser.GameObjects.Text;
  private productionSprite?: Phaser.GameObjects.Sprite;
  private motionTime = 0;

  constructor(
    scene: Phaser.Scene,
    options: {
      id: string;
      displayName: string;
      title?: string;
      appearance: WorldCharacterAppearance;
      x: number;
      y: number;
      direction?: CharacterDirection;
      physics?: boolean;
    },
  ) {
    super(scene, options.x, options.y);
    this.playerId = options.id;
    this.displayName = options.displayName;
    this.direction = options.direction ?? "NE";
    this.figure = scene.add.container(0, 0);
    this.add(this.figure);
    this.drawCharacter(options.appearance);

    this.nameplate = scene.add.text(0, -136, options.title ? `${options.displayName}\n‹${options.title}›` : options.displayName, {
      color: "#302a2a",
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
      fontStyle: "600",
      align: "center",
      backgroundColor: "rgba(255,249,238,.82)",
      padding: { x: 7, y: 3 },
      stroke: "#fff9ee",
      strokeThickness: 2,
    }).setOrigin(0.5, 1).setResolution(2);
    this.add(this.nameplate);
    this.setSize(52, 126);
    scene.add.existing(this);
    if (options.physics !== false) {
      scene.physics.add.existing(this);
      this.body.setSize(38, 24).setOffset(7, 51).setCollideWorldBounds(true);
    }
    this.setDepth(this.y);
  }

  private drawCharacter(appearance: WorldCharacterAppearance) {
    const scene = this.scene;
    if (usesPilotCharacterArt(appearance) && scene.textures.exists(PILOT_CHARACTER_TEXTURE)) {
      this.figure.add(scene.add.ellipse(0, 3, 48, 14, 0x302a2a, 0.14));
      this.productionSprite = scene.add.sprite(0, 0, PILOT_CHARACTER_TEXTURE, DIRECTION_FRAME[this.direction])
        .setOrigin(0.5, 0.92)
        .setDisplaySize(84, 126);
      this.figure.add(this.productionSprite);
      return;
    }

    const skin = SKIN_COLORS[appearance.skinTone];
    const hair = HAIR_COLORS[appearance.hairColor];
    const top = TOP_COLORS[appearance.topId];
    const bottom = BOTTOM_COLORS[appearance.bottomId];
    const ink = 0x302a2a;

    const shadow = scene.add.ellipse(0, 3, 50, 16, 0x4a403c, 0.18);
    const backHair = scene.add.ellipse(0, -78, appearance.hairId === "long" ? 51 : 45, appearance.hairId === "long" ? 70 : 48, hair)
      .setStrokeStyle(1.4, ink, 0.75);
    const backLeg = scene.add.rectangle(9, -22, 13, 42, bottom).setStrokeStyle(1.2, ink, 0.8);
    const frontLeg = scene.add.rectangle(-9, -22, 13, 42, bottom).setStrokeStyle(1.2, ink, 0.8);
    const backShoe = scene.add.ellipse(11, 0, 21, 9, appearance.shoesId === "sneakers" ? 0xe8e1d7 : 0x393238).setStrokeStyle(1, ink);
    const frontShoe = scene.add.ellipse(-11, 0, 21, 9, appearance.shoesId === "boots" ? 0x5b4037 : 0x393238).setStrokeStyle(1, ink);
    const torsoWidth = appearance.bodyPreset === "slender" ? 37 : appearance.bodyPreset === "athletic" ? 47 : 42;
    const torso = scene.add.polygon(0, -48, [-torsoWidth / 2, -25, torsoWidth / 2, -25, torsoWidth / 2 - 4, 25, -torsoWidth / 2 + 4, 25], top)
      .setStrokeStyle(1.5, ink, 0.9);
    const collar = scene.add.triangle(0, -62, -11, 0, 11, 0, 0, 13, 0xf7eedc).setStrokeStyle(1, ink, 0.6);
    const neck = scene.add.rectangle(0, -73, 12, 14, skin).setStrokeStyle(1, ink, 0.6);
    const face = scene.add.ellipse(0, -91, 38, appearance.faceId === "calm" ? 43 : 46, skin).setStrokeStyle(1.4, ink, 0.85);
    const eyeSpread = appearance.eyeId === "sharp" ? 8 : 7;
    const leftEye = scene.add.ellipse(-eyeSpread, -92, appearance.eyeId === "round" ? 4 : 5, appearance.eyeId === "round" ? 5 : 2.4, ink);
    const rightEye = scene.add.ellipse(eyeSpread, -92, appearance.eyeId === "round" ? 4 : 5, appearance.eyeId === "round" ? 5 : 2.4, ink);
    const mouth = scene.add.line(0, -84, -3, 0, 3, appearance.faceId === "bright" ? 2 : 0, 0x8e544e, 0.9).setLineWidth(1);
    const fringe = appearance.hairId === "wave"
      ? scene.add.arc(0, -105, 21, 190, 350, false, hair).setStrokeStyle(1.2, ink, 0.8)
      : scene.add.polygon(0, -106, [-21, 7, -14, -9, -5, 2, 3, -10, 10, 2, 20, -8, 21, 8], hair).setStrokeStyle(1.2, ink, 0.8);

    this.figure.add([shadow, backHair, backLeg, frontLeg, backShoe, frontShoe, torso, collar, neck, face, leftEye, rightEye, mouth, fringe]);
    if (appearance.accessoryIds.includes("glasses")) {
      this.figure.add([
        scene.add.circle(-8, -92, 7).setStrokeStyle(1.4, ink),
        scene.add.circle(8, -92, 7).setStrokeStyle(1.4, ink),
        scene.add.line(0, -92, -2, 0, 2, 0, ink).setLineWidth(1.2),
      ]);
    }
    if (appearance.accessoryIds.includes("ribbon")) {
      this.figure.add(scene.add.star(17, -110, 4, 4, 9, 0xe8b9b0).setStrokeStyle(1, ink));
    }
    if (appearance.accessoryIds.includes("satchel")) {
      this.figure.add(scene.add.rectangle(25, -43, 18, 22, 0x7b6253).setStrokeStyle(1, ink));
    }
  }

  setMotion(state: CharacterState, direction = this.direction) {
    this.state = state;
    this.direction = direction;
    if (this.productionSprite) {
      this.productionSprite.setFrame(DIRECTION_FRAME[direction]);
      this.figure.setScale(1, 1);
    } else {
      this.figure.setScale(direction.endsWith("W") ? -1 : 1, 1);
    }
  }

  updateMotion(delta: number) {
    this.motionTime += delta;
    const moving = this.state === "walk" || this.state === "run";
    const amplitude = this.state === "run" ? 3 : moving ? 1.7 : 0.7;
    const speed = this.state === "run" ? 0.023 : moving ? 0.014 : 0.004;
    this.figure.y = Math.sin(this.motionTime * speed) * amplitude;
    this.figure.angle = moving ? Math.sin(this.motionTime * speed) * 1.1 : 0;
    this.setDepth(this.y);
  }

  showSpeech(message: string) {
    this.bubble?.destroy(true);
    const text = this.scene.add.text(0, 0, message, {
      color: "#302a2a",
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
      wordWrap: { width: 180 },
      align: "center",
      padding: { x: 10, y: 7 },
      backgroundColor: "#fff9ee",
      stroke: "#fff9ee",
      strokeThickness: 1,
    }).setOrigin(0.5, 1);
    const tail = this.scene.add.triangle(0, 5, -7, -8, 7, -8, 0, 2, 0xfff9ee).setOrigin(0.5, 0);
    this.bubble = this.scene.add.container(0, -150, [text, tail]);
    this.add(this.bubble);
    this.scene.time.delayedCall(5_000, () => {
      this.bubble?.destroy(true);
      this.bubble = undefined;
    });
  }

  showEmote(emote: WorldEmote) {
    this.emote?.destroy();
    this.emote = this.scene.add.text(0, -164, EMOTE_GLYPHS[emote], {
      color: emote === "heart" ? "#b34e60" : "#302a2a",
      fontFamily: "Georgia, serif",
      fontSize: emote === "laugh" ? "19px" : "28px",
      fontStyle: "bold",
      stroke: "#fff9ee",
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.add(this.emote);
    this.scene.tweens.add({
      targets: this.emote,
      y: -194,
      alpha: 0,
      duration: 1_800,
      ease: "Cubic.easeOut",
      onComplete: () => { this.emote?.destroy(); this.emote = undefined; },
    });
  }
}
