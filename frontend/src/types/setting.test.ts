import { describe, expect, it } from "vitest";
import {
  SETTING_DESCRIPTIONS,
  SETTING_KEYS,
  SETTING_LABELS,
} from "./setting";

describe("setting constants", () => {
  it("SETTING_KEYS exposes known keys", () => {
    expect(SETTING_KEYS.apiKey).toBe("ai.api_key");
    expect(SETTING_KEYS.baseUrl).toBe("ai.base_url");
    expect(SETTING_KEYS.model).toBe("ai.model");
    expect(SETTING_KEYS.temperature).toBe("ai.temperature");
  });

  it("labels exist for known keys", () => {
    for (const k of Object.values(SETTING_KEYS)) {
      expect(SETTING_LABELS[k]).toBeTruthy();
      expect(SETTING_DESCRIPTIONS[k]).toBeTruthy();
    }
  });

  it("temperature label is not English", () => {
    expect(SETTING_LABELS[SETTING_KEYS.temperature]).toMatch(/[一-鿿]/);
  });
});