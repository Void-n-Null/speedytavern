/**
 * CharacterDetailInsights - token breakdown + structure counts.
 * Compact version for the dashboard grid; removes the useless macros card.
 */

import { useEffect, useMemo, useState } from 'react';
import { Hash, MessageSquare } from 'lucide-react';
import { Card, MetricRow } from './DetailBlocks';
import type { OpenAIEncodingName } from '../../../utils/tiktoken';
import { parseExampleMessages } from '../../../utils/exampleMessages';
import { countOpenAiTokensManyOffThread } from '../../../utils/tiktokenWorkerClient';
import { calculateApproxTokens } from '../editor/utils';

export type DetailInsightInput = {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  alternateGreetings: string[];
  exampleMessages: string;
  systemPrompt: string;
  postHistoryInstructions: string;
  creatorNotes: string;
};

type TokenStats = Record<string, number>;

export function CharacterDetailInsights({
  input,
  encoding = 'cl100k_base',
  onTokensCalculated,
}: {
  input: DetailInsightInput;
  encoding?: OpenAIEncodingName;
  onTokensCalculated?: (total: number) => void;
}) {
  const allGreetings = useMemo(
    () => [input.firstMessage, ...input.alternateGreetings].filter((x) => (x || '').trim()),
    [input.alternateGreetings, input.firstMessage]
  );

  const exampleParsed = useMemo(
    () => parseExampleMessages(input.exampleMessages),
    [input.exampleMessages]
  );

  // Approximate tokens while loading
  const approxTokens = useMemo(() => {
    return calculateApproxTokens([
      input.description,
      input.personality,
      input.scenario,
      input.firstMessage,
      input.alternateGreetings.join('\n\n'),
      input.exampleMessages,
      input.systemPrompt,
      input.postHistoryInstructions,
      input.creatorNotes,
    ]);
  }, [
    input.alternateGreetings,
    input.creatorNotes,
    input.description,
    input.exampleMessages,
    input.firstMessage,
    input.personality,
    input.postHistoryInstructions,
    input.scenario,
    input.systemPrompt,
  ]);

  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let debounceTimer: number | null = null;
    setTokenError(null);
    setTokenStats(null);

    const run = async () => {
      try {
        const counts = await countOpenAiTokensManyOffThread(
          {
            description: input.description,
            personality: input.personality,
            scenario: input.scenario,
            greetings: allGreetings.join('\n\n'),
            examples: input.exampleMessages,
            system: input.systemPrompt,
            postHistory: input.postHistoryInstructions,
            creatorNotes: input.creatorNotes,
          },
          encoding
        );
        const stats: TokenStats = counts;
        if (cancelled) return;
        setTokenStats(stats);
        const total = Object.values(stats).reduce((a, b) => a + b, 0);
        onTokensCalculated?.(total);
      } catch (e) {
        if (cancelled) return;
        setTokenError(e instanceof Error ? e.message : 'Tokenization failed');
      }
    };

    debounceTimer = window.setTimeout(() => {
      void run();
    }, 250);
    return () => {
      cancelled = true;
      if (debounceTimer != null) {
        window.clearTimeout(debounceTimer);
      }
    };
  }, [
    allGreetings,
    encoding,
    input.creatorNotes,
    input.description,
    input.exampleMessages,
    input.personality,
    input.postHistoryInstructions,
    input.scenario,
    input.systemPrompt,
    onTokensCalculated,
  ]);

  const totalTokens = tokenStats
    ? Object.values(tokenStats).reduce((a, b) => a + b, 0)
    : null;

  return (
    <div className="space-y-4">
      {/* Token breakdown */}
      <Card
        title="Token Breakdown"
        icon={Hash}
        headerRight={<span className="text-[11px] text-zinc-500">cl100k</span>}
      >
        <div className="space-y-2">
          <MetricRow
            label="Total"
            value={
              tokenError ? (
                <span className="text-red-300 text-xs">{tokenError}</span>
              ) : totalTokens !== null ? (
                <span className="font-mono text-zinc-100">{totalTokens.toLocaleString()}</span>
              ) : (
                <span className="text-zinc-400">≈{approxTokens.toLocaleString()}</span>
              )
            }
          />

          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-zinc-800/50 pt-2">
            <MetricRow label="Desc" value={tokenStats?.description?.toLocaleString() ?? '…'} />
            <MetricRow label="Pers" value={tokenStats?.personality?.toLocaleString() ?? '…'} />
            <MetricRow label="Scen" value={tokenStats?.scenario?.toLocaleString() ?? '…'} />
            <MetricRow label="Greet" value={tokenStats?.greetings?.toLocaleString() ?? '…'} />
            <MetricRow label="Ex" value={tokenStats?.examples?.toLocaleString() ?? '…'} />
            <MetricRow label="Sys" value={tokenStats?.system?.toLocaleString() ?? '…'} />
          </div>
        </div>
      </Card>

      {/* Structure */}
      <Card title="Structure" icon={MessageSquare}>
        <div className="space-y-1.5">
          <MetricRow label="Greetings" value={allGreetings.length} />
          <MetricRow label="Conversations" value={exampleParsed.conversations.length} />
          <MetricRow
            label="Example msgs"
            value={exampleParsed.conversations.reduce((a, c) => a + c.messages.length, 0)}
          />
        </div>
      </Card>
    </div>
  );
}
