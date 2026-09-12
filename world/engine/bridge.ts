import type {
  WorldChatMessage,
  WorldConnectionState,
  WorldInteraction,
} from "@/world/types";

export type WorldPositionSnapshot = { worldId: string; x: number; y: number };

export type WorldGameBridge = {
  onReady: () => void;
  onLoading: (progress: number) => void;
  onPrompt: (interaction: WorldInteraction | null) => void;
  onInteraction: (interaction: WorldInteraction) => void;
  onConnection: (state: WorldConnectionState) => void;
  onRoom: (roomId: string) => void;
  onPlayerCount: (count: number) => void;
  onChat: (message: WorldChatMessage) => void;
  onPosition: (snapshot: WorldPositionSnapshot) => void;
  onError: (message: string) => void;
};
