import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { AIStatus } from "@/types/setting";

export const settingKeys = {
  all: ["settings"] as const,
  list: () => [...settingKeys.all, "list"] as const,
};

export function useAIStatus() {
  return useQuery({
    queryKey: [...settingKeys.all, "ai-status"] as const,
    queryFn: async () => {
      const { data } = await api.get<AIStatus>("/ai/status");
      return data;
    },
  });
}