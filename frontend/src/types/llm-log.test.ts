import { describe, expect, it } from "vitest";
import {
  LLM_LOG_STATUS_COLOR,
  LLM_LOG_STATUS_LABEL,
  LLM_LOG_STATUS_OPTIONS,
  type LlmLogStatus,
} from "./llm-log";

const STATUSES: LlmLogStatus[] = ["ok", "not_configured", "error"];

describe("LLM log status maps", () => {
  it("covers all three statuses", () => {
    expect(Object.keys(LLM_LOG_STATUS_LABEL).sort()).toEqual(["error", "not_configured", "ok"]);
    expect(Object.keys(LLM_LOG_STATUS_COLOR).sort()).toEqual(["error", "not_configured", "ok"]);
  });

  it("has a Chinese label for every status", () => {
    for (const s of STATUSES) {
      expect(LLM_LOG_STATUS_LABEL[s]).toMatch(/[一-鿿]/);
    }
  });

  it("has a color for every status", () => {
    for (const s of STATUSES) {
      expect(LLM_LOG_STATUS_COLOR[s]).toBeTruthy();
    }
  });

  it("LLM_LOG_STATUS_OPTIONS exposes three entries with labels", () => {
    expect(LLM_LOG_STATUS_OPTIONS).toHaveLength(3);
    for (const opt of LLM_LOG_STATUS_OPTIONS) {
      expect(STATUSES).toContain(opt.value);
      expect(opt.label).toBe(LLM_LOG_STATUS_LABEL[opt.value]);
    }
  });
});
