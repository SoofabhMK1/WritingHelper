import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
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
});