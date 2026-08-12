import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Volume, VolumeCreate, VolumeUpdate } from "@/types/volume";

export const volumeKeys = {
  all: (workId: number) => ["works", workId, "volumes"] as const,
};

export function useVolumes(workId: number) {
  return useQuery({
    queryKey: volumeKeys.all(workId),
    queryFn: async () => {
      const { data } = await api.get<Volume[]>(`/works/${workId}/volumes`);
      return data;
    },
    enabled: workId > 0,
  });
}

export function useCreateVolume(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VolumeCreate) => {
      const { data } = await api.post<Volume>(`/works/${workId}/volumes`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: volumeKeys.all(workId) }),
  });
}

export function useUpdateVolume(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: VolumeUpdate }) => {
      const { data } = await api.put<Volume>(`/works/${workId}/volumes/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: volumeKeys.all(workId) }),
  });
}

export function useDeleteVolume(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/works/${workId}/volumes/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: volumeKeys.all(workId) }),
  });
}