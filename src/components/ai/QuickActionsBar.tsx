/**
 * Quick Actions Bar
 * 
 * A subtle, always-visible bar at the bottom of the dashboard showing:
 * - Current selected model
 * - Recent models (last 5)
 * - Pinned/favorite models
 */

import { useState, useEffect } from 'react';
import { Cpu, Star, Clock, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

interface QuickActionsBarProps {
  isMobile: boolean;
}

// Get selected model from localStorage
function getSelectedModel(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tavernstudio:selectedModel');
}

// Get recent models from localStorage
function getRecentModels(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('tavernstudio:recentModels');
    const parsed = raw ? JSON.parse(raw) : [];
    return (Array.isArray(parsed) ? parsed : []).filter((m): m is string => typeof m === 'string');
  } catch {
    return [];
  }
}

// Get pinned models from localStorage
function getPinnedModels(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('tavernstudio:pinnedModels');
    const parsed = raw ? JSON.parse(raw) : [];
    return (Array.isArray(parsed) ? parsed : []).filter((m): m is string => typeof m === 'string');
  } catch {
    return [];
  }
}

// Add to recent models
export function addToRecentModels(modelSlug: string): void {
  if (typeof window === 'undefined' || !modelSlug) return;
  const recent = getRecentModels().filter(m => m && m !== modelSlug);
  recent.unshift(modelSlug);
  const limited = recent.slice(0, 5);
  localStorage.setItem('tavernstudio:recentModels', JSON.stringify(limited));
}

// Toggle pinned model
export function togglePinnedModel(modelSlug: string): boolean {
  if (typeof window === 'undefined') return false;
  const pinned = getPinnedModels();
  const isPinned = pinned.includes(modelSlug);
  
  if (isPinned) {
    localStorage.setItem('tavernstudio:pinnedModels', JSON.stringify(pinned.filter(m => m !== modelSlug)));
    return false;
  } else {
    localStorage.setItem('tavernstudio:pinnedModels', JSON.stringify([...pinned, modelSlug]));
    return true;
  }
}

export function QuickActionsBar({ isMobile }: QuickActionsBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [recentModels, setRecentModels] = useState<string[]>([]);
  const [pinnedModels, setPinnedModels] = useState<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setSelectedModel(getSelectedModel());
    setRecentModels(getRecentModels());
    setPinnedModels(getPinnedModels());

    // Listen for storage changes
    const handleStorage = () => {
      setSelectedModel(getSelectedModel());
      setRecentModels(getRecentModels());
      setPinnedModels(getPinnedModels());
    };

    window.addEventListener('storage', handleStorage);
    
    // Also poll for changes from same tab
    const interval = setInterval(handleStorage, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const displayModel = selectedModel 
    ? selectedModel.split('/').pop() || selectedModel 
    : 'No model selected';

  return (
    <div className={cn(
      'shrink-0 border-t border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm transition-all',
      expanded ? 'h-auto' : 'h-10'
    )}>
      {/* Collapsed View */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full h-10 px-4 flex items-center justify-between',
          'text-xs text-zinc-500 hover:text-zinc-400 transition-colors'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-zinc-300 font-medium">{displayModel}</span>
          </div>
          
          {recentModels.length > 0 && (
            <div className="flex items-center gap-1.5 text-zinc-600">
              <Clock className="h-3 w-3" />
              <span>{recentModels.length} recent</span>
            </div>
          )}
          
          {pinnedModels.length > 0 && (
            <div className="flex items-center gap-1.5 text-zinc-600">
              <Star className="h-3 w-3" />
              <span>{pinnedModels.length} pinned</span>
            </div>
          )}
        </div>
        
        <ChevronUp className={cn(
          'h-4 w-4 transition-transform',
          expanded && 'rotate-180'
        )} />
      </button>

      {/* Expanded View */}
      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          {/* Pinned Models */}
          {pinnedModels.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
                <Star className="h-3 w-3" />
                Pinned
              </div>
              <div className={cn('flex gap-1.5 flex-wrap', isMobile && 'flex-col')}>
                {pinnedModels.map(model => (
                  <ModelChip 
                    key={model} 
                    model={model} 
                    selected={model === selectedModel}
                    pinned
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent Models */}
          {recentModels.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
                <Clock className="h-3 w-3" />
                Recent
              </div>
              <div className={cn('flex gap-1.5 flex-wrap', isMobile && 'flex-col')}>
                {recentModels.filter(m => !pinnedModels.includes(m)).map(model => (
                  <ModelChip 
                    key={model} 
                    model={model} 
                    selected={model === selectedModel}
                  />
                ))}
              </div>
            </div>
          )}

          {pinnedModels.length === 0 && recentModels.length === 0 && (
            <div className="text-xs text-zinc-600 py-2">
              No recent or pinned models yet. Select a model to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModelChip({ 
  model, 
  selected,
  pinned 
}: { 
  model: string; 
  selected?: boolean;
  pinned?: boolean;
}) {
  const displayName = model.split('/').pop() || model;
  const provider = model.split('/')[0] || '';

  const handleClick = () => {
    localStorage.setItem('tavernstudio:selectedModel', model);
    addToRecentModels(model);
    // Trigger storage event for other components
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors',
        selected
          ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
          : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
      )}
    >
      {pinned && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
      <span className="text-zinc-600">{provider}/</span>
      <span className="font-medium">{displayName}</span>
    </button>
  );
}

