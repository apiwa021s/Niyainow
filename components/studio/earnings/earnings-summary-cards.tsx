import { Coins, Unlock, Users, Wallet } from "lucide-react";

import { baht, whole } from "@/components/studio/mock-data";
import { StatTile } from "@/components/studio/studio-ui";

/** The four numbers spec §14 asks for — never more (spec §44). */
export function EarningsSummaryCards({
  monthlyEarnings,
  monthlyEarningsChange,
  monthlyUnlocks,
  monthlyUnlocksChange,
  uniqueBuyers,
  lifetimeEarnings,
}: {
  monthlyEarnings: number;
  monthlyEarningsChange: number;
  monthlyUnlocks: number;
  monthlyUnlocksChange: number;
  uniqueBuyers: number;
  lifetimeEarnings: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        icon={Coins}
        label="รายได้เดือนนี้"
        value={baht.format(monthlyEarnings)}
        unit="บาท"
        change={monthlyEarningsChange}
        tone="money"
      />
      <StatTile
        icon={Unlock}
        label="การปลดล็อก"
        value={whole.format(monthlyUnlocks)}
        unit="ครั้ง"
        change={monthlyUnlocksChange}
        changeNote="ยอดปลดล็อกผันผวนตามช่วงเดือนเป็นปกติ"
      />
      <StatTile icon={Users} label="ผู้อ่านที่ซื้อ" value={whole.format(uniqueBuyers)} unit="คน" />
      <StatTile icon={Wallet} label="รายได้สะสม" value={baht.format(lifetimeEarnings)} unit="บาท" />
    </div>
  );
}
