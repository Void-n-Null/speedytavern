import { useState } from 'react';
import { Check, Link2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { aiProviders } from '../../../api/ai';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { showToast } from '../../ui/toast';
import { cn } from '../../../lib/utils';
import { useIsMobile } from '../../../hooks/useIsMobile';

export type SecretDraftKey = `${string}:${string}:${string}`;

interface AuthStrategyFormProps {
  providerId: string;
  strategy: {
    id: string;
    label: string;
    type: string;
    configured: boolean;
    requiredKeys: string[];
    presentKeys: string[];
  };
  secretDrafts: Record<SecretDraftKey, string>;
  setSecretDrafts: React.Dispatch<React.SetStateAction<Record<SecretDraftKey, string>>>;
  onSaveAndConnect: (strategyId: string, requiredKeys: string[]) => void;
  isSaving: boolean;
  isConnecting: boolean;
  isConnected: boolean;
}

export function AuthStrategyForm({
  providerId,
  strategy,
  secretDrafts,
  setSecretDrafts,
  onSaveAndConnect,
  isSaving,
  isConnecting,
  isConnected,
}: AuthStrategyFormProps) {
  const isMobile = useIsMobile();
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // PKCE OAuth
  if (strategy.type === 'pkce') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-4">
          <h4 className="text-sm font-semibold text-zinc-100 mb-2">OAuth Authentication</h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Link your OpenRouter account securely. Your API key will be automatically generated and stored.
            This method is recommended as it handles key rotation automatically.
          </p>
        </div>

        <div className={cn('flex gap-2', isMobile && 'flex-col')}>
          <Button
            onClick={async () => {
              try {
                const returnUrl = window.location.origin;
                const { authUrl } = await aiProviders.startOpenRouterPkce(returnUrl);
                window.location.href = authUrl;
              } catch (e) {
                showToast({ message: e instanceof Error ? e.message : String(e), type: 'error' });
              }
            }}
            className="gap-2 w-full sm:w-auto"
            variant="default"
          >
            <ExternalLink className="h-4 w-4" />
            Connect with OpenRouter
          </Button>
        </div>

        {strategy.configured && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2 w-fit">
            <Check className="h-3.5 w-3.5" />
            OAuth token is stored and ready
          </p>
        )}
      </div>
    );
  }

  // API Key
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-4">
        <h4 className="text-sm font-semibold text-zinc-100 mb-2">API Key Authentication</h4>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Enter your API key directly. Your key is encrypted and stored locally—it never leaves your machine.
        </p>
      </div>

      <div className="space-y-4">
        {strategy.requiredKeys.map(key => {
          const draftKey: SecretDraftKey = `${providerId}:${strategy.id}:${key}`;
          const isPresent = strategy.presentKeys.includes(key);
          const isVisible = showSecrets[key];

          return (
            <div key={key} className="space-y-2">
              <Label className="flex items-center justify-between text-xs font-medium text-zinc-400">
                <span>{formatKeyLabel(key)}</span>
                {isPresent && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                    SAVED
                  </span>
                )}
              </Label>
              <div className="relative group">
                <Input
                  type={isVisible ? 'text' : 'password'}
                  value={secretDrafts[draftKey] ?? ''}
                  onChange={(e) => setSecretDrafts(prev => ({ ...prev, [draftKey]: e.target.value }))}
                  placeholder={isPresent ? '••••••••••••••••' : `Enter your ${formatKeyLabel(key)}`}
                  className="pr-10 bg-zinc-950 border-zinc-800 focus:border-violet-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={cn('flex items-center gap-3 pt-2', isMobile && 'flex-col')}>
        <Button
          onClick={() => onSaveAndConnect(strategy.id, strategy.requiredKeys)}
          disabled={isSaving || isConnecting}
          className={cn('gap-2 font-bold min-w-[140px]', isMobile && 'w-full')}
          variant={isConnected ? "outline" : "default"}
        >
          {isSaving ? (
            'Saving...'
          ) : isConnecting ? (
            'Connecting...'
          ) : (
            <>
              <Link2 className="h-4 w-4" />
              {strategy.configured ? 'Update & Reconnect' : 'Connect'}
            </>
          )}
        </Button>
        
        {isConnected && !isSaving && !isConnecting && (
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2">
            <Check className="h-4 w-4" />
            Connected and ready
          </div>
        )}
      </div>
    </div>
  );
}

function formatKeyLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
}

