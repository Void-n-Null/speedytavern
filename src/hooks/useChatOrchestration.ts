/**
 * Chat Orchestration Hook
 * 
 * Orchestrates the full chat generation flow:
 * 1. Build prompt using PromptFactory (from history, character card, preset)
 * 2. Send to AI provider via streaming API
 * 3. Stream response into chat using useStreaming
 */

import { useCallback, useRef, useMemo } from 'react';
import { useStreaming } from './useStreaming';
import { useServerChat } from './queries';
import { useActiveProfile } from './queries/profiles/queries';
import { usePromptEngineeringStore } from './queries/usePromptEngineering';
import { useCharacterCard } from './queries/useCharacterCards';
import { PromptFactory, type PromptFactoryContext } from '../lib/PromptFactory';
import { streamGenerate, type GenerateRequest } from '../api/generate';
import type { ChatNode } from '../types/chat';
import type { TavernCard } from '../types/characterCard';
import type { PromptEngineeringPreset } from '../types/promptEngineering';
import { showToast } from '../components/ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { resolveModelForProvider } from '../utils/modelMapping';

export interface ChatOrchestrationResult {
  /** Whether generation is currently in progress */
  isGenerating: boolean;
  /** Generate a bot response to the current conversation */
  generate: () => Promise<void>;
  /** Cancel the current generation */
  cancel: () => void;
}

/**
 * Get the active path history from root to tail.
 * Includes all messages except optionally the root (greeting).
 */
function getActivePathHistory(
  nodes: Map<string, ChatNode>,
  rootId: string | null,
  tailId: string | null,
  includeRoot = false
): ChatNode[] {
  if (!rootId || !tailId) {
    console.log('[orchestration] getActivePathHistory: missing rootId or tailId', { rootId, tailId });
    return [];
  }
  
  const history: ChatNode[] = [];
  let currentId: string | null = rootId;
  
  console.log('[orchestration] Walking path from root:', rootId, 'to tail:', tailId, 'nodes count:', nodes.size);
  
  while (currentId) {
    const node = nodes.get(currentId);
    if (!node) {
      console.log('[orchestration] Node not found:', currentId);
      break;
    }
    
    // Include root if requested, otherwise skip it (it's usually a greeting)
    if (includeRoot || currentId !== rootId) {
      history.push(node);
      console.log('[orchestration] Added message:', { 
        id: node.id.slice(0, 8), 
        isBot: node.is_bot, 
        contentLength: node.message?.length || 0,
        contentPreview: node.message?.slice(0, 50) || '[empty]'
      });
    }
    
    // Follow active child path
    if (node.child_ids.length > 0 && node.active_child_index !== null) {
      currentId = node.child_ids[node.active_child_index];
    } else {
      currentId = null;
    }
  }
  
  console.log('[orchestration] Total history messages:', history.length);
  return history;
}

/**
 * Get a default prompt engineering preset for when none is configured.
 */
function getDefaultPreset(): PromptEngineeringPreset {
  return {
    id: '__default__',
    name: 'Default',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    mode: 'chat',
    source: 'manual',
    sysprompt: {
      name: 'Default System Prompt',
      content: 'You are a helpful assistant engaged in a roleplay conversation. Stay in character and respond naturally.',
    },
  };
}

/**
 * Hook for orchestrating chat AI generation.
 * 
 * Handles the complete flow from building prompts to streaming responses.
 */
