import { describe, expect, it } from "vitest";
import { stateKeys } from "./states";

describe("stateKeys", () => {
  it("all includes workId", () => {
    expect(stateKeys.all(2)).toEqual(["works", 2, "states"]);
  });

  it("list omits filters when undefined", () => {
    expect(stateKeys.list(2)).toEqual(["works", 2, "states", "list", {}]);
  });

  it("list includes filters", () => {
    expect(stateKeys.list(2, { state_type: "cultivation" })).toEqual([
      "works",
      2,
      "states",
      "list",
      { state_type: "cultivation" },
    ]);
  });

  it("detail key", () => {
    expect(stateKeys.detail(2, 99)).toEqual(["works", 2, "states", "detail", 99]);
  });
});