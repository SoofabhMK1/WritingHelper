import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Tag,
  Timeline,
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
import {
  useCreateState,
  useDeleteState,
  useStates,
  useUpdateState,
} from "@/api/states";
import { useCharacters } from "@/api/characters";
import { useChapters } from "@/api/chapters";
import {
  COMMON_KEYS,
  STATE_TYPE_COLOR,
  STATE_TYPE_LABEL,
  STATE_TYPE_OPTIONS,
  type CharacterState,
  type StateCreate,
  type StateTypeKind,
} from "@/types/state";
import { useNavigate } from "react-router-dom";

type ViewMode = "byCharacter" | "byChapter" | "timeline";

export function StateTracker({ workId }: { workId: number }) {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("byCharacter");
  const { data: characters = [] } = useCharacters(workId);
  const { data: chapters = [] } = useChapters(workId);
  const { data: states = [], isLoading, isError, error, refetch } = useStates(workId);
  const { mutate: create } = useCreateState(workId);
  const { mutate: update, isPending: updating } = useUpdateState(workId);
  const { mutate: remove } = useDeleteState(workId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CharacterState | null>(null);
  const [form] = Form.useForm<StateCreate>();

  function openNew(preset?: Partial<StateCreate>) {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      state_type: "status",
      ...preset,
    } as StateCreate);
    setModalOpen(true);
  }

  function openEdit(s: CharacterState) {
    setEditing(s);
    form.setFieldsValue({
      character_id: s.character_id,
      chapter_id: s.chapter_id ?? undefined,
      state_type: s.state_type,
      state_key: s.state_key,
      state_value: s.state_value,
      note: s.note ?? undefined,
      captured_at: s.captured_at ?? undefined,
    });
    setModalOpen(true);
  }

  async function onSubmit() {
    const values = await form.validateFields();
    if (editing) {
      const { character_id: _omit, ...rest } = values;
      update(
        { id: editing.id, payload: rest },
        {
          onSuccess: () => {
            message.success("已保存");
            setModalOpen(false);
          },
          onError: (e: Error) => message.error(`保存失败: ${e.message}`),
        },
      );
    } else {
      create(values, {
        onSuccess: () => {
          message.success("已新增状态");
          setModalOpen(false);
        },
        onError: (e: Error) => message.error(`创建失败: ${e.message}`),
      });
    }
  }

  function onDelete(s: CharacterState) {
    remove(s.id, {
      onSuccess: () => message.success("已删除"),
      onError: (e: Error) => message.error(`删除失败: ${e.message}`),
    });
  }

  const charMap = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);
  const chapterMap = useMemo(() => new Map(chapters.map((c) => [c.id, c])), [chapters]);

  const grouped = useMemo(() => {
    const map = new Map<number, CharacterState[]>();
    for (const s of states) {
      if (!map.has(s.character_id)) map.set(s.character_id, []);
      map.get(s.character_id)!.push(s);
    }
    return map;
  }, [states]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Space size="middle" align="center">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/works/${workId}`)}>
            返回作品详情
          </Button>
          <Typography.Title level={4} style={{ margin: 0 }}>
            状态追踪
          </Typography.Title>
        </Space>
        <Space>
          <Segmented
            value={view}
            onChange={(v) => setView(v as ViewMode)}
            options={[
              { label: "按人物", value: "byCharacter" },
              { label: "按章节", value: "byChapter" },
              { label: "时间线", value: "timeline" },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openNew()}>
            新建状态
          </Button>
        </Space>
      </div>

      {isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="加载状态失败"
          description={String(error)}
          action={<Button size="small" onClick={() => refetch()}>重试</Button>}
        />
      )}

      {isLoading ? (
        <Typography.Text type="secondary">加载中…</Typography.Text>
      ) : states.length === 0 ? (
        <Empty description="还没有任何状态记录" />
      ) : view === "byCharacter" ? (
        <ByCharacterView
          grouped={grouped}
          chapterMap={chapterMap}
          onEdit={openEdit}
          onDelete={onDelete}
          onAddForCharacter={(cid) => openNew({ character_id: cid })}
        />
      ) : view === "byChapter" ? (
        <ByChapterView
          states={states}
          charMap={charMap}
          chapterMap={chapterMap}
          onEdit={openEdit}
          onDelete={onDelete}
        />
      ) : (
        <TimelineView
          states={states}
          charMap={charMap}
          chapterMap={chapterMap}
          onEdit={openEdit}
        />
      )}

      <Modal
        title={editing ? "编辑状态" : "新建状态"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSubmit}
        okText="保存"
        cancelText="取消"
        confirmLoading={updating}
        width={640}
      >
        <StateFormFields form={form} characters={characters} chapters={chapters} />
      </Modal>
    </div>
  );
}

function StateFormFields({
  form,
  characters,
  chapters,
}: {
  form: any;
  characters: { id: number; name: string }[];
  chapters: { id: number; title: string }[];
}) {
  const stateType = Form.useWatch("state_type", form) as StateTypeKind | undefined;
  const [keyOptions, setKeyOptions] = useState<string[]>([]);

  function onTypeChange(t: StateTypeKind) {
    setKeyOptions(COMMON_KEYS[t] ?? []);
  }

  useEffect(() => {
    if (stateType) setKeyOptions(COMMON_KEYS[stateType] ?? []);
  }, [stateType]);

  return (
    <Form layout="vertical" form={form} requiredMark="optional">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="character_id" label="人物" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={characters.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="选择人物"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="chapter_id" label="归属章节(可选)">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={chapters.map((c) => ({ value: c.id, label: c.title }))}
              placeholder="散章记录"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="state_type" label="状态类型" rules={[{ required: true }]}>
            <Select options={STATE_TYPE_OPTIONS} onChange={onTypeChange} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="state_key" label="状态维度" rules={[{ required: true, max: 80 }]}>
            <AutoComplete
              options={keyOptions.map((k) => ({ value: k }))}
              placeholder="如:修为 / 位置 / 师父"
              allowClear
              filterOption={(input, option) =>
                String(option?.value ?? "").includes(input)
              }
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Form.Item name="state_value" label="当前值" rules={[{ required: true, max: 500 }]}>
            <Input placeholder="例如:金丹 / 青云山 / 玄冥" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="captured_at" label="时间(可选)">
            <Input placeholder="Day 90 / 第三章" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="note" label="备注">
        <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
      </Form.Item>

      {stateType && COMMON_KEYS[stateType]?.length > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {STATE_TYPE_LABEL[stateType]}维度示例:{COMMON_KEYS[stateType].join("、")}
        </Typography.Text>
      )}
    </Form>
  );
}

function ByCharacterView({
  grouped,
  chapterMap,
  onEdit,
  onDelete,
  onAddForCharacter,
}: {
  grouped: Map<number, CharacterState[]>;
  chapterMap: Map<number, { id: number; title: string }>;
  onEdit: (s: CharacterState) => void;
  onDelete: (s: CharacterState) => void;
  onAddForCharacter: (characterId: number) => void;
}) {
  if (grouped.size === 0) {
    return <Empty description="还没有任何状态记录" />;
  }
  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      {Array.from(grouped.entries()).map(([cid, list]) => (
        <Card
          key={cid}
          size="small"
          title={
            <Space>
              <Typography.Text type="secondary">{list.length} 条状态记录</Typography.Text>
            </Space>
          }
          extra={
            <Button size="small" icon={<PlusOutlined />} onClick={() => onAddForCharacter(cid)}>
              新增状态
            </Button>
          }
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            {list.map((s) => (
              <StateRow key={s.id} s={s} chapterMap={chapterMap} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </Space>
        </Card>
      ))}
    </Space>
  );
}

function ByChapterView({
  states,
  chapterMap,
  onEdit,
  onDelete,
}: {
  states: CharacterState[];
  charMap: Map<number, { id: number; name: string }>;
  chapterMap: Map<number, { id: number; title: string }>;
  onEdit: (s: CharacterState) => void;
  onDelete: (s: CharacterState) => void;
}) {
  const groups = new Map<string, CharacterState[]>();
  for (const s of states) {
    const key = s.chapter_id != null ? `c${s.chapter_id}` : "free";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  const orderedKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === "free") return 1;
    if (b === "free") return -1;
    return Number(a.slice(1)) - Number(b.slice(1));
  });
  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      {orderedKeys.map((k) => {
        const title =
          k === "free"
            ? "未归章节"
            : chapterMap.get(Number(k.slice(1)))?.title ?? `章节 #${k}`;
        return (
          <Card key={k} size="small" title={title}>
            <Space direction="vertical" style={{ width: "100%" }}>
              {groups.get(k)!.map((s) => (
                <StateRow key={s.id} s={s} chapterMap={chapterMap} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </Space>
          </Card>
        );
      })}
    </Space>
  );
}

