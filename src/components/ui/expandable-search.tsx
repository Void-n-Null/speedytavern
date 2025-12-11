/**
 * ExpandableSearch - Search button that expands into an input field
 * 
 * Starts as a compact button, expands horizontally on click to reveal input.
 * Collapses back on blur (if empty) or Escape key.
 */

import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ExpandableSearchProps {
  value: string;
  onChange: (value: string) => void;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  placeholder?: string;
  shortcut?: string;
  className?: string;
}

export function ExpandableSearch({
  value,
  onChange,
  expanded: controlledExpanded,
  onExpandedChange,
  placeholder = 'Search...',
  shortcut = '⌘K',
  className,
}: ExpandableSearchProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Support both controlled and uncontrolled modes
  const expanded = controlledExpanded ?? internalExpanded;
  const setExpanded = (val: boolean) => {
    setInternalExpanded(val);
    onExpandedChange?.(val);
  };

  // Focus input when expanded externally (e.g., via keyboard shortcut)
  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  const expand = () => {
    setExpanded(true);
  };

  const collapse = () => {
    if (value.trim()) return; // Don't collapse if there's a query
    setExpanded(false);
    onChange('');
  };

  const forceCollapse = () => {
    setExpanded(false);
    onChange('');
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expanded) {
        forceCollapse();
      }
    };
    
    if (expanded) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [expanded]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        collapse();
      }
    };

    if (expanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [expanded, value]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative flex items-center h-8 rounded-lg border transition-all duration-200 ease-out overflow-hidden",
        expanded 
          ? "max-w-64 shrink-0 bg-zinc-800/50 border-zinc-600 ring-2 ring-violet-500/40" 
          : "w-auto bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600 cursor-pointer",
        className
      )}
    >
      {expanded ? (
        <>
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={collapse}
            placeholder={placeholder}
            className="w-full h-full pl-8 pr-8 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          {value && (
            <button
              onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
              onClick={forceCollapse}
              className="absolute right-2 p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      ) : (
        <button
          onClick={expand}
          className="flex items-center gap-2 px-3 h-full text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search</span>
          {shortcut && (
            <kbd className="hidden sm:inline text-xs bg-zinc-700/50 px-1.5 py-0.5 rounded text-zinc-400">
              {shortcut}
            </kbd>
          )}
        </button>
      )}
    </div>
  );
}
