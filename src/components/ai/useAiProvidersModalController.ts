import { useEffect, useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiProviders, type AiProviderStatus } from '../../api/ai';
import { queryKeys } from '../../lib/queryClient';
import { showToast } from '../ui/toast';

export type SecretDraftKey = `${string}:${string}:${string}`; // providerId:strategyId:secretKey

export type AiProvidersModalController = {
  // Data
  providers: AiProviderStatus[];
  isLoading: boolean;
  
  // Selection
  selectedProviderId: string;
  selectedProvider: AiProviderStatus | undefined;
  selectProvider: (id: string) => void;
  
  // Auth strategy
  selectedStrategyId: string;
  setSelectedStrategyId: (id: string) => void;
  
  // Secret drafts
  secretDrafts: Record<SecretDraftKey, string>;
  setSecretDraft: (key: SecretDraftKey, value: string) => void;
  clearSecretDrafts: () => void;
  
  // Actions
  saveSecrets: (authStrategyId: string) => Promise<void>;
  connect: (authStrategyId: string) => Promise<void>;
  saveAndConnect: (authStrategyId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  startPkce: () => Promise<void>;
  
  // Model selection
  selectedModelId: string | null;
  selectModel: (modelId: string) => void;
  
  // Loading states
  isSaving: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
};

export function useAiProvidersModalController(open: boolean): AiProvidersModalController {
  const queryClient = useQueryClient();

  const providersQuery = useQuery({
    queryKey: queryKeys.aiProviders.list(),
    queryFn: () => aiProviders.list().then((r) => r.providers),
    enabled: open,
  });

  const providers = providersQuery.data ?? [];

  // Selection state
  const [selectedProviderId, setSelectedProviderId] = useState<string>('openrouter');
  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === selectedProviderId) ?? providers[0],
    [providers, selectedProviderId]
  );

  // Sync selection when providers load
  useEffect(() => {
    if (selectedProvider && selectedProvider.id !== selectedProviderId) {
      setSelectedProviderId(selectedProvider.id);
    }
  }, [providers.length, selectedProvider, selectedProviderId]);

  // Auth strategy selection
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  
  // Auto-select strategy when provider changes
  useEffect(() => {
    if (!selectedProvider) return;
    const activeStrategy = selectedProvider.connection?.auth_strategy_id;
    const defaultStrategy = selectedProvider.authStrategies.find(s => s.id === activeStrategy && s.configured)
      || selectedProvider.authStrategies.find(s => s.configured)
      || selectedProvider.authStrategies[0];
    setSelectedStrategyId(defaultStrategy?.id || '');
  }, [selectedProvider]);

  // Secret drafts
  const [secretDrafts, setSecretDrafts] = useState<Record<SecretDraftKey, string>>({});

  const setSecretDraft = useCallback((key: SecretDraftKey, value: string) => {
    setSecretDrafts((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearSecretDrafts = useCallback(() => {
    setSecretDrafts({});
  }, []);

  // Model selection (persisted in localStorage for now)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tavernstudio:selectedModel') || 'openai/gpt-4o-mini';
    }
    return 'openai/gpt-4o-mini';
  });

  const selectModel = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tavernstudio:selectedModel', modelId);
    }
    showToast({ message: `Model set to ${modelId}`, type: 'success' });
  }, []);

  // Mutations
  const setSecretsMutation = useMutation({
    mutationFn: async (args: { providerId: string; authStrategyId: string; secrets: Record<string, string> }) => {
      return await aiProviders.setSecrets(args.providerId, args.authStrategyId, args.secrets);
    },
    onSuccess: async () => {
      showToast({ message: 'Saved credentials', type: 'success' });
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

  // Action handlers
  const saveSecrets = useCallback(async (authStrategyId: string) => {
    if (!selectedProvider) return;
    
    const strategy = selectedProvider.authStrategies.find(s => s.id === authStrategyId);
    if (!strategy) return;

    const secrets: Record<string, string> = {};
    for (const k of strategy.requiredKeys) {
      const dk: SecretDraftKey = `${selectedProvider.id}:${authStrategyId}:${k}`;
      const v = (secretDrafts[dk] ?? '').trim();
      if (v) secrets[k] = v;
    }

    if (Object.keys(secrets).length === 0) {
      showToast({ message: 'No credentials entered', type: 'warning' });
      return;
    }

    await setSecretsMutation.mutateAsync({
      providerId: selectedProvider.id,
      authStrategyId,
      secrets,
    });
  }, [selectedProvider, secretDrafts, setSecretsMutation]);

  const connect = useCallback(async (authStrategyId: string) => {
    if (!selectedProvider) return;
    await connectMutation.mutateAsync({
      providerId: selectedProvider.id,
      authStrategyId,
    });
  }, [selectedProvider, connectMutation]);

  const saveAndConnect = useCallback(async (authStrategyId: string) => {
    if (!selectedProvider) return;
    
    const strategy = selectedProvider.authStrategies.find(s => s.id === authStrategyId);
    if (!strategy) return;

    const secrets: Record<string, string> = {};
    for (const k of strategy.requiredKeys) {
      const dk: SecretDraftKey = `${selectedProvider.id}:${authStrategyId}:${k}`;
      const v = (secretDrafts[dk] ?? '').trim();
      if (v) secrets[k] = v;
    }

    if (Object.keys(secrets).length > 0) {
      await setSecretsMutation.mutateAsync({
        providerId: selectedProvider.id,
        authStrategyId,
        secrets,
      });
    }

    await connectMutation.mutateAsync({
      providerId: selectedProvider.id,
      authStrategyId,
    });
  }, [selectedProvider, secretDrafts, setSecretsMutation, connectMutation]);

  const disconnect = useCallback(async () => {
    if (!selectedProvider) return;
    await disconnectMutation.mutateAsync({ providerId: selectedProvider.id });
  }, [selectedProvider, disconnectMutation]);

  const startPkce = useCallback(async () => {
    try {
      const returnUrl = window.location.origin;
      const { authUrl } = await aiProviders.startOpenRouterPkce(returnUrl);
      window.location.href = authUrl;
    } catch (e) {
      showToast({ message: e instanceof Error ? e.message : String(e), type: 'error' });
    }
  }, []);

  return {
    providers,
    isLoading: providersQuery.isLoading,
    selectedProviderId,
    selectedProvider,
    selectProvider: setSelectedProviderId,
    selectedStrategyId,
    setSelectedStrategyId,
    secretDrafts,
    setSecretDraft,
    clearSecretDrafts,
    saveSecrets,
    connect,
    saveAndConnect,
    disconnect,
    startPkce,
    selectedModelId,
    selectModel,
    isSaving: setSecretsMutation.isPending,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
  };
}
