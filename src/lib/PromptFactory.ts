import type { 
  ModelMessage, 
  SystemModelMessage, 
  UserModelMessage, 
  AssistantModelMessage 
} from 'ai';
import type { PromptBlock, PromptBlockId } from './promptLayout';
import type { PromptEngineeringPreset } from '../types/promptEngineering';
import type { ChatNode, Speaker } from '../types/chat';
import type { TavernCard } from '../types/characterCard';
import { replaceMacros, type MacroReplacements } from './macros';

export interface ChatPromptResult {
  /** All messages including system prompt at start, prefill at end */
  messages: ModelMessage[];
}

export interface PromptFactoryContext {
  preset: PromptEngineeringPreset;
  history: ChatNode[];
  speakers: Map<string, Speaker>;
  charId: string;
  userId: string;
  charCard?: TavernCard;
  /** Optional: pre-calculated macro replacements */
  customReplacements?: MacroReplacements;
}

export class PromptFactory {
  /**
   * Create a ChatPromptResult for Chat Completion APIs.
   * Returns ONLY a messages array - system prompt is role: "system", prefill is role: "assistant" at the end.
   */
  static createChatPrompt(context: PromptFactoryContext): ChatPromptResult {
    const { preset, history, speakers } = context;
    const layout = preset.promptLayout;
    if (!layout) {
      return this.createDefaultChatPromptWithCharacter(context);
    }

    const replacements = this.buildReplacements(context);
    const messages: ModelMessage[] = [];

    // If flattening, build one big string
    if (layout.flatten) {
      const allText = this.createTextPrompt(context);
      return { messages: [{ role: 'user', content: allText }] };
    }

    // Process blocks in order - system content goes into messages with role: "system"
    for (const block of layout.blocks) {
      if (!block.enabled) continue;

      if (block.id === 'chat_history') {
        messages.push(...this.renderHistoryAsMessages(history, speakers));
      } else {
        const content = this.renderBlock(block, context, replacements);
        if (content.trim()) {
          const role = this.getRoleForBlock(block.id);
          messages.push({ role, content } as ModelMessage);
        }
      }
    }

    return { messages: this.mergeConsecutiveRoles(messages) };
  }

  /**
   * Create a single string for Text Completion APIs.
   */
  static createTextPrompt(context: PromptFactoryContext): string {
    const { preset, history, speakers } = context;
    const layout = preset.promptLayout;
    const instruct = preset.instruct;
    const replacements = this.buildReplacements(context);

    const parts: string[] = [];

    // Use layout if available, otherwise fallback to a default order
    const blocks = layout?.blocks || this.getDefaultBlocks();

    for (const block of blocks) {
      if (layout && !block.enabled) continue;

      if (block.id === 'chat_history') {
        parts.push(this.renderHistoryAsText(history, speakers, instruct));
      } else {
        const content = this.renderBlock(block, context, replacements);
        if (content.trim()) {
          parts.push(content);
        }
      }
    }

    return parts.join('\n\n').trim();
  }

  private static renderBlock(
    block: PromptBlock,
    context: PromptFactoryContext,
    replacements: MacroReplacements
  ): string {
    const { preset, charCard } = context;

    let content = '';

    if (block.isMarker) {
      switch (block.id) {
        case 'system_prompt':
          content = preset.sysprompt?.content || '';
          break;
        case 'persona':
          content = this.getCardField(charCard, 'persona') || '';
          break;
        case 'char_description':
          content = this.getCardField(charCard, 'description') || '';
          break;
        case 'char_personality':
          content = this.getCardField(charCard, 'personality') || '';
          break;
        case 'scenario':
          content = this.getCardField(charCard, 'scenario') || '';
          break;
        case 'example_dialogue':
          content = this.getCardField(charCard, 'mes_example') || '';
          break;
        case 'post_history':
          content = preset.sysprompt?.post_history || '';
          break;
        case 'prefill':
          content = preset.sysprompt?.prefill || '';
          break;
        case 'world_info_before':
        case 'world_info_after':
          // Lorebooks not implemented yet
          content = '';
          break;
      }
    } else {
      content = block.customContent || '';
    }

    return replaceMacros(content, replacements);
  }

