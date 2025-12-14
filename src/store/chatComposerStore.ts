import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type DraftEntry = {
  text: string;
  selectionStart: number;
  selectionEnd: number;
  at: number;
};

type CommitKind = 'input' | 'shortcut' | 'send' | 'program' | 'selection';

interface ChatComposerState {
  history: DraftEntry[];
  index: number;
  lastCommitAt: number;

  setDraft: (text: string, selectionStart: number, selectionEnd: number, kind?: CommitKind) => void;
  undo: () => DraftEntry | null;
  redo: () => DraftEntry | null;
  clear: () => void;
}

const MAX_HISTORY = 200;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function normalizeSelection(text: string, start: number, end: number): { start: number; end: number } {
  const s = clamp(start, 0, text.length);
  const e = clamp(end, 0, text.length);
  return { start: Math.min(s, e), end: Math.max(s, e) };
}

export const useChatComposerStore = create<ChatComposerState>()(
  persist(
    (set, get) => ({
      history: [{ text: '', selectionStart: 0, selectionEnd: 0, at: Date.now() }],
      index: 0,
      lastCommitAt: 0,

      setDraft: (text, selectionStart, selectionEnd, kind = 'input') => {
        const now = Date.now();
        const { start, end } = normalizeSelection(text, selectionStart, selectionEnd);

        const state = get();
        const current = state.history[state.index] ?? { text: '', selectionStart: 0, selectionEnd: 0, at: 0 };
        if (current.text === text && current.selectionStart === start && current.selectionEnd === end) return;

        // Selection-only update: keep undo history stable and only update the current entry.
        // Without this, cursor moves would create tons of history entries and make Ctrl+Z unusable.
        if (current.text === text) {
          const nextHistory = state.history.slice();
          nextHistory[state.index] = { ...current, selectionStart: start, selectionEnd: end, at: now };
          set({ history: nextHistory });
          return;
        }

        const coalesce =
          kind === 'input' &&
          state.index === state.history.length - 1 &&
          state.history.length > 0 &&
          now - state.lastCommitAt < 750;

        let nextHistory = state.history;
        let nextIndex = state.index;

        if (state.index !== state.history.length - 1) {
          nextHistory = state.history.slice(0, state.index + 1);
        }

        const entry: DraftEntry = { text, selectionStart: start, selectionEnd: end, at: now };

        if (coalesce) {
          nextHistory = nextHistory.slice();
          nextHistory[nextHistory.length - 1] = entry;
          nextIndex = nextHistory.length - 1;
        } else {
          nextHistory = [...nextHistory, entry];
          nextIndex = nextHistory.length - 1;
        }

        if (nextHistory.length > MAX_HISTORY) {
          const overflow = nextHistory.length - MAX_HISTORY;
          nextHistory = nextHistory.slice(overflow);
          nextIndex = Math.max(0, nextIndex - overflow);
        }

        set({ history: nextHistory, index: nextIndex, lastCommitAt: now });
      },

      undo: () => {
        const state = get();
        if (state.index <= 0) return null;
        const nextIndex = state.index - 1;
        const entry = state.history[nextIndex] ?? null;
        if (!entry) return null;
        set({ index: nextIndex });
        return entry;
      },

      redo: () => {
        const state = get();
        if (state.index >= state.history.length - 1) return null;
        const nextIndex = state.index + 1;
        const entry = state.history[nextIndex] ?? null;
        if (!entry) return null;
        set({ index: nextIndex });
        return entry;
      },

      clear: () => {
        const state = get();
        const current = state.history[state.index];
        if (current?.text === '') return;
        state.setDraft('', 0, 0, 'send');
      },
    }),
    {
      name: 'chat-composer',
      version: 1,
      partialize: (s) => ({ history: s.history, index: s.index, lastCommitAt: s.lastCommitAt }),
    }
  )
);

export function useChatComposerDraft(): DraftEntry {
  return useChatComposerStore((s) => s.history[s.index] ?? { text: '', selectionStart: 0, selectionEnd: 0, at: 0 });
}

export function useChatComposerCanUndo(): boolean {
  return useChatComposerStore((s) => s.index > 0);
}

export function useChatComposerCanRedo(): boolean {
  return useChatComposerStore((s) => s.index < s.history.length - 1);
}
