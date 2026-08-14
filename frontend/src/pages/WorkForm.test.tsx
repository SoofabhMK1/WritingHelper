import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { WorkForm } from "@/pages/WorkForm";
import * as worksModule from "@/api/works";
import * as settingsModule from "@/api/settings";
import * as aiModule from "@/api/ai";
import type { CompletionResult } from "@/api/ai";

vi.mock("@/api/works");
vi.mock("@/api/settings");
vi.mock("@/api/ai");

function renderForm(
  path: string,
  options: {
    state?: unknown;
    extraRoutes?: { path: string; testId: string }[];
  } = {},
) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const extra = options.extraRoutes ?? [];
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: path, state: options.state }]}>
        <Routes>
          <Route path="/works/new" element={<WorkForm />} />
          <Route path="/works/:wid/edit" element={<WorkForm />} />
          {extra.map((r) => (
            <Route
              key={r.path}
              path={r.path}
              element={<div data-testid={r.testId}>{r.testId}</div>}
            />
          ))}
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// AntD's Button renders text with a space inserted between adjacent text characters
// (likely for icon support). Use regex matching to be resilient.
const CREATE = /创\s?建\s?作\s?品/;
const SAVE = /保\s?存/;
const ADOPT = /^采\s?用$/;

const MOCK_COMPLETION: CompletionResult = {
  analysis: {
    story_core: {
      status: "existing",
      value: "一句话故事",
      reason: "用户已填写",
    },
    core_conflict: {
      status: "suggested",
      value: "建议的核心冲突",
      reason: "由简介推断",
    },
    protagonist_goal: { status: "insufficient", value: "", reason: "信息不足" },
    setting: { status: "insufficient", value: "", reason: "信息不足" },
    world_rules: { status: "insufficient", value: "", reason: "信息不足" },
    themes: {
      status: "suggested",
      value: ["权力", "人性"],
      reason: "由题材推断",
    },
  },
  extracted_facts: ["现代中国背景"],
  potential_conflicts: [],
  missing_critical_information: ["主角的具体身份背景"],
  completeness: { story: 60, character: 20, world: 10, style: 40, planning: 0 },
};

function mockDefaults() {
  vi.mocked(worksModule.useWork).mockReturnValue({
    data: undefined,
    isLoading: false,
  } as any);
  vi.mocked(worksModule.useCreateWork).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as any);
  vi.mocked(worksModule.useUpdateWork).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as any);
  vi.mocked(settingsModule.useAIStatus).mockReturnValue({
    data: undefined,
  } as any);
  vi.mocked(aiModule.useSuggestCompletion).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as any);
}

