import { useEffect } from "react";
import {
  Button,
  Card,
  Col,
  Collapse,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Slider,
  Space,
  Switch,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useCreateWork, useUpdateWork, useWork } from "@/api/works";
import {
  ERA_PRESETS,
  LENGTH_TYPE_OPTIONS,
  MOOD_PRESETS,
  STAGE_OPTIONS,
  type WorkCreate,
  type WorkFormValues,
  type WorkStatus,
} from "@/types/work";
import { CreationAssistant } from "@/components/work/CreationAssistant";

const STATUS_OPTIONS: { value: WorkStatus; label: string }[] = [
  { value: "draft", label: "草稿" },
  { value: "writing", label: "写作中" },
  { value: "paused", label: "暂停" },
  { value: "completed", label: "已完结" },
  { value: "abandoned", label: "已弃坑" },
];

const GENRE_OPTIONS = [
  "玄幻",
  "仙侠",
  "都市",
  "历史",
  "科幻",
  "奇幻",
  "武侠",
  "悬疑",
  "言情",
  "军事",
  "游戏",
  "其他",
];
const POV_OPTIONS = ["第一人称", "第三人称", "多视角", "全知视角"];
const STYLE_OPTIONS = ["热血", "轻松", "虐心", "黑暗", "诙谐", "史诗", "细腻"];

const OTHER_ERA = "其他";
const DEFAULT_TITLE = "暂未命名";

function StyleSlider({
  label,
  left,
  right,
  value,
  onChange,
}: {
  label: string;
  left: string;
  right: string;
  value?: number | null;
  onChange?: (v: number | null) => void;
}) {
  const enabled = value != null;
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography.Text>{label}</Typography.Text>
        <Switch
          size="small"
          checked={enabled}
          aria-label={`设置${label}`}
          onChange={(c) => onChange?.(c ? 5 : null)}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Typography.Text
          type="secondary"
          style={{ fontSize: 12, flexShrink: 0 }}
        >
          {left}
        </Typography.Text>
        <Slider
          style={{ flex: 1 }}
          min={1}
          max={10}
          disabled={!enabled}
          value={value ?? 5}
          onChange={(v) => onChange?.(v)}
        />
        <Typography.Text
          type="secondary"
          style={{ fontSize: 12, flexShrink: 0 }}
        >
          {right}
        </Typography.Text>
      </div>
    </div>
  );
}

function buildPayload(values: WorkFormValues): WorkCreate {
  const era =
    values.era === OTHER_ERA
      ? values.era_custom?.trim() || null
      : (values.era ?? null);
  return {
    title: values.title?.trim() || DEFAULT_TITLE,
    subtitle: values.subtitle?.trim() || null,
    genre: values.genre ?? null,
    style: values.style ?? null,
    pov: values.pov ?? null,
    status: values.status ?? "draft",
    target_words: values.target_words ?? 0,
    description: values.description?.trim() || null,
    notes: values.notes?.trim() || null,
    cover: values.cover?.trim() || null,
    story_seed: values.story_seed?.trim() || null,
    core_conflict: values.core_conflict?.trim() || null,
    protagonist_goal: values.protagonist_goal?.trim() || null,
    themes: values.themes?.length ? values.themes : null,
    era,
    setting: values.setting?.trim() || null,
    world_rules: values.world_rules?.trim() || null,
    pace: values.pace ?? null,
    realism: values.realism ?? null,
    prose: values.prose ?? null,
    moods: values.moods?.length ? values.moods : null,
    length_type: values.length_type ?? null,
    stage: values.stage ?? null,
  };
}