  private static renderHistoryAsMessages(history: ChatNode[], _speakers: Map<string, Speaker>): ModelMessage[] {
    return history.map(node => ({
      role: node.is_bot ? 'assistant' : 'user',
      content: node.message,
    } as ModelMessage));
  }

  private static renderHistoryAsText(
    history: ChatNode[],
    speakers: Map<string, Speaker>,
    instruct?: PromptEngineeringPreset['instruct']
  ): string {
    return history.map(node => {
      const speaker = speakers.get(node.speaker_id);
      const name = speaker?.name || (node.is_bot ? 'Assistant' : 'User');
      const content = node.message;

      if (instruct) {
        const prefix = node.is_bot ? instruct.output_sequence : instruct.input_sequence;
        const suffix = node.is_bot ? instruct.output_suffix : instruct.input_suffix;
        
        let text = content;
        if (prefix) text = prefix.replace('{{name}}', name).replace('{{char}}', name) + text;
        if (suffix) text = text + suffix.replace('{{name}}', name).replace('{{char}}', name);
        return text;
      }

      return `${name}: ${content}`;
    }).join('\n');
  }

  private static buildReplacements(context: PromptFactoryContext): MacroReplacements {
    const { history, speakers, charId, userId, charCard, customReplacements } = context;
    const char = speakers.get(charId);
    const user = speakers.get(userId);

    const base: MacroReplacements = {
      '{{char}}': char?.name || 'Assistant',
      '{{user}}': user?.name || 'User',
      '{{description}}': this.getCardField(charCard, 'description'),
      '{{personality}}': this.getCardField(charCard, 'personality'),
      '{{scenario}}': this.getCardField(charCard, 'scenario'),
      '{{mesExamples}}': this.getCardField(charCard, 'mes_example'),
      '{{persona}}': user?.name || '', 
      '{{time}}': () => new Date().toLocaleTimeString(),
      '{{date}}': () => new Date().toLocaleDateString(),
      '{{weekday}}': () => new Date().toLocaleDateString(undefined, { weekday: 'long' }),
      '{{isodate}}': () => new Date().toISOString().split('T')[0],
      '{{isotime}}': () => new Date().toISOString(),
      '{{newline}}': '\n',
      '{{lastMessage}}': history.length > 0 ? history[history.length - 1].message : '',
      '{{lastCharMessage}}': history.filter(n => n.is_bot).pop()?.message || '',
      '{{lastUserMessage}}': history.filter(n => !n.is_bot).pop()?.message || '',
    };

    return { ...base, ...customReplacements };
  }

  private static getCardField(card: TavernCard | undefined, field: string): string {
    if (!card) return '';
    const obj = card as any;
    if (obj.data && typeof obj.data === 'object' && typeof obj.data[field] === 'string') {
      return obj.data[field];
    }
    if (typeof obj[field] === 'string') {
      return obj[field];
    }
    return '';
  }

  private static getRoleForBlock(id: PromptBlockId): 'system' | 'user' | 'assistant' {
    switch (id) {
      case 'system_prompt':
      case 'char_description':
      case 'char_personality':
      case 'scenario':
      case 'post_history':
        return 'system';
      case 'persona':
        return 'user';
      case 'prefill':
        return 'assistant';
      default:
        return 'system';
    }
  }

