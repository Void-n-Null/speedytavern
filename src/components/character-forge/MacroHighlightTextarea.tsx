/**
 * MacroHighlightTextarea - Textarea with visual highlighting of macros and inline autocomplete.
 * 
 * Highlights {{char}}, {{user}}, {{original}}, and other common macros
 * with distinct colors. Uses an overlay technique to show highlights
 * while keeping the textarea fully functional.
 * 
 * Features inline autocomplete when typing {{ to show available macros.
 */

import { useRef, useLayoutEffect, useState, useId, useCallback, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { MACRO_DEFINITIONS, MACRO_COLORS, type MacroDefinition } from '../../lib/macros';

// Build regex patterns from macro definitions
const MACRO_PATTERNS: Array<{ pattern: RegExp; className: string; label: string }> = [
  ...MACRO_DEFINITIONS.map((m) => ({
    pattern: new RegExp(m.macro.replace(/[{}]/g, '\\$&').replace(/:[^}]+/, ':[^}]+'), 'gi'),
    className: `${MACRO_COLORS[m.category].bg} ${MACRO_COLORS[m.category].text}`,
    label: m.label,
  })),
  // Legacy markers
  { pattern: /<BOT>/gi, className: 'bg-violet-500/30 text-violet-300', label: 'Bot marker' },
  { pattern: /<USER>/gi, className: 'bg-blue-500/30 text-blue-300', label: 'User marker' },
  { pattern: /<START>/gi, className: 'bg-zinc-500/30 text-zinc-300', label: 'Start marker' },
];

interface MacroHighlightTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  maxRows?: number;
  label?: string;
  description?: string;
}

