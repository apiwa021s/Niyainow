import type { Player } from "@/world/entities/Player";
import type { CharacterDirection, CharacterState } from "@/world/types";

export class AnimationSystem {
  static apply(player: Player, state: CharacterState, direction: CharacterDirection) {
    player.setMotion(state, direction);
  }
}
