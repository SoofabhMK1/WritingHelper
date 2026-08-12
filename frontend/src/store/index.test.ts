import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUiStore } from "./index";

describe("useUiStore", () => {
  it("initial state", () => {
    const { result } = renderHook(() => useUiStore());
    expect(result.current.searchKeyword).toBe("");
  });

  it("setSearchKeyword updates state", () => {
    const { result } = renderHook(() => useUiStore());
    act(() => {
      result.current.setSearchKeyword("青云");
    });
    expect(result.current.searchKeyword).toBe("青云");
  });

  it("multiple subscribers share state", () => {
    const { result: a } = renderHook(() => useUiStore((s) => s.searchKeyword));
    const { result: b } = renderHook(() => useUiStore((s) => s.setSearchKeyword));

    act(() => {
      b.current("x");
    });
    expect(a.current).toBe("x");
  });
});