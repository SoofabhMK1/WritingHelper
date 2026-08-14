import { useEffect, useMemo } from "react";
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
  ArrowRightOutlined,
  DeleteOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import {
  useChapter,
  useChapters,
  useUpdateChapter,
  useDeleteChapter,
} from "@/api/chapters";
import { useVolumes } from "@/api/volumes";
import {
  CHAPTER_STATUS_COLOR,
  CHAPTER_STATUS_LABEL,
  CHAPTER_TYPE_LABEL,
  type Chapter,
  type ChapterStatus,
  type ChapterTypeKind,
} from "@/types/chapter";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";

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
  const { data: allChapters = [] } = useChapters(workId);
  const { data: allVolumes = [] } = useVolumes(workId);
  const { mutate: update, isPending } = useUpdateChapter(workId);
  const { mutate: remove } = useDeleteChapter(workId);

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

  // Flat ordered list of all chapters in the work (volume order, then free
  // chapters last). Used to compute prev/next navigation.
  const flatChapters = useMemo(() => {
    const byVolume = new Map<number | null, Chapter[]>();
    for (const c of allChapters) {
      const k = c.volume_id ?? null;
      if (!byVolume.has(k)) byVolume.set(k, []);
      byVolume.get(k)!.push(c);
    }
    for (const arr of byVolume.values()) {
      arr.sort((a, b) => a.order_num - b.order_num);
    }
    const groupOrder: (number | null)[] = [
      ...allVolumes
        .slice()
        .sort((a, b) => a.order_num - b.order_num)
        .map((v) => v.id),
    ];
    if (byVolume.has(null)) groupOrder.push(null);
    return groupOrder.flatMap((k) => byVolume.get(k) ?? []);
  }, [allChapters, allVolumes]);

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

  async function onSave(_markdown: string, plainText: string) {
    let values;
    try {
      values = await form.validateFields();
    } catch (err) {
      // Surface validation error so the user knows to fix the side panel.
      message.warning("请先在右侧填写完整的章节属性(标题、字数等)");
      throw err;
    }
    await update(
      {
        id: chapterId,
        payload: {
          ...values,
          content: _markdown,
          actual_words: plainText.length,
        },
      },
      {
        onSuccess: () => message.success("已保存", 0.8),
        onError: (e: Error) => {
          message.error(`保存失败: ${e.message}`);
          throw e;
        },
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

  // Derived from flatChapters (already memoized above the early returns).
  const currentIndex = flatChapters.findIndex((c) => c.id === chapterId);
  const prevChapter = currentIndex > 0 ? flatChapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < flatChapters.length - 1
      ? flatChapters[currentIndex + 1]
      : null;

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/works/${workId}/outline`)}>
          返回大纲
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {chapter.title}
        </Typography.Title>
        <Tag color={CHAPTER_STATUS_COLOR[chapter.status]}>
          {CHAPTER_STATUS_LABEL[chapter.status]}
        </Tag>
        <span style={{ flex: 1 }} />
        <Button
          icon={<ArrowLeftOutlined />}
          disabled={!prevChapter}
          onClick={() =>
            prevChapter &&
            navigate(`/works/${workId}/chapters/${prevChapter.id}`)
          }
          title={prevChapter?.title}
        >
          上一章
        </Button>
        <Button
          icon={<ArrowRightOutlined />}
          disabled={!nextChapter}
          onClick={() =>
            nextChapter &&
            navigate(`/works/${workId}/chapters/${nextChapter.id}`)
          }
          title={nextChapter?.title}
        >
          下一章
        </Button>
      </Space>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="正文" size="small" style={{ marginBottom: 16 }}>
            <MarkdownEditor
              workId={workId}
              chapterId={chapterId}
              initialContent={chapter.content ?? ""}
              onSave={onSave}
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
                  disabled={isPending}
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