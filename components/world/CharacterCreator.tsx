"use client";

import { ArrowRight, Check, LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";

import styles from "@/components/world/world.module.css";
import {
  DEFAULT_CHARACTER_APPEARANCE,
  worldCharacterInputSchema,
  type WorldCharacter,
  type WorldCharacterAppearance,
} from "@/world/types";

const OPTIONS = {
  bodyPreset: [["classic", "สมดุล"], ["slender", "เพรียว"], ["athletic", "ปราดเปรียว"]],
  skinTone: [["porcelain", "พอร์ซเลน"], ["warm", "อบอุ่น"], ["golden", "โกลเดน"], ["deep", "ดีป"]],
  faceId: [["gentle", "อ่อนโยน"], ["bright", "สดใส"], ["calm", "สุขุม"]],
  eyeId: [["round", "กลม"], ["soft", "นุ่มนวล"], ["sharp", "คม"]],
  hairId: [["page", "เพจ"], ["bob", "บ๊อบ"], ["long", "ยาว"], ["wave", "ลอน"]],
  hairColor: [["ink", "หมึก"], ["chestnut", "เชสต์นัต"], ["ash", "แอช"], ["rose", "โรส"]],
  topId: [["academy", "อคาเดมี"], ["cardigan", "คาร์ดิแกน"], ["blouse", "เบลาส์"]],
  bottomId: [["tailored", "เทเลอร์"], ["pleated", "พลีต"], ["relaxed", "รีแลกซ์"]],
  shoesId: [["loafers", "โลฟเฟอร์"], ["boots", "บูต"], ["sneakers", "สนีกเกอร์"]],
} as const;
const ACCESSORIES = [["glasses", "แว่นตา"], ["ribbon", "ริบบิ้น"], ["earring", "ต่างหู"], ["satchel", "กระเป๋าหนังสือ"]] as const;

function cleanSuggestedName(value: string | null) {
  const cleaned = (value ?? "").normalize("NFKC").replace(/[^\p{L}\p{M}\p{N} _-]/gu, "").trim().slice(0, 24);
  return cleaned.length >= 2 ? cleaned : "NightReader";
}

function CharacterPreview({ appearance }: { appearance: WorldCharacterAppearance }) {
  return (
    <div className={styles.characterPreview} data-skin={appearance.skinTone} data-hair={appearance.hairColor} data-top={appearance.topId} data-bottom={appearance.bottomId} data-hair-style={appearance.hairId}>
      <div className={styles.previewHalo} />
      <div className={styles.previewFigure}>
        <span className={styles.previewHairBack} />
        <span className={styles.previewNeck} />
        <span className={styles.previewHead}><i /><i /></span>
        <span className={styles.previewHair} />
        <span className={styles.previewBody} />
        <span className={styles.previewLegs} />
        {appearance.accessoryIds.includes("glasses") ? <span className={styles.previewGlasses}>○—○</span> : null}
        {appearance.accessoryIds.includes("ribbon") ? <span className={styles.previewRibbon}>◆</span> : null}
        {appearance.accessoryIds.includes("satchel") ? <span className={styles.previewSatchel} /> : null}
      </div>
      <p>DEVELOPMENT PAPER-DOLL PREVIEW</p>
    </div>
  );
}

export function CharacterCreator({ suggestedName, onCreated }: { suggestedName: string | null; onCreated: (character: WorldCharacter) => void }) {
  const [displayName, setDisplayName] = useState(() => cleanSuggestedName(suggestedName));
  const [appearance, setAppearance] = useState<WorldCharacterAppearance>(DEFAULT_CHARACTER_APPEARANCE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = <K extends keyof WorldCharacterAppearance>(key: K, value: WorldCharacterAppearance[K]) => {
    setAppearance((current) => ({ ...current, [key]: value }));
  };
  const toggleAccessory = (id: WorldCharacterAppearance["accessoryIds"][number]) => {
    setAppearance((current) => {
      const exists = current.accessoryIds.includes(id);
      return { ...current, accessoryIds: exists ? current.accessoryIds.filter((item) => item !== id) : [...current.accessoryIds.slice(-1), id] };
    });
  };
  const save = async () => {
    setError("");
    const parsed = worldCharacterInputSchema.safeParse({ displayName, ...appearance });
    if (!parsed.success) {
      setError("ชื่อต้องมี 2–24 ตัวอักษร และใช้ได้เฉพาะตัวอักษร ตัวเลข เว้นวรรค _ หรือ -");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/world/character", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const payload = await response.json() as { data?: WorldCharacter; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "บันทึกตัวละครไม่สำเร็จ");
      onCreated(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกตัวละครไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main id="main" className={styles.creatorPage}>
      <div className={styles.creatorInk} aria-hidden>世界</div>
      <section className={styles.creatorIntro}>
        <span>NOVELNOW WORLD · CHARACTER CREATION</span>
        <h1>วาดตัวคุณ<br />ลงในหน้าถัดไป</h1>
        <p>สร้างนักอ่านในสไตล์มังงะของคุณ ชุดและทรงผมทุกชิ้นแยกเป็นเลเยอร์ เพื่อรอรับงานภาพฉบับสมบูรณ์ภายหลัง</p>
        <div><Sparkles size={18} /> ไม่มีค่าสถานะ ไม่มีอาวุธ<br />มีเพียงเรื่องราวและผู้คนที่คุณจะพบ</div>
      </section>
      <CharacterPreview appearance={appearance} />
      <section className={styles.creatorControls}>
        <label className={styles.nameField}><span>ชื่อที่คนในโลกจะเห็น</span><input value={displayName} maxLength={24} onChange={(event) => setDisplayName(event.target.value)} /></label>
        {(Object.keys(OPTIONS) as (keyof typeof OPTIONS)[]).map((key) => (
          <fieldset key={key}>
            <legend>{({ bodyPreset: "รูปร่าง", skinTone: "สีผิว", faceId: "ใบหน้า", eyeId: "ดวงตา", hairId: "ทรงผม", hairColor: "สีผม", topId: "เสื้อ", bottomId: "ท่อนล่าง", shoesId: "รองเท้า" } as const)[key]}</legend>
            <div>{OPTIONS[key].map(([value, label]) => <button key={value} type="button" data-active={appearance[key] === value} onClick={() => update(key, value as WorldCharacterAppearance[typeof key])}>{appearance[key] === value ? <Check size={13} /> : null}{label}</button>)}</div>
          </fieldset>
        ))}
        <fieldset><legend>เครื่องประดับ · เลือกได้ 2 ชิ้น</legend><div>{ACCESSORIES.map(([value, label]) => <button key={value} type="button" data-active={appearance.accessoryIds.includes(value)} onClick={() => toggleAccessory(value)}>{appearance.accessoryIds.includes(value) ? <Check size={13} /> : null}{label}</button>)}</div></fieldset>
        {error ? <p className={styles.creatorError} role="alert">{error}</p> : null}
        <button type="button" className={styles.enterWorldButton} onClick={save} disabled={saving}>{saving ? <LoaderCircle className={styles.spin} size={20} /> : <ArrowRight size={20} />} เข้าสู่ NovelNow World</button>
      </section>
    </main>
  );
}
