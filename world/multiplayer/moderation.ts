export const WORLD_CHAT_MAX_LENGTH = 180;

const blockedPatterns = [
  /https?:\/\/\S+/giu,
  /\b(?:discord\.gg|t\.me)\/\S+/giu,
];

export function moderateWorldChat(raw: string) {
  const normalized = raw.normalize("NFKC").replace(/[\u0000-\u001F\u007F]/gu, " ").replace(/\s+/gu, " ").trim();
  if (!normalized) return { allowed: false as const, reason: "EMPTY_MESSAGE" };
  if (normalized.length > WORLD_CHAT_MAX_LENGTH) return { allowed: false as const, reason: "MESSAGE_TOO_LONG" };
  const message = blockedPatterns.reduce((value, pattern) => value.replace(pattern, "[ลิงก์ถูกซ่อน]"), normalized);
  return { allowed: true as const, message };
}
