import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { scan } from 'react-scan';
import './index.css';
import './components/chat/chat.css';
import { App } from './App';
import { queryClient } from './lib/queryClient';

// Enable react-scan for render visualization
// Disabled on Firefox due to severe performance issues (github.com/aidenybai/react-scan/issues/400)
// Set VITE_DISABLE_SCAN=1 to disable manually
// Set VITE_ENABLE_SCAN_PROD=1 to enable in production builds
const isFirefox = navigator.userAgent.includes('Firefox');
const enableInProd = import.meta.env.VITE_ENABLE_SCAN_PROD === '1';
const shouldEnable = (import.meta.env.DEV || enableInProd) && !import.meta.env.VITE_DISABLE_SCAN && !isFirefox;

if (shouldEnable) {
  scan({
    enabled: true,
    log: true,
  });
} else if (isFirefox) {
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
