import { describe, expect, it } from "vitest";
import {
  FORESHADOW_STATUS_COLOR,
  FORESHADOW_STATUS_LABEL,
  type ForeshadowStatusKind,
} from "./foreshadow";

describe("foreshadow status", () => {
  it("has 3 statuses", () => {
    expect(Object.keys(FORESHADOW_STATUS_LABEL)).toHaveLength(3);
  });

  it("LABEL and COLOR keys aligned", () => {
    expect(Object.keys(FORESHADOW_STATUS_LABEL).sort()).toEqual(
      Object.keys(FORESHADOW_STATUS_COLOR).sort()
    );
  });

  it("contains canonical labels", () => {
    expect(FORESHADOW_STATUS_LABEL.open).toBe("已埋");
    expect(FORESHADOW_STATUS_LABEL.resolved).toBe("已收");
  });

  it("type-safe", () => {
    const keys: ForeshadowStatusKind[] = ["open", "closing", "resolved"];
    for (const k of keys) {
      expect(FORESHADOW_STATUS_LABEL[k]).toBeTruthy();
    }
  });
});