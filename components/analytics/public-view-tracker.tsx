"use client";

import { useEffect } from "react";

function bangkokDay() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function sessionToken(storage: Storage) {
  const key = "niyainow:view-client:v1";
  const existing = storage.getItem(key);
  if (existing) return existing;
  const token = crypto.randomUUID();
  storage.setItem(key, token);
  return token;
}

/** Emits aggregate-only telemetry; chapter text and reading position never leave the page. */
export function PublicViewTracker({ slug, chapterNumber }: { slug: string; chapterNumber?: number }) {
  useEffect(() => {
    let storage: Storage;
    try {
      storage = window.sessionStorage;
    } catch {
      return;
    }

    const resource = chapterNumber === undefined ? "novel" : `chapter:${chapterNumber}`;
    const eventKey = `niyainow:view:v1:${bangkokDay()}:${slug}:${resource}`;
    if (storage.getItem(eventKey)) return;

    let clientToken: string;
    try {
      clientToken = sessionToken(storage);
      storage.setItem(eventKey, "pending");
    } catch {
      return;
    }

    void fetch("/api/events/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, chapterNumber, clientToken }),
      credentials: "same-origin",
      keepalive: true,
    }).then((response) => {
      if (response.ok) storage.setItem(eventKey, "recorded");
      else storage.removeItem(eventKey);
    }).catch(() => {
      storage.removeItem(eventKey);
    });
  }, [chapterNumber, slug]);

  return null;
}
