"use client";

import { ArrowRight, BookOpen, Coffee, DoorOpen, Flag, Heart, Laugh, SmilePlus, Sparkles, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CharacterCreator } from "@/components/world/CharacterCreator";
import { InteractionPrompt } from "@/components/world/InteractionPrompt";
import { NovelPanel } from "@/components/world/NovelPanel";
import { WorldCanvas } from "@/components/world/WorldCanvas";
import { WorldChat } from "@/components/world/WorldChat";
import { WorldHUD } from "@/components/world/WorldHUD";
import styles from "@/components/world/world.module.css";
import type { WorldGameBridge, WorldPositionSnapshot } from "@/world/engine/bridge";
import type { WorldGameController } from "@/world/engine/Game";
import type { WorldCatalog, WorldCharacter, WorldChatMessage, WorldConnectionState, WorldEmote, WorldInteraction, WorldNovel } from "@/world/types";

type Panel = "library" | "community" | "gate" | "cafe" | "notice" | "emotes" | null;

function WorldIntro({ onComplete }: { onComplete: () => void }) {
  const [panel, setPanel] = useState(0);
  const panels = [
    ["หนึ่ง", "หนังสือทุกเล่มคือประตู", "และบางประตูไม่ได้พาเราไปเพียงลำพัง"],
    ["สอง", "ที่ลานแห่งนี้ นักอ่านจากหลายเรื่องมาพบกัน", "เดินขึ้นเหนือเพื่อเปิดห้องสมุดใหญ่"],
    ["สาม", "นี่คือหน้าของคุณ", "เรื่องราวต่อไป เริ่มเมื่อคุณก้าวออกไป"],
  ];
  return (
    <div className={styles.introBackdrop}>
      <section className={styles.introPanel}>
        <span>PANEL {panels[panel][0]}</span><h2>{panels[panel][1]}</h2><p>{panels[panel][2]}</p>
        <div><button type="button" onClick={onComplete}>ข้ามบทนำ</button><button type="button" onClick={() => panel === panels.length - 1 ? onComplete() : setPanel((value) => value + 1)}>{panel === panels.length - 1 ? "ก้าวเข้าสู่โลก" : "หน้าถัดไป"}<ArrowRight size={17} /></button></div>
      </section>
    </div>
  );
}

function PaperPanel({ title, kicker, children, onClose }: { title: string; kicker: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <section className={styles.paperPanel} role="dialog" aria-modal="true" aria-label={title}>
      <header><div><span>{kicker}</span><h2>{title}</h2></div><button type="button" onClick={onClose} aria-label="ปิด"><X size={20} /></button></header>
      {children}
    </section>
  );
}

const EMOTES: { id: WorldEmote; label: string; icon: React.ReactNode }[] = [
  { id: "wave", label: "โบกมือ", icon: <SmilePlus /> }, { id: "heart", label: "หัวใจ", icon: <Heart /> },
  { id: "laugh", label: "หัวเราะ", icon: <Laugh /> }, { id: "surprise", label: "ตกใจ", icon: <span>!</span> },
  { id: "book", label: "หนังสือ", icon: <BookOpen /> }, { id: "sparkle", label: "ประกาย", icon: <Sparkles /> },
];

