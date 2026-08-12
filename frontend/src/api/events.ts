import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  Event,
  EventCharacter,
  EventCreate,
  EventLink,
  EventLinkKind,
  EventUpdate,
  EventWithRelations,
} from "@/types/event";

export const eventKeys = {
  all: (workId: number) => ["works", workId, "events"] as const,
  list: (workId: number, params?: Record<string, unknown>) =>
    [...eventKeys.all(workId), "list", params ?? {}] as const,
  detail: (workId: number, id: number) =>
    [...eventKeys.all(workId), "detail", id] as const,
};

export function useEvents(workId: number, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: eventKeys.list(workId, params),
    queryFn: async () => {
      const { data } = await api.get<Event[]>(`/works/${workId}/events`, {
        params: params ?? {},
      });
      return data;
    },
    enabled: workId > 0,
  });
}

export function useEvent(workId: number, eventId?: number) {
  return useQuery({
    queryKey: eventKeys.detail(workId, eventId ?? -1),
    queryFn: async () => {
      const { data } = await api.get<EventWithRelations>(
        `/works/${workId}/events/${eventId}`
      );
      return data;
    },
    enabled: workId > 0 && typeof eventId === "number" && eventId > 0,
  });
}

export function useCreateEvent(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EventCreate) => {
      const { data } = await api.post<Event>(`/works/${workId}/events`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all(workId) }),
  });
}

export function useUpdateEvent(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: EventUpdate }) => {
      const { data } = await api.put<Event>(`/works/${workId}/events/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: eventKeys.all(workId) });
      qc.setQueryData(eventKeys.detail(workId, data.id), (old: EventWithRelations | undefined) =>
        old ? { ...old, ...data } : data
      );
    },
  });
}

export function useDeleteEvent(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/works/${workId}/events/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all(workId) }),
  });
}

export function useAddEventCharacter(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      payload,
    }: {
      eventId: number;
      payload: { character_id: number; role?: string; note?: string };
    }) => {
      const { data } = await api.post<EventCharacter>(
        `/works/${workId}/events/${eventId}/characters`,
        payload
      );
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: eventKeys.detail(workId, vars.eventId) });
    },
  });
}

export function useRemoveEventCharacter(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, linkId }: { eventId: number; linkId: number }) => {
      await api.delete(`/works/${workId}/events/${eventId}/characters/${linkId}`);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: eventKeys.detail(workId, vars.eventId) });
    },
  });
}

export function useAddEventLink(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      payload,
    }: {
      eventId: number;
      payload: { source_event_id: number; target_event_id: number; link_type?: EventLinkKind; note?: string };
    }) => {
      const { data } = await api.post<EventLink>(
        `/works/${workId}/events/${eventId}/links`,
        payload
      );
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: eventKeys.detail(workId, vars.eventId) });
      qc.invalidateQueries({ queryKey: eventKeys.detail(workId, vars.payload.target_event_id) });
    },
  });
}

export function useRemoveEventLink(workId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, linkId }: { eventId: number; linkId: number }) => {
      await api.delete(`/works/${workId}/events/${eventId}/links/${linkId}`);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: eventKeys.detail(workId, vars.eventId) });
    },
  });
}