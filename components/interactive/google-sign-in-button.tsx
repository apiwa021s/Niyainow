"use client";

import { useFormStatus } from "react-dom";

import { Button, type ButtonSize } from "@/components/ui/button";

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
      <path d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.77-5.61-4.14H3.04v2.62A10 10 0 0 0 12 22Z" opacity=".85" />
      <path d="M6.39 13.85A6.02 6.02 0 0 1 6.07 12c0-.64.11-1.27.32-1.85V7.53H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.47l3.35-2.62Z" opacity=".7" />
      <path d="M12 6.01c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.53l3.35 2.62C7.18 7.78 9.39 6.01 12 6.01Z" opacity=".55" />
    </svg>
  );
}

export function GoogleSignInButton({
  label = "ดำเนินการต่อด้วย Google",
  size = "lg",
  className,
  disabled,
}: {
  label?: string;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size={size}
      className={className}
      loading={pending}
      disabled={disabled}
      aria-describedby="auth-provider-note"
    >
      <GoogleMark />
      {pending ? "กำลังเชื่อมต่อ Google" : label}
    </Button>
  );
}
