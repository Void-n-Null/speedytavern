import { useMemo } from 'react';
import { interfaceDesignSections, type ControlDefinition } from './designConfigSchema';
import { ControlRenderer } from './controls';

interface SearchResult {
  sectionId: string;
  sectionLabel: string;
  control: ControlDefinition;
}

export function SearchResults({ 
  query, 
  config, 
  onChange,
  onNavigate,
  isMobile,
}: { 
  query: string; 
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onNavigate: (sectionId: string) => void;
  isMobile: boolean;
}) {
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const matches: SearchResult[] = [];
    
    for (const section of interfaceDesignSections) {
      if (section.id === 'profile') continue;
      for (const group of section.groups) {
        for (const control of group.controls) {
          const searchText = `${control.label} ${control.description || ''} ${control.key}`.toLowerCase();
          if (searchText.includes(q)) {
            matches.push({
              sectionId: section.id,
              sectionLabel: section.label,
              control,
            });
          }
        }
      }
    }
    return matches.slice(0, 10);
  }, [query]);

  if (!query.trim()) return null;
  
  if (results.length === 0) {
    return (
      <div className="p-4 text-sm text-zinc-500 text-center">
        No settings found for "{query}"
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-800/50">
      {results.map((result) => (
        <div key={result.control.key} className="p-3">
          <button
            onClick={() => onNavigate(result.sectionId)}
            className="text-xs text-violet-400 hover:text-violet-300 mb-1"
          >
            {result.sectionLabel} →
          </button>
          <ControlRenderer
            control={result.control}
            config={config}
            onChange={onChange}
            compact
            isMobile={isMobile}
          />
        </div>
      ))}
    </div>
  );
}

