import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Progress,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CheckCircleFilled,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import type { FormInstance } from "antd";
import { useAIStatus } from "@/api/settings";
import {
  useSuggestCompletion,
  type CompletionAnalysisKey,
  type CompletionResult,
} from "@/api/ai";
import {
  computeChecklist,
  computeLocalCompleteness,
  DIMENSION_LABELS,
  overallCompleteness,
} from "./completeness";
import type { WorkFormValues } from "@/types/work";

const FIELD_MAP: Record<CompletionAnalysisKey, keyof WorkFormValues> = {
  story_core: "story_seed",
  core_conflict: "core_conflict",
  protagonist_goal: "protagonist_goal",
  setting: "setting",
  world_rules: "world_rules",
  themes: "themes",
};

const FIELD_LABELS: Record<CompletionAnalysisKey, string> = {
  story_core: "故事核心",
  core_conflict: "核心冲突",
  protagonist_goal: "主角目标",
  setting: "世界背景",
  world_rules: "世界规则",
  themes: "核心主题",
};

const ANALYSIS_KEYS = Object.keys(FIELD_MAP) as CompletionAnalysisKey[];

function buildDraft(values: WorkFormValues) {
  return {
    title: values.title ?? null,
    story_seed: values.story_seed ?? null,
    raw_idea: values.description ?? null,
    core_conflict: values.core_conflict ?? null,
    protagonist_goal: values.protagonist_goal ?? null,
    themes: values.themes ?? null,
    era: values.era ?? null,
    setting: values.setting ?? null,
    world_rules: values.world_rules ?? null,
    pace: values.pace ?? null,
    realism: values.realism ?? null,
    prose: values.prose ?? null,
    moods: values.moods ?? null,
    length_type: values.length_type ?? null,
    target_words: values.target_words ?? null,
    stage: values.stage ?? null,
  };
}

function suggestionText(key: CompletionAnalysisKey, value: unknown): string {
  if (key === "themes") {
    return Array.isArray(value) ? value.join("、") : String(value ?? "");
  }
  return typeof value === "string" ? value : String(value ?? "");
}

