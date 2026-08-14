import { describe, expect, it } from "vitest";
import {
  ERA_PRESETS,
  LENGTH_TYPE_OPTIONS,
  MOOD_PRESETS,
  STAGE_OPTIONS,
  STATUS_COLOR,
  STATUS_LABEL,
} from "./work";

describe("work status mapping", () => {
  it("has 5 statuses", () => {
    expect(Object.keys(STATUS_LABEL)).toHaveLength(5);
    expect(Object.keys(STATUS_COLOR)).toHaveLength(5);
  });

  it("LABEL keys match COLOR keys", () => {
    expect(Object.keys(STATUS_LABEL).sort()).toEqual(
      Object.keys(STATUS_COLOR).sort()
    );
  });

  it("labels are human-readable Chinese", () => {
    for (const label of Object.values(STATUS_LABEL)) {
      expect(label).toMatch(/[一-鿿]/);
    }
  });

  it("colors are valid antd tag colors", () => {
    const valid = ["default", "processing", "warning", "success", "error"];
    for (const color of Object.values(STATUS_COLOR)) {
      expect(valid).toContain(color);
    }
  });

  it("writing maps to processing", () => {
    expect(STATUS_LABEL.writing).toBe("写作中");
    expect(STATUS_COLOR.writing).toBe("processing");
  });
});

describe("work creation option presets", () => {
  it("era presets cover the spec's built-in eras", () => {
    expect([...ERA_PRESETS]).toEqual(["古代", "现代", "近未来", "架空"]);
  });

  it("length type options cover short to extra-long", () => {
    expect(LENGTH_TYPE_OPTIONS.map((o) => o.value)).toEqual([
      "短篇",
      "中篇",
      "长篇",
      "超长篇",
    ]);
  });

  it("stage options reflect the four creation stages", () => {
    expect(STAGE_OPTIONS.map((o) => o.value)).toEqual([
      "只有灵感",
      "正在建立设定",
      "已经有大纲",
      "准备开始正文",
    ]);
  });

  it("mood presets are non-empty and unique", () => {
    const values = MOOD_PRESETS.map((o) => o.value);
    expect(values.length).toBeGreaterThan(0);
    expect(new Set(values).size).toBe(values.length);
  });
});