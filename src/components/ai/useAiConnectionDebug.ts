import { useEffect, useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiProviders, type AiProviderStatus } from '../../api/ai';
import { queryKeys } from '../../lib/queryClient';
import { toast } from '../ui/toast';

export type SecretDraftKey = `${string}:${string}:${string}`; // providerId:strategyId:secretKey

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return '{}';
  }
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function useAiConnectionDebug(uiVisible: boolean) {
  const queryClient = useQueryClient();

  const providersQuery = useQuery({
    queryKey: queryKeys.aiProviders.list(),
    queryFn: () => aiProviders.list().then((r) => r.providers),
    enabled: uiVisible,
  });

  const providers = providersQuery.data ?? [];

  const [selectedProviderId, setSelectedProviderId] = useState<string>('openrouter');
  const selectedProvider: AiProviderStatus | undefined = useMemo(
    () => providers.find((p) => p.id === selectedProviderId) ?? providers[0],
    [providers, selectedProviderId]
  );

  useEffect(() => {
    if (selectedProvider && selectedProvider.id !== selectedProviderId) {
      setSelectedProviderId(selectedProvider.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers.length]);

  const [configDraft, setConfigDraft] = useState<string>('{}');
  useEffect(() => {
    if (!selectedProvider) return;
    setConfigDraft(safeStringify(selectedProvider.config));
  }, [selectedProvider?.id, selectedProvider?.config]);

  const [secretDrafts, setSecretDrafts] = useState<Record<SecretDraftKey, string>>({});

  const setConfigMutation = useMutation({
    mutationFn: async (args: { providerId: string; configText: string }) => {
      const parsed = parseJson(args.configText);
      if (!parsed.ok) throw new Error(`Invalid JSON: ${parsed.error}`);
      return await aiProviders.setConfig(args.providerId, parsed.value);
    },
    onSuccess: async () => {
      toast.success('Saved provider config');
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const setSecretsMutation = useMutation({
    mutationFn: async (args: { providerId: string; authStrategyId: string; secrets: Record<string, string> }) => {
      return await aiProviders.setSecrets(args.providerId, args.authStrategyId, args.secrets);
    },
    onSuccess: async () => {
      toast.success('Saved provider secrets (encrypted)');
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const connectMutation = useMutation({
    mutationFn: async (args: { providerId: string; authStrategyId: string }) => {
      return await aiProviders.connect(args.providerId, args.authStrategyId);
    },
    onSuccess: async () => {
      toast.success('Connected');
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (args: { providerId: string }) => {
      return await aiProviders.disconnect(args.providerId);
    },
    onSuccess: async () => {
      toast.info('Disconnected');
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  return {
    providersQuery,
    providers,
    selectedProviderId,
    setSelectedProviderId,
    selectedProvider,
    configDraft,
    setConfigDraft,
    secretDrafts,
    setSecretDrafts,
    setConfigMutation,
    setSecretsMutation,
    connectMutation,
    disconnectMutation,
  };
}