export function CreationAssistant({
  form,
  workId,
}: {
  form: FormInstance<WorkFormValues>;
  workId?: number;
}) {
  const values = (Form.useWatch([], form) ?? {}) as WorkFormValues;
  const { data: aiStatus } = useAIStatus();
  const configured = aiStatus?.configured ?? false;
  const { mutate: complete, isPending } = useSuggestCompletion(workId);

  const [result, setResult] = useState<CompletionResult | null>(null);
  const [decided, setDecided] = useState<Record<string, "adopted" | "ignored">>(
    {},
  );
  const [editingKey, setEditingKey] = useState<CompletionAnalysisKey | null>(
    null,
  );
  const [editText, setEditText] = useState("");

  const checklist = computeChecklist(values);
  const scores = computeLocalCompleteness(values);
  const percent = overallCompleteness(scores);

  const suggestedKeys = ANALYSIS_KEYS.filter(
    (k) => result?.analysis[k]?.status === "suggested",
  );
  const pendingKeys = suggestedKeys.filter((k) => !decided[k]);

  function runComplete() {
    complete(buildDraft(values), {
      onSuccess: (data) => {
        setResult(data);
        setDecided({});
        setEditingKey(null);
      },
      onError: (e: Error) => message.error(`AI 补完失败: ${e.message}`),
    });
  }

  function applyValue(key: CompletionAnalysisKey, raw: unknown) {
    const field = FIELD_MAP[key];
    const value =
      key === "themes" && typeof raw === "string"
        ? raw
            .split(/[,，、\n]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : raw;
    form.setFieldsValue({ [field]: value } as Partial<WorkFormValues>);
  }

  function adopt(key: CompletionAnalysisKey) {
    const item = result?.analysis[key];
    if (!item) return;
    applyValue(key, item.value);
    setDecided((d) => ({ ...d, [key]: "adopted" }));
    message.success(`已采用「${FIELD_LABELS[key]}」建议`);
  }

  function adoptAll() {
    for (const key of pendingKeys) {
      const item = result?.analysis[key];
      if (item) applyValue(key, item.value);
    }
    setDecided((d) => {
      const next = { ...d };
      for (const key of pendingKeys) next[key] = "adopted";
      return next;
    });
    setEditingKey(null);
    message.success(`已采用 ${pendingKeys.length} 项建议`);
  }

  function startEdit(key: CompletionAnalysisKey) {
    const item = result?.analysis[key];
    setEditingKey(key);
    setEditText(item ? suggestionText(key, item.value) : "");
  }

  function confirmEdit(key: CompletionAnalysisKey) {
    applyValue(key, editText);
    setDecided((d) => ({ ...d, [key]: "adopted" }));
    setEditingKey(null);
    message.success(`已采用「${FIELD_LABELS[key]}」建议`);
  }

  function ignore(key: CompletionAnalysisKey) {
    setDecided((d) => ({ ...d, [key]: "ignored" }));
  }

  return (
    <Card
      title={
        <Space>
          <ThunderboltOutlined />
          <span>AI 创作助手</span>
        </Space>
      }
      styles={{ body: { paddingTop: 12 } }}
    >
      <Typography.Text strong>当前作品信息</Typography.Text>
      <div style={{ margin: "8px 0 12px" }}>
        {checklist.map((item) => (
          <div
            key={item.key}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {item.done ? (
              <CheckCircleFilled style={{ color: "#52c41a" }} />
            ) : (
              <span style={{ color: "#bfbfbf" }}>○</span>
            )}
            <Typography.Text type={item.done ? undefined : "secondary"}>
              {item.label}
            </Typography.Text>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 4 }}>
        <Typography.Text type="secondary">完整度</Typography.Text>
      </div>
      <Progress percent={percent} size="small" style={{ marginBottom: 12 }} />

      {result && (
        <div style={{ marginBottom: 12 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            AI 评估各维度完整度
          </Typography.Text>
          {(
            Object.keys(DIMENSION_LABELS) as (keyof typeof DIMENSION_LABELS)[]
          ).map((dim) => (
            <div
              key={dim}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <Typography.Text style={{ width: 64, fontSize: 12 }}>
                {DIMENSION_LABELS[dim]}
              </Typography.Text>
              <Progress
                percent={result.completeness[dim]}
                size="small"
                showInfo={false}
                style={{ flex: 1, margin: 0 }}
              />
              <Typography.Text
                type="secondary"
                style={{ width: 32, fontSize: 12 }}
              >
                {result.completeness[dim]}
              </Typography.Text>
            </div>
          ))}
        </div>
      )}

      {!configured && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="AI 尚未配置"
          description={
            <span>
              请先前往 <Link to="/settings/ai">设置 → AI 服务配置</Link> 填写
              API。
            </span>
          }
        />
      )}

      <Button
        type="primary"
        block
        icon={<ThunderboltOutlined />}
        loading={isPending}
        disabled={!configured}
        onClick={runComplete}
      >
        AI 补完缺失信息
      </Button>

      <div style={{ marginTop: 16 }}>
        {result && suggestedKeys.length > 0 && (
          <div
            style={{
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Typography.Text strong>
              AI 建议补充 {suggestedKeys.length} 项
            </Typography.Text>
            {pendingKeys.length > 1 && (
              <Button size="small" onClick={adoptAll}>
                全部采用
              </Button>
            )}
          </div>
        )}

        {result && suggestedKeys.length === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="没有可补全的建议"
            style={{ margin: "8px 0" }}
          />
        )}

        {result &&
          suggestedKeys.map((key) => {
            const item = result.analysis[key];
            const state = decided[key];
            if (state === "ignored") return null;
            return (
              <Card
                key={key}
                size="small"
                style={{
                  marginBottom: 8,
                  borderColor: state === "adopted" ? "#52c41a" : undefined,
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    {FIELD_LABELS[key]}
                  </Typography.Text>
                  {state === "adopted" && (
                    <Tag color="success" icon={<CheckOutlined />}>
                      已采用
                    </Tag>
                  )}
                </div>

                {editingKey === key ? (
                  <div style={{ marginTop: 8 }}>
                    <Input.TextArea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      autoSize={{ minRows: 2, maxRows: 6 }}
                    />
                    <Space style={{ marginTop: 8 }}>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => confirmEdit(key)}
                      >
                        采用
                      </Button>
                      <Button size="small" onClick={() => setEditingKey(null)}>
                        取消
                      </Button>
                    </Space>
                  </div>
                ) : (
                  <>
                    <Typography.Paragraph
                      style={{
                        marginTop: 6,
                        marginBottom: 4,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {suggestionText(key, item.value)}
                    </Typography.Paragraph>
                    {item.reason && (
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 12 }}
                      >
                        {item.reason}
                      </Typography.Text>
                    )}
                    {state !== "adopted" && (
                      <Space style={{ marginTop: 8 }}>
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => adopt(key)}
                        >
                          采用
                        </Button>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => startEdit(key)}
                        >
                          编辑后采用
                        </Button>
                        <Button
                          size="small"
                          icon={<CloseOutlined />}
                          onClick={() => ignore(key)}
                        >
                          忽略
                        </Button>
                      </Space>
                    )}
                  </>
                )}
              </Card>
            );
          })}

        {result && result.potential_conflicts.length > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 8 }}
            message="可能存在的设定矛盾"
            description={
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {result.potential_conflicts.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            }
          />
        )}
      </div>
    </Card>
  );
}
