"use client";

import { useRouter } from "next/navigation";
import { Check, Gift, LockKeyhole, Shirt } from "lucide-react";
import { type CSSProperties, useState, useTransition } from "react";

import { responseMessage } from "@/lib/http/client-response";
import {
  missionCompletionPercent,
  type CosmeticSlot,
  type ReaderCosmeticView,
  type ReaderMissionDashboard,
  type ReaderMissionView,
} from "@/lib/onboarding/reader-missions";
import styles from "./reader-rpg-dashboard.module.css";

type DashboardTab = "daily" | "weekly" | "cosmetics";

const SLOT_LABELS: Record<CosmeticSlot, string> = {
  profile_frame: "กรอบโปรไฟล์",
  card_effect: "เอฟเฟกต์การ์ด",
  avatar_effect: "ออร่าตัวละคร",
  reader_title: "ฉายานักอ่าน",
  badge: "ตราสัญลักษณ์",
  background: "พื้นหลัง",
};

const RARITY_LABELS: Record<ReaderCosmeticView["rarity"], string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

type CosmeticStyle = CSSProperties & {
  "--cosmetic-accent"?: string;
  "--cosmetic-secondary"?: string;
};

function cosmeticStyle(item: ReaderCosmeticView): CosmeticStyle {
  return {
    "--cosmetic-accent": item.config.accent ?? "#ff4f91",
    "--cosmetic-secondary": item.config.accentSecondary ?? "#f5bd64",
  };
}

function MissionCard({
  mission,
  busy,
  pending,
  onClaim,
}: {
  mission: ReaderMissionView;
  busy: boolean;
  pending: boolean;
  onClaim: (missionId: string) => void;
}) {
  const percent = missionCompletionPercent(mission.progress, mission.target);
  const claimable = mission.completed && !mission.claimed;

  return (
    <article className={styles.missionCard} data-complete={mission.completed || undefined}>
      <div className={styles.missionTopline}>
        <div>
          <h3>{mission.title}</h3>
          <p>{mission.description}</p>
        </div>
        <span className={styles.expReward}>+{mission.readerExpReward} EXP</span>
      </div>

      <div className={styles.progressMeta}>
        <span>{mission.progress} / {mission.target}</span>
        <span>{percent}%</span>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={`ความคืบหน้า ${mission.title}`}
        aria-valuemin={0}
        aria-valuemax={mission.target}
        aria-valuenow={Math.min(mission.progress, mission.target)}
      >
        <span style={{ width: `${percent}%` }} />
      </div>

      <div className={styles.missionFooter}>
        <span className={styles.rewardNote}>
          {mission.grantsCosmeticBox ? <><Gift aria-hidden /> Mystery Cosmetic 1 ชิ้น</> : "รางวัลเข้า Reader Level"}
        </span>
        <button
          type="button"
          className={styles.claimButton}
          disabled={!claimable || busy}
          onClick={() => onClaim(mission.id)}
        >
          {mission.claimed ? <><Check aria-hidden /> รับแล้ว</> : pending ? "กำลังรับ..." : claimable ? "รับรางวัล" : <><LockKeyhole aria-hidden /> ยังไม่ครบ</>}
        </button>
      </div>
    </article>
  );
}

function CosmeticCard({
  item,
  busy,
  pending,
  onEquip,
}: {
  item: ReaderCosmeticView;
  busy: boolean;
  pending: boolean;
  onEquip: (item: ReaderCosmeticView) => void;
}) {
  return (
    <article className={styles.cosmeticCard} data-equipped={item.equipped || undefined}>
      <div
        className={styles.cosmeticPreview}
        data-pattern={item.config.pattern ?? "none"}
        data-animation={item.config.animation ?? "none"}
        style={cosmeticStyle(item)}
        aria-hidden
      >
        <span>{item.config.badgeText ?? (item.slot === "reader_title" ? "Aa" : "N")}</span>
      </div>
      <div className={styles.cosmeticCopy}>
        <div className={styles.cosmeticMeta}>
          <span>{SLOT_LABELS[item.slot]}</span>
          <span data-rarity={item.rarity}>{RARITY_LABELS[item.rarity]}</span>
        </div>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => onEquip(item)}
        >
          {pending ? "กำลังบันทึก..." : item.equipped ? "ถอดออก" : "สวมใส่"}
        </button>
      </div>
    </article>
  );
}

