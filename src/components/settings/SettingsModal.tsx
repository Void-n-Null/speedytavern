/**
 * Settings Modal - Central hub for application settings and design customization
 * 
 * Features:
 * - Tabbed/Sidebar navigation for different settings categories
 * - Profiles management (Switch, Create, Duplicate, Rename)
 * - General application settings
 * - Interface design customization (Typography, Layout, Colors, etc.)
 */

import { useState, useRef, useEffect, startTransition, useCallback, useMemo } from 'react';
import { ChevronRight, Rows3, LayoutGrid, User, Settings2, Palette } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { cn } from '../../lib/utils';
import { Dialog, DialogContent } from '../ui/dialog';
import { useActiveMessageStyle } from '../../hooks/queries/useProfiles';
import { interfaceDesignSections } from './interfaceDesignSchema';
import { useSettingsModalState } from '../../store/settingsModalState';
import { useShallow } from 'zustand/react/shallow';

// Extracted components
import { ExpandableSearch } from '../ui/expandable-search';
import { MobileSectionNav } from './MobileSectionNav';
import { SectionContent } from './SectionContent';
import { SearchResults } from './SearchResults';
import { ConfirmDialog } from './ConfirmDialog';
import { ProfileSection } from './ProfileSection';
import { GeneralSettings } from './GeneralSettings';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const isMobile = useIsMobile();
  const {
    activeSection,
    searchQuery,
    compactMode,
    setActiveSection,
    setSearchQuery,
    toggleCompactMode,
  } = useSettingsModalState(
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
  
  // Define categories for the sidebar
  const categories = useMemo(() => [
    {
      id: 'app',
      label: 'App Settings',
      sections: [
        { id: 'profiles', label: 'Profiles', icon: User, description: 'Manage and switch style profiles' },
        { id: 'general', label: 'General', icon: Settings2, description: 'Application-wide settings' },
      ]
    },
    {
      id: 'design',
      label: 'Interface Design',
      sections: interfaceDesignSections.map(s => ({
        id: s.id,
        label: s.label,
        icon: s.icon,
        description: s.description
      }))
    }
  ], []);

  const allSections = useMemo(() => categories.flatMap(c => c.sections), [categories]);

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
        const sectionIds = allSections.map(s => s.id);
        const currentIndex = sectionIds.indexOf(activeSectionRef.current);
        const nextIndex = e.key === 'ArrowDown' 
          ? Math.min(currentIndex + 1, sectionIds.length - 1)
          : Math.max(currentIndex - 1, 0);
        startTransition(() => setActiveSection(sectionIds[nextIndex]));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, searchExpanded, setActiveSection, allSections]);
  
  const { config, isLoading, isPending, updateConfig } = useActiveMessageStyle();
  
  const handleChange = useCallback((key: string, value: unknown) => {
    const parts = key.split('.');
    if (parts.length === 2) {
      const [section, prop] = parts;
      updateConfig({ [section]: { [prop]: value } });
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

  const currentSection = allSections.find((s) => s.id === activeSection);
  const configRecord = config as unknown as Record<string, unknown>;

  const renderContent = () => {
    if (searchExpanded && searchQuery) {
      return (
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
      );
    }

    if (activeSection === 'profiles') {
      return <ProfileSection />;
    }

    if (activeSection === 'general') {
      return <GeneralSettings />;
    }

    const designSection = interfaceDesignSections.find(s => s.id === activeSection);
    if (designSection) {
      return (
        <SectionContent
          sectionId={designSection.id}
          compactMode={compactMode}
          config={configRecord}
          onChange={handleChange}
          section={designSection}
          isMobile={isMobile}
        />
      );
    }

    return null;
  };

  // Mobile layout
  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent fullscreen className="p-0 gap-0 overflow-hidden flex flex-col">
          <header className="shrink-0 px-4 py-3 border-b border-zinc-800/50 bg-zinc-950 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">Settings</h2>
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

          <MobileSectionNav allSections={allSections} />

          <main 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 bg-zinc-950/20"
          >
            {renderContent()}
          </main>
          
          <ConfirmDialog />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 overflow-hidden flex flex-col h-[85vh] max-w-5xl">
        <header className="shrink-0 px-5 py-4 border-b border-zinc-800/50 bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-100">Settings</h2>
                <p className="text-xs text-zinc-500">Configure application and interface</p>
              </div>
              
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
              <ExpandableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                expanded={searchExpanded}
                onExpandedChange={setSearchExpanded}
                placeholder="Search settings..."
                shortcut="⌘K"
              />
              
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
          <nav className="w-52 shrink-0 border-r border-zinc-800/50 bg-zinc-950/50 p-2 overflow-y-auto">
            {categories.map((category) => (
              <div key={category.id} className="mb-4 last:mb-0">
                <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                  {category.label}
                </div>
                <div className="space-y-0.5">
                  {category.sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        startTransition(() => setActiveSection(section.id));
                        setSearchExpanded(false);
                        setSearchQuery('');
                      }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                        activeSection === section.id
                          ? 'bg-zinc-800/80 text-zinc-100 font-medium'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                      )}
                    >
                      <section.icon className={cn(
                        "h-4 w-4 shrink-0",
                        activeSection === section.id ? "text-violet-400" : "text-zinc-500"
                      )} />
                      <span className="truncate flex-1 text-left">{section.label}</span>
                      {activeSection === section.id && (
                        <ChevronRight className="h-3 w-3 text-zinc-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="mt-4 px-3 py-2 text-xs text-zinc-600">
              <div>↑↓ Navigate</div>
              <div>⌘K Search</div>
            </div>
          </nav>

          <main 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-5 bg-zinc-950/20"
          >
            {renderContent()}
          </main>
        </div>
        
        <ConfirmDialog />
      </DialogContent>
    </Dialog>
  );
}
