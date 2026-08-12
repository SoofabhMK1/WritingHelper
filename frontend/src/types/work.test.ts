import { describe, expect, it } from "vitest";
import { STATUS_COLOR, STATUS_LABEL } from "./work";

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