import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  LinkOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import {
  useAddEventCharacter,
  useAddEventLink,
  useDeleteEvent,
  useEvent,
  useEvents,
  useRemoveEventCharacter,
  useRemoveEventLink,
  useUpdateEvent,
} from "@/api/events";
import { useCharacters } from "@/api/characters";
import { useChapters } from "@/api/chapters";
import {
  EVENT_LINK_ARROW,
  EVENT_LINK_LABEL,
  EVENT_STATUS_COLOR,
  EVENT_STATUS_LABEL,
  EVENT_TYPE_COLOR,
  EVENT_TYPE_LABEL,
  IMPORTANCE_LABEL,
  type EventLinkKind,
  type EventStatusKind,
  type EventTypeKind,
  type EventUpdate,
} from "@/types/event";

const TYPE_OPTIONS: { value: EventTypeKind; label: string }[] = (
  Object.entries(EVENT_TYPE_LABEL) as [EventTypeKind, string][]
).map(([value, label]) => ({ value, label }));

const STATUS_OPTIONS: { value: EventStatusKind; label: string }[] = (
  Object.entries(EVENT_STATUS_LABEL) as [EventStatusKind, string][]
).map(([value, label]) => ({ value, label }));

const LINK_OPTIONS: { value: EventLinkKind; label: string }[] = (
  Object.entries(EVENT_LINK_LABEL) as [EventLinkKind, string][]
).map(([value, label]) => ({ value, label }));

interface FormValues {
  title: string;
  description?: string;
  event_type: EventTypeKind;
  story_time?: string;
  location?: string;
  importance: number;
  status: EventStatusKind;
  chapter_id?: number | null;
  notes?: string;
}

