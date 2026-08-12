export type EventTypeKind = "main" | "branch" | "foreshadow" | "climax" | "backstory" | "reveal";
export type EventStatusKind = "planned" | "active" | "resolved" | "abandoned";
export type EventLinkKind = "causes" | "blocks" | "enables" | "contrasts" | "parallels";

export interface Event {
  id: number;
  work_id: number;
  chapter_id?: number | null;
  title: string;
  description?: string | null;
  event_type: EventTypeKind;
  story_time?: string | null;
  location?: string | null;
  importance: number;
  status: EventStatusKind;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type EventCreate = Omit<Event, "id" | "work_id" | "created_at" | "updated_at">;
export type EventUpdate = Partial<EventCreate>;

export interface EventCharacter {
  id: number;
  event_id: number;
  character_id: number;
  role: string;
  note?: string | null;
}

export interface EventLink {
  id: number;
  work_id: number;
  source_event_id: number;
  target_event_id: number;
  link_type: EventLinkKind;
  note?: string | null;
}

export interface EventWithRelations extends Event {
  character_links: EventCharacter[];
  links_out: EventLink[];
  links_in: EventLink[];
}

export const EVENT_TYPE_LABEL: Record<EventTypeKind, string> = {
  main: "主线",
  branch: "支线",
  foreshadow: "伏笔",
  climax: "高潮",
  backstory: "背景",
  reveal: "揭示",
};

export const EVENT_TYPE_COLOR: Record<EventTypeKind, string> = {
  main: "geekblue",
  branch: "blue",
  foreshadow: "purple",
  climax: "red",
  backstory: "default",
  reveal: "gold",
};

export const EVENT_STATUS_LABEL: Record<EventStatusKind, string> = {
  planned: "规划中",
  active: "进行中",
  resolved: "已解决",
  abandoned: "已放弃",
};

export const EVENT_STATUS_COLOR: Record<EventStatusKind, string> = {
  planned: "default",
  active: "processing",
  resolved: "success",
  abandoned: "error",
};

export const EVENT_LINK_LABEL: Record<EventLinkKind, string> = {
  causes: "导致",
  blocks: "阻止",
  enables: "促成",
  contrasts: "对照",
  parallels: "平行",
};

export const EVENT_LINK_ARROW: Record<EventLinkKind, string> = {
  causes: "→",
  blocks: "⊣",
  enables: "⇒",
  contrasts: "⇄",
  parallels: "∥",
};

export const IMPORTANCE_LABEL: Record<number, string> = {
  1: "轻微",
  2: "次要",
  3: "一般",
  4: "重要",
  5: "核心",
};

export const IMPORTANCE_COLOR: Record<number, string> = {
  1: "default",
  2: "blue",
  3: "cyan",
  4: "orange",
  5: "red",
};