import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  KeyOutlined,
  ReloadOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  useAIStatus,
  useDeleteSetting,
  useSettings,
  useUpsertSetting,
} from "@/api/settings";
import {
  SETTING_DESCRIPTIONS,
  SETTING_KEYS,
  SETTING_LABELS,
} from "@/types/setting";

interface FormValues {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
}

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TEMP = 0.7;

export function AISettings() {
  const navigate = useNavigate();
  const { data: settings = [], refetch } = useSettings();
  const { data: aiStatus, refetch: refetchStatus } = useAIStatus();
  const { mutate: upsert, isPending } = useUpsertSetting();
  const { mutate: remove } = useDeleteSetting();
  const [form] = Form.useForm<FormValues>();
  const [apiKeyDirty, setApiKeyDirty] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current || settings.length === 0) return;
    const map = new Map(settings.map((s) => [s.key, s]));
    form.setFieldsValue({
      apiKey: map.get(SETTING_KEYS.apiKey)?.is_set ? "(已设置)" : "",
      baseUrl: map.get(SETTING_KEYS.baseUrl)?.value || DEFAULT_BASE_URL,
      model: map.get(SETTING_KEYS.model)?.value || DEFAULT_MODEL,
      temperature: Number(map.get(SETTING_KEYS.temperature)?.value) || DEFAULT_TEMP,
    });
    hydrated.current = true;
  }, [settings, form]);

  async function onSave() {
    const values = await form.validateFields();
    const tasks: Promise<unknown>[] = [];
    if (apiKeyDirty && values.apiKey && values.apiKey !== "(已设置)") {
      tasks.push(
        new Promise<void>((resolve, reject) =>
          upsert(
            { key: SETTING_KEYS.apiKey, value: values.apiKey },
            { onSuccess: () => resolve(), onError: (e) => reject(e) }
          )
        )
      );
    }
    tasks.push(
      new Promise<void>((resolve, reject) =>
        upsert(
          { key: SETTING_KEYS.baseUrl, value: values.baseUrl },
          { onSuccess: () => resolve(), onError: (e) => reject(e) }
        )
      ),
      new Promise<void>((resolve, reject) =>
        upsert(
          { key: SETTING_KEYS.model, value: values.model },
          { onSuccess: () => resolve(), onError: (e) => reject(e) }
        )
      ),
      new Promise<void>((resolve, reject) =>
        upsert(
          { key: SETTING_KEYS.temperature, value: String(values.temperature) },
          { onSuccess: () => resolve(), onError: (e) => reject(e) }
        )
      ),
    );

    try {
      await Promise.all(tasks);
      message.success("已保存");
      setApiKeyDirty(false);
      refetchStatus();
      refetch();
    } catch (e) {
      message.error(`保存失败:${(e as Error).message}`);
    }
  }

  function onClearApiKey() {
    remove(SETTING_KEYS.apiKey, {
      onSuccess: () => {
        message.success("已清除 API Key");
        refetch();
        refetchStatus();
      },
      onError: (e: Error) => message.error(`清除失败:${e.message}`),
    });
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <Space size="middle" style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/settings")}>
          返回设置
        </Button>
        <Typography.Title level={3} style={{ margin: 0 }}>AI 服务配置</Typography.Title>
      </Space>

      <Alert
        type={aiStatus?.configured ? "success" : "warning"}
        showIcon
        icon={aiStatus?.configured ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        message={
          aiStatus?.configured
            ? `AI 已配置 — ${aiStatus.model} @ ${aiStatus.base_url}`
            : "AI 尚未配置 — 缺少 API Key"
        }
        description={
          aiStatus?.configured
            ? `Temperature=${aiStatus.temperature},支持 OpenAI 兼容协议的 LLM 服务。`
            : "请填写下面的 API Key / Base URL / 模型,即可在各处使用 AI 助手。"
        }
        action={
          <Button size="small" icon={<ReloadOutlined />} onClick={() => refetchStatus()}>
            刷新状态
          </Button>
        }
        style={{ marginBottom: 16 }}
      />

      <Card title="AI 服务配置" extra={<KeyOutlined />}>
        <Form layout="vertical" form={form} requiredMark="optional">
          <Form.Item
            name="apiKey"
            label={
              <Space>
                {SETTING_LABELS[SETTING_KEYS.apiKey]}
                <Tag color="orange">敏感</Tag>
              </Space>
            }
            tooltip="仅写入,前端不显示原文;留空则保持原值不变"
            extra={SETTING_DESCRIPTIONS[SETTING_KEYS.apiKey]}
          >
            <Input.Password
              placeholder="sk-...  留空表示不修改"
              onChange={() => setApiKeyDirty(true)}
            />
          </Form.Item>
          <Form.Item
            name="baseUrl"
            label={SETTING_LABELS[SETTING_KEYS.baseUrl]}
            extra={SETTING_DESCRIPTIONS[SETTING_KEYS.baseUrl]}
            rules={[{ required: true, type: "url" }]}
          >
            <Input placeholder={DEFAULT_BASE_URL} />
          </Form.Item>
          <Form.Item
            name="model"
            label={SETTING_LABELS[SETTING_KEYS.model]}
            extra={SETTING_DESCRIPTIONS[SETTING_KEYS.model]}
            rules={[{ required: true }]}
          >
            <Input placeholder={DEFAULT_MODEL} />
          </Form.Item>
          <Form.Item
            name="temperature"
            label={SETTING_LABELS[SETTING_KEYS.temperature]}
            extra={SETTING_DESCRIPTIONS[SETTING_KEYS.temperature]}
            rules={[{ required: true, type: "number", min: 0, max: 2 }]}
          >
            <InputNumber min={0} max={2} step={0.1} style={{ width: 200 }} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={onSave}
                loading={isPending}
              >
                保存
              </Button>
              <Popconfirm
                title="清除 API Key?"
                description="AI 助手将无法使用,直到重新填写"
                okText="清除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={onClearApiKey}
              >
                <Button danger icon={<DeleteOutlined />}>
                  清除 API Key
                </Button>
              </Popconfirm>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}