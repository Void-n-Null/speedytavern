/**
 * CharacterEditor - Full character card editing interface.
 * 
 * Supports both creating new cards and editing existing ones.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { getCharacterEditorDraftSnapshot, useCharacterEditorStore } from '../../store/characterEditorStore';

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

function computeEditorMessages(draft: TavernCardV2): Array<{ level: ValidationLevel; message: string; field?: string }> {
  const validationMessages = validateCharacterCard(draft);
  const msgs: Array<{ level: ValidationLevel; message: string; field?: string }> = [...validationMessages];

  if (!draft.data.mes_example?.trim()) {
    msgs.push({ level: 'info', message: 'Example messages are empty', field: 'mes_example' });
  }

  const emptyAlt = (draft.data.alternate_greetings || []).some((g) => !String(g || '').trim());
  if (emptyAlt) {
    msgs.push({ level: 'warning', message: 'One or more alternate greetings are empty', field: 'alternate_greetings' });
  }

  const tags = (draft.data.tags || []).map((t) => String(t || ''));
  if (tags.some((t) => !t.trim())) {
    msgs.push({ level: 'warning', message: 'One or more tags are empty', field: 'tags' });
  }

  return msgs;
}

function computeSectionIssueSummary(draft: TavernCardV2): Partial<Record<EditorSection, { count: number; worst: ValidationLevel }>> {
  const msgs = computeEditorMessages(draft);

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

  for (const msg of msgs) {
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
}

function shallowEqualSectionIssueSummary(
  a: Partial<Record<EditorSection, { count: number; worst: ValidationLevel }>>,
  b: Partial<Record<EditorSection, { count: number; worst: ValidationLevel }>>
): boolean {
  if (a === b) return true;
  const sections: EditorSection[] = ['core', 'greetings', 'examples', 'prompts', 'metadata', 'note'];
  for (const s of sections) {
    const av = a[s];
    const bv = b[s];
    if (!av && !bv) continue;
    if (!av || !bv) return false;
    if (av.count !== bv.count) return false;
    if (av.worst !== bv.worst) return false;
  }
  return true;
}

function shallowEqualEditorMessages(
  a: Array<{ level: ValidationLevel; message: string; field?: string }>,
  b: Array<{ level: ValidationLevel; message: string; field?: string }>
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const ai = a[i];
    const bi = b[i];
    if (ai.level !== bi.level) return false;
    if (ai.message !== bi.message) return false;
    if ((ai.field || '') !== (bi.field || '')) return false;
  }
  return true;
}

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
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const isDirty = useCharacterEditorStore((s) => s.isDirty);
  const loadDraft = useCharacterEditorStore((s) => s.loadDraft);
  const replaceDraft = useCharacterEditorStore((s) => s.replaceDraft);
  const markSavedIfVersionMatches = useCharacterEditorStore((s) => s.markSavedIfVersionMatches);
  
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
  
  // Load existing card data into the draft store.
  useEffect(() => {
    if (!cardId) {
      loadDraft(null, createEmptyCard());
      return;
    }

    if (existingCard && existingCard.raw_json) {
      try {
        const parsed = JSON.parse(existingCard.raw_json);
        loadDraft(cardId, normalizeToV2Card(parsed));
      } catch {
        loadDraft(cardId, createEmptyCard());
      }
    }
  }, [cardId, existingCard, loadDraft]);
  
  const getRawJson = useCallback(() => JSON.stringify(getCharacterEditorDraftSnapshot(), null, 2), []);

  // Avatar URL for display
  const avatarUrl =
    cardId && existingCard?.has_png ? getAvatarUrlVersioned(cardId, existingCard?.png_sha256) : null;
  
  // Save handler
  const handleSave = useCallback(async (opts?: { silent?: boolean; reason?: 'manual' | 'autosave' | 'hotkey' }) => {
    const silent = Boolean(opts?.silent);
    const saveDirtyVersion = useCharacterEditorStore.getState().dirtyVersion;
    const draft = getCharacterEditorDraftSnapshot();
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
        // In create mode, we navigate to edit and remount anyway, but keep semantics correct.
        markSavedIfVersionMatches(saveDirtyVersion);
        setLastSavedAt(Date.now());
        onSaved(result.id);
      } else {
        await updateCard.mutateAsync({ id: cardId, card: draft });
        if (!silent) showToast({ message: 'Character saved', type: 'success' });
        // Only clear dirty if nothing changed while the save was in-flight.
        markSavedIfVersionMatches(saveDirtyVersion);
        setLastSavedAt(Date.now());
        onSaved(cardId);
      }
    } catch (err) {
      // Autosave should not spam; only show toast on failure.
      showToast({
        message: err instanceof Error ? err.message : 'Save failed',
        type: 'error',
      });
    }
  }, [cardId, createCard, isCreating, markSavedIfVersionMatches, onSaved, updateCard]);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const pendingRef = useRef(false);
  pendingRef.current = Boolean(createCard.isPending || updateCard.isPending);

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

  // Autosave scheduling (store-driven; avoids React rerender coupling to draft changes).
  useEffect(() => {
    const clearIdle = () => {
      if (idleSaveTimerRef.current) clearTimeout(idleSaveTimerRef.current);
      idleSaveTimerRef.current = null;
    };

    const scheduleIdle = () => {
      clearIdle();
      idleSaveTimerRef.current = setTimeout(() => {
        const state = useCharacterEditorStore.getState();
        if (!state.isDirty) return;
        if (pendingRef.current) return;
        void handleSaveRef.current({ silent: true, reason: 'autosave' });
      }, 2_000);
    };

    const unsub = useCharacterEditorStore.subscribe(
      (s) => s.dirtyVersion,
      () => {
        // Any edit should push autosave out.
        scheduleIdle();
      }
    );

    if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
    autosaveTimerRef.current = setInterval(() => {
      const state = useCharacterEditorStore.getState();
      if (!state.isDirty) return;
      if (pendingRef.current) return;
      void handleSaveRef.current({ silent: true, reason: 'autosave' });
    }, 60_000);

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return;
      const state = useCharacterEditorStore.getState();
      if (!state.isDirty) return;
      if (pendingRef.current) return;
      void handleSaveRef.current({ silent: true, reason: 'autosave' });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      unsub();
      clearIdle();
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);
  
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
            <EditorTitle isCreating={isCreating} />
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
            disabled={createCard.isPending || updateCard.isPending}
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
          getRawJson={getRawJson}
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

            replaceDraft(normalizeToV2Card(extracted.json), { markDirty: true });

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
            replaceDraft(normalizeToV2Card(json), { markDirty: true });
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
      
      <EditorValidationBar />
      
      {/* Main content - sidebar + content */}
      <div className="flex flex-1 min-h-0">
        {/* Section sidebar */}
        <EditorSectionNav activeSection={activeSection} setActiveSection={setActiveSection} />
        
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

                    <CoreSectionFields />
                  </div>
                )}
                
                {activeSection === 'greetings' && (
                  <GreetingsSectionFields />
                )}
                
                {activeSection === 'examples' && (
                  <ExamplesSectionFields />
                )}
                
                {activeSection === 'prompts' && (
                  <PromptsSectionFields />
                )}
                
                {activeSection === 'metadata' && (
                  <MetadataSectionFields />
                )}
                
                {activeSection === 'note' && (
                  <NoteSectionFields />
                )}
              </div>

              <aside className="space-y-4 lg:sticky lg:top-4 self-start">
                <EditorInsightsSidebar />
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const EditorTitle = memo(function EditorTitle({ isCreating }: { isCreating: boolean }) {
  const name = useCharacterEditorStore((s) => s.draft.data.name);
  return <>{isCreating ? 'Create Character' : `Edit: ${name || 'Unnamed'}`}</>;
});

