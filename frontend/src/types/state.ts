export type StateTypeKind =
  | "physical"
  | "mental"
  | "location"
  | "relationship"
  | "wealth"
  | "skill"
  | "cultivation"
  | "status"
  | "other";

export interface CharacterState {
  id: number;
  work_id: number;
  character_id: number;
  chapter_id?: number | null;
  state_type: StateTypeKind;
  state_key: string;
  state_value: string;
  note?: string | null;
  captured_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type StateCreate = Omit<CharacterState, "id" | "work_id" | "created_at" | "updated_at">;
export type StateUpdate = Partial<Omit<StateCreate, "character_id">>;

export const STATE_TYPE_LABEL: Record<StateTypeKind, string> = {
  physical: "身体",
  mental: "心理",
  location: "位置",
  relationship: "关系",
  wealth: "财富",
  skill: "技能",
  cultivation: "修为",
  status: "身份",
  other: "其他",
};

export const STATE_TYPE_COLOR: Record<StateTypeKind, string> = {
  physical: "volcano",
  mental: "geekblue",
  location: "green",
  relationship: "magenta",
  wealth: "gold",
  skill: "blue",
  cultivation: "purple",
  status: "default",
  other: "default",
};

export const STATE_TYPE_OPTIONS: { value: StateTypeKind; label: string }[] = (
  Object.entries(STATE_TYPE_LABEL) as [StateTypeKind, string][]
).map(([value, label]) => ({ value, label }));

export const COMMON_KEYS: Record<StateTypeKind, string[]> = {
  physical: ["伤势", "外貌", "体力"],
  mental: ["心境", "执念", "恐惧"],
  location: ["所在", "籍贯"],
  relationship: ["师父", "恋人", "仇人", "挚友"],
  wealth: ["灵石", "金币", "宝物"],
  skill: ["已学技能", "武器", "功法等级"],
  cultivation: ["境界", "修为进度"],
  status: ["阵营", "官职", "称号"],
  other: [],
};