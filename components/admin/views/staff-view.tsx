"use client";

import { Mail, ShieldOff, UserCog, UserPlus, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, FilterBar, allOption, type Column } from "@/components/admin/admin-table";
import { Panel } from "@/components/admin/admin-ui";
import { ConfirmDialog, Modal } from "@/components/admin/modal";
import { RowMenu } from "@/components/admin/row-menu";
import { StatusPill } from "@/components/admin/status-pill";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";
import { ROLE_PERMISSIONS, STAFF_ROLE, STAFF_STATUS } from "@/lib/admin-labels";
import { staffMembers } from "@/data/admin-data";
import type { StaffMember, StaffRole } from "@/types/admin";

const ROLES = Object.keys(STAFF_ROLE) as StaffRole[];

export function StaffView() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("editor");
  const [roleTarget, setRoleTarget] = useState<StaffMember | null>(null);
  const [nextRole, setNextRole] = useState<StaffRole>("editor");
  const [removeTarget, setRemoveTarget] = useState<StaffMember | null>(null);

  const rows = useMemo(
    () =>
      staffMembers
        .filter((staff) => roleFilter === "all" || staff.role === roleFilter)
        .filter(
          (staff) => !search || [staff.name, staff.email].some((field) => field.toLowerCase().includes(search.toLowerCase()))
        ),
    [search, roleFilter]
  );

  const columns: Column<StaffMember>[] = [
    {
      key: "name",
      header: "ทีมงาน",
      cell: (staff) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{staff.name}</p>
          <p className="truncate text-xs text-muted-foreground">{staff.email}</p>
        </div>
      )
    },
    {
      key: "role",
      header: "บทบาท",
      cell: (staff) => <StatusPill label={STAFF_ROLE[staff.role].label} tone={STAFF_ROLE[staff.role].tone} />
    },
    {
      key: "status",
      header: "สถานะ",
      cell: (staff) => <StatusPill label={STAFF_STATUS[staff.status].label} tone={STAFF_STATUS[staff.status].tone} />
    },
    {
      key: "lastActive",
      header: "ใช้งานล่าสุด",
      hideBelow: "md",
      cell: (staff) => <span className="whitespace-nowrap text-sm text-muted-foreground">{staff.lastActive}</span>
    },
    {
      key: "actions-count",
      header: "งานเดือนนี้",
      hideBelow: "lg",
      className: "tabular",
      cell: (staff) => staff.actionsThisMonth.toLocaleString("th-TH")
    },
    {
      key: "actions",
      header: <span className="sr-only">คำสั่ง</span>,
      className: "text-right",
      headClassName: "text-right",
      cell: (staff) => (
        <div className="flex justify-end">
          <RowMenu
            label={`คำสั่งสำหรับ ${staff.name}`}
            actions={[
              {
                label: "เปลี่ยนบทบาท",
                icon: <UserCog className="h-4 w-4" />,
                onSelect: () => {
                  setRoleTarget(staff);
                  setNextRole(staff.role);
                },
                disabled: staff.role === "owner"
              },
              {
                label: "ส่งคำเชิญอีกครั้ง",
                icon: <Mail className="h-4 w-4" />,
                onSelect: () => toast({ tone: "success", message: `ส่งคำเชิญไปที่ ${staff.email} อีกครั้งแล้ว` }),
                disabled: staff.status !== "invited"
              },
              {
                label: staff.status === "suspended" ? "คืนสิทธิ์การใช้งาน" : "ระงับสิทธิ์ชั่วคราว",
                icon: <ShieldOff className="h-4 w-4" />,
                onSelect: () =>
                  toast({
                    tone: "info",
                    message: staff.status === "suspended" ? `คืนสิทธิ์ให้ ${staff.name} แล้ว` : `ระงับสิทธิ์ของ ${staff.name} แล้ว`
                  }),
                disabled: staff.role === "owner"
              },
              {
                label: "เอาออกจากทีม",
                icon: <UserX className="h-4 w-4" />,
                tone: "danger",
                onSelect: () => setRemoveTarget(staff),
                disabled: staff.role === "owner"
              }
            ]}
          />
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="ค้นหาชื่อหรืออีเมลทีมงาน…"
        filters={[
          {
            key: "role",
            label: "บทบาท",
            value: roleFilter,
            options: allOption(ROLES.map((role) => ({ value: role, label: STAFF_ROLE[role].label }))),
            onChange: setRoleFilter
          }
        ]}
        onReset={() => {
          setSearch("");
          setRoleFilter("all");
        }}
        resultLabel={`ทีมงาน ${rows.length.toLocaleString("th-TH")} คน`}
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            เชิญทีมงาน
          </Button>
        }
      />

      <DataTable caption="ตารางทีมงานหลังบ้าน" rows={rows} columns={columns} getRowKey={(staff) => staff.id} />

      <Panel title="สิทธิ์ของแต่ละบทบาท" description="ให้สิทธิ์เท่าที่จำเป็นกับงานเสมอ — เปลี่ยนบทบาทได้จากเมนูท้ายแถว">
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ROLES.map((role) => (
            <li key={role} className="rounded-[12px] border border-border p-4">
              <StatusPill label={STAFF_ROLE[role].label} tone={STAFF_ROLE[role].tone} />
              <ul className="mt-3 grid gap-1.5">
                {ROLE_PERMISSIONS[role].map((permission) => (
                  <li key={permission} className="flex gap-2 text-sm text-muted-foreground">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--brand-primary)]" />
                    {permission}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Panel>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="เชิญทีมงานใหม่"
        description="ระบบจะส่งลิงก์ตั้งรหัสผ่านไปที่อีเมล ลิงก์หมดอายุใน 48 ชั่วโมง"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              disabled={!inviteEmail.includes("@")}
              onClick={() => {
                toast({ tone: "success", message: `ส่งคำเชิญไปที่ ${inviteEmail} แล้ว` });
                setInviteOpen(false);
                setInviteEmail("");
              }}
            >
              ส่งคำเชิญ
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="อีเมล">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="name@niyainow.test"
            />
          </Field>
          <Field label="บทบาท" hint={ROLE_PERMISSIONS[inviteRole].join(" · ")}>
            <Select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as StaffRole)}>
              {ROLES.filter((role) => role !== "owner").map((role) => (
                <option key={role} value={role}>
                  {STAFF_ROLE[role].label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(roleTarget)}
        onClose={() => setRoleTarget(null)}
        title={`เปลี่ยนบทบาทของ ${roleTarget?.name ?? ""}`}
        description="มีผลทันทีในเซสชันถัดไปที่ผู้ใช้เข้าระบบ"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRoleTarget(null)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                toast({ tone: "success", message: `เปลี่ยน ${roleTarget?.name} เป็น ${STAFF_ROLE[nextRole].label} แล้ว` });
                setRoleTarget(null);
              }}
            >
              บันทึกบทบาท
            </Button>
          </>
        }
      >
        <Field label="บทบาทใหม่" hint={ROLE_PERMISSIONS[nextRole].join(" · ")}>
          <Select value={nextRole} onChange={(event) => setNextRole(event.target.value as StaffRole)}>
            {ROLES.filter((role) => role !== "owner").map((role) => (
              <option key={role} value={role}>
                {STAFF_ROLE[role].label}
              </option>
            ))}
          </Select>
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => toast({ tone: "error", message: `เอา ${removeTarget?.name} ออกจากทีมแล้ว` })}
        title={`เอา ${removeTarget?.name ?? ""} ออกจากทีม?`}
        description="บัญชีนี้จะเข้าหลังบ้านไม่ได้อีก แต่ประวัติการทำงานที่ผ่านมายังอยู่ในบันทึกกิจกรรม"
        confirmLabel="เอาออกจากทีม"
        tone="danger"
      />
    </div>
  );
}
