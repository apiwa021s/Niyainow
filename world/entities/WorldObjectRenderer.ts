import * as Phaser from "phaser";

import { WORLD_USES_PROCEDURAL_PLACEHOLDERS } from "@/world/assets/manifest";
import type { WorldObject } from "@/world/types";

const INK = 0x302a2a;
const PAPER = 0xfff9ee;
const IVORY = 0xf7eedc;
const GOLD = 0xd8af67;
const SAGE = 0x84937a;
const BLUSH = 0xe8b9b0;

function renderProductionAsset(scene: Phaser.Scene, object: WorldObject) {
  if (WORLD_USES_PROCEDURAL_PLACEHOLDERS || !scene.textures.exists(object.asset)) return null;

  return scene.add.image(object.x, object.y, object.asset)
    .setOrigin(0.5, 1)
    .setDisplaySize(object.width, object.height)
    .setDepth(object.y + object.depthOffset);
}

const BUILDING_LABELS: Record<string, string> = {
  bld_library_001: "GRAND LIBRARY\nห้องสมุดใหญ่",
  bld_cafe_001: "READER CAFÉ",
  bld_community_hall_001: "COMMUNITY HALL",
  bld_residential_entrance_001: "RESIDENTIAL QUARTER",
};

function addLabel(scene: Phaser.Scene, container: Phaser.GameObjects.Container, label: string, y: number) {
  container.add(scene.add.text(0, y, label, {
    color: "#302a2a",
    fontFamily: "Georgia, 'Noto Serif Thai', serif",
    fontSize: "16px",
    fontStyle: "bold",
    align: "center",
    lineSpacing: 4,
    backgroundColor: "rgba(255,249,238,.86)",
    padding: { x: 12, y: 6 },
  }).setOrigin(0.5).setResolution(2));
}

function renderBuilding(scene: Phaser.Scene, object: WorldObject) {
  const container = scene.add.container(object.x, object.y).setDepth(object.y + object.depthOffset);
  const { width, height } = object;
  const accent = object.asset.includes("cafe") ? BLUSH : object.asset.includes("community") ? SAGE : GOLD;
  const shadow = scene.add.ellipse(18, 5, width * 0.92, Math.max(45, height * 0.22), 0x302a2a, 0.13);
  const wall = scene.add.rectangle(0, -height * 0.42, width, height * 0.72, IVORY).setStrokeStyle(3, INK, 0.88);
  const roof = scene.add.polygon(0, -height * 0.84, [
    -width * 0.56, height * 0.12,
    0, -height * 0.2,
    width * 0.56, height * 0.12,
    width * 0.48, height * 0.25,
    -width * 0.48, height * 0.25,
  ], accent).setStrokeStyle(3, INK, 0.9);
  container.add([shadow, wall, roof]);

  const columns = object.asset.includes("library") ? 6 : 4;
  for (let index = 0; index < columns; index += 1) {
    const x = -width * 0.38 + index * (width * 0.76 / Math.max(1, columns - 1));
    const window = scene.add.rectangle(x, -height * 0.44, Math.max(30, width / (columns * 2.2)), height * 0.27, 0xbcd7e8, 0.86)
      .setStrokeStyle(1.5, INK, 0.75);
    container.add(window);
  }
  const door = scene.add.rectangle(0, -height * 0.17, Math.min(88, width * 0.22), height * 0.32, 0x7b6253)
    .setStrokeStyle(2, INK, 0.9);
  const light = scene.add.circle(-door.width * 0.3, -height * 0.2, 3, GOLD);
  container.add([door, light]);

  const ink = scene.add.graphics();
  ink.lineStyle(1, INK, 0.16);
  for (let y = -height * 0.7; y < -height * 0.14; y += 11) ink.lineBetween(-width / 2 + 5, y, width / 2 - 5, y + 2);
  container.add(ink);
  addLabel(scene, container, BUILDING_LABELS[object.asset] ?? object.id, -height * 0.58);
  return container;
}

