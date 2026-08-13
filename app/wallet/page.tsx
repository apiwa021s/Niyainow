import type { Metadata } from "next";
import { WalletView } from "@/components/interactive/wallet-view";
import { PageShell } from "@/components/ui/section";
import { coinPackages } from "@/data/mock-data";

export const metadata: Metadata = {
  title: "เหรียญและการเติมเงิน",
  description: "ดูยอดเหรียญคงเหลือ เลือกแพ็กเกจเติมเหรียญ และดูประวัติการใช้เหรียญ"
};

export default function WalletPage() {
  return (
    <PageShell>
      <WalletView packages={coinPackages} />
    </PageShell>
  );
}
