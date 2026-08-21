/**
 * Local-only mock store for "joined" writer memberships (brief §69–72, §78).
 * No billing backend exists yet, so join/cancel state lives in localStorage,
 * denormalized enough (title/cover/author) that the Library "Membership" tab
 * can render a list without an extra fetch.
 */
import { notifyLocalMockStores } from "@/hooks/use-local-mock-store";

const STORAGE_KEY = "niyainow-memberships-v1";

export type MembershipRecord = {
  novelSlug: string;
  novelTitle: string;
  novelCover: string;
  author: string;
  membershipName: string;
  priceLabel: string;
  joinedAt: number;
  cancelPending?: boolean;
};

export function readMemberships(): Record<string, MembershipRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, MembershipRecord>) : {};
  } catch {
    return {};
  }
}

export function writeMemberships(next: Record<string, MembershipRecord>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Mock-only state; safe to skip when storage is unavailable.
  }
  notifyLocalMockStores();
}
