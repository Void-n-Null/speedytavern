/**
 * Authoritative macro definitions for prompt engineering.
 * 
 * Macros are replacement tags that insert dynamic content into prompts.
 * They are enclosed in double curly braces: {{macro}}
 */

export type MacroDefinition = {
  macro: string;
  label: string;
  description: string;
  category: 'character' | 'user' | 'chat' | 'time' | 'utility';
  /** Contexts where this macro should NOT be used (to prevent circular references) */
  forbiddenIn?: Array<'system' | 'post_history' | 'prefill'>;
};

export const MACRO_DEFINITIONS: MacroDefinition[] = [
  // Character macros
  {
    macro: '{{char}}',
    label: 'Character Name',
    description: 'The name of the character you\'re chatting with',
    category: 'character',
  },
  {
    macro: '{{description}}',
    label: 'Description',
    description: 'The character\'s description field',
    category: 'character',
  },
  {
    macro: '{{personality}}',
    label: 'Personality',
    description: 'The character\'s personality summary',
    category: 'character',
  },
  {
    macro: '{{scenario}}',
    label: 'Scenario',
    description: 'The scenario/setting for the conversation',
    category: 'character',
  },
  {
    macro: '{{mesExamples}}',
    label: 'Example Messages',
    description: 'Example dialogue from the character card',
    category: 'character',
  },

  // User macros
  {
    macro: '{{user}}',
    label: 'User Name',
    description: 'Your persona name',
    category: 'user',
  },
  {
    macro: '{{persona}}',
    label: 'Persona',
    description: 'Your full persona description',
    category: 'user',
  },

  // Chat macros
  {
    macro: '{{lastMessage}}',
    label: 'Last Message',
    description: 'The most recent message in the chat',
    category: 'chat',
  },
  {
    macro: '{{lastCharMessage}}',
    label: 'Last Character Message',
    description: 'The most recent message from the character',
    category: 'chat',
  },
  {
    macro: '{{lastUserMessage}}',
    label: 'Last User Message',
    description: 'The most recent message from you',
    category: 'chat',
  },
  {
    macro: '{{original}}',
    label: 'Original',
    description: 'The original/default content (useful for overrides)',
    category: 'chat',
  },

  // Time macros
  {
    macro: '{{time}}',
    label: 'Current Time',
    description: 'Current time in your timezone',
    category: 'time',
  },
  {
    macro: '{{date}}',
    label: 'Current Date',
    description: 'Current date in your timezone',
    category: 'time',
  },
  {
    macro: '{{weekday}}',
    label: 'Weekday',
    description: 'Current day of the week',
    category: 'time',
  },
  {
    macro: '{{isotime}}',
    label: 'ISO Time',
    description: 'Current time in ISO format',
    category: 'time',
  },
  {
    macro: '{{isodate}}',
    label: 'ISO Date',
    description: 'Current date in ISO format',
    category: 'time',
  },

  // Utility macros
  {
    macro: '{{newline}}',
    label: 'Newline',
    description: 'Insert a line break',
    category: 'utility',
  },
  {
    macro: '{{trim}}',
    label: 'Trim',
    description: 'Remove surrounding whitespace',
    category: 'utility',
  },
  {
    macro: '{{random:a,b,c}}',
    label: 'Random',
    description: 'Pick a random value from the list',
    category: 'utility',
  },
  {
    macro: '{{roll:d6}}',
    label: 'Dice Roll',
    description: 'Roll dice (e.g., d6, 2d10)',
    category: 'utility',
  },
];

/** Get macros that are safe to use in a given context */
export function getMacrosForContext(context: 'system' | 'post_history' | 'prefill'): MacroDefinition[] {
  return MACRO_DEFINITIONS.filter((m) => !m.forbiddenIn?.includes(context));
}

/** Check if text contains any macro patterns */
export function containsMacros(text: string): boolean {
  return /\{\{[^}]+\}\}/.test(text);
}

/** Extract all macro names from text */
export function extractMacros(text: string): string[] {
  const matches = text.match(/\{\{[^}]+\}\}/g);
  return matches ? Array.from(new Set(matches)) : [];
}

/** Check for unknown macros in text */
export function findUnknownMacros(text: string): string[] {
  const found = extractMacros(text);
  const known = new Set(MACRO_DEFINITIONS.map((m) => m.macro.toLowerCase()));
  
  return found.filter((macro) => {
    const normalized = macro.toLowerCase();
    // Handle parameterized macros like {{random:a,b,c}} or {{roll:d6}}
    const basePattern = normalized.replace(/:[^}]+/, ':');
    return !known.has(normalized) && !known.has(basePattern + '}}');
  });
}

/** Macro highlight colors by category */
export const MACRO_COLORS: Record<MacroDefinition['category'], { bg: string; text: string }> = {
  character: { bg: 'bg-violet-500/30', text: 'text-violet-300' },
  user: { bg: 'bg-blue-500/30', text: 'text-blue-300' },
  chat: { bg: 'bg-amber-500/30', text: 'text-amber-300' },
  time: { bg: 'bg-emerald-500/30', text: 'text-emerald-300' },
  utility: { bg: 'bg-zinc-500/30', text: 'text-zinc-300' },
};

export type MacroReplacements = Record<string, string | (() => string)>;

/**
 * Replace macros in a string.
 * Supports static strings and dynamic generators.
 */
export function replaceMacros(text: string, replacements: MacroReplacements): string {
  if (!text) return '';
  
  return text.replace(/\{\{([^}]+)\}\}/g, (match, macroName) => {
    const fullMacro = `{{${macroName}}}`;
    const value = replacements[fullMacro] || replacements[fullMacro.toLowerCase()];
    
    if (typeof value === 'function') {
      return value();
    }
    
    if (typeof value === 'string') {
      return value;
    }

    // Handle parameterized macros if they match a known pattern
    if (macroName.toLowerCase().startsWith('random:')) {
      const parts = macroName.slice(7).split(',');
      if (parts.length > 0) {
        return parts[Math.floor(Math.random() * parts.length)].trim();
      }
    }

    return match; // Return original if no replacement found
  });
}
