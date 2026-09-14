"use client";

import { Camera, Check, ChevronRight, ImageOff, LoaderCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, useRef, useState, useTransition } from "react";

import { ReaderClassIcon } from "@/components/onboarding/reader-class-icon";
import { responseMessage } from "@/lib/http/client-response";
import { getReaderClass, type ReaderClassProfile } from "@/lib/onboarding/reader-class";
import type { ReaderMissionDashboard } from "@/lib/onboarding/reader-missions";
import {
  READER_AVATAR_CONTENT_TYPES,
  READER_AVATAR_MAX_BYTES,
  validateReaderAvatarFile,
} from "@/lib/profile/reader-avatar";
import type { ReaderRpgSummary } from "@/services/reader-rpg-service";
import styles from "./reader-rpg-profile-card.module.css";

type AvatarState = {
  avatarUrl: string | null;
  providerImageUrl: string | null;
  hasCustomAvatar: boolean;
};

type ProfileStyle = CSSProperties & {
  "--profile-accent"?: string;
  "--profile-secondary"?: string;
};

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function fileChecksum(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function uploadWithFallback(
  signed: { objectKey: string; uploadUrl: string; requiredHeaders: Record<string, string> },
  file: File,
) {
  try {
    const response = await fetch(signed.uploadUrl, {
      method: "PUT",
      headers: signed.requiredHeaders,
      body: file,
    });
    if (response.ok) return;
  } catch {
    // The bounded same-origin endpoint keeps avatar changes available while
    // a new production origin is waiting for its bucket CORS policy.
  }

  const fallback = await fetch(`/api/me/avatar/proxy?objectKey=${encodeURIComponent(signed.objectKey)}`, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!fallback.ok) throw new Error(await responseMessage(fallback));
}

export function ReaderRpgProfileCard({
  name,
  initialAvatar,
  classProfile,
  rpg,
  missions,
}: {
  name: string;
  initialAvatar: AvatarState;
  classProfile: ReaderClassProfile | null;
  rpg: ReaderRpgSummary;
  missions: ReaderMissionDashboard;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const mainClass = getReaderClass(classProfile?.classId);
  const mainProgress = rpg.classes.find((item) => item.classId === mainClass?.id);
  const equipped = new Map(
    missions.cosmetics.items.filter((item) => item.equipped).map((item) => [item.slot, item]),
  );
  const frame = equipped.get("profile_frame");
  const avatarEffect = equipped.get("avatar_effect");
  const background = equipped.get("background");
  const title = equipped.get("reader_title")?.config.title ?? mainProgress?.title ?? mainClass?.title ?? "นักอ่าน NovelNow";
  const badge = equipped.get("badge")?.config.badgeText;
  const dailyDone = missions.daily.missions.filter((mission) => mission.completed).length;
  const weeklyDone = missions.weekly.missions.filter((mission) => mission.completed).length;
  const claimable = [...missions.daily.missions, ...missions.weekly.missions]
    .filter((mission) => mission.completed && !mission.claimed).length;
  const missionCtaLabel = !mainClass
    ? "ค้นหา Reader Class ของฉัน"
    : claimable > 0
      ? `มี ${claimable} รางวัลที่รับได้`
      : "ดูภารกิจและของแต่ง";
  const style = {
    "--profile-accent": frame?.config.accent ?? background?.config.accent ?? mainClass?.accent ?? "#ff4f91",
    "--profile-secondary": frame?.config.accentSecondary ?? background?.config.accentSecondary ?? "#f5bd64",
  } as ProfileStyle;

  async function uploadAvatar(file: File) {
    setMessage(null);
    setError(null);
    setConfirmRemove(false);
    const validationError = validateReaderAvatarFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    try {
      const checksumSha256 = await fileChecksum(file);
      const presignResponse = await fetch("/api/me/avatar/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetType: "avatar",
          originalFileName: file.name,
          contentType: file.type,
          contentLength: file.size,
          checksumSha256,
        }),
      });
      if (!presignResponse.ok) throw new Error(await responseMessage(presignResponse));
      const presignPayload = await presignResponse.json() as {
        data: { objectKey: string; uploadUrl: string; requiredHeaders: Record<string, string> };
      };
      await uploadWithFallback(presignPayload.data, file);

      const completeResponse = await fetch("/api/me/avatar/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectKey: presignPayload.data.objectKey,
          contentType: file.type,
          contentLength: file.size,
        }),
      });
      if (!completeResponse.ok) throw new Error(await responseMessage(completeResponse));
      const completePayload = await completeResponse.json() as { data: AvatarState };
      setAvatar(completePayload.data);
      setMessage("อัปเดตรูปโปรไฟล์แล้ว");
      startTransition(() => router.refresh());
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function removeAvatar() {
    if (!confirmRemove) {
      setConfirmRemove(true);
      setMessage("กดยืนยันอีกครั้งเพื่อกลับไปใช้รูปจากบัญชี Google");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/me/avatar", { method: "DELETE" });
      if (!response.ok) throw new Error(await responseMessage(response));
      const payload = await response.json() as { data: AvatarState };
      setAvatar(payload.data);
      setConfirmRemove(false);
      setMessage("กลับไปใช้รูปจากบัญชี Google แล้ว");
      startTransition(() => router.refresh());
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "นำรูปโปรไฟล์ออกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={styles.card}
      style={style}
      data-pattern={background?.config.pattern ?? "none"}
      data-effect={avatarEffect?.config.animation ?? "none"}
      aria-labelledby="reader-profile-heading"
      aria-busy={busy}
    >
      <div className={styles.pattern} aria-hidden />
      <div className={styles.identity}>
        <div
          className={styles.avatarDropzone}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (file && !busy) void uploadAvatar(file);
          }}
        >
          <div className={styles.avatarFrame} data-effect={avatarEffect?.config.animation ?? "none"}>
            {avatar.avatarUrl ? (
              <Image src={avatar.avatarUrl} alt={`รูปโปรไฟล์ของ ${name}`} fill sizes="(max-width: 640px) 88px, 112px" className={styles.avatarImage} priority />
            ) : (
              <span className={styles.avatarFallback}>{name.trim().charAt(0).toLocaleUpperCase("th") || "N"}</span>
            )}
          </div>
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} aria-label="เปลี่ยนรูปโปรไฟล์" className={styles.cameraButton}>
            {busy ? <LoaderCircle aria-hidden /> : <Camera aria-hidden />}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={READER_AVATAR_CONTENT_TYPES.join(",")}
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void uploadAvatar(file);
            }}
          />
        </div>

        <div className={styles.copy}>
          <div className={styles.nameRow}>
            <h2 id="reader-profile-heading">{name}</h2>
            {badge ? <span className={styles.badge}>{badge}</span> : null}
          </div>
          <p className={styles.title}>{title}</p>
          {mainClass ? (
            <div className={styles.classPill}>
              <ReaderClassIcon src={mainClass.icon} sizes="22px" />
              <span>Main Class · {mainClass.name} Lv.{mainProgress?.level ?? 1}</span>
            </div>
          ) : null}
          <p className={styles.level}>Reader Level {rpg.reader.level}</p>
          <div className={styles.levelBar} role="progressbar" aria-label="ความคืบหน้า Reader Level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rpg.reader.progressPercent}>
            <span style={{ width: `${rpg.reader.progressPercent}%` }} />
          </div>
          <p className={styles.expText}>
            {rpg.reader.expForNextLevel === null
              ? `${rpg.reader.totalExp.toLocaleString("th-TH")} EXP · Level สูงสุด`
              : `${rpg.reader.expIntoLevel.toLocaleString("th-TH")} / ${rpg.reader.expForNextLevel.toLocaleString("th-TH")} EXP`}
          </p>
        </div>
      </div>

      <div className={styles.stats}>
        <div><strong>{rpg.reader.currentStreakDays}</strong><span>Daily Streak</span></div>
        <div><strong>{mainProgress?.level ?? 1}</strong><span>{mainClass?.name ?? "Main Class"}</span></div>
        <div><strong>{mainProgress?.prestige ?? 0}</strong><span>Prestige</span></div>
        <div><strong>{missions.cosmetics.items.length}</strong><span>Cosmetics</span></div>
      </div>

      <div className={styles.missions}>
        <div><span>Daily</span><strong>{dailyDone}/{missions.daily.missions.length}</strong></div>
        <div><span>Weekly</span><strong>{weeklyDone}/{missions.weekly.missions.length}</strong></div>
        <Link href={mainClass ? "/personalize#reader-rpg" : "/onboarding"}>
          {missionCtaLabel}
          <ChevronRight aria-hidden />
        </Link>
      </div>

      <div className={styles.avatarActions}>
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}><Camera aria-hidden />เปลี่ยนรูป</button>
        {avatar.hasCustomAvatar ? (
          <button type="button" disabled={busy} data-confirm={confirmRemove || undefined} onClick={() => void removeAvatar()}>
            {confirmRemove ? <Check aria-hidden /> : <ImageOff aria-hidden />}
            {confirmRemove ? "ยืนยันใช้รูป Google" : "ใช้รูป Google"}
          </button>
        ) : null}
        <span>JPG, PNG, WebP หรือ AVIF · สูงสุด {formatBytes(READER_AVATAR_MAX_BYTES)}</span>
      </div>

      {message || error ? <p className={styles.status} role={error ? "alert" : "status"} data-error={error ? "true" : undefined}>{error ?? message}</p> : null}
    </section>
  );
}