export function MacroHighlightTextarea({
  value,
  onChange,
  placeholder,
  className,
  rows = 4,
  maxRows,
  label,
  description,
}: MacroHighlightTextareaProps) {
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteFilter, setAutocompleteFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number } | null>(null);
  
  // Get filtered macros for autocomplete
  const filteredMacros = MACRO_DEFINITIONS.filter((m) =>
    m.macro.toLowerCase().includes(autocompleteFilter.toLowerCase()) ||
    m.label.toLowerCase().includes(autocompleteFilter.toLowerCase())
  ).slice(0, 8); // Limit to 8 suggestions
  
  // Sync scroll position
  const handleScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };
  
  // Check for {{ trigger and show autocomplete
  const checkForAutocomplete = useCallback((text: string, cursorPos: number) => {
    // Find the last {{ before cursor
    const beforeCursor = text.slice(0, cursorPos);
    const lastOpenBrace = beforeCursor.lastIndexOf('{{');
    
    if (lastOpenBrace === -1) {
      setShowAutocomplete(false);
      return;
    }
    
    // Check if there's a closing }} between {{ and cursor
    const afterBrace = beforeCursor.slice(lastOpenBrace);
    if (afterBrace.includes('}}')) {
      setShowAutocomplete(false);
      return;
    }
    
    // Get the partial macro name being typed
    const partial = afterBrace.slice(2); // Remove {{
    setAutocompleteFilter(partial);
    setSelectedIndex(0);
    setShowAutocomplete(true);
    
    // Calculate cursor position for autocomplete popup
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const style = getComputedStyle(textarea);
      const lineHeight = parseInt(style.lineHeight) || 20;
      const paddingTop = parseInt(style.paddingTop) || 12;
      const paddingLeft = parseInt(style.paddingLeft) || 12;
      
      // Count lines before cursor
      const linesBeforeCursor = beforeCursor.split('\n').length;
      const currentLine = beforeCursor.split('\n').pop() || '';
      
      // Rough character width estimate (monospace)
      const charWidth = 8;
      
      setCursorPosition({
        top: paddingTop + (linesBeforeCursor - 1) * lineHeight + lineHeight,
        left: paddingLeft + currentLine.length * charWidth,
      });
    }
  }, []);
  
  // Insert selected macro
  const insertMacro = useCallback((macro: MacroDefinition) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const text = value;
    
    // Find the {{ before cursor
    const beforeCursor = text.slice(0, cursorPos);
    const lastOpenBrace = beforeCursor.lastIndexOf('{{');
    
    if (lastOpenBrace === -1) return;
    
    // Replace from {{ to cursor with the full macro
    const newValue = text.slice(0, lastOpenBrace) + macro.macro + text.slice(cursorPos);
    onChange(newValue);
    
    // Move cursor after the inserted macro
    const newCursorPos = lastOpenBrace + macro.macro.length;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
    
    setShowAutocomplete(false);
  }, [value, onChange]);
  
  // Handle keyboard navigation in autocomplete
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showAutocomplete || filteredMacros.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filteredMacros.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredMacros.length) % filteredMacros.length);
        break;
      case 'Enter':
      case 'Tab':
        if (filteredMacros[selectedIndex]) {
          e.preventDefault();
          insertMacro(filteredMacros[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowAutocomplete(false);
        break;
    }
  }, [showAutocomplete, filteredMacros, selectedIndex, insertMacro]);
  
  // Close autocomplete on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Generate highlighted HTML
  const getHighlightedHtml = () => {
    if (!value) return '';
    
    // Escape HTML
    let html = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Apply macro highlights
    for (const { pattern, className: cls } of MACRO_PATTERNS) {
      html = html.replace(pattern, (match) => {
        return `<mark class="${cls} rounded px-0.5">${match}</mark>`;
      });
    }
    
    // Preserve line breaks and trailing newline for proper sizing
    html = html.replace(/\n/g, '<br/>');
    if (value.endsWith('\n')) {
      html += '<br/>';
    }
    
    return html;
  };
  
  // Auto-resize if maxRows is set
  useLayoutEffect(() => {
    if (!textareaRef.current || !maxRows) return;
    
    const textarea = textareaRef.current;
    textarea.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
    const maxHeight = lineHeight * maxRows;
    const minHeight = lineHeight * rows;
    
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [value, rows, maxRows]);

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-300">
          {label}
        </label>
      )}
      {description && (
        <p className="mb-2 text-xs text-zinc-500">{description}</p>
      )}
      
      <div className="relative">
        {/* Highlight backdrop */}
        <div
          ref={backdropRef}
          className={cn(
            'pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words p-3',
            'font-mono text-sm text-transparent',
            'rounded-lg border border-transparent'
          )}
          style={{ wordWrap: 'break-word' }}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: getHighlightedHtml() }}
        />
        
        {/* Actual textarea */}
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            checkForAutocomplete(e.target.value, e.target.selectionStart);
          }}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            // Delay hiding autocomplete to allow click on suggestions
            setTimeout(() => setShowAutocomplete(false), 150);
          }}
          onClick={(e) => {
            const target = e.target as HTMLTextAreaElement;
            checkForAutocomplete(value, target.selectionStart);
          }}
          placeholder={placeholder}
          rows={rows}
          spellCheck={false}
          className={cn(
            'relative w-full resize-y rounded-lg border bg-zinc-900/80 p-3',
            'font-mono text-sm text-zinc-200 caret-zinc-100',
            'placeholder:text-zinc-600',
            'focus:outline-none',
            isFocused 
              ? 'border-violet-500/50 ring-1 ring-violet-500/30' 
              : 'border-zinc-800'
          )}
          style={{ 
            // Make text slightly transparent so highlights show through
            color: 'rgba(228, 228, 231, 0.9)',
            background: 'rgba(24, 24, 27, 0.8)',
          }}
        />
        
        {/* Autocomplete dropdown */}
        {showAutocomplete && filteredMacros.length > 0 && cursorPosition && (
          <div
            ref={autocompleteRef}
            className="absolute z-50 max-h-48 overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl"
            style={{
              top: Math.min(cursorPosition.top, 200),
              left: Math.min(cursorPosition.left, 200),
              minWidth: '220px',
            }}
          >
            {filteredMacros.map((macro, i) => (
              <button
                key={macro.macro}
                type="button"
                className={cn(
                  'flex w-full items-start gap-2 px-3 py-2 text-left text-xs',
                  'hover:bg-zinc-800 transition-colors',
                  i === selectedIndex && 'bg-zinc-800'
                )}
                onClick={() => insertMacro(macro)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className={cn('rounded px-1.5 py-0.5 font-mono', MACRO_COLORS[macro.category].bg, MACRO_COLORS[macro.category].text)}>
                  {macro.macro}
                </span>
                <span className="text-zinc-500 truncate">{macro.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Macro legend (only when focused) */}
      {isFocused && value && (
        <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
          {MACRO_PATTERNS.slice(0, 4).map(({ pattern, className: cls, label: lbl }) => {
            const match = value.match(pattern);
            if (!match) return null;
            return (
              <span key={lbl} className={cn('rounded px-1.5 py-0.5', cls)}>
                {lbl}
              </span>
            );
          }).filter(Boolean)}
        </div>
      )}
    </div>
  );
}

