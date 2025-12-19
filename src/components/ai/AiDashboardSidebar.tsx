/**
 * AI Dashboard Sidebar
 * 
 * Sidebar navigation for the AI Dashboard, including provider selection.
 */

import { Plug, Cpu, DollarSign, ScrollText, ChevronRight, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { AiProviderStatus } from '../../api/client';

export type AiTabId = 'providers' | 'models' | 'costs' | 'logs';

interface AiDashboardSidebarProps {
  activeTab: AiTabId;
  onTabChange: (tab: AiTabId) => void;
  providers: AiProviderStatus[];
  activeProviderId: string | null;
  onActiveProviderChange: (id: string) => void;
  isMobile: boolean;
}

export function AiDashboardSidebar({
  activeTab,
  onTabChange,
  providers,
  activeProviderId,
  onActiveProviderChange,
  isMobile,
}: AiDashboardSidebarProps) {
  const connectedProviders = providers.filter(p => p.connection?.status === 'connected');
  const activeProvider = providers.find(p => p.id === activeProviderId);

  return (
    <div className={cn(
      'flex flex-col h-full border-r border-zinc-800/50 bg-zinc-950/50',
      isMobile ? 'w-full' : 'w-64'
    )}>
      {/* Sidebar Header */}
      <div className="p-4 border-b border-zinc-800/50">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
          AI Dashboard
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Section: Current Provider */}
        <div className="p-3">
          <h3 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            Active Provider
          </h3>
          <div className="space-y-1">
            {connectedProviders.length === 0 ? (
              <div className="px-3 py-2 text-xs text-zinc-500 italic">
                No providers connected
              </div>
            ) : (
              connectedProviders.map(p => (
                <button
                  key={p.id}
                  onClick={() => onActiveProviderChange(p.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all',
                    activeProviderId === p.id
                      ? 'bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/30'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Zap className={cn('h-4 w-4', activeProviderId === p.id ? 'text-violet-400' : 'text-zinc-600')} />
                    <span className="font-medium">{p.label}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Section: Navigation */}
        <div className="p-3">
          <h3 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            Management
          </h3>
          <nav className="space-y-1">
            <SidebarNavItem
              icon={<Plug className="h-4 w-4" />}
              label="Connections"
              active={activeTab === 'providers'}
              onClick={() => onTabChange('providers')}
            />
            <SidebarNavItem
              icon={<Cpu className="h-4 w-4" />}
              label="Models"
              active={activeTab === 'models'}
              onClick={() => onTabChange('models')}
            />
          </nav>
        </div>

        <div className="p-3">
          <h3 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            Analytics
          </h3>
          <nav className="space-y-1">
            <SidebarNavItem
              icon={<DollarSign className="h-4 w-4" />}
              label="Costs"
              active={activeTab === 'costs'}
              onClick={() => onTabChange('costs')}
            />
            <SidebarNavItem
              icon={<ScrollText className="h-4 w-4" />}
              label="Logs"
              active={activeTab === 'logs'}
              onClick={() => onTabChange('logs')}
            />
          </nav>
        </div>
      </div>

      {/* Sidebar Footer - Current Provider Status */}
      {activeProvider && (
        <button
          onClick={() => onTabChange('providers')}
          className="p-4 border-t border-zinc-800/50 bg-zinc-950/80 hover:bg-zinc-900 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase text-zinc-500 font-bold tracking-tight">
                Currently Using
              </div>
              <div className="text-xs text-zinc-300 font-medium truncate">
                {activeProvider.label}
              </div>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}

function SidebarNavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
        active
          ? 'bg-zinc-800 text-zinc-100 shadow-sm'
          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
      )}
    >
      <div className={cn(
        'flex h-6 w-6 items-center justify-center rounded-md',
        active ? 'bg-violet-500/20 text-violet-400' : 'text-zinc-500'
      )}>
        {icon}
      </div>
      <span className="font-medium flex-1 text-left">{label}</span>
      {active && <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />}
    </button>
  );
}
