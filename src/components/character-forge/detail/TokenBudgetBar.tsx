/**
 * TokenBudgetBar - budget UI that separates:
 * - Absolute prompt size (can affect cost/latency and sometimes adherence even on huge contexts)
 * - Relative fit vs a chosen target context window (32k/128k/200k/custom)
 *
 * IMPORTANT: we can't reliably know the model context window in this app today (no canonical metadata),
 * so we provide Auto (best-effort inference) + explicit override.
 */

import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../../lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { useActiveProfile } from '../../../hooks/queries/useProfiles';
import { inferContextWindowTokens } from '../../../utils/modelContext';

// Absolute-size zones (opinionated defaults; still useful even for 1M+ contexts).
const ZONES = [
  { id: 'lean', label: 'Lean', max: 900, color: 'bg-emerald-500', desc: 'Probably under-described' },
  { id: 'ideal', label: 'Ideal', max: 2500, color: 'bg-blue-500', desc: 'Balanced depth' },
  { id: 'rich', label: 'Rich', max: 6000, color: 'bg-violet-500', desc: 'Very detailed' },
  { id: 'bloated', label: 'Bloated', max: Infinity, color: 'bg-amber-500', desc: 'Likely overkill' },
] as const;

const ULTRA_LONG_CONTEXT_THRESHOLD = 400_000;
const PRACTICAL_CARD_BUDGET_CAP_ULTRA_LONG = 50_000;

type Verdict = 'ok' | 'tight' | 'no' | 'unknown';

type ContextPresetKey = 'auto' | '32k' | '128k' | '200k' | 'custom';
const CONTEXT_PRESETS: { key: ContextPresetKey; label: string; tokens: number | null }[] = [
  { key: 'auto', label: 'Auto', tokens: null },
  { key: '32k', label: '32K', tokens: 32_768 },
  { key: '128k', label: '128K', tokens: 128_000 },
  { key: '200k', label: '200K', tokens: 200_000 },
  { key: 'custom', label: 'Custom', tokens: null },
];

type ReservePresetKey = 'short' | 'balanced' | 'long';
const RESERVE_PRESETS: { key: ReservePresetKey; label: string; reserveFrac: number; hint: string }[] = [
  { key: 'short', label: 'Short chats', reserveFrac: 0.5, hint: '50% history/tools' },
  { key: 'balanced', label: 'Balanced', reserveFrac: 0.7, hint: '70% history/tools' },
  { key: 'long', label: 'Long chats', reserveFrac: 0.85, hint: '85% history/tools' },
];

function getFitVerdict(tokens: number, budget: number): Verdict {
  if (!budget || budget <= 0) return 'unknown';
  if (tokens <= budget * 0.7) return 'ok';
  if (tokens <= budget) return 'tight';
  return 'no';
}

