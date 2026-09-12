"use client";

import styles from "@/components/world/world.module.css";
import type { WorldInteraction } from "@/world/types";

export function InteractionPrompt({ interaction, onInteract }: { interaction: WorldInteraction | null; onInteract: () => void }) {
  if (!interaction) return null;
  return (
    <button type="button" className={styles.interactionPrompt} onClick={onInteract}>
      <kbd>E</kbd>
      <span>{interaction.label}</span>
    </button>
  );
}
