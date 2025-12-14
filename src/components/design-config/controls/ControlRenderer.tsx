/**
 * ControlRenderer - Renders a control based on its type from the schema
 */

import { useRef } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { Switch } from '../../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { ColorPicker } from './ColorPicker';
import { SliderControl } from './SliderControl';
import { getValueByPath, type ControlDefinition } from '../designConfigSchema';
import { useFonts, useUploadFont, useDeleteFont } from '../../../hooks/queries/useFonts';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface ControlRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  inline?: boolean;
  isMobile?: boolean;
}

export function ControlRow({ label, description, children, inline = true, isMobile }: ControlRowProps) {
  const computedIsMobile = isMobile ?? useIsMobile();
  
  // Stacked layout: label on top, control below
  if (!inline || computedIsMobile) {
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
  
  // Inline layout: label left, control right (desktop only)
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

interface ControlRendererProps {
  control: ControlDefinition;
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  compact?: boolean;
  isMobile?: boolean;
}

export function ControlRenderer({ control, config, onChange, compact, isMobile }: ControlRendererProps) {
  const value = getValueByPath(config, control.key);
  
  if (control.showWhen) {
    const conditionValue = getValueByPath(config, control.showWhen.key);
    if (conditionValue !== control.showWhen.value) return null;
  }

  switch (control.type) {
    case 'select':
      // Special handling for customFontId - dynamic options from server
      if (control.key === 'typography.customFontId') {
        return <CustomFontSelect control={control} value={value as string} onChange={onChange} compact={compact} isMobile={isMobile} />;
      }
      return (
        <ControlRow label={control.label} description={compact ? undefined : control.description} isMobile={isMobile}>
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

    case 'font-upload':
      return <FontUploadControl compact={compact} isMobile={isMobile} />;

    case 'switch':
      return (
        <ControlRow label={control.label} description={compact ? undefined : control.description} isMobile={isMobile}>
          <Switch checked={value as boolean} onCheckedChange={(v) => onChange(control.key, v)} />
        </ControlRow>
      );

    case 'slider':
      return (
        <ControlRow label={control.label} description={compact ? undefined : control.description} isMobile={isMobile}>
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
        <ControlRow label={control.label} description={compact ? undefined : control.description} isMobile={isMobile}>
          <ColorPicker 
            value={value as string} 
            onChange={(v) => onChange(control.key, v)}
          />
        </ControlRow>
      );

    case 'text':
      if (control.key === 'customCss.css') {
        return (
          <ControlRow label={control.label} description={compact ? undefined : control.description} inline={false} isMobile={isMobile}>
            <textarea
              value={(value as string) || ''}
              onChange={(e) => onChange(control.key, e.target.value)}
              placeholder="/* Write CSS here */"
              spellCheck={false}
              className="w-full min-h-[220px] p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </ControlRow>
        );
      }

      return (
        <ControlRow label={control.label} description={compact ? undefined : control.description} inline={false} isMobile={isMobile}>
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

// ============ Custom Font Select with Upload ============

function CustomFontSelect({ 
  control, 
  value, 
  onChange, 
  compact,
  isMobile,
}: { 
  control: ControlDefinition; 
  value: string; 
  onChange: (key: string, value: unknown) => void;
  compact?: boolean;
  isMobile?: boolean;
}) {
  const { data: fonts, isLoading } = useFonts();
  const uploadMutation = useUploadFont();
  const deleteMutation = useDeleteFont();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const uploaded = await uploadMutation.mutateAsync({ file });
      onChange(control.key, uploaded.id);
    } catch (err) {
      console.error('Font upload failed:', err);
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (fontId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (value === fontId) {
      onChange(control.key, '');
    }
    await deleteMutation.mutateAsync(fontId);
  };

  return (
    <ControlRow label={control.label} description={compact ? undefined : control.description} isMobile={isMobile}>
      <div className="flex items-center gap-2">
        <Select 
          value={value || ''} 
          onValueChange={(v) => onChange(control.key, v)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder={isLoading ? 'Loading...' : 'Select font'} />
          </SelectTrigger>
          <SelectContent>
            {fonts?.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-zinc-500">No custom fonts uploaded</div>
            )}
            {fonts?.map((font) => (
              <SelectItem key={font.id} value={font.id}>
                <div className="flex items-center justify-between w-full gap-2">
                  <span>{font.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
          title="Upload font (.ttf, .otf, .woff, .woff2)"
        >
          <Upload className="h-4 w-4" />
        </button>
        
        {/* Delete current font */}
        {value && (
          <button
            onClick={(e) => handleDelete(value, e)}
            disabled={deleteMutation.isPending}
            className="p-2 rounded-lg bg-zinc-800/50 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Delete this font"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </ControlRow>
  );
}

// ============ Standalone Font Upload Control ============

function FontUploadControl({ compact, isMobile }: { compact?: boolean; isMobile?: boolean }) {
  const { data: fonts } = useFonts();
  const uploadMutation = useUploadFont();
  const deleteMutation = useDeleteFont();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadMutation.mutateAsync({ file });
    } catch (err) {
      console.error('Font upload failed:', err);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <ControlRow 
      label="Upload Custom Font" 
      description={compact ? undefined : 'Upload .ttf, .otf, .woff, or .woff2 files'}
      inline={false}
      isMobile={isMobile}
    >
      <div className="space-y-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 text-sm text-zinc-300 hover:text-zinc-100 transition-colors disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {uploadMutation.isPending ? 'Uploading...' : 'Choose font file'}
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        {/* List uploaded fonts */}
        {fonts && fonts.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-xs text-zinc-500 mb-1">Uploaded fonts:</div>
            {fonts.map((font) => (
              <div 
                key={font.id} 
                className="flex items-center justify-between px-2 py-1.5 rounded bg-zinc-800/30 text-sm"
              >
                <span className="text-zinc-300">{font.name}</span>
                <button
                  onClick={() => deleteMutation.mutateAsync(font.id)}
                  disabled={deleteMutation.isPending}
                  className="p-1 rounded hover:bg-red-900/50 text-zinc-500 hover:text-red-400 transition-colors"
                  title="Delete font"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ControlRow>
  );
}
