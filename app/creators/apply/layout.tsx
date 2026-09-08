import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { isWriterModeEnabled } from "@/lib/features/writer-mode";

export default function CreatorApplyLayout({ children }: { children: ReactNode }) {
  if (!isWriterModeEnabled()) notFound();
  return children;
}
