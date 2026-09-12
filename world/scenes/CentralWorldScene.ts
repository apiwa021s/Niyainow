import * as Phaser from "phaser";

import centralMapJson from "@/world/maps/central-plaza.json";
import type { WorldGameBridge } from "@/world/engine/bridge";
import { NPC } from "@/world/entities/NPC";
import { Player } from "@/world/entities/Player";
import { renderWorldGround, renderWorldObject } from "@/world/entities/WorldObjectRenderer";
import { CollisionSystem } from "@/world/systems/CollisionSystem";
import { InteractionSystem } from "@/world/systems/InteractionSystem";
import { MovementSystem } from "@/world/systems/MovementSystem";
import { PortalSystem } from "@/world/systems/PortalSystem";
import { PresenceSystem } from "@/world/systems/PresenceSystem";
import { worldMapSchema, type WorldCharacter, type WorldEmote, type WorldInteraction } from "@/world/types";

export class CentralWorldScene extends Phaser.Scene {
  private bridge!: WorldGameBridge;
  private character!: WorldCharacter;
  private player!: Player;
  private movement!: MovementSystem;
  private interactions!: InteractionSystem;
  private collisions!: CollisionSystem;
  private portals!: PortalSystem;
  private presence!: PresenceSystem;
  private lastSnapshotAt = 0;
  private inputEnabled = true;

  constructor() {
    super("central-world");
  }

  create() {
    this.bridge = this.registry.get("bridge") as WorldGameBridge;
    this.character = this.registry.get("character") as WorldCharacter;
    const map = worldMapSchema.parse(centralMapJson);
    this.physics.world.setBounds(60, 60, map.width - 120, map.height - 120);
    renderWorldGround(this, map.width, map.height);

    const spawn = {
      x: Phaser.Math.Clamp(this.character.x || map.spawn.x, 80, map.width - 80),
      y: Phaser.Math.Clamp(this.character.y || map.spawn.y, 100, map.height - 80),
    };
    this.player = new Player(this, {
      id: this.character.id,
      displayName: this.character.displayName,
      title: this.character.title,
      appearance: this.character,
      ...spawn,
    });
    this.collisions = new CollisionSystem(this, this.player);
    const interactionList: WorldInteraction[] = [];
    for (const object of map.objects) {
      renderWorldObject(this, object);
      this.collisions.add(object);
      if (object.interaction) interactionList.push({ ...object.interaction, id: object.id, x: object.x, y: object.y });
    }

    new NPC(this, 1070, 720, "บรรณารักษ์ลิน");
    this.addAmbientEffects(map.width, map.height);
    this.movement = new MovementSystem(this, this.player);
    this.interactions = new InteractionSystem(this, this.player, interactionList, this.bridge);
    this.portals = new PortalSystem(this);
    this.presence = new PresenceSystem(this, this.player, this.bridge);
    this.presence.connect();

    const camera = this.cameras.main;
    camera.setBounds(0, 0, map.width, map.height);
    camera.startFollow(this.player, true, 0.09, 0.09);
    camera.setZoom(Phaser.Math.Clamp(this.scale.width / 1450, 0.62, 1));
    camera.fadeIn(520, 255, 249, 238);
    this.scale.on("resize", this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.bridge.onPosition({ worldId: map.id, ...spawn });
    this.bridge.onReady();
  }

  private addAmbientEffects(width: number, height: number) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const count = reducedMotion ? 8 : 28;
    for (let index = 0; index < count; index += 1) {
      const mote = this.add.image(Phaser.Math.Between(120, width - 120), Phaser.Math.Between(120, height - 120), "world-sparkle")
        .setTint(index % 3 === 0 ? 0xd8af67 : 0xfff9ee)
        .setAlpha(Phaser.Math.FloatBetween(0.22, 0.65))
        .setDepth(18_000);
      if (!reducedMotion) {
        this.tweens.add({
          targets: mote,
          y: mote.y - Phaser.Math.Between(35, 100),
          x: mote.x + Phaser.Math.Between(-35, 35),
          alpha: { from: mote.alpha, to: 0.05 },
          duration: Phaser.Math.Between(4_000, 8_000),
          yoyo: true,
          repeat: -1,
          delay: Phaser.Math.Between(0, 3_000),
        });
      }
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setZoom(Phaser.Math.Clamp(gameSize.width / 1450, 0.62, 1));
  }

  update(_time: number, delta: number) {
    if (!this.player) return;
    const motion = this.movement.update();
    this.player.updateMotion(delta);
    this.interactions.update();
    this.presence.update(delta, motion.state, motion.direction);
    const now = performance.now();
    if (now - this.lastSnapshotAt >= 30_000) {
      this.lastSnapshotAt = now;
      this.bridge.onPosition({ worldId: "novelnow-central", x: this.player.x, y: this.player.y });
    }
  }

  setWorldInputEnabled(enabled: boolean) {
    this.inputEnabled = enabled;
    this.movement?.setEnabled(enabled);
    this.interactions?.setEnabled(enabled);
    if (this.input.keyboard) this.input.keyboard.enabled = enabled;
  }

  interact() {
    this.interactions?.interactActive();
  }

  sendChat(message: string) {
    this.presence?.sendChat(message);
  }

  sendEmote(emote: WorldEmote) {
    this.presence?.sendEmote(emote);
  }

  playPortalTransition(interaction: WorldInteraction) {
    this.portals.transition(interaction.x, interaction.y);
  }

  sit() {
    this.movement.setEnabled(false);
    this.player.body.setVelocity(0, 0);
    this.player.setMotion("sit");
    this.time.delayedCall(2_400, () => {
      if (this.inputEnabled) this.movement.setEnabled(true);
      this.player.setMotion("idle");
    });
  }

  private shutdown() {
    this.bridge.onPosition({ worldId: "novelnow-central", x: this.player.x, y: this.player.y });
    this.scale.off("resize", this.handleResize, this);
    this.presence?.destroy();
    this.interactions?.destroy();
    this.movement?.destroy();
    this.collisions?.destroy();
  }
}
