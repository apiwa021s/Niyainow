"use client";

import Link from "next/link";
import { ShieldAlert, X } from "lucide-react";
import { useSyncExternalStore } from "react";

/**
 * ประกาศเรื่องลิขสิทธิ์ (แสดงครั้งเดียวต่ออุปกรณ์)
 *
 * เป็นแถบแจ้งเตือนที่ปิดได้ ไม่ใช่ modal ขวางทาง เพราะเป็นข้อมูลที่ควรรู้แต่ไม่ต้อง
 * ตอบก่อนใช้งาน เนื้อหาฉบับเต็มอยู่ที่ /copyright ตลอดเวลา แถบนี้จึงเป็นแค่ทางเข้า
 *
 * ขึ้นเวอร์ชันของคีย์เมื่อแก้ข้อความสำคัญ เพื่อให้คนที่เคยปิดไปแล้วเห็นฉบับใหม่
 */
const STORAGE_KEY = "niyainow.copyright-notice.v1";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // แท็บอื่นปิดประกาศไปแล้ว แท็บนี้ก็ควรตามไปด้วย
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// สำรองไว้เมื่อเขียน localStorage ไม่ได้ ไม่งั้นกดปิดแล้วแถบจะไม่ยอมหายไป
let dismissedThisSession = false;

function readDismissed() {
  if (dismissedThisSession) return true;
  try {
    return Boolean(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // โหมดส่วนตัวบางเบราว์เซอร์บล็อก localStorage — ยังแสดงประกาศได้ แค่จำไม่ได้
    return false;
  }
}

// ฝั่ง server ไม่รู้จัก localStorage จึงถือว่า "ปิดแล้ว" ไว้ก่อน แล้วค่อยขึ้นหลัง hydrate
// ไม่งั้นคนที่เคยกดปิดจะเห็นแถบกระพริบทุกครั้งที่โหลดหน้าใหม่
const readDismissedOnServer = () => true;

export function CopyrightNotice() {
  const dismissed = useSyncExternalStore(subscribe, readDismissed, readDismissedOnServer);

  const dismiss = () => {
    dismissedThisSession = true;
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // จำไม่ได้ก็ไม่เป็นไร ประกาศจะกลับมาในการเข้าครั้งหน้า
    }
    for (const listener of listeners) listener();
  };

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="ประกาศเรื่องลิขสิทธิ์"
      // มือถือ: ลอยเหนือ bottom nav และแถบคำสั่งของหน้านิยาย · จอใหญ่: การ์ดมุมขวาล่าง
      className="fixed inset-x-3 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-[16px] border border-border bg-background/95 p-4 shadow-[var(--sh-3)] backdrop-blur-xl sm:inset-x-auto sm:right-5 sm:mx-0 lg:bottom-5"
    >
      <div className="flex gap-3">
        <span aria-hidden className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--brand-primary)]/12 text-[var(--brand-light-on-light)]">
          <ShieldAlert className="h-5 w-5" />
        </span>

        <div className="min-w-0">
          <p className="text-sm font-semibold">NiyaiThai เคารพลิขสิทธิ์ของผู้สร้างสรรค์</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            เราไม่เผยแพร่งานที่ยังมีลิขสิทธิ์ในประเทศไทย หากพบเนื้อหาที่ละเมิดสิทธิ์ของคุณ แจ้งเราได้ทันที
            ทีมงานจะตรวจสอบและนำออกโดยเร็วที่สุด
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href="/copyright"
              onClick={dismiss}
              className="flex h-10 items-center rounded-[10px] bg-[image:var(--grad-primary)] px-4 text-sm font-semibold text-white"
            >
              วิธีแจ้งเนื้อหาละเมิด
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="flex h-10 items-center rounded-[10px] px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              รับทราบแล้ว
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="ปิดประกาศ"
          className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center self-start rounded-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