const EditorSectionNav = memo(function EditorSectionNav({
  activeSection,
  setActiveSection,
}: {
  activeSection: EditorSection;
  setActiveSection: (section: EditorSection) => void;
}) {
  const [sectionIssueSummary, setSectionIssueSummary] = useState<
    Partial<Record<EditorSection, { count: number; worst: ValidationLevel }>>
  >(() => computeSectionIssueSummary(getCharacterEditorDraftSnapshot()));

  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const computeNow = () => {
      const next = computeSectionIssueSummary(getCharacterEditorDraftSnapshot());
      setSectionIssueSummary((prev) => (shallowEqualSectionIssueSummary(prev, next) ? prev : next));
    };
    computeNow();

    const unsub = useCharacterEditorStore.subscribe(
      (s) => s.dirtyVersion,
      () => {
        if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => {
          debounceRef.current = null;
          computeNow();
        }, 200);
      }
    );

    return () => {
      unsub();
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    };
  }, []);

  return (
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
  );
});

const EditorValidationBar = memo(function EditorValidationBar() {
  const [messages, setMessages] = useState(() => computeEditorMessages(getCharacterEditorDraftSnapshot()));
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const computeNow = () => {
      const next = computeEditorMessages(getCharacterEditorDraftSnapshot());
      setMessages((prev) => (shallowEqualEditorMessages(prev, next) ? prev : next));
    };
    computeNow();

    const unsub = useCharacterEditorStore.subscribe(
      (s) => s.dirtyVersion,
      () => {
        if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => {
          debounceRef.current = null;
          computeNow();
        }, 200);
      }
    );

    return () => {
      unsub();
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    };
  }, []);

  if (messages.length === 0) return null;

  return (
    <div className="shrink-0 px-6 py-3">
      <ValidationBadge messages={messages} />
    </div>
  );
});

