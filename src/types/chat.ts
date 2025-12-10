// Core message tree types based on our architecture design

export interface ChatNode {
  id: string;
  parent_id: string | null;
  child_ids: string[];
  active_child_index: number | null; // Blake's index-based switching
  
  // Content
  speaker_id: string;
  message: string;
  is_bot: boolean;
  
  // Metadata
  created_at: number; // Unix timestamp
  updated_at?: number;
}

export interface Speaker {
  id: string;
  name: string;
  avatar_url?: string;
  color?: string;
  is_user: boolean;
}

export interface ChatState {
  nodes: Map<string, ChatNode>;
  root_id: string | null;
  tail_id: string | null; // Current cursor position
  speakers: Map<string, Speaker>;
}

// Computed from ChatState, not stored
export interface ActivePath {
  node_ids: string[];
  nodes: ChatNode[];
}

// For virtualization - what's actually rendered
export interface VisibleRange {
  start_index: number;
  end_index: number;
  overscan: number; // Extra items above/below viewport
}
