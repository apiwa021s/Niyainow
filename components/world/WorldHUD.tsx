"use client";

import { BookOpen, Map, MessageCircle, Settings, Sparkles, Users } from "lucide-react";

import { PlayerNameplate } from "@/components/world/PlayerNameplate";
import styles from "@/components/world/world.module.css";
import type { WorldConnectionState } from "@/world/types";

const connectionLabels: Record<WorldConnectionState, string> = {
  connecting: "กำลังเปิดหน้าถัดไป…",
  connected: "ออนไลน์",
  reconnecting: "กำลังเชื่อมต่อใหม่…",
  offline: "โหมดสำรวจเดี่ยว",
};

export function WorldHUD({
  name,
  title,
  connection,
  room,
  playerCount,
  onLibrary,
  onChat,
  onEmotes,
}: {
  name: string;
  title?: string;
  connection: WorldConnectionState;
  room: string;
  playerCount: number;
  onLibrary: () => void;
  onChat: () => void;
  onEmotes: () => void;
}) {
  return (
    <>
      <div className={styles.identityCard}>
        <div className={styles.avatarGlyph}>墨</div>
        <PlayerNameplate name={name} title={title} />
        <span className={styles.connection} data-state={connection}><i />{connectionLabels[connection]}</span>
      </div>

      <aside className={styles.minimap} aria-label="แผนที่ NovelNow Central">
        <div className={styles.mapTitle}><Map size={14} /> NOVELNOW CENTRAL</div>
        <div className={styles.mapDiagram}>
          <span className={styles.mapLibrary}>ห้องสมุด</span>
          <span className={styles.mapHall}>ชุมชน</span>
          <span className={styles.mapPlaza}>●</span>
          <span className={styles.mapCafe}>คาเฟ่</span>
          <span className={styles.mapGate}>ประตูโลก</span>
        </div>
        <div className={styles.roomLine}><Users size={13} /> {playerCount} คน · {room || "กำลังจัดห้อง"}</div>
      </aside>

      <nav className={styles.hudActions} aria-label="World actions">
        <button type="button" onClick={onLibrary} aria-label="เปิดห้องสมุด"><BookOpen size={20} /><span>ห้องสมุด</span></button>
        <button type="button" onClick={onChat} aria-label="เปิดแชต"><MessageCircle size={20} /><span>แชต</span></button>
        <button type="button" onClick={onEmotes} aria-label="เปิดอีโมต"><Sparkles size={20} /><span>อีโมต</span></button>
        <button type="button" disabled aria-label="การตั้งค่า เร็ว ๆ นี้"><Settings size={20} /><span>ตั้งค่า</span></button>
      </nav>

      <div className={styles.controlsHint}>
        <span><kbd>WASD</kbd> เดิน</span><span><kbd>Shift</kbd> วิ่ง</span><span><kbd>E</kbd> โต้ตอบ</span><span><kbd>Enter</kbd> แชต</span>
      </div>
    </>
  );
}
