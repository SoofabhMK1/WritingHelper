export type CharacterRole =
  | "protagonist"
  | "deuteragonist"
  | "support"
  | "antagonist"
  | "mentor"
  | "love_interest"
  | "side"
  | "npc";

export interface Character {
  id: number;
  work_id: number;
  name: string;
  aliases?: string | null;
  role: CharacterRole;
  age?: number | null;
  gender?: string | null;
  appearance?: string | null;
  personality?: string | null;
  background?: string | null;
  motivation?: string | null;
  arc?: string | null;
  speech_style?: string | null;
  ability?: string | null;
  occupation?: string | null;
  notes?: string | null;
  avatar?: string | null;
  created_at: string;
  updated_at: string;
}

export type CharacterCreate = Omit<Character, "id" | "work_id" | "created_at" | "updated_at">;
export type CharacterUpdate = Partial<CharacterCreate>;

export const CHARACTER_ROLE_LABEL: Record<CharacterRole, string> = {
  protagonist: "主角",
  deuteragonist: "次主角",
  support: "辅助角色",
  antagonist: "反派",
  mentor: "导师",
  love_interest: "感情线",
  side: "配角",
  npc: "龙套",
};

export const CHARACTER_ROLE_COLOR: Record<CharacterRole, string> = {
  protagonist: "gold",
  deuteragonist: "orange",
  support: "blue",
  antagonist: "red",
  mentor: "purple",
  love_interest: "magenta",
  side: "default",
  npc: "default",
};

export const CHARACTER_ROLE_OPTIONS: { value: CharacterRole; label: string }[] = (
  Object.entries(CHARACTER_ROLE_LABEL) as [CharacterRole, string][]
).map(([value, label]) => ({ value, label }));