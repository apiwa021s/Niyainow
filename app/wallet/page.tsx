import type { Metadata } from "next";

import { WalletView } from "@/components/interactive/wallet-view";
import { PageShell } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";
import { getWalletSnapshot } from "@/services/coin-service";

export const metadata: Metadata = { title: "กระเป๋าเหรียญ", robots: { index: false, follow: false } };

export default async function WalletPage() {
  const user = await requireActiveUser("/wallet");
  const wallet = await getWalletSnapshot(user.id);
  return <PageShell><WalletView wallet={wallet} /></PageShell>;
}
