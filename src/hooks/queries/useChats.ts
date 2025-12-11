/**
 * TanStack Query hooks for chat operations.
 * Provides caching, optimistic updates, and automatic refetching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '../../lib/queryClient';
import { chats, defaultChat, type ChatMeta, type ChatFull } from '../../api/client';
import type { ChatNode, Speaker } from '../../types/chat';

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
      createdAt?: number;
    }) => chats.addMessage(chatId, params.parentId, params.content, params.speakerId, params.isBot, params.createdAt),
    
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.chats.detail(chatId) });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData<ChatFull>(queryKeys.chats.detail(chatId));
      
      // Optimistically add the message with a temporary ID
      const tempId = `__temp_${crypto.randomUUID()}`;
      
      if (previous) {
        const createdAt = params.createdAt ?? Date.now();
        
        const newNode: ChatNode = {
          id: tempId,
          parent_id: params.parentId,
          child_ids: [],
          active_child_index: null,
          speaker_id: params.speakerId,
          message: params.content,
          is_bot: params.isBot,
          created_at: createdAt,
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
      
      return { previous, tempId };
    },
    
    onSuccess: (response, params, context) => {
      // Replace temp node with real node from server
      const current = queryClient.getQueryData<ChatFull>(queryKeys.chats.detail(chatId));
      if (current && context?.tempId) {
        const realId = response.id;
        const realCreatedAt = response.created_at;
        
        queryClient.setQueryData<ChatFull>(queryKeys.chats.detail(chatId), {
          ...current,
          nodes: current.nodes.map(node => {
            // Replace temp node with real ID
            if (node.id === context.tempId) {
              return { ...node, id: realId, created_at: realCreatedAt };
            }
            // Update parent's child_ids to use real ID
            if (node.id === params.parentId) {
              return {
                ...node,
                child_ids: node.child_ids.map(cid => cid === context.tempId ? realId : cid),
              };
            }
            return node;
          }),
          tailId: current.tailId === context.tempId ? realId : current.tailId,
        });
      }
    },
    
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.chats.detail(chatId), context.previous);
      }
    },
    // No onSettled - we don't need to refetch!
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

/** Delete message with optimistic update */
export function useDeleteMessage(chatId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (nodeId: string) => chats.deleteMessage(chatId, nodeId),
    
    onMutate: async (nodeId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.chats.detail(chatId) });
      
      const previous = queryClient.getQueryData<ChatFull>(queryKeys.chats.detail(chatId));
      
      if (previous) {
        // Collect node and all descendants to delete
        const toDelete = new Set<string>();
        const collectDescendants = (id: string) => {
          toDelete.add(id);
          const node = previous.nodes.find(n => n.id === id);
          node?.child_ids.forEach(collectDescendants);
        };
        collectDescendants(nodeId);
        
        // Find the node's parent to update its child_ids
        const deletedNode = previous.nodes.find(n => n.id === nodeId);
        const parentId = deletedNode?.parent_id;
        
        // Filter out deleted nodes and update parent
        const updatedNodes = previous.nodes
          .filter(n => !toDelete.has(n.id))
          .map(node => {
            if (node.id === parentId) {
              const newChildIds = node.child_ids.filter(cid => cid !== nodeId);
              return {
                ...node,
                child_ids: newChildIds,
                active_child_index: newChildIds.length > 0 
                  ? Math.min(node.active_child_index ?? 0, newChildIds.length - 1)
                  : null,
              };
            }
            return node;
          });
        
        // Recalculate tail
        let newTailId = previous.rootId;
        if (newTailId) {
          const nodeMap = new Map(updatedNodes.map(n => [n.id, n]));
          let current = nodeMap.get(newTailId);
          while (current && current.child_ids.length > 0 && current.active_child_index !== null) {
            newTailId = current.child_ids[current.active_child_index];
            current = nodeMap.get(newTailId);
          }
        }
        
        queryClient.setQueryData<ChatFull>(queryKeys.chats.detail(chatId), {
          ...previous,
          nodes: updatedNodes,
          tailId: newTailId,
        });
      }
      
      return { previous };
    },
    
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.chats.detail(chatId), context.previous);
      }
    },
    // No refetch needed - optimistic update handles it
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

// ============ Default Chat ============

/** Fetch the default chat ID from server */
export function useDefaultChatId() {
  return useQuery({
    queryKey: ['default-chat'],
    queryFn: () => defaultChat.getId(),
    staleTime: Infinity, // ID doesn't change during session
  });
}

/**
 * Load the default chat from server with computed data.
 * This is the main hook for bootstrapping the chat UI.
 * 
 * All state comes directly from TanStack Query cache - no Zustand sync needed.
 */
export function useServerChat() {
  const { data: defaultChatData, isLoading: isLoadingId } = useDefaultChatId();
  const chatId = defaultChatData?.id;
  
  const { data: chat, isLoading: isLoadingChat, error: chatError } = useChat(chatId);
  
  // Speakers now come from chat response - no separate fetch needed!
  const error = chatError;
  
  // Compute nodes Map for efficient lookup
  const nodes = useMemo(() => {
    const map = new Map<string, ChatNode>();
    if (chat?.nodes) {
      chat.nodes.forEach(n => map.set(n.id, n));
    }
    return map;
  }, [chat?.nodes]);
  
  // Compute speakers Map from chat response
  const speakersMap = useMemo(() => {
    const map = new Map<string, Speaker>();
    if (chat?.speakers) {
      chat.speakers.forEach(s => map.set(s.id, s));
    }
    return map;
  }, [chat?.speakers]);
  
  // Find root node (node with no parent)
  const rootId = useMemo(() => {
    if (!chat?.nodes) return null;
    const root = chat.nodes.find(n => n.parent_id === null);
    return root?.id ?? null;
  }, [chat?.nodes]);
  
  // Compute active path by following active_child_index from root
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
      
      // Follow active child
      if (node.child_ids.length > 0 && node.active_child_index !== null) {
        currentId = node.child_ids[node.active_child_index];
      } else {
        currentId = null;
      }
    }
    
    return { nodeIds, nodes: nodeList };
  }, [rootId, nodes]);
  
  // Mutations bound to the current chat
  const addMessageMutation = useAddMessage(chatId ?? '');
  const editMessageMutation = useEditMessage(chatId ?? '');
  const deleteMessageMutation = useDeleteMessage(chatId ?? '');
  const switchBranchMutation = useSwitchBranch(chatId ?? '');
  
  return {
    chatId,
    chat,
    isLoading: isLoadingId || isLoadingChat,
    error,
    
    // Computed data (replaces Zustand)
    nodes,
    speakers: speakersMap,
    rootId,
    tailId: chat?.tailId ?? null,
    activePath,
    
    // Bound mutations
    addMessage: (parentId: string | null, content: string, speakerId: string, isBot: boolean, createdAt?: number) =>
      addMessageMutation.mutateAsync({ parentId, content, speakerId, isBot, createdAt }),
    
    editMessage: (nodeId: string, content: string) =>
      editMessageMutation.mutateAsync({ nodeId, content }),
    
    deleteMessage: (nodeId: string) =>
      deleteMessageMutation.mutateAsync(nodeId),
    
    switchBranch: (targetLeafId: string) =>
      switchBranchMutation.mutateAsync(targetLeafId),
    
    // Mutation states
    isAddingMessage: addMessageMutation.isPending,
    isEditingMessage: editMessageMutation.isPending,
    isDeletingMessage: deleteMessageMutation.isPending,
    isSwitchingBranch: switchBranchMutation.isPending,
  };
}
