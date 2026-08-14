import { Alert, Button, Card, Col, Descriptions, Empty, Progress, Row, Space, Tag, Typography } from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  PartitionOutlined,
  FileTextOutlined,
  UserOutlined,
  AlertOutlined,
  ExperimentOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useWork } from "@/api/works";
import { useAIStatus } from "@/api/settings";
import { useChapters } from "@/api/chapters";
import { STATUS_COLOR, STATUS_LABEL } from "@/types/work";

export function WorkOverview() {
  const { wid } = useParams<{ wid: string }>();
  const id = Number(wid);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: work, isLoading, isError, error, refetch } = useWork(id);
  const { data: aiStatus } = useAIStatus();
  const { data: chapters = [] } = useChapters(id);

  function openMostRecentChapter() {
    if (chapters.length === 0) {
      navigate(`/works/${id}/outline`);
      return;
    }
    const sorted = [...chapters].sort(
      (a, b) => +new Date(b.updated_at) - +new Date(a.updated_at),
    );
    navigate(`/works/${id}/chapters/${sorted[0].id}`);
  }

  if (isLoading) return <Typography.Text type="secondary">加载中…</Typography.Text>;
  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="加载作品失败"
        description={String(error)}
        action={<Button size="small" onClick={() => refetch()}>重试</Button>}
      />
    );
  }
  if (!work) return <Empty description="作品不存在或已删除" />;

  const pct =
    work.target_words > 0
      ? Math.min(100, Math.round((work.current_words / work.target_words) * 100))
      : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Space size="middle">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/")}>
            返回作品库
          </Button>
          <Typography.Title level={3} style={{ margin: 0 }}>{work.title}</Typography.Title>
          <Tag color={STATUS_COLOR[work.status]}>{STATUS_LABEL[work.status]}</Tag>
          {work.genre && <Tag color="purple">{work.genre}</Tag>}
          {work.style && <Tag>{work.style}</Tag>}
          {aiStatus && !aiStatus.configured && (
            <Tag color="orange" icon={<SettingOutlined />}>
              AI 未配置
            </Tag>
          )}
        </Space>
        <Space>
          <Button icon={<EditOutlined />} onClick={() => navigate(`/works/${work.id}/edit`, { state: { from: location.pathname } })}>
            编辑
          </Button>
        </Space>
      </div>

      <Card>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="副标题">{work.subtitle || "—"}</Descriptions.Item>
          <Descriptions.Item label="视角">{work.pov || "—"}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{new Date(work.created_at).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{new Date(work.updated_at).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="目标字数">{work.target_words.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="当前字数">{work.current_words.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="简介" span={2}>
            {work.description || <span style={{ color: "#999" }}>未填写</span>}
          </Descriptions.Item>
          <Descriptions.Item label="创作笔记" span={2}>
            {work.notes || <span style={{ color: "#999" }}>无</span>}
          </Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: 16 }}>
          <Typography.Text type="secondary">总进度</Typography.Text>
          <Progress percent={pct} />
        </div>
      </Card>

      <Card title="下一步" style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card hoverable onClick={() => navigate(`/works/${work.id}/outline`)}>
              <Space direction="vertical">
                <PartitionOutlined style={{ fontSize: 24 }} />
                <strong>大纲规划</strong>
                <Typography.Text type="secondary">搭建卷/章结构</Typography.Text>
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card hoverable onClick={() => navigate(`/works/${work.id}/characters`)}>
              <Space direction="vertical">
                <UserOutlined style={{ fontSize: 24 }} />
                <strong>人物</strong>
                <Typography.Text type="secondary">角色与主角设定</Typography.Text>
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card hoverable onClick={() => navigate(`/works/${work.id}/events`)}>
              <Space direction="vertical">
                <AlertOutlined style={{ fontSize: 24 }} />
                <strong>事件</strong>
                <Typography.Text type="secondary">追踪事件与因果</Typography.Text>
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card hoverable onClick={() => navigate(`/works/${work.id}/states`)}>
              <Space direction="vertical">
                <ExperimentOutlined style={{ fontSize: 24 }} />
                <strong>状态追踪</strong>
                <Typography.Text type="secondary">人物 KV 状态变化</Typography.Text>
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card hoverable onClick={openMostRecentChapter}>
              <Space direction="vertical">
                <FileTextOutlined style={{ fontSize: 24 }} />
                <strong>章节写作</strong>
                <Typography.Text type="secondary">
                  {chapters.length === 0
                    ? "尚无章节,先去大纲新建"
                    : "打开最近编辑的章节"}
                </Typography.Text>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
}