import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ClearOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { useWorks } from "@/api/works";
import {
  useClearLlmLogs,
  useDeleteLlmLog,
  useLlmLogs,
  type LlmLogFilters,
} from "@/api/llm-log";
import {
  LLM_LOG_STATUS_COLOR,
  LLM_LOG_STATUS_LABEL,
  LLM_LOG_STATUS_OPTIONS,
  type LlmLogStatus,
  type LlmRequestLogSummary,
} from "@/types/llm-log";
import { PROMPT_LABELS, type PromptName } from "@/types/prompt";

const POLL_INTERVAL_MS = 30_000;

const PROMPT_OPTIONS: { value: PromptName; label: string }[] = (
  Object.entries(PROMPT_LABELS) as [PromptName, string][]
).map(([value, label]) => ({ value, label }));

const PAGE_SIZE = 20;

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function AILogs() {
  const navigate = useNavigate();

  const [workId, setWorkId] = useState<number | undefined>(undefined);
  const [promptName, setPromptName] = useState<PromptName | undefined>(undefined);
  const [status, setStatus] = useState<LlmLogStatus | undefined>(undefined);
  const [page, setPage] = useState(1);

  const filters: LlmLogFilters = useMemo(
    () => ({
      workId,
      promptName,
      status,
      page,
      pageSize: PAGE_SIZE,
    }),
    [workId, promptName, status, page],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useLlmLogs(filters, { refetchIntervalMs: POLL_INTERVAL_MS });
  const { mutate: deleteLog } = useDeleteLlmLog();
  const { mutate: clearLogs, isPending: clearing } = useClearLlmLogs();
  const { data: works = [] } = useWorks();

  const workOptions = useMemo(
    () => [
      { value: "__all__", label: "全部作品" },
      ...works.map((w) => ({ value: w.id, label: w.title })),
    ],
    [works],
  );

  useEffect(() => {
    setPage(1);
  }, [workId, promptName, status]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  function onClearAll() {
    clearLogs(
      { workId, promptName },
      {
        onSuccess: (res) => {
          message.success(`已清空 ${res.deleted} 条日志`);
          setPage(1);
        },
        onError: (e: Error) => message.error(`清空失败: ${e.message}`),
      },
    );
  }

  function onDeleteRow(id: number) {
    deleteLog(id, {
      onError: (e: Error) => message.error(`删除失败: ${e.message}`),
    });
  }

  const columns: ColumnsType<LlmRequestLogSummary> = [
    {
      title: "时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 170,
      render: (v: string) => (
        <Typography.Text style={{ fontSize: 12 }}>{formatDateTime(v)}</Typography.Text>
      ),
    },
    {
      title: "提示词",
      dataIndex: "prompt_name",
      key: "prompt_name",
      width: 110,
      render: (v: string) => {
        const label = (PROMPT_LABELS as Record<string, string>)[v] ?? v;
        return <Tag color="geekblue">{label}</Tag>;
      },
    },
    {
      title: "端点",
      dataIndex: "endpoint",
      key: "endpoint",
      width: 200,
      render: (v: string) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{v}</Typography.Text>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (v: LlmLogStatus) => (
        <Tag color={LLM_LOG_STATUS_COLOR[v]}>{LLM_LOG_STATUS_LABEL[v]}</Tag>
      ),
    },
    {
      title: "耗时",
      dataIndex: "duration_ms",
      key: "duration_ms",
      width: 80,
      render: (v: number) => <span style={{ fontSize: 12 }}>{formatDuration(v)}</span>,
    },
    {
      title: "作品",
      dataIndex: "work_id",
      key: "work_id",
      width: 100,
      render: (v: number | null) =>
        v == null ? (
          <Typography.Text type="secondary">—</Typography.Text>
        ) : (
          <Button type="link" size="small" onClick={() => navigate(`/works/${v}`)}>
            #{v}
          </Button>
        ),
    },
    {
      title: "用户输入预览",
      dataIndex: "user_preview",
      key: "user_preview",
      ellipsis: true,
      render: (v: string) =>
        v ? (
          <Tooltip title={v}>
            <Typography.Text style={{ fontSize: 12 }}>{v}</Typography.Text>
          </Tooltip>
        ) : (
          <Typography.Text type="secondary" italic>（空）</Typography.Text>
        ),
    },
    {
      title: "响应预览",
      dataIndex: "response_preview",
      key: "response_preview",
      ellipsis: true,
      render: (v: string) =>
        v ? (
          <Tooltip title={v}>
            <Typography.Text style={{ fontSize: 12 }}>{v}</Typography.Text>
          </Tooltip>
        ) : (
          <Typography.Text type="secondary" italic>（无）</Typography.Text>
        ),
    },
    {
      title: "操作",
      key: "actions",
      width: 120,
      render: (_: unknown, row) => (
        <Space>
          <Button
            size="small"
            onClick={() => navigate(`/ai-logs/${row.id}`)}
          >
            查看
          </Button>
          <Popconfirm
            title="删除该日志?"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDeleteRow(row.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Space size="middle" align="center">
          <Typography.Title level={4} style={{ margin: 0 }}>
            LLM 请求日志
          </Typography.Title>
          <Typography.Text type="secondary">
            共 {total} 条 · 最近 30 秒自动刷新
          </Typography.Text>
        </Space>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isFetching}
          >
            刷新
          </Button>
          <Popconfirm
            title="清空所有日志?"
            description={
              (workId || promptName)
                ? "将清空符合当前筛选条件的所有日志"
                : "将清空全部请求日志,不可恢复"
            }
            okText="清空"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={onClearAll}
          >
            <Button danger icon={<ClearOutlined />} loading={clearing}>
              清空
            </Button>
          </Popconfirm>
        </Space>
      </div>

      {isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="无法加载日志"
          description={String(error)}
          action={<Button size="small" onClick={() => refetch()}>重试</Button>}
        />
      )}

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          allowClear
          placeholder="作品"
          value={workId}
          onChange={(v) => setWorkId(v ?? undefined)}
          onClear={() => setWorkId(undefined)}
          options={workOptions}
          style={{ width: 200 }}
          showSearch
          optionFilterProp="label"
        />
        <Select
          allowClear
          placeholder="提示词"
          value={promptName}
          onChange={(v) => setPromptName(v ?? undefined)}
          options={PROMPT_OPTIONS}
          style={{ width: 160 }}
        />
        <Select
          allowClear
          placeholder="状态"
          value={status}
          onChange={(v) => setStatus(v ?? undefined)}
          options={LLM_LOG_STATUS_OPTIONS}
          style={{ width: 140 }}
        />
      </Space>

      <Card>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <Spin /> <Typography.Text type="secondary">加载中…</Typography.Text>
          </div>
        ) : items.length === 0 ? (
          <Empty description="还没有任何 LLM 请求日志" />
        ) : (
          <Table
            rowKey="id"
            dataSource={items}
            columns={columns}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total,
              onChange: (p) => setPage(p),
              showSizeChanger: false,
            }}
          />
        )}
      </Card>
    </div>
  );
}
