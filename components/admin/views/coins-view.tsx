"use client";

import { Coins, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { Panel } from "@/components/admin/admin-ui";
import { ConfirmDialog, Modal } from "@/components/admin/modal";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { CHAPTER_COIN_PRICE, coinPackages } from "@/data/mock-data";
import type { CoinPackage } from "@/types/novel";

type Draft = { id: string; coins: string; bonus: string; priceTHB: string; bestValue: boolean };

const toDraft = (pack: CoinPackage): Draft => ({
  id: pack.id,
  coins: String(pack.coins),
  bonus: String(pack.bonus),
  priceTHB: String(pack.priceTHB),
  bestValue: Boolean(pack.bestValue)
});

const EMPTY: Draft = { id: "", coins: "100", bonus: "0", priceTHB: "100", bestValue: false };

export function CoinsView() {
  const { toast } = useToast();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CoinPackage | null>(null);
  const [chapterPrice, setChapterPrice] = useState(String(CHAPTER_COIN_PRICE));
  const [freeChapters, setFreeChapters] = useState("5");

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="แพ็กเกจเติมเหรียญ"
        description="ราคาต่อเหรียญคำนวณให้อัตโนมัติ ใช้ตรวจว่าแพ็กเกจใหญ่คุ้มกว่าจริงหรือไม่"
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditing(EMPTY);
              setIsNew(true);
            }}
          >
            <Plus className="h-4 w-4" />
            เพิ่มแพ็กเกจ
          </Button>
        }
      >
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {coinPackages.map((pack) => {
            const total = pack.coins + pack.bonus;
            const perCoin = (pack.priceTHB / total).toFixed(2);

            return (
              <li
                key={pack.id}
                className={cn(
                  "flex flex-col gap-2 rounded-[16px] border p-4",
                  pack.bestValue ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/6" : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="tabular flex items-baseline gap-1 text-xl font-bold">
                      <Coins className="h-4 w-4 text-[var(--brand-pink)]" aria-hidden />
                      {pack.coins.toLocaleString("th-TH")}
                      {pack.bonus > 0 ? (
                        <span className="text-sm font-semibold text-[var(--brand-pink-on-light)]">+{pack.bonus}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">รหัส {pack.id}</p>
                  </div>
                  {pack.bestValue ? (
                    <span className="inline-flex items-center gap-1 rounded-[8px] bg-[image:var(--grad-hot)] px-2 py-1 text-[11px] font-bold text-white">
                      <Star className="h-3 w-3" aria-hidden />
                      คุ้มที่สุด
                    </span>
                  ) : null}
                </div>

                <dl className="grid gap-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">ราคา</dt>
                    <dd className="tabular font-semibold">{pack.priceTHB.toLocaleString("th-TH")} บาท</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">ได้รับจริง</dt>
                    <dd className="tabular font-semibold">{total.toLocaleString("th-TH")} เหรียญ</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">ราคาต่อเหรียญ</dt>
                    <dd className="tabular font-semibold">{perCoin} บาท</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">อ่านได้ประมาณ</dt>
                    <dd className="tabular font-semibold">{Math.floor(total / Number(chapterPrice || 1))} ตอน</dd>
                  </div>
                </dl>

                <div className="mt-1 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(toDraft(pack));
                      setIsNew(false);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    แก้ไข
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setPendingDelete(pack)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    ลบ
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="กติกาการใช้เหรียญ" description="ค่าเหล่านี้มีผลกับทุกเรื่องที่ไม่ได้ตั้งราคาเฉพาะไว้เอง">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ราคามาตรฐานต่อตอน (เหรียญ)" hint="ตอนที่ไม่ได้ตั้งราคาเองจะใช้ค่านี้">
            <Input
              type="number"
              min={1}
              value={chapterPrice}
              onChange={(event) => setChapterPrice(event.target.value)}
              className="tabular"
            />
          </Field>
          <Field label="จำนวนตอนแรกที่อ่านฟรี" hint="นโยบายของเว็บ: ห้ามกั้นเงินก่อนอ่านจบตอนแรก">
            <Input
              type="number"
              min={1}
              value={freeChapters}
              onChange={(event) => setFreeChapters(event.target.value)}
              className="tabular"
            />
          </Field>
        </div>
        <div className="mt-4">
          <Button onClick={() => toast({ tone: "success", message: "บันทึกกติกาการใช้เหรียญแล้ว" })}>บันทึกกติกา</Button>
        </div>
      </Panel>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={isNew ? "เพิ่มแพ็กเกจเหรียญ" : "แก้ไขแพ็กเกจเหรียญ"}
        description="โบนัสคือเหรียญที่แถมเพิ่มจากจำนวนหลัก ผู้ใช้จะเห็นเป็นตัวเลขสีชมพูบนการ์ด"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                toast({ tone: "success", message: isNew ? "เพิ่มแพ็กเกจใหม่แล้ว" : `บันทึกแพ็กเกจ ${editing?.id} แล้ว` });
                setEditing(null);
              }}
            >
              {isNew ? "เพิ่มแพ็กเกจ" : "บันทึก"}
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="grid gap-4">
            <Field label="รหัสแพ็กเกจ" hint="ใช้ในรายงานการเงิน เช่น starter, pro">
              <Input value={editing.id} onChange={(event) => setEditing({ ...editing, id: event.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="เหรียญ">
                <Input
                  type="number"
                  value={editing.coins}
                  onChange={(event) => setEditing({ ...editing, coins: event.target.value })}
                  className="tabular"
                />
              </Field>
              <Field label="โบนัส">
                <Input
                  type="number"
                  value={editing.bonus}
                  onChange={(event) => setEditing({ ...editing, bonus: event.target.value })}
                  className="tabular"
                />
              </Field>
              <Field label="ราคา (บาท)">
                <Input
                  type="number"
                  value={editing.priceTHB}
                  onChange={(event) => setEditing({ ...editing, priceTHB: event.target.value })}
                  className="tabular"
                />
              </Field>
            </div>
            <label className="flex items-start gap-2.5 rounded-[12px] border border-border p-3">
              <input
                type="checkbox"
                checked={editing.bestValue}
                onChange={(event) => setEditing({ ...editing, bestValue: event.target.checked })}
                className="mt-0.5 h-4 w-4 accent-[var(--brand-primary)]"
              />
              <span className="text-sm">
                <span className="font-medium">ติดป้าย “คุ้มที่สุด”</span>
                <span className="block text-xs text-muted-foreground">ควรมีแพ็กเกจเดียวเท่านั้นที่ติดป้ายนี้</span>
              </span>
            </label>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => toast({ tone: "error", message: `ลบแพ็กเกจ ${pendingDelete?.id} แล้ว` })}
        title={`ลบแพ็กเกจ ${pendingDelete?.id ?? ""}?`}
        description="ผู้ใช้จะไม่เห็นแพ็กเกจนี้ในหน้าเติมเหรียญอีก ธุรกรรมเดิมที่อ้างถึงแพ็กเกจนี้ยังอยู่ในรายงานตามปกติ"
        confirmLabel="ลบแพ็กเกจ"
        tone="danger"
      />
    </div>
  );
}
