import { describe, expect, it } from "vitest";
import { looksLikeHtml, markdownToPlain } from "./markdownUtils";

describe("looksLikeHtml", () => {
  it("returns false for plain markdown", () => {
    expect(looksLikeHtml("# 你好\n\n这是**一段**正文。")).toBe(false);
  });

  it("returns false for empty / whitespace-only input", () => {
    expect(looksLikeHtml("")).toBe(false);
    expect(looksLikeHtml("   \n  ")).toBe(false);
  });

  it("returns true for Tiptap-style paragraph HTML", () => {
    expect(looksLikeHtml("<p>一段HTML内容</p>")).toBe(true);
  });

  it("returns true for legacy HTML with attributes", () => {
    expect(
      looksLikeHtml('<p><span data-foreshadow="true">埋了个伏笔</span></p>'),
    ).toBe(true);
  });

  it("returns true for HTML that wraps prose across multiple lines", () => {
    expect(looksLikeHtml("<h2>章节标题</h2>\n<p>第一段</p>")).toBe(true);
  });
});

describe("markdownToPlain", () => {
  it("strips fenced code blocks so the inner code doesn't inflate counts", () => {
    const out = markdownToPlain("foo\n```js\nbar()\n```\nbaz");
    expect(out).not.toContain("bar()");
    expect(out).toContain("foo");
    expect(out).toContain("baz");
  });

  it("drops inline code, image alt text, and emphasis markers but keeps link text", () => {
    const out = markdownToPlain(
      "看 [主页](https://example.com) ![logo](logo.png) 用 `npm` 命令 *加粗* **strong** ~~删除~~",
    );
    expect(out).toContain("主页");
    expect(out).toContain("加粗");
    expect(out).toContain("strong");
    expect(out).toContain("删除");
    expect(out).not.toContain("https://example.com");
    expect(out).not.toContain("logo.png");
    expect(out).not.toContain("`npm`");
  });

  it("strips heading, list, blockquote, and hr markers", () => {
    const md = "# H1\n\n## H2\n\n- item 1\n* item 2\n1. item 3\n\n> quote\n\n---";
    const out = markdownToPlain(md);
    expect(out).toContain("H1");
    expect(out).toContain("H2");
    expect(out).toContain("item 1");
    expect(out).toContain("item 2");
    expect(out).toContain("item 3");
    expect(out).toContain("quote");
    expect(out).not.toMatch(/^#/m);
    expect(out).not.toMatch(/^>/m);
    expect(out).not.toMatch(/^[-*]\s/m);
    expect(out).not.toMatch(/^\d+\.\s/m);
    expect(out).not.toMatch(/^---$/m);
  });

  it("preserves plain prose untouched", () => {
    const prose = "这是普通的一段正文, 没有任何 Markdown 语法。";
    expect(markdownToPlain(prose)).toBe(prose);
  });
});