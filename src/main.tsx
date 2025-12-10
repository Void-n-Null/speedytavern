import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './components/chat/chat.css';
import { App } from './App';

/**
 * Application entry point.
 * 
 * Single responsibility: Mount React app to DOM.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
