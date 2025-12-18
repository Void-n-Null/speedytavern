/**
 * CharacterDetailDashboard - Dense, 6-column grid layout.
 *
 * Layout rationale:
 * - Each "row" is its own grid so vertical sizing doesn't bleed between columns
 * - Full width (no max-width constraint) with padding
 * - Description is collapsible to ~18 lines
 * - Token Budget bar at top for at-a-glance context usage
 * - Per-field copy buttons for interactivity
 */

import { useMemo, useState } from 'react';
import { MessageSquareText, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { parseExampleMessages } from '../../utils/exampleMessages';
import { Card, CodeBlock, MarkdownBlock } from './detail/DetailBlocks';
import { CharacterDetailInsights } from './detail/CharacterDetailInsights';
import { TokenBudgetBar } from './detail/TokenBudgetBar';
import { CollapsibleText } from './detail/CollapsibleText';
import { CopyButton } from './detail/CopyButton';
import { HeroHeader } from './detail/HeroHeader';
import { ExampleMessagesDisplay } from './detail/ExampleMessagesDisplay';

export type CharacterDetailDashboardData = {
  id: string;
  name: string;
  specLabel: string;
  createdAt: number;
  updatedAt: number;
  hasPng: boolean;
  avatarUrl: string | null;
  rawJson: string;

  creator: string;
  characterVersion: string;
  tags: string[];

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

export function CharacterDetailDashboard({
  data,
  onEdit,
  onClose,
  onCopyJson,
  onExportJson,
  onExportPng,
}: {
  data: CharacterDetailDashboardData;
  onEdit: () => void;
  onClose: () => void;
  onCopyJson: () => void;
  onExportJson: () => void;
  onExportPng: () => void;
}) {
  const HUGE_TEXT_CHARS = 50_000;
  const RAW_JSON_PREVIEW_CHARS = 4_000;
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [totalTokens, setTotalTokens] = useState<number | null>(null);
  const [jsonExpanded, setJsonExpanded] = useState(false);

  const greetings = useMemo(
    () => [data.firstMessage, ...data.alternateGreetings],
    [data.firstMessage, data.alternateGreetings]
  );
  const greetingLabel = greetingIndex === 0 ? 'First' : `Alt ${greetingIndex}`;

  const examplesParsed = useMemo(() => {
    // Parsing + rendering massive example blocks is a UI killer. If it's huge, show raw instead.
    if ((data.exampleMessages || '').length > HUGE_TEXT_CHARS) return null;
    return parseExampleMessages(data.exampleMessages);
  }, [data.exampleMessages]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-950/50">
      <HeroHeader
        data={data}
        onEdit={onEdit}
        onClose={onClose}
        onCopyJson={onCopyJson}
        onExportJson={onExportJson}
        onExportPng={onExportPng}
      />

      {/* Dashboard content - independent rows */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full space-y-4">
          {/* Row 0: Token Budget Bar (full width) */}
          <TokenBudgetBar totalTokens={totalTokens} loading={totalTokens === null} />

          {/* Row 1: Description (4 cols) + Personality/Scenario (2 cols) */}
          <div className="grid grid-cols-6 gap-4">
            <Card
              title="Description"
              className="col-span-6 lg:col-span-4"
              headerRight={<CopyButton text={data.description} />}
            >
              <CollapsibleText content={data.description} charName={data.name} maxLines={18} />
            </Card>

            <div className="col-span-6 space-y-4 lg:col-span-2">
              <Card title="Personality" headerRight={<CopyButton text={data.personality} />}>
                <MarkdownBlock content={data.personality} charName={data.name} />
              </Card>
              <Card title="Scenario" headerRight={<CopyButton text={data.scenario} />}>
                <MarkdownBlock content={data.scenario} charName={data.name} />
              </Card>
            </div>
          </div>

          {/* Row 2: Greetings (3 cols) + Examples (3 cols) */}
          <div className="grid grid-cols-6 gap-4">
            <Card
              title="Greetings"
              icon={MessageSquareText}
              className="col-span-6 lg:col-span-3"
              headerRight={
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <button
                    className="rounded-md px-2 py-1 hover:bg-zinc-800 disabled:opacity-40"
                    disabled={greetingIndex <= 0}
                    onClick={() => setGreetingIndex((v) => Math.max(0, v - 1))}
                  >
                    ←
                  </button>
                  <span className="rounded bg-zinc-900/60 px-2 py-1">
                    {greetingLabel} ({greetingIndex + 1}/{greetings.length})
                  </span>
                  <button
                    className="rounded-md px-2 py-1 hover:bg-zinc-800 disabled:opacity-40"
                    disabled={greetingIndex >= greetings.length - 1}
                    onClick={() => setGreetingIndex((v) => Math.min(greetings.length - 1, v + 1))}
                  >
                    →
                  </button>
                  <CopyButton text={greetings[greetingIndex] || ''} />
                </div>
              }
            >
              <CollapsibleText
                content={greetings[greetingIndex] || ''}
                charName={data.name}
                maxLines={12}
              />
            </Card>

            <Card
              title="Example Messages"
              icon={Sparkles}
              className="col-span-6 lg:col-span-3"
              headerRight={<CopyButton text={data.exampleMessages} />}
            >
              <ExampleMessagesDisplay
                examplesParsed={examplesParsed}
                charName={data.name}
                rawExampleMessages={data.exampleMessages}
                CodeBlock={CodeBlock}
              />
            </Card>
          </div>

          {/* Row 3: System + Post-History + Notes (2+2+2) */}
          <div className="grid grid-cols-6 gap-4">
            <Card
              title="System Prompt"
              className="col-span-6 md:col-span-3 lg:col-span-2"
              headerRight={<CopyButton text={data.systemPrompt} />}
            >
              <CodeBlock text={data.systemPrompt} maxHeightClass="max-h-[180px]" maxChars={60_000} />
            </Card>

            <Card
              title="Post-History"
              className="col-span-6 md:col-span-3 lg:col-span-2"
              headerRight={<CopyButton text={data.postHistoryInstructions} />}
            >
              <CodeBlock text={data.postHistoryInstructions} maxHeightClass="max-h-[180px]" maxChars={60_000} />
            </Card>

            <Card
              title="Creator Notes"
              className="col-span-6 md:col-span-6 lg:col-span-2"
              headerRight={<CopyButton text={data.creatorNotes} />}
            >
              <CodeBlock text={data.creatorNotes} maxHeightClass="max-h-[180px]" maxChars={60_000} />
            </Card>
          </div>

          {/* Row 4: Token Breakdown (3 cols) + Raw JSON (3 cols) */}
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-6 lg:col-span-3">
              <CharacterDetailInsights
                input={{
                  name: data.name,
                  description: data.description,
                  personality: data.personality,
                  scenario: data.scenario,
                  firstMessage: data.firstMessage,
                  alternateGreetings: data.alternateGreetings,
                  exampleMessages: data.exampleMessages,
                  systemPrompt: data.systemPrompt,
                  postHistoryInstructions: data.postHistoryInstructions,
                  creatorNotes: data.creatorNotes,
                }}
                onTokensCalculated={setTotalTokens}
              />
            </div>

            <Card
              title="Raw JSON"
              className="col-span-6 lg:col-span-3"
              headerRight={
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setJsonExpanded((v) => !v)}
                    className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  >
                    {jsonExpanded ? 'Collapse' : 'Expand'}
                  </button>
                  <CopyButton text={data.rawJson} />
                </div>
              }
            >
              {!jsonExpanded ? (
                <div className="space-y-2">
                  <div className="text-xs text-zinc-500">
                    Showing preview. Full JSON is{' '}
                    <span className="font-mono text-zinc-200">{data.rawJson.length.toLocaleString()}</span> chars.
                  </div>
                  <CodeBlock text={data.rawJson} maxHeightClass="max-h-[200px]" maxChars={RAW_JSON_PREVIEW_CHARS} />
                  <div className="text-xs text-zinc-500">
                    Tip: use the JSON export button above to open it in a new tab without freezing this view.
                  </div>
                </div>
              ) : (
                <CodeBlock
                  text={data.rawJson}
                  maxHeightClass="max-h-[600px]"
                  // Even expanded, don't try to render absurdly large blobs.
                  maxChars={250_000}
                />
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
