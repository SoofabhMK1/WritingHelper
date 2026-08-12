import { describe, expect, it } from "vitest";
import {
  CHARACTER_ROLE_COLOR,
  CHARACTER_ROLE_LABEL,
  CHARACTER_ROLE_OPTIONS,
  type CharacterRole,
} from "./character";

describe("character role enum", () => {
  it("has 8 roles", () => {
    expect(Object.keys(CHARACTER_ROLE_LABEL)).toHaveLength(8);
  });

  it("labels are Chinese", () => {
    for (const label of Object.values(CHARACTER_ROLE_LABEL)) {
      expect(label).toMatch(/[一-鿿]/);
    }
  });

  it("LABEL and COLOR keys aligned", () => {
    expect(Object.keys(CHARACTER_ROLE_LABEL).sort()).toEqual(
      Object.keys(CHARACTER_ROLE_COLOR).sort()
    );
  });

  it("protagonist gold, antagonist red", () => {
    expect(CHARACTER_ROLE_COLOR.protagonist).toBe("gold");
    expect(CHARACTER_ROLE_COLOR.antagonist).toBe("red");
  });

  it("options derived from label map", () => {
    const opts = CHARACTER_ROLE_OPTIONS;
    expect(opts.length).toBe(8);
    const protagonist = opts.find((o) => o.value === ("protagonist" as CharacterRole));
    expect(protagonist?.label).toBe("主角");
  });
});