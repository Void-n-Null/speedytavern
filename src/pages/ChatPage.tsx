/**
 * ChatPage - Individual chat view.
 * 
 * Displays the message list and composer for a specific chat.
 * Similar to the old App.tsx but for a specific chat ID from URL params.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { ChatComposer } from '../components/chat/ChatComposer';
import { MessageList } from '../components/chat/MessageList';
import { AppToolbar } from '../components/AppToolbar';
import { SettingsModal } from '../components/settings/SettingsModal';
import { useChat } from '../hooks/queries/chats';
import { usePageBackgroundConfig, useTypographyConfig } from '../hooks/queries/useProfiles';
import { useCustomFontLoader } from '../hooks/queries/useFonts';
import { useSetting } from '../hooks/queries/useSettings';
import { StreamingDebugPanel } from '../components/streaming/StreamingDebugPanel';
import { AiConnectionDebugPanel } from '../components/ai/AiConnectionDebugPanel';
import { ToastContainer } from '../components/ui/toast';
import { ChatContext } from '../components/chat/ChatContext';

export function ChatPage() {
  const { id: chatId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  
  const { data: chat, isLoading, error } = useChat(chatId);
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

  // Redirect to chat list if chat not found
  useEffect(() => {
    if (!isLoading && !chat && chatId) {
      navigate('/', { replace: true });
    }
  }, [isLoading, chat, chatId, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col" style={bgStyle}>
        <div className="flex flex-1 items-center justify-center text-zinc-500 text-lg">
          Loading chat...
        </div>
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="flex h-screen flex-col" style={bgStyle}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="text-red-500 text-lg">
            {error ? `Error: ${error.message}` : 'Chat not found'}
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chats
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ChatContext.Provider value={{ chatId: chatId! }}>
      <div className="chat-page flex h-screen flex-col overflow-hidden" style={bgStyle}>
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
    </ChatContext.Provider>
  );
}

