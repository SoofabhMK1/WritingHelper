import {
  Alert,
  Button,
  Card,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CopyOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useDeleteLlmLog, useLlmLog } from "@/api/llm-log";
import {
  LLM_LOG_STATUS_COLOR,
  LLM_LOG_STATUS_LABEL,
  type LlmLogStatus,
  type LlmRequestLogDetail as Detail,
} from "@/types/llm-log";
import { PROMPT_LABELS } from "@/types/prompt";

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function CopyBlock({ label, text }: { label: string; text: string | null | undefined }) {
  const value = text ?? "";
  return (
    <Card
      size="small"
      title={label}
      extra={
        <Tooltip title="复制">
          <Button
            size="small"
            icon={<CopyOutlined />}
            disabled={!value}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(value);
                message.success(`已复制 ${label}`);
              } catch {
                message.error("复制失败,请手动选择文本");
              }
            }}
          />
        </Tooltip>
      }
    >
      {value ? (
        <pre
          style={{
            background: "#fafafa",
            padding: 12,
            borderRadius: 4,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: 12,
            lineHeight: 1.6,
            margin: 0,
            maxHeight: 480,
            overflow: "auto",
          }}
        >
          {value}
        </pre>
      ) : (
        <Typography.Text type="secondary" italic>（无）</Typography.Text>
      )}
    </Card>
  );
}

export function AILogDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const logId = Number(id);

  const { data, isLoading, isError, error, refetch } = useLlmLog(logId);
  const { mutate: remove } = useDeleteLlmLog();

  if (Number.isNaN(logId) || logId <= 0) {
    return (
      <Alert
        type="error"
        message="无效的日志 id"
        action={<Button onClick={() => navigate("/ai-logs")}>返回请求日志</Button>}
      />
    );
  }

  if (isLoading) {
    return (
      <div>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/ai-logs")}>
            返回请求日志
          </Button>
        </Space>
        <Skeleton active />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/ai-logs")}>
            返回请求日志
          </Button>
        </Space>
        <Alert
          type="error"
          message="无法加载该日志"
          description={String(error ?? "记录不存在或已被删除")}
          action={<Button onClick={() => refetch()}>重试</Button>}
        />
      </div>
    );
  }

  const promptLabel =
    (PROMPT_LABELS as Record<string, string>)[data.prompt_name] ?? data.prompt_name;
  const status: LlmLogStatus = data.status;

  function onDelete() {
    if (!data) return;
    remove(data.id, {
      onSuccess: () => {
        message.success("已删除");
        navigate("/ai-logs");
      },
      onError: (e: Error) => message.error(`删除失败: ${e.message}`),
    });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Space size="middle" align="center">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/ai-logs")}>
            返回请求日志
          </Button>
          <Typography.Title level={4} style={{ margin: 0 }}>
            请求 #{data.id}
          </Typography.Title>
          <Tag color="geekblue">{promptLabel}</Tag>
          <Tag color={LLM_LOG_STATUS_COLOR[status]}>{LLM_LOG_STATUS_LABEL[status]}</Tag>
        </Space>
        <Button danger icon={<DeleteOutlined />} onClick={onDelete}>
          删除
        </Button>
      </div>

      <Card size="small" style={{ marginBottom: 16 }} title="基本信息">
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          <div>
            <Typography.Text type="secondary">端点:</Typography.Text>{" "}
            <code>{data.endpoint}</code>
          </div>
          <div>
            <Typography.Text type="secondary">模型:</Typography.Text>{" "}
            <code>{data.model ?? "—"}</code>
          </div>
          <div>
            <Typography.Text type="secondary">耗时:</Typography.Text>{" "}
            {formatDuration(data.duration_ms)}
          </div>
          <div>
            <Typography.Text type="secondary">作品:</Typography.Text>{" "}
            {data.work_id == null ? (
              "—"
            ) : (
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/works/${data.work_id}`)}
              >
                #{data.work_id}
              </Button>
            )}
          </div>
          <div>
            <Typography.Text type="secondary">创建时间:</Typography.Text>{" "}
            {formatDateTime(data.created_at)}
          </div>
          {data.error && (
            <Alert
              type="error"
              showIcon
              style={{ marginTop: 8 }}
              message="错误信息"
              description={<pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{data.error}</pre>}
            />
          )}
        </Space>
      </Card>

      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <CopyBlock label="System Prompt" text={data.system} />
        <CopyBlock label="User Prompt" text={data.user} />
        <CopyBlock label="Response" text={data.response} />
      </Space>
    </div>
  );
}

export type { Detail as _AILogDetail };
