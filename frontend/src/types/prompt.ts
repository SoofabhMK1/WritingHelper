import type { ComponentType, CSSProperties } from "react";
import {
  AlertOutlined,
  CheckCircleOutlined,
  CommentOutlined,
  EditOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  PartitionOutlined,
  UserOutlined,
} from "@ant-design/icons";

export type PromptName =
  | "outline"
  | "chapters"
  | "character"
  | "event"
  | "consistency"
  | "continue"
  | "expand"
  | "chat";

export const PROMPT_LABELS: Record<PromptName, string> = {
  outline: "卷大纲生成",
  chapters: "章节细化",
  character: "人物生成",
  event: "事件建议",
  consistency: "一致性检查",
  continue: "续写",
  expand: "扩写",
  chat: "自由对话",
};

export const PROMPT_DESCRIPTIONS: Record<PromptName, string> = {
  outline: "根据作品设定(题材 / 风格 / 视角 / 目标字数)生成整体卷大纲",
  chapters: "把单卷细化成有节奏起伏的章节列表",
  character: "根据作品题材与已有角色,生成新人物(姓名/性格/背景/能力 等)",
  event: "基于剧情摘要与已有事件,推荐推动剧情的关键事件",
  consistency: "检查章节内容是否与已有设定(角色/事件/世界观)冲突",
  continue: "基于已有正文最后若干字,续写下一段",
  expand: "把简略片段扩写为更详细、更生动的正文",
  chat: "基于已载入的作品上下文进行自由提问",
};

export const PROMPT_ICONS: Record<PromptName, ComponentType<{ style?: CSSProperties }>> = {
  outline: PartitionOutlined,
  chapters: FileTextOutlined,
  character: UserOutlined,
  event: AlertOutlined,
  consistency: CheckCircleOutlined,
  continue: EditOutlined,
  expand: ExperimentOutlined,
  chat: CommentOutlined,
};

export const PROMPT_LIST: readonly PromptName[] = [
  "outline",
  "chapters",
  "character",
  "event",
  "consistency",
  "continue",
  "expand",
  "chat",
];

export function isPromptName(s: string | undefined): s is PromptName {
  return !!s && (PROMPT_LIST as readonly string[]).includes(s);
}