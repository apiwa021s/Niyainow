"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/dal";
import { logger } from "@/lib/logger";
import { unlockChapterWithCoins } from "@/services/coin-service";

const unlockInputSchema = z.object({
  novelSlug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  chapterNumber: z.coerce.number().finite().min(0).max(99_999_999.99),
  expectedPrice: z.coerce.number().int().positive().max(1_000_000),
});

export type UnlockChapterActionState = {
  status: "idle" | "auth-required" | "account-disabled" | "price-changed" | "insufficient-balance" | "error";
  message?: string;
  balance?: number;
  currentPrice?: number;
};

export async function unlockChapterAction(
  _previousState: UnlockChapterActionState,
  formData: FormData,
): Promise<UnlockChapterActionState> {
  const parsed = unlockInputSchema.safeParse({
    novelSlug: formData.get("novelSlug"),
    chapterNumber: formData.get("chapterNumber"),
    expectedPrice: formData.get("expectedPrice"),
  });
  if (!parsed.success) return { status: "error", message: "ข้อมูลตอนหรือราคาไม่ถูกต้อง กรุณารีเฟรชหน้าแล้วลองใหม่" };

  const user = await getCurrentUser();
  if (!user) return { status: "auth-required", message: "กรุณาเข้าสู่ระบบก่อนปลดล็อกตอน" };
  if (user.status !== "ACTIVE") return { status: "account-disabled", message: "บัญชีนี้ไม่สามารถใช้เหรียญได้" };

  let result: Awaited<ReturnType<typeof unlockChapterWithCoins>>;
  try {
    result = await unlockChapterWithCoins({ userId: user.id, ...parsed.data });
    if (result.kind === "not-found") {
      return { status: "error", message: "ไม่พบตอนที่เผยแพร่แล้ว กรุณารีเฟรชหน้า" };
    }
    if (result.kind === "not-purchasable") {
      return { status: "error", message: "ตอนนี้ไม่เปิดให้ปลดล็อกด้วย Coins" };
    }
    if (result.kind === "price-changed") {
      return {
        status: "price-changed",
        message: `ราคาตอนเปลี่ยนเป็น ${result.price.toLocaleString("th-TH")} เหรียญ กรุณาตรวจสอบและยืนยันอีกครั้ง`,
        balance: result.balance,
        currentPrice: result.price,
      };
    }
    if (result.kind === "insufficient-balance") {
      return {
        status: "insufficient-balance",
        message: `เหรียญไม่พอ ต้องการ ${result.price.toLocaleString("th-TH")} เหรียญ`,
        balance: result.balance,
        currentPrice: result.price,
      };
    }

  } catch (error) {
    logger.error("Chapter coin unlock failed", {
      error,
      userId: user.id,
      novelSlug: parsed.data.novelSlug,
      chapterNumber: parsed.data.chapterNumber,
    });
    return { status: "error", message: "ปลดล็อกไม่สำเร็จและยังไม่ตัดเหรียญ กรุณาลองอีกครั้ง" };
  }

  const destination = `/novel/${parsed.data.novelSlug}/chapter/${parsed.data.chapterNumber}`;
  revalidatePath(destination);
  revalidatePath(`/novel/${parsed.data.novelSlug}/chapters`);
  revalidatePath("/wallet");
  redirect(destination);
}
