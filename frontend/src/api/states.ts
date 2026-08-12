import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  CharacterState,
  StateCreate,
  StateUpdate,
} from "@/types/state";

export const stateKeys = {
  all: (workId: number) => ["works", workId, "states"] as const,
  list: (workId: number, params?: Record<string, unknown>) =>
    [...stateKeys.all(workId), "list", params ?? {}] as const,
  detail: (workId: number, id: number) =>
    [...stateKeys.all(workId), "detail", id] as const,
};

export function useStates(workId: number, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: stateKeys.list(workId, params),
    queryFn: async () => {
      const { data } = await api.get<CharacterState[]>(`/works/${workId}/states`, {
        params: params ?? {},
      });
      return data;
    },
    enabled: workId > 0,
  });
}

export function useState(workId: number, stateId?: number) {
  return useQuery({
    queryKey: stateKeys.detail(workId, stateId ?? -1),
    queryFn: async () => {
      const { data } = await api.get<CharacterState>(`/works/${workId}/states/${stateId}`);
      return data;
    },
    enabled: workId > 0 && typeof stateId === "number" && stateId > 0,
  });
}

export function useCreateState(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: StateCreate) => {
      const { data } = await api.post<CharacterState>(`/works/${workId}/states`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: stateKeys.all(workId) }),
  });
}

export function useUpdateState(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: StateUpdate }) => {
      const { data } = await api.put<CharacterState>(`/works/${workId}/states/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: stateKeys.all(workId) }),
  });
}

export function useDeleteState(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/works/${workId}/states/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: stateKeys.all(workId) }),
  });
}