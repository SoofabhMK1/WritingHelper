import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  useCreatePromptFragment,
  useDeletePromptFragment,
  usePromptFragmentList,
  useUpdatePromptFragment,
} from "@/api/prompt-fragment";
import type {
  PromptFragment,
  PromptFragmentCreate,
  PromptFragmentUpdate,
} from "@/types/prompt-fragment";

const { Title } = Typography;

interface FormValues {
  name: string;
  body: string;
  description?: string;
  tags_json?: string;
}

const EMPTY_FORM: FormValues = { name: "", body: "", description: "", tags_json: "" };

function toCreate(values: FormValues): PromptFragmentCreate {
  return {
    name: values.name.trim(),
    body: values.body,
    description: values.description?.trim() || null,
    tags_json: values.tags_json?.trim() || null,
  };
}

function toUpdate(values: FormValues): PromptFragmentUpdate {
  return {
    name: values.name.trim(),
    body: values.body,
    description: values.description?.trim() || null,
    tags_json: values.tags_json?.trim() || null,
  };
}

export function PromptFragments() {
  const [search, setSearch] = useState("");
  const [committedQ, setCommittedQ] = useState<string | undefined>(undefined);
  const { data, isLoading, isError, error, refetch } =
    usePromptFragmentList(committedQ);
  const { mutate: createMut, isPending: creating } = useCreatePromptFragment();
  const { mutate: updateMut, isPending: updating } = useUpdatePromptFragment();
  const { mutate: deleteMut, isPending: deleting } = useDeletePromptFragment();

  const [editing, setEditing] = useState<PromptFragment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!modalOpen) return;
    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        body: editing.body,
        description: editing.description ?? "",
        tags_json: editing.tags_json ?? "",
      });
    } else {
      form.setFieldsValue(EMPTY_FORM);
    }
  }, [modalOpen, editing, form]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row: PromptFragment) {
    setEditing(row);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function onSubmit() {
    form
      .validateFields()
      .then((values) => {
        if (editing) {
          updateMut(
            { id: editing.id, payload: toUpdate(values) },
            {
              onSuccess: () => {
                message.success("已保存");
                closeModal();
              },
              onError: (e: Error) => message.error(`保存失败:${e.message}`),
            },
          );
        } else {
          createMut(toCreate(values), {
            onSuccess: () => {
              message.success("已创建");
              closeModal();
            },
            onError: (e: Error) => message.error(`创建失败:${e.message}`),
          });
        }
      })
      .catch(() => {
        /* validation errors are surfaced inline */
      });
  }

  function onDelete(row: PromptFragment) {
    deleteMut(row.id, {
      onSuccess: () => message.success(`已删除「${row.name}」`),
      onError: (e: Error) => message.error(`删除失败:${e.message}`),
    });
  }

  const columns: ColumnsType<PromptFragment> = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: "正文预览",
      dataIndex: "body",
      key: "body",
      ellipsis: true,
      render: (v: string) =>
        v ? (
          <Typography.Text type="secondary">{v}</Typography.Text>
        ) : (
          <Typography.Text type="secondary" italic>
            （空）
          </Typography.Text>
        ),
    },
    {
      title: "说明",
      dataIndex: "description",
      key: "description",
      width: 220,
      ellipsis: true,
      render: (v: string | null) =>
        v ? <Typography.Text type="secondary">{v}</Typography.Text> : "—",
    },
    {
      title: "更新于",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 180,
      render: (v: string) => (
        <Typography.Text type="secondary">{v}</Typography.Text>
      ),
    },
    {
      title: "操作",
      key: "actions",
      width: 160,
      render: (_: unknown, row: PromptFragment) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(row)}
          >
            编辑
          </Button>
          <Popconfirm
            title="删除该片段?"
            description="引用此片段的组合将无法渲染该块"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(row)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleting}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const fragments = data ?? [];

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
            我的片段
          </Title>
          <Typography.Text type="secondary">
            共 {fragments.length} 个
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
            onClick={openCreate}
          >
            新建片段
          </Button>
        </Space>
      </div>

      {isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="无法加载片段列表"
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
        ) : fragments.length === 0 ? (
          <Empty
            description={
              committedQ ? "没有匹配的片段" : "尚未创建任何片段"
            }
          >
            {!committedQ && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                新建片段
              </Button>
            )}
          </Empty>
        ) : (
          <Table
            rowKey="id"
            dataSource={fragments}
            columns={columns}
            pagination={{ pageSize: 20, showSizeChanger: false }}
          />
        )}
      </Card>

      <Modal
        title={editing ? "编辑片段" : "新建片段"}
        open={modalOpen}
        onCancel={closeModal}
        onOk={onSubmit}
        confirmLoading={creating || updating}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        width={640}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={EMPTY_FORM}
        >
          <Form.Item
            name="name"
            label="名称"
            rules={[
              { required: true, message: "请输入名称" },
              { max: 120, message: "最长 120 个字符" },
            ]}
            extra="仅用作显示,id 才是唯一标识;允许重名"
          >
            <Input placeholder="例如:风格指南 / JSON 示例 / 角色列表格式" />
          </Form.Item>
          <Form.Item
            name="body"
            label="正文"
            extra="可使用 {variable} 占位,在组合中渲染时被替换;字面量 {{ / }} 写作 {开开}/{闭闭}"
            rules={[{ required: true, message: "请输入正文" }]}
          >
            <Input.TextArea rows={8} placeholder="提示词片段的内容…" />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input placeholder="可选,用来记忆这个片段的用途" />
          </Form.Item>
          <Form.Item
            name="tags_json"
            label="标签 (JSON 数组字符串)"
            extra='例如: ["style", "few-shot"]'
          >
            <Input placeholder='["标签1", "标签2"]' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}