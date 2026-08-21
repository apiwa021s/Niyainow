"use client";

import { BellOff, BookMarked, CheckCircle2, Clock3, Coins, Heart, LogOut, RotateCcw, Settings, ShieldCheck, UserRound } from "lucide-react";

import { NotificationList } from "@/components/notifications/notification-list";
import { ThemeSwitcher } from "@/components/interactive/theme-switcher";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form-controls";
import { useLocalMockStore } from "@/hooks/use-local-mock-store";
import { cn } from "@/lib/utils";
import { signOutUser } from "@/lib/auth/actions";
import type { CurrentUser } from "@/lib/auth/dal";
import {
  DEFAULT_PRIVACY_PREFS,
  readPrivacyPrefs,
  writePrivacyPrefs,
  type PrivacyPrefs,
} from "@/lib/domain/reader-privacy";
import type { NovelUpdate } from "@/services/novel-service";
import { useReaderPrefs } from "@/hooks/use-reader-prefs";
import {
  FONT_SIZE_MAX_INDEX,
  FONT_SIZE_MIN_INDEX,
  READER_FONT_KIND,
  READER_FONT_LABELS,
  READER_FONTS,
  READER_THEME_LABELS,
  READER_THEMES,
  READER_THEME_SWATCH,
  type ReaderLineHeight,
} from "@/stores/use-reader-store";

export type ProfileSummary = {
  libraryCount: number;
  readingCount: number;
  completedCount: number;
  followingCount: number;
  historyCount: number;
};

