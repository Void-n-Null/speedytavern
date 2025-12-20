/**
 * TanStack Query hooks for character card operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { characterCards } from '../../api/characterCards';
import type { CharacterCardRecordMeta } from '../../types/characterCard';

// ============ Queries ============

/** Fetch list of all character cards (metadata only) */
export function useCharacterCards() {
  return useQuery({
    queryKey: queryKeys.characterCards.list(),
    queryFn: () => characterCards.list(),
  });
}

/** Fetch a single character card with full data */
export function useCharacterCard(cardId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.characterCards.detail(cardId ?? ''),
    queryFn: () => characterCards.get(cardId!),
    enabled: !!cardId,
  });
}

/** Get avatar URL for a character card */
export function useCharacterAvatarUrl(cardId: string | undefined, version?: string | null) {
  if (!cardId) return undefined;
  return characterCards.getAvatarUrl(cardId, version);
}

/** Helper to get versioned avatar URL (for cache busting) */
export function getAvatarUrlVersioned(cardId: string, sha256?: string | null) {
  return characterCards.getAvatarUrl(cardId, sha256);
}

/** Helper to get export PNG URL */
export function getExportPngUrl(cardId: string) {
  return characterCards.getExportPngUrl(cardId);
}

/** Helper to get export JSON URL */
export function getExportJsonUrl(cardId: string) {
  return characterCards.getExportJsonUrl(cardId);
}

// ============ Mutations ============

/** Import a PNG character card */
export function useImportPngCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => characterCards.importPng(file),
    onSuccess: (newCard) => {
      queryClient.setQueryData<CharacterCardRecordMeta[]>(
        queryKeys.characterCards.list(),
        (old) => {
          const meta: CharacterCardRecordMeta = {
            id: newCard.id,
            name: newCard.name,
            spec: newCard.spec,
            spec_version: newCard.spec_version,
            source: newCard.source,
            creator: newCard.creator,
            created_at: newCard.created_at,
            updated_at: newCard.updated_at,
            png_mime: newCard.png_mime,
            png_sha256: newCard.png_sha256,
            has_png: newCard.has_png,
          };
          return old ? [meta, ...old] : [meta];
        }
      );
    },
  });
}

/** Import a JSON character card */
export function useImportJsonCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: Record<string, unknown>) => characterCards.importJson(json),
    onSuccess: (newCard) => {
      queryClient.setQueryData<CharacterCardRecordMeta[]>(
        queryKeys.characterCards.list(),
        (old) => {
          const meta: CharacterCardRecordMeta = {
            id: newCard.id,
            name: newCard.name,
            spec: newCard.spec,
            spec_version: newCard.spec_version,
            source: newCard.source,
            creator: newCard.creator,
            created_at: newCard.created_at,
            updated_at: newCard.updated_at,
          };
          return old ? [meta, ...old] : [meta];
        }
      );
    },
  });
}

/** Update a character card */
export function useUpdateCharacterCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, card }: { id: string; card: Record<string, unknown> }) =>
      characterCards.update(id, card),
    onSuccess: (updatedCard) => {
      queryClient.setQueryData<CharacterCardRecordMeta[]>(
        queryKeys.characterCards.list(),
        (old) =>
          old?.map((c) =>
            c.id === updatedCard.id
              ? {
                  ...c,
                  name: updatedCard.name,
                  spec: updatedCard.spec,
                  spec_version: updatedCard.spec_version,
                  creator: updatedCard.creator,
                  updated_at: updatedCard.updated_at,
                }
              : c
          )
      );
      queryClient.setQueryData(queryKeys.characterCards.detail(updatedCard.id), updatedCard);
    },
  });
}

/** Delete a character card */
export function useDeleteCharacterCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => characterCards.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<CharacterCardRecordMeta[]>(
        queryKeys.characterCards.list(),
        (old) => old?.filter((c) => c.id !== id)
      );
      queryClient.removeQueries({ queryKey: queryKeys.characterCards.detail(id) });
    },
  });
}

/** Update token count for a character card */
export function useUpdateCardTokenCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, token_count }: { id: string; token_count: number }) =>
      characterCards.updateTokenCount(id, token_count),
    onSuccess: (result, { id }) => {
      queryClient.setQueryData<CharacterCardRecordMeta[]>(
        queryKeys.characterCards.list(),
        (old) =>
          old?.map((c) =>
            c.id === id
              ? {
                  ...c,
                  token_count: result.token_count,
                  token_count_updated_at: result.token_count_updated_at,
                }
              : c
          )
      );
    },
  });
}

/** Update avatar for a character card */
export function useUpdateCardAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      characterCards.updateAvatar(id, file),
    onSuccess: (result, { id }) => {
      queryClient.setQueryData<CharacterCardRecordMeta[]>(
        queryKeys.characterCards.list(),
        (old) =>
          old?.map((c) =>
            c.id === id
              ? { ...c, png_sha256: result.png_sha256, has_png: true }
              : c
          )
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.characterCards.detail(id) });
    },
  });
}

/** Delete avatar from a character card */
export function useDeleteCardAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => characterCards.deleteAvatar(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<CharacterCardRecordMeta[]>(
        queryKeys.characterCards.list(),
        (old) =>
          old?.map((c) =>
            c.id === id
              ? { ...c, png_sha256: undefined, has_png: false }
              : c
          )
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.characterCards.detail(id) });
    },
  });
}

/** Create a new character card */
export function useCreateCharacterCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (card: Record<string, unknown>) => characterCards.create(card),
    onSuccess: (newCard) => {
      queryClient.setQueryData<CharacterCardRecordMeta[]>(
        queryKeys.characterCards.list(),
        (old) => {
          const meta: CharacterCardRecordMeta = {
            id: newCard.id,
            name: newCard.name,
            spec: newCard.spec,
            spec_version: newCard.spec_version,
            source: newCard.source,
            creator: newCard.creator,
            created_at: newCard.created_at,
            updated_at: newCard.updated_at,
          };
          return old ? [meta, ...old] : [meta];
        }
      );
    },
  });
}
