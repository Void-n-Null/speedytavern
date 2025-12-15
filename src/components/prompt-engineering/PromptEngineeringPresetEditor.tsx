import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '../../lib/utils';
import type { PromptEngineeringPreset } from '../../types/promptEngineering';
import { PromptEngineeringSystemTab } from './PromptEngineeringSystemTab';
import { PromptEngineeringInstructTab } from './PromptEngineeringInstructTab';
import { PromptEngineeringContextTab } from './PromptEngineeringContextTab';
import { PromptEngineeringReasoningTab } from './PromptEngineeringReasoningTab';

export function PromptEngineeringPresetEditor({
  preset,
  onChange,
  isMobile,
}: {
  preset: PromptEngineeringPreset;
  onChange: (next: PromptEngineeringPreset) => void;
  isMobile: boolean;
}) {
  const tabDefault = useMemo(() => {
    if (preset.sysprompt) return 'sysprompt';
    if (preset.instruct) return 'instruct';
    if (preset.context) return 'context';
    if (preset.reasoning) return 'reasoning';
    return 'sysprompt';
  }, [preset.context, preset.instruct, preset.reasoning, preset.sysprompt]);

  return (
    <div className="space-y-3">
      <Tabs defaultValue={tabDefault}>
        <TabsList className={cn('w-full grid gap-1', isMobile ? 'grid-cols-2' : 'grid-cols-4')}>
          <TabsTrigger className="w-full justify-center" value="sysprompt">
            System
          </TabsTrigger>
          <TabsTrigger className="w-full justify-center" value="instruct">
            Instruct
          </TabsTrigger>
          <TabsTrigger className="w-full justify-center" value="context">
            Context
          </TabsTrigger>
          <TabsTrigger className="w-full justify-center" value="reasoning">
            Reasoning
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sysprompt">
          <PromptEngineeringSystemTab preset={preset} onChange={onChange} isMobile={isMobile} />
        </TabsContent>

        <TabsContent value="instruct">
          <PromptEngineeringInstructTab preset={preset} onChange={onChange} />
        </TabsContent>

        <TabsContent value="context">
          <PromptEngineeringContextTab preset={preset} onChange={onChange} isMobile={isMobile} />
        </TabsContent>

        <TabsContent value="reasoning">
          <PromptEngineeringReasoningTab preset={preset} onChange={onChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
