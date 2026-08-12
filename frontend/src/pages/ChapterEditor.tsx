import { useEffect } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
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
  SaveOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useChapter, useUpdateChapter, useDeleteChapter } from "@/api/chapters";
import {
  CHAPTER_STATUS_COLOR,
  CHAPTER_STATUS_LABEL,
  CHAPTER_TYPE_LABEL,
  type ChapterStatus,
  type ChapterTypeKind,
} from "@/types/chapter";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import {
  useCreateForeshadow,
  useDeleteForeshadow,
  useForeshadows,
  useUpdateForeshadow,
} from "@/api/foreshadowing";
import {
  FORESHADOW_STATUS_COLOR,
  FORESHADOW_STATUS_LABEL,
  type ForeshadowStatusKind,
} from "@/types/foreshadow";

const STATUS_OPTIONS: { value: ChapterStatus; label: string }[] = (
  Object.entries(CHAPTER_STATUS_LABEL) as [ChapterStatus, string][]
).map(([value, label]) => ({ value, label }));

const TYPE_OPTIONS: { value: ChapterTypeKind; label: string }[] = (
  Object.entries(CHAPTER_TYPE_LABEL) as [ChapterTypeKind, string][]
).map(([value, label]) => ({ value, label }));

interface FormValues {
  title: string;
  summary?: string;
  outline?: string;
  target_words: number;
  actual_words: number;
  status: ChapterStatus;
  chapter_type: ChapterTypeKind;
  mood?: string;
}

