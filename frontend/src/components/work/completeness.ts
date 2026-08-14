import type { WorkFormValues } from "@/types/work";

export interface CompletenessScores {
  story: number;
  character: number;
  world: number;
  style: number;
  planning: number;
}

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

export const DIMENSION_LABELS: Record<keyof CompletenessScores, string> = {
  story: "故事核心",
  character: "人物",
  world: "世界",
  style: "风格",
  planning: "创作规划",
};

function nonEmpty(s?: string | null): boolean {
  return !!s && s.trim().length > 0;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function computeChecklist(v: WorkFormValues): ChecklistItem[] {
  return [
    {
      key: "story",
      label: "基础故事",
      done: nonEmpty(v.story_seed) || nonEmpty(v.description),
    },
    {
      key: "style",
      label: "创作风格",
      done:
        v.pace != null ||
        v.realism != null ||
        v.prose != null ||
        (v.moods?.length ?? 0) > 0,
    },
    {
      key: "world",
      label: "世界背景",
      done: !!v.era || nonEmpty(v.setting) || nonEmpty(v.world_rules),
    },
    { key: "conflict", label: "核心冲突", done: nonEmpty(v.core_conflict) },
    { key: "goal", label: "主角目标", done: nonEmpty(v.protagonist_goal) },
  ];
}

export function computeLocalCompleteness(
  v: WorkFormValues,
): CompletenessScores {
  const descLen = v.description?.trim().length ?? 0;
  const story = clamp(
    (nonEmpty(v.story_seed) ? 30 : 0) +
      (descLen >= 200 ? 40 : descLen >= 50 ? 30 : descLen > 0 ? 15 : 0) +
      (nonEmpty(v.core_conflict) ? 20 : 0) +
      (nonEmpty(v.protagonist_goal) ? 10 : 0),
  );
  const character = clamp(
    (nonEmpty(v.protagonist_goal) ? 60 : 0) +
      (nonEmpty(v.core_conflict) ? 20 : 0) +
      (descLen >= 200 ? 20 : 0),
  );
  const world = clamp(
    (v.era ? 30 : 0) +
      (nonEmpty(v.setting) ? 35 : 0) +
      (nonEmpty(v.world_rules) ? 35 : 0),
  );
  const style = clamp(
    (v.pace != null ? 20 : 0) +
      (v.realism != null ? 20 : 0) +
      (v.prose != null ? 20 : 0) +
      ((v.moods?.length ?? 0) > 0 ? 40 : 0),
  );
  const planning = clamp(
    (v.length_type ? 40 : 0) +
      ((v.target_words ?? 0) > 0 ? 30 : 0) +
      (v.stage ? 30 : 0),
  );
  return { story, character, world, style, planning };
}

export function overallCompleteness(s: CompletenessScores): number {
  return Math.round(
    (s.story + s.character + s.world + s.style + s.planning) / 5,
  );
}
