/**
 * Logs Tab
 * 
 * Request history with filtering and error logs.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Filter,
  AlertCircle, Cpu, DollarSign, RefreshCw
} from 'lucide-react';
import { aiRequestLogs, type AiRequestLog } from '../../../api/ai';
import { queryKeys } from '../../../lib/queryClient';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

interface LogsTabProps {
  isMobile: boolean;
  activeProviderId?: string | null;
}

type LogView = 'all' | 'errors';

export function LogsTab({ isMobile, activeProviderId }: LogsTabProps) {
  const [view, setView] = useState<LogView>('all');
  const [modelFilter, setModelFilter] = useState('');
  const [limit, setLimit] = useState(50);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Fetch logs
  const filters = useMemo(() => ({
    limit,
    status: view === 'errors' ? ('error' as const) : undefined,
    modelSlug: modelFilter || undefined,
    providerId: activeProviderId || undefined,
  }), [limit, view, modelFilter, activeProviderId]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: queryKeys.aiRequestLogs.list(filters),
    queryFn: () => aiRequestLogs.list(filters),
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;

  // Extract unique models from logs for filter dropdown
  const uniqueModels = useMemo(() => {
    const models = new Set<string>();
    logs.forEach(l => models.add(l.model_slug));
    return Array.from(models).sort();
  }, [logs]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header / Filters */}
      <div className="shrink-0 border-b border-zinc-800/50 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('all')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                view === 'all'
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              All Requests
            </button>
            <button
              onClick={() => setView('errors')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                view === 'errors'
                  ? 'bg-red-500/20 text-red-300'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <AlertCircle className="h-3 w-3 inline mr-1" />
              Errors Only
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 px-2"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
        </div>

        {/* Model filter */}
        <div className={cn('flex gap-2', isMobile && 'flex-col')}>
          <div className="flex-1">
            <Input
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              placeholder="Filter by model slug..."
              className="bg-zinc-900/50 border-zinc-800/60"
            />
          </div>
          <Select value={String(limit)} onValueChange={(v) => setLimit(parseInt(v))}>
            <SelectTrigger className="w-24 bg-zinc-900/50 border-zinc-800/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800">
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="shrink-0 px-3 py-2 text-xs text-zinc-500 border-b border-zinc-800/30">
        Showing {logs.length} of {total} requests
      </div>

      {/* Logs List */}
      <div className="flex-1 overflow-auto p-3">
        {isLoading ? (
          <div className="text-sm text-zinc-500 py-8 text-center">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-zinc-500 py-8 text-center">
            {view === 'errors' ? 'No errors recorded' : 'No requests logged yet'}
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <LogRow
                key={log.id}
                log={log}
                expanded={expandedLog === log.id}
                onToggle={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                isMobile={isMobile}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LogRow({
  log,
  expanded,
  onToggle,
  isMobile,
}: {
  log: AiRequestLog;
  expanded: boolean;
  onToggle: () => void;
  isMobile: boolean;
}) {
  const isError = log.status === 'error';
  const displayModel = log.model_slug.split('/').pop() || log.model_slug;
  const provider = log.model_slug.split('/')[0] || '';
  const timestamp = new Date(log.created_at);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        isError
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-zinc-800/60 bg-zinc-900/30'
      )}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={onToggle}
      >
        {/* Status icon */}
        <div className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          isError
            ? 'bg-red-500/20 text-red-400'
            : 'bg-emerald-500/20 text-emerald-400'
        )}>
          {isError ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-100 truncate">{displayModel}</span>
            <span className="text-xs text-zinc-600">{provider}</span>
          </div>

          <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(timestamp)}
            </span>
            
            {log.latency_ms && (
              <span>{log.latency_ms}ms</span>
            )}

            {log.calculated_cost_usd !== null && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                ${log.calculated_cost_usd.toFixed(6)}
              </span>
            )}
          </div>
        </div>

        {/* Token counts */}
        {!isMobile && (
          <div className="flex items-center gap-4 text-xs text-zinc-500 shrink-0">
            {log.input_tokens && (
              <span>{log.input_tokens.toLocaleString()} in</span>
            )}
            {log.output_tokens && (
              <span>{log.output_tokens.toLocaleString()} out</span>
            )}
          </div>
        )}

        {/* Expand indicator */}
        <div className="shrink-0 text-zinc-600">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-zinc-800/50 p-3 space-y-3">
          {/* Error message */}
          {isError && log.error_message && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <div className="flex items-center gap-2 text-xs text-red-400 mb-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Error Message
              </div>
              <p className="text-sm text-red-200 font-mono">{log.error_message}</p>
            </div>
          )}

          {/* Details grid */}
          <div className={cn('grid gap-3', isMobile ? 'grid-cols-2' : 'grid-cols-4')}>
            <DetailItem label="Request ID" value={log.id.slice(0, 8)} />
            <DetailItem label="Provider" value={log.provider_id} />
            <DetailItem label="Model" value={log.model_slug} />
            <DetailItem label="Timestamp" value={timestamp.toLocaleString()} />
            <DetailItem label="Input Tokens" value={log.input_tokens?.toLocaleString() ?? '-'} />
            <DetailItem label="Output Tokens" value={log.output_tokens?.toLocaleString() ?? '-'} />
            <DetailItem label="Latency" value={log.latency_ms ? `${log.latency_ms}ms` : '-'} />
            <DetailItem label="Cost" value={log.calculated_cost_usd ? `$${log.calculated_cost_usd.toFixed(6)}` : '-'} />
          </div>

          {/* Metadata */}
          {log.request_metadata && Object.keys(log.request_metadata).length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 mb-1.5">Metadata</div>
              <pre className="rounded-lg bg-zinc-800/50 p-2 text-xs text-zinc-300 overflow-auto max-h-32">
                {JSON.stringify(log.request_metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-zinc-500 mb-0.5">{label}</div>
      <div className="text-xs text-zinc-300 font-mono truncate">{value}</div>
    </div>
  );
}

