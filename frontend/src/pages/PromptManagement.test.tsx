import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { PromptManagement } from "@/pages/PromptManagement";
import * as bindingsModule from "@/api/ai-prompt-template";
import * as assemblyModule from "@/api/prompt-assembly";

vi.mock("@/api/ai-prompt-template");
vi.mock("@/api/prompt-assembly");

function renderPage(initialPath = "/prompts") {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <PromptManagement />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PromptManagement page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders the page title and all AI function rows", async () => {
    vi.mocked(bindingsModule.usePromptTemplateBindings).mockReturnValue({
      data: {},
      isLoading: false,
      refetch: vi.fn(),
    } as any);
    vi.mocked(bindingsModule.useSetPromptTemplateBinding).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
    vi.mocked(bindingsModule.useBuiltinPrompt).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);
    vi.mocked(bindingsModule.useCloneBuiltinPrompt).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.mocked(assemblyModule.usePromptAssemblyList).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderPage();
    expect(await screen.findByText("提示词管理")).toBeInTheDocument();

    // every AI function label appears as a row
    for (const label of [
      "卷大纲生成",
      "章节细化",
      "人物生成",
      "事件建议",
      "一致性检查",
      "续写",
      "扩写",
      "自由对话",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("defaults to the bindings tab and shows three tabs", async () => {
    vi.mocked(bindingsModule.usePromptTemplateBindings).mockReturnValue({
      data: {},
      isLoading: false,
      refetch: vi.fn(),
    } as any);
    vi.mocked(bindingsModule.useSetPromptTemplateBinding).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
    vi.mocked(bindingsModule.useBuiltinPrompt).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);
    vi.mocked(bindingsModule.useCloneBuiltinPrompt).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.mocked(assemblyModule.usePromptAssemblyList).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderPage();
    const tabs = await screen.findAllByRole("tab");
    const labels = tabs.map((t) => t.textContent ?? "");
    expect(labels).toContain("AI 功能模板");
    expect(labels).toContain("提示词片段");
    expect(labels).toContain("自定义模板");
  });

  it("shows '系统默认' for unbound functions and custom name for bound ones", async () => {
    vi.mocked(bindingsModule.usePromptTemplateBindings).mockReturnValue({
      data: { outline: 7 },
      isLoading: false,
      refetch: vi.fn(),
    } as any);
    vi.mocked(bindingsModule.useSetPromptTemplateBinding).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
    vi.mocked(bindingsModule.useBuiltinPrompt).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);
    vi.mocked(bindingsModule.useCloneBuiltinPrompt).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.mocked(assemblyModule.usePromptAssemblyList).mockReturnValue({
      data: [
        {
          id: 7,
          name: "我的卷大纲",
          description: null,
          system_parts: [],
          user_parts: [],
          sample_vars: {},
          created_at: "2026-08-12T00:00:00",
          updated_at: "2026-08-12T00:00:00",
        },
      ],
      isLoading: false,
    } as any);

    renderPage();
    // every unbound row has a "系统默认" tag
    await waitFor(() => {
      const tags = screen.getAllByText("系统默认");
      expect(tags.length).toBe(7); // 8 rows minus the bound outline
    });
    // the bound row's Tag (not the Select option) shows the assembly name
    expect(screen.getAllByText("我的卷大纲").length).toBeGreaterThanOrEqual(1);
  });

  it("warns when the binding points at a missing assembly", async () => {
    vi.mocked(bindingsModule.usePromptTemplateBindings).mockReturnValue({
      data: { outline: 999 },
      isLoading: false,
      refetch: vi.fn(),
    } as any);
    vi.mocked(bindingsModule.useSetPromptTemplateBinding).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
    vi.mocked(bindingsModule.useBuiltinPrompt).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);
    vi.mocked(bindingsModule.useCloneBuiltinPrompt).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.mocked(assemblyModule.usePromptAssemblyList).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderPage();
    expect(
      await screen.findByText(/自定义 # 999 已删除/),
    ).toBeInTheDocument();
  });

  it("triggers setBinding when the user picks a different template", async () => {
    const mutateMock = vi.fn();
    vi.mocked(bindingsModule.usePromptTemplateBindings).mockReturnValue({
      data: {},
      isLoading: false,
      refetch: vi.fn(),
    } as any);
    vi.mocked(bindingsModule.useSetPromptTemplateBinding).mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    } as any);
    vi.mocked(bindingsModule.useBuiltinPrompt).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);
    vi.mocked(bindingsModule.useCloneBuiltinPrompt).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.mocked(assemblyModule.usePromptAssemblyList).mockReturnValue({
      data: [
        {
          id: 5,
          name: "我的卷细化",
          description: null,
          system_parts: [],
          user_parts: [],
          sample_vars: {},
          created_at: "2026-08-12T00:00:00",
          updated_at: "2026-08-12T00:00:00",
        },
      ],
      isLoading: false,
    } as any);

    const user = userEvent.setup();
    renderPage();

    // pick the chapter row's select
    const row = await screen.findByText("章节细化");
    const rowEl = row.closest("tr")!;
    const select = await within(rowEl).findByRole("combobox");
    await user.click(select);
    await user.click(await screen.findByText("我的卷细化"));

    expect(mutateMock).toHaveBeenCalledWith(
      { promptName: "chapters", assemblyId: 5 },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
