/**
 * Design Config Modal - Power user interface design configuration
 * 
 * Features:
 * - Ctrl+K fuzzy search across all settings
 * - Keyboard navigation (arrows in sidebar)
 * - Collapsible groups, compact mode toggle
 * - Hex input for colors + presets + copy
 * - Click slider value to type exact number
 * - Tooltips on disabled actions
 * - Confirmation dialogs for destructive actions
 * - Toast notifications for all actions
 * - Inline profile rename + duplicate
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Paintbrush, Plus, Trash2, RotateCcw, ChevronRight, ChevronDown,
  Upload, Save, FileDown, Search, Copy, Rows3, LayoutGrid, X, Check, Pencil,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  useActiveMessageStyle,
  useProfileList,
  useCreateProfile,
  useDeleteProfile,
  useActivateProfile,
  useUpdateProfile,
} from '../../hooks/queries/useProfiles';
import {
  useTemplateList,
  useCreateTemplate,
  useDeleteTemplate,
  exportConfigAsFile,
  parseTemplateFile,
} from '../../hooks/queries/useDesignTemplates';
import { defaultMessageStyleConfig } from '../../types/messageStyle';
import {
  interfaceDesignSections,
  getValueByPath,
  type ControlGroup,
  type ControlDefinition,
} from './designConfigSchema';
import { useDesignConfigModalState } from '../../store/designConfigModalState';
import { toast } from '../ui/toast';

interface DesignConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============ Reusable Components ============

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-4', className)}>
      {children}
    </div>
  );
}

function ControlRow({ 
  label, 
  description,
  children,
  inline = true,
}: { 
  label: string; 
  description?: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  if (!inline) {
    return (
      <div className="space-y-2 py-2.5 first:pt-0 last:pb-0">
        <div>
          <div className="text-sm font-medium text-zinc-200">{label}</div>
          {description && <div className="text-xs text-zinc-500">{description}</div>}
        </div>
        {children}
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="text-sm text-zinc-300">{label}</div>
        {description && <div className="text-xs text-zinc-500 mt-0.5">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// Color presets for quick access
const COLOR_PRESETS = [
  '#ffffff', '#e0e0e0', '#888888', '#444444', '#1a1a1a', '#000000',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

function ColorPicker({ 
  value, 
  onChange,
}: { 
  value: string; 
  onChange: (v: string) => void;
}) {
  const [showHex, setShowHex] = useState(false);
  const [hexInput, setHexInput] = useState(value || '#ffffff');
  const [displayColor, setDisplayColor] = useState(value || '#ffffff');
  const swatchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentColorRef = useRef(value || '#ffffff');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sync display when value changes externally
  useEffect(() => {
    setDisplayColor(value || '#ffffff');
    setHexInput(value || '#ffffff');
    currentColorRef.current = value || '#ffffff';
  }, [value]);

  // Native event listeners to bypass React's broken onChange for color inputs
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    // Native 'input' event = live preview (fires continuously)
    const handleInput = (e: Event) => {
      const color = (e.target as HTMLInputElement).value;
      currentColorRef.current = color;
      if (swatchRef.current) {
        swatchRef.current.style.backgroundColor = color;
      }
    };

    // Native 'change' event = commit (fires ONLY on picker close)
    const handleChange = (e: Event) => {
      const finalColor = (e.target as HTMLInputElement).value;
      setDisplayColor(finalColor);
      setHexInput(finalColor);
      currentColorRef.current = finalColor;
      onChangeRef.current(finalColor);
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('change', handleChange);
    
    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('change', handleChange);
    };
  }, []);

  const handleHexSubmit = () => {
    const hex = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setDisplayColor(hex);
      currentColorRef.current = hex;
      onChange(hex);
      setShowHex(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentColorRef.current);
    toast.success('Color copied');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Color swatch + native picker - NO React event handlers, using native events */}
      <label className="relative cursor-pointer group">
        <input
          ref={inputRef}
          type="color"
          defaultValue={displayColor}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div 
          ref={swatchRef}
          className="w-8 h-8 rounded-lg border border-zinc-700 shadow-inner group-hover:ring-2 ring-violet-500/40 transition-all"
          style={{ backgroundColor: displayColor }}
        />
      </label>
      
      {/* Hex input toggle */}
      {showHex ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleHexSubmit();
              if (e.key === 'Escape') setShowHex(false);
            }}
            onBlur={handleHexSubmit}
            className="w-20 h-7 px-2 text-xs font-mono rounded bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
            autoFocus
          />
        </div>
      ) : (
        <button
          onClick={() => setShowHex(true)}
          className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {displayColor}
        </button>
      )}
      
      {/* Copy button */}
      <button
        onClick={copyToClipboard}
        className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
        title="Copy hex"
      >
        <Copy className="h-3 w-3" />
      </button>
      
      {/* Color presets popover */}
      <div className="relative group/presets">
        <button className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors">
          <LayoutGrid className="h-3 w-3" />
        </button>
        <div className="absolute right-0 top-full mt-1 p-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl opacity-0 invisible group-hover/presets:opacity-100 group-hover/presets:visible transition-all z-50">
          <div className="grid grid-cols-8 gap-1">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setDisplayColor(c);
                  setHexInput(c);
                  currentColorRef.current = c;
                  if (swatchRef.current) {
                    swatchRef.current.style.backgroundColor = c;
                  }
                  onChange(c);
                }}
                className="w-5 h-5 rounded border border-zinc-700 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderControl({ 
  value, 
  onChange, 
  min, 
  max, 
  step = 1,
  suffix = '',
}: { 
  value: number; 
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [inputValue, setInputValue] = useState(String(value));
  const isDraggingRef = useRef(false);
  
  // Sync local state when value changes externally (not during drag)
  useEffect(() => {
    if (!isDraggingRef.current && !editing) {
      setLocalValue(value);
      setInputValue(String(value));
    }
  }, [value, editing]);

  const handleSubmit = () => {
    const num = parseFloat(inputValue);
    if (!isNaN(num)) {
      onChange(Math.max(min, Math.min(max, num)));
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 w-48">
      <div className="flex-1">
        <Slider
          value={[localValue]}
          onValueChange={([v]) => {
            isDraggingRef.current = true;
            setLocalValue(v);
          }}
          onValueCommit={([v]) => {
            isDraggingRef.current = false;
            onChange(v);
          }}
          min={min}
          max={max}
          step={step}
          className="flex-1"
        />
      </div>
      {editing ? (
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') setEditing(false);
          }}
          min={min}
          max={max}
          step={step}
          className="w-14 h-6 px-1.5 text-xs text-right tabular-nums font-mono rounded bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
          autoFocus
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-zinc-500 hover:text-zinc-300 w-14 text-right tabular-nums transition-colors"
          title="Click to edit"
        >
          {localValue}{suffix}
        </button>
      )}
    </div>
  );
}

