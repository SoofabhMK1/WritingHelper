import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  Form,
  Input,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { usePromptFragmentList } from "@/api/prompt-fragment";
import {
  useCreatePromptAssembly,
  useDeletePromptAssembly,
  usePromptAssembly,
  useRenderPromptAssembly,
  useUpdatePromptAssembly,
} from "@/api/prompt-assembly";
import type {
  BuiltinPromptName,
  BuiltinSlot,
  Part,
  PromptAssembly,
} from "@/types/prompt-assembly";
import { PROMPT_LABELS, PROMPT_LIST } from "@/types/prompt";

const { Title } = Typography;
const { TextArea } = Input;

type Side = "system" | "user";

interface Selected {
  side: Side;
  index: number;
}

const PART_TYPE_LABELS: Record<Part["type"], string> = {
  fragment: "片段",
  builtin: "内置模板",
  text: "文本",
  variable: "变量",
};

function makePart(type: Part["type"]): Part {
  switch (type) {
    case "fragment":
      return { type: "fragment", fragment_id: 0 };
    case "builtin":
      return { type: "builtin", prompt_name: "outline", slot: "user_template" };
    case "text":
      return { type: "text", body: "" };
    case "variable":
      return { type: "variable", name: "" };
  }
}

function partSummary(part: Part, fragmentNames: Record<number, string>): string {
  switch (part.type) {
    case "fragment":
      return `片段 #${part.fragment_id}${fragmentNames[part.fragment_id] ? ` · ${fragmentNames[part.fragment_id]}` : ""}`;
    case "builtin":
      return `内置 · ${PROMPT_LABELS[part.prompt_name]} · ${part.slot === "system" ? "system" : "user_template"}`;
    case "text":
      return part.body.length === 0 ? "(空文本)" : part.body.slice(0, 40);
    case "variable":
      return `{${part.name || "(未命名)"}}`;
  }
}

const preStyle: CSSProperties = {
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  margin: 0,
  background: "#fafafa",
  padding: 12,
  borderRadius: 4,
  maxHeight: 320,
  overflow: "auto",
};

interface EditorState {
  name: string;
  description: string;
  system_parts: Part[];
  user_parts: Part[];
  sample_vars: Record<string, unknown>;
}

const EMPTY_STATE: EditorState = {
  name: "",
  description: "",
  system_parts: [],
  user_parts: [],
  sample_vars: {},
};

interface Props {
  assemblyId?: number;
  standalone?: boolean;
  onAfterSave?: (row: PromptAssembly) => void;
}

