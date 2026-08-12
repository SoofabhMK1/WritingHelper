import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  LlmLogStatus,
  LlmRequestLogDetail,
  LlmRequestLogList,
  LlmRequestLogSummary,
} from "@/types/llm-log";

export interface LlmLogFilters {
  workId?: number;
  promptName?: string;
  status?: LlmLogStatus;
  page?: number;
  pageSize?: number;
}

export const llmLogKeys = {
  all: ["ai-logs"] as const,
  list: (filters: LlmLogFilters) =>
    [...llmLogKeys.all, "list", filters] as const,
  detail: (id: number) => [...llmLogKeys.all, "detail", id] as const,
};

function toParams(f: LlmLogFilters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (f.workId !== undefined) out.work_id = f.workId;
  if (f.promptName) out.prompt_name = f.promptName;
  if (f.status) out.status = f.status;
  if (f.page !== undefined) out.page = f.page;
  if (f.pageSize !== undefined) out.page_size = f.pageSize;
  return out;
}

export function useLlmLogs(filters: LlmLogFilters = {}, opts?: { refetchIntervalMs?: number | false }) {
  return useQuery({
    queryKey: llmLogKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<LlmRequestLogList>("/ai-logs", {
        params: toParams(filters),
      });
      return data;
    },
    refetchInterval: opts?.refetchIntervalMs === false ? false : opts?.refetchIntervalMs,
  });
}

export function useLlmLog(id: number | undefined) {
  return useQuery({
    queryKey: llmLogKeys.detail(id ?? -1),
    queryFn: async () => {
      const { data } = await api.get<LlmRequestLogDetail>(`/ai-logs/${id}`);
      return data;
    },
    enabled: typeof id === "number" && id > 0,
  });
}

export function useDeleteLlmLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/ai-logs/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: llmLogKeys.all }),
  });
}

export function useClearLlmLogs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (filters: LlmLogFilters = {}) => {
      const { data } = await api.delete<{ deleted: number }>("/ai-logs", {
        params: toParams(filters),
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: llmLogKeys.all }),
  });
}

export type { LlmRequestLogSummary };
