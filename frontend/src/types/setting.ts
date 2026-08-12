import type { AIProfileSummary, AssignmentMap } from "./aiProfile";

export interface AppSetting {
  key: string;
  value: string;
  is_secret: boolean;
  is_set: boolean;
  updated_at?: string | null;
}

/** Returned by ``GET /api/v1/ai/status``. */
export interface AIStatus {
  configured: boolean;
  base_url: string;
  model: string;
  temperature: number;
  provider: string;
  default_profile_id: number | null;
  default_profile_name: string | null;
  profiles: AIProfileSummary[];
  /** ``prompt_name -> profile_id`` (``null`` = "use default"). */
  assignments: AssignmentMap;
}

// Well-known setting keys (frontend only — backend stores arbitrary keys)
export const SETTING_KEYS = {
  apiKey: "ai.api_key",
  baseUrl: "ai.base_url",
  model: "ai.model",
  temperature: "ai.temperature",
} as const;

export const SETTING_LABELS: Record<string, string> = {
  "ai.api_key": "API Key",
  "ai.base_url": "Base URL",
  "ai.model": "模型",
  "ai.temperature": "温度",
};

export const SETTING_DESCRIPTIONS: Record<string, string> = {
  "ai.api_key": "支持 OpenAI 兼容协议(OpenAI / DeepSeek / 通义千问 / Moonshot 等)",
  "ai.base_url": "形如 https://api.openai.com/v1 或 https://api.deepseek.com/v1",
  "ai.model": "模型标识,如 gpt-4o-mini、deepseek-chat 等",
  "ai.temperature": "0-2,越大越发散",
};