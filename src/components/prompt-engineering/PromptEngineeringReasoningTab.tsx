import { useState } from 'react';
import { ChevronDown, ChevronRight, Info, Brain } from 'lucide-react';
import type { PromptEngineeringPreset } from '../../types/promptEngineering';
import { MacroHighlightTextarea } from '../character-forge/MacroHighlightTextarea';
import { PromptSectionTitle, createEmptyReasoning } from './promptEngineeringEditorShared';

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

export function PromptEngineeringReasoningTab({
  preset,
  onChange,
}: {
  preset: PromptEngineeringPreset;
  onChange: (next: PromptEngineeringPreset) => void;
}) {
  // Auto-initialize reasoning if it doesn't exist
  const reasoning = preset.reasoning ?? createEmptyReasoning(preset.name);
  
  const updateField = <K extends keyof typeof reasoning>(key: K, value: (typeof reasoning)[K]) => {
    onChange({ ...preset, reasoning: { ...reasoning, [key]: value } });
  };

  const hasAnyContent = hasContent(reasoning.prefix) || hasContent(reasoning.suffix);

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-emerald-400" />
          <PromptSectionTitle
            title="Reasoning / Chain-of-Thought"
            hasContent={hasAnyContent}
          />
        </div>
        <EducationPanel title="What is Reasoning formatting?">
          <p>
            <strong>Reasoning formatting</strong> controls how the AI's "thinking" process is displayed.
            Many modern models (Claude, DeepSeek, Qwen) support explicit reasoning blocks.
          </p>
          <p>
            When enabled, the model outputs its thought process wrapped in special tags, 
            which can then be displayed separately from the final response.
          </p>
          <p>Common formats:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 font-mono text-[10px]">
            <li><code className="text-emerald-400">{`<think>...</think>`}</code> — DeepSeek, some Claude</li>
            <li><code className="text-blue-400">{`<reasoning>...</reasoning>`}</code> — alternative format</li>
            <li><code className="text-violet-400">{`[thinking]...[/thinking]`}</code> — bracket style</li>
          </ul>
          <p className="text-zinc-600 mt-2">
            If empty, reasoning blocks are not specially formatted.
          </p>
        </EducationPanel>
      </div>

      {/* Prefix & Suffix */}
      <div className="space-y-3">
        <PromptSectionTitle
          title="Reasoning Delimiters"
          hasContent={hasContent(reasoning.prefix) || hasContent(reasoning.suffix)}
        />
        <EducationPanel title="How do delimiters work?">
          <p>
            The <strong>prefix</strong> marks the start of a reasoning block, 
            and the <strong>suffix</strong> marks the end.
          </p>
          <p>
            The AI's chain-of-thought appears between these markers. 
            You can style or hide this content in the UI.
          </p>
        </EducationPanel>
        
        <div className="grid gap-3 md:grid-cols-2">
          <MacroHighlightTextarea
            value={reasoning.prefix}
            onChange={(v) => updateField('prefix', v)}
            label="Reasoning start (prefix)"
            placeholder="<think>"
            rows={2}
            maxRows={4}
          />
          <MacroHighlightTextarea
            value={reasoning.suffix}
            onChange={(v) => updateField('suffix', v)}
            label="Reasoning end (suffix)"
            placeholder="</think>"
            rows={2}
            maxRows={4}
          />
        </div>
      </div>

      {/* Separator */}
      <div className="space-y-2">
        <PromptSectionTitle
          title="Block Separator"
          hasContent={hasContent(reasoning.separator)}
        />
        <EducationPanel title="What is the separator for?">
          <p>
            If the model produces multiple reasoning blocks in one response, 
            the <strong>separator</strong> is inserted between them.
          </p>
          <p className="text-zinc-600">
            Usually not needed — most models produce a single reasoning block per turn.
          </p>
        </EducationPanel>
        <MacroHighlightTextarea
          value={reasoning.separator}
          onChange={(v) => updateField('separator', v)}
          placeholder="\n---\n"
          rows={1}
          maxRows={3}
        />
      </div>
    </div>
  );
}
