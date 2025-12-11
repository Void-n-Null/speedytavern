import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fonts, type FontMeta } from '../../api/client';

export const fontKeys = {
  all: ['fonts'] as const,
  detail: (id: string) => ['fonts', id] as const,
};

export function useFonts() {
  return useQuery({
    queryKey: fontKeys.all,
    queryFn: fonts.list,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useFont(id: string) {
  return useQuery({
    queryKey: fontKeys.detail(id),
    queryFn: () => fonts.get(id),
    enabled: !!id,
  });
}

export function useUploadFont() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, name }: { file: File; name?: string }) =>
      fonts.upload(file, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fontKeys.all });
    },
  });
}

export function useDeleteFont() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fonts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fontKeys.all });
    },
  });
}

export function useRenameFont() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      fonts.rename(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fontKeys.all });
    },
  });
}

// Helper to get font file URL
export function getFontFileUrl(id: string): string {
  return fonts.getFileUrl(id);
}

// Hook to load custom font CSS when a custom font is selected
export function useCustomFontLoader(customFontId?: string, fontFamily?: string) {
  const { data: fontList } = useFonts();

  // Load the font via @font-face when customFontId changes
  // Only applies when fontFamily is 'custom'
  if (fontFamily === 'custom' && customFontId && fontList) {
    const font = fontList.find((f) => f.id === customFontId);
    if (font) {
      const fontUrl = getFontFileUrl(font.id);
      const fontFaceName = `CustomFont-${font.id}`;

      // Check if font-face already exists
      const styleId = `custom-font-${font.id}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @font-face {
            font-family: '${fontFaceName}';
            src: url('${fontUrl}') format('${font.format === 'ttf' ? 'truetype' : font.format === 'otf' ? 'opentype' : font.format}');
            font-weight: 100 900;
            font-style: normal;
          }
        `;
        document.head.appendChild(style);
      }

      // Set CSS variable for custom font
      document.documentElement.style.setProperty(
        '--custom-font-family',
        `'${fontFaceName}', sans-serif`
      );
    }
  }
}
