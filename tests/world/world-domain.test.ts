import { describe, expect, it } from "vitest";

import { issueWorldTicket, verifyWorldTicket } from "@/lib/world-ticket";
import centralMap from "@/world/maps/central-plaza.json";
import { InterpolationBuffer } from "@/world/multiplayer/interpolation";
import { moderateWorldChat, WORLD_CHAT_MAX_LENGTH } from "@/world/multiplayer/moderation";
import { DEFAULT_CHARACTER_APPEARANCE, worldCharacterInputSchema, worldMapSchema } from "@/world/types";

describe("NovelNow World domain", () => {
  it("validates the data-driven Central Plaza map", () => {
    const parsed = worldMapSchema.parse(centralMap);
    expect(parsed.id).toBe("novelnow-central");
    expect(parsed.objects.some((object) => object.id === "grand-library" && object.interaction?.type === "building")).toBe(true);
    expect(parsed.objects.every((object) => object.x >= 0 && object.y >= 0)).toBe(true);
  });

  it("accepts the bounded layered character configuration", () => {
    expect(worldCharacterInputSchema.safeParse({ displayName: "นักอ่านราตรี", ...DEFAULT_CHARACTER_APPEARANCE }).success).toBe(true);
    expect(worldCharacterInputSchema.safeParse({ displayName: "<script>", ...DEFAULT_CHARACTER_APPEARANCE }).success).toBe(false);
  });

  it("signs and rejects tampered realtime entry tickets", () => {
    const env = { ...process.env, AUTH_SECRET: "a-secure-test-secret-that-is-long-enough" };
    const ticket = issueWorldTicket({
      playerId: "00000000-0000-4000-8000-000000000001",
      displayName: "NightReader",
      appearance: DEFAULT_CHARACTER_APPEARANCE,
      worldId: "novelnow-central",
      x: 1200,
      y: 1260,
    }, env);
    expect(verifyWorldTicket(ticket, env).displayName).toBe("NightReader");
    expect(() => verifyWorldTicket(`${ticket}x`, env)).toThrow("Invalid world ticket");
  });

  it("moderates links and enforces message length", () => {
    expect(moderateWorldChat("  สวัสดี   นักอ่าน  ")).toEqual({ allowed: true, message: "สวัสดี นักอ่าน" });
    expect(moderateWorldChat("ดู https://example.com ตอนนี้")).toEqual({ allowed: true, message: "ดู [ลิงก์ถูกซ่อน] ตอนนี้" });
    expect(moderateWorldChat("x".repeat(WORLD_CHAT_MAX_LENGTH + 1)).allowed).toBe(false);
  });

  it("interpolates remote movement instead of snapping", () => {
    const buffer = new InterpolationBuffer();
    buffer.push({ id: "p", displayName: "P", appearance: DEFAULT_CHARACTER_APPEARANCE, x: 100, y: 100, direction: "NE", state: "walk", sequence: 1 }, 1_000);
    buffer.push({ id: "p", displayName: "P", appearance: DEFAULT_CHARACTER_APPEARANCE, x: 200, y: 160, direction: "SE", state: "walk", sequence: 2 }, 1_200);
    const sample = buffer.sample(1_210, 110);
    expect(sample?.x).toBe(150);
    expect(sample?.y).toBe(130);
  });
});