function renderTree(scene: Phaser.Scene, object: WorldObject) {
  const container = scene.add.container(object.x, object.y).setDepth(object.y + object.depthOffset);
  const flower = object.variant === "flower";
  container.add(scene.add.ellipse(12, 3, object.width * 0.75, object.height * 0.16, INK, 0.12));
  container.add(scene.add.rectangle(0, -object.height * 0.34, object.width * 0.14, object.height * 0.58, 0x7b6253).setStrokeStyle(2, INK, 0.75));
  const colors = flower ? [0xe8b9b0, 0xf5d3cb, 0x84937a] : [0x667a63, 0x84937a, 0xa2aa89];
  const canopies = [
    { x: -object.width * 0.2, y: -object.height * 0.7, w: object.width * 0.62, h: object.height * 0.42, color: colors[0] },
    { x: object.width * 0.18, y: -object.height * 0.68, w: object.width * 0.68, h: object.height * 0.46, color: colors[1] },
    { x: 0, y: -object.height * 0.86, w: object.width * 0.68, h: object.height * 0.4, color: colors[2] },
  ];
  for (const canopy of canopies) {
    container.add(scene.add.ellipse(canopy.x, canopy.y, canopy.w, canopy.h, canopy.color).setStrokeStyle(2, INK, 0.72));
  }
  const hatching = scene.add.graphics().lineStyle(1, INK, 0.13);
  for (let index = 0; index < 8; index += 1) {
    hatching.lineBetween(-object.width * 0.36 + index * 13, -object.height * 0.7, -object.width * 0.22 + index * 13, -object.height * 0.57);
  }
  container.add(hatching);
  return container;
}

function renderFountain(scene: Phaser.Scene, object: WorldObject) {
  const container = scene.add.container(object.x, object.y).setDepth(object.y + object.depthOffset);
  container.add([
    scene.add.ellipse(10, 5, object.width, object.height * 0.38, INK, 0.13),
    scene.add.ellipse(0, -8, object.width, object.height * 0.5, 0xc9c0ae).setStrokeStyle(3, INK, 0.8),
    scene.add.ellipse(0, -17, object.width * 0.82, object.height * 0.32, 0xbcd7e8).setStrokeStyle(2, INK, 0.7),
    scene.add.rectangle(0, -object.height * 0.42, 42, object.height * 0.58, IVORY).setStrokeStyle(2, INK, 0.75),
    scene.add.star(0, -object.height * 0.78, 8, 15, 31, GOLD).setStrokeStyle(2, INK, 0.8),
  ]);
  return container;
}

function renderPortal(scene: Phaser.Scene, object: WorldObject) {
  const container = scene.add.container(object.x, object.y).setDepth(object.y + object.depthOffset);
  const glow = scene.add.ellipse(0, -object.height * 0.44, object.width * 0.64, object.height * 0.9, 0xbcd7e8, 0.25);
  const arch = scene.add.graphics();
  arch.lineStyle(22, 0x7b6253, 1);
  arch.beginPath();
  arch.arc(0, -object.height * 0.44, object.width * 0.38, Math.PI, Math.PI * 2, false);
  arch.moveTo(-object.width * 0.38, -object.height * 0.44);
  arch.lineTo(-object.width * 0.38, 0);
  arch.moveTo(object.width * 0.38, -object.height * 0.44);
  arch.lineTo(object.width * 0.38, 0);
  arch.strokePath();
  const inner = scene.add.graphics().lineStyle(3, GOLD, 0.9);
  inner.strokeEllipse(0, -object.height * 0.43, object.width * 0.62, object.height * 0.78);
  container.add([scene.add.ellipse(0, 4, object.width * 0.95, 55, INK, 0.14), glow, arch, inner]);
  addLabel(scene, container, "WORLD GATE", -object.height * 0.95);
  scene.tweens.add({ targets: glow, alpha: { from: 0.14, to: 0.38 }, scaleX: { from: 0.92, to: 1.06 }, duration: 1_800, yoyo: true, repeat: -1 });
  return container;
}

function renderProp(scene: Phaser.Scene, object: WorldObject) {
  if (object.asset === "prop_fountain_001") return renderFountain(scene, object);
  const container = scene.add.container(object.x, object.y).setDepth(object.y + object.depthOffset);
  if (object.asset === "prop_lamp_001") {
    container.add([
      scene.add.ellipse(0, 2, 34, 10, INK, 0.13),
      scene.add.rectangle(0, -object.height * 0.42, 6, object.height * 0.78, 0x4e4745),
      scene.add.polygon(0, -object.height * 0.84, [-13, 9, -8, -12, 8, -12, 13, 9], GOLD, 0.82).setStrokeStyle(1.5, INK),
    ]);
  } else if (object.asset === "prop_bench_001") {
    container.add([
      scene.add.ellipse(5, 5, object.width, 24, INK, 0.12),
      scene.add.rectangle(0, -31, object.width, 28, 0x9b765c).setStrokeStyle(2, INK),
      scene.add.rectangle(0, -7, object.width, 16, 0x7b6253).setStrokeStyle(2, INK),
    ]);
  } else if (object.asset === "prop_notice_board_001") {
    container.add([
      scene.add.rectangle(-37, -28, 7, 92, 0x7b6253), scene.add.rectangle(37, -28, 7, 92, 0x7b6253),
      scene.add.rectangle(0, -83, object.width, 82, IVORY).setStrokeStyle(3, INK),
      scene.add.text(0, -86, "NOTICE\nประกาศนักอ่าน", { color: "#302a2a", fontSize: "13px", fontStyle: "bold", align: "center" }).setOrigin(0.5),
    ]);
  } else if (object.asset === "prop_book_cart_001") {
    container.add([
      scene.add.rectangle(0, -35, object.width, 65, 0x7b6253).setStrokeStyle(2, INK),
      scene.add.rectangle(-28, -69, 45, 13, 0xb34e60).setStrokeStyle(1, INK),
      scene.add.rectangle(19, -74, 48, 11, 0x84937a).setStrokeStyle(1, INK),
      scene.add.circle(-35, 0, 12, 0x403a3c).setStrokeStyle(2, INK),
      scene.add.circle(35, 0, 12, 0x403a3c).setStrokeStyle(2, INK),
    ]);
  }
  return container;
}

