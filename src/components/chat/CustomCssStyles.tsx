import { useMemo } from 'react';
import { useCustomCssConfig } from '../../hooks/queries/useProfiles';

export function CustomCssStyles() {
  const customCss = useCustomCssConfig();

  const cssContent = useMemo(() => {
    if (!customCss.enabled) return '';
    return customCss.css ?? '';
  }, [customCss.enabled, customCss.css]);

  if (!cssContent.trim()) return null;

  return <style data-tavern-custom-css dangerouslySetInnerHTML={{ __html: cssContent }} />;
}
