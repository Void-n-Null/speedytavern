import { Check, Settings2, AlertCircle } from 'lucide-react';
import { type AiProviderStatus } from '../../../api/ai';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/button';
import { ProviderLogo } from '../ProviderLogo';

interface ProviderRowProps {
  provider: AiProviderStatus;
  isActive: boolean;
  onActivate: () => void;
  onConfigure: () => void;
  isMobile: boolean;
}

export function ProviderRow({
  provider,
  isActive,
  onActivate,
  onConfigure,
  isMobile,
}: ProviderRowProps) {
  const isConnected = provider.connection?.status === 'connected';
  const hasError = provider.connection?.last_error;
  const configuredStrategies = provider.authStrategies.filter(s => s.configured).length;

  return (
    <div
      onClick={isConnected ? onActivate : onConfigure}
      className={cn(
        'group relative flex items-center gap-4 rounded-xl border p-3 transition-all duration-200 cursor-pointer',
        isActive
          ? 'border-violet-500/50 bg-violet-500/[0.03] ring-1 ring-violet-500/20'
          : 'border-zinc-800/40 bg-zinc-900/10 hover:border-zinc-700 hover:bg-zinc-800/40'
      )}
    >
      {/* Icon/Logo */}
      <ProviderLogo
        provider={provider.id}
        ui={provider.ui}
        size="md"
        selected={isActive}
        className={cn(
          !isConnected && !isActive && "opacity-50 grayscale"
        )}
      />

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-zinc-100 text-sm truncate mb-0.5">
          {provider.label}
        </h3>
        
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {isActive ? (
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-400">
              <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              Active
            </div>
          ) : isConnected ? (
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500/80">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Connected
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              <div className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
              Offline
            </div>
          )}

          {hasError && (
            <>
              <div className="w-px h-2.5 bg-zinc-800" />
              <span className="flex items-center gap-1 text-[11px] text-red-400/90 font-medium truncate max-w-[200px]">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span className="truncate italic">"{provider.connection?.last_error}"</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">

        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); onConfigure(); }}
          className="h-9 px-3 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors gap-2"
        >
          <Settings2 className="h-4 w-4" />
          <span className={cn(isConnected ? 'text-blue-200' : 'text-zinc', "text-xs font-bold")}>{isConnected ? 'Settings' : 'Connect'}</span>
        </Button>
      </div>
    </div>
  )
}
