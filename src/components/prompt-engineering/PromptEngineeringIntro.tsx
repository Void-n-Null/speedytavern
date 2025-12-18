import { HelpCircle, Layers, Zap, MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { PromptEngineeringPreset } from '../../types/promptEngineering';
import { createDefaultLayout } from '../../lib/promptLayout';

export function PromptEngineeringIntro({ 
  preset, 
  onApplyTemplate 
}: { 
  preset?: PromptEngineeringPreset;
  onApplyTemplate?: (template: Partial<PromptEngineeringPreset>) => void;
}) {
  const isBrandNew = preset && !preset.sysprompt && !preset.instruct && !preset.promptLayout;

  const applyRPStore = () => {
    if (!onApplyTemplate) return;
    onApplyTemplate({
      sysprompt: {
        content: "Write {{char}}'s next reply in a fictional roleplay between {{char}} and {{user}}.\nStay in character at all times. Use sensory details and focus on character internal thoughts.",
        post_history: "[Continue the roleplay. Focus on {{char}}'s perspective.]",
        prefill: "{{char}}:",
      },
      promptLayout: createDefaultLayout(preset?.name ?? 'New Preset'),
    });
  };

  const applyStoryStore = () => {
    if (!onApplyTemplate) return;
    onApplyTemplate({
      sysprompt: {
        content: "You are a collaborative story writing assistant. Help the user expand on their ideas, maintain consistent world-building, and suggest creative plot twists.",
        post_history: "[Write the next scene in the story. Maintain the established tone.]",
      },
      promptLayout: createDefaultLayout(preset?.name ?? 'New Preset'),
    });
  };

  const isChat = preset?.mode === 'chat';

  return (
    <div className="rounded-2xl border border-zinc-800/40 bg-zinc-900/10 p-5 overflow-hidden relative group backdrop-blur-sm">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <HelpCircle className="h-16 w-16 text-zinc-400" />
      </div>

      <div className="relative space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-black text-zinc-200 uppercase tracking-widest flex items-center gap-2 mb-1.5">
              <Layers className="h-4 w-4 text-zinc-400" />
              THE {isChat ? 'CHAT' : 'TEXT'} PIPELINE
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-2xl font-medium">
              {isChat 
                ? "TavernStudio transforms your data into a structured stream. Messages are sent as atomic blocks that modern AI models understand natively."
                : "TavernStudio assembles one continuous block of text. We use delimiters and tags to guide the model through the context."
              }
            </p>
          </div>

          {isBrandNew && (
            <div className="flex flex-wrap gap-2 shrink-0 animate-in zoom-in-95 duration-500 delay-200">
              <button
                type="button"
                onClick={applyRPStore}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800/60 border border-zinc-700/40 text-zinc-200 text-[11px] font-black hover:bg-zinc-700 transition-all active:scale-95 uppercase tracking-wider"
              >
                <Sparkles className="h-3.5 w-3.5" />
                RP TEMPLATE
              </button>
              <button
                type="button"
                onClick={applyStoryStore}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800/40 border border-zinc-700/40 text-zinc-300 text-[11px] font-black hover:bg-zinc-700 transition-all active:scale-95 uppercase tracking-wider"
              >
                <Sparkles className="h-3.5 w-3.5" />
                STORY TEMPLATE
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PipelineStep 
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            title={isChat ? "STRUCTURE" : "STORY STRING"}
            subtitle={isChat ? "Layout Engine" : "Manual Template"}
            description={isChat ? "Define the sequence of data blocks in the context window." : "A flexible template that manually positions character data."}
            color="blue"
          />
          <PipelineStep 
            icon={<Zap className="h-3.5 w-3.5" />}
            title="BEHAVIOR"
            subtitle="System Prompt"
            description="High-level directives for the AI's persona, tone, and constraints."
            color="zinc"
          />
          <PipelineStep 
            icon={<Layers className="h-3.5 w-3.5" />}
            title={isChat ? "LOGIC" : "INSTRUCT"}
            subtitle={isChat ? "Reasoning" : "Wrapping"}
            description={isChat ? "Guide the AI's internal chain-of-thought process." : "Inject API tags like [INST] to delineate user and assistant."}
            color="zinc"
          />
        </div>
      </div>
    </div>
  );
}

function PipelineStep({ 
  icon, 
  title, 
  subtitle, 
  description, 
  color 
}: { 
  icon: React.ReactNode; 
  title: string; 
  subtitle: string; 
  description: string;
  color: 'blue' | 'zinc';
}) {
  const colorMap = {
    blue: 'border-zinc-700/40 bg-zinc-800/30 text-zinc-300',
    zinc: 'border-zinc-800/60 bg-zinc-900/40 text-zinc-400',
  };

  return (
    <div className={cn('p-4 rounded-xl border flex flex-col gap-1.5 transition-all hover:bg-zinc-900/60', colorMap[color])}>
      <div className="flex items-center gap-2 font-black uppercase tracking-widest text-[11px]">
        <div className="p-1 rounded bg-zinc-950/40 border border-white/5">
          {icon}
        </div>
        {title}
      </div>
      <div className="text-[10px] font-bold text-zinc-300 mt-1">{subtitle}</div>
      <div className="text-[10px] text-zinc-500 leading-relaxed font-medium">{description}</div>
    </div>
  );
}

