import { useEffect } from "react";

export type ShortcutHandler = () => void;

interface Binding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: ShortcutHandler;
  description?: string;
}

/**
 * Register global keyboard shortcuts. Skips when focus is in input/textarea
 * unless `ctrl` / `meta` is held.
 */
export function useShortcuts(bindings: Binding[]) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      for (const b of bindings) {
        if ((e.ctrlKey || e.metaKey) !== Boolean(b.ctrl || b.meta)) continue;
        if (e.shiftKey !== Boolean(b.shift)) continue;
        if (e.altKey !== Boolean(b.alt)) continue;
        if (e.key.toLowerCase() !== b.key.toLowerCase()) continue;
        // skip pure letter shortcuts when typing
        if (!b.ctrl && !b.meta && inEditable) continue;
        e.preventDefault();
        b.handler();
        return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bindings]);
}