import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export interface AIStatus {
  configured: boolean;
  base_url: string;
  model: string;
  temperature: number;
}

export interface OutlineVolume {
  title: string;
  summary: string;
  target_words?: number;
}

export interface ChapterItem {
  title: string;
  summary: string;
  chapter_type?: string;
}

export interface CharacterSuggestion {
  name: string;
  aliases?: string;
  age?: number;
  gender?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  motivation?: string;
  arc?: string;
  speech_style?: string;
  ability?: string;
}

export interface EventSuggestion {
  title: string;
  event_type: string;
  story_time?: string;
  importance?: number;
  description?: string;
}

export interface ConsistencyIssue {
  severity: "high" | "medium" | "low";
  category: string;
  quote?: string;
  explanation?: string;
  suggestion?: string;
}

export interface ConsistencyResult {
  work_id: number;
  issues: ConsistencyIssue[];
  summary: string;
}

export const aiKeys = {
  all: ["ai"] as const,
};

// ---------- outline ----------

export function useSuggestOutline(workId: number) {
  return useMutation({
    mutationFn: async (payload: { volume_count: number; target_words?: number }) => {
      const { data } = await api.post<{
        work_id: number;
        volumes: OutlineVolume[];
      }>("/ai/suggest/outline", { work_id: workId, ...payload });
      return data;
    },
  });
}

// ---------- chapters ----------

export function useSuggestChapters(workId: number) {
  return useMutation({
    mutationFn: async (payload: { volume_id: number; target_chapter_count: number }) => {
      const { data } = await api.post<{
        volume_id: number;
        chapters: ChapterItem[];
      }>("/ai/suggest/chapters", { work_id: workId, ...payload });
      return data;
    },
  });
}

// ---------- character ----------

export function useSuggestCharacter(workId: number) {
  return useMutation({
    mutationFn: async (payload: { role: string; extra_hint?: string }) => {
      const { data } = await api.post<{
        character: CharacterSuggestion;
      }>("/ai/suggest/character", { work_id: workId, ...payload });
      return data;
    },
  });
}

// ---------- event ----------

export function useSuggestEvent(workId: number) {
  return useMutation({
    mutationFn: async (payload: { count: number; current_summary?: string }) => {
      const { data } = await api.post<{
        events: EventSuggestion[];
      }>("/ai/suggest/event", { work_id: workId, ...payload });
      return data;
    },
  });
}

// ---------- consistency ----------

export function useCheckConsistency(workId: number) {
  return useMutation({
    mutationFn: async (payload: { new_content: string }) => {
      const { data } = await api.post<ConsistencyResult>(
        "/ai/check/consistency",
        { work_id: workId, ...payload }
      );
      return data;
    },
  });
}

// ---------- chat ----------

export function useAIChat(workId?: number) {
  return useMutation({
    mutationFn: async (question: string) => {
      const { data } = await api.post<{ answer: string }>("/ai/chat", {
        work_id: workId,
        question,
      });
      return data;
    },
  });
}

// ---------- continue / expand ----------

export function useSuggestContinue(workId: number) {
  return useMutation({
    mutationFn: async (payload: {
      chapter_id: number;
      target_chars?: number;
      tail_chars?: number;
    }) => {
      const { data } = await api.post<{ text: string }>("/ai/suggest/continue", {
        work_id: workId,
        ...payload,
      });
      return data;
    },
  });
}

export function useSuggestExpand(workId: number) {
  return useMutation({
    mutationFn: async (payload: {
      selection: string;
      target_chars?: number;
    }) => {
      const { data } = await api.post<{ text: string }>("/ai/suggest/expand", {
        work_id: workId,
        ...payload,
      });
      return data;
    },
  });
}

// ---------- invalidate all ----------

export function useInvalidateAI() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: aiKeys.all });
}