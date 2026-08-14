/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it, beforeEach } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import { api } from "./client";
import { useSuggestCompletion, type CompletionResult } from "./ai";

const MOCK_RESULT: CompletionResult = {
  analysis: {
    story_core: {
      status: "existing",
      value: "一句话故事",
      reason: "用户已填写",
    },
    core_conflict: { status: "suggested", value: "建议的冲突", reason: "推断" },
    protagonist_goal: { status: "insufficient", value: "", reason: "信息不足" },
    setting: { status: "insufficient", value: "", reason: "信息不足" },
    world_rules: { status: "insufficient", value: "", reason: "信息不足" },
    themes: { status: "suggested", value: ["权力"], reason: "推断" },
  },
  extracted_facts: [],
  potential_conflicts: [],
  missing_critical_information: [],
  completeness: { story: 60, character: 20, world: 10, style: 40, planning: 0 },
};

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("useSuggestCompletion", () => {
  let mock: MockAdapter;
  beforeEach(() => {
    mock = new MockAdapter(api);
  });

  it("POSTs the draft to /ai/suggest/completion and returns the result", async () => {
    mock.onPost("/api/v1/ai/suggest/completion").reply(200, MOCK_RESULT);

    const { result } = renderHook(() => useSuggestCompletion(), {
      wrapper: makeWrapper(),
    });

    let data: CompletionResult | undefined;
    await act(async () => {
      data = await result.current.mutateAsync({
        story_seed: "一个年轻干部来到偏远乡镇。",
        pace: 3,
      });
    });

    expect(data?.analysis.core_conflict.value).toBe("建议的冲突");
    const sent = JSON.parse(mock.history.post[0].data);
    expect(sent.story_seed).toBe("一个年轻干部来到偏远乡镇。");
    expect(sent.pace).toBe(3);
    expect(sent.work_id).toBeUndefined();
  });

  it("includes work_id when provided", async () => {
    mock.onPost("/api/v1/ai/suggest/completion").reply(200, MOCK_RESULT);

    const { result } = renderHook(() => useSuggestCompletion(7), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ story_seed: "x" });
    });

    expect(JSON.parse(mock.history.post[0].data).work_id).toBe(7);
  });

  it("surfaces backend error detail as Error message", async () => {
    mock
      .onPost("/api/v1/ai/suggest/completion")
      .reply(503, { detail: "AI 尚未配置" });

    const { result } = renderHook(() => useSuggestCompletion(), {
      wrapper: makeWrapper(),
    });

    let err: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync({ story_seed: "x" });
      } catch (e) {
        err = e;
      }
    });
    expect((err as Error).message).toContain("AI 尚未配置");
  });
});
