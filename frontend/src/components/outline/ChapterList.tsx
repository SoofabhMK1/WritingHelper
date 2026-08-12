import type { Volume, Chapter } from "@/types";
import {
  CHAPTER_STATUS_COLOR,
  CHAPTER_STATUS_LABEL,
  CHAPTER_TYPE_LABEL,
} from "@/types/chapter";
import { VOLUME_STATUS_COLOR, VOLUME_STATUS_LABEL } from "@/types/volume";
import { Button, Card, Popconfirm, Space, Tag, Tooltip, Typography } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";

interface Props {
  workId: number;
  volume: Volume | null;
  chapters: Chapter[];
  onEditVolume?: () => void;
  onDeleteVolume?: () => void;
  onAIVolume?: () => void;
  onAddChapter: () => void;
  onAIChapter: (c: Chapter) => void;
  onMoveChapter: (c: Chapter, dir: -1 | 1) => void;
  onDeleteChapter: (c: Chapter) => void;
}

export function ChapterList({
  workId,
  volume,
  chapters,
  onEditVolume,
  onDeleteVolume,
  onAIVolume,
  onAddChapter,
  onAIChapter,
  onMoveChapter,
  onDeleteChapter,
}: Props) {
  return (
    <Card
      size="small"
      title={
        volume ? (
          <Space>
            <strong>{volume.title}</strong>
            <Tag color={VOLUME_STATUS_COLOR[volume.status]}>
              {VOLUME_STATUS_LABEL[volume.status]}
            </Tag>
            <Typography.Text type="secondary">
              目标 {volume.target_words.toLocaleString()} 字 · {chapters.length} 章
            </Typography.Text>
          </Space>
        ) : (
          <Space>
            <strong>散章</strong>
            <Typography.Text type="secondary">未归入任何卷</Typography.Text>
          </Space>
        )
      }
      extra={
        <Space>
          {volume && onAIVolume && (
            <Tooltip title="AI 生成卷章节">
              <Button size="small" icon={<RobotOutlined />} onClick={onAIVolume}>
                AI 生成
              </Button>
            </Tooltip>
          )}
          {volume && onEditVolume && (
            <Button size="small" icon={<EditOutlined />} onClick={onEditVolume} />
          )}
          {volume && onDeleteVolume && (
            <Popconfirm
              title="删除该卷?"
              description="其下章节也会一并删除。"
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={onDeleteVolume}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={onAddChapter}>
            章节
          </Button>
        </Space>
      }
    >
      {volume?.summary && (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          {volume.summary}
        </Typography.Paragraph>
      )}
      {chapters.length === 0 ? (
        <Typography.Text type="secondary">暂无章节</Typography.Text>
      ) : (
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          {chapters.map((c, idx) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "#fafafa",
                borderRadius: 4,
              }}
            >
              <Typography.Text type="secondary" style={{ minWidth: 32 }}>
                {idx + 1}.
              </Typography.Text>
              <Link to={`/works/${workId}/chapters/${c.id}`} style={{ flex: 1 }}>
                {c.title}
              </Link>
              <Tag>{CHAPTER_TYPE_LABEL[c.chapter_type]}</Tag>
              <Tag color={CHAPTER_STATUS_COLOR[c.status]}>
                {CHAPTER_STATUS_LABEL[c.status]}
              </Tag>
              <Typography.Text type="secondary" style={{ minWidth: 100, textAlign: "right" }}>
                {c.actual_words.toLocaleString()} / {c.target_words.toLocaleString()}
              </Typography.Text>
              <Space.Compact>
                <Button
                  size="small"
                  icon={<ArrowUpOutlined />}
                  disabled={idx === 0}
                  onClick={() => onMoveChapter(c, -1)}
                />
                <Button
                  size="small"
                  icon={<ArrowDownOutlined />}
                  disabled={idx === chapters.length - 1}
                  onClick={() => onMoveChapter(c, 1)}
                />
              </Space.Compact>
              <Tooltip title="AI 辅助">
                <Button size="small" icon={<RobotOutlined />} onClick={() => onAIChapter(c)} />
              </Tooltip>
              <Popconfirm
                title="删除该章节?"
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={() => onDeleteChapter(c)}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </div>
          ))}
        </Space>
      )}
    </Card>
  );
}