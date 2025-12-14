/**
 * CharacterGalleryHeader - Search, filters, sort, view toggle, and create button.
 */

import { useRef } from 'react';
import { Search, Grid3X3, List, SortAsc, SortDesc, Plus, X } from 'lucide-react';
import { useCharacterForgeStore } from '../../store/characterForgeStore';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface CharacterGalleryHeaderProps {
  onCreateNew: () => void;
}

export function CharacterGalleryHeader({ onCreateNew }: CharacterGalleryHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortDirection,
    toggleSortDirection,
    filterTags,
    clearFilters,
  } = useCharacterForgeStore();
  
  const hasFilters = searchQuery.length > 0 || filterTags.length > 0;

  return (
    <div className="shrink-0 border-b border-zinc-800/50 bg-zinc-950/60 p-3">
      {/* Title row */}
      <div className="mb-3 flex items-center justify-between">
        <h1 
          className="text-lg font-bold tracking-tight text-zinc-100"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Tavern Studio
        </h1>
        <Button
          size="sm"
          onClick={onCreateNew}
          className="gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
        >
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>
      
      {/* Search bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search characters..."
          className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900/80 pl-10 pr-9 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      
      {/* Controls row */}
      <div className="flex items-center gap-2">
        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'updated_at' | 'created_at')}
          className="h-8 rounded-md border border-zinc-800 bg-zinc-900/80 px-2 text-xs text-zinc-300 focus:border-violet-500/50 focus:outline-none"
        >
          <option value="updated_at">Last Modified</option>
          <option value="created_at">Created</option>
          <option value="name">Name</option>
        </select>
        
        {/* Sort direction */}
        <button
          onClick={toggleSortDirection}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        >
          {sortDirection === 'asc' ? (
            <SortAsc className="h-4 w-4" />
          ) : (
            <SortDesc className="h-4 w-4" />
          )}
        </button>
        
        <div className="flex-1" />
        
        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Clear
          </button>
        )}
        
        {/* View mode toggle */}
        <div className="flex rounded-md border border-zinc-800 bg-zinc-900/80">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-l-md transition-colors',
              viewMode === 'grid'
                ? 'bg-violet-600/30 text-violet-300'
                : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
            )}
            title="Grid view"
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-r-md border-l border-zinc-800 transition-colors',
              viewMode === 'list'
                ? 'bg-violet-600/30 text-violet-300'
                : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
            )}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Fullscreen gallery toggle */}
      </div>
    </div>
  );
}
