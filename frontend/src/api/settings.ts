import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { AIStatus, AppSetting } from "@/types/setting";

export const settingKeys = {
  all: ["settings"] as const,
  list: () => [...settingKeys.all, "list"] as const,
};

export function useSettings() {
  return useQuery({
    queryKey: settingKeys.list(),
    queryFn: async () => {
      const { data } = await api.get<AppSetting[]>("/settings");
      return data;
    },
  });
}

export function useUpsertSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data } = await api.put<AppSetting>(`/settings/${encodeURIComponent(key)}`, {
        value,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: settingKeys.all }),
  });
}

export function useDeleteSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => {
      await api.delete(`/settings/${encodeURIComponent(key)}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: settingKeys.all }),
  });
}

export function useAIStatus() {
  return useQuery({
    queryKey: [...settingKeys.all, "ai-status"] as const,
    queryFn: async () => {
      const { data } = await api.get<AIStatus>("/ai/status");
      return data;
    },
  });
}