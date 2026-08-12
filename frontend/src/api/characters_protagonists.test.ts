import { describe, expect, it } from "vitest";
import { characterKeys } from "./characters";
import { protagonistKeys } from "./protagonists";

describe("characterKeys", () => {
  it("all includes workId", () => {
    expect(characterKeys.all(3)).toEqual(["works", 3, "characters"]);
  });

  it("list includes filters", () => {
    expect(characterKeys.list(3, { role: "protagonist" })).toEqual([
      "works",
      3,
      "characters",
      "list",
      { role: "protagonist" },
    ]);
  });

  it("list omits filters when undefined", () => {
    expect(characterKeys.list(3)).toEqual(["works", 3, "characters", "list", {}]);
  });

  it("detail key", () => {
    expect(characterKeys.detail(3, 99)).toEqual(["works", 3, "characters", "detail", 99]);
  });
});

describe("protagonistKeys", () => {
  it("all includes workId", () => {
    expect(protagonistKeys.all(5)).toEqual(["works", 5, "protagonists"]);
  });

  it("detail key", () => {
    expect(protagonistKeys.detail(5, 7)).toEqual(["works", 5, "protagonists", "detail", 7]);
  });
});