import { useEffect, useMemo, useRef, useState } from "react";
import MDEditor, { type RefMDEditor } from "@uiw/react-md-editor";
import TurndownService from "turndown";
import { Button, Space, Tag, Tooltip, Typography, message } from "antd";
import {
  CheckCircleOutlined,
  ExpandAltOutlined,
  RobotOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  useCheckConsistency,
  useSuggestContinue,
  useSuggestExpand,
} from "@/api/ai";
import type { ConsistencyResult } from "@/api/ai";
import { TURN_DOWN_OPTIONS, looksLikeHtml, markdownToPlain } from "./markdownUtils";

interface Props {
  workId: number;
  chapterId: number;
  initialContent: string;
  onSave: (markdown: string, plainText: string) => Promise<void>;
}

const turndown = new TurndownService(TURN_DOWN_OPTIONS);

export function MarkdownEditor({
  workId,
  chapterId,
  initialContent,
  onSave,
}: Props) {
  const [markdown, setMarkdown] = useState<string>("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pending, setPending] = useState<
    "idle" | "saving" | "saved" | "dirty"
  >("idle");
  const [consistency, setConsistency] = useState<ConsistencyResult | null>(
    null,
  );

  const editorRef = useRef<RefMDEditor | null>(null);
  const markdownRef = useRef<string>("");
  const lastContentRef = useRef<string>("");
  const debounceRef = useRef<number | null>(null);

  const { mutate: continueText, isPending: contLoading } =
    useSuggestContinue(workId);
  const { mutate: expandText, isPending: expLoading } =
    useSuggestExpand(workId);
  const { mutate: checkConsistency, isPending: checkLoading } =
    useCheckConsistency(workId);

  const cjkChars = useMemo(() => {
    const text = markdownToPlain(markdown);
    const matches = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
    return matches ? matches.length : 0;
  }, [markdown]);

  async function flushSave(mdOverride?: string) {
    const md = mdOverride ?? markdownRef.current;
    setPending("saving");
    try {
      const plain = markdownToPlain(md);
      await onSave(md, plain);
      lastContentRef.current = md;
      setSavedAt(new Date());
      setPending("saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      message.error(`自动保存失败: ${msg}`);
      setPending("dirty");
    }
  }

  function scheduleSave() {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      flushSave();
    }, 2000);
  }

  function handleChange(value?: string) {
    const next = value ?? "";
    setMarkdown(next);
    markdownRef.current = next;
    setPending("dirty");
    scheduleSave();
  }

  // Re-initialise whenever the chapter (or its server-stored content) changes.
  // For legacy HTML carried over from the old Tiptap editor we convert it
  // locally and immediately flush the markdown back to the backend so
  // subsequent loads are clean.
  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (lastContentRef.current === initialContent) {
      return;
    }
    if (looksLikeHtml(initialContent)) {
      const converted = turndown.turndown(initialContent);
      // Lazy migration: legacy Tiptap HTML must be converted to markdown
      // before it lands in the editor. Writing the ref synchronously is
      // important so the trailing flushSave() below uses the converted text.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMarkdown(converted);
      markdownRef.current = converted;
      lastContentRef.current = converted;
      const t = window.setTimeout(() => {
        flushSave(converted);
      }, 0);
      return () => window.clearTimeout(t);
    }
    const next = initialContent || "";
    setMarkdown(next);
    markdownRef.current = next;
    lastContentRef.current = next;
    return undefined;
    // We intentionally only react to chapterId / initialContent identity;
    // intermediate prop churn inside the same chapter must not clobber a
    // dirty in-flight edit. Re-init is keyed off the chapter id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, initialContent]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  function getSelection() {
    const ta = editorRef.current?.textarea;
    if (!ta) return null;
    return {
      start: ta.selectionStart,
      end: ta.selectionEnd,
      text: markdownRef.current.slice(ta.selectionStart, ta.selectionEnd),
    };
  }

  function replaceRange(start: number, end: number, text: string) {
    const before = markdownRef.current.slice(0, start);
    const after = markdownRef.current.slice(end);
    const next = before + text + after;
    setMarkdown(next);
    markdownRef.current = next;
    const cursor = start + text.length;
    window.setTimeout(() => {
      const ta = editorRef.current?.textarea;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(cursor, cursor);
    }, 0);
  }

  function onAIContinue() {
    continueText(
      { chapter_id: chapterId, target_chars: 800, tail_chars: 1000 },
      {
        onSuccess: (d) => {
          const sel = getSelection();
          const ta = editorRef.current?.textarea;
          const cursor = sel
            ? sel.end
            : ta
              ? ta.selectionEnd
              : markdownRef.current.length;
          const sep =
            cursor === 0 || markdownRef.current[cursor - 1] === "\n" ? "" : "\n";
          replaceRange(cursor, cursor, sep + d.text);
          setPending("dirty");
          scheduleSave();
          message.success("已续写,自动保存中…");
        },
        onError: (e: Error) => message.error(e.message),
      },
    );
  }

  function onAIExpand() {
    const sel = getSelection();
    if (!sel || sel.start === sel.end) {
      message.warning("请先选中要扩写的段落");
      return;
    }
    if (sel.text.length < 10) {
      message.warning("选中文本太短(至少 10 字)");
      return;
    }
    expandText(
      { selection: sel.text, target_chars: 400 },
      {
        onSuccess: (d) => {
          replaceRange(sel.start, sel.end, d.text);
          setPending("dirty");
          scheduleSave();
          message.success("已扩写,自动保存中…");
        },
        onError: (e: Error) => message.error(e.message),
      },
    );
  }

  function onAICheck() {
    const plain = markdownToPlain(markdownRef.current);
    checkConsistency(
      { new_content: plain },
      {
        onSuccess: (d) => {
          setConsistency(d);
          if (d.issues.length === 0) {
            message.success("未发现明显冲突");
          } else {
            message.warning(`发现 ${d.issues.length} 个潜在问题`);
          }
        },
        onError: (e: Error) => message.error(e.message),
      },
    );
  }

  return (
    <div style={{ border: "1px solid #d9d9d9", borderRadius: 6, background: "#fff" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 12px",
          borderBottom: "1px solid #f0f0f0",
          flexWrap: "wrap",
        }}
      >
        <Space>
          <Tooltip title="基于本章最后 1000 字续写约 800 字">
            <Button
              size="small"
              icon={<RobotOutlined />}
              loading={contLoading}
              onClick={onAIContinue}
            >
              AI 续写
            </Button>
          </Tooltip>
          <Tooltip title="先选中文本再点扩写">
            <Button
              size="small"
              icon={<ExpandAltOutlined />}
              loading={expLoading}
              onClick={onAIExpand}
            >
              AI 扩写
            </Button>
          </Tooltip>
          <Tooltip title="基于全文设定检查本章正文">
            <Button
              size="small"
              icon={<CheckCircleOutlined />}
              loading={checkLoading}
              onClick={onAICheck}
            >
              一致性检查
            </Button>
          </Tooltip>
        </Space>
        <div style={{ flex: 1 }} />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {cjkChars > 0 ? `${cjkChars} 字` : `${markdown.length} 字符`}
          {savedAt && (
            <>
              {" · "}
              <SyncOutlined /> {savedAt.toLocaleTimeString()}
            </>
          )}
          {pending === "dirty" && (
            <Tag color="orange" style={{ marginLeft: 8 }}>
              待保存
            </Tag>
          )}
          {pending === "saving" && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              保存中…
            </Tag>
          )}
          {pending === "saved" && (
            <Tag color="green" style={{ marginLeft: 8 }}>
              已保存
            </Tag>
          )}
        </Typography.Text>
      </div>

      <div data-color-mode="light">
        <MDEditor
          ref={editorRef}
          value={markdown}
          onChange={handleChange}
          height={500}
          preview="live"
          textareaProps={{
            placeholder: "开始写这一章…(支持 Markdown,右侧可预览)",
          }}
        />
      </div>

      {consistency && consistency.issues.length > 0 && (
        <div
          style={{
            padding: 12,
            borderTop: "1px solid #f0f0f0",
            background: "#fffbe6",
          }}
        >
          <Typography.Text strong>一致性提示:</Typography.Text>
          <Typography.Paragraph style={{ marginBottom: 6 }} type="secondary">
            {consistency.summary}
          </Typography.Paragraph>
          {consistency.issues.slice(0, 3).map((it, i) => (
            <div key={i} style={{ marginBottom: 4, fontSize: 12 }}>
              <Tag
                color={
                  it.severity === "high"
                    ? "red"
                    : it.severity === "medium"
                      ? "orange"
                      : "gold"
                }
              >
                {it.severity}
              </Tag>
              {it.explanation}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}