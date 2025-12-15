/**
 * Prompt Layout System
 * 
 * Defines draggable prompt blocks that can be reordered.
 * Empty blocks are automatically skipped during prompt building.
 * No more Handlebars {{#if}} nonsense.
 */

/** 
 * Built-in prompt block identifiers.
 * These map to data sources (character card, user, etc.)
 */
export type PromptBlockId =
  | 'system_prompt'      // Main system prompt (from preset)
  | 'persona'            // User's persona/description
  | 'char_description'   // Character description field
  | 'char_personality'   // Character personality field
  | 'scenario'           // Scenario/setting field
  | 'world_info_before'  // World info injected before char info
  | 'world_info_after'   // World info injected after char info
  | 'example_dialogue'   // Example messages from character card
  | 'chat_history'       // Actual conversation messages
  | 'post_history'       // Post-history instructions (from preset)
  | 'prefill';           // Assistant prefill (from preset)

/** A single block in the prompt layout */
export interface PromptBlock {
  /** Unique identifier for this block type */
  id: PromptBlockId;
  /** Display name shown in the editor */
  label: string;
  /** Short description of what this block contains */
  description: string;
  /** Whether this block is enabled (will be included if non-empty) */
  enabled: boolean;
  /** 
   * Whether this is a "marker" block (content comes from elsewhere).
   * Marker blocks can't be edited directly - they pull from character cards, etc.
   */
  isMarker: boolean;
  /**
   * For non-marker blocks, optional custom content override.
   * If undefined, uses the default content from presets.
   */
  customContent?: string;
}

/** Complete layout configuration */
export interface PromptLayout {
  /** Ordered list of blocks (order = position in final prompt) */
  blocks: PromptBlock[];
  /** Layout name for saving/loading */
  name: string;
}

/** Default prompt blocks with sensible ordering */
export const DEFAULT_PROMPT_BLOCKS: PromptBlock[] = [
  {
    id: 'system_prompt',
    label: 'System Prompt',
    description: 'Main instructions for the AI (from your preset)',
    enabled: true,
    isMarker: true,
  },
  {
    id: 'world_info_before',
    label: 'World Info (Before)',
    description: 'Lorebook entries injected before character info',
    enabled: true,
    isMarker: true,
  },
  {
    id: 'persona',
    label: 'User Persona',
    description: 'Your persona/character description',
    enabled: true,
    isMarker: true,
  },
  {
    id: 'char_description',
    label: 'Character Description',
    description: 'The character\'s description field',
    enabled: true,
    isMarker: true,
  },
  {
    id: 'char_personality',
    label: 'Character Personality',
    description: 'The character\'s personality field',
    enabled: true,
    isMarker: true,
  },
  {
    id: 'scenario',
    label: 'Scenario',
    description: 'The scenario/setting for the conversation',
    enabled: true,
    isMarker: true,
  },
  {
    id: 'world_info_after',
    label: 'World Info (After)',
    description: 'Lorebook entries injected after character info',
    enabled: true,
    isMarker: true,
  },
  {
    id: 'example_dialogue',
    label: 'Example Dialogue',
    description: 'Example messages showing how the character talks',
    enabled: true,
    isMarker: true,
  },
  {
    id: 'chat_history',
    label: 'Chat History',
    description: 'The actual conversation messages',
    enabled: true,
    isMarker: true,
  },
  {
    id: 'post_history',
    label: 'Post-History Instructions',
    description: 'Instructions injected after chat (high priority)',
    enabled: true,
    isMarker: true,
  },
  {
    id: 'prefill',
    label: 'Assistant Prefill',
    description: 'Text the assistant "starts" with (e.g., {{char}}:)',
    enabled: true,
    isMarker: true,
  },
];

/** Create a new default layout */
export function createDefaultLayout(name: string = 'Default'): PromptLayout {
  return {
    name,
    blocks: DEFAULT_PROMPT_BLOCKS.map(b => ({ ...b })),
  };
}

/** Get block info by ID */
export function getBlockInfo(id: PromptBlockId): PromptBlock | undefined {
  return DEFAULT_PROMPT_BLOCKS.find(b => b.id === id);
}

/** 
 * Reorder blocks in a layout.
 * @param layout Current layout
 * @param fromIndex Index to move from
 * @param toIndex Index to move to
 * @returns New layout with reordered blocks
 */
export function reorderBlocks(
  layout: PromptLayout,
  fromIndex: number,
  toIndex: number
): PromptLayout {
  const blocks = [...layout.blocks];
  const [removed] = blocks.splice(fromIndex, 1);
  blocks.splice(toIndex, 0, removed);
  return { ...layout, blocks };
}

/**
 * Toggle a block's enabled state.
 */
export function toggleBlock(
  layout: PromptLayout,
  blockId: PromptBlockId,
  enabled: boolean
): PromptLayout {
  return {
    ...layout,
    blocks: layout.blocks.map(b =>
      b.id === blockId ? { ...b, enabled } : b
    ),
  };
}
