import { useRef } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { ControlRow } from './ControlRow';
import { useFonts, useUploadFont, useDeleteFont } from '../../../hooks/queries/useFonts';

interface FontUploadControlProps {
  compact?: boolean;
  isMobile?: boolean;
}

export function FontUploadControl({ compact, isMobile }: FontUploadControlProps) {
  const { data: fonts } = useFonts();
  const uploadMutation = useUploadFont();
  const deleteMutation = useDeleteFont();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadMutation.mutateAsync({ file });
    } catch (err) {
      console.error('Font upload failed:', err);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <ControlRow 
      label="Upload Custom Font" 
      description={compact ? undefined : 'Upload .ttf, .otf, .woff, or .woff2 files'}
      inline={false}
      isMobile={isMobile}
    >
      <div className="space-y-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 text-sm text-zinc-300 hover:text-zinc-100 transition-colors disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {uploadMutation.isPending ? 'Uploading...' : 'Choose font file'}
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        {/* List uploaded fonts */}
        {fonts && fonts.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-xs text-zinc-500 mb-1">Uploaded fonts:</div>
            {fonts.map((font) => (
              <div 
                key={font.id} 
                className="flex items-center justify-between px-2 py-1.5 rounded bg-zinc-800/30 text-sm"
              >
                <span className="text-zinc-300">{font.name}</span>
                <button
                  onClick={() => deleteMutation.mutateAsync(font.id)}
                  disabled={deleteMutation.isPending}
                  className="p-1 rounded hover:bg-red-900/50 text-zinc-500 hover:text-red-400 transition-colors"
                  title="Delete font"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ControlRow>
  );
}

