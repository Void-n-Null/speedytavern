import { useEffect } from 'react';
import { MessageList } from './components/chat';
import { generateDemoData } from './utils/generateDemoData';

/**
 * Root application component.
 * 
 * Single responsibility: App shell layout and initialization.
 */
export function App() {
  useEffect(() => {
    generateDemoData();
  }, []);

  return (
    <div className="app">
      <MessageList />
    </div>
  );
}