function TimelineView({
  states,
  chapterMap,
  onEdit,
}: {
  states: CharacterState[];
  charMap: Map<number, { id: number; name: string }>;
  chapterMap: Map<number, { id: number; title: string }>;
  onEdit: (s: CharacterState) => void;
}) {
  const ordered = useMemo(
    () =>
      [...states].sort((a, b) => {
        const ta = a.captured_at ?? "\uffff";
        const tb = b.captured_at ?? "\uffff";
        return ta.localeCompare(tb) || a.id - b.id;
      }),
    [states],
  );
  return (
    <Timeline
      items={ordered.map((s) => ({
        key: s.id,
        color: s.state_type === "cultivation" ? "purple" : "blue",
        children: (
          <Card
            size="small"
            style={{ marginBottom: 8 }}
            onClick={() => onEdit(s)}
            hoverable
          >
            <Space>
              <Tag color={STATE_TYPE_COLOR[s.state_type]}>{STATE_TYPE_LABEL[s.state_type]}</Tag>
              <strong>{s.state_key}</strong>
              <Typography.Text strong>→ {s.state_value}</Typography.Text>
              {s.captured_at && (
                <Tag>
                  <EnvironmentOutlined /> {s.captured_at}
                </Tag>
              )}
              {s.chapter_id != null && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  @ {chapterMap.get(s.chapter_id)?.title}
                </Typography.Text>
              )}
            </Space>
            {s.note && (
              <Typography.Paragraph
                type="secondary"
                style={{ marginTop: 4, marginBottom: 0, fontSize: 12 }}
              >
                {s.note}
              </Typography.Paragraph>
            )}
          </Card>
        ),
      }))}
    />
  );
}

function StateRow({
  s,
  chapterMap,
  onEdit,
  onDelete,
}: {
  s: CharacterState;
  chapterMap?: Map<number, { id: number; title: string }>;
  onEdit: (s: CharacterState) => void;
  onDelete: (s: CharacterState) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "8px 12px",
        background: "#fafafa",
        borderRadius: 4,
        alignItems: "center",
      }}
    >
      <Tag color={STATE_TYPE_COLOR[s.state_type]}>{STATE_TYPE_LABEL[s.state_type]}</Tag>
      <Typography.Text type="secondary" style={{ minWidth: 100 }}>
        {s.state_key}
      </Typography.Text>
      <Typography.Text strong style={{ flex: 1 }}>
        {s.state_value}
      </Typography.Text>
      {s.captured_at && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          <EnvironmentOutlined /> {s.captured_at}
        </Typography.Text>
      )}
      {s.chapter_id != null && chapterMap && (
        <Tag>{chapterMap.get(s.chapter_id)?.title}</Tag>
      )}
      <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(s)} />
      <Popconfirm
        title="删除该状态记录?"
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        onConfirm={() => onDelete(s)}
      >
        <Button size="small" danger icon={<DeleteOutlined />} />
      </Popconfirm>
    </div>
  );
}