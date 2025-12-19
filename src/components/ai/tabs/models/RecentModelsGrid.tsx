import { useState, useEffect, useMemo } from 'react';
import { type OpenRouterModel } from '../../../../api/ai';
import { ProviderLogo } from '../../ProviderLogo';

interface RecentModelsGridProps {
  onSelect: (slug: string) => void;
  currentSlug: string | null;
  allModels: OpenRouterModel[];
}

export function RecentModelsGrid({ 
  onSelect, 
  currentSlug,
  allModels 
}: RecentModelsGridProps) {
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('tavernstudio:recentModels');
      const recent = raw ? JSON.parse(raw) : [];
      const validRecent = (Array.isArray(recent) ? recent : [])
        .filter((s): s is string => typeof s === 'string' && s !== currentSlug)
        .slice(0, 6);
      setRecentSlugs(validRecent);
    } catch {
      setRecentSlugs([]);
    }
  }, [currentSlug]);

  const recentModels = useMemo(() => {
    return recentSlugs.map(slug => {
      const found = allModels.find(m => m.slug === slug);
      return found || { slug, name: slug.split('/').pop() || slug, author: slug.split('/')[0] || 'unknown' };
    });
  }, [recentSlugs, allModels]);

  if (recentModels.length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">Recently Used</h4>
      <div className="flex flex-wrap gap-2">
        {recentModels.map((model) => {
          const [provider] = model.slug.split('/');
          return (
            <button
              key={model.slug}
              onClick={() => onSelect(model.slug)}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900/40 hover:bg-zinc-800/60 px-3 py-2 text-left transition-colors group"
            >
              <ProviderLogo provider={provider} size="sm" />
              <div className="min-w-0">
                <div className="text-xs text-zinc-300 font-medium truncate group-hover:text-zinc-100">
                  {('short_name' in model && model.short_name) || model.name}
                </div>
                <div className="text-[10px] text-zinc-600 truncate">
                  {provider}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

