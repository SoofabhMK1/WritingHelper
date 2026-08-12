import { describe, expect, it } from "vitest";
import {
  COMMON_KEYS,
  STATE_TYPE_COLOR,
  STATE_TYPE_LABEL,
  STATE_TYPE_OPTIONS,
  type StateTypeKind,
} from "./state";

describe("state type", () => {
  it("has 9 state types", () => {
    expect(Object.keys(STATE_TYPE_LABEL)).toHaveLength(9);
  });

  it("LABEL and COLOR keys aligned", () => {
    expect(Object.keys(STATE_TYPE_LABEL).sort()).toEqual(
      Object.keys(STATE_TYPE_COLOR).sort()
    );
  });

  it("contains canonical labels", () => {
    expect(STATE_TYPE_LABEL.cultivation).toBe("修为");
    expect(STATE_TYPE_LABEL.location).toBe("位置");
  });

  it("options derived from label map", () => {
    expect(STATE_TYPE_OPTIONS.length).toBe(9);
    const loc = STATE_TYPE_OPTIONS.find((o) => o.value === ("location" as StateTypeKind));
    expect(loc?.label).toBe("位置");
  });
});

describe("common keys", () => {
  it("every common key entry is an array", () => {
    for (const v of Object.values(COMMON_KEYS)) {
      expect(Array.isArray(v)).toBe(true);
    }
  });

  it("cultivation suggests '境界'", () => {
    expect(COMMON_KEYS.cultivation).toContain("境界");
  });

  it("location suggests '所在'", () => {
    expect(COMMON_KEYS.location).toContain("所在");
  });

  it("covers all state types (some may be empty)", () => {
    for (const k of Object.keys(STATE_TYPE_LABEL)) {
      expect(COMMON_KEYS).toHaveProperty(k);
    }
  });
});