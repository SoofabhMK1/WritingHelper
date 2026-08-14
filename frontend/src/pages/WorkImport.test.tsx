import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { WorkImport } from "@/pages/WorkImport";

function renderImport() {
  return render(
    <MemoryRouter initialEntries={["/works/import"]}>
      <Routes>
        <Route path="/works/import" element={<WorkImport />} />
        <Route path="/" element={<div data-testid="library">library</div>} />
        <Route
          path="/works/new"
          element={<div data-testid="work-new">work new</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("WorkImport page", () => {
  it("renders the placeholder page", async () => {
    renderImport();

    expect(
      await screen.findByRole("heading", { name: "导入已有作品" }),
    ).toBeInTheDocument();
    expect(screen.getByText("该功能正在建设中")).toBeInTheDocument();
  });

  it("back button returns to the library", async () => {
    const user = userEvent.setup();
    renderImport();

    const back = await screen.findByRole("button", { name: /返回\s?作品库/ });
    await user.click(back);

    expect(await screen.findByTestId("library")).toBeInTheDocument();
  });

  it("jumps to the create page", async () => {
    const user = userEvent.setup();
    renderImport();

    await user.click(
      await screen.findByRole("button", { name: /去创建新作品/ }),
    );

    expect(await screen.findByTestId("work-new")).toBeInTheDocument();
  });
});
