import * as Phaser from "phaser";

import type { WorldGameBridge } from "@/world/engine/bridge";
import { worldGameConfig } from "@/world/engine/config";
import { BootScene } from "@/world/scenes/BootScene";
import { CentralWorldScene } from "@/world/scenes/CentralWorldScene";
import { InteriorScene } from "@/world/scenes/InteriorScene";
import { PreloadScene } from "@/world/scenes/PreloadScene";
import type { WorldCharacter, WorldEmote, WorldInteraction } from "@/world/types";

export type WorldGameController = {
  setInputEnabled(enabled: boolean): void;
  interact(): void;
  sendChat(message: string): void;
  sendEmote(emote: WorldEmote): void;
  transition(interaction: WorldInteraction): void;
  sit(): void;
  destroy(): void;
};

export function createWorldGame(parent: HTMLElement, character: WorldCharacter, bridge: WorldGameBridge): WorldGameController {
  const game = new Phaser.Game(worldGameConfig(
    parent,
    [new BootScene(), new PreloadScene(), new CentralWorldScene(), new InteriorScene()],
    (instance) => {
      instance.registry.set("bridge", bridge);
      instance.registry.set("character", character);
    },
  ));
  const scene = () => game.scene.getScene("central-world") as CentralWorldScene | undefined;
  return {
    setInputEnabled: (enabled) => scene()?.setWorldInputEnabled(enabled),
    interact: () => scene()?.interact(),
    sendChat: (message) => scene()?.sendChat(message),
    sendEmote: (emote) => scene()?.sendEmote(emote),
    transition: (interaction) => scene()?.playPortalTransition(interaction),
    sit: () => scene()?.sit(),
    destroy: () => game.destroy(true, false),
  };
}
