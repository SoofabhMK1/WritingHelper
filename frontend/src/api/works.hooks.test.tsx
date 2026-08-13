/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it, beforeEach } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import { api } from "./client";
import {
  useWorks,
  useCreateWork,
  useUpdateWork,
  useDeleteWork,
} from "./works";
import type { Work, WorkCreate, WorkUpdate } from "@/types/work";

const SAMPLE: Work = {
  id: 1,
  title: "测试作品",
  subtitle: null,
  genre: "玄幻",
  style: null,
  pov: "第三人称",
  description: null,
  target_words: 1000,
  current_words: 0,
  status: "draft",
  cover: null,
  notes: null,
  created_at: "2026-08-12T00:00:00",
  updated_at: "2026-08-12T00:00:00",
};

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("works api hooks", () => {
  let mock: MockAdapter;
  beforeEach(() => {
    mock = new MockAdapter(api);
  });

  it("useWorks calls GET /works with the prefix and returns the data", async () => {
    mock.onGet("/api/v1/works").reply(200, [SAMPLE]);
    const { result } = renderHook(() => useWorks(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([SAMPLE]);
  });

  it("useWorks surfaces a 404 detail message as an Error", async () => {
    mock.onGet("/api/v1/works").reply(500, { detail: "internal boom" });
    const { result } = renderHook(() => useWorks(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain("internal boom");
  });

  it("useCreateWork POSTs and returns the created row", async () => {
    mock.onPost("/api/v1/works").reply((cfg) => {
      const body = JSON.parse(cfg.data);
      return [201, { ...SAMPLE, id: 99, ...body }];
    });

    const { result } = renderHook(() => useCreateWork(), {
      wrapper: makeWrapper(),
    });

    const payload: WorkCreate = {
      title: "新",
      genre: "玄幻",
      target_words: 100,
      status: "draft",
    };

    let created: Work | undefined;
    await act(async () => {
      created = await result.current.mutateAsync(payload);
    });
    expect(created?.id).toBe(99);
    expect(mock.history.post).toHaveLength(1);
    expect(JSON.parse(mock.history.post[0].data)).toMatchObject(payload);
  });

  it("useUpdateWork PUTs to /works/{id} and patches the detail cache", async () => {
    mock.onPut("/api/v1/works/1").reply((cfg) => {
      const body = JSON.parse(cfg.data);
      return [200, { ...SAMPLE, ...body }];
    });

    const { result } = renderHook(() => useUpdateWork(), {
      wrapper: makeWrapper(),
    });

    const payload: WorkUpdate = { title: "新标题" };
    let updated: Work | undefined;
    await act(async () => {
      updated = await result.current.mutateAsync({ id: 1, payload });
    });
    expect(updated?.title).toBe("新标题");
    expect(mock.history.put[0].url).toBe("/works/1");
  });

  it("useDeleteWork issues DELETE /works/{id}", async () => {
    mock.onDelete("/api/v1/works/1").reply(204);

    const { result } = renderHook(() => useDeleteWork(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(mock.history.delete).toHaveLength(1);
    expect(mock.history.delete[0].url).toBe("/works/1");
  });
});