/**
 * ColorPicker - Native color input with hex editing and presets
 * 
 * Uses native DOM events to bypass React's broken onChange behavior
 * for color inputs (React issue #6308).
 */

import { useState, useRef, useEffect } from 'react';
import { Copy, LayoutGrid } from 'lucide-react';
import { toast } from '../../ui/toast';

const COLOR_PRESETS = [
  '#ffffff', '#e0e0e0', '#888888', '#444444', '#1a1a1a', '#000000',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  // Initialize directly from props - no sync effect needed
  const normalizedValue = value || '#ffffff';
  const [showHex, setShowHex] = useState(false);
  const [hexInput, setHexInput] = useState(normalizedValue);
  const [displayColor, setDisplayColor] = useState(normalizedValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const swatchRef = useRef<HTMLDivElement>(null);
  const currentColorRef = useRef(normalizedValue);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Update ref when value changes (no state, no re-render)
  currentColorRef.current = normalizedValue;

  // Native event listeners to bypass React's broken onChange for color inputs
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    // Native 'input' event = live preview (fires continuously)
    const handleInput = (e: Event) => {
      const color = (e.target as HTMLInputElement).value;
      currentColorRef.current = color;
      if (swatchRef.current) {
        swatchRef.current.style.backgroundColor = color;
      }
    };

    // Native 'change' event = commit (fires ONLY on picker close)
    const handleChange = (e: Event) => {
      const finalColor = (e.target as HTMLInputElement).value;
      setDisplayColor(finalColor);
      setHexInput(finalColor);
      currentColorRef.current = finalColor;
      onChangeRef.current(finalColor);
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('change', handleChange);
    
    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('change', handleChange);
    };
  }, []);

  const handleHexSubmit = () => {
    const hex = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setDisplayColor(hex);
      currentColorRef.current = hex;
      onChange(hex);
      setShowHex(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentColorRef.current);
    toast.success('Color copied');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Color swatch + native picker */}
      <label className="relative cursor-pointer group">
        <input
          ref={inputRef}
          type="color"
          defaultValue={displayColor}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div 
          ref={swatchRef}
          className="w-8 h-8 rounded-lg border border-zinc-700 shadow-inner group-hover:ring-2 ring-violet-500/40 transition-all"
          style={{ backgroundColor: displayColor }}
        />
      </label>
      
      {/* Hex input toggle */}
      {showHex ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleHexSubmit();
              if (e.key === 'Escape') setShowHex(false);
            }}
            onBlur={handleHexSubmit}
            className="w-20 h-7 px-2 text-xs font-mono rounded bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
            autoFocus
          />
        </div>
      ) : (
        <button
          onClick={() => setShowHex(true)}
          className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {displayColor}
        </button>
      )}
      
      {/* Copy button */}
      <button
        onClick={copyToClipboard}
        className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
        title="Copy hex"
      >
        <Copy className="h-3 w-3" />
      </button>
      
      {/* Color presets popover */}
      <div className="relative group/presets">
        <button className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors">
          <LayoutGrid className="h-3 w-3" />
        </button>
        <div className="absolute right-0 top-full mt-1 p-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl opacity-0 invisible group-hover/presets:opacity-100 group-hover/presets:visible transition-all z-50">
          <div className="grid grid-cols-8 gap-1">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setDisplayColor(c);
                  setHexInput(c);
                  currentColorRef.current = c;
                  if (swatchRef.current) {
                    swatchRef.current.style.backgroundColor = c;
                  }
                  onChange(c);
                }}
                className="w-5 h-5 rounded border border-zinc-700 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
