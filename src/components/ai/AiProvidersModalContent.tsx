import { useState, useCallback } from 'react';
import { Check, Link2, Link2Off, Eye, EyeOff, ExternalLink, Zap, Info, Cpu } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { cn } from '../../lib/utils';
import { showToast } from '../ui/toast';
import type { AiProviderStatus } from '../../api/client';
import type { SecretDraftKey } from './useAiProvidersModalController';
import { ModelSelector } from './ModelSelector';

interface AiProvidersModalContentProps {
  provider: AiProviderStatus;
  isMobile: boolean;
  selectedStrategyId: string;
  onSelectStrategy: (id: string) => void;
  secretDrafts: Record<SecretDraftKey, string>;
  onSetSecretDraft: (key: SecretDraftKey, value: string) => void;
  onSaveSecrets: (strategyId: string) => Promise<void>;
  onConnect: (strategyId: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onStartPkce: () => Promise<void>;
  isSaving: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  // Model selection
  selectedModelId: string | null;
  onSelectModel: (modelId: string) => void;
}

export function AiProvidersModalContent({
  provider,
  isMobile,
  selectedStrategyId,
  onSelectStrategy,
  secretDrafts,
  onSetSecretDraft,
  onSaveSecrets,
  onConnect,
  onDisconnect,
  onStartPkce,
  isSaving,
  isConnecting,
  isDisconnecting,
  selectedModelId,
  onSelectModel,
}: AiProvidersModalContentProps) {
  const isConnected = provider.connection?.status === 'connected';
  const activeStrategyId = provider.connection?.auth_strategy_id;
  const selectedStrategy = provider.authStrategies.find(s => s.id === selectedStrategyId);

  // Show model selector when connected
  const showModelSelector = isConnected;

  return (
    <div className="space-y-6">
      {/* Model Selector (shown when connected) */}
      {showModelSelector && (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
              <Cpu className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">Select Model</h3>
          </div>
          <ModelSelector
            value={selectedModelId}
            onChange={onSelectModel}
            providerId={provider.id}
          />
        </div>
      )}

      {/* Explanation Card (shown when not connected) */}
      {!isConnected && (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
              <Info className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-200">Connect to {provider.label}</h3>
              <p className="text-xs leading-relaxed text-zinc-400">
                {provider.id === 'openrouter' 
                  ? 'OpenRouter provides access to 100+ AI models through a single API. Connect with an API key or link your OpenRouter account.'
                  : `Enter your ${provider.label} credentials to enable chat completions.`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-zinc-200">Connection Status</div>
            <StatusBadge
              connected={isConnected}
              strategy={activeStrategyId}
              error={provider.connection?.last_error}
            />
          </div>

          {isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDisconnect}
              disabled={isDisconnecting}
              className="gap-2 border-zinc-800 hover:bg-zinc-900"
            >
              <Link2Off className="h-4 w-4" />
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          )}
        </div>
      </div>

      {/* Auth Strategy Selection (if multiple) */}
      {provider.authStrategies.length > 1 && (
        <div>
          <Label className="text-xs text-zinc-400 mb-2 block">Authentication Method</Label>
          <div className={cn('flex gap-2', isMobile && 'flex-col')}>
            {provider.authStrategies.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectStrategy(s.id)}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-all',
                  selectedStrategyId === s.id
                    ? 'border-violet-500/50 bg-violet-500/10 text-zinc-100'
                    : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300',
                  isMobile && 'justify-center'
                )}
              >
                {s.type === 'pkce' ? <ExternalLink className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                {s.label}
                {s.configured && <Check className="h-4 w-4 text-emerald-500" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Strategy-specific form */}
      {selectedStrategy && (
        <AuthStrategyForm
          providerId={provider.id}
          strategy={selectedStrategy}
          secretDrafts={secretDrafts}
          onSetSecretDraft={onSetSecretDraft}
          onSave={() => onSaveSecrets(selectedStrategy.id)}
          onConnect={() => onConnect(selectedStrategy.id)}
          onStartPkce={onStartPkce}
          isSaving={isSaving}
          isConnecting={isConnecting}
          isConnected={isConnected && activeStrategyId === selectedStrategy.id}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}

function StatusBadge({
  connected,
  strategy,
  error,
}: {
  connected: boolean;
  strategy?: string | null;
  error?: string | null;
}) {
  if (error) {
    return (
      <div className="mt-1 flex items-center gap-1.5 text-xs text-red-400">
        <div className="h-2 w-2 rounded-full bg-red-500" />
        Error: {error}
      </div>
    );
  }

  if (connected) {
    return (
      <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400">
        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
        Connected{strategy ? ` via ${strategy}` : ''}
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
      <div className="h-2 w-2 rounded-full bg-zinc-600" />
      Not connected
    </div>
  );
}

// ============ Auth Strategy Form ============

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
  onSetSecretDraft: (key: SecretDraftKey, value: string) => void;
  onSave: () => Promise<void>;
  onConnect: () => Promise<void>;
  onStartPkce: () => Promise<void>;
  isSaving: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  isMobile: boolean;
}

function AuthStrategyForm({
  providerId,
  strategy,
  secretDrafts,
  onSetSecretDraft,
  onSave,
  onConnect,
  onStartPkce,
  isSaving,
  isConnecting,
  isConnected,
  isMobile,
}: AuthStrategyFormProps) {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const handleSaveAndConnect = useCallback(async () => {
    // Check if we have new secrets to save
    const hasNewSecrets = strategy.requiredKeys.some(k => {
      const dk: SecretDraftKey = `${providerId}:${strategy.id}:${k}`;
      return (secretDrafts[dk] ?? '').trim().length > 0;
    });

    if (hasNewSecrets) {
      await onSave();
    } else if (!strategy.configured) {
      showToast({ message: 'Enter your API key first', type: 'warning' });
      return;
    }

    // Small delay to let save complete
    setTimeout(() => onConnect(), hasNewSecrets ? 150 : 0);
  }, [providerId, strategy, secretDrafts, onSave, onConnect]);

  // PKCE OAuth flow
  if (strategy.type === 'pkce') {
    return (
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-4 space-y-4">
        <p className="text-sm text-zinc-400">
          Connect your OpenRouter account using secure OAuth. This will open a new window to authorize access.
        </p>

        <div className={cn('flex gap-3', isMobile && 'flex-col')}>
          <Button
            onClick={onStartPkce}
            className="gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500"
          >
            <ExternalLink className="h-4 w-4" />
            Connect with OpenRouter
          </Button>

          {strategy.configured && !isConnected && (
            <Button
              variant="outline"
              onClick={onConnect}
              disabled={isConnecting}
              className="gap-2 rounded-xl border-zinc-800"
            >
              {isConnecting ? 'Connecting...' : 'Use Existing Token'}
            </Button>
          )}
        </div>

        {strategy.configured && (
          <p className="text-xs text-emerald-400/80 flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" />
            OAuth token is stored and ready to use
          </p>
        )}
      </div>
    );
  }

  // API Key form
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-4 space-y-4">
      {strategy.requiredKeys.map((key) => {
        const draftKey: SecretDraftKey = `${providerId}:${strategy.id}:${key}`;
        const isPresent = strategy.presentKeys.includes(key);
        const isVisible = showSecrets[key];

        return (
          <div key={key}>
            <Label className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5">
              {formatKeyLabel(key)}
              {isPresent && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  Saved
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                type={isVisible ? 'text' : 'password'}
                value={secretDrafts[draftKey] ?? ''}
                onChange={(e) => onSetSecretDraft(draftKey, e.target.value)}
                placeholder={isPresent ? '••••••••••••••••' : `Enter your ${formatKeyLabel(key)}`}
                className="pr-10 bg-zinc-900/50 border-zinc-800/60"
              />
              <button
                type="button"
                onClick={() => setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        );
      })}

      <div className={cn('flex items-center gap-3 pt-2', isMobile && 'flex-col')}>
        {isConnected ? (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <Check className="h-4 w-4" />
            Connected and ready
          </div>
        ) : (
          <Button
            onClick={handleSaveAndConnect}
            disabled={isSaving || isConnecting}
            className={cn(
              "gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500",
              isMobile && 'w-full'
            )}
          >
            <Link2 className="h-4 w-4" />
            {isSaving ? 'Saving...' : isConnecting ? 'Connecting...' : strategy.configured ? 'Save & Connect' : 'Connect'}
          </Button>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        Your API key is encrypted and stored locally. It never leaves your machine.
      </p>
    </div>
  );
}

function formatKeyLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

