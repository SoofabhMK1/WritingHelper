/**
 * Helpers shared between the MarkdownEditor and its tests.
 * Pure functions only — no React / DOM dependencies.
 */

const TURN_DOWN_OPTIONS = {
  headingStyle: "atx" as const,
  codeBlockStyle: "fenced" as const,
  bulletListMarker: "-" as const,
  emDelimiter: "*" as const,
};

/**
 * Heuristic: detect legacy HTML that the old Tiptap editor used to produce.
 * If true, the editor will lazily convert the value to markdown before
 * handing it to the user, and immediately flush the converted text back to
 * the backend so the database stops carrying HTML.
 */
export function looksLikeHtml(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  return /^<[a-z][^>]*>/i.test(t) || /<\/?[a-z][^>]*>/i.test(t);
}

/**
 * Strip common Markdown syntax to approximate the visible plain text.
 * Good enough for the word/char counter and the consistency-check payload —
 * not intended for display.
 */
export function markdownToPlain(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1");
}

export { TURN_DOWN_OPTIONS };