export type WorkStatus = "draft" | "writing" | "paused" | "completed" | "abandoned";

export interface Work {
  id: number;
  title: string;
  subtitle?: string | null;
  genre?: string | null;
  style?: string | null;
  pov?: string | null;
  description?: string | null;
  target_words: number;
  current_words: number;
  status: WorkStatus;
  cover?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkCreate = Omit<Work, "id" | "current_words" | "created_at" | "updated_at">;
export type WorkUpdate = Partial<WorkCreate>;

export const STATUS_LABEL: Record<WorkStatus, string> = {
  draft: "草稿",
  writing: "写作中",
  paused: "暂停",
  completed: "已完结",
  abandoned: "已弃坑",
};

export const STATUS_COLOR: Record<WorkStatus, string> = {
  draft: "default",
  writing: "processing",
  paused: "warning",
  completed: "success",
  abandoned: "error",
};