export function ProfilePanel({ user, summary }: { user: CurrentUser; summary: ProfileSummary }) {
  const readingLinks = [
    { label: "เรื่องที่กำลังอ่าน", value: summary.readingCount, href: "/library", icon: BookMarked },
    { label: "เรื่องที่ติดตาม", value: summary.followingCount, href: "/library/following", icon: Heart },
    { label: "เรื่องที่อ่านจบ", value: summary.completedCount, href: "/library/completed", icon: CheckCircle2 },
    { label: "ประวัติการอ่าน", value: summary.historyCount, href: "/history", icon: Clock3 },
  ];
  return (
    <div className="space-y-8">
      <section className="grid gap-6 py-2 sm:py-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-muted text-[var(--brand-emphasis)]"><UserRound className="h-8 w-8" /></div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold">{user.name || "นักอ่าน NovelNow"}</h2>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />บัญชี Google · {user.role === "READER" ? "นักอ่าน" : user.role}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <ButtonLink href="/wallet" variant="secondary" className="w-full sm:w-auto"><Coins className="h-4 w-4" />กระเป๋าเหรียญ</ButtonLink>
          <ButtonLink href="/settings" variant="secondary" className="w-full sm:w-auto"><Settings className="h-4 w-4" />ตั้งค่า</ButtonLink>
          <form action={signOutUser} className="sm:w-auto"><input type="hidden" name="callbackUrl" value="/" /><Button type="submit" variant="outline" className="w-full sm:w-auto"><LogOut className="h-4 w-4" />ออกจากระบบ</Button></form>
        </div>
      </section>

      <section aria-labelledby="profile-reading-heading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="profile-reading-heading" className="text-xl font-semibold">ทางลัดการอ่าน</h2>
          <p className="text-sm text-muted-foreground">หนังสือในชั้นทั้งหมด {summary.libraryCount.toLocaleString("th-TH")} เรื่อง</p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {readingLinks.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label} className="min-w-0">
                <ButtonLink href={item.href} variant="ghost" className="h-auto min-h-16 w-full justify-start rounded-[8px] bg-muted/35 px-3 py-3 text-left hover:bg-muted/60">
                  <Icon className="h-5 w-5 shrink-0 text-[var(--brand-emphasis)]" aria-hidden />
                  <span className="min-w-0 flex-1 whitespace-normal font-medium">{item.label}</span>
                  <span className="tabular shrink-0 text-sm font-semibold text-muted-foreground">{item.value.toLocaleString("th-TH")} เรื่อง</span>
                </ButtonLink>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export function SettingsPanel({ user }: { user: CurrentUser }) {
  // Same hook the reader uses, so a change made here syncs to the account and
  // is already applied the next time a chapter opens.
  const { prefs, hydrated, fontSizePx, setPrefs, resetPrefs } = useReaderPrefs({ signedIn: true });

  return (
    <div className="divide-y divide-border">
      <SettingsSection title="บัญชี" description="ข้อมูลนี้มาจากบัญชี Google และแก้ไขบนเว็บไซต์ไม่ได้">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2"><Label htmlFor="profile-display-name">ชื่อที่แสดง</Label><Input id="profile-display-name" value={user.name || "นักอ่าน NovelNow"} readOnly disabled /></div>
          <div className="grid gap-2"><Label htmlFor="profile-email">อีเมล</Label><Input id="profile-email" value={user.email || ""} readOnly disabled /></div>
        </div>
      </SettingsSection>

      <SettingsSection title="รูปลักษณ์เว็บไซต์" description="เลือกโหมดสีสำหรับหน้าค้นหา คลัง และหน้ารายละเอียด">
        <ThemeSwitcher />
      </SettingsSection>

      <SettingsSection title="การอ่าน" description={`ใช้กับทุกเรื่องและซิงก์ข้ามอุปกรณ์${hydrated ? "" : " · กำลังโหลด"}`}>
        <div className="grid gap-5 lg:grid-cols-2">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">พื้นหลังเครื่องอ่าน</legend>
            <div className="flex flex-wrap gap-2">
              {READER_THEMES.map((theme) => {
                const active = prefs.theme === theme;
                const swatch = READER_THEME_SWATCH[theme];
                return (
                  <button key={theme} type="button" aria-pressed={active} onClick={() => setPrefs({ theme })} className={cn("flex min-h-11 items-center gap-2 rounded-[8px] border px-3 text-sm", active ? "border-[var(--brand-emphasis)] bg-[var(--brand-primary)]/8" : "border-border")}>
                    <span aria-hidden className="h-5 w-5 rounded-full border border-black/15" style={{ background: swatch.bg }} />{READER_THEME_LABELS[theme]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid content-start gap-2">
            <Label htmlFor="reader-font">รูปแบบตัวอักษร</Label>
            <Select id="reader-font" value={prefs.font} onChange={(event) => setPrefs({ font: event.target.value as (typeof READER_FONTS)[number] })} className="h-11">
              {READER_FONTS.map((font) => <option key={font} value={font}>{READER_FONT_LABELS[font]} · {READER_FONT_KIND[font]}</option>)}
            </Select>
          </div>

          <div className="grid gap-2">
            <span className="flex items-center justify-between gap-2"><Label htmlFor="reader-font-size">ขนาดตัวอักษร</Label><span className="tabular text-xs text-muted-foreground">{fontSizePx}px</span></span>
            <input id="reader-font-size" type="range" min={FONT_SIZE_MIN_INDEX} max={FONT_SIZE_MAX_INDEX} step={1} value={prefs.fontSizeIndex} onChange={(event) => setPrefs({ fontSizeIndex: Number(event.target.value) })} className="h-11 w-full accent-[var(--brand-emphasis)]" />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">ระยะบรรทัด</legend>
            <div role="group" className="inline-flex rounded-[8px] border border-border p-1" aria-label="ระยะบรรทัด">
              {([['tight', 'กระชับ'], ['normal', 'ปกติ'], ['airy', 'โปร่ง']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={prefs.lineHeight === value} onClick={() => setPrefs({ lineHeight: value as ReaderLineHeight })} className={cn("min-h-11 rounded-[6px] px-4 text-sm font-semibold", prefs.lineHeight === value ? "bg-[var(--brand-primary)] text-white" : "hover:bg-muted")}>{label}</button>)}
            </div>
          </fieldset>
        </div>
        <Button type="button" variant="outline" onClick={resetPrefs} className="mt-5"><RotateCcw className="h-4 w-4" />คืนค่าเริ่มต้นการอ่าน</Button>
      </SettingsSection>

      <SettingsSection title="การแจ้งเตือน" description="ระบบยังไม่ส่งอีเมลหรือการแจ้งเตือนบนอุปกรณ์ จึงไม่มีสวิตช์ที่ทำงานไม่จริง">
        <ButtonLink href="/notifications" variant="outline">ดูสถานะการแจ้งเตือน</ButtonLink>
      </SettingsSection>

      <SettingsSection title="ความเป็นส่วนตัว" description="ควบคุมว่าใครเห็นประวัติการอ่านและการแจ้งเตือนของคุณ">
        <PrivacySettings />
      </SettingsSection>
    </div>
  );
}

function PrivacySettings() {
  const prefs = useLocalMockStore(() => readPrivacyPrefs(), () => DEFAULT_PRIVACY_PREFS);

  function update(patch: Partial<PrivacyPrefs>) {
    writePrivacyPrefs({ ...prefs, ...patch });
  }

  return (
    <div className="grid gap-4">
      <PrivacyToggle
        label="ประวัติการอ่าน"
        description="ซ่อนประวัติการอ่านจากคนอื่น"
        checked={prefs.privateReadingHistory}
        onChange={(value) => update({ privateReadingHistory: value })}
      />
      <PrivacyToggle
        label="Library"
        description="ซ่อนรายการในชั้นหนังสือจากคนอื่น"
        checked={prefs.privateLibrary}
        onChange={(value) => update({ privateLibrary: value })}
      />
      <PrivacyToggle
        label="ซ่อนชื่อเรื่องจาก Notification Preview"
        description="เมื่อเปิด การแจ้งเตือนจะไม่แสดงชื่อเรื่องที่คุณติดตาม"
        checked={prefs.discreetNotifications}
        onChange={(value) => update({ discreetNotifications: value })}
      />
    </div>
  );
}

function PrivacyToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[8px] border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-[var(--brand-primary)]" : "bg-muted",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="grid gap-5 py-5 sm:py-6 lg:grid-cols-[240px_1fr]"><div><h2 className="text-h2 font-semibold">{title}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p></div><div>{children}</div></section>;
}

export function NotificationsPanel({ followingCount, updates }: { followingCount: number; updates: NovelUpdate[] }) {
  if (!followingCount) {
    return (
      <section className="flex gap-4 py-2 sm:py-3">
        <BellOff className="mt-0.5 h-6 w-6 shrink-0 text-muted-foreground" />
        <div>
          <h2 className="text-xl font-semibold">ยังไม่มีเรื่องที่ติดตาม</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            ติดตามนิยายที่สนใจ แล้วตอนใหม่จะแจ้งเตือนที่นี่
          </p>
          <ButtonLink href="/novels" variant="outline" className="mt-4"><Heart className="h-4 w-4" />สำรวจนิยาย</ButtonLink>
        </div>
      </section>
    );
  }

  if (!updates.length) {
    return (
      <section className="flex gap-4 py-2 sm:py-3">
        <BellOff className="mt-0.5 h-6 w-6 shrink-0 text-muted-foreground" />
        <div>
          <h2 className="text-xl font-semibold">ยังไม่มีการแจ้งเตือนใหม่</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            คุณกำลังติดตาม {followingCount.toLocaleString("th-TH")} เรื่อง เมื่อมีตอนใหม่จะปรากฏที่นี่
          </p>
          <ButtonLink href="/library/following" variant="outline" className="mt-4"><Heart className="h-4 w-4" />ดูเรื่องที่ติดตาม</ButtonLink>
        </div>
      </section>
    );
  }

  return (
    <section className="py-2 sm:py-3">
      <NotificationList updates={updates} />
    </section>
  );
}
