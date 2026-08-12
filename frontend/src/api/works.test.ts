import { describe, expect, it } from "vitest";
import { workKeys } from "./works";

describe("workKeys", () => {
  it("list keys include q when provided", () => {
    expect(workKeys.list("foo")).toEqual(["works", "list", { q: "foo" }]);
  });

  it("list keys omit q when undefined", () => {
    expect(workKeys.list()).toEqual(["works", "list", { q: undefined }]);
  });

  it("detail key is stable", () => {
    expect(workKeys.detail(1)).toEqual(["works", "detail", 1]);
  });
});