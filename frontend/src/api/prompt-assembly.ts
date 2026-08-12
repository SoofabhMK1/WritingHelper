import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  AssemblyRenderResult,
  PromptAssembly,
  PromptAssemblyCreate,
  PromptAssemblyUpdate,
} from "@/types/prompt-assembly";

export const promptAssemblyKeys = {
  all: ["prompt-assemblies"] as const,
  list: (q?: string) => [...promptAssemblyKeys.all, "list", q ?? ""] as const,
  detail: (id: number) => [...promptAssemblyKeys.all, "detail", id] as const,
};

export function usePromptAssemblyList(q?: string) {
  return useQuery({
    queryKey: promptAssemblyKeys.list(q),
    queryFn: async () => {
      const { data } = await api.get<PromptAssembly[]>(
        "/prompt-assemblies",
        { params: q ? { q } : {} },
      );
      return data;
    },
  });
}

export function usePromptAssembly(id: number | undefined) {
  return useQuery({
    queryKey:
      id !== undefined
        ? promptAssemblyKeys.detail(id)
        : promptAssemblyKeys.detail(-1),
    queryFn: async () => {
      const { data } = await api.get<PromptAssembly>(
        `/prompt-assemblies/${id}`,
      );
      return data;
    },
    enabled: id !== undefined && id > 0,
  });
}

export function useCreatePromptAssembly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PromptAssemblyCreate) => {
      const { data } = await api.post<PromptAssembly>(
        "/prompt-assemblies",
        payload,
      );
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: promptAssemblyKeys.all }),
  });
}

export function useUpdatePromptAssembly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: PromptAssemblyUpdate;
    }) => {
      const { data } = await api.put<PromptAssembly>(
        `/prompt-assemblies/${id}`,
        payload,
      );
      return data;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: promptAssemblyKeys.all });
      qc.setQueryData(promptAssemblyKeys.detail(row.id), row);
    },
  });
}

export function useDeletePromptAssembly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/prompt-assemblies/${id}`);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: promptAssemblyKeys.all }),
  });
}

export function useRenderPromptAssembly() {
  return useMutation({
    mutationFn: async ({
      id,
      variables,
    }: {
      id: number;
      variables: Record<string, unknown>;
    }) => {
      const { data } = await api.post<AssemblyRenderResult>(
        `/prompt-assemblies/${id}/render`,
        { variables },
      );
      return data;
    },
  });
}