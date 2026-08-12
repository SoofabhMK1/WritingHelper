import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  PromptFragment,
  PromptFragmentCreate,
  PromptFragmentUpdate,
} from "@/types/prompt-fragment";

export const promptFragmentKeys = {
  all: ["prompt-fragments"] as const,
  list: (q?: string) => [...promptFragmentKeys.all, "list", q ?? ""] as const,
  detail: (id: number) => [...promptFragmentKeys.all, "detail", id] as const,
};

export function usePromptFragmentList(q?: string) {
  return useQuery({
    queryKey: promptFragmentKeys.list(q),
    queryFn: async () => {
      const { data } = await api.get<PromptFragment[]>("/prompt-fragments", {
        params: q ? { q } : {},
      });
      return data;
    },
  });
}

export function usePromptFragment(id: number | undefined) {
  return useQuery({
    queryKey:
      id !== undefined
        ? promptFragmentKeys.detail(id)
        : promptFragmentKeys.detail(-1),
    queryFn: async () => {
      const { data } = await api.get<PromptFragment>(
        `/prompt-fragments/${id}`,
      );
      return data;
    },
    enabled: id !== undefined && id > 0,
  });
}

export function useCreatePromptFragment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PromptFragmentCreate) => {
      const { data } = await api.post<PromptFragment>(
        "/prompt-fragments",
        payload,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: promptFragmentKeys.all }),
  });
}

export function useUpdatePromptFragment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: PromptFragmentUpdate;
    }) => {
      const { data } = await api.put<PromptFragment>(
        `/prompt-fragments/${id}`,
        payload,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: promptFragmentKeys.all }),
  });
}

export function useDeletePromptFragment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/prompt-fragments/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: promptFragmentKeys.all }),
  });
}