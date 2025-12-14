/**
 * React Query hooks for character cards CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CharacterCardRecord, CharacterCardRecordMeta } from '../../types/characterCard';

const API_BASE = '/api/character-cards';

// ============ Query Keys ============
export const characterCardKeys = {
  all: ['character-cards'] as const,
  lists: () => [...characterCardKeys.all, 'list'] as const,
  list: () => [...characterCardKeys.lists()] as const,
  details: () => [...characterCardKeys.all, 'detail'] as const,
  detail: (id: string) => [...characterCardKeys.details(), id] as const,
};

// ============ List All Cards ============
export function useCharacterCards() {
  return useQuery({
    queryKey: characterCardKeys.list(),
    queryFn: async (): Promise<CharacterCardRecordMeta[]> => {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('Failed to fetch character cards');
      return res.json();
    },
    staleTime: 30_000,
  });
}

// ============ Update Token Count (computed client-side) ============
export function useUpdateCardTokenCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, token_count }: { id: string; token_count: number }): Promise<{ success: boolean; token_count: number; token_count_updated_at: number }> => {
      const res = await fetch(`${API_BASE}/${id}/token-count`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_count }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to update token count');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<CharacterCardRecordMeta[] | undefined>(characterCardKeys.list(), (prev) => {
        if (!prev) return prev;
        return prev.map((c) =>
          c.id === variables.id
            ? { ...c, token_count: data.token_count, token_count_updated_at: data.token_count_updated_at }
            : c
        );
      });
    },
  });
}

// ============ Get Single Card ============
export function useCharacterCard(id: string | null) {
  return useQuery({
    queryKey: id ? characterCardKeys.detail(id) : ['null'],
    queryFn: async (): Promise<CharacterCardRecord> => {
      if (!id) throw new Error('No card ID provided');
      const res = await fetch(`${API_BASE}/${id}`);
      if (!res.ok) throw new Error('Failed to fetch character card');
      return res.json();
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

// ============ Create Card ============
export function useCreateCharacterCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (card: Record<string, unknown>): Promise<CharacterCardRecord> => {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to create character card');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: characterCardKeys.lists() });
    },
  });
}

// ============ Update Card ============
export function useUpdateCharacterCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, card }: { id: string; card: Record<string, unknown> }): Promise<CharacterCardRecord> => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to update character card');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: characterCardKeys.lists() });
      queryClient.invalidateQueries({ queryKey: characterCardKeys.detail(data.id) });
    },
  });
}

// ============ Update Avatar ============
export function useUpdateCardAvatar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }): Promise<{ success: boolean; png_sha256: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`${API_BASE}/${id}/avatar`, {
        method: 'PATCH',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to update avatar');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: characterCardKeys.lists() });
      queryClient.invalidateQueries({ queryKey: characterCardKeys.detail(variables.id) });
    },
  });
}

// ============ Remove Avatar ============
export function useDeleteCardAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/${id}/avatar`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to remove avatar');
      }
      return res.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: characterCardKeys.lists() });
      queryClient.invalidateQueries({ queryKey: characterCardKeys.detail(id) });
    },
  });
}

// ============ Delete Card ============
export function useDeleteCharacterCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean; deleted: string }> => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to delete character card');
      }
      return res.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: characterCardKeys.lists() });
      queryClient.removeQueries({ queryKey: characterCardKeys.detail(id) });
    },
  });
}

// ============ Import PNG ============
export function useImportPngCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file: File): Promise<CharacterCardRecord> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`${API_BASE}/import/png`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to import PNG');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: characterCardKeys.lists() });
    },
  });
}

// ============ Import JSON ============
export function useImportJsonCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (json: Record<string, unknown>): Promise<CharacterCardRecord> => {
      const res = await fetch(`${API_BASE}/import/json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to import JSON');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: characterCardKeys.lists() });
    },
  });
}

// ============ Helpers ============
export function getAvatarUrl(id: string): string {
  return `${API_BASE}/${id}/avatar`;
}

export function getAvatarUrlVersioned(id: string, version?: string | null): string {
  // Bust browser cache when the underlying blob changes (sha changes on update).
  return version ? `${API_BASE}/${id}/avatar?v=${encodeURIComponent(version)}` : `${API_BASE}/${id}/avatar`;
}

export function getExportPngUrl(id: string): string {
  return `${API_BASE}/${id}/export/png`;
}

export function getExportJsonUrl(id: string): string {
  return `${API_BASE}/${id}/export/json`;
}

