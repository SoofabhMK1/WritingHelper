import { describe, expect, it, beforeEach } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { api } from "./client";

describe("api client", () => {
  let mock: MockAdapter;
  beforeEach(() => {
    mock = new MockAdapter(api);
  });

  it("prefixes requests with /api/v1", async () => {
    mock.onGet("/works").reply(200, [{ id: 1 }]);
    const { data } = await api.get("/works");
    expect(data).toEqual([{ id: 1 }]);
  });

  it("extracts detail from error response", async () => {
    mock.onGet("/works/999").reply(404, { detail: "Work not found" });
    await expect(api.get("/works/999")).rejects.toThrow("Work not found");
  });

  it("falls back to message for non-detail errors", async () => {
    mock.onGet("/x").networkError();
    await expect(api.get("/x")).rejects.toThrow();
  });
});