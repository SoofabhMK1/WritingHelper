import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Outline } from "@/components/outline/Outline";
import * as volumesModule from "@/api/volumes";
import * as chaptersModule from "@/api/chapters";

vi.mock("@/api/volumes");
vi.mock("@/api/chapters");

const BACK_TO_WORK = /返\s?回\s?作\s?品\s?详\s?情/;

function mockApis() {
  vi.mocked(volumesModule.useVolumes).mockReturnValue({
    data: [],
    isLoading: false,
  } as any);
  vi.mocked(volumesModule.useCreateVolume).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as any);
  vi.mocked(volumesModule.useUpdateVolume).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as any);
  vi.mocked(volumesModule.useDeleteVolume).mockReturnValue({
    mutateAsync: vi.fn(),
  } as any);
  vi.mocked(chaptersModule.useChapters).mockReturnValue({
    data: [],
    isLoading: false,
  } as any);
  vi.mocked(chaptersModule.useCreateChapter).mockReturnValue({
    mutateAsync: vi.fn(),
  } as any);
  vi.mocked(chaptersModule.useUpdateChapter).mockReturnValue({
    mutateAsync: vi.fn(),
  } as any);
  vi.mocked(chaptersModule.useDeleteChapter).mockReturnValue({
    mutateAsync: vi.fn(),
  } as any);
}

function renderOutline(workId: number) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/works/${workId}/outline`]}>
        <Routes>
          <Route path="/works/:wid" element={<div>WORK_OVERVIEW</div>} />
          <Route path="/works/:wid/outline" element={<Outline workId={workId} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Outline", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockApis();
  });

  it("renders title and new-volume controls", () => {
    renderOutline(1);

    expect(screen.getByRole("heading", { name: "大纲规划" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /新\s?建\s?卷/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /新\s?增\s?散\s?章/ })).toBeInTheDocument();
  });

  it("navigates back to work overview when 返回作品详情 is clicked", async () => {
    renderOutline(7);

    const back = await screen.findByRole("button", { name: BACK_TO_WORK });
    expect(back).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(back);

    await waitFor(() => {
      expect(screen.getByText("WORK_OVERVIEW")).toBeInTheDocument();
    });
  });
});
