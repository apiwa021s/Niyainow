import type { Metadata } from "next";

import { CoinTopUpView } from "@/components/interactive/coin-top-up-view";
import { PageShell } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "เติมเหรียญ NN",
  description: "เลือกแพ็กเกจเหรียญ NovelNow สำหรับปลดล็อกตอนนิยาย",
  robots: { index: false, follow: false },
};

export default async function CoinTopUpPage() {
  await requireActiveUser("/wallet/top-up");

  return (
    <PageShell className="max-w-6xl">
      <CoinTopUpView />
    </PageShell>
  );
}
