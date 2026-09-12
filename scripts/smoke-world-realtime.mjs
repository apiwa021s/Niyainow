import { createHmac } from "node:crypto";

import { io } from "socket.io-client";

const secret = process.env.AUTH_SECRET;
if (!secret || secret.length < 32) throw new Error("AUTH_SECRET is required for the realtime smoke test");
const socketUrl = process.env.WORLD_SMOKE_URL ?? "http://localhost:3001";
const now = Math.floor(Date.now() / 1_000);
const payload = {
  version: 1,
  playerId: "00000000-0000-4000-8000-000000000009",
  displayName: "SmokeReader",
  appearance: {
    bodyPreset: "classic",
    skinTone: "warm",
    faceId: "gentle",
    eyeId: "soft",
    hairId: "page",
    hairColor: "ink",
    topId: "academy",
    bottomId: "tailored",
    shoesId: "loafers",
    accessoryIds: [],
  },
  worldId: "novelnow-central",
  x: 1200,
  y: 1260,
  issuedAt: now,
  expiresAt: now + 300,
};
const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
const socket = io(socketUrl, { transports: ["websocket"], auth: { ticket: `${encoded}.${signature}` } });
const timeout = setTimeout(() => {
  console.error("Realtime smoke test timed out");
  socket.close();
  process.exitCode = 1;
}, 5_000);

socket.on("connect_error", (error) => {
  clearTimeout(timeout);
  console.error("Realtime smoke test connection failed", error.message);
  socket.close();
  process.exitCode = 1;
});
socket.on("connect", () => socket.emit("world:join", { requestedWorld: "novelnow-central" }));
socket.on("world:joined", ({ roomId, players }) => {
  console.info(`Joined ${roomId}; ${players.length} other player(s)`);
  socket.emit("chat:message", { message: "สวัสดีจาก realtime smoke test" });
});
socket.on("chat:message", (message) => {
  clearTimeout(timeout);
  console.info(`Chat round trip: ${message.displayName}: ${message.message}`);
  socket.close();
});
