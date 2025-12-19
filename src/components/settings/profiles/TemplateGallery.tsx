import { useState, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Layout,
  History,
  Check,
  X
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../GroupRenderer';
import type { DesignTemplate } from '../../../api/misc';

interface TemplateGalleryProps {
  templates: DesignTemplate[] | undefined;
  handleLoadTemplate: (id: string) => void;
  handleDeleteTemplate: (id: string, name: string) => void;
  handleSaveAsTemplate: (name: string) => void;
}

export function TemplateGallery({
  templates,
  handleLoadTemplate,
  handleDeleteTemplate,
  handleSaveAsTemplate,
}: TemplateGalleryProps) {
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [templateTempName, setTemplateTempName] = useState('');
  const templateInputRef = useRef<HTMLInputElement>(null);

  const onCommitCreateTemplate = () => {
    if (!templateTempName.trim()) {
      setIsCreatingTemplate(false);
      return;
    }
    handleSaveAsTemplate(templateTempName.trim());
    setIsCreatingTemplate(false);
    setTemplateTempName('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-1 items-center gap-2">
          <Layout className="h-4 w-4 text-zinc-500" />
          {isCreatingTemplate ? (
            <div className="flex flex-1 items-center gap-2">
              <input
                ref={templateInputRef}
                type="text"
                value={templateTempName}
                onChange={(e) => setTemplateTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onCommitCreateTemplate();
                  if (e.key === 'Escape') {
                    setIsCreatingTemplate(false);
                    setTemplateTempName('');
                  }
                }}
                placeholder="Template name..."
                autoFocus
                className="flex-1 bg-zinc-800/50 border border-zinc-700 rounded px-2 py-0.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <Button size="sm" onClick={onCommitCreateTemplate} className="h-7 px-2 shrink-0">
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setIsCreatingTemplate(false);
                  setTemplateTempName('');
                }} 
                className="h-7 w-7 p-0 shrink-0"
              >
                <X className="h-3.5 w-3.5 shrink-0 min-w-3.5 min-h-3.5" />
              </Button>
            </div>
          ) : (
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Design Templates</h3>
          )}
        </div>
        
        {!isCreatingTemplate && (
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => {
              setIsCreatingTemplate(true);
              setTemplateTempName('');
              setTimeout(() => templateInputRef.current?.focus(), 0);
            }}
            className="h-8 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-400/5 gap-1.5 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" /> Save Current
          </Button>
        )}
      </div>

      {templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map((t) => (
            <Card key={t.id} className="group p-3 hover:border-zinc-600 transition-colors bg-zinc-900/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="text-sm font-medium text-zinc-200 truncate">{t.name}</div>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                    <History className="h-3 w-3" />
                    {new Date(t.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => handleLoadTemplate(t.id)}
                    className="h-7 px-2 text-[10px] bg-zinc-800 hover:bg-zinc-700 border-zinc-700"
                  >
                    Apply
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleDeleteTemplate(t.id, t.name)}
                    className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 text-center">
          <div className="h-10 w-10 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
            <Layout className="h-5 w-5 text-zinc-600" />
          </div>
          <div className="text-sm font-medium text-zinc-400">No templates yet</div>
          <div className="text-xs text-zinc-500 mt-1 max-w-[200px]">Save your current design to reuse it across different profiles.</div>
        </div>
      )}
    </div>
  );
}

