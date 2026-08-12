import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExperimentOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useAIStatus } from "@/api/settings";
import {
  type CharacterSuggestion,
  type ChapterItem,
  type ConsistencyIssue,
  type ConsistencyResult,
  type EventSuggestion,
  useAIChat,
  useCheckConsistency,
  useSuggestCharacter,
  useSuggestChapters,
  useSuggestEvent,
  useSuggestOutline,
  type OutlineVolume,
} from "@/api/ai";
import type { Chapter, Volume } from "@/types";

export type AIDrawerTarget =
  | { kind: "volume"; workId: number; volume: Volume }
  | { kind: "chapter"; workId: number; chapter: Chapter }
  | null;

export function AIDrawer({
  target,
  onClose,
}: {
  target: AIDrawerTarget;
  onClose: () => void;
}) {
  const { data: aiStatus } = useAIStatus();
  const configured = aiStatus?.configured ?? false;

  if (!target) return null;
  const title =
    target.kind === "volume"
      ? `AI 辅助 — ${target.volume.title}`
      : `AI 辅助 — ${target.chapter.title}`;

  return (
    <div
      style={{
        position: "fixed",
        top: 64,
        right: 0,
        bottom: 0,
        width: 420,
        background: "#fff",
        borderLeft: "1px solid #eee",
        boxShadow: "-2px 0 8px rgba(0,0,0,0.05)",
        padding: 16,
        overflowY: "auto",
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <strong>{title}</strong>
        <a onClick={onClose} style={{ cursor: "pointer" }}>
          关闭
        </a>
      </div>

      {!configured && (
        <Alert
          type="warning"
          showIcon
          icon={<CloseCircleOutlined />}
          message="AI 尚未配置"
          description={
            <span>
              请先到<Link to="/settings" style={{ marginLeft: 4 }}>设置</Link>填写 API Key / Base URL / 模型。
              <br />
              当前状态:{aiStatus ? `model=${aiStatus.model}, base_url=${aiStatus.base_url}` : "加载中"}
            </span>
          }
          style={{ marginBottom: 12 }}
        />
      )}

      {configured && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message={`AI 已就绪 (${aiStatus?.model})`}
          style={{ marginBottom: 12 }}
        />
      )}

      {target.kind === "volume" && <VolumePanel workId={target.workId} />}
      {target.kind === "chapter" && <ChapterPanel workId={target.workId} chapter={target.chapter} />}
    </div>
  );
}

function VolumePanel({ workId }: { workId: number }) {
  const [volumes, setVolumes] = useState<OutlineVolume[] | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[] | null>(null);
  const { mutate: genOutline, isPending: loadingOutline } = useSuggestOutline(workId);
  const { mutate: genChapters, isPending: loadingChapters } = useSuggestChapters(workId);

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Card
        size="small"
        title={
          <Space>
            <ExperimentOutlined />
            生成卷大纲
          </Space>
        }
      >
        <Form
          layout="vertical"
          initialValues={{ volume_count: 3 }}
          onFinish={(v) =>
            genOutline(
              { volume_count: Number(v.volume_count), target_words: Number(v.target_words) || undefined },
              {
                onSuccess: (d) => setVolumes(d.volumes),
                onError: (e: Error) => message.error(e.message),
              }
            )
          }
        >
          <Form.Item name="volume_count" label="卷数" rules={[{ required: true }]}>
            <InputNumber min={1} max={10} style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="target_words" label="总字数(可选)">
            <InputNumber min={0} step={100000} style={{ width: 200 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loadingOutline} icon={<ExperimentOutlined />}>
            生成
          </Button>
        </Form>

        {volumes && (
          <div style={{ marginTop: 12 }}>
            <Typography.Text type="secondary">
              {volumes.length} 个建议(不会自动写入数据库,请手动采纳)
            </Typography.Text>
            {volumes.map((v, i) => (
              <Card size="small" key={i} style={{ marginTop: 8 }}>
                <strong>{v.title}</strong>
                <Tag style={{ marginLeft: 8 }}>{v.target_words?.toLocaleString() ?? "—"} 字</Tag>
                <Typography.Paragraph
                  type="secondary"
                  style={{ marginTop: 6, marginBottom: 0, fontSize: 12 }}
                >
                  {v.summary}
                </Typography.Paragraph>
              </Card>
            ))}
            <Button
              size="small"
              style={{ marginTop: 8 }}
              onClick={() => setVolumes(null)}
              icon={<ReloadOutlined />}
            >
              重新生成
            </Button>
          </div>
        )}
      </Card>

      <Card
        size="small"
        title={
          <Space>
            <ExperimentOutlined />
            生成章节列表
          </Space>
        }
      >
        <Form
          layout="vertical"
          initialValues={{ target_chapter_count: 10 }}
          onFinish={(v) =>
            genChapters(
              {
                volume_id: Number(v.volume_id),
                target_chapter_count: Number(v.target_chapter_count),
              },
              {
                onSuccess: (d) => setChapters(d.chapters),
                onError: (e: Error) => message.error(e.message),
              }
            )
          }
        >
          <Form.Item
            name="volume_id"
            label="归属卷 ID"
            tooltip="打开大纲页查看卷 ID(在浏览器地址栏)"
            rules={[{ required: true, type: "number" }]}
          >
            <InputNumber min={1} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="target_chapter_count" label="章节数" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} style={{ width: 120 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loadingChapters}>
            生成
          </Button>
        </Form>
        {chapters && (
          <div style={{ marginTop: 12 }}>
            <Typography.Text type="secondary">{chapters.length} 个建议</Typography.Text>
            {chapters.map((c, i) => (
              <Card size="small" key={i} style={{ marginTop: 8 }}>
                <strong>{c.title}</strong>
                {c.chapter_type && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {c.chapter_type}
                  </Tag>
                )}
                <Typography.Paragraph
                  type="secondary"
                  style={{ marginTop: 6, marginBottom: 0, fontSize: 12 }}
                >
                  {c.summary}
                </Typography.Paragraph>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </Space>
  );
}

function ChapterPanel({
  workId,
  chapter,
}: {
  workId: number;
  chapter: Chapter;
}) {
  const [character, setCharacter] = useState<CharacterSuggestion | null>(null);
  const [events, setEvents] = useState<EventSuggestion[] | null>(null);
  const [consistency, setConsistency] = useState<ConsistencyResult | null>(null);
  const { mutate: genCharacter, isPending: loadingChar } = useSuggestCharacter(workId);
  const { mutate: genEvent, isPending: loadingEvent } = useSuggestEvent(workId);
  const { mutate: checkConsistency, isPending: loadingCheck } = useCheckConsistency(workId);

  const [question, setQuestion] = useState("");
  const { mutate: ask, isPending: asking, data: chatAnswer } = useAIChat(workId);

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Card size="small" title="生成出场人物">
        <Form
          layout="vertical"
          initialValues={{ role: "support" }}
          onFinish={(v) =>
            genCharacter(
              { role: String(v.role), extra_hint: v.extra_hint || undefined },
              {
                onSuccess: (d) => setCharacter(d.character),
                onError: (e: Error) => message.error(e.message),
              }
            )
          }
        >
          <Form.Item name="role" label="角色定位">
            <Select
              options={[
                { value: "protagonist", label: "主角" },
                { value: "deuteragonist", label: "次主角" },
                { value: "support", label: "辅助" },
                { value: "antagonist", label: "反派" },
                { value: "mentor", label: "导师" },
                { value: "love_interest", label: "感情线" },
                { value: "side", label: "配角" },
              ]}
            />
          </Form.Item>
          <Form.Item name="extra_hint" label="额外提示(可选)">
            <Input placeholder="如:沉默寡言的女剑客" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loadingChar}>
            生成
          </Button>
        </Form>
        {character && <CharacterCard character={character} />}
      </Card>

      <Card size="small" title="建议事件">
        <Button
          type="primary"
          loading={loadingEvent}
          onClick={() =>
            genEvent(
              { count: 5 },
              {
                onSuccess: (d) => setEvents(d.events),
                onError: (e: Error) => message.error(e.message),
              }
            )
          }
        >
          生成 5 个事件
        </Button>
        {events && (
          <div style={{ marginTop: 12 }}>
            {events.map((e, i) => (
              <Card size="small" key={i} style={{ marginTop: 8 }}>
                <Space>
                  <Tag color="geekblue">{e.event_type}</Tag>
                  <strong>{e.title}</strong>
                  {e.story_time && <Tag>{e.story_time}</Tag>}
                  {e.importance != null && <Tag color="orange">重要度 {e.importance}</Tag>}
                </Space>
                {e.description && (
                  <Typography.Paragraph
                    type="secondary"
                    style={{ marginTop: 6, marginBottom: 0, fontSize: 12 }}
                  >
                    {e.description}
                  </Typography.Paragraph>
                )}
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Card size="small" title="一致性检查">
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          检查本章正文是否与已有设定(人物/事件/状态)冲突
        </Typography.Paragraph>
        <Button
          type="primary"
          loading={loadingCheck}
          onClick={() =>
            checkConsistency(
              { new_content: chapter.content || "(本章正文为空)" },
              {
                onSuccess: (d) => setConsistency(d),
                onError: (e: Error) => message.error(e.message),
              }
            )
          }
        >
          检查本章正文
        </Button>
        {consistency && <ConsistencyView result={consistency} />}
      </Card>

      <Card size="small" title="问 AI">
        <Input.TextArea
          autoSize={{ minRows: 2, maxRows: 4 }}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例:这章的伏笔埋得合理吗?"
        />
        <Button
          type="primary"
          style={{ marginTop: 8 }}
          loading={asking}
          onClick={() => ask(question)}
        >
          提问
        </Button>
        {chatAnswer && (
          <Card size="small" style={{ marginTop: 12, background: "#fafafa" }}>
            {chatAnswer.answer}
          </Card>
        )}
      </Card>
    </Space>
  );
}

function CharacterCard({ character }: { character: CharacterSuggestion }) {
  return (
    <Card size="small" style={{ marginTop: 12, background: "#fafafa" }}>
      <Space>
        <strong>{character.name}</strong>
        {character.aliases && <Tag>{character.aliases}</Tag>}
      </Space>
      <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.7 }}>
        {character.age != null && <div>年龄:{character.age} · 性别:{character.gender ?? "—"}</div>}
        {character.appearance && <div>外貌:{character.appearance}</div>}
        {character.personality && <div>性格:{character.personality}</div>}
        {character.background && <div>背景:{character.background}</div>}
        {character.motivation && <div>动机:{character.motivation}</div>}
        {character.arc && <div>弧光:{character.arc}</div>}
        {character.speech_style && <div>说话风格:{character.speech_style}</div>}
        {character.ability && <div>能力:{character.ability}</div>}
      </div>
    </Card>
  );
}

function ConsistencyView({ result }: { result: ConsistencyResult }) {
  const color = (sev: ConsistencyIssue["severity"]) =>
    sev === "high" ? "red" : sev === "medium" ? "orange" : "gold";
  return (
    <div style={{ marginTop: 12 }}>
      <Alert
        type={result.issues.length === 0 ? "success" : "warning"}
        showIcon
        message={result.summary || "无明显冲突"}
      />
      {result.issues.map((it, i) => (
        <Card
          size="small"
          key={i}
          style={{ marginTop: 8 }}
          title={
            <Space>
              <Tag color={color(it.severity)}>{it.severity}</Tag>
              <Tag>{it.category}</Tag>
            </Space>
          }
        >
          {it.quote && (
            <Typography.Paragraph
              style={{
                background: "#f5f5f5",
                padding: 8,
                marginBottom: 8,
                fontStyle: "italic",
                fontSize: 12,
              }}
            >
              "{it.quote}"
            </Typography.Paragraph>
          )}
          {it.explanation && <div>{it.explanation}</div>}
          {it.suggestion && (
            <div style={{ marginTop: 6, color: "#888" }}>建议:{it.suggestion}</div>
          )}
        </Card>
      ))}
    </div>
  );
}