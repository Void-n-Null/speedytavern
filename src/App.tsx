import { useState } from 'react';
import { ChatComposer, MessageList } from './components/chat';
import { AppToolbar } from './components/AppToolbar';
import { SettingsModal } from './components/settings/SettingsModal';
import { useServerChatStatus } from './hooks/queries';
import { usePageBackgroundConfig, useTypographyConfig } from './hooks/queries/useProfiles';
import { useCustomFontLoader } from './hooks/queries/useFonts';
import { useSetting } from './hooks/queries/useSettings';
import { StreamingDebugPanel } from './components/streaming/StreamingDebugPanel';
import { AiConnectionDebugPanel } from './components/ai/AiConnectionDebugPanel';
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
  
  const { data: debugStreaming } = useSetting<boolean>('debug.streaming');
  const { data: debugAi } = useSetting<boolean>('debug.ai');

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

      <ChatComposer />

      <SettingsModal open={showSettings} onOpenChange={setShowSettings} />

      {debugStreaming ? <StreamingDebugPanel /> : null}
      {debugAi ? <AiConnectionDebugPanel /> : null}
      <ToastContainer />
    </div>
  );
}
