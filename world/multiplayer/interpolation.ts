import type { CharacterDirection, CharacterState, NetworkPlayer } from "@/world/types";

type PositionSample = Pick<NetworkPlayer, "x" | "y" | "sequence"> & {
  direction: CharacterDirection;
  state: CharacterState;
  receivedAt: number;
};

export class InterpolationBuffer {
  private readonly samples: PositionSample[] = [];

  push(player: NetworkPlayer, receivedAt = performance.now()) {
    const last = this.samples.at(-1);
    if (last && player.sequence <= last.sequence) return;
    this.samples.push({ ...player, receivedAt });
    if (this.samples.length > 8) this.samples.shift();
  }

  sample(now = performance.now(), delayMs = 110): PositionSample | null {
    if (this.samples.length === 0) return null;
    const targetTime = now - delayMs;
    while (this.samples.length > 2 && this.samples[1].receivedAt <= targetTime) this.samples.shift();
    const from = this.samples[0];
    const to = this.samples[1];
    if (!to || targetTime <= from.receivedAt) return from;
    const duration = Math.max(1, to.receivedAt - from.receivedAt);
    const amount = Math.min(1, Math.max(0, (targetTime - from.receivedAt) / duration));
    return {
      x: from.x + (to.x - from.x) * amount,
      y: from.y + (to.y - from.y) * amount,
      direction: to.direction,
      state: to.state,
      sequence: to.sequence,
      receivedAt: now,
    };
  }
}
