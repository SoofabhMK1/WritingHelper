import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useShortcuts } from "./useShortcuts";

function fireOn(el: EventTarget, key: string, init: KeyboardEventInit = {}) {
  const ev = new KeyboardEvent("keydown", { key, bubbles: true, ...init });
  el.dispatchEvent(ev);
}

describe("useShortcuts", () => {
  it("fires matching binding", () => {
    let called = 0;
    renderHook(() =>
      useShortcuts([{ key: "g", handler: () => called++ }]),
    );
    fireOn(window, "g");
    expect(called).toBe(1);
  });

  it("is case-insensitive", () => {
    let called = 0;
    renderHook(() =>
      useShortcuts([{ key: "G", handler: () => called++ }]),
    );
    fireOn(window, "g");
    expect(called).toBe(1);
  });

  it("requires ctrl", () => {
    let called = 0;
    renderHook(() =>
      useShortcuts([{ key: "s", ctrl: true, handler: () => called++ }]),
    );
    fireOn(window, "s");
    expect(called).toBe(0);
    fireOn(window, "s", { ctrlKey: true });
    expect(called).toBe(1);
  });

  it("skips letter shortcuts when typing in input", () => {
    let called = 0;
    renderHook(() =>
      useShortcuts([{ key: "g", handler: () => called++ }]),
    );
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    fireOn(input, "g");
    expect(called).toBe(0);
    document.body.removeChild(input);
  });

  it("ctrl+s still fires while typing", () => {
    let called = 0;
    renderHook(() =>
      useShortcuts([{ key: "s", ctrl: true, handler: () => called++ }]),
    );
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    fireOn(input, "s", { ctrlKey: true });
    expect(called).toBe(1);
    document.body.removeChild(input);
  });
});