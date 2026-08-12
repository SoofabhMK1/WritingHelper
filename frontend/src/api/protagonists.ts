import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Protagonist, ProtagonistCreate, ProtagonistUpdate } from "@/types/protagonist";

export const protagonistKeys = {
  all: (workId: number) => ["works", workId, "protagonists"] as const,
  detail: (workId: number, id: number) => [...protagonistKeys.all(workId), "detail", id] as const,
};

export function useProtagonists(workId: number) {
  return useQuery({
    queryKey: protagonistKeys.all(workId),
    queryFn: async () => {
      const { data } = await api.get<Protagonist[]>(`/works/${workId}/protagonists`);
      return data;
    },
    enabled: workId > 0,
  });
}

export function useProtagonist(workId: number, profileId?: number) {
  return useQuery({
    queryKey: protagonistKeys.detail(workId, profileId ?? -1),
    queryFn: async () => {
      const { data } = await api.get<Protagonist>(`/works/${workId}/protagonists/${profileId}`);
      return data;
    },
    enabled: workId > 0 && typeof profileId === "number" && profileId > 0,
  });
}

export function useCreateProtagonist(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProtagonistCreate) => {
      const { data } = await api.post<Protagonist>(`/works/${workId}/protagonists`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: protagonistKeys.all(workId) }),
  });
}

export function useUpdateProtagonist(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: ProtagonistUpdate }) => {
      const { data } = await api.put<Protagonist>(`/works/${workId}/protagonists/${id}`, payload);
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: protagonistKeys.all(workId) });
      qc.invalidateQueries({ queryKey: protagonistKeys.detail(workId, vars.id) });
    },
  });
}