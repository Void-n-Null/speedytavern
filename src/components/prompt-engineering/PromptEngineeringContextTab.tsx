import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
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

/** Check if a string has meaningful content */
function hasContent(value: string | undefined): boolean {
  return !!value?.trim();
}

export function PromptEngineeringContextTab({
  preset,
  onChange,
  isMobile,
}: {
  preset: PromptEngineeringPreset;
  onChange: (next: PromptEngineeringPreset) => void;
  isMobile: boolean;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isChat = preset.mode === 'chat';
  
  // Auto-initialize layout if it doesn't exist
  const layout = preset.promptLayout ?? createDefaultLayout(preset.name);
  
  // Auto-initialize context if it doesn't exist
  const context = preset.context ?? createEmptyContext(preset.name);

  // Auto-fill story string if empty and in text mode
  if (!isChat && !hasContent(context.story_string)) {
    context.story_string = `{{#if system}}{{system}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}'s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}\n{{#if post_history}}{{post_history}}\n{{/if}}`;
  }
  
  const updateContextField = <K extends keyof typeof context>(key: K, value: (typeof context)[K]) => {
    onChange({ ...preset, context: { ...context, [key]: value } });
  };

  return (
    <div className="space-y-6">
      {isChat ? (
        /* ========== CHAT LAYOUT MODE ========== */
        <div className="space-y-4">
          <div className="space-y-2">
            <PromptSectionTitle
              title="Prompt Structure (Layout)"
              subtitle="Drag to reorder • Empty blocks auto-skip"
              hasContent={layout.blocks.some(b => b.enabled)}
            />
          </div>

          <div className="space-y-3">
            <BoolFieldRow
              label="Flatten Chat Prompt"
              checked={!!layout.flatten}
              onCheckedChange={(flatten) => onChange({ ...preset, promptLayout: { ...layout, flatten } })}
              description="Merge all enabled blocks into a single system message. Useful for Instruct models that perform better with a unified context block."
            />
          </div>
          
          <PromptLayoutEditor
            layout={layout}
            onChange={(newLayout) => onChange({ ...preset, promptLayout: newLayout })}
            isMobile={isMobile}
          />
        </div>
      ) : (
        /* ========== STORY STRING MODE (Text) ========== */
        <div className="space-y-6">
          <div className="space-y-2">
            <PromptSectionTitle
              title="Story String (Manual Structure)"
              hasContent={hasContent(context.story_string)}
            />
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
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-all",
                showAdvanced 
                  ? "border-zinc-700 bg-zinc-800/40 text-zinc-200" 
                  : "border-zinc-800/60 bg-zinc-900/20 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/20"
              )}
            >
              <span className="text-sm font-semibold tracking-wide uppercase text-[11px]">Advanced Parameters</span>
              {showAdvanced ? <ChevronDown className="h-4 w-4 opacity-50" /> : <ChevronRight className="h-4 w-4 opacity-30" />}
            </button>

            {showAdvanced && (
              <div className="space-y-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 shadow-inner">
                <BoolFieldRow
                  label="Use stop strings"
                  checked={context.use_stop_strings}
                  onCheckedChange={(v) => updateContextField('use_stop_strings', v)}
                  description="Enable custom stop strings for generation"
                />
                <BoolFieldRow
                  label="Names as stop strings"
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
                
                <div className="pt-4 mt-2 border-t border-zinc-800/60">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Positioning</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                  </div>
                  <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-3')}>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
