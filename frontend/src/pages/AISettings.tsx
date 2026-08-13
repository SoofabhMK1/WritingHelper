import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  StarFilled,
  StarOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  useAIStatus,
} from "@/api/settings";
import {
  useAIProfileList,
  useAssignments,
  useClearAssignment,
  useCreateAIProfile,
  useDeleteAIProfile,
  useSetAssignment,
  useSetDefaultAIProfile,
  useUpdateAIProfile,
} from "@/api/aiProfile";
import type {
  AIProfile,
  AIProfileCreate,
  AIProfileUpdate,
} from "@/types/aiProfile";
import { PROMPT_LABELS, PROMPT_LIST, type PromptName } from "@/types/prompt";

interface EditorState {
  open: boolean;
  mode: "create" | "edit";
  profile?: AIProfile;
}

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TEMP = 0.7;
const DEFAULT_PROVIDER = "custom";
const DEFAULT_PROFILE_VALUE = "__default__";

export function AISettings() {
  const navigate = useNavigate();
  const { data: aiStatus, refetch: refetchStatus } = useAIStatus();
  const { data: profiles = [], refetch: refetchProfiles, isFetching } =
    useAIProfileList();
  const { data: assignments = {}, refetch: refetchAssignments } =
    useAssignments();
  const createMut = useCreateAIProfile();
  const updateMut = useUpdateAIProfile();
  const deleteMut = useDeleteAIProfile();
  const setDefaultMut = useSetDefaultAIProfile();
  const setAssignMut = useSetAssignment();
  const clearAssignMut = useClearAssignment();

  const [editor, setEditor] = useState<EditorState>({
    open: false,
    mode: "create",
  });
  const [editorForm] = Form.useForm<AIProfileCreate>();

  function openCreate() {
    editorForm.resetFields();
    editorForm.setFieldsValue({
      name: "",
      provider: DEFAULT_PROVIDER,
      base_url: DEFAULT_BASE_URL,
      model: DEFAULT_MODEL,
      temperature: DEFAULT_TEMP,
      api_key: "",
      is_default: profiles.length === 0,
    });
    setEditor({ open: true, mode: "create" });
  }

  function openEdit(p: AIProfile) {
    editorForm.resetFields();
    editorForm.setFieldsValue({
      name: p.name,
      provider: p.provider,
      base_url: p.base_url,
      model: p.model,
      temperature: p.temperature,
      api_key: "", // placeholder — only write if user types
      is_default: p.is_default,
    });
    setEditor({ open: true, mode: "edit", profile: p });
  }

  async function onSubmitEditor() {
    try {
      const values = await editorForm.validateFields();
      if (editor.mode === "create") {
        await createMut.mutateAsync({
          ...values,
          api_key: values.api_key || null,
        });
        message.success("已创建 API 配置");
      } else if (editor.profile) {
        const payload: AIProfileUpdate = {
          name: values.name,
          provider: values.provider,
          base_url: values.base_url,
          model: values.model,
          temperature: values.temperature,
          is_default: values.is_default,
        };
        // only send api_key when user typed a new one
        if (values.api_key) {
          payload.api_key = values.api_key;
        }
        await updateMut.mutateAsync({ id: editor.profile.id, payload });
        message.success("已更新 API 配置");
      }
      setEditor({ open: false, mode: "create" });
      refetchStatus();
      refetchProfiles();
      refetchAssignments();
    } catch (e) {
      if ((e as { errorFields?: unknown[] }).errorFields) return; // validation
      message.error(`保存失败:${(e as Error).message}`);
    }
  }

  function onDelete(p: AIProfile) {
    deleteMut.mutate(p.id, {
      onSuccess: () => {
        message.success("已删除");
        refetchProfiles();
        refetchStatus();
        refetchAssignments();
      },
      onError: (e: Error) => message.error(`删除失败:${e.message}`),
    });
  }

  function onSetDefault(p: AIProfile) {
    if (p.is_default) return;
    setDefaultMut.mutate(p.id, {
      onSuccess: () => {
        message.success(`已将「${p.name}」设为默认`);
        refetchProfiles();
        refetchStatus();
      },
      onError: (e: Error) => message.error(`设置失败:${e.message}`),
    });
  }

  function onChangeAssignment(promptName: PromptName, value: number | null) {
    if (value === null) {
      clearAssignMut.mutate(promptName, {
        onSuccess: () => {
          message.success("已重置为默认 API");
          refetchAssignments();
        },
      });
      return;
    }
    setAssignMut.mutate(
      { promptName, profileId: value },
      {
        onSuccess: () => {
          refetchAssignments();
        },
        onError: (e: Error) => message.error(`设置失败:${e.message}`),
      }
    );
  }

  const columns: ColumnsType<AIProfile> = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      render: (name: string, row) => (
        <Space>
          <strong>{name}</strong>
          {row.is_default && <Tag color="gold">默认</Tag>}
        </Space>
      ),
    },
    {
      title: "服务商",
      dataIndex: "provider",
      key: "provider",
      width: 110,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: "模型",
      dataIndex: "model",
      key: "model",
      width: 180,
    },
    {
      title: "Base URL",
      dataIndex: "base_url",
      key: "base_url",
      ellipsis: true,
      render: (v: string) => (
        <Tooltip title={v}>
          <span style={{ fontFamily: "monospace", fontSize: 12 }}>{v}</span>
        </Tooltip>
      ),
    },
    {
      title: "温度",
      dataIndex: "temperature",
      key: "temperature",
      width: 80,
      render: (v: number) => v.toFixed(2),
    },
    {
      title: "API Key",
      dataIndex: "has_api_key",
      key: "has_api_key",
      width: 100,
      render: (has: boolean) =>
        has ? (
          <Tag color="green">已设置</Tag>
        ) : (
          <Tag color="default">未设置</Tag>
        ),
    },
    {
      title: "操作",
      key: "actions",
      width: 220,
      render: (_v, row) => (
        <Space>
          {!row.is_default && (
            <Tooltip title="设为默认">
              <Button
                size="small"
                icon={<StarOutlined />}
                onClick={() => onSetDefault(row)}
                loading={setDefaultMut.isPending}
              >
                设为默认
              </Button>
            </Tooltip>
          )}
          {row.is_default && (
            <Tag icon={<StarFilled />} color="gold">
              当前默认
            </Tag>
          )}
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(row)}
          >
            编辑
          </Button>
          <Popconfirm
            title={`删除「${row.name}」?`}
            description="已绑定的 AI 服务将自动回退到默认 API。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(row)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleteMut.isPending && deleteMut.variables === row.id}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <Space size="middle" style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/settings")}>
          返回设置
        </Button>
        <Typography.Title level={3} style={{ margin: 0 }}>
          AI 服务配置
        </Typography.Title>
      </Space>

      <Alert
        type={aiStatus?.configured ? "success" : "warning"}
        showIcon
        icon={
          aiStatus?.configured ? <CheckCircleOutlined /> : <CloseCircleOutlined />
        }
        message={
          aiStatus?.configured
            ? `默认 API 已就绪 — ${aiStatus.model} @ ${aiStatus.base_url}`
            : "尚未配置任何 API"
        }
        description={
          aiStatus?.configured
            ? `当前默认:${aiStatus.default_profile_name ?? "未命名"} · provider=${aiStatus.provider} · 温度=${aiStatus.temperature}。新增 API 配置后可在此页面切换默认,或为不同 AI 服务单独绑定。`
            : "请新增一个 API 配置并设为默认。支持任意 OpenAI 兼容服务(OpenAI / DeepSeek / 通义千问 / Moonshot / 自建 等)。"
        }
        action={
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => {
              refetchStatus();
              refetchProfiles();
              refetchAssignments();
            }}
          >
            刷新
          </Button>
        }
        style={{ marginBottom: 16 }}
      />

      <Card
        title={
          <Space>
            <KeyOutlined />
            <span>API 配置列表</span>
            <Badge count={profiles.length} showZero color="blue" />
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            disabled={createMut.isPending}
          >
            新建 API 配置
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        {profiles.length === 0 ? (
          <Empty
            description={
              isFetching ? "加载中..." : "还没有 API 配置。点击右上角「新建 API 配置」开始。"
            }
          />
        ) : (
          <Table
            rowKey="id"
            dataSource={profiles}
            columns={columns}
            pagination={false}
            size="middle"
          />
        )}
      </Card>

      <Card title="AI 服务 ↔ API 配置" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Typography.Text type="secondary">
            为每个 AI 服务单独指定使用的 API 配置;留空(选「使用默认 API」)时,使用上方已设为默认的 API。
          </Typography.Text>
          <Table
            rowKey="name"
            dataSource={PROMPT_LIST.map((name) => ({
              name,
              label: PROMPT_LABELS[name],
            }))}
            pagination={false}
            size="small"
            columns={[
              { title: "AI 服务", dataIndex: "label", key: "label" },
              {
                title: "使用的 API",
                key: "profile",
                render: (_v, row) => (
                  <Select
                    style={{ minWidth: 280 }}
                    value={
                      assignments[row.name] != null
                        ? String(assignments[row.name])
                        : DEFAULT_PROFILE_VALUE
                    }
                    onChange={(value) =>
                      onChangeAssignment(
                        row.name as PromptName,
                        value === DEFAULT_PROFILE_VALUE ? null : Number(value)
                      )
                    }
                    options={[
                      { value: DEFAULT_PROFILE_VALUE, label: "使用默认 API" },
                      ...profiles.map((p) => ({
                        value: String(p.id),
                        label: `${p.name} · ${p.model}${
                          p.is_default ? " (默认)" : ""
                        }`,
                      })),
                    ]}
                    placeholder={
                      profiles.length === 0 ? "请先创建 API 配置" : "使用默认 API"
                    }
                    disabled={
                      profiles.length === 0 ||
                      (setAssignMut.isPending &&
                        setAssignMut.variables?.promptName === row.name)
                    }
                  />
                ),
              },
            ]}
          />
        </Space>
      </Card>

      <Modal
        title={editor.mode === "create" ? "新建 API 配置" : `编辑 · ${editor.profile?.name}`}
        open={editor.open}
        onCancel={() => setEditor({ open: false, mode: "create" })}
        onOk={onSubmitEditor}
        okText="保存"
        cancelText="取消"
        confirmLoading={createMut.isPending || updateMut.isPending}
        destroyOnHidden
        width={560}
      >
        <Form layout="vertical" form={editorForm} requiredMark="optional">
          <Form.Item
            name="name"
            label="配置名称"
            rules={[
              { required: true, message: "请填写名称" },
              { max: 40, message: "最长 40 个字符" },
            ]}
            extra="便于区分多个 API 配置,例如「OpenAI 主账号」「DeepSeek」"
          >
            <Input placeholder="例如:OpenAI 主账号" />
          </Form.Item>
          <Form.Item
            name="provider"
            label="服务商"
            rules={[{ required: true, max: 40 }]}
            extra="自由填写,便于记忆;不影响实际调用"
          >
            <Input placeholder={DEFAULT_PROVIDER} />
          </Form.Item>
          <Form.Item
            name="base_url"
            label="Base URL"
            rules={[
              { required: true, message: "请填写 Base URL" },
              { type: "url", message: "请输入合法的 URL" },
            ]}
          >
            <Input placeholder={DEFAULT_BASE_URL} />
          </Form.Item>
          <Form.Item
            name="model"
            label="模型"
            rules={[{ required: true, message: "请填写模型名" }]}
          >
            <Input placeholder={DEFAULT_MODEL} />
          </Form.Item>
          <Form.Item
            name="temperature"
            label="温度"
            rules={[{ required: true, type: "number", min: 0, max: 2 }]}
            extra="0-2,越大越发散"
          >
            <InputNumber min={0} max={2} step={0.1} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item
            name="api_key"
            label={
              <Space>
                <span>API Key</span>
                <Tag color="orange">敏感</Tag>
              </Space>
            }
            tooltip={
              editor.mode === "edit"
                ? "留空表示不修改;填入新值将覆盖原 Key"
                : "仅写入,前端不显示原文"
            }
          >
            <Input.Password placeholder="sk-..." />
          </Form.Item>
          <Form.Item name="is_default" label="设为默认">
            <Select
              options={[
                { value: false, label: "否(可作为专用 API)" },
                { value: true, label: "是(未配置专属 API 的服务将使用此项)" },
              ]}
              defaultValue={false}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}