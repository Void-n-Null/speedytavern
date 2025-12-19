import { useQuery } from '@tanstack/react-query';
import { aiProviders, type AiProviderStatus } from '../../api/ai';
import { queryKeys } from '../../lib/queryClient';

export function useAiProviders() {
  return useQuery({
    queryKey: queryKeys.aiProviders.list(),
    queryFn: () => aiProviders.list().then((r) => r.providers),
  });
}

export function useProviderUi(providerId: string) {
  const { data: providers } = useAiProviders();
  const provider = providers?.find((p) => p.id === providerId);
  return provider?.ui;
}

