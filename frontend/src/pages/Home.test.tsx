import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Home } from "@/pages/Home";
import * as worksModule from "@/api/works";

vi.mock("@/api/works");

function renderHome() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderHomeWithRouting() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/works/:id"
            element={<div data-testid="work-detail">work detail page</div>}
          />
          <Route
            path="/works/:id/edit"
            element={<div data-testid="work-edit">work edit page</div>}
          />
          <Route
            path="/works/import"
            element={<div data-testid="work-import">work import page</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const sampleWork = {
  id: 1,
  title: "青云问道录",
  subtitle: "凡人修仙",
  genre: "仙侠",
  style: "热血",
  pov: "第三人称",
  description: "一个山村少年的修仙之路。",
  target_words: 1000000,
  current_words: 12345,
  status: "writing" as const,
  cover: null,
  notes: null,
  created_at: "2026-08-10T00:00:00",
  updated_at: "2026-08-10T00:00:00",
};

describe("Home page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows empty state when there are no works", async () => {
    vi.mocked(worksModule.useWorks).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    vi.mocked(worksModule.useDeleteWork).mockReturnValue({
      mutate: vi.fn(),
    } as any);

    renderHome();

    await waitFor(() => {
      expect(screen.getByText(/还没有作品/)).toBeInTheDocument();
    });
  });

  it("renders a card per work", async () => {
    vi.mocked(worksModule.useWorks).mockReturnValue({
      data: [sampleWork],
      isLoading: false,
    } as any);
    vi.mocked(worksModule.useDeleteWork).mockReturnValue({
      mutate: vi.fn(),
    } as any);

    renderHome();

    expect(await screen.findByText("青云问道录")).toBeInTheDocument();
    expect(screen.getByText("凡人修仙")).toBeInTheDocument();
    expect(screen.getByText("仙侠")).toBeInTheDocument();
    expect(screen.getByText("写作中")).toBeInTheDocument();
  });

  it("shows aggregated stats", async () => {
    vi.mocked(worksModule.useWorks).mockReturnValue({
      data: [sampleWork, { ...sampleWork, id: 2, status: "draft" }],
      isLoading: false,
    } as any);
    vi.mocked(worksModule.useDeleteWork).mockReturnValue({
      mutate: vi.fn(),
    } as any);

    renderHome();

    await waitFor(() => {
      expect(screen.getByText(/共 2 部/)).toBeInTheDocument();
    });
    expect(screen.getByText(/写作中 1/)).toBeInTheDocument();
  });

  it("renders new work button", async () => {
    vi.mocked(worksModule.useWorks).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    vi.mocked(worksModule.useDeleteWork).mockReturnValue({
      mutate: vi.fn(),
    } as any);

    renderHome();

    expect(
      await screen.findByRole("button", { name: /新建作品/ })
    ).toBeInTheDocument();
  });

  it("renders the import button next to the new work button", async () => {
    vi.mocked(worksModule.useWorks).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    vi.mocked(worksModule.useDeleteWork).mockReturnValue({
      mutate: vi.fn(),
    } as any);

    renderHome();

    expect(
      await screen.findByRole("button", { name: /导入已有作品/ })
    ).toBeInTheDocument();
  });

  it("navigates to /works/import when the import button is clicked", async () => {
    vi.mocked(worksModule.useWorks).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    vi.mocked(worksModule.useDeleteWork).mockReturnValue({
      mutate: vi.fn(),
    } as any);

    const user = userEvent.setup();
    renderHomeWithRouting();

    const importBtn = await screen.findByRole("button", { name: /导入已有作品/ });
    await user.click(importBtn);

    expect(await screen.findByTestId("work-import")).toBeInTheDocument();
  });

  it("shows loading text while fetching", async () => {
    vi.mocked(worksModule.useWorks).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);
    vi.mocked(worksModule.useDeleteWork).mockReturnValue({
      mutate: vi.fn(),
    } as any);

    renderHome();

    expect(await screen.findByText("加载中…")).toBeInTheDocument();
  });

  it("shows error alert when backend is unreachable", async () => {
    vi.mocked(worksModule.useWorks).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network Error"),
      refetch: vi.fn(),
    } as any);
    vi.mocked(worksModule.useDeleteWork).mockReturnValue({
      mutate: vi.fn(),
    } as any);

    renderHome();

    expect(await screen.findByText("无法连接到后端服务")).toBeInTheDocument();
    expect(screen.getByText(/uvicorn app.main:app/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /重\s?试/ })).toBeInTheDocument();
  });

  it("does not render the eye icon on work cards", async () => {
    vi.mocked(worksModule.useWorks).mockReturnValue({
      data: [sampleWork],
      isLoading: false,
    } as any);
    vi.mocked(worksModule.useDeleteWork).mockReturnValue({
      mutate: vi.fn(),
    } as any);

    renderHome();

    expect(await screen.findByText("青云问道录")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /查看|eye|眼睛/i })).toBeNull();
  });

  it("navigates to /works/:id when the card body is clicked", async () => {
    vi.mocked(worksModule.useWorks).mockReturnValue({
      data: [sampleWork],
      isLoading: false,
    } as any);
    vi.mocked(worksModule.useDeleteWork).mockReturnValue({
      mutate: vi.fn(),
    } as any);

    const user = userEvent.setup();
    renderHomeWithRouting();

    const title = await screen.findByText("青云问道录");
    await user.click(title);

    expect(await screen.findByTestId("work-detail")).toBeInTheDocument();
  });

  it("navigates to the edit page when the edit button is clicked (not the detail page)", async () => {
    vi.mocked(worksModule.useWorks).mockReturnValue({
      data: [sampleWork],
      isLoading: false,
    } as any);
    vi.mocked(worksModule.useDeleteWork).mockReturnValue({
      mutate: vi.fn(),
    } as any);

    const user = userEvent.setup();
    renderHomeWithRouting();

    const editBtn = await screen.findByRole("button", { name: "编辑作品" });
    await user.click(editBtn);

    expect(await screen.findByTestId("work-edit")).toBeInTheDocument();
    expect(screen.queryByTestId("work-detail")).toBeNull();
  });
});