import { describe, expect, it } from "vitest";
import {
  computeChecklist,
  computeLocalCompleteness,
  overallCompleteness,
} from "./completeness";
import type { WorkFormValues } from "@/types/work";

describe("computeChecklist", () => {
  it("marks everything empty for an empty draft", () => {
    const items = computeChecklist({});
    expect(items).toHaveLength(5);
    for (const item of items) {
      expect(item.done).toBe(false);
    }
  });

  it("marks 基础故事 done when only a raw idea is written", () => {
    const items = computeChecklist({
      description: "我想写一个现代官场种田小说。",
    });
    expect(items.find((i) => i.key === "story")?.done).toBe(true);
    expect(items.find((i) => i.key === "conflict")?.done).toBe(false);
  });

  it("marks 世界背景 done when any world field is set", () => {
    expect(
      computeChecklist({ era: "现代" }).find((i) => i.key === "world")?.done,
    ).toBe(true);
    expect(
      computeChecklist({ setting: "山区县城" }).find((i) => i.key === "world")
        ?.done,
    ).toBe(true);
  });
});

describe("computeLocalCompleteness", () => {
  it("returns all zeros for an empty draft", () => {
    const scores = computeLocalCompleteness({});
    expect(scores).toEqual({
      story: 0,
      character: 0,
      world: 0,
      style: 0,
      planning: 0,
    });
    expect(overallCompleteness(scores)).toBe(0);
  });

  it("rewards rich raw ideas more than empty structured fields", () => {
    const longIdea: WorkFormValues = { description: "x".repeat(300) };
    const scores = computeLocalCompleteness(longIdea);
    expect(scores.story).toBeGreaterThanOrEqual(40);
    expect(scores.character).toBeGreaterThan(0);
  });

  it("caps every dimension at 100", () => {
    const scores = computeLocalCompleteness({
      story_seed: "s",
      description: "x".repeat(500),
      core_conflict: "c",
      protagonist_goal: "g",
      era: "现代",
      setting: "s",
      world_rules: "w",
      pace: 5,
      realism: 5,
      prose: 5,
      moods: ["压抑"],
      length_type: "长篇",
      target_words: 100000,
      stage: "准备开始正文",
    });
    for (const v of Object.values(scores)) {
      expect(v).toBeLessThanOrEqual(100);
      expect(v).toBeGreaterThan(0);
    }
    expect(overallCompleteness(scores)).toBeGreaterThan(50);
  });

  it("counts style dimensions from sliders and moods", () => {
    expect(computeLocalCompleteness({ pace: 3 }).style).toBe(20);
    expect(computeLocalCompleteness({ moods: ["压抑", "克制"] }).style).toBe(
      40,
    );
    expect(computeLocalCompleteness({ pace: 3, moods: ["压抑"] }).style).toBe(
      60,
    );
  });
});