export function useChatOrchestration(): ChatOrchestrationResult {
  const queryClient = useQueryClient();
  const streaming = useStreaming();
  const serverChat = useServerChat();
  const { data: profile } = useActiveProfile();
  const { data: promptEngineeringStore } = usePromptEngineeringStore();
  
  // Get the first character's card if available
  const firstCharacterId = serverChat.chat?.character_ids?.[0];
  const { data: charCardRecord } = useCharacterCard(firstCharacterId);
  
  // Parse the raw_json to get the actual TavernCard
  const parsedCharCard = useMemo((): TavernCard | undefined => {
    if (!charCardRecord?.raw_json) return undefined;
    try {
      return JSON.parse(charCardRecord.raw_json) as TavernCard;
    } catch {
      console.warn('[orchestration] Failed to parse character card JSON');
      return undefined;
    }
  }, [charCardRecord?.raw_json]);
  
  // Use refs to avoid stale closures in setTimeout callbacks
  const serverChatRef = useRef(serverChat);
  const profileRef = useRef(profile);
  const promptEngineeringStoreRef = useRef(promptEngineeringStore);
  const charCardRef = useRef(parsedCharCard);
  const streamingRef = useRef(streaming);
  
  // Keep refs up to date
  serverChatRef.current = serverChat;
  profileRef.current = profile;
  promptEngineeringStoreRef.current = promptEngineeringStore;
  charCardRef.current = parsedCharCard;
  streamingRef.current = streaming;
  
  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const generate = useCallback(async () => {
    // Read from refs to get LATEST values (avoids stale closure)
    const { nodes, speakers, rootId, tailId } = serverChatRef.current;
    const currentProfile = profileRef.current;
    const currentPromptStore = promptEngineeringStoreRef.current;
    const currentCharCard = charCardRef.current;
    const currentStreaming = streamingRef.current;
    
    // Validate we have required data
    if (!currentProfile) {
      showToast({ message: 'No profile active. Please configure AI settings.', type: 'error' });
      return;
    }
    
    const activeAiConfig = currentProfile.aiConfigs.find(c => c.id === currentProfile.activeAiConfigId);
    
    if (!activeAiConfig) {
      showToast({ message: 'No AI configuration active. Please configure a provider.', type: 'error' });
      return;
    }

    // Resolve the global model ID to a provider-specific ID
    const providerModelId = await resolveModelForProvider(
      queryClient,
      activeAiConfig.providerId,
      currentProfile.selectedModelId
    );

    if (!providerModelId) {
      showToast({ message: `Model "${currentProfile.selectedModelId}" is not available on ${activeAiConfig.providerId}. Please update your settings.`, type: 'error' });
      return;
    }
    
    if (!tailId) {
      showToast({ message: 'No conversation to continue.', type: 'warning' });
      return;
    }
    
    // Get prompt engineering preset
    const activePreset = currentPromptStore?.presets.find(
      p => p.id === currentPromptStore.activePresetId
    ) ?? getDefaultPreset();
    
    // Build chat history for prompt (include root greeting for context)
    const history = getActivePathHistory(nodes, rootId, tailId, true);
    
    console.log('[orchestration] Building prompt with history:', history.length, 'messages');
    
    // Find character and user speakers
    const charSpeaker = Array.from(speakers.values()).find(s => !s.is_user);
    const userSpeaker = Array.from(speakers.values()).find(s => s.is_user);
    
    const charId = charSpeaker?.id || '';
    const userId = userSpeaker?.id || '';
    
    // Build prompt using PromptFactory
    const promptContext: PromptFactoryContext = {
      preset: activePreset,
      history,
      speakers,
      charId,
      userId,
      charCard: currentCharCard,
    };
    
    const { messages } = PromptFactory.createChatPrompt(promptContext);
    
    // Check if the last message is an assistant prefill
    const lastMsg = messages[messages.length - 1];
    const prefill = lastMsg?.role === 'assistant' ? (typeof lastMsg.content === 'string' ? lastMsg.content : null) : null;
    const showPrefillInUI = activePreset.sysprompt?.showPrefillWhileStreaming ?? false;
    
    console.log('[orchestration] Prompt:', messages.length, 'messages, prefill:', !!prefill);
    
    if (messages.length === 0) {
      showToast({ message: 'No messages to send to AI.', type: 'warning' });
      return;
    }
    
    // Start streaming in the UI
    const started = currentStreaming.start({ speaker: 'bot' });
    if (!started) {
      showToast({ message: 'Failed to start streaming.', type: 'error' });
      return;
    }
    
    // If prefill exists AND user wants to show it, display immediately
    if (prefill && showPrefillInUI) {
      currentStreaming.setContent(prefill);
    }
    
    // Create abort controller for this generation
    abortControllerRef.current = new AbortController();
    
    try {
      const request: GenerateRequest = {
        providerId: activeAiConfig.providerId,
        modelId: providerModelId, // Use the resolved model ID
        // Preserve the universal model ID (usually an OpenRouter slug) so the server
        // can compute costs using OpenRouter pricing even when using a different provider.
        pricingModelId: currentProfile.selectedModelId ?? undefined,
        messages, 
        params: activeAiConfig.params as GenerateRequest['params'],
      };

      // Add OpenRouter-specific provider routing config if using OpenRouter
      if (activeAiConfig.providerId === 'openrouter') {
        const providerConfig = activeAiConfig.providerConfig;
        // Only include if there are actual routing options set
        const hasRoutingConfig = providerConfig && (
          (providerConfig.order as string[] | undefined)?.length ||
          (providerConfig.ignore as string[] | undefined)?.length ||
          (providerConfig.allow as string[] | undefined)?.length ||
          providerConfig.allowFallbacks === false ||
          providerConfig.requireParameters === true ||
          (providerConfig.quantizations as string[] | undefined)?.length
        );
        
        if (hasRoutingConfig) {
          request.openRouterConfig = {
            provider: {
              order: providerConfig.order as string[] | undefined,
              ignore: providerConfig.ignore as string[] | undefined,
              allow: providerConfig.allow as string[] | undefined,
              allow_fallbacks: providerConfig.allowFallbacks as boolean | undefined,
              require_parameters: providerConfig.requireParameters as boolean | undefined,
              quantizations: providerConfig.quantizations as string[] | undefined,
            },
          };
        }
      }
      
      console.log('[orchestration] Sending request to:', activeAiConfig.providerId, providerModelId);
      
      await streamGenerate(
        request,
        {
          onDelta: (text) => {
            currentStreaming.append(text);
          },
          onDone: (result) => {
            console.log('[orchestration] Generation complete:', result);
          },
          onError: (error) => {
            console.error('[orchestration] Generation error:', error);
            showToast({ message: error.message, type: 'error' });
          },
        },
        abortControllerRef.current.signal
      );
      
      // Finalize the streamed message
      const success = await currentStreaming.finalize();
      if (!success) {
        console.warn('[orchestration] Failed to finalize message');
      }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[orchestration] Generation aborted');
        currentStreaming.cancel();
        return;
      }
      
      console.error('[orchestration] Generation failed:', error);
      const message = error instanceof Error ? error.message : 'Generation failed';
      showToast({ message, type: 'error' });
      currentStreaming.cancel();
    } finally {
      abortControllerRef.current = null;
    }
  }, [queryClient]);
  
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    streaming.cancel();
  }, [streaming]);
  
  return {
    isGenerating: streaming.isStreaming,
    generate,
    cancel,
  };
}
