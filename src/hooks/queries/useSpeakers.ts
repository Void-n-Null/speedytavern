/**
 * TanStack Query hooks for speaker operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { speakers } from '../../api/client';
import type { Speaker } from '../../types/chat';

// ============ Queries ============

/** Fetch all speakers */
export function useSpeakers() {
  return useQuery({
    queryKey: queryKeys.speakers.list(),
    queryFn: () => speakers.list(),
    // Speakers rarely change, cache longer
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch single speaker */
export function useSpeaker(speakerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.speakers.detail(speakerId ?? ''),
    queryFn: () => speakers.get(speakerId!),
    enabled: !!speakerId,
  });
}

// ============ Mutations ============

/** Create a new speaker */
export function useCreateSpeaker() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (speaker: Omit<Speaker, 'id'>) => speakers.create(speaker),
    onSuccess: (newSpeaker) => {
      queryClient.setQueryData<Speaker[]>(
        queryKeys.speakers.list(),
        (old) => old ? [...old, newSpeaker] : [newSpeaker]
      );
    },
  });
}

/** Update a speaker */
export function useUpdateSpeaker() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Speaker, 'id'>> }) =>
      speakers.update(id, data),
    onSuccess: (_, { id, data }) => {
      // Update in list cache
      queryClient.setQueryData<Speaker[]>(
        queryKeys.speakers.list(),
        (old) => old?.map(s => s.id === id ? { ...s, ...data } : s)
      );
      // Invalidate detail
      queryClient.invalidateQueries({ queryKey: queryKeys.speakers.detail(id) });
    },
  });
}

/** Delete a speaker */
export function useDeleteSpeaker() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => speakers.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Speaker[]>(
        queryKeys.speakers.list(),
        (old) => old?.filter(s => s.id !== id)
      );
      queryClient.removeQueries({ queryKey: queryKeys.speakers.detail(id) });
    },
  });
}