describe("WorkForm (new)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockDefaults();
  });

  it("renders the five sections and the AI assistant", async () => {
    renderForm("/works/new");

    expect(
      await screen.findByRole("heading", { name: "创建作品" }),
    ).toBeInTheDocument();
    for (const section of [
      "基础信息",
      "故事核心",
      "世界与背景",
      "创作风格",
      "创作规划",
    ]) {
      expect(screen.getAllByText(section).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("AI 创作助手")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: CREATE })).toBeInTheDocument();
  });

  it("submits with everything empty and falls back to 暂未命名", async () => {
    const createMutate = vi.fn();
    vi.mocked(worksModule.useCreateWork).mockReturnValue({
      mutate: createMutate,
      isPending: false,
    } as any);

    const user = userEvent.setup();
    renderForm("/works/new");

    await user.click(await screen.findByRole("button", { name: CREATE }));

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalled();
    });
    const arg = createMutate.mock.calls[0][0];
    expect(arg.title).toBe("暂未命名");
    expect(arg.status).toBe("draft");
    expect(arg.target_words).toBe(0);
    expect(arg.story_seed).toBeNull();
    expect(arg.themes).toBeNull();
    expect(arg.pace).toBeNull();
  });

  it("submits filled fields", async () => {
    const createMutate = vi.fn();
    vi.mocked(worksModule.useCreateWork).mockReturnValue({
      mutate: createMutate,
      isPending: false,
    } as any);

    const user = userEvent.setup();
    renderForm("/works/new");

    await user.type(await screen.findByPlaceholderText("暂未命名"), "测试作品");
    await user.type(
      screen.getByPlaceholderText(/一个年轻干部来到偏远山区/),
      "一个年轻干部来到偏远乡镇。",
    );

    await user.click(screen.getByRole("button", { name: CREATE }));

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalled();
    });
    const arg = createMutate.mock.calls[0][0];
    expect(arg.title).toBe("测试作品");
    expect(arg.story_seed).toBe("一个年轻干部来到偏远乡镇。");
  });

  it("navigates to the new work page after create", async () => {
    const createMutate = vi.fn((_payload, opts) => {
      opts?.onSuccess?.({ id: 42 });
    });
    vi.mocked(worksModule.useCreateWork).mockReturnValue({
      mutate: createMutate,
      isPending: false,
    } as any);

    const user = userEvent.setup();
    renderForm("/works/new", {
      extraRoutes: [{ path: "/works/42", testId: "work-detail" }],
    });

    await user.click(await screen.findByRole("button", { name: CREATE }));

    expect(await screen.findByTestId("work-detail")).toBeInTheDocument();
  });

  it("disables the AI button when AI is not configured", async () => {
    renderForm("/works/new");

    const aiBtn = await screen.findByRole("button", { name: /AI\s?补完/ });
    expect(aiBtn).toBeDisabled();
    expect(screen.getByText("AI 尚未配置")).toBeInTheDocument();
  });

  it("applies adopted AI suggestions to the submitted payload", async () => {
    const createMutate = vi.fn();
    vi.mocked(worksModule.useCreateWork).mockReturnValue({
      mutate: createMutate,
      isPending: false,
    } as any);
    vi.mocked(settingsModule.useAIStatus).mockReturnValue({
      data: { configured: true },
    } as any);
    const completeMutate = vi.fn((_payload, opts) => {
      opts?.onSuccess?.(MOCK_COMPLETION);
    });
    vi.mocked(aiModule.useSuggestCompletion).mockReturnValue({
      mutate: completeMutate,
      isPending: false,
    } as any);

    const user = userEvent.setup();
    renderForm("/works/new");

    await user.type(
      await screen.findByPlaceholderText(/一个年轻干部来到偏远山区/),
      "一个年轻干部来到偏远乡镇。",
    );

    const aiBtn = screen.getByRole("button", { name: /AI\s?补完/ });
    expect(aiBtn).not.toBeDisabled();
    await user.click(aiBtn);

    expect(await screen.findByText(/AI 建议补充 2 项/)).toBeInTheDocument();
    expect(screen.getByText("建议的核心冲突")).toBeInTheDocument();

    const adoptButtons = screen.getAllByRole("button", { name: ADOPT });
    await user.click(adoptButtons[0]);
    expect(
      await screen.findByText(/已采用「核心冲突」建议/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: CREATE }));

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalled();
    });
    const arg = createMutate.mock.calls[0][0];
    expect(arg.core_conflict).toBe("建议的核心冲突");
    expect(arg.themes).toBeNull();
  });

  it("ignores a suggestion so it is not written to the payload", async () => {
    const createMutate = vi.fn();
    vi.mocked(worksModule.useCreateWork).mockReturnValue({
      mutate: createMutate,
      isPending: false,
    } as any);
    vi.mocked(settingsModule.useAIStatus).mockReturnValue({
      data: { configured: true },
    } as any);
    const completeMutate = vi.fn((_payload, opts) => {
      opts?.onSuccess?.(MOCK_COMPLETION);
    });
    vi.mocked(aiModule.useSuggestCompletion).mockReturnValue({
      mutate: completeMutate,
      isPending: false,
    } as any);

    const user = userEvent.setup();
    renderForm("/works/new");

    await user.click(await screen.findByRole("button", { name: /AI\s?补完/ }));
    expect(await screen.findByText(/AI 建议补充 2 项/)).toBeInTheDocument();

    for (let i = 0; i < 2; i++) {
      const ignoreButtons = screen.getAllByRole("button", { name: /忽\s?略/ });
      await user.click(ignoreButtons[0]);
    }

    await user.click(screen.getByRole("button", { name: CREATE }));

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalled();
    });
    const arg = createMutate.mock.calls[0][0];
    expect(arg.core_conflict).toBeNull();
    expect(arg.themes).toBeNull();
  });
});

