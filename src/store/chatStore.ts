import { create } from 'zustand';
import type { ChatNode, ChatState, Speaker, ActivePath } from '../types/chat';

// Generate unique IDs
const generateId = (): string => crypto.randomUUID();

interface ChatStore extends ChatState {
  // Computed (cached)
  _activePathCache: ActivePath | null;
  
  // Actions
  getActivePath: () => ActivePath;
  addMessage: (parentId: string | null, content: string, speakerId: string, isBot: boolean) => string;
  deleteMessage: (nodeId: string) => void;
  switchBranch: (targetLeafId: string) => void;
  editMessage: (nodeId: string, newContent: string) => void;
  
  // Speakers
  addSpeaker: (speaker: Omit<Speaker, 'id'>) => string;
  
  // Initialization
  initialize: (nodes?: ChatNode[], speakers?: Speaker[]) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  nodes: new Map(),
  root_id: null,
  tail_id: null,
  speakers: new Map(),
  _activePathCache: null,

  getActivePath: () => {
    const state = get();
    
    // Return cached if valid
    if (state._activePathCache) {
      return state._activePathCache;
    }
    
    // Compute active path by following active_child_index from root
    const node_ids: string[] = [];
    const nodes: ChatNode[] = [];
    
    if (!state.root_id) {
      return { node_ids, nodes };
    }
    
    let currentId: string | null = state.root_id;
    
    while (currentId) {
      const node = state.nodes.get(currentId);
      if (!node) break;
      
      node_ids.push(currentId);
      nodes.push(node);
      
      // Follow active child
      if (node.child_ids.length > 0 && node.active_child_index !== null) {
        currentId = node.child_ids[node.active_child_index];
      } else {
        currentId = null;
      }
    }
    
    const activePath = { node_ids, nodes };
    
    // Cache it
    set({ _activePathCache: activePath });
    
    return activePath;
  },

  addMessage: (parentId, content, speakerId, isBot) => {
    const id = generateId();
    const now = Date.now();
    
    const newNode: ChatNode = {
      id,
      parent_id: parentId,
      child_ids: [],
      active_child_index: null,
      speaker_id: speakerId,
      message: content,
      is_bot: isBot,
      created_at: now,
    };
    
    set((state) => {
      const newNodes = new Map(state.nodes);
      newNodes.set(id, newNode);
      
      // Update parent's child_ids and active_child_index
      if (parentId) {
        const parent = newNodes.get(parentId);
        if (parent) {
          const updatedParent = {
            ...parent,
            child_ids: [...parent.child_ids, id],
            active_child_index: parent.child_ids.length, // Point to new child
          };
          newNodes.set(parentId, updatedParent);
        }
      }
      
      return {
        nodes: newNodes,
        root_id: parentId === null ? id : state.root_id,
        tail_id: id,
        _activePathCache: null, // Invalidate cache
      };
    });
    
    return id;
  },

  deleteMessage: (nodeId) => {
    set((state) => {
      const newNodes = new Map(state.nodes);
      const toDelete = new Set<string>();
      
      // Collect node and all descendants
      const collectDescendants = (id: string) => {
        toDelete.add(id);
        const node = newNodes.get(id);
        if (node) {
          node.child_ids.forEach(collectDescendants);
        }
      };
      collectDescendants(nodeId);
      
      // Delete all collected nodes
      toDelete.forEach((id) => newNodes.delete(id));
      
      // Update parent's child_ids
      const deletedNode = state.nodes.get(nodeId);
      if (deletedNode?.parent_id) {
        const parent = newNodes.get(deletedNode.parent_id);
        if (parent) {
          const newChildIds = parent.child_ids.filter((id) => id !== nodeId);
          const newActiveIndex = newChildIds.length > 0 
            ? Math.min(parent.active_child_index ?? 0, newChildIds.length - 1)
            : null;
          
          newNodes.set(deletedNode.parent_id, {
            ...parent,
            child_ids: newChildIds,
            active_child_index: newActiveIndex,
          });
        }
      }
      
      // Update root_id and tail_id if needed
      let newRootId = state.root_id;
      let newTailId = state.tail_id;
      
      if (toDelete.has(state.root_id ?? '')) {
        newRootId = null;
      }
      if (toDelete.has(state.tail_id ?? '')) {
        newTailId = deletedNode?.parent_id ?? null;
      }
      
      return {
        nodes: newNodes,
        root_id: newRootId,
        tail_id: newTailId,
        _activePathCache: null,
      };
    });
  },

  switchBranch: (targetLeafId) => {
    set((state) => {
      const newNodes = new Map(state.nodes);
      
      // Walk up from target and update active_child_index on each parent
      let currentId: string | null = targetLeafId;
      
      while (currentId) {
        const node = newNodes.get(currentId);
        if (!node || !node.parent_id) break;
        
        const parent = newNodes.get(node.parent_id);
        if (!parent) break;
        
        const childIndex = parent.child_ids.indexOf(currentId);
        if (childIndex !== -1 && parent.active_child_index !== childIndex) {
          newNodes.set(node.parent_id, {
            ...parent,
            active_child_index: childIndex,
          });
        }
        
        currentId = node.parent_id;
      }
      
      return {
        nodes: newNodes,
        tail_id: targetLeafId,
        _activePathCache: null,
      };
    });
  },

  editMessage: (nodeId, newContent) => {
    set((state) => {
      const node = state.nodes.get(nodeId);
      if (!node) return state;
      
      const newNodes = new Map(state.nodes);
      newNodes.set(nodeId, {
        ...node,
        message: newContent,
        updated_at: Date.now(),
      });
      
      // Don't invalidate path cache - structure unchanged
      return { nodes: newNodes };
    });
  },

  addSpeaker: (speaker) => {
    const id = generateId();
    set((state) => {
      const newSpeakers = new Map(state.speakers);
      newSpeakers.set(id, { ...speaker, id });
      return { speakers: newSpeakers };
    });
    return id;
  },

  initialize: (nodes = [], speakers = []) => {
    const nodeMap = new Map<string, ChatNode>();
    nodes.forEach((n) => nodeMap.set(n.id, n));
    
    const speakerMap = new Map<string, Speaker>();
    speakers.forEach((s) => speakerMap.set(s.id, s));
    
    // Find root (node with no parent)
    const root = nodes.find((n) => n.parent_id === null);
    
    // Find tail (follow active path to end)
    let tailId = root?.id ?? null;
    if (tailId) {
      let current = nodeMap.get(tailId);
      while (current && current.child_ids.length > 0 && current.active_child_index !== null) {
        tailId = current.child_ids[current.active_child_index];
        current = nodeMap.get(tailId);
      }
    }
    
    set({
      nodes: nodeMap,
      speakers: speakerMap,
      root_id: root?.id ?? null,
      tail_id: tailId,
      _activePathCache: null,
    });
  },
}));
