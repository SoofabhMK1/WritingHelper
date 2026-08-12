import { create } from "zustand";

export type ThemeMode = "light" | "dark";

interface UiState {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "xs.theme";

function readInitial(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage?.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  // auto-detect
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: readInitial(),
  setTheme: (t) => {
    if (typeof window !== "undefined") {
      window.localStorage?.setItem(STORAGE_KEY, t);
    }
    set({ theme: t });
  },
  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    if (typeof window !== "undefined") {
      window.localStorage?.setItem(STORAGE_KEY, next);
    }
    set({ theme: next });
  },
}));