import { describe, expect, it } from "vitest";
import { aiProfileKeys } from "./aiProfile";

describe("aiProfileKeys", () => {
  it("all is stable", () => {
    expect(aiProfileKeys.all).toEqual(["ai-profiles"]);
  });

  it("list extends all", () => {
    expect(aiProfileKeys.list()).toEqual(["ai-profiles", "list"]);
  });

  it("assignments extends all", () => {
    expect(aiProfileKeys.assignments()).toEqual([
      "ai-profiles",
      "assignments",
    ]);
  });
});