export type ChapterStatus = "planning" | "drafting" | "writing" | "reviewing" | "done";
export type ChapterTypeKind =
  | "opening"
  | "plot"
  | "transitional"
  | "climax"
  | "resolution"
  | "epilogue"
  | "interlude";

export interface Chapter {
  id: number;
  work_id: number;
  volume_id?: number | null;
  title: string;
  summary?: string | null;
  outline?: string | null;
  content?: string | null;
  order_num: number;
  target_words: number;
  actual_words: number;
  status: ChapterStatus;
  chapter_type: ChapterTypeKind;
  mood?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChapterCreate {
  work_id: number;
  title: string;
  summary?: string | null;
  outline?: string | null;
  content?: string | null;
  order_num?: number;
  target_words?: number;
  actual_words?: number;
  status?: ChapterStatus;
  chapter_type?: ChapterTypeKind;
  mood?: string | null;
  volume_id?: number | null;
}

export type ChapterUpdate = Partial<Omit<ChapterCreate, "work_id">>;

export const CHAPTER_STATUS_LABEL: Record<ChapterStatus, string> = {
  planning: "构思中",
  drafting: "草稿中",
  writing: "写作中",
  reviewing: "修订中",
  done: "已完成",
};

export const CHAPTER_STATUS_COLOR: Record<ChapterStatus, string> = {
  planning: "default",
  drafting: "cyan",
  writing: "processing",
  reviewing: "warning",
  done: "success",
};

export const CHAPTER_TYPE_LABEL: Record<ChapterTypeKind, string> = {
  opening: "开篇",
  plot: "主线",
  transitional: "过渡",
  climax: "高潮",
  resolution: "收束",
  epilogue: "尾声",
  interlude: "插叙",
};