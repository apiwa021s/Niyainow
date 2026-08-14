"use client";

import { useMemo, useState } from "react";
import { DataTable, FilterBar, allOption, type Column } from "@/components/admin/admin-table";
import { StatusPill } from "@/components/admin/status-pill";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Download } from "lucide-react";
import { ACTIVITY_ACTION, STAFF_ROLE } from "@/lib/admin-labels";
import { getActivities } from "@/services/admin-service";
import type { ActivityAction, AdminActivity } from "@/types/admin";

/** บันทึกกิจกรรมเป็นข้อมูลอ่านอย่างเดียว — แก้ไข/ลบไม่ได้ เพื่อให้ตรวจสอบย้อนหลังได้จริง */
export function ActivityView() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");

  const rows = useMemo(
    () =>
      getActivities()
        .filter((item) => action === "all" || item.action === action)
        .filter(
          (item) =>
            !search ||
            [item.actor, item.target, item.detail].some((field) => field.toLowerCase().includes(search.toLowerCase()))
        ),
    [search, action]
  );

  const columns: Column<AdminActivity>[] = [
    {
      key: "actor",
      header: "ผู้ทำรายการ",
      cell: (item) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{item.actor}</p>
          <p className="truncate text-xs text-muted-foreground">{STAFF_ROLE[item.role].label}</p>
        </div>
      )
    },
    {
      key: "action",
      header: "การกระทำ",
      cell: (item) => <StatusPill label={ACTIVITY_ACTION[item.action].label} tone={ACTIVITY_ACTION[item.action].tone} />
    },
    {
      key: "target",
      header: "เป้าหมาย",
      hideBelow: "md",
      cell: (item) => <span className="text-sm font-medium">{item.target}</span>
    },
    {
      key: "detail",
      header: "รายละเอียด",
      cell: (item) => <p className="max-w-xl text-sm text-muted-foreground">{item.detail}</p>
    },
    {
      key: "at",
      header: "เมื่อ",
      className: "whitespace-nowrap text-xs text-muted-foreground",
      cell: (item) => item.at
    }
  ];

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="ค้นหาชื่อทีมงาน เป้าหมาย หรือรายละเอียด…"
        filters={[
          {
            key: "action",
            label: "การกระทำ",
            value: action,
            options: allOption(
              (Object.keys(ACTIVITY_ACTION) as ActivityAction[]).map((item) => ({
                value: item,
                label: ACTIVITY_ACTION[item].label
              }))
            ),
            onChange: setAction
          }
        ]}
        onReset={() => {
          setSearch("");
          setAction("all");
        }}
        resultLabel={`พบ ${rows.length.toLocaleString("th-TH")} รายการ`}
        actions={
          <Button variant="outline" onClick={() => toast({ tone: "success", message: "กำลังเตรียมไฟล์บันทึกให้ดาวน์โหลด" })}>
            <Download className="h-4 w-4" />
            ส่งออกบันทึก
          </Button>
        }
      />

      <DataTable caption="ตารางบันทึกกิจกรรมของทีมงาน" rows={rows} columns={columns} getRowKey={(item) => item.id} pageSize={15} />

      <p className="text-xs text-muted-foreground">
        บันทึกเก็บย้อนหลัง 365 วัน และแก้ไขไม่ได้ — ใช้อ้างอิงเวลาต้องตรวจสอบว่าใครเปลี่ยนอะไรเมื่อไหร่
      </p>
    </div>
  );
}
