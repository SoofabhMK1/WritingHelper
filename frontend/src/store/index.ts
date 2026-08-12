import { create } from "zustand";

interface UiState {
  searchKeyword: string;
  setSearchKeyword: (v: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  searchKeyword: "",
  setSearchKeyword: (v) => set({ searchKeyword: v }),
}));