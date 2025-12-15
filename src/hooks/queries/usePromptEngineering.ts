import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settings } from '../../api/client';
import { queryKeys } from '../../lib/queryClient';
import type { PromptEngineeringPreset, PromptEngineeringStore } from '../../types/promptEngineering';
import {
  defaultPromptEngineeringStore,
  normalizePromptEngineeringStore,
  upsertPromptEngineeringPresetByName,
} from '../../types/promptEngineering';
import { importSillyTavernAdvancedFormattingJson } from '../../lib/sillyTavernAdvancedFormatting';
import { promptEngineeringPresetFromSillyTavernImport } from '../../lib/promptEngineeringPresets';

export const PROMPT_ENGINEERING_SETTINGS_KEY = 'promptEngineering';

export function usePromptEngineeringStore() {
  return useQuery({
    queryKey: queryKeys.settings.detail(PROMPT_ENGINEERING_SETTINGS_KEY),
    queryFn: async (): Promise<PromptEngineeringStore> => {
      try {
        const res = await settings.get<unknown>(PROMPT_ENGINEERING_SETTINGS_KEY);
        return normalizePromptEngineeringStore(res.value);
      } catch {
        return defaultPromptEngineeringStore();
      }
    },
  });
}

export function useUpsertPromptEngineeringPreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ preset }: { preset: PromptEngineeringPreset }): Promise<PromptEngineeringStore> => {
      const currentRaw = await settings
        .get<unknown>(PROMPT_ENGINEERING_SETTINGS_KEY)
        .then((r) => r.value)
        .catch(() => defaultPromptEngineeringStore());

      const current = normalizePromptEngineeringStore(currentRaw);
      const next = upsertPromptEngineeringPresetByName(current, preset);
      await settings.set(PROMPT_ENGINEERING_SETTINGS_KEY, next);
      return next;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.settings.detail(PROMPT_ENGINEERING_SETTINGS_KEY), next);
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}

export function useSavePromptEngineeringStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ store }: { store: PromptEngineeringStore }): Promise<PromptEngineeringStore> => {
      const normalized = normalizePromptEngineeringStore(store);
      await settings.set(PROMPT_ENGINEERING_SETTINGS_KEY, normalized);
      return normalized;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.settings.detail(PROMPT_ENGINEERING_SETTINGS_KEY), next);
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}

export function useImportSillyTavernPromptEngineeringPreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ json }: { json: unknown }): Promise<PromptEngineeringStore> => {
      const imported = importSillyTavernAdvancedFormattingJson(json);
      const preset = promptEngineeringPresetFromSillyTavernImport(imported);
      const currentRaw = await settings
        .get<unknown>(PROMPT_ENGINEERING_SETTINGS_KEY)
        .then((r) => r.value)
        .catch(() => defaultPromptEngineeringStore());

      const current = normalizePromptEngineeringStore(currentRaw);
      const next = upsertPromptEngineeringPresetByName(current, preset);
      const nextWithActive: PromptEngineeringStore = {
        ...next,
        activePresetId: preset.id,
      };
      await settings.set(PROMPT_ENGINEERING_SETTINGS_KEY, nextWithActive);
      return nextWithActive;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.settings.detail(PROMPT_ENGINEERING_SETTINGS_KEY), next);
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}
