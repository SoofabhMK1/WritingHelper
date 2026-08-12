import { describe, expect, it } from "vitest";
import { chapterKeys } from "./chapters";
import { volumeKeys } from "./volumes";

describe("volumeKeys", () => {
  it("all includes workId", () => {
    expect(volumeKeys.all(1)).toEqual(["works", 1, "volumes"]);
  });
});

describe("chapterKeys", () => {
  it("all includes workId", () => {
    expect(chapterKeys.all(7)).toEqual(["works", 7, "chapters"]);
  });

  it("list omits undefined volumeId", () => {
    expect(chapterKeys.list(1, undefined)).toEqual(["works", 1, "chapters", "list", { volumeId: undefined }]);
  });

  it("list includes volumeId when provided", () => {
    expect(chapterKeys.list(1, 5)).toEqual(["works", 1, "chapters", "list", { volumeId: 5 }]);
  });

  it("list includes null as free chapters", () => {
    expect(chapterKeys.list(1, null)).toEqual(["works", 1, "chapters", "list", { volumeId: null }]);
  });

  it("detail includes id", () => {
    expect(chapterKeys.detail(1, 99)).toEqual(["works", 1, "chapters", "detail", 99]);
  });
});