"use client";

import { BookOpen, Bookmark, Search, X } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

import styles from "@/components/world/world.module.css";
import type { WorldCatalog, WorldNovel } from "@/world/types";

type Shelf = keyof WorldCatalog;
const shelfLabels: Record<Shelf, string> = {
  trending: "กำลังนิยม",
  continueReading: "อ่านต่อ",
  followed: "ติดตาม",
  recommendations: "แนะนำสำหรับคุณ",
};

export function NovelPanel({ catalog, initialShelf = "trending", onClose, onRead }: {
  catalog: WorldCatalog;
  initialShelf?: Shelf;
  onClose: () => void;
  onRead: (novel: WorldNovel) => void;
}) {
  const [shelf, setShelf] = useState<Shelf>(initialShelf);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<WorldNovel | null>(null);
  const allNovels = useMemo(() => {
    const bySlug = new Map<string, WorldNovel>();
    Object.values(catalog).flat().forEach((novel) => bySlug.set(novel.slug, novel));
    return [...bySlug.values()];
  }, [catalog]);
  const novels = query.trim()
    ? allNovels.filter((novel) => `${novel.title} ${novel.author}`.toLocaleLowerCase("th").includes(query.trim().toLocaleLowerCase("th")))
    : catalog[shelf];

  return (
    <section className={styles.libraryPanel} role="dialog" aria-modal="true" aria-label="ห้องสมุดใหญ่">
      <header className={styles.libraryHeader}>
        <div><span>GRAND LIBRARY · NOVELNOW CENTRAL</span><h2>ทุกเรื่องราว มีโลกให้คุณเข้าไปอยู่</h2></div>
        <button type="button" onClick={onClose} aria-label="ปิดห้องสมุด"><X size={22} /></button>
      </header>
      <label className={styles.librarySearch}><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อเรื่องหรือนักเขียน" /></label>
      <nav className={styles.shelfTabs} aria-label="ชั้นหนังสือ">
        {(Object.keys(shelfLabels) as Shelf[]).map((key) => <button key={key} type="button" data-active={!query && shelf === key} onClick={() => { setQuery(""); setShelf(key); }}>{shelfLabels[key]}</button>)}
      </nav>
      <div className={styles.libraryContent}>
        <div className={styles.novelGrid}>
          {novels.map((novel) => (
            <button key={novel.slug} type="button" onClick={() => setSelected(novel)} data-active={selected?.slug === novel.slug}>
              <span className={styles.cover}><Image src={novel.cover} alt="" fill sizes="120px" /></span>
              <strong>{novel.title}</strong>
              <small>{novel.author} · {novel.chapters.toLocaleString("th-TH")} ตอน</small>
              {novel.progress !== undefined ? <i><span style={{ width: `${Math.max(0, Math.min(100, novel.progress))}%` }} /></i> : null}
            </button>
          ))}
          {novels.length === 0 ? <p className={styles.emptyShelf}>ชั้นนี้ยังว่างอยู่ ลองดู “แนะนำสำหรับคุณ” ก่อนนะ</p> : null}
        </div>
        <aside className={styles.novelDetail}>
          {selected ? <>
            <span>NEW STORY DISCOVERED</span>
            <div className={styles.detailCover}><Image src={selected.cover} alt="" fill sizes="160px" /></div>
            <h3>{selected.title}</h3>
            <p className={styles.novelMeta}>{selected.author} · {selected.status === "completed" ? "จบแล้ว" : `${selected.chapters.toLocaleString("th-TH")} ตอน`}</p>
            <p>{selected.synopsis}</p>
            {selected.chapterLabel ? <small className={styles.chapterLabel}>{selected.chapterLabel}</small> : null}
            <div><button type="button" onClick={() => onRead(selected)}><BookOpen size={17} /> อ่านเลย</button><button type="button" disabled title="ใช้คลัง NovelNow ในหน้ารายละเอียดเรื่อง"><Bookmark size={17} /> บันทึก</button></div>
          </> : <div className={styles.selectStory}><BookOpen size={38} /><p>เลือกหนังสือจากชั้น<br />เพื่อเปิดรายละเอียดเรื่อง</p></div>}
        </aside>
      </div>
    </section>
  );
}
