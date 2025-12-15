export type StInstructTemplate = {
  name: string;
  input_sequence: string;
  input_suffix: string;
  output_sequence: string;
  output_suffix: string;
  first_output_sequence: string;
  last_output_sequence: string;
  system_sequence: string;
  system_suffix: string;
  stop_sequence: string;
  last_system_sequence: string;
  last_input_sequence: string;
  first_input_sequence: string;
  user_alignment_message: string;
  wrap: boolean;
  macro: boolean;
  names_behavior: 'none' | 'force' | 'always';
  activation_regex: string;
  skip_examples: boolean;
  system_same_as_user: boolean;
  sequences_as_stop_strings: boolean;
  story_string_prefix: string;
  story_string_suffix: string;
};

export type StContextTemplate = {
  name: string;
  story_string: string;
  example_separator: string;
  chat_start: string;
  use_stop_strings: boolean;
  names_as_stop_strings: boolean;
  story_string_position: number;
  story_string_depth: number;
  story_string_role: number;
  always_force_name2: boolean;
  trim_sentences: boolean;
  single_line: boolean;
};

export type StSystemPromptTemplate = {
  name: string;
  content: string;
  post_history?: string;
  prefill?: string;
};

export type StReasoningTemplate = {
  name: string;
  prefix: string;
  suffix: string;
  separator: string;
};

