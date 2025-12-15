import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export function PromptEngineeringModalFooter({
  isMobile,
  isDirty,
  isSaving,
  onDiscard,
  onSave,
}: {
  isMobile: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <div className="sticky bottom-0 border-t border-zinc-800/60 bg-zinc-950/90 backdrop-blur">
      <div className={cn('p-4 flex gap-2', isMobile ? 'flex-col' : 'justify-end')}>
        <Button
          variant="outline"
          type="button"
          onClick={onDiscard}
          disabled={!isDirty}
          className={cn(isMobile && 'w-full')}
        >
          Discard
        </Button>
        <Button
          type="button"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className={cn(isMobile && 'w-full')}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