export function ChapterEditor() {
  const { wid, cid } = useParams<{ wid: string; cid: string }>();
  const workId = Number(wid);
  const chapterId = Number(cid);
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();

  const { data: chapter, isLoading, isError, error, refetch } = useChapter(workId, chapterId);
  const { mutate: update, isPending } = useUpdateChapter(workId);
  const { mutate: remove } = useDeleteChapter(workId);
  const { data: foreshadows = [] } = useForeshadows(workId);
  const { mutate: createFs } = useCreateForeshadow(workId);
  const { mutate: updateFs } = useUpdateForeshadow(workId);
  const { mutate: deleteFs } = useDeleteForeshadow(workId);

  useEffect(() => {
    if (chapter) {
      form.setFieldsValue({
        title: chapter.title,
        summary: chapter.summary ?? undefined,
        outline: chapter.outline ?? undefined,
        target_words: chapter.target_words,
        actual_words: chapter.actual_words,
        status: chapter.status,
        chapter_type: chapter.chapter_type,
        mood: chapter.mood ?? undefined,
      });
    }
  }, [chapter, form]);

  if (isLoading) return <Typography.Text type="secondary">加载中…</Typography.Text>;
  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="加载章节失败"
        description={String(error)}
        action={<Button size="small" onClick={() => refetch()}>重试</Button>}
      />
    );
  }
  if (!chapter) return <Typography.Text type="secondary">章节不存在</Typography.Text>;

  async function onSave(_html: string, plainText: string) {
    const values = await form.validateFields();
    await update(
      {
        id: chapterId,
        payload: {
          ...values,
          actual_words: plainText.length,
        },
      },
      {
        onSuccess: () => message.success("已保存", 0.8),
        onError: (e: Error) => message.error(`保存失败: ${e.message}`),
      },
    );
  }

  function onDelete() {
    remove(chapterId, {
      onSuccess: () => {
        message.success("已删除");
        navigate(`/works/${workId}/outline`);
      },
      onError: (e: Error) => message.error(`删除失败: ${e.message}`),
    });
  }

  async function onAddForeshadow(quote: string) {
    return new Promise<void>((resolve) => {
      createFs(
        {
          title: `伏笔:${quote.slice(0, 30)}`,
          quote,
          chapter_id: chapterId,
          status: "open",
        },
        {
          onSuccess: () => {
            message.success("伏笔已保存");
            resolve();
          },
          onError: (e: Error) => {
            message.error(`伏笔保存失败: ${e.message}`);
            resolve();
          },
        },
      );
    });
  }

  const chapterForeshadows = foreshadows.filter(
    (f) => f.chapter_id === chapterId || f.planted_chapter_id === chapterId
  );

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/works/${workId}/outline`)}>
          返回大纲
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {chapter.title}
        </Typography.Title>
        <Tag color={CHAPTER_STATUS_COLOR[chapter.status]}>
          {CHAPTER_STATUS_LABEL[chapter.status]}
        </Tag>
      </Space>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="正文" size="small" style={{ marginBottom: 16 }}>
            <TiptapEditor
              workId={workId}
              chapterId={chapterId}
              initialContent={chapter.content ?? ""}
              onSave={onSave}
              onAddForeshadow={onAddForeshadow}
            />
          </Card>

          <Card title="大纲与概要" size="small">
            <Form layout="vertical" form={form} requiredMark="optional">
              <Form.Item name="summary" label="概要">
                <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
              </Form.Item>
              <Form.Item name="outline" label="大纲">
                <Input.TextArea autoSize={{ minRows: 4, maxRows: 12 }} />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={isPending}
                  onClick={async () => {
                    const v = await form.validateFields();
                    update(
                      { id: chapterId, payload: v },
                      {
                        onSuccess: () => message.success("已保存"),
                        onError: (e: Error) => message.error(e.message),
                      }
                    );
                  }}
                >
                  保存大纲/概要
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="章节属性" size="small" style={{ marginBottom: 16 }}>
            <Form layout="vertical" form={form}>
              <Form.Item name="status" label="状态">
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
              <Form.Item name="chapter_type" label="类型">
                <Select options={TYPE_OPTIONS} />
              </Form.Item>
              <Form.Item name="mood" label="基调">
                <Input placeholder="如:紧张 / 温馨" />
              </Form.Item>
              <Form.Item name="target_words" label="目标字数">
                <InputNumber min={0} step={500} style={{ width: "100%" }} />
              </Form.Item>
            </Form>
          </Card>

          <Card
            title={
              <Space>
                <span>伏笔</span>
                <Tag>{chapterForeshadows.length}</Tag>
              </Space>
            }
            size="small"
            style={{ marginBottom: 16 }}
          >
            {chapterForeshadows.length === 0 ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                在正文中选中文字→点 "标记伏笔" 按钮
              </Typography.Text>
            ) : (
              <Space direction="vertical" style={{ width: "100%" }}>
                {chapterForeshadows.map((f) => (
                  <Card size="small" key={f.id} style={{ background: "#fffbe6" }}>
                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                      <Typography.Text strong>{f.title}</Typography.Text>
                      <Select
                        size="small"
                        value={f.status}
                        style={{ width: 100 }}
                        options={(
                          Object.entries(FORESHADOW_STATUS_LABEL) as [ForeshadowStatusKind, string][]
                        ).map(([v, l]) => ({ value: v, label: l }))}
                        onChange={(status) =>
                          updateFs({ id: f.id, payload: { status } })
                        }
                        tagRender={({ value }) => (
                          <Tag color={FORESHADOW_STATUS_COLOR[value as ForeshadowStatusKind]}>
                            {FORESHADOW_STATUS_LABEL[value as ForeshadowStatusKind]}
                          </Tag>
                        )}
                      />
                    </Space>
                    {f.quote && (
                      <Typography.Paragraph
                        type="secondary"
                        style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}
                        ellipsis={{ rows: 2 }}
                      >
                        "{f.quote}"
                      </Typography.Paragraph>
                    )}
                    <Popconfirm
                      title="删除该伏笔?"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => deleteFs(f.id)}
                    >
                      <Button size="small" danger type="text" icon={<DeleteOutlined />} style={{ marginTop: 4 }}>
                        删除
                      </Button>
                    </Popconfirm>
                  </Card>
                ))}
              </Space>
            )}
          </Card>

          <Card title="危险操作" size="small">
            <Popconfirm
              title="删除该章节?"
              description="将无法恢复"
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={onDelete}
            >
              <Button danger icon={<DeleteOutlined />} block>
                删除章节
              </Button>
            </Popconfirm>
          </Card>
        </Col>
      </Row>
    </div>
  );
}