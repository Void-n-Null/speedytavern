import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  defaultPromptEngineeringStore,
  normalizePromptEngineeringStore,
  type PromptEngineeringPreset,
  type PromptEngineeringStore,
} from '../../types/promptEngineering';
import {
  useImportSillyTavernPromptEngineeringPreset,
  usePromptEngineeringStore,
  useSavePromptEngineeringStore,
} from '../../hooks/queries/usePromptEngineering';
import { createEmptyPreset, parseJsonFile } from './promptEngineeringFileUtils';

export type PromptEngineeringModalController = {
  store: PromptEngineeringStore;
  isLoading: boolean;
  selectedId: string | null;
  selectedPreset: PromptEngineeringPreset | null;
  draftPreset: PromptEngineeringPreset | null;
  draftName: string;
  setDraftName: (name: string) => void;
  setDraftPreset: (preset: PromptEngineeringPreset) => void;
  isDirty: boolean;
  isSaving: boolean;

  selectPreset: (id: string) => void;
  createPreset: () => Promise<void>;
  deleteSelectedPreset: () => Promise<void>;
  saveDraft: () => Promise<void>;
  discardDraft: () => void;
  setActiveSelected: () => Promise<void>;

  importFile: (file: File) => Promise<void>;
};

export function usePromptEngineeringModalController(open: boolean): PromptEngineeringModalController {
  const { data: storeData, isLoading } = usePromptEngineeringStore();
  const saveStore = useSavePromptEngineeringStore();
  const importSt = useImportSillyTavernPromptEngineeringPreset();

  const store: PromptEngineeringStore = useMemo(() => {
    return normalizePromptEngineeringStore(storeData ?? defaultPromptEngineeringStore());
  }, [storeData]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftPreset, setDraftPresetState] = useState<PromptEngineeringPreset | null>(null);
  const [draftName, setDraftName] = useState('');

  const selectedPreset = useMemo(() => {
    if (!selectedId) return null;
    return store.presets.find((p) => p.id === selectedId) ?? null;
  }, [selectedId, store.presets]);

  const selectedPresetRef = useRef<PromptEngineeringPreset | null>(null);
  useEffect(() => {
    selectedPresetRef.current = selectedPreset;
  }, [selectedPreset]);

  useEffect(() => {
    if (!open) return;

    const first = store.activePresetId
      ? store.presets.find((p) => p.id === store.activePresetId) ?? store.presets[0]
      : store.presets[0];

    if (!first) {
      setSelectedId(null);
      setDraftPresetState(null);
      setDraftName('');
      return;
    }

    setSelectedId(first.id);
  }, [open, store.activePresetId, store.presets]);

  useEffect(() => {
    if (!selectedPreset) {
      setDraftPresetState(null);
      setDraftName('');
      return;
    }
    setDraftPresetState(selectedPreset);
    setDraftName(selectedPreset.name);
  }, [selectedPreset]);

  const isDirty = useMemo(() => {
    if (!draftPreset || !selectedPreset) return false;
    if (draftName !== selectedPreset.name) return true;
    return JSON.stringify(draftPreset) !== JSON.stringify(selectedPreset);
  }, [draftName, draftPreset, selectedPreset]);

  const setDraftPreset = useCallback((preset: PromptEngineeringPreset) => {
    setDraftPresetState(preset);
  }, []);

  const selectPreset = useCallback(
    (id: string) => {
      setSelectedId(id);
    },
    []
  );

  const createPreset = useCallback(async () => {
    const base = 'New Preset';
    const taken = new Set(store.presets.map((p) => p.name.toLowerCase()));
    let name = base;
    let i = 2;
    while (taken.has(name.toLowerCase())) {
      name = `${base} ${i}`;
      i++;
    }

    const preset = createEmptyPreset(name);
    const nextStore: PromptEngineeringStore = {
      version: 1,
      activePresetId: preset.id,
      presets: [...store.presets, preset],
    };

    await saveStore.mutateAsync({ store: nextStore });
    setSelectedId(preset.id);
  }, [saveStore, store.presets]);

  const deleteSelectedPreset = useCallback(async () => {
    if (!selectedPresetRef.current) return;

    const remaining = store.presets.filter((p) => p.id !== selectedPresetRef.current!.id);
    const nextActive = remaining[0]?.id ?? null;

    const nextStore: PromptEngineeringStore = {
      version: 1,
      activePresetId: nextActive,
      presets: remaining,
    };

    await saveStore.mutateAsync({ store: nextStore });
    setSelectedId(nextActive);
  }, [saveStore, store.presets]);

  const saveDraft = useCallback(async () => {
    if (!draftPreset) return;

    const nextPreset: PromptEngineeringPreset = {
      ...draftPreset,
      name: draftName.trim() || draftPreset.name,
      updatedAt: Date.now(),
    };

    const existed = store.presets.some((p) => p.id === nextPreset.id);
    const presets = existed
      ? store.presets.map((p) => (p.id === nextPreset.id ? nextPreset : p))
      : [...store.presets, nextPreset];

    const nextStore: PromptEngineeringStore = {
      version: 1,
      activePresetId: selectedId ?? nextPreset.id,
      presets,
    };

    await saveStore.mutateAsync({ store: nextStore });
  }, [draftName, draftPreset, saveStore, selectedId, store.presets]);

  const discardDraft = useCallback(() => {
    const current = selectedPresetRef.current;
    if (!current) return;
    setDraftPresetState(current);
    setDraftName(current.name);
  }, []);

  const setActiveSelected = useCallback(async () => {
    if (!selectedPresetRef.current) return;

    const nextStore: PromptEngineeringStore = {
      version: 1,
      activePresetId: selectedPresetRef.current.id,
      presets: store.presets,
    };

    await saveStore.mutateAsync({ store: nextStore });
  }, [saveStore, store.presets]);

  const importFile = useCallback(
    async (file: File) => {
      const json = await parseJsonFile(file);

      if (
        json &&
        typeof json === 'object' &&
        (json as any).type === 'tavernstudio.promptEngineeringPreset' &&
        (json as any).version === 1 &&
        (json as any).preset &&
        typeof (json as any).preset === 'object'
      ) {
        const preset = (json as any).preset as PromptEngineeringPreset;
        const nextStore: PromptEngineeringStore = {
          version: 1,
          activePresetId: preset.id,
          presets: [...store.presets.filter((p) => p.id !== preset.id), preset],
        };

        await saveStore.mutateAsync({ store: nextStore });
        setSelectedId(preset.id);
        return;
      }

      const next = await importSt.mutateAsync({ json });
      setSelectedId(next.activePresetId ?? null);
    },
    [importSt, saveStore, store.presets]
  );

  return {
    store,
    isLoading,
    selectedId,
    selectedPreset,
    draftPreset,
    draftName,
    setDraftName,
    setDraftPreset,
    isDirty,
    isSaving: saveStore.isPending,
    selectPreset,
    createPreset,
    deleteSelectedPreset,
    saveDraft,
    discardDraft,
    setActiveSelected,
    importFile,
  };
}
