import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Chapter, ChapterCreate, ChapterUpdate } from "@/types/chapter";

export const chapterKeys = {
  all: (workId: number) => ["works", workId, "chapters"] as const,
  list: (workId: number, volumeId?: number | null) =>
    [...chapterKeys.all(workId), "list", { volumeId }] as const,
  detail: (workId: number, id: number) =>
    [...chapterKeys.all(workId), "detail", id] as const,
};

export function useChapters(workId: number, volumeId?: number | null) {
  return useQuery({
    queryKey: chapterKeys.list(workId, volumeId ?? null),
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (volumeId !== undefined && volumeId !== null) params.volume_id = volumeId;
      const { data } = await api.get<Chapter[]>(`/works/${workId}/chapters`, { params });
      return data;
    },
    enabled: workId > 0,
  });
}

export function useChapter(workId: number, chapterId?: number) {
  return useQuery({
    queryKey: chapterKeys.detail(workId, chapterId ?? -1),
    queryFn: async () => {
      const { data } = await api.get<Chapter>(`/works/${workId}/chapters/${chapterId}`);
      return data;
    },
    enabled: workId > 0 && typeof chapterId === "number" && chapterId > 0,
  });
}

export function useCreateChapter(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ChapterCreate) => {
      const { data } = await api.post<Chapter>(`/works/${workId}/chapters`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chapterKeys.all(workId) }),
  });
}

export function useUpdateChapter(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: ChapterUpdate }) => {
      const { data } = await api.put<Chapter>(`/works/${workId}/chapters/${id}`, payload);
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: chapterKeys.all(workId) });
      qc.invalidateQueries({ queryKey: chapterKeys.detail(workId, vars.id) });
    },
  });
}

export function useDeleteChapter(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/works/${workId}/chapters/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chapterKeys.all(workId) }),
  });
}