function VerdictBadge({ verdict, label }: { verdict: Verdict; label: string }) {
  const config = {
    ok: { icon: CheckCircle2, bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
    tight: { icon: AlertTriangle, bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
    no: { icon: XCircle, bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30' },
    unknown: { icon: HelpCircle, bg: 'bg-zinc-500/20', text: 'text-zinc-400', border: 'border-zinc-500/30' },
  }[verdict];

  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-md border px-2 py-1',
        config.bg,
        config.border
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', config.text)} />
      <span className={cn('text-xs font-medium', config.text)}>{label}</span>
    </div>
  );
}

function getAdvice(tokens: number, zone: typeof ZONES[number], fit: Verdict, contextTokens: number): string {
  if (tokens === 0) return 'Add some content to see budget analysis.';

  const ultraLong = contextTokens >= ULTRA_LONG_CONTEXT_THRESHOLD;

  switch (zone.id) {
    case 'rich':
      return fit === 'no'
        ? `Rich + over budget. Either target a larger context than ${Math.round(contextTokens / 1000)}K, or trim to keep more room for history.`
        : ultraLong
          ? 'Rich character. Huge contexts can dilute the “signal” of any single detail—keep the core persona compact and put deep lore into lorebooks/RAG.'
          : 'Rich character. Consider offloading deep lore into lorebooks/RAG so the core persona stays crisp.';
    case 'bloated':
      return fit === 'no'
        ? `Bloated + over budget. This will crowd out conversation history even on large contexts.`
        : ultraLong
          ? 'Very large definition. Even with massive contexts, models tend to rely most on what’s near the beginning/end—treat huge context as an archive and keep the persona lean.'
          : 'Very large definition. Even if it fits the context, it can increase cost/latency and sometimes reduce instruction focus.';
    case 'lean':
      return ultraLong
        ? 'Lean definition. You probably want more detail to make the character feel fully defined—keep the core persona tight, and store the extra lore elsewhere.'
        : 'Lean definition. You probably want more information here so the character feels fleshed out (voice, goals, boundaries, relationships, quirks).';
    case 'ideal':
      return fit === 'no'
        ? `Good absolute size, but your selected target context is small. Either raise target context or reduce a bit.`
        : ultraLong
          ? 'Great balance: enough depth without burying the important bits in an ultra-long prompt.'
          : 'Great balance: enough depth without crowding out the conversation.';
    default:
      return '';
  }
}

export function TokenBudgetBar({
  totalTokens,
  loading = false,
}: {
  totalTokens: number | null;
  loading?: boolean;
}) {
  const tokens = totalTokens ?? 0;
  const isEstimating = loading && tokens > 0;

  // Best-effort model inference (optional; used only for Auto context).
  const { data: profile } = useActiveProfile();
  const activeAi = useMemo(() => {
    if (!profile) return null;
    const activeId = profile.activeAiConfigId;
    return profile.aiConfigs?.find((c) => c.id === activeId) ?? null;
  }, [profile]);

  const inferred = useMemo(() => {
    return inferContextWindowTokens({ providerId: activeAi?.providerId, modelId: activeAi?.modelId });
  }, [activeAi?.modelId, activeAi?.providerId]);

  const [contextPreset, setContextPreset] = useState<ContextPresetKey>('auto');
  const [customContext, setCustomContext] = useState<number>(200_000);
  const [reservePreset, setReservePreset] = useState<ReservePresetKey>('balanced');

  // Keep custom context in sync with inferred on first load if user hasn't chosen custom/preset.
  useEffect(() => {
    if (contextPreset !== 'auto') return;
    if (!inferred?.contextTokens) return;
    // Update displayed customContext so if user switches to Custom, it starts sensible.
    setCustomContext(inferred.contextTokens);
  }, [contextPreset, inferred?.contextTokens]);

  const contextTokens = useMemo(() => {
    const preset = CONTEXT_PRESETS.find((p) => p.key === contextPreset);
    if (!preset) return 200_000;
    if (preset.key === 'auto') return inferred?.contextTokens ?? 200_000;
    if (preset.key === 'custom') return Math.max(1_000, customContext || 200_000);
    return preset.tokens ?? 200_000;
  }, [contextPreset, customContext, inferred?.contextTokens]);

  const reserveFrac = useMemo(() => {
    return RESERVE_PRESETS.find((r) => r.key === reservePreset)?.reserveFrac ?? 0.7;
  }, [reservePreset]);

  const rawCardBudget = Math.max(0, Math.floor(contextTokens * (1 - reserveFrac)));
  const cardBudget =
    contextTokens >= ULTRA_LONG_CONTEXT_THRESHOLD
      ? Math.min(rawCardBudget, PRACTICAL_CARD_BUDGET_CAP_ULTRA_LONG)
      : rawCardBudget;
  const fitVerdict = loading || tokens === 0 ? ('unknown' as Verdict) : getFitVerdict(tokens, cardBudget);

  const currentZone = useMemo(() => {
    return ZONES.find((z) => tokens <= z.max) ?? ZONES[ZONES.length - 1];
  }, [tokens]);

  const ultraLong = contextTokens >= ULTRA_LONG_CONTEXT_THRESHOLD;
  const relativeDenominator = ultraLong ? Math.max(1, cardBudget) : Math.max(1, contextTokens);

  const gaugePosition = useMemo(() => {
    if (tokens === 0) return 0;
    // Use log scale: 0 at 100 tokens, 100% at 10000 tokens
    const minLog = Math.log10(100);
    const maxLog = Math.log10(10000);
    const tokenLog = Math.log10(Math.max(100, Math.min(tokens, 10000)));
    return ((tokenLog - minLog) / (maxLog - minLog)) * 100;
  }, [tokens]);

  const budgetPct = cardBudget > 0 ? Math.min(200, (tokens / cardBudget) * 100) : 0;
  const advice = getAdvice(tokens, currentZone, fitVerdict, contextTokens);

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/30 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-medium text-zinc-200">Context Budget</div>
        <div className="flex items-center gap-2">
          {loading && !isEstimating ? (
            <span className="animate-pulse text-xs text-zinc-400">Calculating…</span>
          ) : (
            <>
              <span className="font-mono text-lg font-semibold text-zinc-100">
                {isEstimating ? `≈${tokens.toLocaleString()}` : tokens.toLocaleString()}
              </span>
              <span className="text-xs text-zinc-500">tokens{isEstimating ? ' (est.)' : ''}</span>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <div className="mb-1 text-[11px] font-medium text-zinc-500">Target context</div>
          <select
            value={contextPreset}
            onChange={(e) => setContextPreset(e.target.value as ContextPresetKey)}
            className={cn(
              'h-9 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 text-sm text-zinc-200',
              'focus:outline-none focus:ring-1 focus:ring-violet-500/30'
            )}
          >
            {CONTEXT_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
          <div className="mt-1 text-[11px] text-zinc-500">
            {contextPreset === 'auto' ? (
              inferred ? (
                <>Auto guess: {Math.round(contextTokens / 1000)}K ({inferred.confidence} confidence)</>
              ) : (
                <>Auto guess: {Math.round(contextTokens / 1000)}K (fallback)</>
              )
            ) : (
              <>Using {Math.round(contextTokens / 1000)}K</>
            )}
          </div>
        </div>

        <div>
          <div className="mb-1 text-[11px] font-medium text-zinc-500">Reserve for history/tools</div>
          <div className="flex flex-wrap gap-2">
            {RESERVE_PRESETS.map((r) => (
              <button
                key={r.key}
                onClick={() => setReservePreset(r.key)}
                className={cn(
                  'rounded-lg border px-2.5 py-1.5 text-xs',
                  reservePreset === r.key
                    ? 'border-violet-500/40 bg-violet-500/15 text-violet-200'
                    : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:bg-zinc-900/60'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">
            Budget for card: <span className="font-mono text-zinc-200">{cardBudget.toLocaleString()}</span> tokens
          </div>
        </div>

        <div>
          <div className="mb-1 text-[11px] font-medium text-zinc-500">Custom context</div>
          <input
            type="number"
            value={customContext}
            disabled={contextPreset !== 'custom'}
            onChange={(e) => setCustomContext(Number(e.target.value))}
            className={cn(
              'h-9 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 text-sm text-zinc-200',
              contextPreset !== 'custom' ? 'opacity-40' : '',
              'focus:outline-none focus:ring-1 focus:ring-violet-500/30'
            )}
            min={1000}
            step={1000}
          />
          <div className="mt-1 text-[11px] text-zinc-500">e.g. 200000</div>
        </div>
      </div>

      {/* Absolute-size gauge */}
      <div className="relative mb-4">
        {/* Zone labels */}
        <div className="mb-1.5 flex justify-between text-[10px] text-zinc-500">
          <span>Lean</span>
          <span>Ideal</span>
          <span>Rich</span>
          <span>Bloated</span>
        </div>

        {/* Track with zones */}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-800/80">
          {/* Zone segments */}
          <div className="absolute inset-0 flex">
            {ZONES.map((z) => (
              <div
                key={z.id}
                className={cn('h-full', z.color, 'opacity-30')}
                style={{ width: `${100 / ZONES.length}%` }}
              />
            ))}
          </div>

          {/* Position indicator (transform-based to avoid layout thrash on large pages) */}
          <div
            className="absolute inset-y-0 left-0 w-full will-change-transform transition-transform duration-500"
            style={{ transform: `translateX(${Math.min(100, gaugePosition)}%)` }}
          >
            <div className="h-full w-1 -translate-x-1/2 rounded-full bg-white shadow-lg shadow-white/30" />
          </div>
        </div>

        {/* Current zone indicator */}
        <div className="mt-2 flex items-center justify-center gap-2">
          <div className={cn('h-2.5 w-2.5 rounded-full', currentZone.color)} />
          <span className="text-xs font-medium text-zinc-300">{currentZone.label}</span>
          <span className="text-xs text-zinc-500">• {currentZone.desc}</span>
        </div>
      </div>

      {/* Relative fit */}
      <div className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-medium text-zinc-400">Fit vs target budget</div>
          <div className="text-[11px] text-zinc-500">
            Card uses{' '}
            <span className="font-mono text-zinc-200">
              {relativeDenominator ? ((tokens / relativeDenominator) * 100).toFixed(2) : '0.00'}%
            </span>{' '}
            {ultraLong ? 'of practical budget' : 'of context'}
          </div>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-800/80">
          <div
            className={cn(
              // transform-based fill to avoid triggering layout on big DOMs
              'h-full w-full origin-left will-change-transform transition-transform duration-500',
              fitVerdict === 'ok'
                ? 'bg-emerald-500/70'
                : fitVerdict === 'tight'
                  ? 'bg-amber-500/70'
                  : fitVerdict === 'no'
                    ? 'bg-red-500/70'
                    : 'bg-zinc-500/40'
            )}
            style={{ transform: `scaleX(${Math.min(1, budgetPct / 100)})` }}
          />
          {/* Budget marker at 100% */}
          <div className="absolute right-0 top-0 h-full w-px bg-zinc-200/20" />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <VerdictBadge
            verdict={fitVerdict}
            label={
              fitVerdict === 'ok'
                ? 'Comfortable'
                : fitVerdict === 'tight'
                  ? 'Tight'
                  : fitVerdict === 'no'
                    ? 'Over budget'
                    : 'Calculating'
            }
          />
          <div className="text-xs text-zinc-500">
            Budget: <span className="font-mono text-zinc-200">{cardBudget.toLocaleString()}</span> tokens for card
          </div>
        </div>
      </div>

      {/* Advice */}
      <div className="rounded-lg bg-zinc-900/50 px-3 py-2">
        <p className="text-xs leading-relaxed text-zinc-400">{advice}</p>
      </div>
    </div>
  );
}
