import { describe, expect, it } from "vitest";
import { foreshadowKeys } from "./foreshadowing";

describe("foreshadowKeys", () => {
  it("all includes workId", () => {
    expect(foreshadowKeys.all(2)).toEqual(["works", 2, "foreshadowing"]);
  });

  it("list omits filters when undefined", () => {
    expect(foreshadowKeys.list(2)).toEqual(["works", 2, "foreshadowing", "list", {}]);
  });

  it("list includes filters", () => {
    expect(foreshadowKeys.list(2, { status: "open" })).toEqual([
      "works",
      2,
      "foreshadowing",
      "list",
      { status: "open" },
    ]);
  });

  it("detail key", () => {
    expect(foreshadowKeys.detail(2, 99)).toEqual(["works", 2, "foreshadowing", "detail", 99]);
  });
});