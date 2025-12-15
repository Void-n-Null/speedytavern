import { useCallback } from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import { showToast } from '../ui/toast';
import { useIsMobile } from '../../hooks/useIsMobile';
import { cn } from '../../lib/utils';
import { PromptEngineeringPresetEditor } from './PromptEngineeringPresetEditor';
import { PromptEngineeringModalHeader } from './PromptEngineeringModalHeader';
import { PromptEngineeringModalFooter } from './PromptEngineeringModalFooter';
import { PromptEngineeringModalMeta } from './PromptEngineeringModalMeta';
import { usePromptEngineeringModalController } from './usePromptEngineeringModalController';
import { exportPresetAsFile } from './promptEngineeringFileUtils';

export function PromptEngineeringModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const c = usePromptEngineeringModalController(open);

  const handleExport = useCallback(() => {
    if (!c.draftPreset) return;
    const name = c.draftName.trim() || c.draftPreset.name;
    exportPresetAsFile({ ...c.draftPreset, name });
    showToast({ message: 'Exported preset', type: 'success' });
  }, [c.draftName, c.draftPreset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        fullscreen={isMobile}
        className={cn('p-0 overflow-hidden', !isMobile && 'h-[85vh]')}
      >
        <div className="flex h-full flex-col">
          <PromptEngineeringModalHeader
            isMobile={isMobile}
            store={c.store}
            selectedId={c.selectedId}
            isDirty={c.isDirty}
            onSelectId={(id) => c.selectPreset(id)}
            onCreate={() => {
              void c.createPreset().then(
                () => showToast({ message: 'Created preset', type: 'success' }),
                (e) => showToast({ message: e instanceof Error ? e.message : 'Create failed', type: 'error' })
              );
            }}
            onDelete={() => {
              void c.deleteSelectedPreset().then(
                () => showToast({ message: 'Deleted preset', type: 'success' }),
                (e) => showToast({ message: e instanceof Error ? e.message : 'Delete failed', type: 'error' })
              );
            }}
            onImportFile={c.importFile}
            onExport={handleExport}
            canExport={!!c.draftPreset}
          />

          <div className={cn('flex-1 overflow-auto', isMobile ? 'p-4' : 'p-6')}>
            {c.isLoading ? (
              <div className="text-sm text-zinc-500">Loading…</div>
            ) : c.draftPreset ? (
              <div className="space-y-4">
                <PromptEngineeringModalMeta
                  isMobile={isMobile}
                  draftName={c.draftName}
                  onDraftNameChange={c.setDraftName}
                  onSetActive={() => {
                    void c.setActiveSelected().then(
                      () => showToast({ message: 'Set active preset', type: 'success' }),
                      (e) => showToast({ message: e instanceof Error ? e.message : 'Failed', type: 'error' })
                    );
                  }}
                  canSetActive={!!c.selectedPreset}
                />

                <PromptEngineeringPresetEditor
                  preset={c.draftPreset}
                  onChange={c.setDraftPreset}
                  isMobile={isMobile}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-5 text-sm text-zinc-500">
                No presets yet. Create one.
              </div>
            )}
          </div>

          <PromptEngineeringModalFooter
            isMobile={isMobile}
            isDirty={c.isDirty}
            isSaving={c.isSaving}
            onDiscard={() => {
              c.discardDraft();
              showToast({ message: 'Discarded changes', type: 'info' });
            }}
            onSave={() => {
              void c.saveDraft().then(
                () => showToast({ message: 'Saved prompt preset', type: 'success' }),
                (e) => showToast({ message: e instanceof Error ? e.message : 'Save failed', type: 'error' })
              );
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
