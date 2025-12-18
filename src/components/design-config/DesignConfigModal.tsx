/**
 * Design Config Modal - Power user interface design configuration
 * 
 * Features:
 * - Ctrl+K fuzzy search across all settings
 * - Keyboard navigation (arrows in sidebar)
 * - Collapsible groups, compact mode toggle
 * - Toast notifications for all actions
 */

import { useState, useRef, useEffect, memo, startTransition, useCallback } from 'react';
import { ChevronRight, Rows3, LayoutGrid } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { cn } from '../../lib/utils';
import { Dialog, DialogContent } from '../ui/dialog';
import { useActiveMessageStyle } from '../../hooks/queries/useProfiles';
import { interfaceDesignSections } from './designConfigSchema';
import { useDesignConfigModalState } from '../../store/designConfigModalState';
import { useShallow } from 'zustand/react/shallow';

// Extracted components
import { ExpandableSearch } from '../ui/expandable-search';
import { MobileSectionNav } from './MobileSectionNav';
import { SectionContent } from './SectionContent';
import { SearchResults } from './SearchResults';
import { ConfirmDialog } from './ConfirmDialog';

interface DesignConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============ Main Modal ============

export function DesignConfigModal({ open, onOpenChange }: DesignConfigModalProps) {
  const isMobile = useIsMobile();
  const {
    activeSection,
    searchQuery,
    compactMode,
    setActiveSection,
    setSearchQuery,
    toggleCompactMode,
  } = useDesignConfigModalState(
    useShallow((s) => ({
      activeSection: s.activeSection,
      searchQuery: s.searchQuery,
      compactMode: s.compactMode,
      setActiveSection: s.setActiveSection,
      setSearchQuery: s.setSearchQuery,
      toggleCompactMode: s.toggleCompactMode,
    }))
  );
  
  const scrollRef = useRef<HTMLElement>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const activeSectionRef = useRef(activeSection);
  activeSectionRef.current = activeSection;
  
  // Keyboard shortcut for search (Ctrl+K / Cmd+K)
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchExpanded(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);
  
  // Arrow key navigation in sidebar
  useEffect(() => {
    if (!open || searchExpanded) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const sectionIds = interfaceDesignSections.map(s => s.id);
        const currentIndex = sectionIds.indexOf(activeSectionRef.current);
        const nextIndex = e.key === 'ArrowDown' 
          ? Math.min(currentIndex + 1, sectionIds.length - 1)
          : Math.max(currentIndex - 1, 0);
        startTransition(() => setActiveSection(sectionIds[nextIndex]));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, searchExpanded, setActiveSection]);
  
  const { config, isLoading, isPending, updateConfig } = useActiveMessageStyle();
  const configRef = useRef<Record<string, unknown> | null>(null);
  useEffect(() => {
    configRef.current = (config as unknown as Record<string, unknown>) ?? null;
  }, [config]);
  
  // Generic path-based updater - no need to wire up individual setters
  // Adding a new config section just requires updating the schema and types
  const handleChange = useCallback((key: string, value: unknown) => {
    const parts = key.split('.');
    if (parts.length === 2) {
      const [section, prop] = parts;
      updateConfig({
        // Only send the changed property. Merging happens in `useActiveMessageStyle.updateConfig`
        // against the latest cached profile to avoid stale-write clobbering.
        [section]: { [prop]: value }
      });
    }
  }, [updateConfig]);

  if (isLoading || !config) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent fullscreen={isMobile}>
          <div className="flex items-center justify-center h-80 text-zinc-500">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  const currentSection = interfaceDesignSections.find((s) => s.id === activeSection);
  const configRecord = config as unknown as Record<string, unknown>;

  // Mobile layout
  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent fullscreen className="p-0 gap-0 overflow-hidden flex flex-col">
          {/* Mobile Header - Compact */}
          <header className="shrink-0 px-4 py-3 border-b border-zinc-800/50 bg-zinc-950 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">Interface Design</h2>
            <div className="flex items-center gap-2 pr-8">
              {isPending && (
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              )}
              <button
                onClick={toggleCompactMode}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  compactMode 
                    ? "bg-violet-500/20 text-violet-400" 
                    : "text-zinc-500 active:bg-zinc-800/50"
                )}
              >
                {compactMode ? <Rows3 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </button>
            </div>
          </header>

          {/* Mobile Section Navigation - Horizontal scroll */}
          <MobileSectionNav />

          {/* Mobile Content - Full width scroll */}
          <main 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 bg-zinc-950/20"
          >
            {currentSection && (
              <div className="space-y-3">
                <SectionContent
                  sectionId={currentSection.id}
                  compactMode={compactMode}
                  config={configRecord}
                  onChange={handleChange}
                  section={currentSection}
                  isMobile={true}
                />
              </div>
            )}
          </main>
          
          <ConfirmDialog />
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop layout (unchanged)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 overflow-hidden flex flex-col h-[85vh] max-w-5xl">
        {/* Header */}
        <header className="shrink-0 px-5 py-4 border-b border-zinc-800/50 bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-100">Interface Design</h2>
                <p className="text-xs text-zinc-500">Customize message appearance</p>
              </div>
              
              {/* Compact mode toggle */}
              <button
                onClick={toggleCompactMode}
                className={cn(
                  "ml-2 p-1.5 rounded-lg transition-colors",
                  compactMode 
                    ? "bg-violet-500/20 text-violet-400" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                )}
                title={compactMode ? "Comfortable view" : "Compact view"}
              >
                {compactMode ? <Rows3 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </button>
            </div>
            
            <div className="flex items-center gap-2 pr-12">
              {/* Expandable Search */}
              <ExpandableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                expanded={searchExpanded}
                onExpandedChange={setSearchExpanded}
                placeholder="Search settings..."
                shortcut="⌘K"
              />
              
              {/* Saving indicator */}
              {isPending && (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                  Saving
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <nav className="w-48 shrink-0 border-r border-zinc-800/50 bg-zinc-950/50 p-2 overflow-y-auto">
            {interfaceDesignSections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  startTransition(() => setActiveSection(section.id));
                  setSearchExpanded(false);
                  setSearchQuery('');
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                  activeSection === section.id
                    ? 'bg-zinc-800/80 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                )}
              >
                <section.icon className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1 text-left">{section.label}</span>
                {activeSection === section.id && (
                  <ChevronRight className="h-3 w-3 text-zinc-600" />
                )}
              </button>
            ))}
            
            {/* Keyboard hint */}
            <div className="mt-4 px-3 py-2 text-xs text-zinc-600">
              <div>↑↓ Navigate</div>
              <div>⌘K Search</div>
            </div>
          </nav>

          {/* Content */}
          <main 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-5 bg-zinc-950/20"
          >
            {searchExpanded && searchQuery ? (
              <SearchResults
                query={searchQuery}
                config={configRecord}
                onChange={handleChange}
                isMobile={isMobile}
                onNavigate={(sectionId) => {
                  startTransition(() => setActiveSection(sectionId));
                  setSearchExpanded(false);
                  setSearchQuery('');
                }}
              />
            ) : currentSection ? (
              <SectionContent
                sectionId={currentSection.id}
                compactMode={compactMode}
                config={configRecord}
                onChange={handleChange}
                section={currentSection}
                isMobile={false}
              />
            ) : null}
          </main>
        </div>
        
        <ConfirmDialog />
      </DialogContent>
    </Dialog>
  );
}
