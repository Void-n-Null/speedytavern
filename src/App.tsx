import { useState } from 'react';
import { Settings } from 'lucide-react';
import { MessageList } from './components/chat';
import { DesignConfigModal } from './components/design-config/DesignConfigModal';
import { useServerChat } from './hooks/queries';
import { useStreamingDemo } from './hooks/useStreamingDemo';
import { usePageBackgroundConfig } from './store/messageStyleStore';
import { Button } from './components/ui/button';
import { ToastContainer } from './components/ui/toast';

/**
 * Root application component.
 * 
 * Single responsibility: App shell layout and initialization.
 */
export function App() {
  const [showSettings, setShowSettings] = useState(false);
  const { isLoading, error } = useServerChat();
  const pageBackground = usePageBackgroundConfig();

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
    <div className="app flex h-screen overflow-hidden" style={bgStyle}>
      <div className="flex-1 h-full overflow-hidden">
        <MessageList />
      </div>
      
      <Button
        onClick={() => setShowSettings(true)}
        variant="secondary"
        size="icon"
        className="fixed top-4 right-4 z-50 shadow-lg"
      >
        <Settings className="h-5 w-5" />
      </Button>
      
      <DesignConfigModal open={showSettings} onOpenChange={setShowSettings} />
      
      <StreamingDemo />
      <ToastContainer />
    </div>
  );
}

/**
 * Temporary demo component for testing streaming.
 * Press 'S' to start streaming, 'Enter' to finalize, 'Escape' to cancel.
 */
function StreamingDemo() {
  const { isStreaming } = useStreamingDemo();

  return (
    <div className="fixed bottom-4 right-4 px-3 py-2 bg-black/80 rounded-lg text-xs text-zinc-500">
      {isStreaming ? (
        <span>Streaming... [Enter] finalize | [Esc] cancel</span>
      ) : (
        <span>Press [S] to test streaming</span>
      )}
    </div>
  );
}