const CoreSectionFields = memo(function CoreSectionFields() {
  const name = useCharacterEditorStore((s) => s.draft.data.name);
  const description = useCharacterEditorStore((s) => s.draft.data.description);
  const personality = useCharacterEditorStore((s) => s.draft.data.personality);
  const scenario = useCharacterEditorStore((s) => s.draft.data.scenario);
  const setField = useCharacterEditorStore((s) => s.setField);

  const onChange = useCallback(
    (field: keyof TavernCardV2['data'], value: unknown) => {
      setField(field as any, value as any);
    },
    [setField]
  );

  return (
    <CoreFieldsSection
      name={name}
      description={description}
      personality={personality}
      scenario={scenario}
      onChange={onChange as any}
    />
  );
});

const GreetingsSectionFields = memo(function GreetingsSectionFields() {
  const firstMessage = useCharacterEditorStore((s) => s.draft.data.first_mes);
  const alternateGreetings = useCharacterEditorStore((s) => s.draft.data.alternate_greetings);
  const characterName = useCharacterEditorStore((s) => s.draft.data.name);
  const setField = useCharacterEditorStore((s) => s.setField);

  const onChange = useCallback(
    (field: 'first_mes' | 'alternate_greetings', value: string | string[]) => {
      setField(field, value as any);
    },
    [setField]
  );

  return (
    <GreetingSection
      firstMessage={firstMessage}
      alternateGreetings={alternateGreetings}
      characterName={characterName}
      userLabel="User"
      onChange={onChange as any}
    />
  );
});

const ExamplesSectionFields = memo(function ExamplesSectionFields() {
  const exampleMessages = useCharacterEditorStore((s) => s.draft.data.mes_example);
  const characterName = useCharacterEditorStore((s) => s.draft.data.name);
  const setField = useCharacterEditorStore((s) => s.setField);

  const onChange = useCallback((value: string) => setField('mes_example', value), [setField]);

  return <ExampleMessagesSection exampleMessages={exampleMessages} characterName={characterName} onChange={onChange} />;
});

const PromptsSectionFields = memo(function PromptsSectionFields() {
  const systemPrompt = useCharacterEditorStore((s) => s.draft.data.system_prompt);
  const postHistoryInstructions = useCharacterEditorStore((s) => s.draft.data.post_history_instructions);
  const setField = useCharacterEditorStore((s) => s.setField);

  const onChange = useCallback(
    (field: 'system_prompt' | 'post_history_instructions', value: string) => {
      setField(field, value as any);
    },
    [setField]
  );

  return <PromptOverridesSection systemPrompt={systemPrompt} postHistoryInstructions={postHistoryInstructions} onChange={onChange as any} />;
});

