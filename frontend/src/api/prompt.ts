import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

export interface PromptSummary {
  name: string;
  json_mode: boolean;
  temperature: number;
}

export interface PromptDetail extends PromptSummary {
  system: string;
  user_template: string;
}

export const promptKeys = {
  all: ["prompts"] as const,
  list: () => [...promptKeys.all, "list"] as const,
  detail: (name: string) => [...promptKeys.all, "detail", name] as const,
};

export function usePromptList() {
  return useQuery({
    queryKey: promptKeys.list(),
    queryFn: async () => {
      const { data } = await api.get<PromptSummary[]>("/ai/prompts");
      return data;
    },
  });
}

export function usePrompt(name: string | undefined) {
  return useQuery({
    queryKey: name ? promptKeys.detail(name) : promptKeys.detail(""),
    queryFn: async () => {
      const { data } = await api.get<PromptDetail>(
        `/ai/prompts/${encodeURIComponent(name!)}`
      );
      return data;
    },
    enabled: !!name,
  });
}