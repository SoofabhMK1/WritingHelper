import { describe, expect, it } from "vitest";
import { promptKeys } from "./prompt";

describe("promptKeys", () => {
  it("all is stable", () => {
    expect(promptKeys.all).toEqual(["prompts"]);
  });

  it("list extends all", () => {
    expect(promptKeys.list()).toEqual(["prompts", "list"]);
  });

  it("detail extends all with the name", () => {
    expect(promptKeys.detail("outline")).toEqual(["prompts", "detail", "outline"]);
    expect(promptKeys.detail("chat")).toEqual(["prompts", "detail", "chat"]);
  });
});