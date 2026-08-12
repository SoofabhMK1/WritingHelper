import { Alert, Button, Card, Descriptions, Empty, Space, Spin, Tag, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { usePrompt } from "@/api/prompt";
import {
  isPromptName,
  PROMPT_DESCRIPTIONS,
  PROMPT_LABELS,
} from "@/types/prompt";

export function PromptDetail() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { data: prompt, isLoading, isError, error } = usePrompt(name);

  const label = isPromptName(name) ? PROMPT_LABELS[name] : name;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <Space size="middle" style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/prompts")}>
          返回提示词
        </Button>
        <Typography.Title level={3} style={{ margin: 0 }}>{label}</Typography.Title>
        {name && <Tag>{name}</Tag>}
      </Space>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="加载提示词失败"
          description={String(error)}
          style={{ marginBottom: 16 }}
        />
      )}

      {isLoading ? (
        <div style={{ padding: 32, textAlign: "center" }}>
          <Spin />
        </div>
      ) : !prompt ? (
        <Empty description="提示词不存在" />
      ) : (
        <>
          <Card>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="标识">{prompt.name}</Descriptions.Item>
              <Descriptions.Item label="返回格式">
                <Tag color={prompt.json_mode ? "blue" : "default"}>
                  {prompt.json_mode ? "JSON" : "纯文本"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="温度">{prompt.temperature}</Descriptions.Item>
              <Descriptions.Item label="用途">
                {isPromptName(prompt.name)
                  ? PROMPT_DESCRIPTIONS[prompt.name]
                  : "—"}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="System Prompt" style={{ marginTop: 16 }}>
            <pre style={preStyle}>{prompt.system}</pre>
          </Card>

          <Card title="User Template" style={{ marginTop: 16 }}>
            <Typography.Paragraph type="secondary">
              占位符 <code>{"{variable}"}</code> 在调用时会被替换为真实数据;模板中成对的 <code>{`{{`}</code> <code>{`}}`}</code> 表示字面量花括号。
            </Typography.Paragraph>
            <pre style={preStyle}>{prompt.user_template}</pre>
          </Card>
        </>
      )}
    </div>
  );
}

const preStyle: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
  margin: 0,
  background: "#fafafa",
  padding: 12,
  borderRadius: 4,
};