// ============ Control Renderer ============

interface ControlRendererProps {
  control: ControlDefinition;
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  compact?: boolean;
}

function ControlRenderer({ control, config, onChange, compact }: ControlRendererProps) {
  const value = getValueByPath(config, control.key);
  
  if (control.showWhen) {
    const conditionValue = getValueByPath(config, control.showWhen.key);
    if (conditionValue !== control.showWhen.value) return null;
  }

  switch (control.type) {
    case 'select':
      return (
        <ControlRow label={control.label} description={compact ? undefined : control.description}>
          <Select value={value as string} onValueChange={(v) => onChange(control.key, v)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {control.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ControlRow>
      );

    case 'switch':
      return (
        <ControlRow label={control.label} description={compact ? undefined : control.description}>
          <Switch checked={value as boolean} onCheckedChange={(v) => onChange(control.key, v)} />
        </ControlRow>
      );

    case 'slider':
      return (
        <ControlRow label={control.label} description={compact ? undefined : control.description}>
          <SliderControl
            value={value as number}
            onChange={(v) => onChange(control.key, v)}
            min={control.min ?? 0}
            max={control.max ?? 100}
            step={control.step}
            suffix={control.suffix}
          />
        </ControlRow>
      );

    case 'color':
      return (
        <ControlRow label={control.label} description={compact ? undefined : control.description}>
          <ColorPicker 
            value={value as string} 
            onChange={(v) => onChange(control.key, v)}
          />
        </ControlRow>
      );

    case 'text':
      return (
        <ControlRow label={control.label} description={compact ? undefined : control.description} inline={false}>
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(control.key, e.target.value)}
            placeholder="Enter value..."
            className="w-full h-9 px-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
        </ControlRow>
      );

    default:
      return null;
  }
}

// ============ Group Renderer ============

function GroupRenderer({ group, config, onChange, compact, groupIndex, sectionId }: { 
  group: ControlGroup; 
  config: Record<string, unknown>; 
  onChange: (key: string, value: unknown) => void;
  compact?: boolean;
  groupIndex: number;
  sectionId: string;
}) {
  const { collapsedGroups, toggleGroupCollapsed } = useDesignConfigModalState();
  const groupKey = `${sectionId}-${groupIndex}`;
  const isCollapsed = collapsedGroups.has(groupKey);
  
  if (group.showWhen) {
    const conditionValue = getValueByPath(config, group.showWhen.key);
    if (conditionValue !== group.showWhen.value) return null;
  }

  const visibleControls = group.controls.filter((ctrl) => {
    if (!ctrl.showWhen) return true;
    return getValueByPath(config, ctrl.showWhen.key) === ctrl.showWhen.value;
  });

  if (visibleControls.length === 0) return null;

  return (
    <Card className={compact ? 'p-3' : undefined}>
      {group.title && (
        <button
          onClick={() => toggleGroupCollapsed(groupKey)}
          className="w-full flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800/50 hover:bg-zinc-800/20 -mx-1 px-1 rounded transition-colors"
        >
          <ChevronDown className={cn(
            "w-4 h-4 text-zinc-500 transition-transform",
            isCollapsed && "-rotate-90"
          )} />
          {group.icon && <group.icon className="w-4 h-4 text-zinc-500" />}
          <span className="text-sm font-medium text-zinc-300">{group.title}</span>
        </button>
      )}
      {!isCollapsed && (
        <div className={cn("divide-y divide-zinc-800/30", compact && "space-y-1 divide-y-0")}>
          {group.controls.map((ctrl) => (
            <ControlRenderer 
              key={ctrl.key} 
              control={ctrl} 
              config={config} 
              onChange={onChange}
              compact={compact}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

// ============ Profile Section ============

function ProfileSection() {
  const [newName, setNewName] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showConfirm } = useDesignConfigModalState();
  
  const { data: profiles } = useProfileList();
  const { data: templates } = useTemplateList();
  const { profile, config, resetConfig, updateConfig } = useActiveMessageStyle();
  const createProfile = useCreateProfile();
  const removeProfile = useDeleteProfile();
  const activateProfile = useActivateProfile();
  const updateProfile = useUpdateProfile();
  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const handleCreateProfile = () => {
    if (!newName.trim()) return;
    createProfile.mutate(
      { name: newName.trim(), messageStyle: defaultMessageStyleConfig },
      { onSuccess: () => toast.success(`Profile "${newName}" created`) }
    );
    setNewName('');
  };

  const handleDuplicateProfile = () => {
    if (!profile || !config) return;
    const dupName = `${profile.name} (copy)`;
    createProfile.mutate(
      { name: dupName, messageStyle: config },
      { onSuccess: () => toast.success(`Profile duplicated as "${dupName}"`) }
    );
  };

  const handleRenameProfile = () => {
    if (!profile || !editNameValue.trim()) return;
    updateProfile.mutate(
      { id: profile.id, data: { name: editNameValue.trim() } },
      { onSuccess: () => {
        toast.success('Profile renamed');
        setEditingName(false);
      }}
    );
  };

  const handleSaveAsTemplate = () => {
    if (!templateName.trim() || !config) return;
    createTemplate.mutate(
      { name: templateName.trim(), config: config as unknown as Record<string, unknown> },
      { onSuccess: () => toast.success(`Template "${templateName}" saved`) }
    );
    setTemplateName('');
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (!template || !profile) return;
    updateConfig(template.config);
    toast.success(`Template "${template.name}" applied`);
  };

  const handleExportConfig = () => {
    if (!config || !profile) return;
    exportConfigAsFile(config as unknown as Record<string, unknown>, profile.name);
    toast.success('Configuration exported');
  };

  const handleImportConfig = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const imported = await parseTemplateFile(file);
      updateConfig(imported.config);
      toast.success('Configuration imported');
    } catch (err) {
      console.error('Failed to import template:', err);
      toast.error('Failed to import configuration');
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteProfile = () => {
    if (!profile || !profiles || profiles.length <= 1) return;
    showConfirm(
      'Delete Profile',
      `Are you sure you want to delete "${profile.name}"? This cannot be undone.`,
      () => {
        removeProfile.mutate(profile.id, {
          onSuccess: () => toast.success('Profile deleted'),
        });
      }
    );
  };

  const handleDeleteTemplate = (templateId: string, templateName: string) => {
    showConfirm(
      'Delete Template',
      `Are you sure you want to delete "${templateName}"?`,
      () => {
        deleteTemplate.mutate(templateId, {
          onSuccess: () => toast.success('Template deleted'),
        });
      }
    );
  };

  const handleResetConfig = () => {
    showConfirm(
      'Reset Configuration',
      'This will reset all settings to their defaults. Continue?',
      () => {
        resetConfig();
        toast.success('Configuration reset to defaults');
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Active Profile */}
      <Card>
        <div className="flex items-center justify-between gap-4 py-2.5">
          <div className="min-w-0">
            <div className="text-sm text-zinc-300">Active Profile</div>
            <div className="text-xs text-zinc-500 mt-0.5">Switch between saved configurations</div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={profile?.id ?? ''} onValueChange={(id) => {
              activateProfile.mutate(id);
              toast.info('Profile switched');
            }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {profiles?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Inline rename */}
        {profile && (
          <div className="pt-2 mt-2 border-t border-zinc-800/50">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameProfile();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  className="flex-1 h-8 px-2 text-sm rounded bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  autoFocus
                />
                <Button size="sm" onClick={handleRenameProfile} className="h-8 px-2">
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingName(false)} className="h-8 px-2">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditNameValue(profile.name);
                    setEditingName(true);
                  }}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Rename
                </button>
                <button
                  onClick={handleDuplicateProfile}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  Duplicate
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Create New Profile */}
      <Card>
        <div className="text-sm font-medium text-zinc-300 mb-3">Create New Profile</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
            placeholder="Profile name..."
            className="flex-1 h-9 px-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
          <Button onClick={handleCreateProfile} disabled={!newName.trim()} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Design Templates */}
      <Card>
        <div className="text-sm font-medium text-zinc-300 mb-3">Design Templates</div>
        
        {/* Save as Template */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveAsTemplate()}
            placeholder="Save current as template..."
            className="flex-1 h-9 px-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
          <Button onClick={handleSaveAsTemplate} disabled={!templateName.trim()} size="sm">
            <Save className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Load Template */}
        {templates && templates.length > 0 && (
          <div className="mb-3">
            <ControlRow label="Load Template" description="Apply a saved template">
              <Select onValueChange={handleLoadTemplate}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ControlRow>
          </div>
        )}

        {/* Export/Import */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportConfig} className="flex-1">
            <FileDown className="h-3.5 w-3.5 mr-1.5" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1">
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportConfig}
            className="hidden"
          />
        </div>
        
        {/* Template List with Delete */}
        {templates && templates.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-800/50">
            <div className="text-xs text-zinc-500 mb-2">Saved Templates</div>
            <div className="space-y-1">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-1 group">
                  <span className="text-sm text-zinc-300">{t.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTemplate(t.id, t.name)}
                    className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Profile Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleResetConfig} size="sm" className="flex-1">
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
        </Button>
        <div className="relative flex-1 group/delete">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteProfile}
            disabled={!profiles || profiles.length <= 1}
            className="w-full"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
          </Button>
          {profiles && profiles.length <= 1 && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-xs text-zinc-300 rounded whitespace-nowrap opacity-0 group-hover/delete:opacity-100 transition-opacity pointer-events-none">
              Can't delete the last profile
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Confirmation Dialog ============

function ConfirmDialog() {
  const { confirmDialog, hideConfirm } = useDesignConfigModalState();
  
  if (!confirmDialog.open) return null;
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-sm w-full mx-4 shadow-2xl">
        <h3 className="text-base font-semibold text-zinc-100 mb-2">{confirmDialog.title}</h3>
        <p className="text-sm text-zinc-400 mb-5">{confirmDialog.message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={hideConfirm}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => {
              confirmDialog.onConfirm?.();
              hideConfirm();
            }}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ Search Results ============

interface SearchResult {
  sectionId: string;
  sectionLabel: string;
  control: ControlDefinition;
}

function SearchResults({ 
  query, 
  config, 
  onChange,
  onNavigate,
}: { 
  query: string; 
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onNavigate: (sectionId: string) => void;
}) {
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const matches: SearchResult[] = [];
    
    for (const section of interfaceDesignSections) {
      if (section.id === 'profile') continue;
      for (const group of section.groups) {
        for (const control of group.controls) {
          const searchText = `${control.label} ${control.description || ''} ${control.key}`.toLowerCase();
          if (searchText.includes(q)) {
            matches.push({
              sectionId: section.id,
              sectionLabel: section.label,
              control,
            });
          }
        }
      }
    }
    return matches.slice(0, 10); // Limit results
  }, [query]);

  if (!query.trim()) return null;
  
  if (results.length === 0) {
    return (
      <div className="p-4 text-sm text-zinc-500 text-center">
        No settings found for "{query}"
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-800/50">
      {results.map((result) => (
        <div key={result.control.key} className="p-3">
          <button
            onClick={() => onNavigate(result.sectionId)}
            className="text-xs text-violet-400 hover:text-violet-300 mb-1"
          >
            {result.sectionLabel} →
          </button>
          <ControlRenderer
            control={result.control}
            config={config}
            onChange={onChange}
            compact
          />
        </div>
      ))}
    </div>
  );
}

// ============ Main Modal ============

export function DesignConfigModal({ open, onOpenChange }: DesignConfigModalProps) {
  const { 
    activeSection, scrollPosition, searchQuery, compactMode,
    setActiveSection, setScrollPosition, setSearchQuery, toggleCompactMode,
  } = useDesignConfigModalState();
  
  const scrollRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      // Escape to close search
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, searchOpen, setSearchQuery]);
  
  // Arrow key navigation in sidebar
  useEffect(() => {
    if (!open || searchOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const sectionIds = interfaceDesignSections.map(s => s.id);
        const currentIndex = sectionIds.indexOf(activeSection);
        const nextIndex = e.key === 'ArrowDown' 
          ? Math.min(currentIndex + 1, sectionIds.length - 1)
          : Math.max(currentIndex - 1, 0);
        setActiveSection(sectionIds[nextIndex]);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, searchOpen, activeSection, setActiveSection]);
  
  // Restore scroll position when modal opens or section changes
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollPosition;
    }
  }, [open, activeSection, scrollPosition]);
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollPosition(e.currentTarget.scrollTop);
  }, [setScrollPosition]);
  
  const { 
    config, isLoading, isPending,
    setTypography, setLayout, setAvatar, setActions,
    setBranch, setTimestamp, setAnimation, setEdit, setPageBackground,
  } = useActiveMessageStyle();
  
  const sectionSetters: Record<string, (updates: Record<string, unknown>) => void> = {
    typography: setTypography,
    layout: setLayout,
    avatar: setAvatar,
    actions: setActions,
    branch: setBranch,
    timestamp: setTimestamp,
    animation: setAnimation,
    edit: setEdit,
    pageBackground: setPageBackground,
  };
  
  const handleChange = (key: string, value: unknown) => {
    const parts = key.split('.');
    if (parts.length === 2) {
      const [section, prop] = parts;
      const setter = sectionSetters[section];
      if (setter) setter({ [prop]: value });
    }
  };

  if (isLoading || !config) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center h-80 text-zinc-500">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  const current = interfaceDesignSections.find((s) => s.id === activeSection);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 overflow-hidden flex flex-col h-[85vh] max-w-5xl">
        {/* Header */}
        <header className="shrink-0 px-5 py-4 border-b border-zinc-800/50 bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <Paintbrush className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-100">Interface Design</h2>
                <p className="text-xs text-zinc-500">Customize message appearance</p>
              </div>
              
              {/* Compact mode toggle - placed next to title */}
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
            
            <div className="flex items-center gap-2">
              {/* Search button */}
              <button
                onClick={() => {
                  setSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 0);
                }}
                className="flex items-center gap-2 h-8 px-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden sm:inline text-xs bg-zinc-700/50 px-1.5 py-0.5 rounded">⌘K</kbd>
              </button>
              
              {/* Saving indicator */}
              {isPending && (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                  Saving
                </div>
              )}
            </div>
          </div>
          
          {/* Search input (shown when search is open) */}
          {searchOpen && (
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings..."
                className="w-full h-10 pl-10 pr-10 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                autoFocus
              />
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </header>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <nav 
            ref={sidebarRef}
            className="w-48 shrink-0 border-r border-zinc-800/50 bg-zinc-950/50 p-2 overflow-y-auto"
          >
            {interfaceDesignSections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  setSearchOpen(false);
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
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-5 bg-zinc-950/20"
          >
            {/* Search results */}
            {searchOpen && searchQuery ? (
              <SearchResults
                query={searchQuery}
                config={config as unknown as Record<string, unknown>}
                onChange={handleChange}
                onNavigate={(sectionId) => {
                  setActiveSection(sectionId);
                  setSearchOpen(false);
                  setSearchQuery('');
                }}
              />
            ) : current && (
              <div className="max-w-3xl space-y-4">
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-zinc-100">{current.label}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{current.description}</p>
                </div>

                {current.id === 'profile' ? (
                  <ProfileSection />
                ) : (
                  current.groups.map((group, i) => (
                    <GroupRenderer 
                      key={group.title || i} 
                      group={group} 
                      config={config as unknown as Record<string, unknown>} 
                      onChange={handleChange}
                      compact={compactMode}
                      groupIndex={i}
                      sectionId={current.id}
                    />
                  ))
                )}
              </div>
            )}
          </main>
        </div>
        
        {/* Confirmation dialog */}
        <ConfirmDialog />
      </DialogContent>
    </Dialog>
  );
}
