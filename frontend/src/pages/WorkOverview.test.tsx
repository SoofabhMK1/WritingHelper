import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { WorkOverview } from "@/pages/WorkOverview";
import * as worksModule from "@/api/works";

vi.mock("@/api/works");

const BACK_TO_LIBRARY = /返\s?回\s?作\s?品\s?库/;

function renderOverview(wid: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/works/${wid}`]}>
        <Routes>
          <Route path="/" element={<div>HOME</div>} />
          <Route path="/works/:wid" element={<WorkOverview />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("WorkOverview", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders work details", async () => {
    const w = {
      id: 1,
      title: "雾隐山河",
      subtitle: "少年离乡",
      genre: "玄幻",
      style: "热血",
      pov: "第三人称",
      description: "走出大山",
      target_words: 1500000,
      current_words: 5000,
      status: "writing" as const,
      cover: null,
      notes: "备忘",
      created_at: "2026-08-10T00:00:00",
      updated_at: "2026-08-10T00:00:00",
    };
    vi.mocked(worksModule.useWork).mockReturnValue({ data: w, isLoading: false } as any);

    renderOverview("1");

    expect(await screen.findByText("雾隐山河")).toBeInTheDocument();
    expect(screen.getByText("少年离乡")).toBeInTheDocument();
    expect(screen.getByText("走出大山")).toBeInTheDocument();
    expect(screen.getByText("备忘")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /编辑/ })).toBeInTheDocument();
  });

  it("shows empty state when not found", async () => {
    vi.mocked(worksModule.useWork).mockReturnValue({ data: null, isLoading: false } as any);

    renderOverview("9999");

    await waitFor(() => {
      expect(screen.getByText("作品不存在或已删除")).toBeInTheDocument();
    });
  });

  it("navigates back to home when 返回作品库 is clicked", async () => {
    const w = {
      id: 1,
      title: "雾隐山河",
      subtitle: null,
      genre: null,
      style: null,
      pov: null,
      description: null,
      target_words: 0,
      current_words: 0,
      status: "writing" as const,
      cover: null,
      notes: null,
      created_at: "2026-08-10T00:00:00",
      updated_at: "2026-08-10T00:00:00",
    };
    vi.mocked(worksModule.useWork).mockReturnValue({ data: w, isLoading: false } as any);

    renderOverview("1");

    const back = await screen.findByRole("button", { name: BACK_TO_LIBRARY });
    expect(back).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(back);

    await waitFor(() => {
      expect(screen.getByText("HOME")).toBeInTheDocument();
    });
  });
});