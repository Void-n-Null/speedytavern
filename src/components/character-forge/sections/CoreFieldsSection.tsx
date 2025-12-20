/**
 * CoreFieldsSection - Name, description, personality, scenario.
 */

import { MacroHighlightTextarea } from '../MacroHighlightTextarea';
import { cn } from '../../../lib/utils';

interface CoreFieldsSectionProps {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  onChange: (field: 'name' | 'description' | 'personality' | 'scenario', value: string) => void;
}

export function CoreFieldsSection({
  name,
  description,
  personality,
  scenario,
  onChange,
}: CoreFieldsSectionProps) {
  return (
    <div className="space-y-5">
      {/* Name - regular input, not macro-highlighted */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-300">
          Character Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Enter character name..."
          className={cn(
            'h-10 w-full rounded-lg border bg-zinc-900/80 px-3',
            'text-sm text-zinc-200 placeholder:text-zinc-600',
            'focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30',
            name.trim() ? 'border-zinc-800' : 'border-red-500/50'
          )}
        />
        {!name.trim() && (
          <p className="mt-1 text-xs text-red-400">Name is required</p>
        )}
      </div>
      
      {/* Description */}
      <MacroHighlightTextarea
        label="Description"
        description="A detailed description of the character. This is the core identity prompt. Supports {{char}} and {{user}} macros."
        value={description}
        onChange={(v) => onChange('description', v)}
        placeholder="{{char}} is a..."
        rows={6}
        maxRows={20}
      />
      
      {/* Personality */}
      <MacroHighlightTextarea
        label="Personality Summary"
        description="A brief summary of personality traits. Some frontends inject this separately."
        value={personality}
        onChange={(v) => onChange('personality', v)}
        placeholder="Witty, sarcastic, secretly caring..."
        rows={3}
        maxRows={8}
      />
      
      {/* Scenario */}
      <MacroHighlightTextarea
        label="Scenario"
        description="The circumstances and context of the dialogue. Sets the scene."
        value={scenario}
        onChange={(v) => onChange('scenario', v)}
        placeholder="{{char}} and {{user}} meet at..."
        rows={3}
        maxRows={8}
      />
    </div>
  );
}





