import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  BuiltinPromptDetail,
  BuiltinPromptSummary,
  CloneBuiltinPromptRequest,
  PromptTemplateBinding,
  PromptTemplateBindingsResponse,
} from "@/types/ai-prompt-template";
import type { PromptAssembly } from "@/types/prompt-assembly";

export const promptTemplateBindingKeys = {
  all: ["ai-prompt-template-bindings"] as const,
  list: () => [...promptTemplateBindingKeys.all, "list"] as const,
  builtinCatalog: () => [...promptTemplateBindingKeys.all, "builtin"] as const,
  builtinDetail: (name: string) =>
    [...promptTemplateBindingKeys.all, "builtin-detail", name] as const,
};

export function usePromptTemplateBindings() {
  return useQuery({
    queryKey: promptTemplateBindingKeys.list(),
    queryFn: async () => {
      const { data } = await api.get<PromptTemplateBindingsResponse>(
        "/ai/prompt-template-bindings",
      );
      return data.bindings;
    },
  });
}

export function useSetPromptTemplateBinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      promptName,
      assemblyId,
    }: {
      promptName: string;
      assemblyId: number | null;
    }) => {
      const { data } = await api.put<PromptTemplateBinding>(
        `/ai/prompt-template-bindings/${encodeURIComponent(promptName)}`,
        { assembly_id: assemblyId },
      );
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: promptTemplateBindingKeys.all }),
  });
}

export function useClearPromptTemplateBinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (promptName: string) => {
      await api.delete(
        `/ai/prompt-template-bindings/${encodeURIComponent(promptName)}`,
      );
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: promptTemplateBindingKeys.all }),
  });
}

export function useBuiltinCatalog() {
  return useQuery({
    queryKey: promptTemplateBindingKeys.builtinCatalog(),
    queryFn: async () => {
      const { data } = await api.get<BuiltinPromptSummary[]>(
        "/ai/prompts-catalog",
      );
      return data;
    },
  });
}

export function useBuiltinPrompt(name: string | undefined) {
  return useQuery({
    queryKey:
      name !== undefined
        ? promptTemplateBindingKeys.builtinDetail(name)
        : promptTemplateBindingKeys.builtinDetail("__none__"),
    queryFn: async () => {
      const { data } = await api.get<BuiltinPromptDetail>(
        `/ai/prompts-catalog/${encodeURIComponent(name!)}`,
      );
      return data;
    },
    enabled: !!name,
  });
}

export function useCloneBuiltinPrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      promptName,
      payload,
    }: {
      promptName: string;
      payload: CloneBuiltinPromptRequest;
    }) => {
      const { data } = await api.post<PromptAssembly>(
        `/ai/prompts/${encodeURIComponent(promptName)}/clone`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: promptTemplateBindingKeys.all });
      qc.invalidateQueries({ queryKey: ["prompt-assemblies"] });
    },
  });
}
