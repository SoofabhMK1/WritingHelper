import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import { Mark, mergeAttributes } from "@tiptap/core";
import { useEffect, useMemo, useRef, useState } from "react";
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

/**
 * A custom Mark extension that tags selected text as "foreshadow" so we can
 * highlight it visually and later extract it to the database.
 */
const ForeshadowMark = Mark.create({
  name: "foreshadow",
  inclusive: false,
  addAttributes() {
    return {
      foreshadowId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-foreshadow-id"),
        renderHTML: (attrs) =>
          attrs.foreshadowId ? { "data-foreshadow-id": attrs.foreshadowId } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-foreshadow]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-foreshadow": "true",
        style:
          "background:#fff3cd; border-bottom:1px dashed #d48806; padding:0 2px; border-radius:2px;",
      }),
      0,
    ];
  },
});

interface Props {
  workId: number;
  chapterId: number;
  initialContent: string;
  onSave: (html: string, plainText: string) => Promise<void>;
  onAddForeshadow?: (quote: string, plainText: string) => Promise<void>;
}

export function TiptapEditor({
  workId,
  chapterId,
  initialContent,
  onSave,
  onAddForeshadow,
}: Props) {
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pending, setPending] = useState<"idle" | "saving" | "saved" | "dirty">("idle");
  const dirtyRef = useRef(false);
  const lastContentRef = useRef(initialContent);
  const debounceRef = useRef<number | null>(null);
  const [consistency, setConsistency] = useState<ConsistencyResult | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      CharacterCount.configure({}),
      Placeholder.configure({
        placeholder: "开始写这一章…",
      }),
      ForeshadowMark,
    ],
    content: initialContent || "",
    onUpdate() {
      dirtyRef.current = true;
      setPending("dirty");
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        save();
      }, 2000);
    },
  });

  const { mutate: continueText, isPending: contLoading } = useSuggestContinue(workId);
  const { mutate: expandText, isPending: expLoading } = useSuggestExpand(workId);
  const { mutate: checkConsistency, isPending: checkLoading } = useCheckConsistency(workId);

  async function save() {
    if (!editor) return;
    setPending("saving");
    try {
      const html = editor.getHTML();
      const plain = editor.getText();
      await onSave(html, plain);
      lastContentRef.current = html;
      dirtyRef.current = false;
      setSavedAt(new Date());
      setPending("saved");
    } catch {
      setPending("idle");
    }
  }

  // reset editor when chapter changes
  useEffect(() => {
    if (!editor) return;
    if (lastContentRef.current !== initialContent) {
      editor.commands.setContent(initialContent || "");
      lastContentRef.current = initialContent;
      dirtyRef.current = false;
      setConsistency(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, editor]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const charCount = editor?.storage.characterCount.characters() ?? 0;
  const wordCount = editor?.storage.characterCount.words() ?? 0;
  // 中文按字数计,英文按词数计
  const cjkChars = useMemo(() => {
    if (!editor) return 0;
    const text = editor.getText();
    const matches = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
    return matches ? matches.length : 0;
  }, [editor?.state.doc, charCount]);

  function onAIContinue() {
    if (!editor) return;
    continueText(
      { chapter_id: chapterId, target_chars: 800, tail_chars: 1000 },
      {
        onSuccess: (d) => {
          editor.commands.focus("end");
          editor.commands.insertContent("\n" + d.text);
          message.success("已续写,自动保存中…");
        },
        onError: (e: Error) => message.error(e.message),
      },
    );
  }

  function onAIExpand() {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      message.warning("请先选中要扩写的段落");
      return;
    }
    const selection = editor.state.doc.textBetween(from, to, " ");
    if (selection.length < 10) {
      message.warning("选中文本太短(至少 10 字)");
      return;
    }
    expandText(
      { selection, target_chars: 400 },
      {
        onSuccess: (d) => {
          editor.commands.insertContentAt({ from, to }, d.text);
          message.success("已扩写,自动保存中…");
        },
        onError: (e: Error) => message.error(e.message),
      },
    );
  }

  function onAICheck() {
    if (!editor) return;
    const text = editor.getText();
    checkConsistency(
      { new_content: text },
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

  function onMarkForeshadow() {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      message.warning("请先选中要标记的文本");
      return;
    }
    const quote = editor.state.doc.textBetween(from, to, " ");
    editor.chain().focus().setMark("foreshadow").run();
    if (onAddForeshadow) {
      onAddForeshadow(quote, quote).catch(() => {});
    }
    message.success("已标记为伏笔");
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
          <Tooltip title="在选中文本上打伏笔标">
            <Button size="small" onClick={onMarkForeshadow}>
              标记伏笔
            </Button>
          </Tooltip>
        </Space>
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
          {cjkChars > 0 ? `${cjkChars} 字` : `${wordCount} 词`}
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

      <div style={{ padding: "16px 20px", minHeight: 360 }}>
        <EditorContent editor={editor} />
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
              <Tag color={it.severity === "high" ? "red" : it.severity === "medium" ? "orange" : "gold"}>
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