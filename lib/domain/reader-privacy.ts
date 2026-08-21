/**
 * Reader privacy preferences (brief §Module 19 / 85–86). No account-level
 * privacy columns exist yet, so this is a local-only mock — defaults lean
 * private, matching principle §102 "Privacy by Design".
 */
import { notifyLocalMockStores } from "@/hooks/use-local-mock-store";

const STORAGE_KEY = "niyainow-privacy-v1";

export type PrivacyPrefs = {
  privateReadingHistory: boolean;
  privateLibrary: boolean;
  discreetNotifications: boolean;
};

export const DEFAULT_PRIVACY_PREFS: PrivacyPrefs = {
  privateReadingHistory: true,
  privateLibrary: true,
  discreetNotifications: true,
};

export function readPrivacyPrefs(): PrivacyPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PRIVACY_PREFS, ...(JSON.parse(raw) as Partial<PrivacyPrefs>) } : DEFAULT_PRIVACY_PREFS;
  } catch {
    return DEFAULT_PRIVACY_PREFS;
  }
}

export function writePrivacyPrefs(next: PrivacyPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Mock-only preference; safe to skip when storage is unavailable.
  }
  notifyLocalMockStores();
}
