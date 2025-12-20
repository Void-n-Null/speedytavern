import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ChatList } from './pages/ChatList';
import { ChatPage } from './pages/ChatPage';
import { CharacterForge } from './pages/CharacterForge';
import { queryClient } from './lib/queryClient';
import './index.css';
import './components/chat/chat.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ChatList />} />
          <Route path="/chats/:id" element={<ChatPage />} />
          <Route path="/forge" element={<CharacterForge />} />
          <Route path="/forge/:id" element={<CharacterForge />} />
          <Route path="/forge/:id/edit" element={<CharacterForge />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);





