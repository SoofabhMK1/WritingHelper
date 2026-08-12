import { describe, expect, it } from "vitest";
import { eventKeys } from "./events";

describe("eventKeys", () => {
  it("all includes workId", () => {
    expect(eventKeys.all(2)).toEqual(["works", 2, "events"]);
  });

  it("list omits filters when undefined", () => {
    expect(eventKeys.list(2)).toEqual(["works", 2, "events", "list", {}]);
  });

  it("list includes filters", () => {
    expect(eventKeys.list(2, { event_type: "main" })).toEqual([
      "works",
      2,
      "events",
      "list",
      { event_type: "main" },
    ]);
  });

  it("detail key", () => {
    expect(eventKeys.detail(2, 99)).toEqual(["works", 2, "events", "detail", 99]);
  });
});