export type SillyTavernAdvancedFormattingImport = {
  source: 'sillytavern';
  importedAt: number;
  instruct?: StInstructTemplate;
  context?: StContextTemplate;
  sysprompt?: StSystemPromptTemplate;
  reasoning?: StReasoningTemplate;
  unknownSections: Record<string, unknown>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function namesBehavior(v: unknown): 'none' | 'force' | 'always' {
  return v === 'none' || v === 'force' || v === 'always' ? v : 'force';
}

function normalizeInstruct(raw: Record<string, unknown>): StInstructTemplate {
  const migrated = { ...raw };

  if (migrated.separator_sequence !== undefined && migrated.output_suffix === undefined) {
    migrated.output_suffix = migrated.separator_sequence;
    delete migrated.separator_sequence;
  }

  return {
    name: str(migrated.name, 'Imported'),
    input_sequence: str(migrated.input_sequence),
    input_suffix: str(migrated.input_suffix),
    output_sequence: str(migrated.output_sequence),
    output_suffix: str(migrated.output_suffix),
    first_output_sequence: str(migrated.first_output_sequence),
    last_output_sequence: str(migrated.last_output_sequence),
    system_sequence: str(migrated.system_sequence),
    system_suffix: str(migrated.system_suffix),
    stop_sequence: str(migrated.stop_sequence),
    last_system_sequence: str(migrated.last_system_sequence),
    last_input_sequence: str(migrated.last_input_sequence),
    first_input_sequence: str(migrated.first_input_sequence),
    user_alignment_message: str(migrated.user_alignment_message),
    wrap: bool(migrated.wrap),
    macro: bool(migrated.macro),
    names_behavior: namesBehavior(migrated.names_behavior),
    activation_regex: str(migrated.activation_regex),
    skip_examples: bool(migrated.skip_examples),
    system_same_as_user: bool(migrated.system_same_as_user),
    sequences_as_stop_strings: bool(migrated.sequences_as_stop_strings),
    story_string_prefix: str(migrated.story_string_prefix),
    story_string_suffix: str(migrated.story_string_suffix),
  };
}

function normalizeContext(raw: Record<string, unknown>): StContextTemplate {
  return {
    name: str(raw.name, 'Imported'),
    story_string: str(raw.story_string),
    example_separator: str(raw.example_separator),
    chat_start: str(raw.chat_start),
    use_stop_strings: bool(raw.use_stop_strings),
    names_as_stop_strings: bool(raw.names_as_stop_strings),
    story_string_position: num(raw.story_string_position),
    story_string_depth: num(raw.story_string_depth),
    story_string_role: num(raw.story_string_role),
    always_force_name2: bool(raw.always_force_name2),
    trim_sentences: bool(raw.trim_sentences),
    single_line: bool(raw.single_line),
  };
}

function normalizeSysprompt(raw: Record<string, unknown>): StSystemPromptTemplate {
  return {
    name: str(raw.name, 'Imported'),
    content: str(raw.content),
    post_history: typeof raw.post_history === 'string' ? raw.post_history : undefined,
    prefill: typeof raw.prefill === 'string' ? raw.prefill : undefined,
  };
}

function normalizeReasoning(raw: Record<string, unknown>): StReasoningTemplate {
  return {
    name: str(raw.name, 'Imported'),
    prefix: str(raw.prefix),
    suffix: str(raw.suffix),
    separator: str(raw.separator),
  };
}

function looksLikeInstruct(data: Record<string, unknown>): boolean {
  return typeof data.input_sequence === 'string' && typeof data.output_sequence === 'string';
}

function looksLikeContext(data: Record<string, unknown>): boolean {
  return typeof data.story_string === 'string' && typeof data.chat_start === 'string';
}

function looksLikeSysprompt(data: Record<string, unknown>): boolean {
  return typeof data.content === 'string' && typeof data.name === 'string' && data.story_string === undefined;
}

function looksLikeReasoning(data: Record<string, unknown>): boolean {
  return typeof data.prefix === 'string' && typeof data.suffix === 'string';
}

export function importSillyTavernAdvancedFormattingJson(input: unknown): SillyTavernAdvancedFormattingImport {
  if (!isRecord(input)) {
    throw new Error('Invalid SillyTavern formatting JSON: expected object');
  }

  const unknownSections: Record<string, unknown> = {};

  const isMaster =
    (input.instruct === undefined || isRecord(input.instruct)) &&
    (input.context === undefined || isRecord(input.context)) &&
    (input.sysprompt === undefined || isRecord(input.sysprompt)) &&
    (input.reasoning === undefined || isRecord(input.reasoning)) &&
    ('instruct' in input || 'context' in input || 'sysprompt' in input || 'reasoning' in input);

  let instruct: StInstructTemplate | undefined;
  let context: StContextTemplate | undefined;
  let sysprompt: StSystemPromptTemplate | undefined;
  let reasoning: StReasoningTemplate | undefined;

  if (isMaster) {
    if (isRecord(input.instruct)) instruct = normalizeInstruct(input.instruct);
    if (isRecord(input.context)) context = normalizeContext(input.context);
    if (isRecord(input.sysprompt)) sysprompt = normalizeSysprompt(input.sysprompt);
    if (isRecord(input.reasoning)) reasoning = normalizeReasoning(input.reasoning);

    for (const [k, v] of Object.entries(input)) {
      if (k === 'instruct' || k === 'context' || k === 'sysprompt' || k === 'reasoning') continue;
      unknownSections[k] = v;
    }

    return {
      source: 'sillytavern',
      importedAt: Date.now(),
      instruct,
      context,
      sysprompt,
      reasoning,
      unknownSections,
    };
  }

  if (looksLikeInstruct(input)) {
    return {
      source: 'sillytavern',
      importedAt: Date.now(),
      instruct: normalizeInstruct(input),
      unknownSections: {},
    };
  }

  if (looksLikeContext(input)) {
    return {
      source: 'sillytavern',
      importedAt: Date.now(),
      context: normalizeContext(input),
      unknownSections: {},
    };
  }

  if (looksLikeSysprompt(input)) {
    return {
      source: 'sillytavern',
      importedAt: Date.now(),
      sysprompt: normalizeSysprompt(input),
      unknownSections: {},
    };
  }

  if (looksLikeReasoning(input)) {
    return {
      source: 'sillytavern',
      importedAt: Date.now(),
      reasoning: normalizeReasoning(input),
      unknownSections: {},
    };
  }

  throw new Error('Unrecognized SillyTavern formatting JSON');
}
