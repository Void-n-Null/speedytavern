/**
 * SliderControl - Slider with editable value display
 * 
 * Uses local state during drag, commits only on release via onValueCommit.
 */

import { useState, useRef, useEffect } from 'react';
import { Slider } from '../../ui/slider';

interface SliderControlProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}

export function SliderControl({ 
  value, 
  onChange, 
  min, 
  max, 
  step = 1,
  suffix = '',
}: SliderControlProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [inputValue, setInputValue] = useState(String(value));
  const isDraggingRef = useRef(false);
  
  // Sync local state when value changes externally (not during drag)
  useEffect(() => {
    if (!isDraggingRef.current && !editing) {
      setLocalValue(value);
      setInputValue(String(value));
    }
  }, [value, editing]);

  const handleSubmit = () => {
    const num = parseFloat(inputValue);
    if (!isNaN(num)) {
      onChange(Math.max(min, Math.min(max, num)));
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 w-48">
      <div className="flex-1">
        <Slider
          value={[localValue]}
          onValueChange={([v]) => {
            isDraggingRef.current = true;
            setLocalValue(v);
          }}
          onValueCommit={([v]) => {
            isDraggingRef.current = false;
            onChange(v);
          }}
          min={min}
          max={max}
          step={step}
          className="flex-1"
        />
      </div>
      {editing ? (
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') setEditing(false);
          }}
          min={min}
          max={max}
          step={step}
          className="w-14 h-6 px-1.5 text-xs text-right tabular-nums font-mono rounded bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
          autoFocus
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-zinc-500 hover:text-zinc-300 w-14 text-right tabular-nums transition-colors"
          title="Click to edit"
        >
          {localValue}{suffix}
        </button>
      )}
    </div>
  );
}
