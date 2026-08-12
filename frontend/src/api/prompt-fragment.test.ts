import { describe, expect, it } from "vitest";
import { promptFragmentKeys } from "./prompt-fragment";

describe("promptFragmentKeys", () => {
  it("all is stable", () => {
    expect(promptFragmentKeys.all).toEqual(["prompt-fragments"]);
  });

  it("list extends all with search key", () => {
    expect(promptFragmentKeys.list()).toEqual(["prompt-fragments", "list", ""]);
    expect(promptFragmentKeys.list("风格")).toEqual([
      "prompt-fragments",
      "list",
      "风格",
    ]);
  });

  it("detail extends all with the id", () => {
    expect(promptFragmentKeys.detail(7)).toEqual([
      "prompt-fragments",
      "detail",
      7,
    ]);
  });
});