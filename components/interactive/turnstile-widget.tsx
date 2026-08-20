"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { GoogleSignInButton } from "@/components/interactive/auth-form";
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
}: {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire: () => void;
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
        "error-callback": onExpire,
      });
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", renderWidget);
      } else {
        const script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.addEventListener("load", renderWidget);
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onVerify, onExpire]);

  return <div ref={containerRef} className="min-h-16.25" />;
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
  const clearToken = useCallback(() => setToken(""), []);

  if (!siteKey) {
    return <GoogleSignInButton label={label} size={size} className={className} />;
  }

  return (
    <div className="grid gap-3">
      <TurnstileWidget siteKey={siteKey} onVerify={setToken} onExpire={clearToken} />
      <input type="hidden" name="cf-turnstile-response" value={token} />
      <GoogleSignInButton label={label} size={size} className={className} disabled={!token} />
    </div>
  );
}
