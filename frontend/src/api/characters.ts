import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Character, CharacterCreate, CharacterUpdate } from "@/types/character";

export const characterKeys = {
  all: (workId: number) => ["works", workId, "characters"] as const,
  list: (workId: number, params?: { role?: string; q?: string }) =>
    [...characterKeys.all(workId), "list", params ?? {}] as const,
  detail: (workId: number, id: number) =>
    [...characterKeys.all(workId), "detail", id] as const,
};

export function useCharacters(workId: number, params?: { role?: string; q?: string }) {
  return useQuery({
    queryKey: characterKeys.list(workId, params),
    queryFn: async () => {
      const { data } = await api.get<Character[]>(`/works/${workId}/characters`, {
        params: params ?? {},
      });
      return data;
    },
    enabled: workId > 0,
  });
}

export function useCharacter(workId: number, characterId?: number) {
  return useQuery({
    queryKey: characterKeys.detail(workId, characterId ?? -1),
    queryFn: async () => {
      const { data } = await api.get<Character>(`/works/${workId}/characters/${characterId}`);
      return data;
    },
    enabled: workId > 0 && typeof characterId === "number" && characterId > 0,
  });
}

export function useCreateCharacter(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CharacterCreate) => {
      const { data } = await api.post<Character>(`/works/${workId}/characters`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: characterKeys.all(workId) }),
  });
}

export function useUpdateCharacter(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: CharacterUpdate }) => {
      const { data } = await api.put<Character>(`/works/${workId}/characters/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: characterKeys.all(workId) });
      qc.setQueryData(characterKeys.detail(workId, data.id), data);
    },
  });
}

export function useDeleteCharacter(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/works/${workId}/characters/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: characterKeys.all(workId) }),
  });
}