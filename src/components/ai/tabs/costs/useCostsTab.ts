import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiRequestLogs } from '../../../../api/client';
import { queryKeys } from '../../../../lib/queryClient';

export type TimeRange = 'today' | 'week' | 'month' | 'all';

interface UseCostsTabProps {
  activeProviderId?: string | null;
}

export function useCostsTab({ activeProviderId }: UseCostsTabProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [calculatorExpanded, setCalculatorExpanded] = useState(false);

  // Calculate date range
  const filters = useMemo(() => {
    const now = Date.now();
    let startDate: number | undefined;
    switch (timeRange) {
      case 'today':
        startDate = now - 24 * 60 * 60 * 1000;
        break;
      case 'week':
        startDate = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        startDate = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }
    return { startDate, endDate: now, providerId: activeProviderId || undefined };
  }, [timeRange, activeProviderId]);

  // Fetch cost data
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: queryKeys.aiRequestLogs.summary(filters),
    queryFn: () => aiRequestLogs.getSummary(filters),
  });

  const { data: byModel, isLoading: byModelLoading } = useQuery({
    queryKey: queryKeys.aiRequestLogs.byModel(filters),
    queryFn: () => aiRequestLogs.getByModel({ ...filters, limit: 10 }),
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: queryKeys.aiRequestLogs.trend({ 
      days: timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : 30,
      providerId: activeProviderId || undefined 
    }),
    queryFn: () => aiRequestLogs.getTrend({ 
      days: timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : 30,
      providerId: activeProviderId || undefined 
    }),
  });

  return {
    timeRange,
    setTimeRange,
    calculatorExpanded,
    setCalculatorExpanded,
    summary,
    summaryLoading,
    byModel,
    byModelLoading,
    trend,
    trendLoading,
  };
}

