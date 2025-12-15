import { useState } from 'react';
import { ChevronDown, ChevronRight, Info, LayoutList, FileText } from 'lucide-react';
import type { PromptEngineeringPreset } from '../../types/promptEngineering';
import { cn } from '../../lib/utils';
import { MacroHighlightTextarea } from '../character-forge/MacroHighlightTextarea';
import {
  BoolFieldRow,
  NumberField,
  PromptSectionTitle,
  createEmptyContext,
} from './promptEngineeringEditorShared';
import { PromptLayoutEditor } from './PromptLayoutEditor';
import { createDefaultLayout } from '../../lib/promptLayout';

/** Expandable education section */
function EducationPanel({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/20">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
      >
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Info className="h-3 w-3" />
        <span>{title}</span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 text-xs text-zinc-500 leading-relaxed space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

/** Check if a string has meaningful content */
function hasContent(value: string | undefined): boolean {
  return !!value?.trim();
}

type ContextMode = 'layout' | 'story_string';

export function PromptEngineeringContextTab({
  preset,
  onChange,
  isMobile,
}: {
  preset: PromptEngineeringPreset;
  onChange: (next: PromptEngineeringPreset) => void;
  isMobile: boolean;
}) {
  // Determine initial mode based on what data exists
  const hasLayout = !!preset.promptLayout;
  const hasStoryString = hasContent(preset.context?.story_string);
  const [mode, setMode] = useState<ContextMode>(hasStoryString && !hasLayout ? 'story_string' : 'layout');
  
  // Auto-initialize layout if it doesn't exist
  const layout = preset.promptLayout ?? createDefaultLayout(preset.name);
  
  // Auto-initialize context if it doesn't exist (for legacy mode)
  const context = preset.context ?? createEmptyContext(preset.name);
  
  const updateContextField = <K extends keyof typeof context>(key: K, value: (typeof context)[K]) => {
    onChange({ ...preset, context: { ...context, [key]: value } });
  };

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <div className="flex items-center gap-2 p-1 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
        <button
          type="button"
          onClick={() => setMode('layout')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            mode === 'layout'
              ? 'bg-violet-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          )}
        >
          <LayoutList className="h-4 w-4" />
          Prompt Layout
        </button>
        <button
          type="button"
          onClick={() => setMode('story_string')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            mode === 'story_string'
              ? 'bg-violet-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          )}
        >
          <FileText className="h-4 w-4" />
          Story String
        </button>
      </div>

      {mode === 'layout' ? (
        /* ========== LAYOUT MODE ========== */
        <div className="space-y-4">
          <div className="space-y-2">
            <PromptSectionTitle
              title="Prompt Layout"
              subtitle="Drag to reorder • Empty blocks auto-skip"
              hasContent={layout.blocks.some(b => b.enabled)}
            />
            <EducationPanel title="What is Prompt Layout?">
              <p>
                <strong>Prompt Layout</strong> controls the order of information sent to the AI
                for <em>Chat Completion APIs</em> (OpenAI, Claude, etc.).
              </p>
              <p>
                Unlike the legacy Story String, you don't need to write conditionals like
                <code className="text-zinc-400 ml-1">{`{{#if description}}`}</code>.
                <strong> Empty blocks are automatically skipped.</strong>
              </p>
              <p className="text-emerald-500/80">
                ✓ Recommended for most users
              </p>
            </EducationPanel>
          </div>
          
          <PromptLayoutEditor
            layout={layout}
            onChange={(newLayout) => onChange({ ...preset, promptLayout: newLayout })}
          />
        </div>
      ) : (
        /* ========== STORY STRING MODE (Legacy) ========== */
        <div className="space-y-6">
          <div className="space-y-2">
            <PromptSectionTitle
              title="Story String (Legacy)"
              hasContent={hasContent(context.story_string)}
            />
            <EducationPanel title="What is Story String?">
              <p>
                <strong>Story String</strong> is a legacy template format for
                <em> Text Completion APIs</em> (llama.cpp, KoboldAI, etc.).
              </p>
              <p>
                It uses Handlebars-style conditionals to assemble character data:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2 font-mono text-[10px]">
                <li><code className="text-violet-400">{`{{#if description}}...{{/if}}`}</code></li>
                <li><code className="text-blue-400">{`{{char}}`}</code> — character name</li>
                <li><code className="text-emerald-400">{`{{description}}`}</code> — character description</li>
              </ul>
              <p className="text-amber-500/80 mt-2">
                ⚠️ For Chat Completion APIs, use <strong>Prompt Layout</strong> instead.
              </p>
            </EducationPanel>
          </div>

          <MacroHighlightTextarea
            value={context.story_string}
            onChange={(v) => updateContextField('story_string', v)}
            placeholder={`{{#if system}}{{system}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}'s personality: {{personality}}\n{{/if}}`}
            rows={10}
            maxRows={isMobile ? 14 : 18}
          />

          {/* Chat Markers */}
          <div className="space-y-3">
            <PromptSectionTitle
              title="Chat Markers"
              hasContent={hasContent(context.chat_start) || hasContent(context.example_separator)}
            />
            <div className={cn('grid gap-3', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
              <MacroHighlightTextarea
                value={context.chat_start}
                onChange={(v) => updateContextField('chat_start', v)}
                label="Chat start marker"
                placeholder="[Start a new chat]"
                rows={2}
                maxRows={4}
              />
              <MacroHighlightTextarea
                value={context.example_separator}
                onChange={(v) => updateContextField('example_separator', v)}
                label="Example separator"
                placeholder="[Example dialogue]"
                rows={2}
                maxRows={4}
              />
            </div>
          </div>

          {/* Advanced Options */}
          <details className="rounded-lg border border-zinc-800/50 bg-zinc-900/20">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-zinc-400 hover:text-zinc-300">
              Advanced Options
            </summary>
            <div className="space-y-3 px-4 pb-4">
              <BoolFieldRow
                label="Use stop strings"
                checked={context.use_stop_strings}
                onCheckedChange={(v) => updateContextField('use_stop_strings', v)}
                description="Enable custom stop strings for generation"
              />
              <BoolFieldRow
                label="Character names as stop strings"
                checked={context.names_as_stop_strings}
                onCheckedChange={(v) => updateContextField('names_as_stop_strings', v)}
                description="Stop generation when character/user names appear"
              />
              <BoolFieldRow
                label="Trim incomplete sentences"
                checked={context.trim_sentences}
                onCheckedChange={(v) => updateContextField('trim_sentences', v)}
                description="Remove incomplete sentences from the end of responses"
              />
              <BoolFieldRow
                label="Single line mode"
                checked={context.single_line}
                onCheckedChange={(v) => updateContextField('single_line', v)}
                description="Collapse multi-line responses into single lines"
              />
              
              <div className="pt-2 border-t border-zinc-800/50">
                <p className="text-xs text-zinc-500 mb-3">Story string positioning (advanced)</p>
                <div className={cn('grid gap-3', isMobile ? 'grid-cols-1' : 'grid-cols-3')}>
                  <NumberField
                    label="Position"
                    value={context.story_string_position}
                    onValue={(v) => updateContextField('story_string_position', v)}
                  />
                  <NumberField
                    label="Depth"
                    value={context.story_string_depth}
                    onValue={(v) => updateContextField('story_string_depth', v)}
                  />
                  <NumberField
                    label="Role"
                    value={context.story_string_role}
                    onValue={(v) => updateContextField('story_string_role', v)}
                  />
                </div>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
