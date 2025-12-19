/**
 * Providers Tab
 * 
 * High-level orchestrator for AI provider management.
 * Features a clean grid of providers and a focused configuration dialog.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ZapOff, Sparkles } from 'lucide-react';
import { aiProviders } from '../../../api/client';
import { queryKeys } from '../../../lib/queryClient';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/button';
import { showToast } from '../../ui/toast';
import { ProviderRow } from '../providers/ProviderRow';
import { ProviderConfigDialog } from '../providers/ProviderConfigDialog';
import { type SecretDraftKey } from '../providers/AuthStrategyForm';

interface ProvidersTabProps {
  isMobile: boolean;
  activeProviderId?: string | null;
  onActiveProviderChange?: (id: string) => void;
  selectedModelId?: string | null;
  onSelectModel?: (modelId: string) => void;
}

export function ProvidersTab({ 
  isMobile, 
  activeProviderId, 
  onActiveProviderChange,
  selectedModelId,
  onSelectModel
}: ProvidersTabProps) {
  const queryClient = useQueryClient();
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [secretDrafts, setSecretDrafts] = useState<Record<SecretDraftKey, string>>({});

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: queryKeys.aiProviders.list(),
    queryFn: () => aiProviders.list().then(r => r.providers),
  });

  const providers = data ?? [];
  const selectedProvider = providers.find(p => p.id === selectedProviderId) || null;

  // Mutations
  const setSecretsMutation = useMutation({
    mutationFn: async (args: { providerId: string; authStrategyId: string; secrets: Record<string, string> }) => {
      return await aiProviders.setSecrets(args.providerId, args.authStrategyId, args.secrets);
    },
    onSuccess: async () => {
      showToast({ message: 'Credentials saved', type: 'success' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all });
    },
    onError: (e) => showToast({ message: e instanceof Error ? e.message : String(e), type: 'error' }),
  });

  const connectMutation = useMutation({
    mutationFn: async (args: { providerId: string; authStrategyId: string }) => {
      return await aiProviders.connect(args.providerId, args.authStrategyId);
    },
    onSuccess: async () => {
      showToast({ message: 'Connected successfully', type: 'success' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all });
    },
    onError: (e) => showToast({ message: e instanceof Error ? e.message : String(e), type: 'error' }),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (args: { providerId: string }) => {
      return await aiProviders.disconnect(args.providerId);
    },
    onSuccess: async () => {
      showToast({ message: 'Disconnected', type: 'info' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all });
    },
    onError: (e) => showToast({ message: e instanceof Error ? e.message : String(e), type: 'error' }),
  });

  const handleSaveAndConnect = useCallback(async (providerId: string, strategyId: string, requiredKeys: string[]) => {
    const secrets: Record<string, string> = {};
    for (const k of requiredKeys) {
      const dk: SecretDraftKey = `${providerId}:${strategyId}:${k}`;
      const v = (secretDrafts[dk] ?? '').trim();
      if (v) secrets[k] = v;
    }

    if (Object.keys(secrets).length > 0) {
      await setSecretsMutation.mutateAsync({ providerId, authStrategyId: strategyId, secrets });
    }

    // Connect after save
    await connectMutation.mutateAsync({ providerId, authStrategyId: strategyId });
  }, [secretDrafts, setSecretsMutation, connectMutation]);

  return (
    <div className={cn('h-full flex flex-col', isMobile ? 'p-4' : 'p-6')}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
        <div>
            <h3 className="text-lg font-bold text-zinc-100 leading-none">AI Providers</h3>
            <p className="text-xs text-zinc-500 mt-1.5 font-medium">
              Configure and manage your AI model connections.
          </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-9 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 gap-2"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-zinc-700" />
          <p className="text-sm font-medium">Scanning for available providers...</p>
        </div>
      ) : providers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800/60 p-12">
          <ZapOff className="h-12 w-12 text-zinc-800 mb-4" />
          <h4 className="text-zinc-200 font-bold text-lg mb-1">No Providers Found</h4>
          <p className="text-sm text-center max-w-xs leading-relaxed">
            We couldn't find any AI providers in the registry. Check your server configuration.
          </p>
        </div>
      ) : (
          <div className="flex flex-col gap-2">
            {providers.map(provider => (
              <ProviderRow
                key={provider.id}
                provider={provider}
                isActive={activeProviderId === provider.id}
              onActivate={() => {
                onActiveProviderChange?.(provider.id);
                showToast({ message: `${provider.label} is now active`, type: 'success' });
              }}
              onConfigure={() => setSelectedProviderId(provider.id)}
              isMobile={isMobile}
              />
            ))}
          </div>
      )}

      {/* The Floating Island Configuration Dialog */}
      <ProviderConfigDialog
              provider={selectedProvider}
        isOpen={!!selectedProviderId}
        onClose={() => setSelectedProviderId(null)}
              isMobile={isMobile}
              secretDrafts={secretDrafts}
              setSecretDrafts={setSecretDrafts}
              onSaveAndConnect={handleSaveAndConnect}
              onDisconnect={(providerId) => disconnectMutation.mutate({ providerId })}
              isSaving={setSecretsMutation.isPending}
              isConnecting={connectMutation.isPending}
              isDisconnecting={disconnectMutation.isPending}
        selectedModelId={selectedModelId}
        onSelectModel={onSelectModel}
      />
    </div>
  );
}
