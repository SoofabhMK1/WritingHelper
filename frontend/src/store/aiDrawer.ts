import { create } from "zustand";
import type { Chapter, Volume } from "@/types";

export type AIDrawerTarget =
  | { kind: "volume"; workId: number; volume: Volume }
  | { kind: "chapter"; workId: number; chapter: Chapter }
  | null;

interface AIDrawerState {
  target: AIDrawerTarget;
  openVolume: (workId: number, volume: Volume) => void;
  openChapter: (workId: number, chapter: Chapter) => void;
  close: () => void;
}

export const useAIDrawer = create<AIDrawerState>((set) => ({
  target: null,
  openVolume: (workId, volume) =>
    set({ target: { kind: "volume", workId, volume } }),
  openChapter: (workId, chapter) =>
    set({ target: { kind: "chapter", workId, chapter } }),
  close: () => set({ target: null }),
}));