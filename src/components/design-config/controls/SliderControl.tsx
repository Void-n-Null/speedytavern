/**
 * SliderControl - Slider with editable value display
 * 
 * Uses local state during drag, commits only on release via onValueCommit.
 * Uses useOptimisticNumber to keep local state until cache syncs (prevents whiplash).
 */

import { useState } from 'react';
import { Slider } from '../../ui/slider';
import { useOptimisticNumber } from '../../../hooks/useOptimisticValue';

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
  const [inputValue, setInputValue] = useState(String(value));
  
  // Optimistic local state - keeps value until server cache syncs
  const [displayValue, setLocalValue] = useOptimisticNumber(value);

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
          value={[displayValue]}
          onValueChange={([v]) => {
            setLocalValue(v);
          }}
          onValueCommit={([v]) => {
            // Keep localValue set - it will clear when cache syncs
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
          onClick={() => {
            setInputValue(String(value));
            setEditing(true);
          }}
          className="text-xs text-zinc-500 hover:text-zinc-300 w-14 text-right tabular-nums transition-colors"
          title="Click to edit"
        >
          {Math.round(displayValue)}{suffix}
        </button>
      )}
    </div>
  );
}
