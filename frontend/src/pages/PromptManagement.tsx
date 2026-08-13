import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CopyOutlined,
  EyeOutlined,
  ReloadOutlined,
  SnippetsOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useBuiltinPrompt,
  useCloneBuiltinPrompt,
  usePromptTemplateBindings,
  useSetPromptTemplateBinding,
} from "@/api/ai-prompt-template";
import { usePromptAssemblyList } from "@/api/prompt-assembly";
import {
  PROMPT_DESCRIPTIONS,
  PROMPT_ICONS,
  PROMPT_LABELS,
  PROMPT_LIST,
  type PromptName,
} from "@/types/prompt";
import { PromptFragments } from "./PromptFragments";
import { PromptAssemblies } from "./PromptAssemblies";

const { Title, Text } = Typography;
const { TextArea } = Input;

const TAB_KEYS = ["bindings", "fragments", "assemblies"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function isTabKey(s: string | null): s is TabKey {
  return !!s && (TAB_KEYS as readonly string[]).includes(s);
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
  maxHeight: 360,
  overflow: "auto",
};

interface CloneState {
  open: boolean;
  promptName: PromptName | null;
}

function ViewBuiltinModal({
  promptName,
  open,
  onClose,
}: {
  promptName: PromptName | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading } = useBuiltinPrompt(
    promptName ?? undefined,
  );
  return (
    <Modal
      title={
        promptName
          ? `查看内置模板 · ${PROMPT_LABELS[promptName]}`
          : "查看内置模板"
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
      width={760}
      destroyOnHidden
    >
      {isLoading || !data ? (
        <Text type="secondary">加载中…</Text>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space size="small">
            <Tag color="blue">{data.json_mode ? "JSON" : "纯文本"}</Tag>
            <Tag>温度 {data.temperature}</Tag>
            <Tag>{data.name}</Tag>
          </Space>
          <div>
            <Text strong>System</Text>
            <pre style={preStyle}>{data.system}</pre>
          </div>
          <div>
            <Text strong>User Template</Text>
            <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
              占位符 <code>{"{var}"}</code> 在调用时替换为真实数据
            </Text>
            <pre style={preStyle}>{data.user_template}</pre>
          </div>
        </Space>
      )}
    </Modal>
  );
}

function CloneBuiltinModal({
  state,
  onClose,
  onCloned,
}: {
  state: CloneState;
  onClose: () => void;
  onCloned: (assemblyId: number) => void;
}) {
  const [form] = Form.useForm<{ name: string; description?: string }>();
  const cloneMut = useCloneBuiltinPrompt();
  const setBindingMut = useSetPromptTemplateBinding();

  const isOpen = state.open && state.promptName !== null;
  const promptName = state.promptName;

  async function onOk() {
    if (!promptName) return;
    let values: { name: string; description?: string };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    try {
      const asm = await cloneMut.mutateAsync({
        promptName,
        payload: {
          name: values.name.trim(),
          description: values.description?.trim() || null,
        },
      });
      // immediately bind so the user sees the new template take effect
      await setBindingMut.mutateAsync({
        promptName,
        assemblyId: asm.id,
      });
      message.success("已从内置模板派生并绑定到该 AI 功能");
      form.resetFields();
      onCloned(asm.id);
    } catch (e) {
      message.error(`派生失败:${(e as Error).message}`);
    }
  }

  return (
    <Modal
      title={
        promptName
          ? `从内置模板派生 · ${PROMPT_LABELS[promptName]}`
          : "从内置模板派生"
      }
      open={isOpen}
      onCancel={onClose}
      onOk={onOk}
      okText="派生并使用"
      cancelText="取消"
      confirmLoading={cloneMut.isPending || setBindingMut.isPending}
      width={520}
      destroyOnHidden
    >
      <Form layout="vertical" form={form} requiredMark="optional">
        <Form.Item
          name="name"
          label="新自定义模板名称"
          rules={[
            { required: true, message: "请填写名称" },
            { max: 120, message: "最长 120 个字符" },
          ]}
          extra="派生后会立即绑定到该 AI 功能,可稍后到「自定义模板」中编辑"
        >
          <Input
            placeholder={`例如:${promptName ? PROMPT_LABELS[promptName] : "我的模板"}`}
          />
        </Form.Item>
        <Form.Item name="description" label="备注(可选)">
          <TextArea rows={3} placeholder="说明这个模板的用途" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function BindingsTable() {
  const navigate = useNavigate();
  const { data: bindings = {}, isLoading, refetch } =
    usePromptTemplateBindings();
  const { data: assemblies = [] } = usePromptAssemblyList();
  const setBindingMut = useSetPromptTemplateBinding();

  const [viewingBuiltin, setViewingBuiltin] = useState<PromptName | null>(null);
  const [cloneState, setCloneState] = useState<CloneState>({
    open: false,
    promptName: null,
  });
  const [pendingPrompt, setPendingPrompt] = useState<PromptName | null>(null);

  const assemblyById = useMemo(() => {
    const m = new Map<number, (typeof assemblies)[number]>();
    for (const a of assemblies) m.set(a.id, a);
    return m;
  }, [assemblies]);

  function changeBinding(promptName: PromptName, value: number | null) {
    setPendingPrompt(promptName);
    setBindingMut.mutate(
      { promptName, assemblyId: value },
      {
        onSuccess: () => {
          message.success(
            value === null
              ? "已切换为系统默认模板"
              : `已切换为「${assemblyById.get(value)?.name ?? `#${value}`}」`,
          );
        },
        onError: (e: Error) => message.error(`切换失败:${e.message}`),
        onSettled: () => setPendingPrompt(null),
      },
    );
  }

  const columns: ColumnsType<{ name: PromptName }> = [
    {
      title: "AI 功能",
      key: "function",
      width: 260,
      render: (_v, row) => {
        const Icon = PROMPT_ICONS[row.name];
        return (
          <Space>
            <Icon style={{ fontSize: 20 }} />
            <Space direction="vertical" size={0}>
              <strong>{PROMPT_LABELS[row.name]}</strong>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {PROMPT_DESCRIPTIONS[row.name]}
              </Text>
            </Space>
          </Space>
        );
      },
    },
    {
      title: "当前模板",
      key: "current",
      width: 320,
      render: (_v, row) => {
        const id = bindings[row.name];
        if (id === undefined || id === null) {
          return <Tag color="default">系统默认</Tag>;
        }
        const asm = assemblyById.get(id);
        if (!asm) {
          return (
            <Tooltip title="绑定的自定义模板已删除,实际调用已自动回退到系统默认">
              <Tag color="warning">自定义 # {id} 已删除</Tag>
            </Tooltip>
          );
        }
        return (
          <Tooltip title={`自定义模板 · id=${asm.id}`}>
            <Tag color="purple" icon={<SnippetsOutlined />}>
              {asm.name}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "切换为",
      key: "switch",
      width: 320,
      render: (_v, row) => (
        <Select
          style={{ width: "100%" }}
          value={bindings[row.name] ?? 0}
          loading={pendingPrompt === row.name && setBindingMut.isPending}
          disabled={pendingPrompt === row.name && setBindingMut.isPending}
          onChange={(value) =>
            changeBinding(row.name, value === 0 ? null : value)
          }
          options={[
            { value: 0, label: "系统默认模板" },
            ...assemblies.map((a) => ({
              value: a.id,
              label: `${a.name}${a.description ? ` · ${a.description}` : ""}`,
            })),
          ]}
          placeholder={
            assemblies.length === 0
              ? "还没有自定义模板"
              : "选择系统默认或自定义模板"
          }
          notFoundContent={
            assemblies.length === 0
              ? "还没有自定义模板,可在右侧「复制为…」派生"
              : undefined
          }
        />
      ),
    },
    {
      title: "操作",
      key: "actions",
      width: 220,
      render: (_v, row) => {
        const id = bindings[row.name];
        const asm = id != null ? assemblyById.get(id) : undefined;
        return (
          <Space>
            {asm ? (
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/prompts/assemblies/${asm.id}`)}
              >
                编辑自定义
              </Button>
            ) : (
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => setViewingBuiltin(row.name)}
              >
                查看内置
              </Button>
            )}
            <Button
              size="small"
              type={asm ? "default" : "primary"}
              ghost={!asm}
              icon={<CopyOutlined />}
              onClick={() =>
                setCloneState({ open: true, promptName: row.name })
              }
            >
              复制为自定义
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }} size="middle">
        <Text type="secondary">
          默认每个 AI 功能使用内置模板;你也可以点击「复制为自定义」派生一份副本自由编辑,然后在「切换为」列选择使用哪一份。
        </Text>
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
        >
          刷新
        </Button>
      </Space>

      {isLoading ? (
        <Card loading />
      ) : (
        <Table
          rowKey="name"
          dataSource={PROMPT_LIST.map((name) => ({ name }))}
          columns={columns}
          pagination={false}
          size="middle"
        />
      )}

      <ViewBuiltinModal
        promptName={viewingBuiltin}
        open={viewingBuiltin !== null}
        onClose={() => setViewingBuiltin(null)}
      />

      <CloneBuiltinModal
        state={cloneState}
        onClose={() => setCloneState({ open: false, promptName: null })}
        onCloned={() =>
          setCloneState({ open: false, promptName: null })
        }
      />

      <Alert
        type="info"
        showIcon
        style={{ marginTop: 16 }}
        message="删除自定义模板后,如果它正被某个 AI 功能绑定,绑定会自动回退为系统默认模板。"
      />
    </div>
  );
}

export function PromptManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeKey: TabKey = isTabKey(tabParam) ? tabParam : "bindings";

  function onTabChange(key: string) {
    const next = new URLSearchParams(searchParams);
    next.set("tab", key);
    setSearchParams(next, { replace: true });
  }

  return (
    <div>
      <Space size="middle" style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          提示词管理
        </Title>
        <Text type="secondary">
          为每个 AI 功能选择提示词 · 维护自定义模板与片段
        </Text>
      </Space>

      <Tabs
        activeKey={activeKey}
        onChange={onTabChange}
        items={[
          {
            key: "bindings",
            label: "AI 功能模板",
            children: <BindingsTable />,
          },
          {
            key: "fragments",
            label: "提示词片段",
            children: <PromptFragments />,
          },
          {
            key: "assemblies",
            label: "自定义模板",
            children: <PromptAssemblies />,
          },
        ]}
      />
    </div>
  );
}
