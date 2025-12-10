/**
 * TanStack Query hooks for chat operations.
 * Provides caching, optimistic updates, and automatic refetching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { chats, type ChatMeta, type ChatFull } from '../../api/client';
import type { ChatNode } from '../../types/chat';

// ============ Queries ============

/** Fetch list of all chats (metadata only) */
export function useChatList() {
  return useQuery({
    queryKey: queryKeys.chats.list(),
    queryFn: () => chats.list(),
  });
}

/** Fetch single chat with all nodes */
export function useChat(chatId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.chats.detail(chatId ?? ''),
    queryFn: () => chats.get(chatId!),
    enabled: !!chatId,
  });
}

// ============ Mutations ============

/** Create a new chat */
export function useCreateChat() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (name: string) => chats.create(name),
    onSuccess: (newChat) => {
      // Add to list cache
      queryClient.setQueryData<ChatMeta[]>(
        queryKeys.chats.list(),
        (old) => old ? [newChat, ...old] : [newChat]
      );
    },
  });
}

/** Update chat metadata */
export function useUpdateChat() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => 
      chats.update(id, name),
    onSuccess: (_, { id, name }) => {
      // Update in list cache
      queryClient.setQueryData<ChatMeta[]>(
        queryKeys.chats.list(),
        (old) => old?.map(c => c.id === id ? { ...c, name } : c)
      );
      // Invalidate detail to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.detail(id) });
    },
  });
}

/** Delete a chat */
export function useDeleteChat() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => chats.delete(id),
    onSuccess: (_, id) => {
      // Remove from list cache
      queryClient.setQueryData<ChatMeta[]>(
        queryKeys.chats.list(),
        (old) => old?.filter(c => c.id !== id)
      );
      // Remove detail cache
      queryClient.removeQueries({ queryKey: queryKeys.chats.detail(id) });
    },
  });
}

/** Add message to chat with optimistic update */
export function useAddMessage(chatId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: {
      parentId: string | null;
      content: string;
      speakerId: string;
      isBot: boolean;
    }) => chats.addMessage(chatId, params.parentId, params.content, params.speakerId, params.isBot),
    
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.chats.detail(chatId) });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData<ChatFull>(queryKeys.chats.detail(chatId));
      
      // Optimistically add the message
      if (previous) {
        const tempId = crypto.randomUUID();
        const now = Date.now();
        
        const newNode: ChatNode = {
          id: tempId,
          parent_id: params.parentId,
          child_ids: [],
          active_child_index: null,
          speaker_id: params.speakerId,
          message: params.content,
          is_bot: params.isBot,
          created_at: now,
        };
        
        // Update parent's child_ids
        const updatedNodes = previous.nodes.map(node => {
          if (node.id === params.parentId) {
            return {
              ...node,
              child_ids: [...node.child_ids, tempId],
              active_child_index: node.child_ids.length,
            };
          }
          return node;
        });
        
        queryClient.setQueryData<ChatFull>(queryKeys.chats.detail(chatId), {
          ...previous,
          nodes: [...updatedNodes, newNode],
          tailId: tempId,
        });
      }
      
      return { previous };
    },
    
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.chats.detail(chatId), context.previous);
      }
    },
    
    onSettled: () => {
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.detail(chatId) });
    },
  });
}

/** Edit message with optimistic update */
export function useEditMessage(chatId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ nodeId, content }: { nodeId: string; content: string }) =>
      chats.editMessage(chatId, nodeId, content),
    
    onMutate: async ({ nodeId, content }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.chats.detail(chatId) });
      
      const previous = queryClient.getQueryData<ChatFull>(queryKeys.chats.detail(chatId));
      
      if (previous) {
        queryClient.setQueryData<ChatFull>(queryKeys.chats.detail(chatId), {
          ...previous,
          nodes: previous.nodes.map(node =>
            node.id === nodeId
              ? { ...node, message: content, updated_at: Date.now() }
              : node
          ),
        });
      }
      
      return { previous };
    },
    
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.chats.detail(chatId), context.previous);
      }
    },
  });
}

/** Delete message */
export function useDeleteMessage(chatId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (nodeId: string) => chats.deleteMessage(chatId, nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.detail(chatId) });
    },
  });
}

/** Switch branch with optimistic update */
export function useSwitchBranch(chatId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (targetLeafId: string) => chats.switchBranch(chatId, targetLeafId),
    
    onMutate: async (targetLeafId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.chats.detail(chatId) });
      
      const previous = queryClient.getQueryData<ChatFull>(queryKeys.chats.detail(chatId));
      
      if (previous) {
        // Walk up from target and update active_child_index
        const nodeMap = new Map(previous.nodes.map(n => [n.id, { ...n }]));
        let currentId: string | null = targetLeafId;
        
        while (currentId) {
          const node = nodeMap.get(currentId);
          if (!node?.parent_id) break;
          
          const parent = nodeMap.get(node.parent_id);
          if (!parent) break;
          
          const childIndex = parent.child_ids.indexOf(currentId);
          if (childIndex !== -1) {
            parent.active_child_index = childIndex;
          }
          
          currentId = node.parent_id;
        }
        
        queryClient.setQueryData<ChatFull>(queryKeys.chats.detail(chatId), {
          ...previous,
          nodes: Array.from(nodeMap.values()),
          tailId: targetLeafId,
        });
      }
      
      return { previous };
    },
    
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.chats.detail(chatId), context.previous);
      }
    },
  });
}
