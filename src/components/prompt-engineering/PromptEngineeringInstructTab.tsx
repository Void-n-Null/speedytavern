import { useState } from 'react';
import { ChevronDown, ChevronRight, Info, Sparkles } from 'lucide-react';
import type { PromptEngineeringPreset } from '../../types/promptEngineering';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { MacroHighlightTextarea } from '../character-forge/MacroHighlightTextarea';
import { BoolFieldRow, PromptSectionTitle, createEmptyInstruct } from './promptEngineeringEditorShared';

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

/** Common instruct format presets */
const FORMAT_PRESETS = {
  chatml: {
    name: 'ChatML (OpenAI)',
    system_sequence: '<|im_start|>system\n',
    system_suffix: '<|im_end|>\n',
    input_sequence: '<|im_start|>user\n',
    input_suffix: '<|im_end|>\n',
    output_sequence: '<|im_start|>assistant\n',
    output_suffix: '<|im_end|>\n',
    stop_sequence: '<|im_end|>',
  },
  llama2: {
    name: 'Llama 2 Chat',
    system_sequence: '[INST] <<SYS>>\n',
    system_suffix: '\n<</SYS>>\n\n',
    input_sequence: '',
    input_suffix: ' [/INST] ',
    output_sequence: '',
    output_suffix: ' </s><s>[INST] ',
    stop_sequence: '</s>',
  },
  llama3: {
    name: 'Llama 3 Instruct',
    system_sequence: '<|start_header_id|>system<|end_header_id|>\n\n',
    system_suffix: '<|eot_id|>',
    input_sequence: '<|start_header_id|>user<|end_header_id|>\n\n',
    input_suffix: '<|eot_id|>',
    output_sequence: '<|start_header_id|>assistant<|end_header_id|>\n\n',
    output_suffix: '<|eot_id|>',
    stop_sequence: '<|eot_id|>',
  },
  alpaca: {
    name: 'Alpaca',
    system_sequence: '',
    system_suffix: '\n\n',
    input_sequence: '### Instruction:\n',
    input_suffix: '\n\n',
    output_sequence: '### Response:\n',
    output_suffix: '\n\n',
    stop_sequence: '### Instruction:',
  },
  mistral: {
    name: 'Mistral Instruct',
    system_sequence: '',
    system_suffix: '\n\n',
    input_sequence: '[INST] ',
    input_suffix: ' [/INST]',
    output_sequence: '',
    output_suffix: '</s> ',
    stop_sequence: '</s>',
  },
} as const;

/** Check if a string has meaningful content */
function hasContent(value: string | undefined): boolean {
  return !!value?.trim();
}

