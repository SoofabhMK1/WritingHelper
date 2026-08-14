import { Alert, Button, Card, Space, Typography, Upload } from "antd";
import { ArrowLeftOutlined, InboxOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

export function WorkImport() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/")}>
          返回作品库
        </Button>
        <Typography.Title level={3} style={{ margin: 0 }}>
          导入已有作品
        </Typography.Title>
      </Space>

      <Card>
        <Upload.Dragger
          disabled
          multiple={false}
          accept=".txt,.md,.markdown,.docx"
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">选择或拖拽已有作品文件(功能建设中)</p>
          <p className="ant-upload-hint">
            支持 txt / markdown / docx 格式的正文、大纲或世界观设定
          </p>
        </Upload.Dragger>

        <Alert
          style={{ marginTop: 16 }}
          type="info"
          showIcon
          message="该功能正在建设中"
          description="后续将支持导入已有小说正文、大纲与世界观设定,并由 AI 自动分析故事、人物、世界观、时间线与已知设定,生成一个作品项目。"
        />

        <Space style={{ marginTop: 16 }}>
          <Button type="primary" onClick={() => navigate("/works/new")}>
            去创建新作品
          </Button>
        </Space>
      </Card>
    </div>
  );
}
