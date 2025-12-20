import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { defaultChat } from '../../../api/misc';
import type { ChatNode, Speaker } from '../../../types/chat';
import { useChat } from './queries';
import { useAddMessage, useDeleteMessage, useEditMessage, useSwitchBranch } from './mutations';
import { useChatId } from '../../../components/chat/ChatContext';

export function useDefaultChatId() {
  return useQuery({
    queryKey: ['default-chat'],
    queryFn: () => defaultChat.getId(),
    staleTime: Infinity,
  });
}

export function useServerChat() {
  const contextChatId = useChatId();
  const { data: defaultChatData, isLoading: isLoadingId } = useDefaultChatId();
  const chatId = contextChatId ?? defaultChatData?.id;

  const { data: chat, isLoading: isLoadingChat, error: chatError } = useChat(chatId);

  const error = chatError;

  const nodes = useMemo(() => {
    const map = new Map<string, ChatNode>();
    if (chat?.nodes) {
      chat.nodes.forEach((n) => map.set(n.id, n));
    }
    return map;
  }, [chat?.nodes]);

  const speakersMap = useMemo(() => {
    const map = new Map<string, Speaker>();
    if (chat?.speakers) {
      chat.speakers.forEach((s) => map.set(s.id, s));
    }
    return map;
  }, [chat?.speakers]);

  const rootId = useMemo(() => {
    if (!chat?.nodes) return null;
    const root = chat.nodes.find((n) => n.parent_id === null);
    return root?.id ?? null;
  }, [chat?.nodes]);

  const activePath = useMemo(() => {
    const nodeIds: string[] = [];
    const nodeList: ChatNode[] = [];

    if (!rootId) {
      return { nodeIds, nodes: nodeList };
    }

    let currentId: string | null = rootId;

    while (currentId) {
      const node = nodes.get(currentId);
      if (!node) break;

      nodeIds.push(currentId);
      nodeList.push(node);

      if (node.child_ids.length > 0 && node.active_child_index !== null) {
        currentId = node.child_ids[node.active_child_index];
      } else {
        currentId = null;
      }
    }

    return { nodeIds, nodes: nodeList };
  }, [rootId, nodes]);

  const addMessageMutation = useAddMessage(chatId ?? '');
  const editMessageMutation = useEditMessage(chatId ?? '');
  const deleteMessageMutation = useDeleteMessage(chatId ?? '');
  const switchBranchMutation = useSwitchBranch(chatId ?? '');

  return {
    chatId,
    chat,
    isLoading: isLoadingId || isLoadingChat,
    error,

    nodes,
    speakers: speakersMap,
    rootId,
    tailId: chat?.tailId ?? null,
    activePath,

    addMessage: (
      parentId: string | null,
      content: string,
      speakerId: string,
      isBot: boolean,
      createdAt?: number,
      id?: string
    ) => addMessageMutation.mutateAsync({ parentId, content, speakerId, isBot, createdAt, id: id ?? crypto.randomUUID() }),

    editMessage: (nodeId: string, content: string) => editMessageMutation.mutateAsync({ nodeId, content }),

    deleteMessage: (nodeId: string) => deleteMessageMutation.mutateAsync(nodeId),

    switchBranch: (targetLeafId: string) => switchBranchMutation.mutateAsync(targetLeafId),

    isAddingMessage: addMessageMutation.isPending,
    isEditingMessage: editMessageMutation.isPending,
    isDeletingMessage: deleteMessageMutation.isPending,
    isSwitchingBranch: switchBranchMutation.isPending,
  };
}

/** Get the primary character name for macros */
export function useCharacterName() {
  const { speakers } = useServerChat();
  const botSpeaker = useMemo(() => 
    Array.from(speakers.values()).find(s => !s.is_user),
    [speakers]
  );
  return botSpeaker?.name ?? 'Character';
}

export function useServerChatStatus(): { isLoading: boolean; error: Error | null } {
  const contextChatId = useChatId();
  const { data: defaultChatData, isLoading: isLoadingId, error: defaultChatError } = useDefaultChatId();
  const chatId = contextChatId ?? defaultChatData?.id;

  const chatQuery = useChat(chatId);

  return {
    isLoading: contextChatId ? chatQuery.isLoading : (isLoadingId || chatQuery.isLoading),
    error: contextChatId ? (chatQuery.error ?? null) : ((defaultChatError ?? chatQuery.error) ?? null),
  };
}
