import { describe, expect, it } from "vitest";
import { VOLUME_STATUS_COLOR, VOLUME_STATUS_LABEL, type VolumeStatus } from "./volume";

describe("volume status", () => {
  it("has 3 statuses", () => {
    expect(Object.keys(VOLUME_STATUS_LABEL)).toHaveLength(3);
  });

  it("labels are non-empty Chinese", () => {
    for (const label of Object.values(VOLUME_STATUS_LABEL)) {
      expect(label).toMatch(/[一-鿿]/);
    }
  });

  it("color map is exhaustive", () => {
    const labels = Object.keys(VOLUME_STATUS_LABEL) as VolumeStatus[];
    const colors = Object.keys(VOLUME_STATUS_COLOR);
    expect(colors.sort()).toEqual(labels.sort());
  });
});