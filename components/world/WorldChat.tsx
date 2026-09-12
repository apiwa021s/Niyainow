"use client";

import { Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import styles from "@/components/world/world.module.css";
import { WORLD_CHAT_MAX_LENGTH } from "@/world/multiplayer/moderation";
import type { WorldChatMessage } from "@/world/types";

export function WorldChat({
  open,
  messages,
  onClose,
  onSend,
}: {
  open: boolean;
  messages: WorldChatMessage[];
  onClose: () => void;
  onSend: (message: string) => void;
}) {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => endRef.current?.scrollIntoView({ block: "nearest" }), [messages]);
  if (!open) return null;

  const submit = () => {
    const value = message.trim();
    if (!value) return;
    onSend(value);
    setMessage("");
  };
  return (
    <section className={styles.chatPanel} aria-label="แชตใกล้ตัว">
      <header><div><span>LOCAL CHAT</span><strong>เสียงจากลานกลาง</strong></div><button type="button" onClick={onClose} aria-label="ปิดแชต"><X size={18} /></button></header>
      <div className={styles.chatMessages} aria-live="polite">
        {messages.length === 0 ? <p className={styles.emptyChat}>ยังเงียบอยู่… ลองทักนักอ่านที่เดินผ่านมาสิ</p> : messages.map((item) => (
          <p key={item.id}><strong>{item.displayName}</strong><span>{item.message}</span></p>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <input ref={inputRef} value={message} maxLength={WORLD_CHAT_MAX_LENGTH} onChange={(event) => setMessage(event.target.value)} placeholder="พิมพ์ข้อความ…" aria-label="ข้อความแชต" />
        <button type="submit" aria-label="ส่งข้อความ" disabled={!message.trim()}><Send size={17} /></button>
      </form>
    </section>
  );
}
