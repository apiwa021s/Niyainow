import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

import { loadEnvConfig } from "@next/env";
import { Server } from "socket.io";

import { verifyWorldTicket, type WorldTicketPayload } from "@/lib/world-ticket";
import { moderateWorldChat } from "@/world/multiplayer/moderation";
import {
  characterDirectionSchema,
  characterStateSchema,
  WORLD_ID,
  worldEmoteSchema,
  type ClientToServerEvents,
  type NetworkPlayer,
  type ServerToClientEvents,
} from "@/world/types";

loadEnvConfig(process.cwd());

type SocketData = {
  ticket: WorldTicketPayload;
  player: NetworkPlayer;
  roomId?: string;
  lastMovementAt: number;
  chatTimestamps: number[];
};

const port = Number.parseInt(process.env.WORLD_SERVER_PORT ?? "3001", 10);
const allowedOrigins = (process.env.WORLD_ALLOWED_ORIGINS ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const httpServer = createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ service: "novelnow-world", status: "ok" }));
});
const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
  transports: ["websocket", "polling"],
  maxHttpBufferSize: 16_384,
  pingTimeout: 20_000,
  pingInterval: 15_000,
});

io.use((socket, next) => {
  try {
    const token = typeof socket.handshake.auth.ticket === "string" ? socket.handshake.auth.ticket : "";
    const ticket = verifyWorldTicket(token);
    socket.data.ticket = ticket;
    socket.data.player = {
      id: ticket.playerId,
      displayName: ticket.displayName,
      title: ticket.title,
      appearance: ticket.appearance,
      x: ticket.x,
      y: ticket.y,
      direction: "NE",
      state: "idle",
      sequence: 0,
    };
    socket.data.lastMovementAt = Date.now();
    socket.data.chatTimestamps = [];
    next();
  } catch {
    next(new Error("WORLD_AUTH_FAILED"));
  }
});

function selectRoom() {
  for (let index = 1; index <= 999; index += 1) {
    const roomId = `${WORLD_ID}:central-${String(index).padStart(3, "0")}`;
    if ((io.sockets.adapter.rooms.get(roomId)?.size ?? 0) < 50) return roomId;
  }
  return null;
}

function publicPlayers(roomId: string, excludePlayerId?: string) {
  return [...(io.sockets.adapter.rooms.get(roomId) ?? [])]
    .map((socketId) => io.sockets.sockets.get(socketId)?.data.player)
    .filter((player): player is NetworkPlayer => Boolean(player && player.id !== excludePlayerId));
}

io.on("connection", (socket) => {
  socket.on("world:join", async ({ requestedWorld }) => {
    if (requestedWorld !== WORLD_ID || socket.data.roomId) return;
    const roomId = selectRoom();
    if (!roomId) {
      socket.emit("world:error", { code: "WORLD_FULL", message: "ทุกห้องกำลังเต็ม กรุณาลองใหม่อีกครั้ง" });
      return;
    }
    socket.data.roomId = roomId;
    await socket.join(roomId);
    socket.emit("world:joined", { roomId: roomId.split(":").at(-1) ?? roomId, players: publicPlayers(roomId, socket.data.player.id) });
    socket.to(roomId).emit("player:joined", socket.data.player);
  });

  socket.on("player:move", (payload) => {
    const roomId = socket.data.roomId;
    if (!roomId || !characterDirectionSchema.safeParse(payload.direction).success || !characterStateSchema.safeParse(payload.state).success) return;
    if (!Number.isFinite(payload.x) || !Number.isFinite(payload.y) || !Number.isSafeInteger(payload.sequence)) return;
    if (payload.sequence <= socket.data.player.sequence) return;

    const now = Date.now();
    const elapsed = Math.min(1, Math.max(0.05, (now - socket.data.lastMovementAt) / 1000));
    const dx = payload.x - socket.data.player.x;
    const dy = payload.y - socket.data.player.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 350 * elapsed + 70) return;

    socket.data.lastMovementAt = now;
    socket.data.player = {
      ...socket.data.player,
      x: Math.min(2320, Math.max(80, payload.x)),
      y: Math.min(1720, Math.max(100, payload.y)),
      direction: payload.direction,
      state: payload.state,
      sequence: payload.sequence,
    };
    socket.to(roomId).emit("player:moved", socket.data.player);
  });

  socket.on("player:state", ({ state }) => {
    const roomId = socket.data.roomId;
    if (!roomId || !characterStateSchema.safeParse(state).success) return;
    socket.data.player = { ...socket.data.player, state };
    socket.to(roomId).emit("player:state", { playerId: socket.data.player.id, state });
  });

  socket.on("player:emote", ({ emote }) => {
    const roomId = socket.data.roomId;
    if (!roomId || !worldEmoteSchema.safeParse(emote).success) return;
    io.to(roomId).emit("player:emote", { playerId: socket.data.player.id, emote });
  });

  socket.on("chat:message", ({ message: rawMessage }) => {
    const roomId = socket.data.roomId;
    if (!roomId || typeof rawMessage !== "string") return;
    const now = Date.now();
    socket.data.chatTimestamps = socket.data.chatTimestamps.filter((timestamp) => now - timestamp < 8_000);
    if (socket.data.chatTimestamps.length >= 4) {
      socket.emit("world:error", { code: "CHAT_RATE_LIMITED", message: "ส่งข้อความเร็วเกินไป กรุณารอสักครู่" });
      return;
    }
    const moderated = moderateWorldChat(rawMessage);
    if (!moderated.allowed) {
      socket.emit("world:error", { code: moderated.reason, message: "ข้อความนี้ไม่สามารถส่งได้" });
      return;
    }
    socket.data.chatTimestamps.push(now);
    io.to(roomId).emit("chat:message", {
      id: randomUUID(),
      playerId: socket.data.player.id,
      displayName: socket.data.player.displayName,
      message: moderated.message,
      sentAt: now,
    });
  });

  const leave = () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.to(roomId).emit("player:left", { playerId: socket.data.player.id });
    void socket.leave(roomId);
    socket.data.roomId = undefined;
  };
  socket.on("world:leave", leave);
  socket.on("disconnect", leave);
});

httpServer.listen(port, () => {
  console.info(`NovelNow World realtime server listening on http://localhost:${port}`);
});

function shutdown() {
  io.close(() => httpServer.close());
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
