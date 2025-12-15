import type { PromptEngineeringPreset } from '../../types/promptEngineering';

function makeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

export function createEmptyPreset(name: string): PromptEngineeringPreset {
  const now = Date.now();
  return {
    id: makeId(),
    name,
    createdAt: now,
    updatedAt: now,
    source: 'manual',
  };
}

type ExportedPresetFileV1 = {
  type: 'tavernstudio.promptEngineeringPreset';
  version: 1;
  exportedAt: string;
  preset: PromptEngineeringPreset;
};

export function exportPresetAsFile(preset: PromptEngineeringPreset) {
  const data: ExportedPresetFileV1 = {
    type: 'tavernstudio.promptEngineeringPreset',
    version: 1,
    exportedAt: new Date().toISOString(),
    preset,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${preset.name.toLowerCase().replace(/\s+/g, '-')}-prompt-preset.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function parseJsonFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text) as unknown;
}
