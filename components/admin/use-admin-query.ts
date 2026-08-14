"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * เก็บค่าตัวกรองของหน้าไว้ใน state และ sync ขึ้น URL
 * ทำแบบเดียวกับหน้า /novels ฝั่งผู้อ่าน — แอดมินจะได้ก๊อปลิงก์ตัวกรองส่งต่อในทีมได้
 * ค่า "all" กับค่าว่างไม่ถูกใส่ลง URL เพื่อให้ลิงก์สั้นและอ่านออก
 *
 * ค่าทุกตัวเก็บเป็น string ล้วน (ไม่ใช่ union แคบ ๆ ของแต่ละหน้า) เพราะค่าที่มาจาก
 * <select> เป็น string เสมอ — ให้ฝั่งที่เรียก service เป็นคนแปลงกลับเป็นชนิดที่แคบลง
 */
export function useAdminQuery<K extends string>(basePath: string, initial: Record<K, string | undefined>) {
  const router = useRouter();
  const [query, setQueryState] = useState<Record<K, string | undefined>>(initial);
  const [isPending, startTransition] = useTransition();

  function setQuery(patch: Partial<Record<K, string | undefined>>) {
    const next = { ...query, ...patch };
    setQueryState(next);

    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, String(value));
    });

    startTransition(() => {
      router.replace(params.size ? `${basePath}?${params.toString()}` : basePath, { scroll: false });
    });
  }

  function reset() {
    const cleared = Object.fromEntries(Object.keys(query).map((key) => [key, undefined])) as Partial<Record<K, string>>;
    setQuery(cleared);
  }

  return { query, setQuery, reset, isPending };
}
