import { Alert, Button, Card, Empty, Space, Spin, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { usePromptList } from "@/api/prompt";
import {
  isPromptName,
  PROMPT_DESCRIPTIONS,
  PROMPT_ICONS,
  PROMPT_LABELS,
  type PromptName,
} from "@/types/prompt";

const { Title } = Typography;

export function Prompts() {
  const navigate = useNavigate();
  const { data: prompts = [], isLoading, isError, error, refetch } = usePromptList();

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
        <Title level={3} style={{ margin: 0 }}>提示词模板</Title>
        <Typography.Text type="secondary">
          共 {prompts.length} 个 · 内置,只读
        </Typography.Text>
      </div>

      {isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="无法加载提示词列表"
          description={String(error)}
          action={
            <Button size="small" onClick={() => refetch()}>
              重试
            </Button>
          }
        />
      )}

      {isLoading ? (
        <div style={{ padding: 32, textAlign: "center" }}>
          <Spin /> <Typography.Text type="secondary">加载中…</Typography.Text>
        </div>
      ) : prompts.length === 0 ? (
        <Empty description="后端未注册任何提示词" />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {prompts.map((p) => {
            const n: PromptName | null = isPromptName(p.name) ? p.name : null;
            const label = n ? PROMPT_LABELS[n] : p.name;
            const desc = n ? PROMPT_DESCRIPTIONS[n] : "（未在前端登记的提示词）";
            const Icon = n ? PROMPT_ICONS[n] : ReloadOutlined;
            return (
              <Card
                key={p.name}
                hoverable
                onClick={() => navigate(`/prompts/${p.name}`)}
              >
                <Space direction="vertical">
                  <Icon style={{ fontSize: 24 }} />
                  <strong>{label}</strong>
                  <Typography.Text type="secondary">{desc}</Typography.Text>
                </Space>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}