"use client";

import { Check, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { notifyLocalMockStores, useLocalMockStore } from "@/hooks/use-local-mock-store";

const STORAGE_KEY = "niyainow-writer-follows-v1";

function readFollowed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function writeFollowed(next: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // Mock-only preference; safe to skip when storage is unavailable.
  }
  notifyLocalMockStores();
}

/**
 * "Follow Writer" is deliberately separate from "Follow Story" (module 87–88):
 * following the writer means "notify me about new works/posts", not "this
 * story". No writer backend exists yet, so this is a local-only mock toggle.
 */
export function WriterFollowButton({ authorName }: { authorName: string }) {
  const followed = useLocalMockStore(() => readFollowed().has(authorName), () => false);

  function toggle() {
    const next = readFollowed();
    if (next.has(authorName)) next.delete(authorName);
    else next.add(authorName);
    writeFollowed(next);
  }

  return (
    <Button
      type="button"
      variant={followed ? "secondary" : "outline"}
      size="sm"
      onClick={toggle}
      aria-pressed={followed}
    >
      {followed ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {followed ? `กำลังติดตาม ${authorName}` : `ติดตาม ${authorName}`}
    </Button>
  );
}
