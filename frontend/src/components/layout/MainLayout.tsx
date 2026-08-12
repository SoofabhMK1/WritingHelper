import { Layout, Menu } from "antd";
import {
  BulbOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  HomeOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useUiStore } from "@/store/theme";
import { useShortcuts } from "@/hooks/useShortcuts";

const { Header, Sider, Content } = Layout;

export function MainLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  useShortcuts([
    {
      key: "g",
      handler: () => navigate("/"),
      description: "回到作品库",
    },
    {
      key: ",",
      ctrl: true,
      handler: () => navigate("/settings"),
      description: "打开设置",
    },
    {
      key: "d",
      ctrl: true,
      shift: true,
      handler: toggleTheme,
      description: "切换深浅主题",
    },
  ]);

  let selectedKey = "/";
  if (pathname.startsWith("/settings")) selectedKey = "/settings";
  else if (pathname.startsWith("/prompts")) selectedKey = "/prompts";
  else if (pathname.startsWith("/ai-logs")) selectedKey = "/ai-logs";
  else if (pathname.startsWith("/works")) selectedKey = "/";

  const headerStyle: React.CSSProperties = {
    paddingLeft: 24,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider breakpoint="lg" collapsedWidth="0" theme="dark">
        <div className="app-logo">📖 小说助手</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={({ key }) => navigate(key as string)}
          items={[
            { key: "/", icon: <HomeOutlined />, label: "作品库" },
            { key: "/prompts", icon: <ExperimentOutlined />, label: "提示词管理" },
            { key: "/ai-logs", icon: <FileSearchOutlined />, label: "请求日志" },
            { key: "/settings", icon: <SettingOutlined />, label: "设置" },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={headerStyle}>
          <h2 style={{ margin: 0, fontWeight: 500 }}>AI 辅助写作系统</h2>
          <a
            onClick={toggleTheme}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            title="Ctrl+Shift+D 切换主题"
          >
            <BulbOutlined />
            {theme === "dark" ? "深色" : "浅色"}
          </a>
        </Header>
        <Content style={{ margin: 24, padding: 24, borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}