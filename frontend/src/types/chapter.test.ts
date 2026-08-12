import { describe, expect, it } from "vitest";
import {
  CHAPTER_STATUS_COLOR,
  CHAPTER_STATUS_LABEL,
  CHAPTER_TYPE_LABEL,
  type ChapterTypeKind,
} from "./chapter";

describe("chapter status", () => {
  it("has 5 statuses", () => {
    expect(Object.keys(CHAPTER_STATUS_LABEL)).toHaveLength(5);
    expect(Object.keys(CHAPTER_STATUS_COLOR)).toHaveLength(5);
  });

  it("status keys aligned", () => {
    expect(Object.keys(CHAPTER_STATUS_LABEL).sort()).toEqual(
      Object.keys(CHAPTER_STATUS_COLOR).sort()
    );
  });

  it("status enum values", () => {
    expect(CHAPTER_STATUS_LABEL.planning).toBe("构思中");
    expect(CHAPTER_STATUS_LABEL.done).toBe("已完成");
  });
});

describe("chapter type", () => {
  it("has 7 types", () => {
    expect(Object.keys(CHAPTER_TYPE_LABEL)).toHaveLength(7);
  });

  it("contains canonical types", () => {
    expect(CHAPTER_TYPE_LABEL.opening).toBe("开篇");
    expect(CHAPTER_TYPE_LABEL.climax).toBe("高潮");
    expect(CHAPTER_TYPE_LABEL.epilogue).toBe("尾声");
  });

  it("all labels are non-empty strings", () => {
    for (const [k, v] of Object.entries(CHAPTER_TYPE_LABEL)) {
      expect(v).toBeTruthy();
      expect(typeof k).toBe("string");
    }
  });
});

describe("chapter enum invariants", () => {
  it("status and type keys do not collide", () => {
    const status = Object.keys(CHAPTER_STATUS_LABEL);
    const type = Object.keys(CHAPTER_TYPE_LABEL);
    expect(status.some((s) => type.includes(s as ChapterTypeKind))).toBe(false);
  });
});