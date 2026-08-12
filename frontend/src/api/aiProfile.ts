import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  AIProfile,
  AIProfileCreate,
  AIProfileUpdate,
  AssignmentMap,
} from "@/types/aiProfile";

export const aiProfileKeys = {
  all: ["ai-profiles"] as const,
  list: () => [...aiProfileKeys.all, "list"] as const,
  assignments: () => [...aiProfileKeys.all, "assignments"] as const,
};

export function useAIProfileList() {
  return useQuery({
    queryKey: aiProfileKeys.list(),
    queryFn: async () => {
      const { data } = await api.get<AIProfile[]>("/ai/profiles");
      return data;
    },
  });
}

export function useCreateAIProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AIProfileCreate) => {
      const { data } = await api.post<AIProfile>("/ai/profiles", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiProfileKeys.all });
      qc.invalidateQueries({ queryKey: ["settings", "ai-status"] });
    },
  });
}

export function useUpdateAIProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: AIProfileUpdate;
    }) => {
      const { data } = await api.put<AIProfile>(`/ai/profiles/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiProfileKeys.all });
      qc.invalidateQueries({ queryKey: ["settings", "ai-status"] });
    },
  });
}

export function useDeleteAIProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/ai/profiles/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiProfileKeys.all });
      qc.invalidateQueries({ queryKey: ["settings", "ai-status"] });
    },
  });
}

export function useSetDefaultAIProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.put<AIProfile>(`/ai/profiles/${id}/default`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiProfileKeys.all });
      qc.invalidateQueries({ queryKey: ["settings", "ai-status"] });
    },
  });
}

export function useAssignments() {
  return useQuery({
    queryKey: aiProfileKeys.assignments(),
    queryFn: async () => {
      const { data } = await api.get<{ assignments: AssignmentMap }>(
        "/ai/prompt-assignments"
      );
      return data.assignments;
    },
  });
}

export function useSetAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      promptName,
      profileId,
    }: {
      promptName: string;
      profileId: number | null;
    }) => {
      const { data } = await api.put<{ assignments: AssignmentMap }>(
        `/ai/prompt-assignments/${encodeURIComponent(promptName)}`,
        { profile_id: profileId }
      );
      return data.assignments;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiProfileKeys.assignments() });
      qc.invalidateQueries({ queryKey: ["settings", "ai-status"] });
    },
  });
}

export function useClearAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (promptName: string) => {
      await api.delete(
        `/ai/prompt-assignments/${encodeURIComponent(promptName)}`
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiProfileKeys.assignments() });
      qc.invalidateQueries({ queryKey: ["settings", "ai-status"] });
    },
  });
}