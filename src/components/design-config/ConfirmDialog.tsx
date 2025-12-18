import { Button } from '../ui/button';
import { useDesignConfigModalState } from '../../store/designConfigModalState';

export function ConfirmDialog() {
  const confirmDialog = useDesignConfigModalState(s => s.confirmDialog);
  const hideConfirm = useDesignConfigModalState(s => s.hideConfirm);
  
  if (!confirmDialog.open) return null;
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-sm w-full mx-4 shadow-2xl">
        <h3 className="text-base font-semibold text-zinc-100 mb-2">{confirmDialog.title}</h3>
        <p className="text-sm text-zinc-400 mb-5">{confirmDialog.message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={hideConfirm}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => {
              confirmDialog.onConfirm?.();
              hideConfirm();
            }}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

