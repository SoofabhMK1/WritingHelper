export type LlmLogStatus = "ok" | "not_configured" | "error";

export interface LlmRequestLogSummary {
  id: number;
  prompt_name: string;
  endpoint: string;
  work_id: number | null;
  status: LlmLogStatus;
  duration_ms: number;
  model: string | null;
  provider: string | null;
  profile_id: number | null;
  prompt_assembly_id: number | null;
  user_preview: string;
  response_preview: string;
  error: string | null;
  created_at: string;
}

export interface LlmRequestLogDetail extends LlmRequestLogSummary {
  system: string;
  user: string;
  response: string | null;
  updated_at: string;
}

export interface LlmRequestLogList {
  items: LlmRequestLogSummary[];
  total: number;
  page: number;
  page_size: number;
}

export const LLM_LOG_STATUS_LABEL: Record<LlmLogStatus, string> = {
  ok: "成功",
  not_configured: "未配置",
  error: "失败",
};

export const LLM_LOG_STATUS_COLOR: Record<LlmLogStatus, string> = {
  ok: "green",
  not_configured: "gold",
  error: "red",
};

export const LLM_LOG_STATUS_OPTIONS: { value: LlmLogStatus; label: string }[] = [
  { value: "ok", label: LLM_LOG_STATUS_LABEL.ok },
  { value: "not_configured", label: LLM_LOG_STATUS_LABEL.not_configured },
  { value: "error", label: LLM_LOG_STATUS_LABEL.error },
];
