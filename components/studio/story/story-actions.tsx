"use client";

import { Check, CircleAlert, CirclePause, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function StoryActions({ storyId, published, status }: { storyId: string; published: boolean; status: "ONGOING" | "COMPLETED" | "HIATUS" | "CANCELLED" }) {
  const router = useRouter();
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  async function run(action: "publish" | "complete" | "pause") {
    setLoading(action); setError("");
    try {
      const response = await fetch(`/api/studio/stories/${storyId}/${action}`, { method: "POST" });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "เปลี่ยนสถานะเรื่องไม่สำเร็จ");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "เปลี่ยนสถานะเรื่องไม่สำเร็จ"); }
    finally { setLoading(""); }
  }

  return <div><div className="flex flex-wrap gap-2">{!published ? <Button onClick={() => void run("publish")} loading={loading === "publish"}><Send className="h-4 w-4" aria-hidden />เผยแพร่เรื่อง</Button> : null}{status !== "COMPLETED" ? <Button variant="outline" onClick={() => void run("complete")} loading={loading === "complete"}><Check className="h-4 w-4" aria-hidden />ทำเครื่องหมายว่าจบแล้ว</Button> : null}{status !== "HIATUS" ? <Button variant="ghost" onClick={() => void run("pause")} loading={loading === "pause"}><CirclePause className="h-4 w-4" aria-hidden />พักการเขียน</Button> : null}</div>{error ? <p role="alert" className="mt-2 inline-flex items-center gap-1.5 text-sm text-destructive"><CircleAlert className="h-4 w-4" aria-hidden />{error}</p> : null}</div>;
}
