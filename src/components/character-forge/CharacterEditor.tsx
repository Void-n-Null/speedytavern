/**
 * CharacterEditor - Full character card editing interface.
 * 
 * Supports both creating new cards and editing existing ones.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Save, User, FileText, MessageSquare, Wand2, Settings2, Tag, StickyNote } from 'lucide-react';
import { 
  useCharacterCard, 
  useCreateCharacterCard, 
  useUpdateCharacterCard,
  useUpdateCardAvatar,
  useDeleteCardAvatar,
  useImportPngCard,
  useImportJsonCard,
  getAvatarUrlVersioned,
  getExportPngUrl,
  getExportJsonUrl,
} from '../../hooks/queries/useCharacterCards';
import type { TavernCardV2 } from '../../types/characterCard';
import { Button } from '../ui/button';
import { showToast } from '../ui/toast';
import { ValidationBadge, validateCharacterCard, type ValidationLevel } from './ValidationBadge';
import { ImportExportBar } from './ImportExportBar';
import { AvatarSection } from './sections/AvatarSection';
import { CoreFieldsSection } from './sections/CoreFieldsSection';
import { GreetingSection } from './sections/GreetingSection';
import { ExampleMessagesSection } from './sections/ExampleMessagesSection';
import { PromptOverridesSection } from './sections/PromptOverridesSection';
import { CreatorMetadataSection } from './sections/CreatorMetadataSection';
import { CharacterNoteSection } from './sections/CharacterNoteSection';
import { TokenBudgetBar } from './detail/TokenBudgetBar';
import { CharacterDetailInsights } from './detail/CharacterDetailInsights';
import { cn } from '../../lib/utils';
import { extractCardFromPngFile } from '../../utils/cardPng';

interface CharacterEditorProps {
  cardId: string | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}

type EditorSection = 'core' | 'greetings' | 'examples' | 'prompts' | 'metadata' | 'note';

const SECTIONS: Array<{ id: EditorSection; label: string; icon: typeof User }> = [
  { id: 'core', label: 'Core', icon: FileText },
  { id: 'greetings', label: 'Greetings', icon: MessageSquare },
  { id: 'examples', label: 'Examples', icon: Wand2 },
  { id: 'prompts', label: 'Prompts', icon: Settings2 },
  { id: 'metadata', label: 'Metadata', icon: Tag },
  { id: 'note', label: 'Note', icon: StickyNote },
];

// Default V2 card structure
function createEmptyCard(): TavernCardV2 {
  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: '',
      description: '',
      personality: '',
      scenario: '',
      first_mes: '',
      mes_example: '',
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      tags: [],
      creator: '',
      character_version: '',
      extensions: {},
    },
  };
}

function normalizeToV2Card(input: unknown): TavernCardV2 {
  if (input && typeof input === 'object') {
    const parsed = input as any;
    if (parsed.spec === 'chara_card_v2' || parsed.spec === 'chara_card_v3') {
      return parsed as TavernCardV2;
    }
    if (parsed.data && typeof parsed.data === 'object') {
      // Looks like V2-ish; trust it.
      return parsed as TavernCardV2;
    }
    // V1 card - wrap in V2 structure
    return {
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: parsed.name || '',
        description: parsed.description || '',
        personality: parsed.personality || '',
        scenario: parsed.scenario || '',
        first_mes: parsed.first_mes || '',
        mes_example: parsed.mes_example || '',
        creator_notes: '',
        system_prompt: '',
        post_history_instructions: '',
        alternate_greetings: [],
        tags: [],
        creator: '',
        character_version: '',
        extensions: {},
      },
    };
  }
  return createEmptyCard();
}

export function CharacterEditor({ cardId, onClose, onSaved }: CharacterEditorProps) {
  const isCreating = !cardId;
  const [activeSection, setActiveSection] = useState<EditorSection>('core');
  const [isDirty, setIsDirty] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [totalTokens, setTotalTokens] = useState<number | null>(null);
  // Monotonic counter for local edits. Used to avoid "late save response clears dirty state"
  // when the user typed more while a save was in flight.
  const dirtyVersionRef = useRef(0);
  const [dirtyVersion, setDirtyVersion] = useState(0);
  
  // Form state - matches V2 data structure
  const [formData, setFormData] = useState<TavernCardV2>(createEmptyCard());
  
  // Queries
  const { data: existingCard, isLoading } = useCharacterCard(cardId);
  const createCard = useCreateCharacterCard();
  const updateCard = useUpdateCharacterCard();
  const updateAvatar = useUpdateCardAvatar();
  const deleteAvatar = useDeleteCardAvatar();
  const importPng = useImportPngCard();
  const importJson = useImportJsonCard();

  useEffect(() => {
    if (existingCard?.updated_at) setLastSavedAt(existingCard.updated_at);
  }, [existingCard?.updated_at]);
  
  // Load existing card data
  useEffect(() => {
    if (existingCard && existingCard.raw_json) {
      try {
        const parsed = JSON.parse(existingCard.raw_json);
        setFormData(normalizeToV2Card(parsed));
      } catch {
        // Invalid JSON, start fresh
        setFormData(createEmptyCard());
      }
    }
  }, [existingCard]);
  
  // Helper to update nested data fields
  const updateData = <K extends keyof TavernCardV2['data']>(
    field: K, 
    value: TavernCardV2['data'][K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        [field]: value,
      },
    }));
    dirtyVersionRef.current += 1;
    setDirtyVersion(dirtyVersionRef.current);
    setIsDirty(true);
  };
  
  // Validation
  const validationMessages = useMemo(() => {
    return validateCharacterCard(formData);
  }, [formData]);

  const editorValidationMessages = useMemo(() => {
    const msgs = [...validationMessages];

    // Editor-only gentle nudges (never block saving).
    if (!formData.data.mes_example?.trim()) {
      msgs.push({ level: 'info', message: 'Example messages are empty', field: 'mes_example' });
    }

    const emptyAlt = (formData.data.alternate_greetings || []).some((g) => !String(g || '').trim());
    if (emptyAlt) {
      msgs.push({ level: 'warning', message: 'One or more alternate greetings are empty', field: 'alternate_greetings' });
    }

    const tags = (formData.data.tags || []).map((t) => String(t || ''));
    if (tags.some((t) => !t.trim())) {
      msgs.push({ level: 'warning', message: 'One or more tags are empty', field: 'tags' });
    }

    return msgs;
  }, [formData.data.alternate_greetings, formData.data.mes_example, formData.data.tags, validationMessages]);
  
  const hasErrors = validationMessages.some((m) => m.level === 'error');

  const approxTokens = useMemo(() => {
    const totalChars = [
      formData.data.description,
      formData.data.personality,
      formData.data.scenario,
      formData.data.first_mes,
      (formData.data.alternate_greetings || []).join('\n\n'),
      formData.data.mes_example,
      formData.data.system_prompt,
      formData.data.post_history_instructions,
      formData.data.creator_notes,
      (formData.data.extensions?.character_note as string) || '',
    ].reduce((a, s) => a + (s || '').length, 0);
    return Math.max(0, Math.round(totalChars / 4));
  }, [
    formData.data.alternate_greetings,
    formData.data.creator_notes,
    formData.data.description,
    formData.data.extensions,
    formData.data.first_mes,
    formData.data.mes_example,
    formData.data.personality,
    formData.data.post_history_instructions,
    formData.data.scenario,
    formData.data.system_prompt,
  ]);

  const sectionIssueSummary = useMemo(() => {
    const fieldToSection: Record<string, EditorSection> = {
      name: 'core',
      description: 'core',
      personality: 'core',
      scenario: 'core',

      first_mes: 'greetings',
      alternate_greetings: 'greetings',

      mes_example: 'examples',

      system_prompt: 'prompts',
      post_history_instructions: 'prompts',

      creator: 'metadata',
      character_version: 'metadata',
      creator_notes: 'metadata',
      tags: 'metadata',

      character_note: 'note',
      note_depth: 'note',
      note_role: 'note',
    };

    const order: Record<ValidationLevel, number> = { error: 0, warning: 1, info: 2, success: 3 };
    const out: Partial<Record<EditorSection, { count: number; worst: ValidationLevel }>> = {};

    for (const msg of editorValidationMessages) {
      if (!msg.field) continue;
      const section = fieldToSection[msg.field];
      if (!section) continue;
      const existing = out[section];
      if (!existing) {
        out[section] = { count: 1, worst: msg.level };
      } else {
        existing.count += 1;
        if (order[msg.level] < order[existing.worst]) existing.worst = msg.level;
      }
    }

    return out;
  }, [editorValidationMessages]);
  
  // Avatar URL for display
  const avatarUrl =
    cardId && existingCard?.has_png ? getAvatarUrlVersioned(cardId, existingCard?.png_sha256) : null;
  
  // Save handler
  const handleSave = useCallback(async (opts?: { silent?: boolean; reason?: 'manual' | 'autosave' | 'hotkey' }) => {
    const silent = Boolean(opts?.silent);
    const saveDirtyVersion = dirtyVersionRef.current;
    if (hasErrors) {
      if (!silent) showToast({ message: 'Please fix errors before saving', type: 'error' });
      return;
    }
    
    try {
      if (isCreating) {
        const result = await createCard.mutateAsync(formData);
        if (!silent) showToast({ message: 'Character created', type: 'success' });
        // In create mode, we navigate to edit and remount anyway, but keep semantics correct.
        if (dirtyVersionRef.current === saveDirtyVersion) {
          setIsDirty(false);
          setLastSavedAt(Date.now());
        }
        onSaved(result.id);
      } else {
        await updateCard.mutateAsync({ id: cardId, card: formData });
        if (!silent) showToast({ message: 'Character saved', type: 'success' });
        // Only clear dirty if nothing changed while the save was in-flight.
        if (dirtyVersionRef.current === saveDirtyVersion) {
          setIsDirty(false);
          setLastSavedAt(Date.now());
        }
        onSaved(cardId);
      }
    } catch (err) {
      // Autosave should not spam; only show toast on failure.
      showToast({
        message: err instanceof Error ? err.message : 'Save failed',
        type: 'error',
      });
    }
  }, [cardId, createCard, formData, hasErrors, isCreating, onSaved, updateCard]);

  // Ctrl/Cmd+S save hotkey (override browser default)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isSave = (e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey);
      if (!isSave) return;
      e.preventDefault();
      e.stopPropagation();

      // Don't enqueue multiple saves.
      if (createCard.isPending || updateCard.isPending) return;
      void handleSave({ silent: false, reason: 'hotkey' });
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true } as any);
  }, [createCard.isPending, handleSave, updateCard.isPending]);

  // Autosave every 60s when dirty (no success toast)
  useEffect(() => {
    if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);

    autosaveTimerRef.current = setInterval(() => {
      if (!isDirty) return;
      if (hasErrors) return;
      if (createCard.isPending || updateCard.isPending) return;

      void handleSave({ silent: true, reason: 'autosave' });
    }, 60_000);

    return () => {
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    };
  }, [createCard.isPending, handleSave, hasErrors, isDirty, updateCard.isPending]);

  // Idle-based autosave: save shortly after the user stops editing.
  useEffect(() => {
    if (idleSaveTimerRef.current) clearTimeout(idleSaveTimerRef.current);

    // Only schedule when there are changes worth saving.
    if (!isDirty) return;
    if (hasErrors) return;
    if (createCard.isPending || updateCard.isPending) return;

    idleSaveTimerRef.current = setTimeout(() => {
      if (!isDirty) return;
      if (hasErrors) return;
      if (createCard.isPending || updateCard.isPending) return;
      void handleSave({ silent: true, reason: 'autosave' });
    }, 2_000);

    return () => {
      if (idleSaveTimerRef.current) clearTimeout(idleSaveTimerRef.current);
      idleSaveTimerRef.current = null;
    };
  }, [createCard.isPending, dirtyVersion, handleSave, hasErrors, isDirty, updateCard.isPending]);

  // If the user switches tabs / hides the page, try to flush a save immediately.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return;
      if (!isDirty) return;
      if (hasErrors) return;
      if (createCard.isPending || updateCard.isPending) return;
      void handleSave({ silent: true, reason: 'autosave' });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [createCard.isPending, handleSave, hasErrors, isDirty, updateCard.isPending]);
  
  // Avatar upload
  const handleAvatarChange = async (file: File) => {
    if (!cardId) {
      showToast({ message: 'Save the character first to upload an avatar', type: 'info' });
      return;
    }
    
    try {
      await updateAvatar.mutateAsync({ id: cardId, file });
      showToast({ message: 'Avatar updated', type: 'success' });
    } catch (err) {
      showToast({ 
        message: err instanceof Error ? err.message : 'Avatar upload failed', 
        type: 'error' 
      });
    }
  };
  
  // Close with dirty check
  const handleClose = () => {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }
    onClose();
  };

  if (isLoading && cardId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-zinc-500">Loading character...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-950/50">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/50 bg-zinc-950/80 px-6 py-4">
        <div>
          <h2 
            className="text-xl font-bold text-zinc-100"
            style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}
          >
            {isCreating ? 'Create Character' : `Edit: ${formData.data.name || 'Unnamed'}`}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {isCreating ? 'Create a new character card' : 'Modify character properties'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {createCard.isPending || updateCard.isPending ? (
            <span className="text-xs text-violet-300">Saving…</span>
          ) : isDirty ? (
            <span className="text-xs text-amber-400">Unsaved changes</span>
          ) : lastSavedAt ? (
            <span className="text-xs text-zinc-500">Saved {new Date(lastSavedAt).toLocaleTimeString()}</span>
          ) : null}
          <Button
            onClick={() => handleSave({ silent: false, reason: 'manual' })}
            disabled={hasErrors || createCard.isPending || updateCard.isPending}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
          >
            <Save className="mr-1.5 h-4 w-4" />
            {createCard.isPending || updateCard.isPending ? 'Saving...' : 'Save'}
          </Button>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Import/Export bar */}
      <div className="shrink-0 border-b border-zinc-800/50 bg-zinc-950/60 px-6 py-2">
        <ImportExportBar
          cardId={cardId}
          hasPng={existingCard?.has_png ?? false}
          rawJson={JSON.stringify(formData, null, 2)}
          onImportPng={async (file) => {
            // Create-mode: import as a new card (same behavior as gallery import).
            if (!cardId) {
              const result = await importPng.mutateAsync(file);
              showToast({ message: `Imported "${result.name}"`, type: 'success' });
              onSaved(result.id);
              return;
            }

            // Edit-mode: load JSON from PNG into the editor, and also store the PNG bytes as the card image.
            const extracted = await extractCardFromPngFile(file);
            if (!extracted.ok) {
              throw new Error(extracted.error);
            }

            setFormData(normalizeToV2Card(extracted.json));
            dirtyVersionRef.current += 1;
            setIsDirty(true);
            setDirtyVersion(dirtyVersionRef.current);

            // Best-effort: store the PNG as the card's image (so export works as expected).
            await updateAvatar.mutateAsync({ id: cardId, file });
            showToast({ message: 'PNG loaded into editor', type: 'success' });
          }}
          onImportJson={async (json) => {
            // Create-mode: import as a new card (same behavior as gallery import).
            if (!cardId) {
              const result = await importJson.mutateAsync(json);
              showToast({ message: `Imported "${result.name}"`, type: 'success' });
              onSaved(result.id);
              return;
            }

            // Edit-mode: load JSON into form (user can save to persist).
            setFormData(normalizeToV2Card(json));
            dirtyVersionRef.current += 1;
            setIsDirty(true);
            setDirtyVersion(dirtyVersionRef.current);
            showToast({ message: 'JSON loaded into editor', type: 'success' });
          }}
          onExportPng={() => {
            if (cardId) window.open(getExportPngUrl(cardId), '_blank');
          }}
          onExportJson={() => {
            if (cardId) window.open(getExportJsonUrl(cardId), '_blank');
          }}
          isImporting={updateAvatar.isPending || importPng.isPending || importJson.isPending}
        />
      </div>
      
      {/* Validation */}
      {editorValidationMessages.length > 0 && (
        <div className="shrink-0 px-6 py-3">
          <ValidationBadge messages={editorValidationMessages} />
        </div>
      )}
      
      {/* Main content - sidebar + content */}
      <div className="flex flex-1 min-h-0">
        {/* Section sidebar */}
        <nav className="w-44 shrink-0 border-r border-zinc-800/50 bg-zinc-950/60 p-2 overflow-y-auto">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              aria-current={activeSection === section.id ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                activeSection === section.id
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              )}
            >
              <section.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{section.label}</span>
              {sectionIssueSummary[section.id]?.count ? (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-medium',
                    sectionIssueSummary[section.id]?.worst === 'error'
                      ? 'bg-red-500/15 text-red-300'
                      : sectionIssueSummary[section.id]?.worst === 'warning'
                        ? 'bg-amber-500/15 text-amber-300'
                        : sectionIssueSummary[section.id]?.worst === 'info'
                          ? 'bg-blue-500/15 text-blue-300'
                          : 'bg-zinc-800/60 text-zinc-300'
                  )}
                  title={`${sectionIssueSummary[section.id]?.count} issue(s)`}
                >
                  {sectionIssueSummary[section.id]?.count}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
        
        {/* Section content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto w-full max-w-5xl">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0">
                {activeSection === 'core' && (
                  <div className="space-y-6">
                    <AvatarSection
                      avatarUrl={avatarUrl}
                      onAvatarChange={handleAvatarChange}
                      onAvatarRemove={async () => {
                        if (!cardId) {
                          showToast({ message: 'Save the character first to manage the avatar', type: 'info' });
                          return;
                        }
                        if (!confirm('Remove avatar?')) return;
                        try {
                          await deleteAvatar.mutateAsync(cardId);
                          showToast({ message: 'Avatar removed', type: 'success' });
                        } catch (err) {
                          showToast({
                            message: err instanceof Error ? err.message : 'Avatar removal failed',
                            type: 'error',
                          });
                        }
                      }}
                      isUploading={updateAvatar.isPending || deleteAvatar.isPending}
                    />

                    <CoreFieldsSection
                      name={formData.data.name}
                      description={formData.data.description}
                      personality={formData.data.personality}
                      scenario={formData.data.scenario}
                      onChange={(field, value) => updateData(field, value)}
                    />
                  </div>
                )}
                
                {activeSection === 'greetings' && (
                  <GreetingSection
                    firstMessage={formData.data.first_mes}
                    alternateGreetings={formData.data.alternate_greetings}
                    characterName={formData.data.name}
                    userLabel="User"
                    onChange={(field, value) => updateData(field, value as string | string[])}
                  />
                )}
                
                {activeSection === 'examples' && (
                  <ExampleMessagesSection
                    exampleMessages={formData.data.mes_example}
                    characterName={formData.data.name}
                    onChange={(value) => updateData('mes_example', value)}
                  />
                )}
                
                {activeSection === 'prompts' && (
                  <PromptOverridesSection
                    systemPrompt={formData.data.system_prompt}
                    postHistoryInstructions={formData.data.post_history_instructions}
                    onChange={(field, value) => updateData(field, value)}
                  />
                )}
                
                {activeSection === 'metadata' && (
                  <CreatorMetadataSection
                    creator={formData.data.creator}
                    characterVersion={formData.data.character_version}
                    creatorNotes={formData.data.creator_notes}
                    tags={formData.data.tags}
                    onChange={(field, value) => updateData(field, value as string | string[])}
                  />
                )}
                
                {activeSection === 'note' && (
                  <CharacterNoteSection
                    characterNote={(formData.data.extensions?.character_note as string) || ''}
                    noteDepth={(formData.data.extensions?.note_depth as number) || 0}
                    noteRole={(formData.data.extensions?.note_role as 'system' | 'user' | 'assistant') || 'system'}
                    onChange={(field, value) => {
                      const ext = formData.data.extensions || {};
                      if (field === 'character_note') {
                        ext.character_note = value;
                      } else if (field === 'note_depth') {
                        ext.note_depth = value;
                      } else if (field === 'note_role') {
                        ext.note_role = value;
                      }
                      updateData('extensions', ext);
                    }}
                  />
                )}
              </div>

              <aside className="space-y-4 lg:sticky lg:top-4 self-start">
                <TokenBudgetBar
                  totalTokens={totalTokens ?? approxTokens}
                  loading={totalTokens === null}
                />
                <CharacterDetailInsights
                  input={{
                    name: formData.data.name,
                    description: formData.data.description,
                    personality: formData.data.personality,
                    scenario: formData.data.scenario,
                    firstMessage: formData.data.first_mes,
                    alternateGreetings: formData.data.alternate_greetings,
                    exampleMessages: formData.data.mes_example,
                    systemPrompt: formData.data.system_prompt,
                    postHistoryInstructions: formData.data.post_history_instructions,
                    creatorNotes: formData.data.creator_notes,
                  }}
                  onTokensCalculated={setTotalTokens}
                />
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

