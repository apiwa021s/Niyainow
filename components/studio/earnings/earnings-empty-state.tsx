import { Coins, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/studio/studio-ui";
import { ButtonLink } from "@/components/ui/button";

/**
 * Two distinct empty states (spec §35) — a writer who hasn't set up paid
 * chapters yet needs a next step; one who has just needs reassurance that
 * the wait is normal, not a call to action they've already taken.
 */
export function EarningsEmptyState({ hasPaidChapters }: { hasPaidChapters: boolean }) {
  if (hasPaidChapters) {
    return (
      <EmptyState
        icon={Sparkles}
        title="ตอนแบบใช้ Coins ของคุณพร้อมแล้ว"
        description="เมื่อมีคนปลดล็อกตอน คุณจะเห็นรายได้และข้อมูลที่นี่"
      />
    );
  }

  return (
    <EmptyState
      icon={Coins}
      title="ยังไม่มีรายได้"
      description="เมื่อมีผู้อ่านปลดล็อกตอนแบบใช้ Coins รายได้ของคุณจะแสดงที่นี่"
      action={
        <ButtonLink href="/studio/works" variant="primary">
          ดูวิธีตั้งราคาตอน
        </ButtonLink>
      }
    />
  );
}
