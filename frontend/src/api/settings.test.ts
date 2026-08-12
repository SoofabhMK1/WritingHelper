import { describe, expect, it } from "vitest";
import { settingKeys } from "./settings";

describe("settingKeys", () => {
  it("all is stable", () => {
    expect(settingKeys.all).toEqual(["settings"]);
  });

  it("list extends all", () => {
    expect(settingKeys.list()).toEqual(["settings", "list"]);
  });
});