"use client";

import { CircleAlert, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { GoogleSignInButton } from "@/components/interactive/google-sign-in-button";
import type { ButtonSize } from "@/components/ui/button";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  onReady,
  onError,
}: {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire: () => void;
  onReady: () => void;
  onError: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || widgetIdRef.current || !containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onVerify,
        "expired-callback": onExpire,
        "error-callback": onError,
      });
      onReady();
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", renderWidget);
        existing.addEventListener("error", onError);
      } else {
        const script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.addEventListener("load", renderWidget);
        script.addEventListener("error", onError);
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      existing?.removeEventListener("load", renderWidget);
      existing?.removeEventListener("error", onError);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onVerify, onExpire, onReady, onError]);

  return <div ref={containerRef} className="min-h-16.25 overflow-hidden" />;
}

/**
 * Gates the Google button behind a Turnstile check when a site key is set. The
 * server verifies the token again, so a bypassed widget still cannot sign in.
 */
export function TurnstileGate({
  label,
  size,
  className,
}: {
  label?: string;
  size?: ButtonSize;
  className?: string;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "verified" | "expired" | "error">("loading");
  const handleVerify = useCallback((value: string) => {
    setToken(value);
    setStatus("verified");
  }, []);
  const handleExpire = useCallback(() => {
    setToken("");
    setStatus("expired");
  }, []);
  const handleError = useCallback(() => {
    setToken("");
    setStatus("error");
  }, []);
  const handleReady = useCallback(() => setStatus((current) => current === "verified" ? current : "ready"), []);

  if (!siteKey) {
    return <GoogleSignInButton label={label} size={size} className={className} />;
  }

  return (
    <div className="grid gap-3">
      <TurnstileWidget
        siteKey={siteKey}
        onVerify={handleVerify}
        onExpire={handleExpire}
        onReady={handleReady}
        onError={handleError}
      />
      <input type="hidden" name="cf-turnstile-response" value={token} />
      <div aria-live="polite" className="min-h-5 text-xs leading-5">
        {status === "loading" ? <p className="text-muted-foreground">กำลังโหลดการตรวจสอบความปลอดภัย…</p> : null}
        {status === "verified" ? (
          <p className="flex items-center gap-1.5 text-[var(--success)]">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            พร้อมเข้าสู่ระบบ
          </p>
        ) : null}
        {status === "expired" ? (
          <p className="flex items-center gap-1.5 text-[var(--warning)]">
            <CircleAlert className="h-3.5 w-3.5" aria-hidden />
            การตรวจสอบหมดอายุ กรุณายืนยันอีกครั้ง
          </p>
        ) : null}
        {status === "error" ? (
          <p role="alert" className="flex items-center gap-1.5 text-destructive">
            <CircleAlert className="h-3.5 w-3.5" aria-hidden />
            โหลดการตรวจสอบไม่สำเร็จ กรุณารีเฟรชหน้าแล้วลองใหม่
          </p>
        ) : null}
      </div>
      <GoogleSignInButton label={label} size={size} className={className} disabled={!token} />
    </div>
  );
}
