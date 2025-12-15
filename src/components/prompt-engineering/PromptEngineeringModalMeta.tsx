import { Star } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export function PromptEngineeringModalMeta({
  isMobile,
  draftName,
  onDraftNameChange,
  onSetActive,
  canSetActive,
}: {
  isMobile: boolean;
  draftName: string;
  onDraftNameChange: (name: string) => void;
  onSetActive: () => void;
  canSetActive: boolean;
}) {
  // Mobile: compact single-row layout
  if (isMobile) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-3">
        <div className="flex items-center gap-2">
          <Input 
            value={draftName} 
            onChange={(e) => onDraftNameChange(e.target.value)} 
            placeholder="Preset name" 
            className="flex-1 h-9"
          />
          <Button
            variant="secondary"
            type="button"
            size="sm"
            disabled={!canSetActive}
            onClick={onSetActive}
            className="h-9 px-3 shrink-0"
            title="Set as active preset"
          >
            <Star className="h-4 w-4 mr-1.5" />
            Active
          </Button>
        </div>
      </div>
    );
  }

  // Desktop: original two-column layout
  return (
    <div className="grid gap-3 grid-cols-2">
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-3 space-y-2">
        <div className="text-sm font-medium text-zinc-200">Preset name</div>
        <Input value={draftName} onChange={(e) => onDraftNameChange(e.target.value)} placeholder="Preset name" />
        <div className="text-xs text-zinc-500">Shown in the preset picker.</div>
      </div>

      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-3 space-y-2">
        <div className="text-sm font-medium text-zinc-200">Active preset</div>
        <div className="text-xs text-zinc-500">The active preset is what future prompt systems will use by default.</div>
        <Button
          variant="secondary"
          type="button"
          disabled={!canSetActive}
          onClick={onSetActive}
        >
          Set active
        </Button>
      </div>
    </div>
  );
}
