/**
 * ChatContext - Provides the current chat ID to all child components.
 * 
 * This allows MessageList, ChatComposer, and other chat components to access
 * the current chat ID without prop drilling.
 */

import { createContext, useContext } from 'react';

interface ChatContextValue {
  chatId: string;
}

export const ChatContext = createContext<ChatContextValue | null>(null);

/**
 * Hook to get the current chat ID from context.
 * Falls back to the default chat if not in a ChatContext.
 */
export function useChatId(): string | undefined {
  const context = useContext(ChatContext);
  return context?.chatId;
}

/**
 * Hook that requires a chat ID - throws if not available.
 */
export function useRequiredChatId(): string {
  const chatId = useChatId();
  if (!chatId) {
    throw new Error('useRequiredChatId must be used within a ChatContext.Provider');
  }
  return chatId;
}


