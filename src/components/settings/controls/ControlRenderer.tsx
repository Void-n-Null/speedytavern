/**
 * ControlRenderer - Renders a control based on its type from the schema
 */

import { Switch } from '../../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { ColorPicker } from './ColorPicker';
import { SliderControl } from './SliderControl';
import { CustomCssEditorControl } from './CustomCssEditorControl';
import { ControlRow } from './ControlRow';
import { SvgUploadControl } from './SvgUploadControl';
import { CustomFontSelect } from './CustomFontSelect';
import { FontUploadControl } from './FontUploadControl';
import { getValueByPath, type ControlDefinition } from '../interfaceDesignSchema';

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
            <CustomCssEditorControl
              value={(value as string) || ''}
              onChange={(next) => onChange(control.key, next)}
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

    case 'textarea':
      return (
        <ControlRow label={control.label} description={compact ? undefined : control.description} inline={false} isMobile={isMobile}>
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(control.key, e.target.value)}
            placeholder="Paste code here..."
            className="w-full min-h-[100px] p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 font-mono resize-y"
          />
        </ControlRow>
      );

    case 'svg-upload':
      return (
        <SvgUploadControl
          control={control}
          value={(value as string) || ''}
          onChange={(v) => onChange(control.key, v)}
          compact={compact}
          isMobile={isMobile}
        />
      );

    default:
      return null;
  }
}
