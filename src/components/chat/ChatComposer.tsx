import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send, Plus, CornerDownLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { showToast } from '../ui/toast';
import { useServerChat } from '../../hooks/queries';
import { useLayoutConfig } from '../../hooks/queries/useProfiles';
import { useChatComposerDraft, useChatComposerStore } from '../../store/chatComposerStore';

export function ChatComposer() {
  const layout = useLayoutConfig();
  const { tailId, speakers, nodes, addMessage, isAddingMessage } = useServerChat();

  const draft = useChatComposerDraft();
  const setDraft = useChatComposerStore((s) => s.setDraft);
  const undo = useChatComposerStore((s) => s.undo);
  const redo = useChatComposerStore((s) => s.redo);
  const clear = useChatComposerStore((s) => s.clear);

  const value = draft.text;
  const [isFocused, setIsFocused] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const userSpeakerId = useMemo(() => {
    const user = Array.from(speakers.values()).find((s) => s.is_user);
    return user?.id ?? Array.from(speakers.values())[0]?.id ?? null;
  }, [speakers]);

  const lastUserMessage = useMemo(() => {
    if (!tailId) return null;
    let currentId: string | null = tailId;
    while (currentId) {
      const node = nodes.get(currentId);
      if (!node) break;
      const sp = speakers.get(node.speaker_id);
      if (sp?.is_user && node.message.trim()) return node.message;
      currentId = node.parent_id;
    }
    return null;
  }, [nodes, speakers, tailId]);

  const isEmpty = !value.trim();

  const syncTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    const next = Math.min(240, Math.max(44, el.scrollHeight));
    el.style.height = `${next}px`;
  }, []);

  useEffect(() => {
    syncTextareaHeight();
  }, [value, syncTextareaHeight]);

  const send = useCallback(async () => {
    const content = value.trim();
    if (!content) return;

    if (!tailId) {
      showToast({ message: 'No parent message available yet.', type: 'warning' });
      return;
    }

    if (!userSpeakerId) {
      showToast({ message: 'No speaker configured for sending.', type: 'warning' });
      return;
    }

    try {
      await addMessage(tailId, content, userSpeakerId, false);
      clear();
      requestAnimationFrame(() => {
        syncTextareaHeight();
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send message.';
      showToast({ message: msg, type: 'error' });
    }
  }, [addMessage, clear, syncTextareaHeight, tailId, userSpeakerId, value]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (el.value !== draft.text) return;
    const desiredStart = Math.min(draft.selectionStart, draft.text.length);
    const desiredEnd = Math.min(draft.selectionEnd, draft.text.length);
    if (el.selectionStart === desiredStart && el.selectionEnd === desiredEnd) return;
    try {
      el.setSelectionRange(desiredStart, desiredEnd);
    } catch {
      // ignore
    }
  }, [draft.selectionEnd, draft.selectionStart, draft.text]);

  const containerWidthStyle = useMemo(() => {
    return {
      width: isMobile ? '100%' : `${layout.containerWidth + 5}%`,
      margin: '0 auto',
    };
  }, [isMobile, layout.containerWidth]);

  return (
    <div className="w-full shrink-0 px-2 pb-3 pt-0" aria-label="Chat composer">
      <div style={containerWidthStyle}>
        <div
          className={cn(
            'rounded-2xl border border-white/10 bg-zinc-950/45 backdrop-blur-md',
            'shadow-[0_-10px_30px_rgba(0,0,0,0.35)]',
            'transition-all duration-150',
            isFocused ? 'bg-zinc-950/60 border-white/15' : 'hover:border-white/15'
          )}
        >
          <form
            className={cn('flex items-end gap-2 p-2', !isFocused && isEmpty ? 'items-center' : 'items-end')}
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn('shrink-0', isFocused ? 'text-zinc-200' : 'text-zinc-400')}
              onClick={() => showToast({ message: 'Attachments not wired yet.', type: 'info' })}
              aria-label="Add"
            >
              <Plus className="h-4 w-4" />
            </Button>

            <div className="min-w-0 flex-1 justify-center">
              <textarea
                ref={textareaRef}
                value={value}
                placeholder="Message…"
                onChange={(e) => {
                  const el = e.currentTarget;
                  setDraft(el.value, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, 'input');
                }}
                onKeyUp={(e) => {
                  const el = e.currentTarget;
                  setDraft(el.value, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, 'selection');
                }}
                onMouseUp={(e) => {
                  const el = e.currentTarget;
                  setDraft(el.value, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, 'selection');
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
                  const mod = isMac ? e.metaKey : e.ctrlKey;

                  if (mod && (e.key === 'z' || e.key === 'Z')) {
                    e.preventDefault();
                    if (e.shiftKey) {
                      const entry = redo();
                      if (!entry) return;
                      requestAnimationFrame(() => {
                        const el = textareaRef.current;
                        if (!el) return;
                        el.focus();
                        el.setSelectionRange(entry.selectionStart, entry.selectionEnd);
                        syncTextareaHeight();
                      });
                      return;
                    }

                    const entry = undo();
                    if (!entry) return;
                    requestAnimationFrame(() => {
                      const el = textareaRef.current;
                      if (!el) return;
                      el.focus();
                      el.setSelectionRange(entry.selectionStart, entry.selectionEnd);
                      syncTextareaHeight();
                    });
                    return;
                  }

                  if (mod && (e.key === 'y' || e.key === 'Y')) {
                    e.preventDefault();
                    const entry = redo();
                    if (!entry) return;
                    requestAnimationFrame(() => {
                      const el = textareaRef.current;
                      if (!el) return;
                      el.focus();
                      el.setSelectionRange(entry.selectionStart, entry.selectionEnd);
                      syncTextareaHeight();
                    });
                    return;
                  }

                  if (e.key === 'Escape') {
                    if (value) {
                      e.preventDefault();
                      clear();
                      requestAnimationFrame(() => {
                        syncTextareaHeight();
                      });
                    }
                    return;
                  }

                  if (e.key === 'ArrowUp') {
                    const el = e.currentTarget;
                    const isAtStart = el.selectionStart === 0 && el.selectionEnd === 0;
                    if (isAtStart && !value.trim() && lastUserMessage) {
                      e.preventDefault();
                      setDraft(lastUserMessage, lastUserMessage.length, lastUserMessage.length, 'shortcut');
                      requestAnimationFrame(() => {
                        el.setSelectionRange(lastUserMessage.length, lastUserMessage.length);
                        syncTextareaHeight();
                      });
                    }
                    return;
                  }

                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                onSelect={(e) => {
                  const el = e.currentTarget;
                  setDraft(el.value, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, 'selection');
                }}
                rows={1}
                className={cn(
                  'w-full resize-none bg-transparent px-2 py-2 text-sm text-zinc-100 outline-none',
                  'placeholder:text-zinc-500',
                  'leading-6',
                  isFocused || !isEmpty ? 'min-h-[44px]' : 'h-[44px] overflow-hidden'
                )}
                style={{ maxHeight: 240 }}
                aria-label="Message input"
              />

              <div
                className={cn(
                  ' text-[11px] text-zinc-500 transition-all duration-150',
                  isFocused || !isEmpty ? 'h-5 opacity-100 px-2 pb-1' : 'h-0 opacity-0 overflow-hidden'
                )}
              >
                <span className="inline-flex items-center gap-1">
                  <CornerDownLeft className="h-3 w-3" />
                  Enter to send
                </span>
                <span className="mx-2 text-zinc-700">|</span>
                <span>Shift+Enter for newline</span>
                <span className="mx-2 text-zinc-700">|</span>
                <span className={cn(value.length > 4000 ? 'text-amber-400' : undefined)}>{value.length} chars</span>
              </div>
            </div>

            <Button
              type="submit"
              variant={isEmpty ? 'secondary' : 'default'}
              size={isFocused || !isEmpty ? 'default' : 'icon'}
              className={cn('shrink-0', isEmpty ? 'opacity-70' : undefined)}
              disabled={isAddingMessage || isEmpty}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
              {isFocused || !isEmpty ? <span>Send</span> : null}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
