import type {
  StContextTemplate,
  StInstructTemplate,
  StOutputTemplate,
  StReasoningTemplate,
  StSystemPromptTemplate,
} from '../lib/sillyTavernAdvancedFormatting';
import type { PromptLayout } from '../lib/promptLayout';

export type PromptEngineeringMode = 'chat' | 'text';

export type PromptEngineeringPreset = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  mode: PromptEngineeringMode;
  source: 'manual' | 'sillytavern';
  instruct?: StInstructTemplate;
  context?: StContextTemplate;
  sysprompt?: StSystemPromptTemplate;
  reasoning?: StReasoningTemplate;
  /** New unified output settings (reasoning + stop strings + response processing) */
  output?: StOutputTemplate;
  /** Prompt block ordering for Chat Completion APIs */
  promptLayout?: PromptLayout;
  unknownSections?: Record<string, unknown>;
};

export type PromptEngineeringStoreV1 = {
  version: 1;
  activePresetId: string | null;
  presets: PromptEngineeringPreset[];
};

export type PromptEngineeringStore = PromptEngineeringStoreV1;

export function defaultPromptEngineeringStore(): PromptEngineeringStoreV1 {
  return { version: 1, activePresetId: null, presets: [] };
}

export function normalizePromptEngineeringStore(input: unknown): PromptEngineeringStore {
  if (!input || typeof input !== 'object') return defaultPromptEngineeringStore();
  const r = input as Record<string, unknown>;
  const version = r.version;
  if (version !== 1) return defaultPromptEngineeringStore();

  const presets = Array.isArray(r.presets) ? (r.presets as unknown[]) : [];
  const parsedPresets: PromptEngineeringPreset[] = [];
  for (const p of presets) {
    if (!p || typeof p !== 'object') continue;
    const pr = p as Record<string, unknown>;
    const id = typeof pr.id === 'string' ? pr.id : null;
    const name = typeof pr.name === 'string' ? pr.name : null;
    if (!id || !name) continue;

    const createdAt = typeof pr.createdAt === 'number' ? pr.createdAt : Date.now();
    const updatedAt = typeof pr.updatedAt === 'number' ? pr.updatedAt : createdAt;
    const source = pr.source === 'sillytavern' || pr.source === 'manual' ? pr.source : 'manual';

    const mode =
      pr.mode === 'chat' || pr.mode === 'text'
        ? pr.mode
        : pr.promptLayout || !pr.context
        ? 'chat'
        : 'text';

    const preset: PromptEngineeringPreset = {
      id,
      name,
      createdAt,
      updatedAt,
      source,
      mode,
      ...(pr.instruct ? { instruct: pr.instruct as any } : {}),
      ...(pr.context ? { context: pr.context as any } : {}),
      ...(pr.sysprompt ? { sysprompt: pr.sysprompt as any } : {}),
      ...(pr.reasoning ? { reasoning: pr.reasoning as any } : {}),
      ...(pr.output ? { output: pr.output as any } : {}),
      ...(pr.promptLayout ? { promptLayout: pr.promptLayout as any } : {}),
      ...(pr.unknownSections && typeof pr.unknownSections === 'object'
        ? { unknownSections: pr.unknownSections as Record<string, unknown> }
        : {}),
    };

    parsedPresets.push(preset);
  }

  const activePresetId = typeof r.activePresetId === 'string' ? r.activePresetId : null;
  const activeValid = activePresetId && parsedPresets.some((p) => p.id === activePresetId) ? activePresetId : null;

  return {
    version: 1,
    activePresetId: activeValid ?? null,
    presets: parsedPresets,
  };
}

export function upsertPromptEngineeringPresetByName(
  store: PromptEngineeringStore,
  preset: PromptEngineeringPreset
): PromptEngineeringStore {
  const now = Date.now();
  const existingIndex = store.presets.findIndex((p) => p.name.toLowerCase() === preset.name.toLowerCase());

  const nextPreset: PromptEngineeringPreset = {
    ...preset,
    updatedAt: now,
    createdAt: preset.createdAt ?? now,
  };

  const nextPresets = store.presets.slice();
  if (existingIndex >= 0) nextPresets[existingIndex] = nextPreset;
  else nextPresets.push(nextPreset);

  const activePresetId = store.activePresetId ?? nextPreset.id;

  return {
    version: 1,
    activePresetId,
    presets: nextPresets,
  };
}
