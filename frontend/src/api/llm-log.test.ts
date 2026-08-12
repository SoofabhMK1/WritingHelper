import { describe, expect, it } from "vitest";
import { llmLogKeys } from "./llm-log";

describe("llmLogKeys", () => {
  it("all is stable", () => {
    expect(llmLogKeys.all).toEqual(["ai-logs"]);
  });

  it("list extends all with the filter object", () => {
    expect(llmLogKeys.list({})).toEqual(["ai-logs", "list", {}]);
    expect(llmLogKeys.list({ workId: 1, status: "ok" })).toEqual([
      "ai-logs",
      "list",
      { workId: 1, status: "ok" },
    ]);
  });

  it("detail extends all with the id", () => {
    expect(llmLogKeys.detail(42)).toEqual(["ai-logs", "detail", 42]);
  });
});
