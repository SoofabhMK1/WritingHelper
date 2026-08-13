import { Button, Input, Modal, Space, Typography, message } from "antd";
import { useState } from "react";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  useCreateVolume,
  useDeleteVolume,
  useUpdateVolume,
  useVolumes,
} from "@/api/volumes";
import {
  useChapters,
  useCreateChapter,
  useDeleteChapter,
  useUpdateChapter,
} from "@/api/chapters";
import type { Chapter, Volume } from "@/types";
import { ChapterList } from "./ChapterList";
import { useAIDrawer } from "@/store/aiDrawer";

const EMPTY_VOLUME: Pick<Volume, "title" | "summary" | "order_num" | "status" | "target_words"> = {
  title: "",
  summary: "",
  order_num: 0,
  status: "planning",
  target_words: 0,
};

export function Outline({ workId }: { workId: number }) {
  const navigate = useNavigate();
  const { data: volumes = [], isLoading: volsLoading } = useVolumes(workId);
  const { data: chapters = [], isLoading: chsLoading } = useChapters(workId);

  const createVolume = useCreateVolume(workId);
  const updateVolume = useUpdateVolume(workId);
  const deleteVolume = useDeleteVolume(workId);

  const createChapter = useCreateChapter(workId);
  const updateChapter = useUpdateChapter(workId);
  const deleteChapter = useDeleteChapter(workId);

  const openAIVolume = useAIDrawer((s) => s.openVolume);
  const openAIChapter = useAIDrawer((s) => s.openChapter);

  const [editing, setEditing] = useState<Volume | null>(null);
  const [draft, setDraft] = useState(EMPTY_VOLUME);
  const [formOpen, setFormOpen] = useState(false);

  const isLoading = volsLoading || chsLoading;

  if (isLoading) {
    return <Typography.Text type="secondary">加载中…</Typography.Text>;
  }

  // group chapters by volume (null = no volume / free chapters)
  const chaptersByVolume = new Map<number | null, Chapter[]>();
  for (const c of chapters) {
    const k = c.volume_id ?? null;
    if (!chaptersByVolume.has(k)) chaptersByVolume.set(k, []);
    chaptersByVolume.get(k)!.push(c);
  }

  function openNewVolume() {
    setEditing(null);
    setDraft({ ...EMPTY_VOLUME, order_num: volumes.length });
    setFormOpen(true);
  }

  function openEditVolume(v: Volume) {
    setEditing(v);
    setDraft({
      title: v.title,
      summary: v.summary ?? "",
      order_num: v.order_num,
      status: v.status,
      target_words: v.target_words,
    });
    setFormOpen(true);
  }

  async function onSaveVolume() {
    if (!draft.title.trim()) {
      message.warning("请输入卷名");
      return;
    }
    const payload = {
      title: draft.title.trim(),
      summary: draft.summary || null,
      order_num: draft.order_num,
      status: draft.status,
      target_words: draft.target_words,
    };
    if (editing) {
      await updateVolume.mutateAsync({ id: editing.id, payload });
      message.success("已保存");
    } else {
      await createVolume.mutateAsync(payload);
      message.success("已新建");
    }
    setFormOpen(false);
  }

  async function onDeleteVolume(v: Volume) {
    await deleteVolume.mutateAsync(v.id);
    message.success(`已删除《${v.title}》(其下章节也会一起删除)`);
  }

  async function onNewChapter(volumeId: number | null) {
    const order = chaptersByVolume.get(volumeId)?.length ?? 0;
    await createChapter.mutateAsync({
      work_id: workId,
      volume_id: volumeId,
      title: "新章节",
      order_num: order,
    });
    message.success("已新建章节");
  }

  async function onMoveChapter(c: Chapter, direction: -1 | 1) {
    const sibs = (chaptersByVolume.get(c.volume_id ?? null) ?? []).slice();
    const idx = sibs.findIndex((x) => x.id === c.id);
    const swap = idx + direction;
    if (swap < 0 || swap >= sibs.length) return;
    const other = sibs[swap];
    await Promise.all([
      updateChapter.mutateAsync({ id: c.id, payload: { order_num: other.order_num } }),
      updateChapter.mutateAsync({ id: other.id, payload: { order_num: c.order_num } }),
    ]);
  }

  async function onDeleteChapter(c: Chapter) {
    await deleteChapter.mutateAsync(c.id);
    message.success("已删除章节");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Space size="middle" align="center">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/works/${workId}`)}>
            返回作品详情
          </Button>
          <Typography.Title level={4} style={{ margin: 0 }}>
            大纲规划
          </Typography.Title>
        </Space>
        <Space>
          <Button onClick={() => onNewChapter(null)}>新增散章</Button>
          <Button type="primary" onClick={openNewVolume}>
            新建卷
          </Button>
        </Space>
      </div>

      {volumes.length === 0 ? (
        <Typography.Paragraph type="secondary">
          还没有任何卷。点击"新建卷"开始搭建大纲。
        </Typography.Paragraph>
      ) : (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {volumes.map((v) => (
            <ChapterList
              key={v.id}
              volume={v}
              chapters={chaptersByVolume.get(v.id) ?? []}
              workId={workId}
              onEditVolume={() => openEditVolume(v)}
              onDeleteVolume={() => onDeleteVolume(v)}
              onAIVolume={() => openAIVolume(workId, v)}
              onAddChapter={() => onNewChapter(v.id)}
              onAIChapter={(c) => openAIChapter(workId, c)}
              onMoveChapter={onMoveChapter}
              onDeleteChapter={onDeleteChapter}
            />
          ))}

          {/* free chapters (no volume) */}
          {(chaptersByVolume.get(null) ?? []).length > 0 && (
            <ChapterList
              volume={null}
              chapters={chaptersByVolume.get(null) ?? []}
              workId={workId}
              onAddChapter={() => onNewChapter(null)}
              onAIChapter={(c) => openAIChapter(workId, c)}
              onMoveChapter={onMoveChapter}
              onDeleteChapter={onDeleteChapter}
            />
          )}
        </Space>
      )}

      <Modal
        title={editing ? "编辑卷" : "新建卷"}
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        onOk={onSaveVolume}
        confirmLoading={createVolume.isPending || updateVolume.isPending}
        okText={editing ? "保存" : "创建"}
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <Typography.Text>卷名</Typography.Text>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="例如:第一卷 山村少年"
              maxLength={200}
            />
          </div>
          <div>
            <Typography.Text>概要</Typography.Text>
            <Input.TextArea
              value={draft.summary ?? ""}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder="本卷核心冲突与走向"
            />
          </div>
          <div>
            <Typography.Text>目标字数</Typography.Text>
            <Input
              type="number"
              min={0}
              value={draft.target_words}
              onChange={(e) =>
                setDraft({ ...draft, target_words: Number(e.target.value) || 0 })
              }
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}