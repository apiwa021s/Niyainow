"use client";

import { io, type Socket } from "socket.io-client";

import type { ClientToServerEvents, ServerToClientEvents } from "@/world/types";

export type WorldSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

async function requestTicket() {
  const response = await fetch("/api/world/ticket", {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("WORLD_TICKET_FAILED");
  const payload = await response.json() as { data?: { ticket?: string } };
  if (!payload.data?.ticket) throw new Error("WORLD_TICKET_MISSING");
  return payload.data.ticket;
}

export function createWorldSocket(): WorldSocket {
  const socketUrl = process.env.NEXT_PUBLIC_WORLD_SOCKET_URL
    ?? (process.env.NODE_ENV === "development" ? "http://localhost:3001" : window.location.origin);
  return io(socketUrl, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 8_000,
    timeout: 8_000,
    auth: async (callback) => {
      try {
        callback({ ticket: await requestTicket() });
      } catch {
        callback({ ticket: "" });
      }
    },
  }) as WorldSocket;
}
