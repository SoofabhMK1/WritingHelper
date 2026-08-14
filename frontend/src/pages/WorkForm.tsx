import { useEffect } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  useCreateWork,
  useUpdateWork,
  useWork,
} from "@/api/works";
import type { WorkCreate, WorkStatus, WorkUpdate } from "@/types/work";

const STATUS_OPTIONS: { value: WorkStatus; label: string }[] = [
  { value: "draft", label: "草稿" },
  { value: "writing", label: "写作中" },
  { value: "paused", label: "暂停" },
  { value: "completed", label: "已完结" },
  { value: "abandoned", label: "已弃坑" },
];

const GENRE_OPTIONS = ["玄幻", "仙侠", "都市", "历史", "科幻", "奇幻", "武侠", "悬疑", "言情", "军事", "游戏", "其他"];
const POV_OPTIONS = ["第一人称", "第三人称", "多视角", "全知视角"];
const STYLE_OPTIONS = ["热血", "轻松", "虐心", "黑暗", "诙谐", "史诗", "细腻"];

interface FormValues {
  title: string;
  subtitle?: string;
  genre?: string;
  style?: string;
  pov?: string;
  status: WorkStatus;
  target_words: number;
  description?: string;
  notes?: string;
}

export function WorkForm() {
  const { wid } = useParams<{ wid?: string }>();
  const isEditMode = !! wid;
  const widNum = isEditMode ? Number(wid) : undefined;

  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm<FormValues>();

  const fromState = (location.state as { from?: string } | null)?.from;
  const backTarget =
    fromState ?? (isEditMode && wid ? `/works/${wid}` : "/");
  const backLabel =
    backTarget === "/"
      ? "返回作品库"
      : isEditMode
        ? "返回作品详情"
        : "返回作品库";

  const { data: existing, isLoading } = useWork(widNum);
  const { mutate: create, isPending: creating } = useCreateWork();
  const { mutate: update, isPending: updating } = useUpdateWork();

  useEffect(() => {
    if (existing) {
      form.setFieldsValue({
        title: existing.title,
        subtitle: existing.subtitle ?? undefined,
        genre: existing.genre ?? undefined,
        style: existing.style ?? undefined,
        pov: existing.pov ?? undefined,
        status: existing.status,
        target_words: existing.target_words,
        description: existing.description ?? undefined,
        notes: existing.notes ?? undefined,
      });
    } else if (!isEditMode) {
      form.setFieldsValue({ status: "draft", target_words: 0 });
    }
  }, [existing, isEditMode, form]);

  function onFinish(values: FormValues) {
    const payload: WorkCreate | WorkUpdate = {
      title: values.title,
      subtitle: values.subtitle,
      genre: values.genre,
      style: values.style,
      pov: values.pov,
      status: values.status,
      target_words: values.target_words,
      description: values.description,
      notes: values.notes,
    };

    const onSuccess = () => {
      message.success(isEditMode ? "已保存" : "已创建");
      navigate("/");
    };
    const onError = (e: Error) => message.error(`操作失败: ${e.message}`);

    if (isEditMode && widNum) {
      update({ id: widNum, payload }, { onSuccess, onError });
    } else {
      create(payload as WorkCreate, { onSuccess, onError });
    }
  }

  if (isEditMode && isLoading) {
    return <Typography.Text type="secondary">加载中…</Typography.Text>;
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(backTarget)}
        >
          {backLabel}
        </Button>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {isEditMode ? "编辑作品" : "新建作品"}
        </Typography.Title>
      </Space>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark="optional"
          initialValues={{ status: "draft", target_words: 0 }}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: "请输入作品标题" }, { max: 200 }]}
          >
            <Input placeholder="例如:青云问道录" />
          </Form.Item>

          <Form.Item name="subtitle" label="副标题">
            <Input placeholder="可选" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="genre" label="题材">
                <Select allowClear options={GENRE_OPTIONS.map((v) => ({ value: v, label: v }))} placeholder="选择题材" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="pov" label="视角">
                <Select allowClear options={POV_OPTIONS.map((v) => ({ value: v, label: v }))} placeholder="选择视角" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="style" label="风格">
                <Select allowClear options={STYLE_OPTIONS.map((v) => ({ value: v, label: v }))} placeholder="选择风格" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="target_words"
                label="目标字数"
                rules={[{ required: true, type: "number", min: 0 }]}
              >
                <InputNumber<number>
                  style={{ width: "100%" }}
                  min={0}
                  step={10000}
                  formatter={(v) => `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(v) => Number((v ?? "").replace(/,/g, ""))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="简介">
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} placeholder="几句话讲清楚这部作品在写什么" />
          </Form.Item>

          <Form.Item name="notes" label="创作笔记">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder="灵感、设定提醒、给自己留的备忘…" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={creating || updating}>
                {isEditMode ? "保存" : "创建"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}