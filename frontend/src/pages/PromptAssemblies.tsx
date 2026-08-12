import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Space,
  Spin,
  Table,
  Typography,
} from "antd";
import {
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { usePromptAssemblyList } from "@/api/prompt-assembly";
import type { PromptAssembly } from "@/types/prompt-assembly";

const { Title } = Typography;

export function PromptAssemblies() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [committedQ, setCommittedQ] = useState<string | undefined>(undefined);
  const { data, isLoading, isError, error, refetch } =
    usePromptAssemblyList(committedQ);

  const columns: ColumnsType<PromptAssembly> = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      width: 240,
      render: (v: string, row: PromptAssembly) => (
        <Space direction="vertical" size={0}>
          <strong>{v}</strong>
          {row.description && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.description}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: "System 块",
      key: "sys",
      width: 100,
      render: (_: unknown, row: PromptAssembly) => (
        <Typography.Text type="secondary">
          {row.system_parts.length}
        </Typography.Text>
      ),
    },
    {
      title: "User 块",
      key: "usr",
      width: 100,
      render: (_: unknown, row: PromptAssembly) => (
        <Typography.Text type="secondary">
          {row.user_parts.length}
        </Typography.Text>
      ),
    },
    {
      title: "样本变量",
      key: "vars",
      width: 120,
      render: (_: unknown, row: PromptAssembly) => (
        <Typography.Text type="secondary">
          {Object.keys(row.sample_vars).length}
        </Typography.Text>
      ),
    },
    {
      title: "更新于",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 200,
      render: (v: string) => (
        <Typography.Text type="secondary">{v}</Typography.Text>
      ),
    },
    {
      title: "操作",
      key: "actions",
      width: 120,
      render: (_: unknown, row: PromptAssembly) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => navigate(`/prompts/assemblies/${row.id}`)}
        >
          编辑
        </Button>
      ),
    },
  ];

  const assemblies = data ?? [];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Space size="middle">
          <Title level={4} style={{ margin: 0 }}>
            组合
          </Title>
          <Typography.Text type="secondary">
            共 {assemblies.length} 个
          </Typography.Text>
        </Space>
        <Space>
          <Input
            allowClear
            placeholder="按名称搜索"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => setCommittedQ(search.trim() || undefined)}
            onClear={() => {
              setSearch("");
              setCommittedQ(undefined);
            }}
            style={{ width: 220 }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/prompts/assemblies/new")}
          >
            新建组合
          </Button>
        </Space>
      </div>

      {isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="无法加载组合列表"
          description={String(error)}
          action={
            <Button size="small" onClick={() => refetch()}>
              重试
            </Button>
          }
        />
      )}

      <Card>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <Spin /> <Typography.Text type="secondary">加载中…</Typography.Text>
          </div>
        ) : assemblies.length === 0 ? (
          <Empty
            description={committedQ ? "没有匹配的组合" : "尚未创建任何组合"}
          >
            {!committedQ && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate("/prompts/assemblies/new")}
              >
                新建组合
              </Button>
            )}
          </Empty>
        ) : (
          <Table
            rowKey="id"
            dataSource={assemblies}
            columns={columns}
            pagination={{ pageSize: 20, showSizeChanger: false }}
          />
        )}
      </Card>
    </div>
  );
}