import * as Phaser from "phaser";

export function worldGameConfig(parent: HTMLElement, scenes: Phaser.Scene[], preBoot: (game: Phaser.Game) => void): Phaser.Types.Core.GameConfig {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#e9e4cd",
    transparent: false,
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    render: { powerPreference: "high-performance", antialiasGL: true },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: "100%",
      height: "100%",
    },
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false, fps: 60 },
    },
    fps: { target: reducedMotion ? 45 : 60, min: 24, forceSetTimeOut: false },
    scene: scenes,
    callbacks: { preBoot },
    audio: { noAudio: true },
  };
}
