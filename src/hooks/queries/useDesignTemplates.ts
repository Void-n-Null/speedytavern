/**
 * Design Templates Query Hooks
 * 
 * TanStack Query hooks for managing design templates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { designTemplates, type DesignTemplate, type CreateTemplateInput } from '../../api/client';

// Query keys
export const templateKeys = {
  all: ['design-templates'] as const,
  list: () => [...templateKeys.all, 'list'] as const,
  detail: (id: string) => [...templateKeys.all, 'detail', id] as const,
};

// ============ Queries ============

export function useTemplateList() {
  return useQuery({
    queryKey: templateKeys.list(),
    queryFn: designTemplates.list,
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => designTemplates.get(id),
    enabled: !!id,
  });
}

// ============ Mutations ============

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateTemplateInput) => designTemplates.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTemplateInput> }) =>
      designTemplates.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
      queryClient.setQueryData(templateKeys.detail(result.id), result);
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => designTemplates.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

// ============ Export/Import Helpers ============

export function exportTemplateAsFile(template: DesignTemplate) {
  const exportData = {
    name: template.name,
    description: template.description,
    config: template.config,
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${template.name.toLowerCase().replace(/\s+/g, '-')}-template.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

export function exportConfigAsFile(config: Record<string, unknown>, name: string) {
  const exportData = {
    name,
    description: null,
    config,
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.toLowerCase().replace(/\s+/g, '-')}-template.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

export interface ImportedTemplate {
  name: string;
  description?: string | null;
  config: Record<string, unknown>;
  version?: string;
}

export async function parseTemplateFile(file: File): Promise<ImportedTemplate> {
  const text = await file.text();
  const data = JSON.parse(text);
  
  if (!data.config || typeof data.config !== 'object') {
    throw new Error('Invalid template file: missing config');
  }
  
  return {
    name: data.name || file.name.replace('.json', ''),
    description: data.description || null,
    config: data.config,
    version: data.version,
  };
}
