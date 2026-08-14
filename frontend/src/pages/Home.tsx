import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Popconfirm,
  Progress,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useDeleteWork, useWorks } from "@/api/works";
import { STATUS_COLOR, STATUS_LABEL, type Work } from "@/types/work";

const { Title, Paragraph } = Typography;

function WorkCard({
  work,
  onOpen,
  onEdit,
  onDelete,
}: {
  work: Work;
  onOpen: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const pct =
    work.target_words > 0
      ? Math.min(100, Math.round((work.current_words / work.target_words) * 100))
      : 0;

  function handleCardKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(work.id);
    }
  }

  return (
    <Card
      hoverable
      role="button"
      tabIndex={0}
      onClick={() => onOpen(work.id)}
      onKeyDown={handleCardKeyDown}
      style={{ cursor: "pointer" }}
      title={
        <Space>
          <span>{work.title}</span>
          <Tag color={STATUS_COLOR[work.status]}>{STATUS_LABEL[work.status]}</Tag>
          {work.genre && <Tag>{work.genre}</Tag>}
        </Space>
      }
      extra={
        <Space onClick={(e) => e.stopPropagation()}>
          <Button
            type="text"
            aria-label="编辑作品"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(work.id);
            }}
          />
          <Popconfirm
            title="确认删除这部作品?"
            description="将同时删除所有大纲、章节、人物等数据。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(work.id)}
          >
            <Button
              type="text"
              danger
              aria-label="删除作品"
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      }
    >
      {work.subtitle && (
        <Typography.Text type="secondary" italic>
          {work.subtitle}
        </Typography.Text>
      )}
      <Paragraph
        ellipsis={{ rows: 2, expandable: false }}
        style={{ marginTop: 8, marginBottom: 8, minHeight: 44 }}
      >
        {work.description || "暂无简介"}
      </Paragraph>
      <div className="work-card-stat">
        <span>{work.pov || "未设 POV"} · 风格 {work.style || "—"}</span>
        <span>
          {work.current_words.toLocaleString()} / {work.target_words.toLocaleString()} 字
        </span>
      </div>
      <div className="work-card-progress">
        <Progress percent={pct} size="small" showInfo={false} />
      </div>
    </Card>
  );
}

export function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data: works = [], isLoading, isError, error, refetch } = useWorks(q || undefined);
  const { mutate: deleteWork } = useDeleteWork();

  const stats = useMemo(() => {
    const total = works.length;
    const writing = works.filter((w) => w.status === "writing").length;
    const words = works.reduce((acc, w) => acc + w.current_words, 0);
    return { total, writing, words };
  }, [works]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>作品库</Title>
        <Space size="large">
          <Typography.Text type="secondary">共 {stats.total} 部 · 写作中 {stats.writing} · 累计 {stats.words.toLocaleString()} 字</Typography.Text>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/works/new")}>
            新建作品
          </Button>
        </Space>
      </div>

      {isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="无法连接到后端服务"
          description={
            <>
              请求 <code>/api/v1/works</code> 失败:{String(error)}
              <br />
              请确认后端服务已启动 (<code>cd backend &amp;&amp; uvicorn app.main:app --port 8000</code>)。
            </>
          }
          action={<Button size="small" onClick={() => refetch()}>重试</Button>}
        />
      )}

      <Input
        prefix={<SearchOutlined />}
        placeholder="搜索作品标题"
        allowClear
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ maxWidth: 360, marginBottom: 16 }}
      />

      {isLoading ? (
        <div className="empty-state">加载中…</div>
      ) : works.length === 0 ? (
        <Empty description="还没有作品,点击右上角“新建作品”开始你的创作" />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {works.map((w) => (
            <WorkCard
              key={w.id}
              work={w}
              onOpen={(id) => navigate(`/works/${id}`)}
              onEdit={(id) => navigate(`/works/${id}/edit`, { state: { from: "/" } })}
              onDelete={(id) =>
                deleteWork(id, {
                  onSuccess: () => message.success("已删除"),
                  onError: (e) => message.error(`删除失败: ${e.message}`),
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}