import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { scan } from 'react-scan';
import './index.css';
import './components/chat/chat.css';
import { App } from './App';
import { queryClient } from './lib/queryClient';

// Enable react-scan in development
// Disabled on Firefox due to severe performance issues (github.com/aidenybai/react-scan/issues/400)
// Set VITE_DISABLE_SCAN=1 to disable manually
const isFirefox = navigator.userAgent.includes('Firefox');
if (import.meta.env.DEV && !import.meta.env.VITE_DISABLE_SCAN && !isFirefox) {
  scan({
    enabled: true,
    log: true,
  });
} else if (isFirefox && import.meta.env.DEV) {
  console.log('[react-scan] Disabled on Firefox due to performance issues');
}

/**
 * Application entry point.
 * 
 * Single responsibility: Mount React app to DOM.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
