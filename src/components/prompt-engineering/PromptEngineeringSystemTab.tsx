import { useState } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import type { PromptEngineeringPreset } from '../../types/promptEngineering';
import { MacroHighlightTextarea } from '../character-forge/MacroHighlightTextarea';
import { PromptSectionTitle, createEmptySysprompt } from './promptEngineeringEditorShared';

/** Expandable education section for each prompt field */
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

/** Check if a string has meaningful content (not just whitespace) */
function hasContent(value: string | undefined): boolean {
  return !!value?.trim();
}

export function PromptEngineeringSystemTab({
  preset,
  onChange,
  isMobile,
}: {
  preset: PromptEngineeringPreset;
  onChange: (next: PromptEngineeringPreset) => void;
  isMobile: boolean;
}) {
  // Auto-initialize sysprompt if it doesn't exist
  const sysprompt = preset.sysprompt ?? createEmptySysprompt(preset.name);
  
  const updateField = <K extends keyof typeof sysprompt>(key: K, value: (typeof sysprompt)[K]) => {
    onChange({ ...preset, sysprompt: { ...sysprompt, [key]: value } });
  };

  return (
    <div className="space-y-6">
      {/* System Prompt */}
      <div className="space-y-2">
        <PromptSectionTitle
          title="System Prompt"
          hasContent={hasContent(sysprompt.content)}
        />
        <EducationPanel title="What is the System Prompt?">
          <p>
            The <strong>System Prompt</strong> defines the general instructions for the AI to follow. 
            It sets the tone, context, and rules for the conversation.
          </p>
          <p>
            This is typically the <em>first</em> thing the AI sees and establishes the "persona" 
            or behavior you want. For example: "You are a helpful writing assistant" or 
            "Write {'{{char}}'}'s next reply in a fictional roleplay."
          </p>
          <p className="text-zinc-600">
            If empty, no system message is sent.
          </p>
        </EducationPanel>
        <MacroHighlightTextarea
          value={sysprompt.content}
          onChange={(content) => updateField('content', content)}
          placeholder={`Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}.`}
          rows={8}
          maxRows={isMobile ? 12 : 16}
        />
      </div>

      {/* Post-History Instructions */}
      <div className="space-y-2">
        <PromptSectionTitle
          title="Post-History Instructions"
          hasContent={hasContent(sysprompt.post_history)}
        />
        <EducationPanel title="What are Post-History Instructions?">
          <p>
            <strong>Post-History Instructions</strong> are injected <em>after</em> the chat history 
            but <em>before</em> the prefill. Since they appear closer to the AI's response, 
            models typically give them <strong>higher priority</strong> than the system prompt.
          </p>
          <p>
            Use this for instructions you want the AI to strongly remember, like:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Reminders about response format</li>
            <li>Current scene context</li>
            <li>Rules that should override earlier instructions</li>
          </ul>
          <p className="text-zinc-600">
            If empty, nothing is inserted after history.
          </p>
        </EducationPanel>
        <MacroHighlightTextarea
          value={sysprompt.post_history ?? ''}
          onChange={(post_history) => updateField('post_history', post_history)}
          placeholder={`[Continue the roleplay. Stay in character as {{char}}. Be creative and engaging.]`}
          rows={5}
          maxRows={isMobile ? 8 : 10}
        />
      </div>

      {/* Prefill */}
      <div className="space-y-2">
        <PromptSectionTitle
          title="Prefill (Assistant Start)"
          hasContent={hasContent(sysprompt.prefill)}
        />
        <EducationPanel title="What is Prefill?">
          <p>
            <strong>Prefill</strong> is an assistant-role message added at the very end of the prompt. 
            The AI treats this as if it <em>already wrote</em> this text and will continue from there.
          </p>
          <p>
            Common uses:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><code className="text-violet-400">{'{{char}}:'}</code> — Forces the AI to respond as the character</li>
            <li><code className="text-violet-400">{'<think>'}</code> — Nudges the AI into reasoning mode</li>
            <li><code className="text-violet-400">Sure! Here's</code> — Bypasses refusals (use responsibly)</li>
          </ul>
          <p className="text-amber-500/80 mt-2">
            ⚠️ Some APIs don't support prefill and may error. Leave empty if unsure.
          </p>
        </EducationPanel>
        <MacroHighlightTextarea
          value={sysprompt.prefill ?? ''}
          onChange={(prefill) => updateField('prefill', prefill)}
          placeholder={`{{char}}:`}
          rows={2}
          maxRows={4}
        />
      </div>
    </div>
  );
}