describe("WorkForm (edit)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockDefaults();
  });

  const existing = {
    id: 1,
    title: "已存在",
    subtitle: null,
    genre: "玄幻",
    style: "热血",
    pov: "第三人称",
    description: "原始想法",
    target_words: 1000,
    current_words: 100,
    status: "writing" as const,
    cover: null,
    notes: null,
    story_seed: "一句话故事",
    core_conflict: null,
    protagonist_goal: null,
    themes: ["权力"],
    era: "蒸汽朋克时代",
    setting: null,
    world_rules: null,
    pace: 3,
    realism: null,
    prose: null,
    moods: ["压抑"],
    length_type: "长篇",
    stage: null,
    created_at: "2026-08-10T00:00:00",
    updated_at: "2026-08-10T00:00:00",
  };

  it("loads existing work and shows edit title", async () => {
    vi.mocked(worksModule.useWork).mockReturnValue({
      data: existing,
      isLoading: false,
    } as any);

    renderForm("/works/1/edit");

    expect(
      await screen.findByRole("heading", { name: "编辑作品" }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("已存在")).toBeInTheDocument();
    expect(screen.getByDisplayValue("一句话故事")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: SAVE })).toBeInTheDocument();
  });

  it("maps a non-preset era to the custom input", async () => {
    vi.mocked(worksModule.useWork).mockReturnValue({
      data: existing,
      isLoading: false,
    } as any);

    renderForm("/works/1/edit");

    expect(await screen.findByDisplayValue("蒸汽朋克时代")).toBeInTheDocument();
  });

  it("shows legacy settings only in edit mode", async () => {
    vi.mocked(worksModule.useWork).mockReturnValue({
      data: existing,
      isLoading: false,
    } as any);

    renderForm("/works/1/edit");

    expect(await screen.findByText(/其他设置/)).toBeInTheDocument();
  });

  it("back button shows '返回作品库' and goes to / when state.from is /", async () => {
    vi.mocked(worksModule.useWork).mockReturnValue({
      data: existing,
      isLoading: false,
    } as any);

    const user = userEvent.setup();
    renderForm("/works/1/edit", {
      state: { from: "/" },
      extraRoutes: [{ path: "/", testId: "library" }],
    });

    const back = await screen.findByRole("button", { name: /返回\s?作品库/ });
    await user.click(back);

    expect(await screen.findByTestId("library")).toBeInTheDocument();
  });

  it("back button shows '返回作品详情' and goes to /works/:wid when state.from is the detail page", async () => {
    vi.mocked(worksModule.useWork).mockReturnValue({
      data: existing,
      isLoading: false,
    } as any);

    const user = userEvent.setup();
    renderForm("/works/1/edit", {
      state: { from: "/works/1" },
      extraRoutes: [{ path: "/works/1", testId: "detail" }],
    });

    const back = await screen.findByRole("button", { name: /返回\s?作品详情/ });
    await user.click(back);

    expect(await screen.findByTestId("detail")).toBeInTheDocument();
  });

  it("back button falls back to '/works/:wid' when no state.from (e.g., direct URL / refresh)", async () => {
    vi.mocked(worksModule.useWork).mockReturnValue({
      data: existing,
      isLoading: false,
    } as any);

    const user = userEvent.setup();
    renderForm("/works/1/edit", {
      extraRoutes: [{ path: "/works/1", testId: "detail" }],
    });

    const back = await screen.findByRole("button", { name: /返回\s?作品详情/ });
    await user.click(back);

    expect(await screen.findByTestId("detail")).toBeInTheDocument();
  });
});
