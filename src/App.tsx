import { useState } from 'react';
import { MessageList } from './components/chat';
import { AppToolbar } from './components/AppToolbar';
import { DesignConfigModal } from './components/design-config/DesignConfigModal';
import { useServerChatStatus } from './hooks/queries';
import { STREAMING_DEBUG_SCENARIOS, useStreamingDebug } from './hooks/useStreamingDebug';
import { usePageBackgroundConfig, useTypographyConfig } from './hooks/queries/useProfiles';
import { useCustomFontLoader } from './hooks/queries/useFonts';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { ToastContainer } from './components/ui/toast';

/**
 * Root application component.
 * 
 * Single responsibility: App shell layout and initialization.
 */
export function App() {
  const [showSettings, setShowSettings] = useState(false);
  const { isLoading, error } = useServerChatStatus();
  const pageBackground = usePageBackgroundConfig();
  const typography = useTypographyConfig();
  
  // Load custom font if selected
  useCustomFontLoader(typography.customFontId, typography.fontFamily);

  // Build background style based on config
  const bgStyle: React.CSSProperties = pageBackground.type === 'color'
    ? { backgroundColor: pageBackground.color }
    : pageBackground.type === 'image' && pageBackground.imageUrl
    ? {
        backgroundColor: '#000',
        backgroundImage: `linear-gradient(rgba(0,0,0,${1 - pageBackground.opacity / 100}), rgba(0,0,0,${1 - pageBackground.opacity / 100})), url(${pageBackground.imageUrl})`,
        backgroundSize: pageBackground.size,
        backgroundPosition: pageBackground.position,
        backgroundRepeat: pageBackground.repeat,
        backgroundAttachment: 'fixed',
      }
    : {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-zinc-500 text-lg">
        Loading chat from server...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500 text-lg">
        Error loading chat: {error.message}
      </div>
    );
  }

  return (
    <div className="app flex h-screen flex-col overflow-hidden" style={bgStyle}>
      <AppToolbar onOpenSettings={() => setShowSettings(true)} />

      <main className="flex-1 min-h-0 overflow-hidden">
        <MessageList />
      </main>

      <DesignConfigModal open={showSettings} onOpenChange={setShowSettings} />

      {import.meta.env.DEV ? <StreamingDebugPanel /> : null}
      <ToastContainer />
    </div>
  );
}

/**
 * Streaming debug panel (DEV-only).
 *
 * Keyboard shortcuts:
 * - S: Start/restart streaming
 * - 1/2/3: Switch scenario
 * - Enter: Finalize and persist
 * - Escape: Cancel
 */
function StreamingDebugPanel() {
  const debug = useStreamingDebug();

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] rounded-lg border border-zinc-700 bg-black/80 p-3 text-xs text-zinc-200 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-zinc-100">Streaming Debug</div>
        <div className="text-[10px] text-zinc-400">[S] start • [Enter] finalize • [Esc] cancel</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-[11px] text-zinc-300">Scenario</Label>
          <Select
            value={debug.scenarioId}
            onValueChange={(v) => debug.setScenarioId(v as (typeof STREAMING_DEBUG_SCENARIOS)[number]['id'])}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select scenario…" />
            </SelectTrigger>
            <SelectContent>
              {STREAMING_DEBUG_SCENARIOS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-1 text-[10px] text-zinc-400">Hotkeys: [1] markdown • [2] long RP • [3] other RP</div>
        </div>

        <div>
          <Label className="text-[11px] text-zinc-300">Chunking</Label>
          <Select value={debug.chunkMode} onValueChange={(v) => debug.setChunkMode(v as typeof debug.chunkMode)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="characters">Characters</SelectItem>
              <SelectItem value="openai_tokens">OpenAI tokens (tiktoken)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[11px] text-zinc-300">Delay (ms)</Label>
          <Input
            className="h-8 text-xs"
            type="number"
            min={0}
            value={debug.delayMs}
            onChange={(e) => debug.setDelayMs(Number(e.target.value))}
          />
        </div>

        {debug.chunkMode === 'characters' ? (
          <div>
            <Label className="text-[11px] text-zinc-300">Chars/chunk</Label>
            <Input
              className="h-8 text-xs"
              type="number"
              min={1}
              value={debug.charsPerChunk}
              onChange={(e) => debug.setCharsPerChunk(Number(e.target.value))}
            />
          </div>
        ) : (
          <>
            <div>
              <Label className="text-[11px] text-zinc-300">Encoding</Label>
              <Select value={debug.openAIEncoding} onValueChange={(v) => debug.setOpenAIEncoding(v as typeof debug.openAIEncoding)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cl100k_base">cl100k_base (gpt-4/3.5)</SelectItem>
                  <SelectItem value="o200k_base">o200k_base (gpt-4o)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-zinc-300">Tokens/chunk</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                min={1}
                value={debug.tokensPerChunk}
                onChange={(e) => debug.setTokensPerChunk(Number(e.target.value))}
              />
            </div>
          </>
        )}

        <div className="col-span-2 mt-1 flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={() => void debug.start()}
          >
            {debug.isFeeding ? 'Restart' : 'Start'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={!debug.isStreaming}
            onClick={() => void debug.finalize()}
          >
            Finalize
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            disabled={!debug.isStreaming}
            onClick={debug.cancel}
          >
            Cancel
          </Button>
        </div>

        <div className="col-span-2 mt-1 text-[11px] text-zinc-400">
          {debug.isStreaming ? (
            <span>
              {debug.isFeeding ? 'Feeding' : 'Streaming'} • {debug.progressIndex}/{debug.progressTotal} {debug.progressUnit}
            </span>
          ) : (
            <span>Idle • Press [S] or click Start</span>
          )}
          {debug.tokenizationError ? (
            <div className="mt-1 text-[10px] text-amber-400">
              Tokenization failed (fell back to characters): {debug.tokenizationError}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
