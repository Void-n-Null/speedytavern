import { useState, useCallback } from 'react';
import { GripVertical, Eye, EyeOff, ChevronDown, ChevronRight, Info, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { PromptLayout, PromptBlock, PromptBlockId } from '../../lib/promptLayout';
import { reorderBlocks, toggleBlock } from '../../lib/promptLayout';

/** Expandable education section */
function EducationPanel({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/20">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
      >
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Info className="h-3 w-3" />
        <span>{title}</span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 text-xs text-zinc-500 leading-relaxed space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

/** Color coding for different block types */
function getBlockColor(id: PromptBlockId): string {
  switch (id) {
    case 'system_prompt':
    case 'post_history':
    case 'prefill':
      return 'border-l-violet-500';
    case 'char_description':
    case 'char_personality':
    case 'scenario':
      return 'border-l-emerald-500';
    case 'persona':
      return 'border-l-blue-500';
    case 'world_info_before':
    case 'world_info_after':
      return 'border-l-amber-500';
    case 'example_dialogue':
    case 'chat_history':
      return 'border-l-zinc-500';
    default:
      return 'border-l-zinc-700';
  }
}

/** Category label for blocks */
function getBlockCategory(id: PromptBlockId): string {
  switch (id) {
    case 'system_prompt':
    case 'post_history':
    case 'prefill':
      return 'Preset';
    case 'char_description':
    case 'char_personality':
    case 'scenario':
    case 'example_dialogue':
      return 'Character';
    case 'persona':
      return 'User';
    case 'world_info_before':
    case 'world_info_after':
      return 'Lorebook';
    case 'chat_history':
      return 'Messages';
    default:
      return '';
  }
}

interface PromptBlockRowProps {
  block: PromptBlock;
  index: number;
  totalBlocks: number;
  onToggle: (enabled: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
}

function PromptBlockRow({
  block,
  index,
  totalBlocks,
  onToggle,
  onMoveUp,
  onMoveDown,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
}: PromptBlockRowProps) {
  const category = getBlockCategory(block.id);
  
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border-l-2 transition-all',
        'bg-zinc-900/50 border border-zinc-800/50',
        getBlockColor(block.id),
        isDragging && 'opacity-50 scale-95',
        !block.enabled && 'opacity-40'
      )}
    >
      {/* Drag handle */}
      <div className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400">
        <GripVertical className="h-4 w-4" />
      </div>
      
      {/* Block info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-medium',
            block.enabled ? 'text-zinc-200' : 'text-zinc-500'
          )}>
            {block.label}
          </span>
          {category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
              {category}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-600 truncate">{block.description}</p>
      </div>
      
      {/* Move buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move up"
        >
          <ArrowUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === totalBlocks - 1}
          className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move down"
        >
          <ArrowDown className="h-3 w-3" />
        </button>
      </div>
      
      {/* Enable/disable toggle */}
      <button
        type="button"
        onClick={() => onToggle(!block.enabled)}
        className={cn(
          'p-1.5 rounded transition-colors',
          block.enabled
            ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
            : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
        )}
        title={block.enabled ? 'Click to disable' : 'Click to enable'}
      >
        {block.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
    </div>
  );
}

interface PromptLayoutEditorProps {
  layout: PromptLayout;
  onChange: (layout: PromptLayout) => void;
}

export function PromptLayoutEditor({ layout, onChange }: PromptLayoutEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);
  
  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);
  
  const handleDragOver = useCallback((targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    onChange(reorderBlocks(layout, dragIndex, targetIndex));
    setDragIndex(targetIndex);
  }, [dragIndex, layout, onChange]);
  
  const handleToggle = useCallback((blockId: PromptBlockId, enabled: boolean) => {
    onChange(toggleBlock(layout, blockId, enabled));
  }, [layout, onChange]);
  
  const handleMoveUp = useCallback((index: number) => {
    if (index > 0) {
      onChange(reorderBlocks(layout, index, index - 1));
    }
  }, [layout, onChange]);
  
  const handleMoveDown = useCallback((index: number) => {
    if (index < layout.blocks.length - 1) {
      onChange(reorderBlocks(layout, index, index + 1));
    }
  }, [layout, onChange]);

  return (
    <div className="space-y-4">
      <EducationPanel title="How does Prompt Layout work?">
        <p>
          <strong>Prompt Layout</strong> controls the order of information sent to the AI.
          Drag blocks to reorder them, or use the arrow buttons.
        </p>
        <p>
          <strong>Order matters!</strong> Information at the top is seen first by the AI.
          Information at the bottom (closer to the response) often has higher priority.
        </p>
        <p>
          Toggle the <Eye className="inline h-3 w-3" /> icon to enable/disable blocks.
          <strong> Empty blocks are automatically skipped</strong> — no need to configure conditionals.
        </p>
        <div className="mt-2 space-y-1">
          <p className="text-zinc-400 font-medium">Color coding:</p>
          <ul className="space-y-0.5 ml-2">
            <li><span className="inline-block w-2 h-2 rounded-full bg-violet-500 mr-2" />Preset prompts (System, Post-History, Prefill)</li>
            <li><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" />Character info (Description, Personality, Scenario)</li>
            <li><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2" />User info (Persona)</li>
            <li><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2" />Lorebook/World Info</li>
          </ul>
        </div>
      </EducationPanel>
      
      <div className="space-y-1.5">
        {layout.blocks.map((block, index) => (
          <PromptBlockRow
            key={block.id}
            block={block}
            index={index}
            totalBlocks={layout.blocks.length}
            onToggle={(enabled) => handleToggle(block.id, enabled)}
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
            isDragging={dragIndex === index}
            onDragStart={() => handleDragStart(index)}
            onDragEnd={handleDragEnd}
            onDragOver={() => handleDragOver(index)}
          />
        ))}
      </div>
      
      <p className="text-xs text-zinc-600 text-center">
        Drag blocks or use arrows to reorder • Empty blocks are auto-skipped
      </p>
    </div>
  );
}
