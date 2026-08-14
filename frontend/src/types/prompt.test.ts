import { describe, expect, it } from "vitest";
import {
  isPromptName,
  PROMPT_DESCRIPTIONS,
  PROMPT_ICONS,
  PROMPT_LABELS,
  PROMPT_LIST,
} from "./prompt";

describe("prompt display metadata", () => {
  it("exposes the expected number of prompts", () => {
    expect(PROMPT_LIST).toHaveLength(9);
  });

  it("has a label for every prompt name", () => {
    for (const name of PROMPT_LIST) {
      expect(PROMPT_LABELS[name]).toBeTruthy();
    }
  });

  it("has a Chinese label for every prompt name", () => {
    for (const name of PROMPT_LIST) {
      expect(PROMPT_LABELS[name]).toMatch(/[一-鿿]/);
    }
  });

  it("has a description for every prompt name", () => {
    for (const name of PROMPT_LIST) {
      expect(PROMPT_DESCRIPTIONS[name]).toBeTruthy();
    }
  });

  it("has an icon component for every prompt name", () => {
    for (const name of PROMPT_LIST) {
      expect(PROMPT_ICONS[name]).toBeTruthy();
    }
  });

  it("isPromptName recognises known names", () => {
    for (const name of PROMPT_LIST) {
      expect(isPromptName(name)).toBe(true);
    }
    expect(isPromptName("outline")).toBe(true);
    expect(isPromptName("chat")).toBe(true);
  });

  it("isPromptName rejects unknown and undefined values", () => {
    expect(isPromptName("nope")).toBe(false);
    expect(isPromptName(undefined)).toBe(false);
    expect(isPromptName("")).toBe(false);
  });

  it("includes chat (which used to be inline in ai.py)", () => {
    expect(PROMPT_LIST).toContain("chat");
  });
});