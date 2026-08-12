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

  const items: SettingItem[] = [
    {
      key: "ai",
      title: "AI 服务配置",
      description: aiStatus?.configured
        ? `已配置 — ${aiStatus.model} @ ${aiStatus.base_url}`
        : "配置 OpenAI 兼容协议的 API Key、Base URL、模型等",
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