import { useEffect, useRef } from "react";

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
 *
 * The `bindings` argument is read via a ref so the keydown listener is bound
 * exactly once per component lifetime — callers don't have to memoize the
 * array, which otherwise would cause add/removeEventListener on every render.
 */
export function useShortcuts(bindings: Binding[]) {
  const bindingsRef = useRef(bindings);
  // Keep the ref fresh on every render so the effect (registered once)
  // always reads the latest bindings. This is the standard "latest ref"
  // pattern; the lint rule is a false positive here.
  // eslint-disable-next-line react-hooks/refs
  bindingsRef.current = bindings;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      const current = bindingsRef.current;
      for (const b of current) {
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
  }, []);
}