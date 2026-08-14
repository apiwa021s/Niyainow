import type { Metadata } from "next";

import { WalletView } from "@/components/interactive/wallet-view";
import { PageShell } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "ระบบชำระเงิน",
  description: "สถานะระบบชำระเงินของ NiyaiNow",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function WalletPage() {
  await requireActiveUser("/wallet");
  return <PageShell><WalletView /></PageShell>;
}