export function ReaderRpgDashboard({
  initialDashboard,
  currentStreakDays,
  prestige,
}: {
  initialDashboard: ReaderMissionDashboard;
  currentStreakDays: number;
  prestige: number;
}) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [activeTab, setActiveTab] = useState<DashboardTab>("daily");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const missionPeriod = activeTab === "weekly" ? dashboard.weekly : dashboard.daily;
  const isCosmeticsTab = activeTab === "cosmetics";
  const completedDaily = dashboard.daily.missions.filter((mission) => mission.completed).length;
  const completedWeekly = dashboard.weekly.missions.filter((mission) => mission.completed).length;

  function claimMission(missionId: string) {
    setPendingKey(`mission:${missionId}`);
    setNotice(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/me/reader-rpg/missions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ missionId }),
        });
        if (!response.ok) throw new Error(await responseMessage(response));
        const payload = await response.json() as {
          data: {
            dashboard: ReaderMissionDashboard;
            reward: {
              readerExpAwarded: number;
              duplicateCosmeticExp: number;
              cosmetic: { name: string } | null;
            };
          };
        };
        setDashboard(payload.data.dashboard);
        setNotice(
          payload.data.reward.cosmetic
            ? `เปิดกล่องสำเร็จ — ได้รับ ${payload.data.reward.cosmetic.name}`
            : payload.data.reward.duplicateCosmeticExp > 0
              ? `ของแต่งครบแล้ว กล่องจึงเปลี่ยนเป็น ${payload.data.reward.duplicateCosmeticExp} Bonus EXP`
              : `รับ ${payload.data.reward.readerExpAwarded} Reader EXP แล้ว`,
        );
        router.refresh();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "รับรางวัลไม่สำเร็จ กรุณาลองใหม่");
      } finally {
        setPendingKey(null);
      }
    });
  }

  function equipCosmetic(item: ReaderCosmeticView) {
    setPendingKey(`cosmetic:${item.id}`);
    setNotice(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/me/reader-rpg/cosmetics", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot: item.slot,
            cosmeticItemId: item.equipped ? null : item.id,
            mutationId: crypto.randomUUID(),
          }),
        });
        if (!response.ok) throw new Error(await responseMessage(response));
        const payload = await response.json() as { data: ReaderMissionDashboard };
        setDashboard(payload.data);
        setNotice(item.equipped ? `ถอด ${item.name} แล้ว` : `สวม ${item.name} แล้ว`);
        router.refresh();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "บันทึกของแต่งไม่สำเร็จ กรุณาลองใหม่");
      } finally {
        setPendingKey(null);
      }
    });
  }

  return (
    <section id="reader-rpg" className={styles.dashboard} aria-label="ภารกิจและของแต่ง Reader RPG">
      <header className={styles.header}>
        <div>
          <h2>ภารกิจนักอ่าน</h2>
          <p>อ่านจริงเพื่อรับ EXP และปลดล็อกของแต่งโปรไฟล์</p>
        </div>
        <div className={styles.summary} aria-label="สรุปภารกิจ">
          <span>Streak {currentStreakDays} วัน</span>
          <span>Prestige {prestige}</span>
          <span>วันนี้ {completedDaily}/{dashboard.daily.missions.length}</span>
          <span>สัปดาห์นี้ {completedWeekly}/{dashboard.weekly.missions.length}</span>
        </div>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="เลือกหมวด Reader RPG">
        <button type="button" role="tab" aria-selected={activeTab === "daily"} onClick={() => setActiveTab("daily")}>Daily</button>
        <button type="button" role="tab" aria-selected={activeTab === "weekly"} onClick={() => setActiveTab("weekly")}>Weekly</button>
        <button type="button" role="tab" aria-selected={isCosmeticsTab} onClick={() => setActiveTab("cosmetics")}><Shirt aria-hidden /> Cosmetics</button>
      </div>

      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}

      {isCosmeticsTab ? (
        <div className={styles.cosmeticsPanel} role="tabpanel">
          <div className={styles.panelHeading}>
            <div><h3>คลังของแต่ง</h3><p>ของที่สวมจะปรากฏบนโปรไฟล์ Class ด้านบนทันที</p></div>
            <span>{dashboard.cosmetics.items.length} ชิ้น</span>
          </div>
          {dashboard.cosmetics.items.length > 0 ? (
            <div className={styles.cosmeticGrid}>
              {dashboard.cosmetics.items.map((item) => (
                <CosmeticCard
                  key={item.id}
                  item={item}
                  busy={isPending || pendingKey !== null}
                  pending={isPending && pendingKey === `cosmetic:${item.id}`}
                  onEquip={equipCosmetic}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyCosmetics}><Gift aria-hidden /><p>ทำ Weekly Mission ให้ครบเพื่อเปิด Mystery Cosmetic</p></div>
          )}
        </div>
      ) : (
        <div className={styles.missionPanel} role="tabpanel">
          <div className={styles.panelHeading}>
            <div>
              <h3>{activeTab === "daily" ? "ภารกิจประจำวัน" : "ภารกิจประจำสัปดาห์"}</h3>
              <p>{activeTab === "daily" ? "เริ่มรอบใหม่ทุกวัน เวลา 00:00 น." : "เริ่มรอบใหม่ทุกวันจันทร์ เวลา 00:00 น."}</p>
            </div>
            <span>{missionPeriod.periodKey}</span>
          </div>
          <div className={styles.missionGrid}>
            {missionPeriod.missions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                busy={isPending || pendingKey !== null}
                pending={isPending && pendingKey === `mission:${mission.id}`}
                onClaim={claimMission}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
