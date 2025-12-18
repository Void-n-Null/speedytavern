import { useState, useRef, useCallback } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { ControlRow } from './ControlRow';
import type { ControlDefinition } from '../interfaceDesignSchema';

interface SvgUploadControlProps {
  control: ControlDefinition;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
  isMobile?: boolean;
}

export function SvgUploadControl({
  control,
  value,
  onChange,
  compact,
  isMobile,
}: SvgUploadControlProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.includes('svg') && !file.name.endsWith('.svg')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        onChange(text);
      }
    };
    reader.readAsText(file);
  }, [onChange]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <ControlRow label={control.label} description={compact ? undefined : control.description} inline={false} isMobile={isMobile}>
      <div
        className={`relative group rounded-lg border-2 border-dashed transition-all duration-200 ${
          isDragging ? 'border-violet-500 bg-violet-500/10' : 'border-zinc-700/50 hover:border-zinc-600/50 bg-zinc-800/30'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste SVG code or drop a file here..."
          className="w-full min-h-[120px] p-3 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none font-mono resize-y relative z-10"
        />
        
        <div className="absolute right-2 bottom-2 z-20 flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-700/80 hover:bg-zinc-600 text-[11px] font-medium text-zinc-200 transition-colors border border-zinc-600/50"
          >
            <Upload className="h-3 w-3" />
            Upload File
          </button>
          {value && (
            <button
              onClick={() => onChange('')}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-900/30 hover:bg-red-900/50 text-[11px] font-medium text-red-400 transition-colors border border-red-900/20"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".svg"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          className="hidden"
        />

        {isDragging && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-violet-500/5 z-30">
            <div className="text-violet-400 font-medium text-sm">Drop SVG here</div>
          </div>
        )}
      </div>
    </ControlRow>
  );
}