const MetadataSectionFields = memo(function MetadataSectionFields() {
  const creator = useCharacterEditorStore((s) => s.draft.data.creator);
  const characterVersion = useCharacterEditorStore((s) => s.draft.data.character_version);
  const creatorNotes = useCharacterEditorStore((s) => s.draft.data.creator_notes);
  const tags = useCharacterEditorStore((s) => s.draft.data.tags);
  const setField = useCharacterEditorStore((s) => s.setField);

  const onChange = useCallback(
    (field: 'creator' | 'character_version' | 'creator_notes' | 'tags', value: string | string[]) => {
      setField(field, value as any);
    },
    [setField]
  );

  return (
    <CreatorMetadataSection
      creator={creator}
      characterVersion={characterVersion}
      creatorNotes={creatorNotes}
      tags={tags}
      onChange={onChange as any}
    />
  );
});

const NoteSectionFields = memo(function NoteSectionFields() {
  const ext = useCharacterEditorStore((s) => s.draft.data.extensions || {});
  const setExtensionField = useCharacterEditorStore((s) => s.setExtensionField);

  const characterNote = (ext.character_note as string) || '';
  const noteDepth = (ext.note_depth as number) || 0;
  const noteRole = (ext.note_role as 'system' | 'user' | 'assistant') || 'system';

  const onChange = useCallback(
    (field: 'character_note' | 'note_depth' | 'note_role', value: string | number) => {
      setExtensionField(field, value);
    },
    [setExtensionField]
  );

  return <CharacterNoteSection characterNote={characterNote} noteDepth={noteDepth} noteRole={noteRole} onChange={onChange as any} />;
});

const EditorInsightsSidebar = memo(function EditorInsightsSidebar() {
  const description = useCharacterEditorStore((s) => s.draft.data.description);
  const personality = useCharacterEditorStore((s) => s.draft.data.personality);
  const scenario = useCharacterEditorStore((s) => s.draft.data.scenario);
  const firstMessage = useCharacterEditorStore((s) => s.draft.data.first_mes);
  const alternateGreetings = useCharacterEditorStore((s) => s.draft.data.alternate_greetings);
  const exampleMessages = useCharacterEditorStore((s) => s.draft.data.mes_example);
  const systemPrompt = useCharacterEditorStore((s) => s.draft.data.system_prompt);
  const postHistoryInstructions = useCharacterEditorStore((s) => s.draft.data.post_history_instructions);
  const creatorNotes = useCharacterEditorStore((s) => s.draft.data.creator_notes);
  const name = useCharacterEditorStore((s) => s.draft.data.name);

  const approxTokens = useMemo(() => {
    const totalChars = [
      description,
      personality,
      scenario,
      firstMessage,
      (alternateGreetings || []).join('\n\n'),
      exampleMessages,
      systemPrompt,
      postHistoryInstructions,
      creatorNotes,
    ].reduce((a, s) => a + (s || '').length, 0);
    return Math.max(0, Math.round(totalChars / 4));
  }, [
    alternateGreetings,
    creatorNotes,
    description,
    exampleMessages,
    firstMessage,
    personality,
    postHistoryInstructions,
    scenario,
    systemPrompt,
  ]);

  const insightsInput = useMemo(
    () => ({
      name,
      description,
      personality,
      scenario,
      firstMessage,
      alternateGreetings,
      exampleMessages,
      systemPrompt,
      postHistoryInstructions,
      creatorNotes,
    }),
    [
      alternateGreetings,
      creatorNotes,
      description,
      exampleMessages,
      firstMessage,
      name,
      personality,
      postHistoryInstructions,
      scenario,
      systemPrompt,
    ]
  );

  const [totalTokens, setTotalTokens] = useState<number | null>(null);
  useEffect(() => {
    setTotalTokens(null);
  }, [insightsInput]);

  return (
    <>
      <TokenBudgetBar totalTokens={totalTokens ?? approxTokens} loading={totalTokens === null} />
      <CharacterDetailInsights input={insightsInput} onTokensCalculated={setTotalTokens} />
    </>
  );
});

