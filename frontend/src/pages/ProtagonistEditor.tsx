import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useProtagonists, useCreateProtagonist, useUpdateProtagonist } from "@/api/protagonists";
import { useCharacters } from "@/api/characters";
import type { ProtagonistCreate } from "@/types/protagonist";

interface ProfileForm {
  character_id: number;
  core_conflict?: string;
  external_goal?: string;
  internal_goal?: string;
  ghost?: string;
  wound?: string;
  lie_believed?: string;
  truth_needed?: string;
  arc_summary?: string;
  key_relationships?: string;
  special_abilities?: string;
  pov_label?: string;
}

export function ProtagonistEditor() {
  const { wid } = useParams<{ wid: string }>();
  const workId = Number(wid);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const newCharId = searchParams.get("new") ? Number(searchParams.get("new")) : null;

  const { data: protagonists = [], isLoading, isError, error, refetch } = useProtagonists(workId);
  const { data: characters = [] } = useCharacters(workId);
  const { mutate: create } = useCreateProtagonist(workId);
  const { mutate: update, isPending: updating } = useUpdateProtagonist(workId);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm<ProfileForm>();

  useEffect(() => {
    if (newCharId && characters.length > 0 && !isLoading) {
      const exists = protagonists.some((p) => p.character_id === newCharId);
      if (!exists) {
        create(
          { character_id: newCharId } as ProtagonistCreate,
          {
            onSuccess: (p) => {
              message.success("已设为主角,请补充设定");
              setEditingId(p.id);
              navigate(`/works/${workId}/protagonists`, { replace: true });
            },
            onError: (e: Error) => message.error(e.message),
          }
        );
      } else {
        const existing = protagonists.find((p) => p.character_id === newCharId)!;
        setEditingId(existing.id);
        navigate(`/works/${workId}/protagonists`, { replace: true });
      }
    }
  }, [newCharId, characters.length, protagonists, isLoading]);

  const editing = protagonists.find((p) => p.id === editingId) ?? null;

  useEffect(() => {
    if (editing) {
      form.setFieldsValue({
        character_id: editing.character_id,
        core_conflict: editing.core_conflict ?? undefined,
        external_goal: editing.external_goal ?? undefined,
        internal_goal: editing.internal_goal ?? undefined,
        ghost: editing.ghost ?? undefined,
        wound: editing.wound ?? undefined,
        lie_believed: editing.lie_believed ?? undefined,
        truth_needed: editing.truth_needed ?? undefined,
        arc_summary: editing.arc_summary ?? undefined,
        key_relationships: editing.key_relationships ?? undefined,
        special_abilities: editing.special_abilities ?? undefined,
        pov_label: editing.pov_label ?? undefined,
      });
    }
  }, [editing, form]);

  async function onSubmit(values: ProfileForm) {
    if (!editing) return;
    await update(
      { id: editing.id, payload: values },
      {
        onSuccess: () => message.success("已保存"),
        onError: (e: Error) => message.error(`保存失败: ${e.message}`),
      }
    );
  }

  function characterName(id: number): string {
    return characters.find((c) => c.id === id)?.name ?? `#${id}`;
  }

  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="加载主角设定失败"
        description={String(error)}
        action={<Button size="small" onClick={() => refetch()}>重试</Button>}
      />
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/works/${workId}`)}>
          返回作品详情
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          主角深度设定
        </Typography.Title>
      </Space>

      <Row gutter={16}>
        <Col span={8}>
          <Card title="本作品的主角" size="small" extra={<Tag color="gold">{protagonists.length} 位</Tag>}>
            {isLoading ? (
              <Typography.Text type="secondary">加载中…</Typography.Text>
            ) : protagonists.length === 0 ? (
              <Empty description="还没有主角" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                <Typography.Text type="secondary">
                  在人物列表点 "设为主角" 即可新建
                </Typography.Text>
              </Empty>
            ) : (
              <Space direction="vertical" style={{ width: "100%" }}>
                {protagonists.map((p) => (
                  <Button
                    key={p.id}
                    type={editingId === p.id ? "primary" : "default"}
                    block
                    onClick={() => setEditingId(p.id)}
                  >
                    {characterName(p.character_id)}
                    {p.pov_label ? ` · ${p.pov_label}` : ""}
                  </Button>
                ))}
              </Space>
            )}
          </Card>
        </Col>

        <Col span={16}>
          {!editing ? (
            <Empty description="请选择左侧的主角" />
          ) : (
            <Card title={`编辑 ${characterName(editing.character_id)} 的主角设定`}>
              <Form layout="vertical" form={form} onFinish={onSubmit} requiredMark="optional">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="external_goal" label="外部目标">
                      <Input.TextArea
                        autoSize={{ minRows: 2, maxRows: 3 }}
                        placeholder="主角想要得到的具体东西"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="internal_goal" label="内心目标">
                      <Input.TextArea
                        autoSize={{ minRows: 2, maxRows: 3 }}
                        placeholder="主角真正需要的是什么(可能自己都不知道)"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="core_conflict" label="核心冲突">
                  <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="ghost" label="鬼魂 (Ghost)">
                      <Input.TextArea
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        placeholder="过去发生的事,持续影响他"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="wound" label="创伤 (Wound)">
                      <Input.TextArea
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        placeholder="由此产生的情感创伤"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="lie_believed" label="相信的谎言">
                      <Input.TextArea
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        placeholder="主角误信的错误观念"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="truth_needed" label="需要学会的真相">
                      <Input.TextArea
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        placeholder="打破谎言需要接受的事实"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="arc_summary" label="人物弧光总结">
                  <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
                </Form.Item>

                <Form.Item name="key_relationships" label="关键关系">
                  <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="special_abilities" label="特殊能力">
                      <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="pov_label" label="POV 标记">
                      <Select
                        allowClear
                        options={[
                          { value: "第一视角", label: "第一视角" },
                          { value: "第三人称", label: "第三人称" },
                          { value: "多视角", label: "多视角" },
                          { value: "全知视角", label: "全知视角" },
                        ]}
                        placeholder="本主角使用什么视角"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item>
                  <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={updating}>
                    保存
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}