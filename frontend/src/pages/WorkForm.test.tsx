import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { WorkForm } from "@/pages/WorkForm";
import * as worksModule from "@/api/works";

vi.mock("@/api/works");

function renderForm(
  path: string,
  options: { state?: unknown; extraRoutes?: { path: string; testId: string }[] } = {}
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
    </QueryClientProvider>
  );
}

// AntD's Button renders text with a space inserted between adjacent text characters
// (likely for icon support). Use regex matching to be resilient.
const CREATE = /创\s?建/;
const SAVE = /保\s?存/;
const CANCEL = /取\s?消/;

describe("WorkForm (new)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders form with default status draft", async () => {
    vi.mocked(worksModule.useWork).mockReturnValue({ data: undefined, isLoading: false } as any);
    vi.mocked(worksModule.useCreateWork).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
    vi.mocked(worksModule.useUpdateWork).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);

    renderForm("/works/new");

    expect(await screen.findByRole("heading", { name: "新建作品" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: CREATE })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: CANCEL })).toBeInTheDocument();
  });

  it("submits with title only", async () => {
    const createMutate = vi.fn();
    vi.mocked(worksModule.useWork).mockReturnValue({ data: undefined, isLoading: false } as any);
    vi.mocked(worksModule.useCreateWork).mockReturnValue({ mutate: createMutate, isPending: false } as any);
    vi.mocked(worksModule.useUpdateWork).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);

    const user = userEvent.setup();
    renderForm("/works/new");

    const titleInput = await screen.findByPlaceholderText("例如:青云问道录");
    await user.type(titleInput, "测试作品");

    await user.click(screen.getByRole("button", { name: CREATE }));

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalled();
    });
    const arg = createMutate.mock.calls[0][0];
    expect(arg.title).toBe("测试作品");
    expect(arg.status).toBe("draft");
    expect(arg.target_words).toBe(0);
  });

  it("blocks submit when title is empty", async () => {
    const createMutate = vi.fn();
    vi.mocked(worksModule.useWork).mockReturnValue({ data: undefined, isLoading: false } as any);
    vi.mocked(worksModule.useCreateWork).mockReturnValue({ mutate: createMutate, isPending: false } as any);
    vi.mocked(worksModule.useUpdateWork).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);

    const user = userEvent.setup();
    renderForm("/works/new");

    await user.click(await screen.findByRole("button", { name: CREATE }));

    expect(createMutate).not.toHaveBeenCalled();
    expect(await screen.findByText("请输入作品标题")).toBeInTheDocument();
  });
});

describe("WorkForm (edit)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads existing work and shows edit title", async () => {
    const existing = {
      id: 1,
      title: "已存在",
      subtitle: null,
      genre: "玄幻",
      style: "热血",
      pov: "第三人称",
      description: null,
      target_words: 1000,
      current_words: 100,
      status: "writing",
      cover: null,
      notes: null,
      created_at: "2026-08-10T00:00:00",
      updated_at: "2026-08-10T00:00:00",
    };
    vi.mocked(worksModule.useWork).mockReturnValue({ data: existing, isLoading: false } as any);
    vi.mocked(worksModule.useCreateWork).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
    vi.mocked(worksModule.useUpdateWork).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);

    renderForm("/works/1/edit");

    expect(await screen.findByRole("heading", { name: "编辑作品" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("已存在")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: SAVE })).toBeInTheDocument();
  });

  it("back button shows '返回作品库' and goes to / when state.from is /", async () => {
    const existing = {
      id: 1, title: "t", subtitle: null, genre: null, style: null, pov: null,
      description: null, target_words: 0, current_words: 0, status: "draft" as const,
      cover: null, notes: null, created_at: "2026-08-10T00:00:00", updated_at: "2026-08-10T00:00:00",
    };
    vi.mocked(worksModule.useWork).mockReturnValue({ data: existing, isLoading: false } as any);
    vi.mocked(worksModule.useCreateWork).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
    vi.mocked(worksModule.useUpdateWork).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);

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
    const existing = {
      id: 1, title: "t", subtitle: null, genre: null, style: null, pov: null,
      description: null, target_words: 0, current_words: 0, status: "draft" as const,
      cover: null, notes: null, created_at: "2026-08-10T00:00:00", updated_at: "2026-08-10T00:00:00",
    };
    vi.mocked(worksModule.useWork).mockReturnValue({ data: existing, isLoading: false } as any);
    vi.mocked(worksModule.useCreateWork).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
    vi.mocked(worksModule.useUpdateWork).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);

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
    const existing = {
      id: 1, title: "t", subtitle: null, genre: null, style: null, pov: null,
      description: null, target_words: 0, current_words: 0, status: "draft" as const,
      cover: null, notes: null, created_at: "2026-08-10T00:00:00", updated_at: "2026-08-10T00:00:00",
    };
    vi.mocked(worksModule.useWork).mockReturnValue({ data: existing, isLoading: false } as any);
    vi.mocked(worksModule.useCreateWork).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
    vi.mocked(worksModule.useUpdateWork).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);

    const user = userEvent.setup();
    renderForm("/works/1/edit", {
      extraRoutes: [{ path: "/works/1", testId: "detail" }],
    });

    const back = await screen.findByRole("button", { name: /返回\s?作品详情/ });
    await user.click(back);

    expect(await screen.findByTestId("detail")).toBeInTheDocument();
  });
});