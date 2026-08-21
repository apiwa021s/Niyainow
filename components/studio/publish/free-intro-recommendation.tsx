import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

/** A suggestion, never a gate (spec §19) — the writer can dismiss it and keep publishing paid. */
export function FreeIntroRecommendation({
  onSwitchToFree,
  onDismiss,
}: {
  onSwitchToFree: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-xl bg-accent-subtle p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-emphasis)]">
        <Sparkles aria-hidden className="h-4 w-4" />
        แนะนำ
      </p>
      <p className="text-sm leading-7 text-(--text-secondary)">
        เรื่องใหม่ที่เปิดให้อ่านฟรีบางตอน มักช่วยให้ผู้อ่านตัดสินใจติดตามได้ง่ายขึ้น
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="sm" onClick={onSwitchToFree}>
          เปลี่ยนเป็นอ่านฟรี
        </Button>
        <button type="button" onClick={onDismiss} className="text-sm font-medium text-(--text-secondary) underline-offset-4 hover:underline">
          เผยแพร่แบบใช้ Coins ต่อ
        </button>
      </div>
    </div>
  );
}