export function EventEditor() {
  const { wid, eid } = useParams<{ wid: string; eid: string }>();
  const workId = Number(wid);
  const eventId = Number(eid);
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();

  const { data: event, isLoading, isError, error, refetch } = useEvent(workId, eventId);
  const { data: characters = [] } = useCharacters(workId);
  const { data: chapters = [] } = useChapters(workId);
  const { data: allEvents = [] } = useEvents(workId);

  const { mutate: update, isPending: updating } = useUpdateEvent(workId);
  const { mutate: remove } = useDeleteEvent(workId);
  const { mutate: addChar } = useAddEventCharacter(workId);
  const { mutate: removeChar } = useRemoveEventCharacter(workId);
  const { mutate: addLink } = useAddEventLink(workId);
  const { mutate: removeLink } = useRemoveEventLink(workId);

  useEffect(() => {
    if (event) {
      form.setFieldsValue({
        title: event.title,
        description: event.description ?? undefined,
        event_type: event.event_type,
        story_time: event.story_time ?? undefined,
        location: event.location ?? undefined,
        importance: event.importance,
        status: event.status,
        chapter_id: event.chapter_id ?? undefined,
        notes: event.notes ?? undefined,
      });
    }
  }, [event, form]);

  if (isLoading) return <Typography.Text type="secondary">加载中…</Typography.Text>;
  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="加载事件失败"
        description={String(error)}
        action={<Button size="small" onClick={() => refetch()}>重试</Button>}
      />
    );
  }
  if (!event) return <Typography.Text type="secondary">事件不存在</Typography.Text>;

  async function onFinish(values: FormValues) {
    await update(
      { id: eventId, payload: values as EventUpdate },
      {
        onSuccess: () => message.success("已保存"),
        onError: (e: Error) => message.error(`保存失败: ${e.message}`),
      },
    );
  }

  function onDelete() {
    remove(eventId, {
      onSuccess: () => {
        message.success("已删除");
        navigate(`/works/${workId}/events`);
      },
      onError: (e: Error) => message.error(`删除失败: ${e.message}`),
    });
  }

  function onAddCharacter(characterId: number, role: string) {
    addChar(
      { eventId, payload: { character_id: characterId, role } },
      {
        onSuccess: () => message.success("已添加"),
        onError: (e: Error) => message.error(e.message),
      },
    );
  }

  function onRemoveCharacter(linkId: number) {
    removeChar({ eventId, linkId });
  }

  function onAddLink(targetId: number, linkType: EventLinkKind) {
    addLink(
      {
        eventId,
        payload: {
          source_event_id: eventId,
          target_event_id: targetId,
          link_type: linkType,
        },
      },
      {
        onSuccess: () => message.success("已建立因果链"),
        onError: (e: Error) => message.error(e.message),
      },
    );
  }

  function onRemoveLink(linkId: number) {
    removeLink({ eventId, linkId });
  }

  const charMap = new Map(characters.map((c) => [c.id, c.name]));
  const eventTitleMap = new Map(allEvents.map((e) => [e.id, e.title]));

  const linkedCharIds = new Set(event.character_links.map((l) => l.character_id));
  const availableChars = characters.filter((c) => !linkedCharIds.has(c.id));
  const otherEvents = allEvents.filter((e) => e.id !== eventId);

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/works/${workId}/events`)}>
          返回事件列表
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {event.title}
        </Typography.Title>
        <Tag color={EVENT_TYPE_COLOR[event.event_type]}>{EVENT_TYPE_LABEL[event.event_type]}</Tag>
        <Tag color={EVENT_STATUS_COLOR[event.status]}>{EVENT_STATUS_LABEL[event.status]}</Tag>
      </Space>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="基本信息">
            <Form layout="vertical" form={form} onFinish={onFinish} requiredMark="optional">
              <Form.Item name="title" label="标题" rules={[{ required: true, max: 200 }]}>
                <Input maxLength={200} />
              </Form.Item>

              <Space>
                <Form.Item name="event_type" label="类型">
                  <Select options={TYPE_OPTIONS} style={{ width: 140 }} />
                </Form.Item>
                <Form.Item name="status" label="状态">
                  <Select options={STATUS_OPTIONS} style={{ width: 140 }} />
                </Form.Item>
                <Form.Item name="importance" label="重要性">
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
                  <Input placeholder="Day 90 / 第三章 / 雪夜" />
                </Form.Item>
                <Form.Item name="location" label="地点" style={{ flex: 1 }}>
                  <Input />
                </Form.Item>
                <Form.Item name="chapter_id" label="归属章节" style={{ flex: 1 }}>
                  <Select
                    allowClear
                    placeholder="(散章事件)"
                    options={chapters.map((c) => ({ value: c.id, label: c.title }))}
                  />
                </Form.Item>
              </Space>

              <Form.Item name="description" label="描述">
                <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} />
              </Form.Item>
              <Form.Item name="notes" label="笔记">
                <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    htmlType="submit"
                    loading={updating}
                  >
                    保存
                  </Button>
                  <Popconfirm
                    title="删除该事件?"
                    description="其人物关联与因果链也会一并删除。"
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    onConfirm={onDelete}
                  >
                    <Button danger icon={<DeleteOutlined />}>
                      删除事件
                    </Button>
                  </Popconfirm>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="涉及人物" size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: "100%" }}>
              {event.character_links.length === 0 && (
                <Typography.Text type="secondary">还没有关联人物</Typography.Text>
              )}
              {event.character_links.map((l) => (
                <Space key={l.id} style={{ width: "100%", justifyContent: "space-between" }}>
                  <Space>
                    <Tag>{l.role}</Tag>
                    <span>{charMap.get(l.character_id) ?? `#${l.character_id}`}</span>
                  </Space>
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onRemoveCharacter(l.id)}
                  />
                </Space>
              ))}
              {availableChars.length > 0 && (
                <AddCharacterInline characters={availableChars} onAdd={onAddCharacter} />
              )}
            </Space>
          </Card>

          <Card title="因果链" size="small">
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              添加"本事件 导致/阻止/促成/对照/平行 另一事件"
            </Typography.Text>
            <Space direction="vertical" style={{ width: "100%", marginTop: 8 }}>
              {event.links_out.map((l) => (
                <Space key={"o" + l.id} style={{ width: "100%", justifyContent: "space-between" }}>
                  <Space>
                    <Tag>{EVENT_LINK_LABEL[l.link_type]}</Tag>
                    <span style={{ fontSize: 12 }}>
                      {EVENT_LINK_ARROW[l.link_type]} {eventTitleMap.get(l.target_event_id) ?? `#${l.target_event_id}`}
                    </span>
                  </Space>
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onRemoveLink(l.id)}
                  />
                </Space>
              ))}
              {event.links_in.map((l) => (
                <Space key={"i" + l.id} style={{ width: "100%", justifyContent: "space-between" }}>
                  <Space>
                    <Tag color="cyan">{EVENT_LINK_LABEL[l.link_type]}</Tag>
                    <span style={{ fontSize: 12 }}>
                      {eventTitleMap.get(l.source_event_id) ?? `#${l.source_event_id}`}{" "}
                      {EVENT_LINK_ARROW[l.link_type]} 本事件
                    </span>
                  </Space>
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onRemoveLink(l.id)}
                  />
                </Space>
              ))}
              {event.links_out.length === 0 && event.links_in.length === 0 && (
                <Typography.Text type="secondary">还没有因果链</Typography.Text>
              )}
              <AddLinkInline events={otherEvents} onAdd={onAddLink} />
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function AddCharacterInline({
  characters,
  onAdd,
}: {
  characters: { id: number; name: string }[];
  onAdd: (characterId: number, role: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [role, setRole] = useState("participant");
  return (
    <Space.Compact style={{ width: "100%" }}>
      <Select
        placeholder="选择人物"
        value={selectedId}
        onChange={setSelectedId}
        showSearch
        optionFilterProp="label"
        options={characters.map((c) => ({ value: c.id, label: c.name }))}
        style={{ minWidth: 140 }}
      />
      <Select
        value={role}
        onChange={setRole}
        options={[
          { value: "initiator", label: "发起者" },
          { value: "affected", label: "受影响" },
          { value: "witness", label: "目击" },
          { value: "participant", label: "参与" },
          { value: "mentioned", label: "提及" },
        ]}
        style={{ minWidth: 100 }}
      />
      <Button
        type="primary"
        icon={<PlusOutlined />}
        disabled={!selectedId}
        onClick={() => {
          if (selectedId) onAdd(selectedId, role);
          setSelectedId(undefined);
        }}
      >
        添加
      </Button>
    </Space.Compact>
  );
}

function AddLinkInline({
  events,
  onAdd,
}: {
  events: { id: number; title: string }[];
  onAdd: (targetId: number, linkType: EventLinkKind) => void;
}) {
  const [targetId, setTargetId] = useState<number | undefined>();
  const [linkType, setLinkType] = useState<EventLinkKind>("causes");
  return (
    <Space.Compact style={{ width: "100%" }}>
      <Select
        placeholder="目标事件"
        value={targetId}
        onChange={setTargetId}
        showSearch
        optionFilterProp="label"
        options={events.map((e) => ({ value: e.id, label: e.title }))}
        style={{ minWidth: 160 }}
      />
      <Select
        value={linkType}
        onChange={(v) => setLinkType(v)}
        options={LINK_OPTIONS}
        style={{ minWidth: 100 }}
      />
      <Button
        type="primary"
        icon={<LinkOutlined />}
        disabled={!targetId}
        onClick={() => {
          if (targetId) onAdd(targetId, linkType);
          setTargetId(undefined);
        }}
      >
        添加
      </Button>
    </Space.Compact>
  );
}