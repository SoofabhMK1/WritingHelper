import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  PromptFragment,
  PromptFragmentCreate,
  PromptFragmentUpdate,
} from "./prompt-fragment";

describe("PromptFragment types", () => {
  it("PromptFragment has the required fields", () => {
    const sample: PromptFragment = {
      id: 1,
      name: "风格指南",
      body: "保持冷硬克制",
      description: null,
      created_at: "2026-08-12T00:00:00",
      updated_at: "2026-08-12T00:00:00",
    };
    expect(sample.id).toBe(1);
    expect(sample.name).toBe("风格指南");
  });

  it("Create only has content fields", () => {
    expectTypeOf<PromptFragmentCreate>().toEqualTypeOf<{
      name: string;
      body: string;
      description: string | null;
    }>();
  });

  it("Update is a partial of Create", () => {
    expectTypeOf<PromptFragmentUpdate>().toEqualTypeOf<Partial<PromptFragmentCreate>>();
  });
});