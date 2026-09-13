import type * as Phaser from "phaser";

import { WORLD_MOVEMENT_BROADCAST_INTERVAL_MS } from "@/world/cost-controls";
import type { WorldGameBridge } from "@/world/engine/bridge";
import { RemotePlayer } from "@/world/entities/RemotePlayer";
import type { Player } from "@/world/entities/Player";
import { createWorldSocket, type WorldSocket } from "@/world/multiplayer/socket";
import type { CharacterDirection, CharacterState, NetworkPlayer, WorldEmote } from "@/world/types";
import { WORLD_ID } from "@/world/types";

export class PresenceSystem {
  private readonly remotePlayers = new Map<string, RemotePlayer>();
  private socket: WorldSocket | null = null;
  private sequence = 0;
  private lastSentAt = 0;
  private lastSent = { x: Number.NaN, y: Number.NaN, state: "idle" as CharacterState };
  private readonly handleVisibilityChange = () => {
    if (!this.socket) return;
    if (document.visibilityState === "hidden") {
      this.socket.disconnect();
      return;
    }
    if (!this.socket.connected) {
      this.bridge.onConnection("connecting");
      this.socket.connect();
    }
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly localPlayer: Player,
    private readonly bridge: WorldGameBridge,
  ) {}

  connect() {
    this.bridge.onConnection("connecting");
    const socket = createWorldSocket();
    this.socket = socket;
    socket.on("connect", () => {
      this.bridge.onConnection("connected");
      socket.emit("world:join", { requestedWorld: WORLD_ID });
    });
    socket.on("disconnect", () => {
      this.bridge.onConnection(socket.active ? "reconnecting" : "offline");
      this.clearRemotePlayers();
    });
    socket.io.on("reconnect_attempt", () => this.bridge.onConnection("reconnecting"));
    socket.on("connect_error", () => this.bridge.onConnection("offline"));
    socket.on("world:error", ({ message }) => this.bridge.onError(message));
    socket.on("world:joined", ({ roomId, players }) => {
      this.clearRemotePlayers();
      players.forEach((player) => this.addRemotePlayer(player));
      this.bridge.onRoom(roomId);
      this.reportCount();
    });
    socket.on("player:joined", (player) => {
      this.addRemotePlayer(player);
      this.reportCount();
    });
    socket.on("player:left", ({ playerId }) => {
      this.remotePlayers.get(playerId)?.destroy(true);
      this.remotePlayers.delete(playerId);
      this.reportCount();
    });
    socket.on("player:moved", (player) => {
      const remote = this.remotePlayers.get(player.id) ?? this.addRemotePlayer(player);
      remote.push(player);
    });
    socket.on("player:state", ({ playerId, state }) => {
      const remote = this.remotePlayers.get(playerId);
      if (remote) remote.setMotion(state);
    });
    socket.on("player:emote", ({ playerId, emote }) => {
      const player = playerId === this.localPlayer.playerId ? this.localPlayer : this.remotePlayers.get(playerId);
      player?.showEmote(emote);
    });
    socket.on("chat:message", (message) => {
      const player = message.playerId === this.localPlayer.playerId ? this.localPlayer : this.remotePlayers.get(message.playerId);
      player?.showSpeech(message.message);
      this.bridge.onChat(message);
    });
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    if (document.visibilityState === "visible") socket.connect();
    else this.bridge.onConnection("offline");
  }

  private addRemotePlayer(player: NetworkPlayer) {
    const existing = this.remotePlayers.get(player.id);
    if (existing) return existing;
    const remote = new RemotePlayer(this.scene, player);
    this.remotePlayers.set(player.id, remote);
    return remote;
  }

  private reportCount() {
    this.bridge.onPlayerCount(this.remotePlayers.size + 1);
  }

  update(delta: number, state: CharacterState, direction: CharacterDirection) {
    this.remotePlayers.forEach((player) => player.update(delta));
    const now = performance.now();
    const moved = Math.hypot(this.localPlayer.x - this.lastSent.x, this.localPlayer.y - this.lastSent.y) > 2;
    const stateChanged = state !== this.lastSent.state;
    if (!this.socket?.connected || now - this.lastSentAt < WORLD_MOVEMENT_BROADCAST_INTERVAL_MS || (!moved && !stateChanged)) return;
    this.lastSentAt = now;
    this.lastSent = { x: this.localPlayer.x, y: this.localPlayer.y, state };
    this.sequence += 1;
    this.socket.emit("player:move", { x: this.localPlayer.x, y: this.localPlayer.y, direction, state, sequence: this.sequence });
  }

  sendChat(message: string) {
    if (!this.socket?.connected) {
      this.bridge.onError("แชตยังไม่เชื่อมต่อ แต่คุณยังสำรวจโลกแบบออฟไลน์ได้");
      return;
    }
    this.socket.emit("chat:message", { message });
  }

  sendEmote(emote: WorldEmote) {
    if (this.socket?.connected) this.socket.emit("player:emote", { emote });
    else this.localPlayer.showEmote(emote);
  }

  private clearRemotePlayers() {
    this.remotePlayers.forEach((player) => player.destroy(true));
    this.remotePlayers.clear();
    this.reportCount();
  }

  destroy() {
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    if (this.socket) {
      this.socket.emit("world:leave");
      this.socket.removeAllListeners();
      this.socket.io.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.clearRemotePlayers();
  }
}
