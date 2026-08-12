import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  Foreshadow,
  ForeshadowCreate,
  ForeshadowUpdate,
} from "@/types/foreshadow";

export const foreshadowKeys = {
  all: (workId: number) => ["works", workId, "foreshadowing"] as const,
  list: (workId: number, params?: Record<string, unknown>) =>
    [...foreshadowKeys.all(workId), "list", params ?? {}] as const,
  detail: (workId: number, id: number) =>
    [...foreshadowKeys.all(workId), "detail", id] as const,
};

export function useForeshadows(workId: number, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: foreshadowKeys.list(workId, params),
    queryFn: async () => {
      const { data } = await api.get<Foreshadow[]>(`/works/${workId}/foreshadowing`, {
        params: params ?? {},
      });
      return data;
    },
    enabled: workId > 0,
  });
}

export function useCreateForeshadow(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ForeshadowCreate) => {
      const { data } = await api.post<Foreshadow>(`/works/${workId}/foreshadowing`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: foreshadowKeys.all(workId) }),
  });
}

export function useUpdateForeshadow(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: ForeshadowUpdate }) => {
      const { data } = await api.put<Foreshadow>(`/works/${workId}/foreshadowing/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: foreshadowKeys.all(workId) }),
  });
}

export function useDeleteForeshadow(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/works/${workId}/foreshadowing/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: foreshadowKeys.all(workId) }),
  });
}