  private static mergeConsecutiveRoles(messages: ModelMessage[]): ModelMessage[] {
    if (messages.length <= 1) return messages;

    const flattened: ModelMessage[] = [];
    let currentRole: ModelMessage['role'] | null = null;
    let currentContent = '';

    for (const msg of messages) {
      // AI SDK 5.0: content can be string or array of parts. 
      // We only support merging string content for now.
      const content = typeof msg.content === 'string' ? msg.content : '';
      
      if (msg.role === currentRole && currentRole !== 'tool') {
        currentContent += '\n\n' + content;
      } else {
        if (currentRole) {
          // Push previous accumulated message
          if (currentRole === 'system') {
            flattened.push({ role: 'system', content: currentContent } as SystemModelMessage);
          } else if (currentRole === 'user') {
            flattened.push({ role: 'user', content: currentContent } as UserModelMessage);
          } else if (currentRole === 'assistant') {
            flattened.push({ role: 'assistant', content: currentContent } as AssistantModelMessage);
          }
        }
        currentRole = msg.role;
        currentContent = content;
      }
    }

    if (currentRole) {
      if (currentRole === 'system') {
        flattened.push({ role: 'system', content: currentContent } as SystemModelMessage);
      } else if (currentRole === 'user') {
        flattened.push({ role: 'user', content: currentContent } as UserModelMessage);
      } else if (currentRole === 'assistant') {
        flattened.push({ role: 'assistant', content: currentContent } as AssistantModelMessage);
      }
    }

    return flattened;
  }

  /**
   * Creates a chat prompt with character information included, 
   * used when no custom prompt layout is configured.
   * Returns ONLY messages array - everything is a message with a role.
   */
  private static createDefaultChatPromptWithCharacter(context: PromptFactoryContext): ChatPromptResult {
    const { preset, history, speakers, charCard, charId, userId } = context;
    const messages: ModelMessage[] = [];
    const replacements = this.buildReplacements(context);
    
    // Get character and user names
    const charSpeaker = speakers.get(charId);
    const userSpeaker = speakers.get(userId);
    const charName = charSpeaker?.name || 'Assistant';
    const userName = userSpeaker?.name || 'User';
    
    // Build system content
    const systemParts: string[] = [];
    
    if (preset.sysprompt?.content) {
      systemParts.push(preset.sysprompt.content);
    }
    
    const description = this.getCardField(charCard, 'description');
    if (description) {
      systemParts.push(`## Character: ${charName}\n${description}`);
    }
    
    const personality = this.getCardField(charCard, 'personality');
    if (personality) {
      systemParts.push(`## Personality\n${personality}`);
    }
    
    const scenario = this.getCardField(charCard, 'scenario');
    if (scenario) {
      systemParts.push(`## Scenario\n${scenario}`);
    }
    
    const mesExample = this.getCardField(charCard, 'mes_example');
    if (mesExample) {
      systemParts.push(`## Example Dialogue\n${mesExample}`);
    }
    
    if (systemParts.length === 0) {
      systemParts.push(`You are ${charName}, engaged in a roleplay conversation with ${userName}. Stay in character and respond naturally.`);
    }
    
    // Add system as first message
    const systemContent = replaceMacros(systemParts.join('\n\n'), replacements);
    messages.push({ role: 'system', content: systemContent } as SystemModelMessage);
    
    // Add chat history
    messages.push(...this.renderHistoryAsMessages(history, speakers));
    
    // Add post-history as system message if present
    if (preset.sysprompt?.post_history) {
      const postHistory = replaceMacros(preset.sysprompt.post_history, replacements);
      if (postHistory.trim()) {
        messages.push({ role: 'system', content: postHistory } as SystemModelMessage);
      }
    }
    
    // Add prefill as assistant message at the END (model continues from this)
    if (preset.sysprompt?.prefill) {
      const prefill = replaceMacros(preset.sysprompt.prefill, replacements);
      if (prefill.trim()) {
        messages.push({ role: 'assistant', content: prefill } as AssistantModelMessage);
      }
    }
    
    return { messages: this.mergeConsecutiveRoles(messages) };
  }

  private static getDefaultBlocks(): PromptBlock[] {
    return [
      { id: 'system_prompt', label: '', description: '', enabled: true, isMarker: true },
      { id: 'char_description', label: '', description: '', enabled: true, isMarker: true },
      { id: 'chat_history', label: '', description: '', enabled: true, isMarker: true },
    ];
  }
}
