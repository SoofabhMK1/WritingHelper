import { Card, Empty, Space, Typography } from "antd";
import { KeyOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAIStatus } from "@/api/settings";

const { Title } = Typography;

interface SettingItem {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
}

export function Settings() {
  const navigate = useNavigate();
  const { data: aiStatus } = useAIStatus();

  const profileCount = aiStatus?.profiles?.length ?? 0;
  const assignmentCount = Object.keys(aiStatus?.assignments ?? {}).length;

  const items: SettingItem[] = [
    {
      key: "ai",
      title: "AI 服务配置",
      description: aiStatus?.configured
        ? `默认 ${aiStatus.default_profile_name ?? "未命名"} · ${aiStatus.model} @ ${aiStatus.base_url} · ${profileCount} 个 API 配置,${assignmentCount} 个专属绑定`
        : "管理多个 OpenAI 兼容 API、设置默认、为各 AI 服务单独绑定",
      icon: <KeyOutlined style={{ fontSize: 24 }} />,
      to: "/settings/ai",
    },
  ];

  return (
    <div>
      <Title level={3} style={{ margin: 0, marginBottom: 16 }}>设置</Title>

      {items.length === 0 ? (
        <Empty description="暂无设置项" />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {items.map((item) => (
            <Card key={item.key} hoverable onClick={() => navigate(item.to)}>
              <Space direction="vertical">
                {item.icon}
                <strong>{item.title}</strong>
                <Typography.Text type="secondary">{item.description}</Typography.Text>
              </Space>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}