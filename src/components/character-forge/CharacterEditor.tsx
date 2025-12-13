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
  getAvatarUrlVersioned,
  getExportPngUrl,
  getExportJsonUrl,
} from '../../hooks/queries/useCharacterCards';
import type { TavernCardV2 } from '../../types/characterCard';
import { Button } from '../ui/button';
import { showToast } from '../ui/toast';
import { ValidationBadge, validateCharacterCard } from './ValidationBadge';
import { ImportExportBar } from './ImportExportBar';
import { AvatarSection } from './sections/AvatarSection';
import { CoreFieldsSection } from './sections/CoreFieldsSection';
import { GreetingSection } from './sections/GreetingSection';
import { ExampleMessagesSection } from './sections/ExampleMessagesSection';
import { PromptOverridesSection } from './sections/PromptOverridesSection';
import { CreatorMetadataSection } from './sections/CreatorMetadataSection';
import { CharacterNoteSection } from './sections/CharacterNoteSection';
import { cn } from '../../lib/utils';

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

export function CharacterEditor({ cardId, onClose, onSaved }: CharacterEditorProps) {
  const isCreating = !cardId;
  const [activeSection, setActiveSection] = useState<EditorSection>('core');
  const [isDirty, setIsDirty] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Form state - matches V2 data structure
  const [formData, setFormData] = useState<TavernCardV2>(createEmptyCard());
  
  // Queries
  const { data: existingCard, isLoading } = useCharacterCard(cardId);
  const createCard = useCreateCharacterCard();
  const updateCard = useUpdateCharacterCard();
  const updateAvatar = useUpdateCardAvatar();
  const deleteAvatar = useDeleteCardAvatar();
  
  // Load existing card data
  useEffect(() => {
    if (existingCard && existingCard.raw_json) {
      try {
        const parsed = JSON.parse(existingCard.raw_json);
        // Normalize to V2 structure
        if (parsed.spec === 'chara_card_v2' || parsed.spec === 'chara_card_v3') {
          setFormData(parsed);
        } else {
          // V1 card - wrap in V2 structure
          setFormData({
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
          });
        }
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
    setIsDirty(true);
  };
  
  // Validation
  const validationMessages = useMemo(() => {
    return validateCharacterCard(formData);
  }, [formData]);
  
  const hasErrors = validationMessages.some((m) => m.level === 'error');
  
  // Avatar URL for display
  const avatarUrl =
    cardId && existingCard?.has_png ? getAvatarUrlVersioned(cardId, existingCard?.png_sha256) : null;
  
  // Save handler
  const handleSave = useCallback(async (opts?: { silent?: boolean; reason?: 'manual' | 'autosave' | 'hotkey' }) => {
    const silent = Boolean(opts?.silent);
    if (hasErrors) {
      if (!silent) showToast({ message: 'Please fix errors before saving', type: 'error' });
      return;
    }
    
    try {
      if (isCreating) {
        const result = await createCard.mutateAsync(formData);
        if (!silent) showToast({ message: 'Character created', type: 'success' });
        setIsDirty(false);
        onSaved(result.id);
      } else {
        await updateCard.mutateAsync({ id: cardId, card: formData });
        if (!silent) showToast({ message: 'Character saved', type: 'success' });
        setIsDirty(false);
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
          {isDirty && (
            <span className="text-xs text-amber-400">Unsaved changes</span>
          )}
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
            // For now, just update avatar
            if (cardId) {
              await updateAvatar.mutateAsync({ id: cardId, file });
            }
          }}
          onImportJson={async (json) => {
            // Load JSON into form
            try {
              if (json.spec === 'chara_card_v2' || json.spec === 'chara_card_v3') {
                setFormData(json as TavernCardV2);
              } else if (json.data) {
                setFormData(json as TavernCardV2);
              } else {
                // V1
                setFormData({
                  spec: 'chara_card_v2',
                  spec_version: '2.0',
                  data: {
                    name: (json as any).name || '',
                    description: (json as any).description || '',
                    personality: (json as any).personality || '',
                    scenario: (json as any).scenario || '',
                    first_mes: (json as any).first_mes || '',
                    mes_example: (json as any).mes_example || '',
                    creator_notes: '',
                    system_prompt: '',
                    post_history_instructions: '',
                    alternate_greetings: [],
                    tags: [],
                    creator: '',
                    character_version: '',
                    extensions: {},
                  },
                });
              }
              setIsDirty(true);
              showToast({ message: 'JSON loaded into editor', type: 'success' });
            } catch {
              showToast({ message: 'Failed to parse JSON', type: 'error' });
            }
          }}
          onExportPng={() => {
            if (cardId) window.open(getExportPngUrl(cardId), '_blank');
          }}
          onExportJson={() => {
            if (cardId) window.open(getExportJsonUrl(cardId), '_blank');
          }}
          isImporting={updateAvatar.isPending}
        />
      </div>
      
      {/* Validation */}
      {validationMessages.length > 0 && (
        <div className="shrink-0 px-6 py-3">
          <ValidationBadge messages={validationMessages} />
        </div>
      )}
      
      {/* Main content - sidebar + content */}
      <div className="flex flex-1 min-h-0">
        {/* Section sidebar */}
        <nav className="w-40 shrink-0 border-r border-zinc-800/50 bg-zinc-950/60 p-2 overflow-y-auto">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                activeSection === section.id
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              )}
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </button>
          ))}
        </nav>
        
        {/* Section content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl">
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
        </div>
      </div>
    </div>
  );
}

