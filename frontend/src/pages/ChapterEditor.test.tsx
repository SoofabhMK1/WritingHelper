/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { message } from "antd";
import { ChapterEditor } from "@/pages/ChapterEditor";
import * as chaptersModule from "@/api/chapters";
import * as volumesModule from "@/api/volumes";

// MarkdownEditor relies on a real contenteditable-style DOM that jsdom does
// not implement (selectionStart / setSelectionRange on the MDEditor textarea
// are unreliable here). Stub it so we only exercise the parent
// ChapterEditor's form/button logic.
vi.mock("@/components/editor/MarkdownEditor", () => ({
  MarkdownEditor: ({
    onSave,
  }: {
    onSave: (md: string, plain: string) => Promise<void>;
  }) => (
    <button
      type="button"
      onClick={() =>
        onSave("# edited markdown", "edited plain").catch(() => {})
      }
    >
      模拟 MarkdownEditor 触发保存
    </button>
  ),
}));

vi.mock("@/api/chapters");
vi.mock("@/api/volumes");

const SAMPLE_CHAPTER = {
  id: 7,
  work_id: 1,
  volume_id: null,
  title: "第一章",
  summary: null,
  outline: null,
  content: "初始正文。",
  order_num: 0,
  target_words: 3000,
  actual_words: 0,
  status: "draft",
  chapter_type: "plot",
  mood: null,
  created_at: "2026-08-12T00:00:00",
  updated_at: "2026-08-12T00:00:00",
};

function setupApis() {
  vi.mocked(chaptersModule.useChapter).mockReturnValue({
    data: SAMPLE_CHAPTER,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: vi.fn(),
  } as any);
  vi.mocked(chaptersModule.useChapters).mockReturnValue({
    data: [SAMPLE_CHAPTER],
    isLoading: false,
  } as any);
  vi.mocked(volumesModule.useVolumes).mockReturnValue({
    data: [],
    isLoading: false,
  } as any);
  vi.mocked(chaptersModule.useUpdateChapter).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as any);
  vi.mocked(chaptersModule.useDeleteChapter).mockReturnValue({
    mutate: vi.fn(),
  } as any);
}

function renderEditor() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/works/1/chapters/7"]}>
        <Routes>
          <Route
            path="/works/:wid/chapters/:cid"
            element={<ChapterEditor />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ChapterEditor — autosave feedback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupApis();
    vi.spyOn(message, "error").mockImplementation(() => 1 as any);
    vi.spyOn(message, "warning").mockImplementation(() => 1 as any);
    vi.spyOn(message, "success").mockImplementation(() => 1 as any);
  });

  it("renders the editor and outline form", async () => {
    renderEditor();
    expect(
      await screen.findByRole("heading", { name: "第一章" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /模拟 MarkdownEditor 触发保存/ }),
    ).toBeInTheDocument();
  });

  it("successful autosave does not show an error toast", async () => {
    const mutate = vi.fn((_args: unknown, opts?: any) => opts?.onSuccess?.({}));
    vi.mocked(chaptersModule.useUpdateChapter).mockReturnValue({
      mutate,
      isPending: false,
    } as any);

    const user = userEvent.setup();
    renderEditor();

    await user.click(
      screen.getByRole("button", { name: /模拟 MarkdownEditor 触发保存/ }),
    );

    await waitFor(() => {
      expect(mutate).toHaveBeenCalled();
    });
    expect(message.error).not.toHaveBeenCalled();
    expect(message.warning).not.toHaveBeenCalled();
  });

  it("autosave failure shows an error toast", async () => {
    vi.mocked(chaptersModule.useUpdateChapter).mockReturnValue({
      mutate: (_args: unknown, opts?: any) =>
        opts?.onError?.(new Error("保存失败: network down")),
      isPending: false,
    } as any);

    const user = userEvent.setup();
    renderEditor();

    await user.click(
      screen.getByRole("button", { name: /模拟 MarkdownEditor 触发保存/ }),
    );

    await waitFor(() => {
      expect(message.error).toHaveBeenCalled();
    });
  });

  it("autosave sends the markdown content to the backend", async () => {
    const mutate = vi.fn((_args: unknown, opts?: any) => opts?.onSuccess?.({}));
    vi.mocked(chaptersModule.useUpdateChapter).mockReturnValue({
      mutate,
      isPending: false,
    } as any);

    const user = userEvent.setup();
    renderEditor();

    await user.click(
      screen.getByRole("button", { name: /模拟 MarkdownEditor 触发保存/ }),
    );

    await waitFor(() => {
      expect(mutate).toHaveBeenCalled();
    });
    const call = mutate.mock.calls[0][0] as {
      id: number;
      payload: Record<string, unknown>;
    };
    expect(call.id).toBe(7);
    // Regression guard: editing the chapter used to silently drop the body
    // because the payload omitted `content`, so re-opening the chapter
    // showed an empty editor. Make sure the markdown is forwarded now.
    expect(call.payload.content).toBe("# edited markdown");
    expect(call.payload.actual_words).toBe("edited plain".length);
  });
});