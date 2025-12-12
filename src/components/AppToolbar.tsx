import { Settings } from 'lucide-react';
import { Button } from './ui/button';
import { useIsMobile } from '../hooks/useIsMobile';
import { useLayoutConfig } from '../hooks/queries/useProfiles';

interface AppToolbarProps {
  onOpenSettings: () => void;
}

export function AppToolbar({ onOpenSettings }: AppToolbarProps) {
  const isMobile = useIsMobile();
  const layout = useLayoutConfig();

  const toolbarStyle: React.CSSProperties = {
    width: isMobile ? '100%' : `${layout.containerWidth}%`,
    margin: '0 auto',
  };

  return (
    <header className="shrink-0" style={toolbarStyle}>
      <div className="flex h-14 items-center justify-between gap-3 border-b border-white/10 bg-zinc-950 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/logo.png"
            alt="TavernStudio"
            className="h-8 w-auto max-w-[160px] shrink-0 object-contain"
          />
        </div>

        <Button onClick={onOpenSettings} variant="secondary" size="icon" className="shrink-0" aria-label="Open settings">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