export function PromptEngineeringInstructTab({
  preset,
  onChange,
}: {
  preset: PromptEngineeringPreset;
  onChange: (next: PromptEngineeringPreset) => void;
}) {
  // Auto-initialize instruct if it doesn't exist
  const instruct = preset.instruct ?? createEmptyInstruct(preset.name);
  
  const updateField = <K extends keyof typeof instruct>(key: K, value: (typeof instruct)[K]) => {
    onChange({ ...preset, instruct: { ...instruct, [key]: value } });
  };
  
  // Apply a format preset
  const applyPreset = (presetKey: keyof typeof FORMAT_PRESETS) => {
    const format = FORMAT_PRESETS[presetKey];
    onChange({
      ...preset,
      instruct: {
        ...instruct,
        system_sequence: format.system_sequence,
        system_suffix: format.system_suffix,
        input_sequence: format.input_sequence,
        input_suffix: format.input_suffix,
        output_sequence: format.output_sequence,
        output_suffix: format.output_suffix,
        stop_sequence: format.stop_sequence,
      },
    });
  };

  const hasAnySequences = hasContent(instruct.system_sequence) || 
    hasContent(instruct.input_sequence) || 
    hasContent(instruct.output_sequence);

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="space-y-2">
        <PromptSectionTitle
          title="Message Wrapping (Instruct Format)"
          hasContent={hasAnySequences}
        />
        <EducationPanel title="What is Instruct Format?">
          <p>
            <strong>Instruct Format</strong> defines how messages are wrapped when sent to 
            <em> Text Completion APIs</em> (llama.cpp, KoboldAI, Oobabooga, etc.).
          </p>
          <p>
            Unlike Chat Completion APIs (OpenAI, Claude) which understand message roles natively, 
            text completion models need explicit markers to know where user/assistant messages begin and end.
          </p>
          <p className="text-amber-500/80">
            ⚠️ <strong>Not needed for Chat Completion APIs</strong> — they handle formatting automatically.
          </p>
          <p className="text-zinc-600">
            If all fields are empty, no wrapping is applied.
          </p>
        </EducationPanel>
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <Sparkles className="h-4 w-4 text-violet-400" />
          Quick Presets
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(FORMAT_PRESETS).map(([key, format]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key as keyof typeof FORMAT_PRESETS)}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
            >
              {format.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-600">
          Click a preset to populate the sequences below. Check your model's documentation for the correct format.
        </p>
      </div>

      {/* Message Prefixes */}
      <div className="space-y-3">
        <PromptSectionTitle
          title="Message Prefixes"
          subtitle="Inserted BEFORE each message type"
          hasContent={hasContent(instruct.system_sequence) || hasContent(instruct.input_sequence) || hasContent(instruct.output_sequence)}
        />
        <EducationPanel title="What are prefixes?">
          <p>
            Prefixes are inserted <em>before</em> each message. They tell the model "here comes a message from [role]".
          </p>
          <p>Example for ChatML:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 font-mono text-[10px]">
            <li>System: <code className="text-emerald-400">{`<|im_start|>system\n`}</code></li>
            <li>User: <code className="text-blue-400">{`<|im_start|>user\n`}</code></li>
            <li>Assistant: <code className="text-violet-400">{`<|im_start|>assistant\n`}</code></li>
          </ul>
        </EducationPanel>
        
        <div className="grid gap-3 md:grid-cols-3">
          <MacroHighlightTextarea
            value={instruct.system_sequence}
            onChange={(v) => updateField('system_sequence', v)}
            label="System prefix"
            placeholder={`<|im_start|>system\n`}
            rows={2}
            maxRows={4}
          />
          <MacroHighlightTextarea
            value={instruct.input_sequence}
            onChange={(v) => updateField('input_sequence', v)}
            label="User prefix"
            placeholder={`<|im_start|>user\n`}
            rows={2}
            maxRows={4}
          />
          <MacroHighlightTextarea
            value={instruct.output_sequence}
            onChange={(v) => updateField('output_sequence', v)}
            label="Assistant prefix"
            placeholder={`<|im_start|>assistant\n`}
            rows={2}
            maxRows={4}
          />
        </div>
      </div>

      {/* Message Suffixes */}
      <div className="space-y-3">
        <PromptSectionTitle
          title="Message Suffixes"
          subtitle="Inserted AFTER each message type"
          hasContent={hasContent(instruct.system_suffix) || hasContent(instruct.input_suffix) || hasContent(instruct.output_suffix)}
        />
        <EducationPanel title="What are suffixes?">
          <p>
            Suffixes are inserted <em>after</em> each message. They mark where a message ends.
          </p>
          <p>Example for ChatML:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 font-mono text-[10px]">
            <li>All roles: <code className="text-zinc-400">{`<|im_end|>\n`}</code></li>
          </ul>
        </EducationPanel>
        
        <div className="grid gap-3 md:grid-cols-3">
          <MacroHighlightTextarea
            value={instruct.system_suffix}
            onChange={(v) => updateField('system_suffix', v)}
            label="System suffix"
            placeholder={`<|im_end|>\n`}
            rows={2}
            maxRows={4}
          />
          <MacroHighlightTextarea
            value={instruct.input_suffix}
            onChange={(v) => updateField('input_suffix', v)}
            label="User suffix"
            placeholder={`<|im_end|>\n`}
            rows={2}
            maxRows={4}
          />
          <MacroHighlightTextarea
            value={instruct.output_suffix}
            onChange={(v) => updateField('output_suffix', v)}
            label="Assistant suffix"
            placeholder={`<|im_end|>\n`}
            rows={2}
            maxRows={4}
          />
        </div>
      </div>

      {/* Stop Sequence */}
      <div className="space-y-2">
        <PromptSectionTitle
          title="Stop Sequence"
          hasContent={hasContent(instruct.stop_sequence)}
        />
        <EducationPanel title="What is a stop sequence?">
          <p>
            The <strong>stop sequence</strong> tells the model when to stop generating. 
            When the model outputs this text, generation halts and it's removed from the response.
          </p>
          <p>
            Usually matches the end-of-turn token, like <code className="text-zinc-400">{`<|im_end|>`}</code> for ChatML 
            or <code className="text-zinc-400">{`</s>`}</code> for Llama.
          </p>
        </EducationPanel>
        <MacroHighlightTextarea
          value={instruct.stop_sequence}
          onChange={(v) => updateField('stop_sequence', v)}
          placeholder={`<|im_end|>`}
          rows={1}
          maxRows={2}
        />
      </div>

      {/* Advanced Options */}
      <details className="rounded-lg border border-zinc-800/50 bg-zinc-900/20">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-zinc-400 hover:text-zinc-300">
          Advanced Options
        </summary>
        <div className="space-y-3 px-4 pb-4">
          <BoolFieldRow
            label="Wrap sequences with newlines"
            checked={instruct.wrap}
            onCheckedChange={(wrap) => updateField('wrap', wrap)}
            description="Add newlines around each sequence (required for Alpaca format)"
          />
          <BoolFieldRow
            label="Use sequences as stop strings"
            checked={instruct.sequences_as_stop_strings}
            onCheckedChange={(v) => updateField('sequences_as_stop_strings', v)}
            description="Also use prefix sequences as additional stop strings"
          />
          <BoolFieldRow
            label="System uses user format"
            checked={instruct.system_same_as_user}
            onCheckedChange={(v) => updateField('system_same_as_user', v)}
            description="Use user prefix/suffix for system messages instead of system-specific ones"
          />
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 space-y-2">
            <Label className="text-zinc-400">Model activation regex</Label>
            <Input
              value={instruct.activation_regex}
              onChange={(e) => updateField('activation_regex', e.target.value)}
              placeholder="e.g., mistral|llama"
              className="font-mono text-xs"
            />
            <p className="text-xs text-zinc-600">Auto-select this template when connected model name matches</p>
          </div>
        </div>
      </details>
    </div>
  );
}
