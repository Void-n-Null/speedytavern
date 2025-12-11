// react-scan MUST be imported and initialized BEFORE React
// Using dynamic imports to ensure proper initialization order
import { scan } from 'react-scan';

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
    showToolbar: true,
  });
} else if (isFirefox) {
  console.log('[react-scan] Disabled on Firefox due to performance issues');
}

// Dynamic imports ensure React loads AFTER scan() initializes
const bootstrap = async () => {
  const [
    { StrictMode },
    { createRoot },
    { QueryClientProvider },
    { App },
    { queryClient },
  ] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('@tanstack/react-query'),
    import('./App'),
    import('./lib/queryClient'),
  ]);

  // CSS imports (side-effect only)
  await import('./index.css');
  await import('./components/chat/chat.css');

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
};

bootstrap();
