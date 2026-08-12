import { describe, expect, it } from "vitest";
import { promptAssemblyKeys } from "./prompt-assembly";

describe("promptAssemblyKeys", () => {
  it("all is stable", () => {
    expect(promptAssemblyKeys.all).toEqual(["prompt-assemblies"]);
  });

  it("list extends all with search key", () => {
    expect(promptAssemblyKeys.list()).toEqual([
      "prompt-assemblies",
      "list",
      "",
    ]);
    expect(promptAssemblyKeys.list("卷")).toEqual([
      "prompt-assemblies",
      "list",
      "卷",
    ]);
  });

  it("detail extends all with the id", () => {
    expect(promptAssemblyKeys.detail(3)).toEqual([
      "prompt-assemblies",
      "detail",
      3,
    ]);
  });
});