import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { isWriterModeEnabled } from "@/lib/features/writer-mode";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function CreatorApplyLayout({ children }: { children: ReactNode }) {
  if (!isWriterModeEnabled()) notFound();
  return children;
}
