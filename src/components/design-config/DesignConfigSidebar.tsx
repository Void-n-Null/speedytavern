/**
 * DesignConfigSidebar - Navigation sidebar for design sections
 */

import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { interfaceDesignSections } from './designConfigSchema';

interface DesignConfigSidebarProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
}

export function DesignConfigSidebar({ 
  activeSection, 
  onSectionChange,
}: DesignConfigSidebarProps) {
  return (
    <nav className="w-48 shrink-0 border-r border-zinc-800/50 bg-zinc-950/50 p-2 overflow-y-auto">
      {interfaceDesignSections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSectionChange(section.id)}
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
  );
}
