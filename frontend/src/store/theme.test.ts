import { describe, expect, it, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

describe("theme store", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("defaults to light", async () => {
    const { useUiStore } = await import("./theme");
    const { result } = renderHook(() => useUiStore());
    expect(result.current.theme).toBe("light");
  });

  it("setTheme persists to localStorage", async () => {
    const { useUiStore } = await import("./theme");
    const { result } = renderHook(() => useUiStore());
    act(() => result.current.setTheme("dark"));
    expect(result.current.theme).toBe("dark");
    expect(localStorage.getItem("xs.theme")).toBe("dark");
  });

  it("toggleTheme flips light <-> dark", async () => {
    const { useUiStore } = await import("./theme");
    const { result } = renderHook(() => useUiStore());
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("dark");
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("light");
  });

  it("reads initial from localStorage", async () => {
    localStorage.setItem("xs.theme", "dark");
    const { useUiStore } = await import("./theme");
    const { result } = renderHook(() => useUiStore());
    expect(result.current.theme).toBe("dark");
  });
});