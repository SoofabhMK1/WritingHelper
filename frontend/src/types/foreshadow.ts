export type ForeshadowStatusKind = "open" | "closing" | "resolved";

export interface Foreshadow {
  id: number;
  work_id: number;
  chapter_id?: number | null;
  title: string;
  description?: string | null;
  quote?: string | null;
  planted_chapter_id?: number | null;
  payoff_chapter_id?: number | null;
  status: ForeshadowStatusKind;
  created_at: string;
  updated_at: string;
}

export type ForeshadowCreate = Omit<Foreshadow, "id" | "work_id" | "created_at" | "updated_at">;
export type ForeshadowUpdate = Partial<ForeshadowCreate>;

export const FORESHADOW_STATUS_LABEL: Record<ForeshadowStatusKind, string> = {
  open: "已埋",
  closing: "即将收",
  resolved: "已收",
};

export const FORESHADOW_STATUS_COLOR: Record<ForeshadowStatusKind, string> = {
  open: "orange",
  closing: "blue",
  resolved: "green",
};