export function WorkForm() {
  const { wid } = useParams<{ wid?: string }>();
  const isEditMode = !!wid;
  const widNum = isEditMode ? Number(wid) : undefined;

  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm<WorkFormValues>();

  const fromState = (location.state as { from?: string } | null)?.from;
  const backTarget = fromState ?? (isEditMode && wid ? `/works/${wid}` : "/");
  const backLabel =
    backTarget === "/"
      ? "返回作品库"
      : isEditMode
        ? "返回作品详情"
        : "返回作品库";

  const { data: existing, isLoading } = useWork(widNum);
  const { mutate: create, isPending: creating } = useCreateWork();
  const { mutate: update, isPending: updating } = useUpdateWork();

  const era = Form.useWatch("era", form);
  const lengthType = Form.useWatch("length_type", form);
  const stage = Form.useWatch("stage", form);

  useEffect(() => {
    if (existing) {
      const eraIsPreset =
        !!existing.era &&
        (ERA_PRESETS as readonly string[]).includes(existing.era);
      form.setFieldsValue({
        title: existing.title,
        subtitle: existing.subtitle ?? undefined,
        genre: existing.genre ?? undefined,
        style: existing.style ?? undefined,
        pov: existing.pov ?? undefined,
        status: existing.status,
        target_words: existing.target_words || undefined,
        description: existing.description ?? undefined,
        notes: existing.notes ?? undefined,
        cover: existing.cover ?? undefined,
        story_seed: existing.story_seed ?? undefined,
        core_conflict: existing.core_conflict ?? undefined,
        protagonist_goal: existing.protagonist_goal ?? undefined,
        themes: existing.themes ?? undefined,
        era: eraIsPreset ? existing.era! : existing.era ? OTHER_ERA : undefined,
        era_custom: eraIsPreset || !existing.era ? undefined : existing.era,
        setting: existing.setting ?? undefined,
        world_rules: existing.world_rules ?? undefined,
        pace: existing.pace ?? null,
        realism: existing.realism ?? null,
        prose: existing.prose ?? null,
        moods: existing.moods ?? undefined,
        length_type: existing.length_type ?? undefined,
        stage: existing.stage ?? undefined,
      });
    } else if (!isEditMode) {
      form.setFieldsValue({ status: "draft" });
    }
  }, [existing, isEditMode, form]);

  function onFinish(values: WorkFormValues) {
    const payload = buildPayload(values);

    const onError = (e: Error) => message.error(`操作失败: ${e.message}`);

    if (isEditMode && widNum) {
      update(
        { id: widNum, payload },
        {
          onSuccess: () => {
            message.success("已保存");
            navigate(`/works/${widNum}`);
          },
          onError,
        },
      );
    } else {
      create(payload, {
        onSuccess: (data) => {
          message.success("已创建");
          navigate(`/works/${data.id}`);
        },
        onError,
      });
    }
  }

  if (isEditMode && isLoading) {
    return <Typography.Text type="secondary">加载中…</Typography.Text>;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Space wrap>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(backTarget)}
          >
            {backLabel}
          </Button>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {isEditMode ? "编辑作品" : "创建作品"}
          </Typography.Title>
        </Space>
        <Button
          type="primary"
          loading={creating || updating}
          onClick={() => form.submit()}
        >
          {isEditMode ? "保存" : "创建作品"}
        </Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
        initialValues={{
          status: "draft",
          pace: null,
          realism: null,
          prose: null,
        }}
      >
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Card title="基础信息" size="small">
                <Form.Item
                  name="title"
                  label="作品名称"
                  rules={[{ max: 200 }]}
                  extra="暂时没有想到名字也没关系,可以留空,之后随时修改。"
                >
                  <Input placeholder={DEFAULT_TITLE} allowClear />
                </Form.Item>
                <Form.Item
                  name="story_seed"
                  label="一句话故事"
                  extra="不用完整,可以只是一个模糊的想法。"
                >
                  <Input.TextArea
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    placeholder="例如:一个年轻干部来到偏远山区,试图改变当地,却发现这里存在一个秘密控制网络。"
                  />
                </Form.Item>
                <Form.Item
                  name="description"
                  label="作品简介 / 创作想法"
                  extra="想到什么写什么:人物、剧情、片段、世界观、灵感、故事冲突……"
                >
                  <Input.TextArea
                    autoSize={{ minRows: 6, maxRows: 14 }}
                    placeholder="你现在已经想到的任何东西"
                  />
                </Form.Item>
              </Card>

              <Card title="故事核心" size="small">
                <Form.Item name="core_conflict" label="核心冲突">
                  <Input.TextArea
                    autoSize={{ minRows: 2, maxRows: 5 }}
                    placeholder="例如:一个理想主义者试图改变一个地方,却逐渐发现自己面对的敌人拥有普通人无法理解的力量。"
                  />
                </Form.Item>
                <Form.Item name="protagonist_goal" label="主角最初想要什么?">
                  <Input.TextArea
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    placeholder="例如:升职 / 改变家乡 / 查明真相 / 获得自由"
                  />
                </Form.Item>
                <Form.Item name="themes" label="核心主题">
                  <Select
                    mode="tags"
                    allowClear
                    placeholder="输入后回车添加,例如:权力、人性、成长"
                    tokenSeparators={[",", "，", " "]}
                  />
                </Form.Item>
              </Card>

              <Card title="世界与背景" size="small">
                <Form.Item name="era" label="故事时代">
                  <Radio.Group
                    options={[
                      ...ERA_PRESETS.map((v) => ({ value: v, label: v })),
                      { value: OTHER_ERA, label: OTHER_ERA },
                    ]}
                  />
                </Form.Item>
                {era === OTHER_ERA && (
                  <Form.Item name="era_custom" label="自定义时代">
                    <Input placeholder="例如:蒸汽朋克时代" allowClear />
                  </Form.Item>
                )}
                <Form.Item name="setting" label="故事地点 / 世界">
                  <Input.TextArea
                    autoSize={{ minRows: 2, maxRows: 5 }}
                    placeholder="故事发生在哪里?例如:虚构的现代中国山区县城。"
                  />
                </Form.Item>
                <Form.Item name="world_rules" label="世界观与特殊规则">
                  <Input.TextArea
                    autoSize={{ minRows: 3, maxRows: 8 }}
                    placeholder="例如:整体世界基本现实。只有极少数人拥有特殊能力,普通公众并不知道这些能力的存在。"
                  />
                </Form.Item>
              </Card>

              <Card title="创作风格" size="small">
                <Form.Item name="pace" noStyle>
                  <StyleSlider label="节奏" left="慢" right="快" />
                </Form.Item>
                <Form.Item name="realism" noStyle>
                  <StyleSlider label="现实程度" left="现实主义" right="奇幻" />
                </Form.Item>
                <Form.Item name="prose" noStyle>
                  <StyleSlider label="文风" left="朴素" right="华丽" />
                </Form.Item>
                <Form.Item
                  name="moods"
                  label="故事氛围"
                  style={{ marginTop: 12 }}
                >
                  <Select
                    mode="tags"
                    allowClear
                    options={MOOD_PRESETS}
                    placeholder="选择或输入自定义氛围"
                    tokenSeparators={[",", "，", " "]}
                  />
                </Form.Item>
              </Card>

              <Card title="创作规划" size="small">
                <Form.Item label="预计篇幅" style={{ marginBottom: 8 }}>
                  <Space wrap>
                    <Form.Item name="length_type" noStyle>
                      <Radio.Group options={LENGTH_TYPE_OPTIONS} />
                    </Form.Item>
                    {lengthType && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() =>
                          form.setFieldValue("length_type", undefined)
                        }
                      >
                        清除
                      </Button>
                    )}
                  </Space>
                </Form.Item>
                <Form.Item name="target_words" label="预计字数">
                  <InputNumber<number>
                    style={{ width: 240 }}
                    min={0}
                    step={10000}
                    placeholder="可选"
                    formatter={(v) =>
                      `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(v) => Number((v ?? "").replace(/,/g, ""))}
                  />
                </Form.Item>
                <Form.Item label="当前创作阶段" style={{ marginBottom: 0 }}>
                  <Space wrap>
                    <Form.Item name="stage" noStyle>
                      <Radio.Group options={STAGE_OPTIONS} />
                    </Form.Item>
                    {stage && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => form.setFieldValue("stage", undefined)}
                      >
                        清除
                      </Button>
                    )}
                  </Space>
                </Form.Item>
              </Card>

              {isEditMode && (
                <Collapse
                  size="small"
                  items={[
                    {
                      key: "legacy",
                      label: "其他设置(副标题 / 题材 / 视角 / 状态 等)",
                      children: (
                        <>
                          <Form.Item name="subtitle" label="副标题">
                            <Input placeholder="可选" allowClear />
                          </Form.Item>
                          <Row gutter={16}>
                            <Col span={8}>
                              <Form.Item name="genre" label="题材">
                                <Select
                                  allowClear
                                  options={GENRE_OPTIONS.map((v) => ({
                                    value: v,
                                    label: v,
                                  }))}
                                  placeholder="选择题材"
                                />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item name="pov" label="视角">
                                <Select
                                  allowClear
                                  options={POV_OPTIONS.map((v) => ({
                                    value: v,
                                    label: v,
                                  }))}
                                  placeholder="选择视角"
                                />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item name="style" label="风格">
                                <Select
                                  allowClear
                                  options={STYLE_OPTIONS.map((v) => ({
                                    value: v,
                                    label: v,
                                  }))}
                                  placeholder="选择风格"
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item name="status" label="状态">
                                <Select options={STATUS_OPTIONS} />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item name="cover" label="封面 URL">
                                <Input placeholder="可选" allowClear />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Form.Item
                            name="notes"
                            label="创作笔记"
                            style={{ marginBottom: 0 }}
                          >
                            <Input.TextArea
                              autoSize={{ minRows: 2, maxRows: 6 }}
                              placeholder="灵感、设定提醒、给自己留的备忘…"
                            />
                          </Form.Item>
                        </>
                      ),
                    },
                  ]}
                />
              )}
            </Space>
          </Col>

          <Col xs={24} lg={8}>
            <CreationAssistant form={form} workId={widNum} />
          </Col>
        </Row>
      </Form>
    </div>
  );
}
