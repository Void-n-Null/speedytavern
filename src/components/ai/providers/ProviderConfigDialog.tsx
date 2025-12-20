import { useState } from 'react';
import { 
  Link2, Link2Off, Check, Activity, ExternalLink, 
  Info, ShieldCheck, X, Cpu 
} from 'lucide-react';
import { type AiProviderStatus } from '../../../api/ai';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../ui/dialog';
import { AuthStrategyForm, type SecretDraftKey } from './AuthStrategyForm';
import { ModelSelector } from '../ModelSelector';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface ProviderConfigDialogProps {
  provider: AiProviderStatus | null;
  isOpen: boolean;
  onClose: () => void;
  secretDrafts: Record<SecretDraftKey, string>;
  setSecretDrafts: React.Dispatch<React.SetStateAction<Record<SecretDraftKey, string>>>;
  onSaveAndConnect: (providerId: string, strategyId: string, requiredKeys: string[]) => void;
  onDisconnect: (providerId: string) => void;
  isSaving: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  selectedModelId?: string | null;
  onSelectModel?: (modelId: string) => void;
}

export function ProviderConfigDialog({
  provider,
  isOpen,
  onClose,
  secretDrafts,
  setSecretDrafts,
  onSaveAndConnect,
  onDisconnect,
  isSaving,
  isConnecting,
  isDisconnecting,
  selectedModelId,
  onSelectModel,
}: ProviderConfigDialogProps) {
  const isMobile = useIsMobile();
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);

  if (!provider) return null;

  const isConnected = provider.connection?.status === 'connected';
  const currentStrategyId = selectedStrategyId || provider.connection?.auth_strategy_id || provider.authStrategies[0]?.id || '';
  const selectedStrategy = provider.authStrategies.find(s => s.id === currentStrategyId);
  const hasAuthStrategies = provider.authStrategies.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent fullscreen={isMobile} className="max-w-2xl overflow-hidden flex flex-col p-0 bg-zinc-950 border-zinc-800/50">
        <DialogHeader className="p-6 border-b border-zinc-900 bg-zinc-900/20">
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors",
              isConnected ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-zinc-800 border-zinc-700 text-zinc-500"
            )}>
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-zinc-100">{provider.label} Settings</DialogTitle>
              <DialogDescription className="text-zinc-500 mt-1">
                Configure your authentication and connection preferences.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Connection Status Banner */}
          {isConnected && (
            <div className="flex items-center justify-between rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 px-4 py-3">
              <div className="flex items-center gap-3 text-sm font-medium text-emerald-400">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  Connected{provider.connection?.auth_strategy_id ? ` via ${provider.connection.auth_strategy_id}` : ''}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDisconnect(provider.id)}
                disabled={isDisconnecting}
                className="h-8 text-xs font-bold text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all gap-2"
              >
                <Link2Off className="h-3.5 w-3.5" />
                Disconnect
              </Button>
            </div>
          )}

          {/* Model Selector (shown when connected) */}
          {isConnected && onSelectModel && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
                  <Cpu className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-200">Active Model</h3>
              </div>
              <ModelSelector
                value={selectedModelId || null}
                onChange={onSelectModel}
                providerId={provider.id}
              />
              <p className="text-[10px] text-zinc-500 leading-normal px-1">
                Selected model will be saved to your profile and used for future messages.
              </p>
            </div>
          )}

          {!hasAuthStrategies && (
            <div className="bg-zinc-900/20 rounded-2xl border border-zinc-900 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-zinc-200">No authentication required</h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    This provider is considered connected if the server can reach its models endpoint.
                  </p>
                  <div className={cn('flex items-center gap-3 pt-4', isMobile && 'flex-col')}>
                    <Button
                      onClick={() => onSaveAndConnect(provider.id, 'none', [])}
                      disabled={isSaving || isConnecting}
                      className={cn('gap-2 font-bold min-w-[140px]', isMobile && 'w-full')}
                      variant={isConnected ? 'outline' : 'default'}
                    >
                      {isConnecting ? (
                        'Connecting...'
                      ) : (
                        <>
                          <Link2 className="h-4 w-4" />
                          {isConnected ? 'Reconnect' : 'Connect'}
                        </>
                      )}
                    </Button>
                    {isConnected && !isConnecting && (
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2">
                        <Check className="h-4 w-4" />
                        Connected and ready
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Auth Strategy Selection */}
          {hasAuthStrategies && provider.authStrategies.length > 1 && (
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500 ml-1">
                Authentication Method
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {provider.authStrategies.map(s => {
                  const isSelected = currentStrategyId === s.id;
                  const isSaved = s.configured;
                  
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStrategyId(s.id)}
                      className={cn(
                        'flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all group',
                        isSelected
                          ? 'border-violet-500 bg-violet-500/5 ring-1 ring-violet-500/20'
                          : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50'
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className={cn(
                          "p-1.5 rounded-lg border transition-colors",
                          isSelected ? "bg-violet-500/20 border-violet-500/30 text-violet-400" : "bg-zinc-800 border-zinc-700 text-zinc-500 group-hover:text-zinc-300"
                        )}>
                          {s.type === 'pkce' ? <ExternalLink className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                        </div>
                        {isSaved && <Check className="h-4 w-4 text-emerald-500" />}
                      </div>
                      <span className={cn("font-bold text-sm", isSelected ? "text-zinc-100" : "text-zinc-400")}>{s.label}</span>
                      <span className="text-[10px] text-zinc-500 font-medium leading-tight">
                        {s.type === 'pkce' ? 'Recommended, secure OAuth flow' : 'Direct API key management'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Strategy Form */}
          {hasAuthStrategies && (
            <div className="bg-zinc-900/20 rounded-2xl border border-zinc-900 p-6">
              {selectedStrategy ? (
                <AuthStrategyForm
                  providerId={provider.id}
                  strategy={selectedStrategy}
                  secretDrafts={secretDrafts}
                  setSecretDrafts={setSecretDrafts}
                  onSaveAndConnect={(strategyId, requiredKeys) => onSaveAndConnect(provider.id, strategyId, requiredKeys)}
                  isSaving={isSaving}
                  isConnecting={isConnecting}
                  isConnected={isConnected && provider.connection?.auth_strategy_id === selectedStrategy.id}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Info className="h-8 w-8 text-zinc-700 mb-3" />
                  <p className="text-sm text-zinc-500">Select an authentication method above to continue.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-900 bg-zinc-900/40 flex justify-end">
          <Button variant="ghost" onClick={onClose} className="font-bold text-zinc-400 hover:text-zinc-100">
            Close Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

