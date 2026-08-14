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
  story_seed?: string | null;
  core_conflict?: string | null;
  protagonist_goal?: string | null;
  themes?: string[] | null;
  era?: string | null;
  setting?: string | null;
  world_rules?: string | null;
  pace?: number | null;
  realism?: number | null;
  prose?: number | null;
  moods?: string[] | null;
  length_type?: string | null;
  stage?: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkCreate = Omit<Work, "id" | "current_words" | "created_at" | "updated_at">;
export type WorkUpdate = Partial<WorkCreate>;

export interface WorkFormValues {
  title?: string;
  subtitle?: string;
  genre?: string;
  style?: string;
  pov?: string;
  status?: WorkStatus;
  target_words?: number | null;
  description?: string;
  notes?: string;
  cover?: string;
  story_seed?: string;
  core_conflict?: string;
  protagonist_goal?: string;
  themes?: string[];
  era?: string;
  era_custom?: string;
  setting?: string;
  world_rules?: string;
  pace?: number | null;
  realism?: number | null;
  prose?: number | null;
  moods?: string[];
  length_type?: string;
  stage?: string;
}

export const ERA_PRESETS = ["古代", "现代", "近未来", "架空"] as const;

export const LENGTH_TYPE_OPTIONS = ["短篇", "中篇", "长篇", "超长篇"].map((v) => ({
  value: v,
  label: v,
}));

export const STAGE_OPTIONS = ["只有灵感", "正在建立设定", "已经有大纲", "准备开始正文"].map(
  (v) => ({ value: v, label: v })
);

export const MOOD_PRESETS = [
  "温暖",
  "压抑",
  "黑暗",
  "克制",
  "热血",
  "荒诞",
  "悲凉",
  "轻松",
  "悬疑",
].map((v) => ({ value: v, label: v }));

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