import { useEffect } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined, StarOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useCharacter, useUpdateCharacter } from "@/api/characters";
import { CHARACTER_ROLE_OPTIONS, type CharacterRole } from "@/types/character";
import { useProtagonists } from "@/api/protagonists";

interface FormValues {
  name: string;
  aliases?: string;
  role: CharacterRole;
  age?: number;
  gender?: string;
  occupation?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  motivation?: string;
  arc?: string;
  speech_style?: string;
  ability?: string;
  notes?: string;
}

export function CharacterEditor() {
  const { wid, cid } = useParams<{ wid: string; cid: string }>();
  const workId = Number(wid);
  const characterId = Number(cid);
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();

  const { data: character, isLoading, isError, error, refetch } = useCharacter(workId, characterId);
  const { data: protagonists = [] } = useProtagonists(workId);
  const { mutate: update, isPending } = useUpdateCharacter(workId);

  useEffect(() => {
    if (character) {
      form.setFieldsValue({
        name: character.name,
        aliases: character.aliases ?? undefined,
        role: character.role,
        age: character.age ?? undefined,
        gender: character.gender ?? undefined,
        occupation: character.occupation ?? undefined,
        appearance: character.appearance ?? undefined,
        personality: character.personality ?? undefined,
        background: character.background ?? undefined,
        motivation: character.motivation ?? undefined,
        arc: character.arc ?? undefined,
        speech_style: character.speech_style ?? undefined,
        ability: character.ability ?? undefined,
        notes: character.notes ?? undefined,
      });
    }
  }, [character, form]);

  if (isLoading) return <Typography.Text type="secondary">加载中…</Typography.Text>;
  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="加载人物失败"
        description={String(error)}
        action={<Button size="small" onClick={() => refetch()}>重试</Button>}
      />
    );
  }
  if (!character) return <Typography.Text type="secondary">人物不存在</Typography.Text>;

  async function onFinish(values: FormValues) {
    await update(
      { id: characterId, payload: values },
      {
        onSuccess: () => message.success("已保存"),
        onError: (e: Error) => message.error(`保存失败: ${e.message}`),
      }
    );
  }

  const hasProfile = protagonists.some((p) => p.character_id === characterId);

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/works/${workId}/characters`)}>
          返回人物列表
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {character.name}
        </Typography.Title>
        {!hasProfile && (
          <Button
            type="dashed"
            icon={<StarOutlined />}
            onClick={() => navigate(`/works/${workId}/protagonists?new=${characterId}`)}
          >
            设为主角
          </Button>
        )}
      </Space>

      <Card>
        <Form layout="vertical" form={form} onFinish={onFinish} requiredMark="optional">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
                <Input maxLength={120} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="aliases" label="别名/外号">
                <Input maxLength={500} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="role" label="角色">
                <Select options={CHARACTER_ROLE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="age" label="年龄">
                <InputNumber min={0} max={9999} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="gender" label="性别">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="occupation" label="职业/身份">
                <Input maxLength={120} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="appearance" label="外貌">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
          <Form.Item name="personality" label="性格">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
          <Form.Item name="background" label="身世背景">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
          </Form.Item>
          <Form.Item name="motivation" label="动机/欲望">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
          <Form.Item name="arc" label="人物弧光">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
          <Form.Item name="speech_style" label="口头禅/说话风格">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
          <Form.Item name="ability" label="能力/技能">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
          <Form.Item name="notes" label="其他笔记">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              htmlType="submit"
              loading={isPending}
            >
              保存
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}