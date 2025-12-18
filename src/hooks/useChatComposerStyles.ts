import { useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';

interface ComposerConfig {
  backgroundOpacityFocused: number;
  backgroundOpacity: number;
  borderOpacityFocused: number;
  borderOpacity: number;
  borderWidthPx: number;
  borderColor?: string;
  backgroundColor?: string;
  radiusPx: number;
  shadowEnabled: boolean;
  shadowCss: string;
  backdropBlurPx: number;
  sendButtonBackgroundOpacityDisabled: number;
  sendButtonBackgroundOpacity: number;
  sendButtonBorderOpacityDisabled: number;
  sendButtonBorderOpacity: number;
  sendButtonTextOpacityDisabled: number;
  sendButtonBackgroundColor?: string;
  sendButtonBorderColor?: string;
  sendButtonBorderWidthPx: number;
  sendButtonRadiusPx: number;
  sendButtonTextColor?: string;
}

interface LayoutConfig {
  containerWidth: number;
}

export function useChatComposerStyles(
  composer: ComposerConfig,
  layout: LayoutConfig,
  isFocused: boolean,
  isMobile: boolean,
  isEmpty: boolean,
  isAddingMessage: boolean
) {
  const applyOpacityToColor = useCallback((color: string | undefined, opacity: number): string => {
    if (!color) return `rgba(0, 0, 0, ${opacity})`;
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/, `${opacity})`);
    }
    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
    }
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16);
      const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16);
      const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  }, []);

  const containerWidthStyle = useMemo(() => {
    return {
      width: isMobile ? '100%' : `${layout.containerWidth + 5}%`,
      margin: '0 auto',
    } as CSSProperties;
  }, [isMobile, layout.containerWidth]);

  const surfaceStyle = useMemo(() => {
    const bgOpacity = (isFocused ? composer.backgroundOpacityFocused : composer.backgroundOpacity) / 100;
    const borderOpacity = (isFocused ? composer.borderOpacityFocused : composer.borderOpacity) / 100;

    const style: CSSProperties = {
      borderWidth: `${composer.borderWidthPx}px`,
      borderColor: applyOpacityToColor(composer.borderColor, borderOpacity),
      backgroundColor: applyOpacityToColor(composer.backgroundColor, bgOpacity),
      borderRadius: `${composer.radiusPx}px`,
      boxShadow: composer.shadowEnabled ? composer.shadowCss : 'none',
    };

    if (composer.backdropBlurPx > 0) {
      style.backdropFilter = `blur(${composer.backdropBlurPx}px)`;
      (style as any).WebkitBackdropFilter = `blur(${composer.backdropBlurPx}px)`;
    }

    return style;
  }, [applyOpacityToColor, composer, isFocused]);

  const sendButtonStyle = useMemo(() => {
    const disabled = isAddingMessage || isEmpty;

    const bgOpacity = (disabled ? composer.sendButtonBackgroundOpacityDisabled : composer.sendButtonBackgroundOpacity) / 100;
    const borderOpacity = (disabled ? composer.sendButtonBorderOpacityDisabled : composer.sendButtonBorderOpacity) / 100;
    const textOpacity = (disabled ? composer.sendButtonTextOpacityDisabled : 100) / 100;

    return {
      backgroundColor: applyOpacityToColor(composer.sendButtonBackgroundColor, bgOpacity),
      borderColor: applyOpacityToColor(composer.sendButtonBorderColor, borderOpacity),
      borderWidth: `${composer.sendButtonBorderWidthPx}px`,
      borderStyle: composer.sendButtonBorderWidthPx > 0 ? 'solid' : 'none',
      borderRadius: `${composer.sendButtonRadiusPx}px`,
      color: applyOpacityToColor(composer.sendButtonTextColor, textOpacity),
    } as CSSProperties;
  }, [applyOpacityToColor, composer, isAddingMessage, isEmpty]);

  return {
    containerWidthStyle,
    surfaceStyle,
    sendButtonStyle,
  };
}

