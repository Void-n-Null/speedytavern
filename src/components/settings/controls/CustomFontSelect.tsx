import { useRef } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { ControlRow } from './ControlRow';
import { useFonts, useUploadFont, useDeleteFont } from '../../../hooks/queries/useFonts';
import type { ControlDefinition } from '../interfaceDesignSchema';

interface CustomFontSelectProps {
  control: ControlDefinition;
  value: string;
  onChange: (key: string, value: unknown) => void;
  compact?: boolean;
  isMobile?: boolean;
}

export function CustomFontSelect({ 
  control, 
  value, 
  onChange, 
  compact,
  isMobile,
}: CustomFontSelectProps) {
  const { data: fonts, isLoading } = useFonts();
  const uploadMutation = useUploadFont();
  const deleteMutation = useDeleteFont();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const uploaded = await uploadMutation.mutateAsync({ file });
      onChange(control.key, uploaded.id);
    } catch (err) {
      console.error('Font upload failed:', err);
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (fontId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (value === fontId) {
      onChange(control.key, '');
    }
    await deleteMutation.mutateAsync(fontId);
  };

  return (
    <ControlRow label={control.label} description={compact ? undefined : control.description} isMobile={isMobile}>
      <div className="flex items-center gap-2">
        <Select 
          value={value || ''} 
          onValueChange={(v) => onChange(control.key, v)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder={isLoading ? 'Loading...' : 'Select font'} />
          </SelectTrigger>
          <SelectContent>
            {fonts?.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-zinc-500">No custom fonts uploaded</div>
            )}
            {fonts?.map((font) => (
              <SelectItem key={font.id} value={font.id}>
                <div className="flex items-center justify-between w-full gap-2">
                  <span>{font.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
          title="Upload font (.ttf, .otf, .woff, .woff2)"
        >
          <Upload className="h-4 w-4" />
        </button>
        
        {/* Delete current font */}
        {value && (
          <button
            onClick={(e) => handleDelete(value, e)}
            disabled={deleteMutation.isPending}
            className="p-2 rounded-lg bg-zinc-800/50 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Delete this font"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </ControlRow>
  );
}

