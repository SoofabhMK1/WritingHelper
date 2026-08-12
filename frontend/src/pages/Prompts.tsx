import { Alert, Button, Card, Empty, Space, Spin, Tabs, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePromptList } from "@/api/prompt";
import {
  isPromptName,
  PROMPT_DESCRIPTIONS,
  PROMPT_ICONS,
  PROMPT_LABELS,
  type PromptName,
} from "@/types/prompt";
import { PromptFragments } from "./PromptFragments";
import { PromptAssemblies } from "./PromptAssemblies";

const { Title } = Typography;

const TAB_KEYS = ["builtin", "fragments", "assemblies"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function isTabKey(s: string | null): s is TabKey {
  return !!s && (TAB_KEYS as readonly string[]).includes(s);
}

function BuiltInPromptCards() {
  const navigate = useNavigate();
  const { data: prompts = [], isLoading, isError, error, refetch } = usePromptList();

  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="无法加载提示词列表"
        description={String(error)}
        action={
          <Button size="small" onClick={() => refetch()}>
            重试
          </Button>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <Spin /> <Typography.Text type="secondary">加载中…</Typography.Text>
      </div>
    );
  }

  if (prompts.length === 0) {
    return <Empty description="后端未注册任何提示词" />;
  }

  return (
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
  );
}

export function Prompts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeKey: TabKey = isTabKey(tabParam) ? tabParam : "builtin";

  function onTabChange(key: string) {
    const next = new URLSearchParams(searchParams);
    next.set("tab", key);
    setSearchParams(next, { replace: true });
  }

  return (
    <div>
      <Space size="middle" style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          提示词模板
        </Title>
        <Typography.Text type="secondary">
          内置模板 · 我的片段 · 组合
        </Typography.Text>
      </Space>

      <Tabs
        activeKey={activeKey}
        onChange={onTabChange}
        items={[
          {
            key: "builtin",
            label: "内置模板",
            children: <BuiltInPromptCards />,
          },
          {
            key: "fragments",
            label: "我的片段",
            children: <PromptFragments />,
          },
          {
            key: "assemblies",
            label: "组合",
            children: <PromptAssemblies />,
          },
        ]}
      />
    </div>
  );
}