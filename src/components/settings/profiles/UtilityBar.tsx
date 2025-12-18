import { 
  Upload, 
  FileDown, 
  RotateCcw
} from 'lucide-react';
import { Button } from '../../ui/button';

interface UtilityBarProps {
  handleExportConfig: () => void;
  handleImportConfig: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleResetConfig: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function UtilityBar({
  handleExportConfig,
  handleImportConfig,
  handleResetConfig,
  fileInputRef,
}: UtilityBarProps) {
  return (
    <div className="pt-4 border-t border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleExportConfig}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors group"
          >
            <div className="h-7 w-7 rounded bg-zinc-800/50 flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
              <FileDown className="h-3.5 w-3.5" />
            </div>
            Export Config
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors group"
          >
            <div className="h-7 w-7 rounded bg-zinc-800/50 flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
              <Upload className="h-3.5 w-3.5" />
            </div>
            Import Config
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportConfig}
            className="hidden"
          />
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleResetConfig}
          className="h-8 text-xs text-zinc-500 hover:text-red-400 gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset to Default
        </Button>
      </div>
    </div>
  );
}

