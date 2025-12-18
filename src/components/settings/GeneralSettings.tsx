/**
 * General Settings - Application-wide configuration
 */

import { Settings2, Bug, Globe } from 'lucide-react';
import { Card } from './GroupRenderer';
import { Switch } from '../ui/switch';
import { useAllSettings, useUpdateSetting } from '../../hooks/queries/useSettings';
import { toast } from '../ui/toast';

export function GeneralSettings() {
  const { data: settings, isLoading } = useAllSettings();
  const updateSetting = useUpdateSetting();

  const handleToggle = (key: string, value: boolean) => {
    updateSetting.mutate(
      { key, value },
      { onSuccess: () => toast.success('Setting updated') }
    );
  };

  if (isLoading) {
    return <div className="text-zinc-500 text-sm">Loading settings...</div>;
  }

  // Use values from server or defaults
  const debugStreaming = settings?.['debug.streaming'] === true;
  const debugAi = settings?.['debug.ai'] === true;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-zinc-100">General Settings</h3>
        <p className="text-xs text-zinc-500 mt-0.5">Application-wide behavior and developer tools</p>
      </div>

      {/* Developer Tools */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Bug className="h-4 w-4 text-zinc-400" />
          <div className="text-sm font-medium text-zinc-300">Developer Tools</div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm text-zinc-200">Streaming Debug Panel</div>
              <div className="text-xs text-zinc-500">Show raw token stream and timing info</div>
            </div>
            <Switch 
              checked={debugStreaming} 
              onCheckedChange={(val) => handleToggle('debug.streaming', val)} 
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm text-zinc-200">AI Connection Debug</div>
              <div className="text-xs text-zinc-500">Show provider status and error logs</div>
            </div>
            <Switch 
              checked={debugAi} 
              onCheckedChange={(val) => handleToggle('debug.ai', val)} 
            />
          </div>
        </div>
      </Card>

      {/* Locale & Region */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Globe className="h-4 w-4 text-zinc-400" />
          <div className="text-sm font-medium text-zinc-300">Region</div>
        </div>
        
        <div className="text-xs text-zinc-500 italic">
          Additional region and language settings will be available in a future update.
        </div>
      </Card>

      <div className="flex flex-col items-center justify-center py-12 opacity-30">
        <Settings2 className="h-12 w-12 mb-4 text-zinc-600" />
        <p className="text-xs text-zinc-500">More settings coming soon</p>
      </div>
    </div>
  );
}

