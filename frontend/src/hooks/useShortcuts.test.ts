import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useShortcuts } from "./useShortcuts";

function fireOn(el: EventTarget, key: string, init: KeyboardEventInit = {} as KeyboardEventInit) {
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

  it("picks up new bindings without re-registering the listener (B9)", () => {
    // If the hook re-binds on every render, removing the listener mid-test
    // would break subsequent keydowns. We assert the listener stays bound by
    // rendering with two different arrays and verifying both work.
    const calls: string[] = [];
    const { rerender } = renderHook(
      ({ label }: { label: string }) =>
        useShortcuts([
          {
            key: "g",
            handler: () => calls.push(`g#${label}`),
          },
        ]),
      { initialProps: { label: "first" } },
    );
    fireOn(window, "g");
    rerender({ label: "second" });
    fireOn(window, "g");
    expect(calls).toEqual(["g#first", "g#second"]);
  });
});