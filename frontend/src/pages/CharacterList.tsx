import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  useCreateCharacter,
  useDeleteCharacter,
  useCharacters,
} from "@/api/characters";
import {
  CHARACTER_ROLE_COLOR,
  CHARACTER_ROLE_LABEL,
  CHARACTER_ROLE_OPTIONS,
  type CharacterCreate,
  type CharacterRole,
} from "@/types/character";
import type { Character } from "@/types";

interface Props {
  workId: number;
}

export function CharacterList({ workId }: Props) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<CharacterRole | undefined>();
  const { data: characters = [], isLoading, isError, error, refetch } = useCharacters(
    workId,
    { q: q || undefined, role: roleFilter }
  );
  const { mutate: create } = useCreateCharacter(workId);
  const { mutate: remove } = useDeleteCharacter(workId);

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CharacterCreate>();

  function onCreate() {
    form.resetFields();
    form.setFieldsValue({ role: "side" });
    setModalOpen(true);
  }

  async function onSubmit() {
    const values = await form.validateFields();
    create(values, {
      onSuccess: () => {
        message.success("已新建人物");
        setModalOpen(false);
      },
      onError: (e: Error) => message.error(`创建失败: ${e.message}`),
    });
  }

  function onDelete(c: Character) {
    remove(c.id, {
      onSuccess: () => message.success(`已删除《${c.name}》`),
      onError: (e: Error) => message.error(`删除失败: ${e.message}`),
    });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Space size="middle" align="center">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/works/${workId}`)}>
            返回作品详情
          </Button>
          <Typography.Title level={4} style={{ margin: 0 }}>
            人物
          </Typography.Title>
        </Space>
        <Space>
          <Button onClick={() => navigate(`/works/${workId}/protagonists`)} icon={<StarOutlined />}>
            主角深度设定
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
            新建人物
          </Button>
        </Space>
      </div>

      {isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="加载人物失败"
          description={String(error)}
          action={
            <Button size="small" onClick={() => refetch()}>
              重试
            </Button>
          }
        />
      )}

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          prefix={<SearchOutlined />}
          placeholder="按姓名搜索"
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: 200 }}
        />
        <Select
          allowClear
          placeholder="按角色筛选"
          value={roleFilter}
          onChange={(v) => setRoleFilter(v)}
          options={CHARACTER_ROLE_OPTIONS}
          style={{ width: 160 }}
        />
      </Space>

      {isLoading ? (
        <Typography.Text type="secondary">加载中…</Typography.Text>
      ) : characters.length === 0 ? (
        <Empty description="还没有人物" />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {characters.map((c) => (
            <Card
              key={c.id}
              size="small"
              title={
                <Space>
                  <strong>{c.name}</strong>
                  {c.aliases && <Typography.Text type="secondary">({c.aliases})</Typography.Text>}
                </Space>
              }
              extra={<Tag color={CHARACTER_ROLE_COLOR[c.role]}>{CHARACTER_ROLE_LABEL[c.role]}</Tag>}
              actions={[
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/works/${workId}/characters/${c.id}`)}
                  key="edit"
                />,
                <Popconfirm
                  key="delete"
                  title="删除该人物?"
                  description="其主角深度设定也会一并删除。"
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDelete(c)}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                {c.age != null && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {c.age}岁 · {c.gender || "—"}
                    {c.occupation ? ` · ${c.occupation}` : ""}
                  </Typography.Text>
                )}
                {c.personality && (
                  <Typography.Paragraph
                    type="secondary"
                    ellipsis={{ rows: 2 }}
                    style={{ marginBottom: 0, fontSize: 12 }}
                  >
                    {c.personality}
                  </Typography.Paragraph>
                )}
                {!c.personality && c.background && (
                  <Typography.Paragraph
                    type="secondary"
                    ellipsis={{ rows: 2 }}
                    style={{ marginBottom: 0, fontSize: 12 }}
                  >
                    {c.background}
                  </Typography.Paragraph>
                )}
                {!c.personality && !c.background && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    暂无简介
                  </Typography.Text>
                )}
              </Space>
            </Card>
          ))}
        </div>
      )}

      <Modal
        title="新建人物"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSubmit}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="name" label="姓名" rules={[{ required: true, max: 120 }]}>
            <Input placeholder="例如:林惊羽" maxLength={120} />
          </Form.Item>
          <Form.Item name="aliases" label="别名/外号">
            <Input placeholder="例如:无心剑客" maxLength={500} />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select options={CHARACTER_ROLE_OPTIONS} />
          </Form.Item>
          <Space>
            <Form.Item name="age" label="年龄">
              <Input type="number" min={0} max={9999} style={{ width: 100 }} />
            </Form.Item>
            <Form.Item name="gender" label="性别">
              <Input style={{ width: 100 }} />
            </Form.Item>
            <Form.Item name="occupation" label="职业/身份">
              <Input style={{ width: 160 }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}