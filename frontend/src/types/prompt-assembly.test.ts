import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  BuiltinPart,
  FragmentPart,
  Part,
  PromptAssembly,
  TextPart,
  VariablePart,
} from "./prompt-assembly";

describe("PromptAssembly types", () => {
  it("PromptAssembly shape", () => {
    const sample: PromptAssembly = {
      id: 1,
      name: "卷大纲助手",
      description: null,
      system_parts: [],
      user_parts: [],
      sample_vars: { title: "X" },
      created_at: "2026-08-12T00:00:00",
      updated_at: "2026-08-12T00:00:00",
    };
    expect(sample.id).toBe(1);
  });

  it("Part is a discriminated union over `type`", () => {
    const parts: Part[] = [
      { type: "text", body: "hi" } satisfies TextPart,
      { type: "variable", name: "x" } satisfies VariablePart,
      { type: "fragment", fragment_id: 1 } satisfies FragmentPart,
      { type: "builtin", prompt_name: "outline" } satisfies BuiltinPart,
    ];
    for (const p of parts) {
      expect(p.type).toBeTruthy();
    }
  });

  it("BuiltinPart slot is optional", () => {
    const p: BuiltinPart = { type: "builtin", prompt_name: "outline" };
    expectTypeOf(p.slot).toEqualTypeOf<"system" | "user_template" | undefined>();
  });
});