export function PromptAssemblyEditor({
  assemblyId,
  standalone,
  onAfterSave,
}: Props) {
  const navigate = useNavigate();
  const isExisting = assemblyId !== undefined && assemblyId !== null;
  const { data: existing, isLoading } = usePromptAssembly(
    isExisting ? assemblyId : undefined,
  );
  const { data: fragments = [] } = usePromptFragmentList();

  const fragmentNames = useMemo(() => {
    const map: Record<number, string> = {};
    for (const f of fragments) map[f.id] = f.name;
    return map;
  }, [fragments]);

  const [state, setState] = useState<EditorState>(EMPTY_STATE);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [previewVarsText, setPreviewVarsText] = useState<string>("{}");
  const [previewVarsError, setPreviewVarsError] = useState<string | null>(null);
  const [hydratedId, setHydratedId] = useState<number | null>(null);

  const createMut = useCreatePromptAssembly();
  const updateMut = useUpdatePromptAssembly();
  const renderMut = useRenderPromptAssembly();
  const deleteMut = useDeletePromptAssembly();

  const hydrated = hydratedId === (isExisting ? assemblyId : null);

  useEffect(() => {
    if (!isExisting) {
      setState(EMPTY_STATE);
      setHydratedId(null);
      setPreviewVarsText("{}");
      setSelected(null);
      return;
    }
    if (existing && hydratedId !== existing.id) {
      setState({
        name: existing.name,
        description: existing.description ?? "",
        system_parts: existing.system_parts,
        user_parts: existing.user_parts,
        sample_vars: existing.sample_vars,
      });
      setPreviewVarsText(JSON.stringify(existing.sample_vars ?? {}, null, 2));
      setHydratedId(existing.id);
      setSelected(null);
    }
  }, [isExisting, existing, hydratedId]);

  // ---- Block list mutation helpers ----

  function updatePart(side: Side, index: number, next: Part) {
    setState((s) => {
      const arr = side === "system" ? [...s.system_parts] : [...s.user_parts];
      arr[index] = next;
      return side === "system"
        ? { ...s, system_parts: arr }
        : { ...s, user_parts: arr };
    });
  }

  function removePart(side: Side, index: number) {
    setState((s) => {
      const arr = side === "system" ? [...s.system_parts] : [...s.user_parts];
      arr.splice(index, 1);
      return side === "system"
        ? { ...s, system_parts: arr }
        : { ...s, user_parts: arr };
    });
    setSelected((sel) =>
      sel && sel.side === side && sel.index === index
        ? null
        : sel && sel.side === side && sel.index > index
        ? { side, index: sel.index - 1 }
        : sel,
    );
  }

  function movePart(side: Side, index: number, dir: -1 | 1) {
    setState((s) => {
      const arr = side === "system" ? [...s.system_parts] : [...s.user_parts];
      const target = index + dir;
      if (target < 0 || target >= arr.length) return s;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return side === "system"
        ? { ...s, system_parts: arr }
        : { ...s, user_parts: arr };
    });
    setSelected((sel) =>
      sel && sel.side === side && sel.index === index
        ? { side, index: index + dir }
        : sel,
    );
  }

  function appendPart(side: Side, type: Part["type"]) {
    setState((s) => {
      const arr = side === "system" ? [...s.system_parts] : [...s.user_parts];
      arr.push(makePart(type));
      return side === "system"
        ? { ...s, system_parts: arr }
        : { ...s, user_parts: arr };
    });
    setSelected({ side, index: side === "system" ? state.system_parts.length : state.user_parts.length });
  }

  // ---- Save ----

  function parseSampleVars(): Record<string, unknown> {
    if (!previewVarsText.trim()) return {};
    try {
      const parsed = JSON.parse(previewVarsText);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("必须是 JSON 对象");
      }
      return parsed as Record<string, unknown>;
    } catch (e) {
      throw new Error(`样本变量 JSON 解析失败:${(e as Error).message}`);
    }
  }

  function onSave() {
    let sample_vars: Record<string, unknown>;
    try {
      sample_vars = parseSampleVars();
    } catch (e) {
      message.error((e as Error).message);
      return;
    }

    const payload = {
      name: state.name.trim(),
      description: state.description.trim() || null,
      system_parts: state.system_parts,
      user_parts: state.user_parts,
      sample_vars,
    };

    if (!payload.name) {
      message.error("请填写名称");
      return;
    }

    if (isExisting) {
      updateMut.mutate(
        { id: assemblyId!, payload },
        {
          onSuccess: (row) => {
            message.success("已保存");
            onAfterSave?.(row);
          },
          onError: (e: Error) => message.error(`保存失败:${e.message}`),
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: (row) => {
          message.success("已创建");
          onAfterSave?.(row);
          if (standalone) navigate(`/prompts/assemblies/${row.id}`);
        },
        onError: (e: Error) => message.error(`创建失败:${e.message}`),
      });
    }
  }

  function onDelete() {
    if (!isExisting) return;
    deleteMut.mutate(assemblyId!, {
      onSuccess: () => {
        message.success("已删除");
        navigate("/prompts?tab=assemblies");
      },
      onError: (e: Error) => message.error(`删除失败:${e.message}`),
    });
  }

  // ---- Preview (debounced) ----

  const lastPreviewKey = useRef<string>("");
  const previewVars = useMemo(() => {
    try {
      return JSON.parse(previewVarsText || "{}") as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [previewVarsText]);

  useEffect(() => {
    if (!isExisting) return;
    if (!hydrated) return;
    try {
      JSON.parse(previewVarsText || "{}");
    } catch {
      setPreviewVarsError("样本变量 JSON 格式错误");
      return;
    }
    setPreviewVarsError(null);

    const key = JSON.stringify({
      sys: state.system_parts,
      usr: state.user_parts,
      vars: previewVars,
    });
    if (key === lastPreviewKey.current) return;
    lastPreviewKey.current = key;

    const handle = window.setTimeout(() => {
      renderMut.mutate(
        { id: assemblyId!, variables: previewVars },
        {
          onError: (e: Error) => {
            // Render errors show inline via `previewVarsError`; the
            // `renderMut.error` message is what the alert below displays.
            setPreviewVarsError(e.message);
          },
        },
      );
    }, 500);
    return () => window.clearTimeout(handle);
  }, [
    isExisting,
    hydrated,
    assemblyId,
    state.system_parts,
    state.user_parts,
    previewVars,
    previewVarsText,
  ]);

  // Sync previewVarsText when sample_vars is edited via JSON (save also
  // writes sample_vars on the server, but the preview editor stays local).
  useEffect(() => {
    setPreviewVarsText((current) => {
      try {
        const parsed = JSON.parse(current || "{}");
        return JSON.stringify(parsed, null, 2);
      } catch {
        return current;
      }
    });
  }, []);

  // ---- Render ----

  if (isExisting && isLoading && !hydrated) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <Typography.Text type="secondary">加载中…</Typography.Text>
      </div>
    );
  }

  const partTypeMenu = (side: Side) => ({
    items: (["text", "variable", "fragment", "builtin"] as Part["type"][]).map(
      (t) => ({
        key: t,
        label: PART_TYPE_LABELS[t],
        onClick: () => appendPart(side, t),
      }),
    ),
  });

  return (
    <div>
      {standalone && (
        <Space size="middle" style={{ marginBottom: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/prompts?tab=assemblies")}
          >
            返回提示词
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            {isExisting ? "编辑组合" : "新建组合"}
          </Title>
          {isExisting && (
            <Popconfirm
              title="删除该组合?"
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={onDelete}
            >
              <Button danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      )}

      {/* Meta */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form layout="vertical" requiredMark="optional">
              <Form.Item label="名称" required>
                <Input
                  value={state.name}
                  onChange={(e) =>
                    setState((s) => ({ ...s, name: e.target.value }))
                  }
                  placeholder="例如:卷大纲助手"
                  maxLength={120}
                />
              </Form.Item>
            </Form>
          </Col>
          <Col span={12}>
            <Form layout="vertical" requiredMark="optional">
              <Form.Item label="说明">
                <Input
                  value={state.description}
                  onChange={(e) =>
                    setState((s) => ({ ...s, description: e.target.value }))
                  }
                  placeholder="可选,描述这个组合的用途"
                />
              </Form.Item>
            </Form>
          </Col>
        </Row>
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={onSave}
            loading={createMut.isPending || updateMut.isPending}
          >
            {isExisting ? "保存修改" : "创建组合"}
          </Button>
          {!isExisting && (
            <Typography.Text type="secondary">
              保存后才能预览渲染结果
            </Typography.Text>
          )}
        </Space>
      </Card>

      {/* Three-column workspace */}
      <Row gutter={16}>
        {/* Block list */}
        <Col span={9}>
          <BlockColumn
            title="System 部分"
            side="system"
            parts={state.system_parts}
            selected={selected}
            fragmentNames={fragmentNames}
            onSelect={(index) => setSelected({ side: "system", index })}
            onMove={movePart}
            onRemove={removePart}
            addMenu={partTypeMenu("system")}
          />
          <BlockColumn
            title="User 部分"
            side="user"
            parts={state.user_parts}
            selected={selected}
            fragmentNames={fragmentNames}
            onSelect={(index) => setSelected({ side: "user", index })}
            onMove={movePart}
            onRemove={removePart}
            addMenu={partTypeMenu("user")}
          />
        </Col>

        {/* Block editor */}
        <Col span={7}>
          <Card title="块属性" bodyStyle={{ minHeight: 360 }}>
            {!selected ? (
              <Empty description="从左侧选择一个块进行编辑" />
            ) : (
              <BlockEditor
                key={`${selected.side}-${selected.index}`}
                part={
                  selected.side === "system"
                    ? state.system_parts[selected.index]
                    : state.user_parts[selected.index]
                }
                fragments={fragments.map((f) => ({ id: f.id, name: f.name }))}
                onChange={(next) => updatePart(selected.side, selected.index, next)}
                onDelete={() => removePart(selected.side, selected.index)}
              />
            )}
          </Card>
        </Col>

        {/* Preview */}
        <Col span={8}>
          <PreviewPane
            ready={isExisting}
            systemText={renderMut.data?.system ?? ""}
            userText={renderMut.data?.user ?? ""}
            isFetching={renderMut.isPending}
            error={
              (renderMut.error as Error | null)?.message ?? previewVarsError
            }
            sampleVarsText={previewVarsText}
            onSampleVarsTextChange={setPreviewVarsText}
          />
        </Col>
      </Row>
    </div>
  );
}

// ============================================================================
// BlockColumn
// ============================================================================

interface BlockColumnProps {
  title: string;
  side: Side;
  parts: Part[];
  selected: Selected | null;
  fragmentNames: Record<number, string>;
  onSelect: (index: number) => void;
  onMove: (side: Side, index: number, dir: -1 | 1) => void;
  onRemove: (side: Side, index: number) => void;
  addMenu: { items: { key: string; label: string; onClick: () => void }[] };
}

function BlockColumn({
  title,
  side,
  parts,
  selected,
  fragmentNames,
  onSelect,
  onMove,
  onRemove,
  addMenu,
}: BlockColumnProps) {
  return (
    <Card
      title={title}
      size="small"
      style={{ marginBottom: 16 }}
      extra={
        <Dropdown menu={addMenu} trigger={["click"]}>
          <Button size="small" icon={<PlusOutlined />}>
            添加块
          </Button>
        </Dropdown>
      }
    >
      {parts.length === 0 ? (
        <Typography.Text type="secondary">（暂无块）</Typography.Text>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size={8}>
          {parts.map((p, i) => {
            const isSelected =
              selected?.side === side && selected.index === i;
            return (
              <div
                key={i}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(i);
                  }
                }}
                style={{
                  border: isSelected
                    ? "1px solid #1677ff"
                    : "1px solid #f0f0f0",
                  borderRadius: 4,
                  padding: 8,
                  background: isSelected ? "#e6f4ff" : "#fafafa",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Tag color="blue">{PART_TYPE_LABELS[p.type]}</Tag>
                  <Space size={4} onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="small"
                      type="text"
                      icon={<ArrowUpOutlined />}
                      disabled={i === 0}
                      onClick={() => onMove(side, i, -1)}
                    />
                    <Button
                      size="small"
                      type="text"
                      icon={<ArrowDownOutlined />}
                      disabled={i === parts.length - 1}
                      onClick={() => onMove(side, i, 1)}
                    />
                    <Popconfirm
                      title="删除该块?"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => onRemove(side, i)}
                    >
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  </Space>
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: "#595959",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={partSummary(p, fragmentNames)}
                >
                  {partSummary(p, fragmentNames)}
                </div>
              </div>
            );
          })}
        </Space>
      )}
    </Card>
  );
}

// ============================================================================
// BlockEditor (middle column)
// ============================================================================

interface BlockEditorProps {
  part: Part;
  fragments: { id: number; name: string }[];
  onChange: (next: Part) => void;
  onDelete: () => void;
}

function BlockEditor({ part, fragments, onChange, onDelete }: BlockEditorProps) {
  function setType(next: Part["type"]) {
    onChange(makePart(next));
  }

  return (
    <div>
      <Form layout="vertical" requiredMark="optional">
        <Form.Item label="类型">
          <Radio.Group
            value={part.type}
            onChange={(e) => setType(e.target.value as Part["type"])}
          >
            <Radio.Button value="text">文本</Radio.Button>
            <Radio.Button value="variable">变量</Radio.Button>
            <Radio.Button value="fragment">片段</Radio.Button>
            <Radio.Button value="builtin">内置模板</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {part.type === "text" && (
          <Form.Item
            label="正文"
            extra="支持 {var} 占位;缺失的变量在预览时显示为空"
          >
            <TextArea
              rows={6}
              value={part.body}
              onChange={(e) => onChange({ type: "text", body: e.target.value })}
              placeholder="字面文本,会原样放入提示词"
            />
          </Form.Item>
        )}

        {part.type === "variable" && (
          <Form.Item
            label="变量名"
            extra="预览时,该占位会被 sample_vars 里同名的值替换"
          >
            <Input
              value={part.name}
              onChange={(e) =>
                onChange({ type: "variable", name: e.target.value })
              }
              placeholder="例如:title"
              maxLength={120}
            />
          </Form.Item>
        )}

        {part.type === "fragment" && (
          <Form.Item
            label="选择片段"
            extra="引用某个已保存的提示词片段;在预览时把片段的 body 拼进来"
          >
            <Select
              value={part.fragment_id || undefined}
              onChange={(v) => onChange({ type: "fragment", fragment_id: v })}
              placeholder="选择片段"
              options={fragments.map((f) => ({
                value: f.id,
                label: `#${f.id} · ${f.name}`,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        )}

        {part.type === "builtin" && (
          <>
            <Form.Item label="内置模板">
              <Select
                value={part.prompt_name}
                onChange={(v) =>
                  onChange({
                    type: "builtin",
                    prompt_name: v as BuiltinPromptName,
                    slot: part.slot ?? "user_template",
                  })
                }
                options={PROMPT_LIST.map((n) => ({
                  value: n,
                  label: PROMPT_LABELS[n],
                }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item label="使用片段">
              <Radio.Group
                value={part.slot ?? "user_template"}
                onChange={(e) =>
                  onChange({
                    type: "builtin",
                    prompt_name: part.prompt_name,
                    slot: e.target.value as BuiltinSlot,
                  })
                }
              >
                <Radio.Button value="system">system</Radio.Button>
                <Radio.Button value="user_template">user_template</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </>
        )}

        <Space>
          <Popconfirm
            title="删除该块?"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={onDelete}
          >
            <Button danger icon={<DeleteOutlined />}>
              删除块
            </Button>
          </Popconfirm>
        </Space>
      </Form>
    </div>
  );
}

// ============================================================================
// PreviewPane
// ============================================================================

interface PreviewPaneProps {
  ready: boolean;
  systemText: string;
  userText: string;
  isFetching: boolean;
  error: string | null;
  sampleVarsText: string;
  onSampleVarsTextChange: (next: string) => void;
}

function PreviewPane({
  ready,
  systemText,
  userText,
  isFetching,
  error,
  sampleVarsText,
  onSampleVarsTextChange,
}: PreviewPaneProps) {
  function copy(text: string, label: string) {
    if (!text) {
      message.warning("无内容可复制");
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => message.success(`已复制 ${label}`))
        .catch(() => message.error("复制失败,请手动选取"));
    } else {
      message.warning("当前环境不支持剪贴板 API");
    }
  }

  if (!ready) {
    return (
      <Card title="预览" size="small">
        <Empty description="保存组合后才能预览" />
      </Card>
    );
  }

  return (
    <Card
      title="预览"
      size="small"
      extra={
        isFetching ? (
          <Typography.Text type="secondary">渲染中…</Typography.Text>
        ) : null
      }
    >
      {error && (
        <Alert
          type="warning"
          showIcon
          message="渲染失败"
          description={error}
          style={{ marginBottom: 12 }}
        />
      )}

      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <Typography.Text strong>System</Typography.Text>
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copy(systemText, "System")}
          >
            复制
          </Button>
        </div>
        <pre style={preStyle}>{systemText || "(空)"}</pre>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <Typography.Text strong>User</Typography.Text>
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copy(userText, "User")}
          >
            复制
          </Button>
        </div>
        <pre style={preStyle}>{userText || "(空)"}</pre>
      </div>

      <Button
        block
        icon={<CopyOutlined />}
        onClick={() =>
          copy(`[System]\n${systemText}\n\n[User]\n${userText}`, "完整组合")
        }
      >
        复制完整(System + User)
      </Button>

      <Form layout="vertical" style={{ marginTop: 16 }} requiredMark="optional">
        <Form.Item
          label="样本变量 (JSON 对象)"
          extra="预览时使用的变量;不会影响保存到服务端的 sample_vars"
        >
          <TextArea
            rows={6}
            value={sampleVarsText}
            onChange={(e) => onSampleVarsTextChange(e.target.value)}
          />
        </Form.Item>
      </Form>
    </Card>
  );
}