"use client";

import { useEffect, useRef } from "react";

import styles from "@/components/world/world.module.css";
import type { WorldGameBridge } from "@/world/engine/bridge";
import type { WorldGameController } from "@/world/engine/Game";
import type { WorldCharacter } from "@/world/types";

export function WorldCanvas({
  character,
  bridge,
  controllerRef,
  inputEnabled,
}: {
  character: WorldCharacter;
  bridge: WorldGameBridge;
  controllerRef: { current: WorldGameController | null };
  inputEnabled: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const inputEnabledRef = useRef(inputEnabled);

  useEffect(() => {
    let disposed = false;
    let controller: WorldGameController | null = null;
    const host = hostRef.current;
    if (!host) return;
    void import("@/world/engine/Game").then(({ createWorldGame }) => {
      if (disposed) return;
      controller = createWorldGame(host, character, bridge);
      controller.setInputEnabled(inputEnabledRef.current);
      controllerRef.current = controller;
    }).catch(() => bridge.onError("ไม่สามารถเปิดหน้ากระดาษของโลกได้ กรุณาลองใหม่"));
    return () => {
      disposed = true;
      controller?.destroy();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, [bridge, character, controllerRef]);

  useEffect(() => {
    inputEnabledRef.current = inputEnabled;
    controllerRef.current?.setInputEnabled(inputEnabled);
  }, [controllerRef, inputEnabled]);

  return <div ref={hostRef} className={styles.canvas} role="application" aria-label="NovelNow Central interactive world" />;
}
