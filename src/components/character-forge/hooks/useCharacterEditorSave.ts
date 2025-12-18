import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  useCreateCharacterCard, 
  useUpdateCharacterCard 
} from '../../../hooks/queries/useCharacterCards';
import { showToast } from '../../ui/toast';
import { validateCharacterCard } from '../ValidationBadge';
import { getCharacterEditorDraftSnapshot, useCharacterEditorStore } from '../../../store/characterEditorStore';

interface UseCharacterEditorSaveProps {
  cardId: string | null;
  onSaved: (id: string) => void;
}

export function useCharacterEditorSave({ cardId, onSaved }: UseCharacterEditorSaveProps) {
  const isCreating = !cardId;
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createCard = useCreateCharacterCard();
  const updateCard = useUpdateCharacterCard();
  const markSavedIfVersionMatches = useCharacterEditorStore((s) => s.markSavedIfVersionMatches);

  const handleSave = useCallback(async (opts?: { silent?: boolean; reason?: 'manual' | 'autosave' | 'hotkey' }) => {
    const silent = Boolean(opts?.silent);
    const saveDirtyVersion = useCharacterEditorStore.getState().dirtyVersion;
    const draft = getCharacterEditorDraftSnapshot();
    
    // Validation
    const validationMessages = validateCharacterCard(draft);
    const hasErrors = validationMessages.some((m) => m.level === 'error');
    if (hasErrors) {
      if (!silent) showToast({ message: 'Please fix errors before saving', type: 'error' });
      return;
    }
    
    try {
      if (isCreating) {
        const result = await createCard.mutateAsync(draft);
        if (!silent) showToast({ message: 'Character created', type: 'success' });
        markSavedIfVersionMatches(saveDirtyVersion);
        setLastSavedAt(Date.now());
        onSaved(result.id);
      } else {
        await updateCard.mutateAsync({ id: cardId!, card: draft });
        if (!silent) showToast({ message: 'Character saved', type: 'success' });
        markSavedIfVersionMatches(saveDirtyVersion);
        setLastSavedAt(Date.now());
        onSaved(cardId!);
      }
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : 'Save failed',
        type: 'error',
      });
    }
  }, [cardId, createCard, isCreating, markSavedIfVersionMatches, onSaved, updateCard]);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const isSaving = createCard.isPending || updateCard.isPending;
  const pendingRef = useRef(false);
  pendingRef.current = isSaving;

  // Ctrl/Cmd+S save hotkey
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isSave = (e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey);
      if (!isSave) return;
      e.preventDefault();
      e.stopPropagation();

      if (pendingRef.current) return;
      void handleSaveRef.current({ silent: false, reason: 'hotkey' });
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true } as any);
  }, []);

  // Autosave scheduling
  useEffect(() => {
    const clearIdle = () => {
      if (idleSaveTimerRef.current) clearTimeout(idleSaveTimerRef.current);
      idleSaveTimerRef.current = null;
    };

    const scheduleIdle = () => {
      clearIdle();
      idleSaveTimerRef.current = setTimeout(() => {
        const state = useCharacterEditorStore.getState();
        if (!state.isDirty || pendingRef.current) return;
        void handleSaveRef.current({ silent: true, reason: 'autosave' });
      }, 2_000);
    };

    const unsub = useCharacterEditorStore.subscribe(
      (s) => s.dirtyVersion,
      () => scheduleIdle()
    );

    autosaveTimerRef.current = setInterval(() => {
      const state = useCharacterEditorStore.getState();
      if (!state.isDirty || pendingRef.current) return;
      void handleSaveRef.current({ silent: true, reason: 'autosave' });
    }, 60_000);

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return;
      const state = useCharacterEditorStore.getState();
      if (!state.isDirty || pendingRef.current) return;
      void handleSaveRef.current({ silent: true, reason: 'autosave' });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      unsub();
      clearIdle();
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return {
    handleSave,
    isSaving,
    lastSavedAt,
  };
}

