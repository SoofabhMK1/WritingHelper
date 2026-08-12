import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  useCreateEvent,
  useDeleteEvent,
  useEvents,
} from "@/api/events";
import {
  EVENT_STATUS_COLOR,
  EVENT_STATUS_LABEL,
  EVENT_TYPE_COLOR,
  EVENT_TYPE_LABEL,
  IMPORTANCE_COLOR,
  IMPORTANCE_LABEL,
  type Event,
  type EventCreate,
  type EventStatusKind,
  type EventTypeKind,
} from "@/types/event";

const TYPE_OPTIONS: { value: EventTypeKind; label: string }[] = (
  Object.entries(EVENT_TYPE_LABEL) as [EventTypeKind, string][]
).map(([value, label]) => ({ value, label }));

const STATUS_OPTIONS: { value: EventStatusKind; label: string }[] = (
  Object.entries(EVENT_STATUS_LABEL) as [EventStatusKind, string][]
).map(([value, label]) => ({ value, label }));

const EMPTY: EventCreate = {
  title: "",
  description: "",
  event_type: "main",
  status: "planned",
  importance: 3,
  story_time: "",
  location: "",
  chapter_id: null,
  notes: "",
};

type ViewMode = "list" | "timeline";

export function EventList({ workId }: { workId: number }) {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("list");
  const [typeFilter, setTypeFilter] = useState<EventTypeKind | undefined>();
  const [statusFilter, setStatusFilter] = useState<EventStatusKind | undefined>();
  const { data: events = [], isLoading, isError, error, refetch } = useEvents(
    workId,
    {
      event_type: typeFilter,
      status: statusFilter,
    }
  );
  const { mutate: create } = useCreateEvent(workId);
  const { mutate: remove } = useDeleteEvent(workId);

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<EventCreate>();

  function onCreate() {
    form.resetFields();
    form.setFieldsValue(EMPTY);
    setOpen(true);
  }

  async function onSubmit() {
    const values = await form.validateFields();
    create(values, {
      onSuccess: () => {
        message.success("已新建事件");
        setOpen(false);
      },
      onError: (e: Error) => message.error(`创建失败: ${e.message}`),
    });
  }

  function onDelete(e: Event) {
    remove(e.id, {
      onSuccess: () => message.success(`已删除《${e.title}》`),
      onError: (err: Error) => message.error(`删除失败: ${err.message}`),
    });
  }

  const grouped = useMemo(() => {
    return events.reduce<Record<EventTypeKind, Event[]>>((acc, ev) => {
      (acc[ev.event_type] ??= []).push(ev);
      return acc;
    }, {} as Record<EventTypeKind, Event[]>);
  }, [events]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Space size="middle" align="center">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/works/${workId}`)}>
            返回作品详情
          </Button>
          <Typography.Title level={4} style={{ margin: 0 }}>
            事件
          </Typography.Title>
        </Space>
        <Space>
          <Segmented
            value={view}
            onChange={(v) => setView(v as ViewMode)}
            options={[
              { label: "列表", value: "list" },
              { label: "时间线", value: "timeline" },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
            新建事件
          </Button>
        </Space>
      </div>

      {isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="加载事件失败"
          description={String(error)}
          action={<Button size="small" onClick={() => refetch()}>重试</Button>}
        />
      )}

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          allowClear
          placeholder="类型"
          value={typeFilter}
          onChange={setTypeFilter}
          options={TYPE_OPTIONS}
          style={{ width: 140 }}
        />
        <Select
          allowClear
          placeholder="状态"
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          style={{ width: 140 }}
        />
      </Space>

      {isLoading ? (
        <Typography.Text type="secondary">加载中…</Typography.Text>
      ) : events.length === 0 ? (
        <Empty description="还没有事件" />
      ) : view === "timeline" ? (
        <TimelineView events={events} onOpen={(id) => navigate(`/works/${workId}/events/${id}`)} />
      ) : (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {(Object.keys(grouped) as EventTypeKind[]).map((t) =>
            grouped[t].length > 0 ? (
              <Card
                key={t}
                size="small"
                title={
                  <Space>
                    <Tag color={EVENT_TYPE_COLOR[t]}>{EVENT_TYPE_LABEL[t]}</Tag>
                    <Typography.Text type="secondary">
                      {grouped[t].length} 条
                    </Typography.Text>
                  </Space>
                }
              >
                <Space direction="vertical" style={{ width: "100%" }}>
                  {grouped[t].map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        display: "flex",
                        gap: 8,
                        padding: "8px 12px",
                        background: "#fafafa",
                        borderRadius: 4,
                        alignItems: "center",
                      }}
                    >
                      <Tooltip title={ev.story_time || "未设时间"}>
                        <Tag style={{ minWidth: 80, textAlign: "center" }}>
                          {ev.story_time || "—"}
                        </Tag>
                      </Tooltip>
                      <span
                        style={{ flex: 1, cursor: "pointer", color: "#1677ff" }}
                        onClick={() => navigate(`/works/${workId}/events/${ev.id}`)}
                      >
                        {ev.title}
                      </span>
                      {ev.location && (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          <EnvironmentOutlined /> {ev.location}
                        </Typography.Text>
                      )}
                      <Tag color={IMPORTANCE_COLOR[ev.importance]}>
                        {IMPORTANCE_LABEL[ev.importance]}
                      </Tag>
                      <Tag color={EVENT_STATUS_COLOR[ev.status]}>
                        {EVENT_STATUS_LABEL[ev.status]}
                      </Tag>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => navigate(`/works/${workId}/events/${ev.id}`)}
                      />
                      <Popconfirm
                        title="删除该事件?"
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => onDelete(ev)}
                      >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </div>
                  ))}
                </Space>
              </Card>
            ) : null
          )}
        </Space>
      )}

      <Modal
        title="新建事件"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText="创建"
        cancelText="取消"
        width={640}
      >
        <Form layout="vertical" form={form} initialValues={EMPTY}>
          <Form.Item name="title" label="事件标题" rules={[{ required: true, max: 200 }]}>
            <Input placeholder="例如:屠村之夜" />
          </Form.Item>
          <Space>
            <Form.Item name="event_type" label="类型" rules={[{ required: true }]}>
              <Select options={TYPE_OPTIONS} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select options={STATUS_OPTIONS} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="importance" label="重要性" rules={[{ required: true }]}>
              <Select
                options={[1, 2, 3, 4, 5].map((n) => ({
                  value: n,
                  label: `${n} - ${IMPORTANCE_LABEL[n]}`,
                }))}
                style={{ width: 140 }}
              />
            </Form.Item>
          </Space>
          <Space style={{ width: "100%" }}>
            <Form.Item name="story_time" label="故事内时间" style={{ flex: 1 }}>
              <Input placeholder="例如:Day 90 / 第三章 / 雪夜" />
            </Form.Item>
            <Form.Item name="location" label="地点" style={{ flex: 1 }}>
              <Input placeholder="青云山" />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="描述">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
          </Form.Item>
          <Form.Item name="notes" label="笔记">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function TimelineView({
  events,
  onOpen,
}: {
  events: Event[];
  onOpen: (id: number) => void;
}) {
  const ordered = useMemo(
    () =>
      [...events].sort((a, b) => {
        const ta = a.story_time ?? "\uffff";
        const tb = b.story_time ?? "\uffff";
        return ta.localeCompare(tb) || a.id - b.id;
      }),
    [events]
  );
  return (
    <div style={{ position: "relative", paddingLeft: 24 }}>
      <div
        style={{
          position: "absolute",
          left: 8,
          top: 0,
          bottom: 0,
          width: 2,
          background: "#d9d9d9",
        }}
      />
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {ordered.map((ev) => (
          <div
            key={ev.id}
            style={{
              position: "relative",
              cursor: "pointer",
              background: "#fafafa",
              padding: "10px 12px",
              borderRadius: 4,
            }}
            onClick={() => onOpen(ev.id)}
          >
            <div
              style={{
                position: "absolute",
                left: -22,
                top: 14,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: IMPORTANCE_COLOR[ev.importance] === "red" ? "#ff4d4f" : "#1677ff",
                border: "2px solid #fff",
              }}
            />
            <Space>
              <Tag color={EVENT_TYPE_COLOR[ev.event_type]}>{EVENT_TYPE_LABEL[ev.event_type]}</Tag>
              <strong>{ev.title}</strong>
              <Tag>{ev.story_time || "未设时间"}</Tag>
              {ev.location && (
                <Typography.Text type="secondary">
                  <EnvironmentOutlined /> {ev.location}
                </Typography.Text>
              )}
            </Space>
            {ev.description && (
              <Typography.Paragraph
                type="secondary"
                ellipsis={{ rows: 2 }}
                style={{ marginTop: 6, marginBottom: 0 }}
              >
                {ev.description}
              </Typography.Paragraph>
            )}
          </div>
        ))}
      </Space>
    </div>
  );
}