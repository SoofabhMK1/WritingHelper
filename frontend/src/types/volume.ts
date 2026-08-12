export type VolumeStatus = "planning" | "writing" | "done";

export interface Volume {
  id: number;
  work_id: number;
  title: string;
  summary?: string | null;
  order_num: number;
  status: VolumeStatus;
  target_words: number;
  created_at: string;
  updated_at: string;
}

export type VolumeCreate = Omit<Volume, "id" | "work_id" | "created_at" | "updated_at">;
export type VolumeUpdate = Partial<VolumeCreate>;

export const VOLUME_STATUS_LABEL: Record<VolumeStatus, string> = {
  planning: "规划中",
  writing: "写作中",
  done: "已完成",
};

export const VOLUME_STATUS_COLOR: Record<VolumeStatus, string> = {
  planning: "default",
  writing: "processing",
  done: "success",
};