function renderDecoration(scene: Phaser.Scene, object: WorldObject) {
  const container = scene.add.container(object.x, object.y).setDepth(object.y + object.depthOffset);
  const colors = [BLUSH, GOLD, 0xb58da0, 0x7f9c72];
  for (let index = 0; index < 9; index += 1) {
    const x = -object.width / 2 + 10 + (index * 29) % Math.max(20, object.width - 20);
    const y = -8 - (index % 3) * 8;
    container.add(scene.add.circle(x, y, 4 + index % 2, colors[index % colors.length]).setStrokeStyle(0.7, INK, 0.5));
  }
  return container;
}

export function renderWorldObject(scene: Phaser.Scene, object: WorldObject) {
  const productionAsset = renderProductionAsset(scene, object);
  if (productionAsset) return productionAsset;
  if (object.type === "building") return renderBuilding(scene, object);
  if (object.type === "tree") return renderTree(scene, object);
  if (object.type === "portal") return renderPortal(scene, object);
  if (object.type === "decoration") return renderDecoration(scene, object);
  return renderProp(scene, object);
}

export function renderWorldGround(scene: Phaser.Scene, width: number, height: number) {
  if (!WORLD_USES_PROCEDURAL_PLACEHOLDERS && scene.textures.exists("ground_grass_001")) {
    scene.add.tileSprite(width / 2, height / 2, width, height, "ground_grass_001").setDepth(-10_000);
    if (scene.textures.exists("ground_plaza_stone_001")) {
      scene.add.image(width / 2, 945, "ground_plaza_stone_001")
        .setDisplaySize(660, 650)
        .setDepth(-9_995);
    }

    const paths = scene.add.graphics().setDepth(-9_990);
    paths.fillStyle(0xd7cdbd, 0.7).fillRect(width / 2 - 105, 300, 210, 1370);
    paths.fillStyle(0xd7cdbd, 0.7).fillRect(330, 805, width - 660, 190);
    paths.lineStyle(2, INK, 0.18).strokeRect(width / 2 - 105, 300, 210, 1370);
    paths.lineStyle(2, INK, 0.18).strokeRect(330, 805, width - 660, 190);
    paths.lineStyle(4, PAPER, 0.5).strokeRect(36, 36, width - 72, height - 72);
    return;
  }

  const ground = scene.add.graphics().setDepth(-10_000);
  ground.fillStyle(0xe4e2c8).fillRect(0, 0, width, height);
  ground.fillStyle(0xd8d4bc, 0.62);
  for (let x = 30; x < width; x += 58) {
    for (let y = 30 + (x % 116); y < height; y += 76) ground.fillCircle(x, y, 1.3);
  }
  ground.fillStyle(0xc9c0ae, 0.95).fillRoundedRect(width / 2 - 330, 620, 660, 650, 115);
  ground.fillStyle(0xd7cdbd, 0.9).fillRect(width / 2 - 105, 300, 210, 1370);
  ground.fillStyle(0xd7cdbd, 0.9).fillRect(330, 805, width - 660, 190);
  ground.lineStyle(2, INK, 0.22).strokeRoundedRect(width / 2 - 330, 620, 660, 650, 115);
  ground.lineStyle(1, INK, 0.12);
  for (let y = 650; y < 1260; y += 34) ground.lineBetween(width / 2 - 310, y, width / 2 + 310, y + 8);
  ground.lineStyle(4, PAPER, 0.5).strokeRect(36, 36, width - 72, height - 72);
}
