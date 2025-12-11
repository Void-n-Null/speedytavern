/**
 * Design Config Modal UI State
 * 
 * Persists modal state (active section, scroll position) across open/close cycles.
 * This makes tweaking design settings much smoother - you stay where you were.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DesignConfigModalState {
  // Navigation
  activeSection: string;
  scrollPosition: number;
  
  // Search
  searchQuery: string;
  
  // Display preferences
  compactMode: boolean;
  collapsedGroups: Set<string>;
  
  // Confirmation dialog
  confirmDialog: {
    open: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
  };
  
  // Actions
  setActiveSection: (section: string) => void;
  setScrollPosition: (position: number) => void;
  setSearchQuery: (query: string) => void;
  toggleCompactMode: () => void;
  toggleGroupCollapsed: (groupKey: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  hideConfirm: () => void;
}

export const useDesignConfigModalState = create<DesignConfigModalState>()(
  persist(
    (set) => ({
      activeSection: 'profile',
      scrollPosition: 0,
      searchQuery: '',
      compactMode: false,
      collapsedGroups: new Set(),
      confirmDialog: { open: false, title: '', message: '', onConfirm: null },
      
      setActiveSection: (section) => set((s) => {
        // Avoid triggering rerenders when nothing changes (important for holding arrow keys at list bounds)
        if (s.activeSection === section) return s;
        return { activeSection: section, scrollPosition: 0 };
      }),
      setScrollPosition: (position) => set({ scrollPosition: position }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      toggleCompactMode: () => set((s) => ({ compactMode: !s.compactMode })),
      toggleGroupCollapsed: (groupKey) => set((s) => {
        const next = new Set(s.collapsedGroups);
        if (next.has(groupKey)) next.delete(groupKey);
        else next.add(groupKey);
        return { collapsedGroups: next };
      }),
      showConfirm: (title, message, onConfirm) => set({
        confirmDialog: { open: true, title, message, onConfirm },
      }),
      hideConfirm: () => set({
        confirmDialog: { open: false, title: '', message: '', onConfirm: null },
      }),
    }),
    {
      name: 'design-config-modal',
      partialize: (state) => ({
        compactMode: state.compactMode,
        // Don't persist collapsedGroups as Set doesn't serialize well
      }),
    }
  )
);
