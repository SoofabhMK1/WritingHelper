import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Work, WorkCreate, WorkUpdate } from "@/types/work";

export const workKeys = {
  all: ["works"] as const,
  list: (q?: string) => [...workKeys.all, "list", { q }] as const,
  detail: (id: number) => [...workKeys.all, "detail", id] as const,
};

export function useWorks(q?: string) {
  return useQuery({
    queryKey: workKeys.list(q),
    queryFn: async () => {
      const { data } = await api.get<Work[]>("/works", { params: q ? { q } : {} });
      return data;
    },
  });
}

export function useWork(id?: number) {
  return useQuery({
    queryKey: workKeys.detail(id ?? -1),
    queryFn: async () => {
      const { data } = await api.get<Work>(`/works/${id}`);
      return data;
    },
    enabled: typeof id === "number" && id > 0,
  });
}

export function useCreateWork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: WorkCreate) => {
      const { data } = await api.post<Work>("/works", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: workKeys.all }),
  });
}

export function useUpdateWork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: WorkUpdate }) => {
      const { data } = await api.put<Work>(`/works/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: workKeys.all });
      qc.setQueryData(workKeys.detail(data.id), data);
    },
  });
}

export function useDeleteWork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/works/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: workKeys.all }),
  });
}