"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getCookieConsent, setCookieConsent } from "@/lib/cookies/consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getCookieConsent();
    setVisible(consent === null);
  }, []);

  const accept = useCallback(() => {
    setCookieConsent({ analytics: true });
    setVisible(false);
  }, []);
  const reject = useCallback(() => {
    setCookieConsent({ analytics: false });
    setVisible(false);
  }, []);

  if (!visible) return null;
  return (
    <section
      role="dialog"
      aria-live="polite"
      aria-label="การยอมรับคุกกี้"
      className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-[env(safe-area-inset-bottom)] pt-2"
    >
      <div className="mx-auto mb-4 max-w-5xl rounded-[10px] border border-border/70 bg-background/95 p-4 shadow-[0_18px_55px_-30px_rgba(0,0,0,0.7)] backdrop-blur-sm">
        <p className="text-sm leading-relaxed text-foreground">
          เว็บไซต์ใช้คุกกี้ที่จำเป็นต่อการทำงาน และคุกกี้เชิงวิเคราะห์เพื่อปรับปรุงคุณภาพการใช้งาน อ่านรายละเอียดได้ที่{" "}
          <Link href="/privacy" className="font-semibold underline underline-offset-4">
            นโยบายความเป็นส่วนตัว
          </Link>
          .
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
          onClick={reject}
            className="inline-flex items-center justify-center rounded-[8px] border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-offset-2"
          >
            ปฏิเสธคุกกี้เชิงวิเคราะห์
          </button>
          <button
            type="button"
            onClick={accept}
            className="inline-flex items-center justify-center rounded-[8px] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            ยอมรับคุกกี้ทั้งหมด
          </button>
        </div>
      </div>
    </section>
  );
}
