import { useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Plus, Upload, Download, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { showToast } from '../ui/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import type { PromptEngineeringPreset, PromptEngineeringStore } from '../../types/promptEngineering';

export function PromptEngineeringModalHeader({
  isMobile,
  store,
  selectedId,
  isDirty,
  onSelectId,
  onCreate,
  onDelete,
  onImportFile,
  onExport,
  canExport,
}: {
  isMobile: boolean;
  store: PromptEngineeringStore;
  selectedId: string | null;
  isDirty: boolean;
  onSelectId: (id: string) => void;
  onCreate: () => void;
  onDelete: () => void;
  onImportFile: (file: File) => Promise<void>;
  onExport: () => void;
  canExport: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        await onImportFile(file);
        showToast({ message: 'Imported preset', type: 'success' });
      } catch (err) {
        showToast({ message: err instanceof Error ? err.message : 'Import failed', type: 'error' });
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [onImportFile]
  );

  const headerRightPad = isMobile ? 'pr-12' : 'pr-14';

  // Mobile: compact header with dropdown menu for actions
  if (isMobile) {
    return (
      <div className={cn('sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur', headerRightPad)}>
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-zinc-100">Prompt Engineering</div>
            </div>
            
            {/* Mobile action menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={onCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Preset
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExport} disabled={!canExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onDelete} 
                  disabled={!selectedId}
                  className="text-red-400 focus:text-red-300"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Preset selector - full width on mobile */}
          <Select
            value={selectedId ?? ''}
            onValueChange={(v) => {
              if (isDirty) {
                showToast({ message: 'Unsaved changes (save or discard)', type: 'warning' });
              }
              onSelectId(v);
            }}
          >
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Select preset" />
            </SelectTrigger>
            <SelectContent>
              {store.presets.map((p: PromptEngineeringPreset) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onFileChange}
        />
      </div>
    );
  }

  // Desktop: original layout
  return (
    <div className={cn('sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur', headerRightPad)}>
      <div className="p-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-zinc-100">Prompt Engineering</div>
          <div className="text-xs text-zinc-500 mt-0.5">Global, named formatting presets (import compatible).</div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex gap-2 items-center">
            <Select
              value={selectedId ?? ''}
              onValueChange={(v) => {
                if (isDirty) {
                  showToast({ message: 'Unsaved changes (save or discard)', type: 'warning' });
                }
                onSelectId(v);
              }}
            >
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Select preset" />
              </SelectTrigger>
              <SelectContent>
                {store.presets.map((p: PromptEngineeringPreset) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="secondary" onClick={onCreate} type="button">
              New
            </Button>
          </div>

          <div className="flex gap-2 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onFileChange}
            />

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Import
            </Button>
            <Button
              variant="outline"
              onClick={onExport}
              type="button"
              disabled={!canExport}
            >
              Export
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              type="button"
              disabled={!selectedId}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
