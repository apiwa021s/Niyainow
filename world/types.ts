import { z } from "zod";

export const WORLD_ID = "novelnow-central" as const;
export const WORLD_INSTANCE_PREFIX = "central" as const;

export const characterDirectionSchema = z.enum(["NE", "NW", "SE", "SW"]);
export const characterStateSchema = z.enum(["idle", "walk", "run", "sit", "wave", "read"]);
export const worldEmoteSchema = z.enum(["wave", "heart", "laugh", "surprise", "book", "sparkle"]);

export const worldCharacterAppearanceSchema = z.object({
  bodyPreset: z.enum(["classic", "slender", "athletic"]),
  skinTone: z.enum(["porcelain", "warm", "golden", "deep"]),
  faceId: z.enum(["gentle", "bright", "calm"]),
  eyeId: z.enum(["round", "soft", "sharp"]),
  hairId: z.enum(["page", "bob", "long", "wave"]),
  hairColor: z.enum(["ink", "chestnut", "ash", "rose"]),
  topId: z.enum(["academy", "cardigan", "blouse"]),
  bottomId: z.enum(["tailored", "pleated", "relaxed"]),
  shoesId: z.enum(["loafers", "boots", "sneakers"]),
  accessoryIds: z.array(z.enum(["glasses", "ribbon", "earring", "satchel"])).max(2),
});

export const worldCharacterInputSchema = worldCharacterAppearanceSchema.extend({
  displayName: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .regex(/^[\p{L}\p{M}\p{N} _-]+$/u, "Name contains unsupported characters"),
});

export type WorldCharacterAppearance = z.infer<typeof worldCharacterAppearanceSchema>;
export type CharacterDirection = z.infer<typeof characterDirectionSchema>;
export type CharacterState = z.infer<typeof characterStateSchema>;
export type WorldEmote = z.infer<typeof worldEmoteSchema>;

export type WorldCharacter = WorldCharacterAppearance & {
  id: string;
  userId: string;
  displayName: string;
  title?: string;
  currentWorld: string;
  x: number;
  y: number;
  introCompleted: boolean;
};

export const worldObjectTypeSchema = z.enum([
  "building",
  "prop",
  "tree",
  "decoration",
  "portal",
  "trigger",
  "seating",
  "novel-display",
  "community-display",
  "spawn",
]);

export const worldInteractionSchema = z.object({
  type: z.enum(["portal", "novel", "seat", "building", "player", "community"]),
  label: z.string().min(1).max(80),
  target: z.string().min(1).max(120).optional(),
  radius: z.number().positive().max(400).default(120),
});

export const worldObjectSchema = z.object({
  id: z.string().min(1),
  type: worldObjectTypeSchema,
  asset: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  depthOffset: z.number().default(0),
  collision: z.boolean().default(false),
  interaction: worldInteractionSchema.optional(),
  variant: z.string().optional(),
});

export const worldMapSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  spawn: z.object({ x: z.number(), y: z.number() }),
  objects: z.array(worldObjectSchema),
});

export type WorldMap = z.infer<typeof worldMapSchema>;
export type WorldObject = z.infer<typeof worldObjectSchema>;
export type WorldInteraction = z.infer<typeof worldInteractionSchema> & { id: string; x: number; y: number };

export type WorldNovel = {
  id: string;
  slug: string;
  title: string;
  author: string;
  cover: string;
  synopsis: string;
  chapters: number;
  status: "ongoing" | "completed" | "hiatus";
  readHref: string;
  progress?: number;
  chapterLabel?: string;
};

export type WorldCatalog = {
  trending: WorldNovel[];
  continueReading: WorldNovel[];
  followed: WorldNovel[];
  recommendations: WorldNovel[];
};

export type NetworkPlayer = {
  id: string;
  displayName: string;
  title?: string;
  appearance: WorldCharacterAppearance;
  x: number;
  y: number;
  direction: CharacterDirection;
  state: CharacterState;
  sequence: number;
};

export type WorldChatMessage = {
  id: string;
  playerId: string;
  displayName: string;
  message: string;
  sentAt: number;
};

export type WorldConnectionState = "connecting" | "connected" | "reconnecting" | "offline";

export type ClientToServerEvents = {
  "world:join": (payload: { requestedWorld: string }) => void;
  "world:leave": () => void;
  "player:move": (payload: Pick<NetworkPlayer, "x" | "y" | "direction" | "state" | "sequence">) => void;
  "player:state": (payload: { state: CharacterState }) => void;
  "player:emote": (payload: { emote: WorldEmote }) => void;
  "chat:message": (payload: { message: string }) => void;
};

export type ServerToClientEvents = {
  "world:joined": (payload: { roomId: string; players: NetworkPlayer[] }) => void;
  "world:error": (payload: { code: string; message: string }) => void;
  "player:joined": (player: NetworkPlayer) => void;
  "player:left": (payload: { playerId: string }) => void;
  "player:moved": (player: NetworkPlayer) => void;
  "player:state": (payload: { playerId: string; state: CharacterState }) => void;
  "player:emote": (payload: { playerId: string; emote: WorldEmote }) => void;
  "chat:message": (message: WorldChatMessage) => void;
};

export const DEFAULT_CHARACTER_APPEARANCE: WorldCharacterAppearance = {
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
};
