import { useCallback, useEffect, type RefObject } from 'react';

export function useTextareaHeight(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  value: string
) {
  const syncHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    const next = Math.min(240, Math.max(44, el.scrollHeight));
    el.style.height = `${next}px`;
  }, [textareaRef]);

  useEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  return { syncHeight };
}

