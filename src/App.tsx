import { useState } from 'react';
import { MessageList } from './components/chat';
import { MessageStyleSettings } from './components/settings/MessageStyleSettings';
import { useServerChat } from './hooks/queries';
import { useStreamingDemo } from './hooks/useStreamingDemo';

/**
 * Root application component.
 * 
 * Single responsibility: App shell layout and initialization.
 */
export function App() {
  const [showSettings, setShowSettings] = useState(false);
  const { isLoading, error } = useServerChat();

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        color: '#888',
        fontSize: 18,
      }}>
        Loading chat from server...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        color: '#f44',
        fontSize: 18,
      }}>
        Error loading chat: {error.message}
      </div>
    );
  }

  return (
    <div className="app" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
        <MessageList />
      </div>
      
      {showSettings && (
        <div style={{
          width: 320,
          height: '100vh',
          overflow: 'auto',
          borderLeft: '1px solid #333',
          padding: 16,
          background: '#1a1a1a',
        }}>
          <MessageStyleSettings />
        </div>
      )}
      
      <button
        onClick={() => setShowSettings(!showSettings)}
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          padding: '8px 12px',
          background: '#333',
          border: 'none',
          borderRadius: 4,
          color: '#fff',
          cursor: 'pointer',
          zIndex: 1000,
        }}
      >
        {showSettings ? 'Hide Settings' : 'Settings'}
      </button>
      
      <StreamingDemo />
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
    <div style={{
      position: 'fixed',
      bottom: 16,
      right: 16,
      padding: '8px 12px',
      background: 'rgba(0,0,0,0.8)',
      borderRadius: 8,
      fontSize: 12,
      color: '#888',
    }}>
      {isStreaming ? (
        <span>Streaming... [Enter] finalize | [Esc] cancel</span>
      ) : (
        <span>Press [S] to test streaming</span>
      )}
    </div>
  );
}