export function WorldExperience({ initialCharacter, catalog, suggestedName }: { initialCharacter: WorldCharacter | null; catalog: WorldCatalog; suggestedName: string | null }) {
  const router = useRouter();
  const [character, setCharacter] = useState(initialCharacter);
  const [introOpen, setIntroOpen] = useState(Boolean(initialCharacter && !initialCharacter.introCompleted));
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [prompt, setPrompt] = useState<WorldInteraction | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [libraryShelf, setLibraryShelf] = useState<keyof WorldCatalog>("trending");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<WorldChatMessage[]>([]);
  const [connection, setConnection] = useState<WorldConnectionState>("connecting");
  const [room, setRoom] = useState("");
  const [playerCount, setPlayerCount] = useState(1);
  const [notice, setNotice] = useState("");
  const [guide, setGuide] = useState(true);
  const controllerRef = useRef<WorldGameController | null>(null);
  const snapshotRef = useRef<WorldPositionSnapshot | null>(null);
  const interactionHandlerRef = useRef<(interaction: WorldInteraction) => void>(() => undefined);

  const persistPosition = useCallback((snapshot: WorldPositionSnapshot | null = snapshotRef.current) => {
    if (!snapshot) return Promise.resolve();
    localStorage.setItem("novelnow-world-position", JSON.stringify(snapshot));
    return fetch("/api/world/position", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
      keepalive: true,
    }).then(() => undefined).catch(() => undefined);
  }, []);

  const bridge = useMemo<WorldGameBridge>(() => ({
    onReady: () => setReady(true),
    onLoading: setLoadingProgress,
    onPrompt: setPrompt,
    onInteraction: (interaction) => interactionHandlerRef.current(interaction),
    onConnection: setConnection,
    onRoom: setRoom,
    onPlayerCount: setPlayerCount,
    onChat: (message) => setMessages((current) => [...current.slice(-49), message]),
    onPosition: (snapshot) => { snapshotRef.current = snapshot; void persistPosition(snapshot); },
    onError: (message) => { setNotice(message); window.setTimeout(() => setNotice(""), 4_500); },
  }), [persistPosition]);

  const closePanels = useCallback(() => { setPanel(null); setChatOpen(false); }, []);
  const handleInteraction = useCallback((interaction: WorldInteraction) => {
    if (interaction.type === "seat") {
      controllerRef.current?.sit();
      setNotice("คุณพักอ่านลมอยู่ครู่หนึ่ง…");
      window.setTimeout(() => setNotice(""), 2_600);
      return;
    }
    if (interaction.type === "portal") {
      controllerRef.current?.transition(interaction);
      window.setTimeout(() => setPanel("gate"), 260);
      return;
    }
    if (interaction.type === "community") { setPanel("community"); return; }
    if (interaction.type === "novel") {
      setLibraryShelf(interaction.target === "recommendations" || interaction.target === "story-monument" ? "recommendations" : "trending");
      setPanel("library");
      return;
    }
    if (interaction.target === "grand-library") { setLibraryShelf("trending"); setPanel("library"); }
    else if (interaction.target === "reader-cafe") setPanel("cafe");
    else setPanel("notice");
  }, []);
  useEffect(() => {
    interactionHandlerRef.current = handleInteraction;
  }, [handleInteraction]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "Enter" && character && ready && !panel) { event.preventDefault(); setChatOpen(true); }
      if (event.key === "Escape" && (panel || chatOpen)) closePanels();
    };
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [character, chatOpen, closePanels, panel, ready]);

  useEffect(() => {
    const onPageHide = () => { void persistPosition(); };
    window.addEventListener("pagehide", onPageHide);
    return () => { window.removeEventListener("pagehide", onPageHide); void persistPosition(); };
  }, [persistPosition]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => setGuide(false), 10_000);
    return () => window.clearTimeout(timer);
  }, [ready]);

  if (!character) return <CharacterCreator suggestedName={suggestedName} onCreated={(created) => { setCharacter(created); setIntroOpen(true); }} />;

  const completeIntro = () => {
    setIntroOpen(false);
    void fetch("/api/world/intro", { method: "POST" });
  };
  const openReader = async (novel: WorldNovel) => {
    await persistPosition();
    router.push(novel.readHref);
  };
  const inputEnabled = ready && !introOpen && !panel && !chatOpen;

  return (
    <main id="main" className={styles.worldRoot}>
      <WorldCanvas character={character} bridge={bridge} controllerRef={controllerRef} inputEnabled={inputEnabled} />
      {!ready ? <div className={styles.worldLoading}><div className={styles.loadingMark}>N</div><h1>NovelNow World</h1><p>“ทุกเรื่องราว มีโลกให้คุณเข้าไปอยู่”</p><span>Opening the next page…</span><div><i style={{ width: `${Math.max(8, loadingProgress * 100)}%` }} /></div></div> : null}
      {ready ? <>
        <WorldHUD name={character.displayName} title={character.title} connection={connection} room={room} playerCount={playerCount} onLibrary={() => { setLibraryShelf("trending"); setPanel("library"); }} onChat={() => setChatOpen(true)} onEmotes={() => setPanel("emotes")} />
        <InteractionPrompt interaction={prompt} onInteract={() => controllerRef.current?.interact()} />
      </> : null}
      {guide && ready && !introOpen ? <button type="button" className={styles.guideBubble} onClick={() => setGuide(false)}>“ห้องสมุดใหญ่อยู่ทางเหนือ ลองไปดูสิ” <X size={14} /></button> : null}
      {notice ? <div className={styles.worldNotice} role="status">{notice}</div> : null}
      <WorldChat open={chatOpen} messages={messages} onClose={() => setChatOpen(false)} onSend={(message) => controllerRef.current?.sendChat(message)} />
      {panel === "library" ? <NovelPanel key={libraryShelf} catalog={catalog} initialShelf={libraryShelf} onClose={() => setPanel(null)} onRead={openReader} /> : null}
      {panel === "community" ? <PaperPanel kicker="COMMUNITY HALL" title="ชุมชนของนักอ่าน" onClose={() => setPanel(null)}><div className={styles.communityCards}><article><Users /><h3>ค้นพบชุมชน</h3><p>พบกลุ่มนักอ่านจากแนวเรื่องและช่วงเวลาที่คุณชอบ</p><button type="button" disabled>เปิดเร็ว ๆ นี้</button></article><article><Flag /><h3>ชุมชนที่เข้าร่วม</h3><p>พื้นที่ของชุมชนจะเชื่อมกับบัญชี NovelNow โดยตรง</p><button type="button" disabled>ยังไม่มีชุมชน</button></article></div><button type="button" className={styles.primaryPaperButton} disabled>สร้างชุมชน · PHASE ถัดไป</button></PaperPanel> : null}
      {panel === "gate" ? <PaperPanel kicker="WORLD GATE" title="โลกของเรื่องราว" onClose={() => setPanel(null)}><p className={styles.panelLead}>ประตูตอบรับเสียงของหนังสือ แต่เรื่องราวเหล่านี้ยังวาดไม่เสร็จ</p><div className={styles.genreGates}>{["Fantasy", "Romance", "Eastern Fantasy", "Mystery"].map((genre) => <button type="button" key={genre} onClick={() => setNotice(`${genre} · COMING SOON`)}><DoorOpen />{genre}<small>COMING SOON</small></button>)}</div></PaperPanel> : null}
      {panel === "cafe" ? <PaperPanel kicker="READER CAFÉ" title="พักเรื่องไว้ตรงนี้สักครู่" onClose={() => setPanel(null)}><div className={styles.cafePanel}><Coffee /><p>มุมสงบสำหรับนั่ง อ่าน และคุยกับนักอ่านใกล้ตัว เลือกที่นั่งในโลกหรือเปิดแชตได้เลย</p><div><button type="button" onClick={() => { setPanel(null); setChatOpen(true); }}>เปิดแชต</button><button type="button" onClick={() => { setLibraryShelf("continueReading"); setPanel("library"); }}>อ่านต่อ</button></div></div></PaperPanel> : null}
      {panel === "notice" ? <PaperPanel kicker="THE NEXT DISTRICT" title="หมึกบนหน้านี้ยังไม่แห้ง" onClose={() => setPanel(null)}><p className={styles.panelLead}>เขตที่พักส่วนตัวจะเปิดในภายหลัง ตอนนี้ลองเดินกลับไปที่ลานกลางหรือห้องสมุดใหญ่ก่อนนะ</p></PaperPanel> : null}
      {panel === "emotes" ? <PaperPanel kicker="MANGA EXPRESSIONS" title="ส่งอารมณ์เล็ก ๆ" onClose={() => setPanel(null)}><div className={styles.emoteGrid}>{EMOTES.map((emote) => <button type="button" key={emote.id} onClick={() => { controllerRef.current?.sendEmote(emote.id); setPanel(null); }}>{emote.icon}<span>{emote.label}</span></button>)}</div></PaperPanel> : null}
      {introOpen ? <WorldIntro onComplete={completeIntro} /> : null}
    </main>
  );
}
