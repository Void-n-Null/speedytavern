import { useState, useRef } from 'react';
import { toast } from '../ui/toast';
import { useSettingsModalState } from '../../store/settingsModalState';
import { defaultMessageStyleConfig } from '../../types/messageStyle';
import {
  useProfileList,
  useCreateProfile,
  useDeleteProfile,
  useActivateProfile,
  useUpdateProfile,
  useActiveMessageStyle,
} from '../../hooks/queries/useProfiles';
import {
  useTemplateList,
  useCreateTemplate,
  useDeleteTemplate,
  exportConfigAsFile,
  parseTemplateFile,
} from '../../hooks/queries/useDesignTemplates';

export function useProfileSectionState() {
  const [newName, setNewName] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showConfirm = useSettingsModalState(s => s.showConfirm);
  
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

  const handleDeleteTemplate = (templateId: string, name: string) => {
    showConfirm(
      'Delete Template',
      `Are you sure you want to delete "${name}"?`,
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

  return {
    newName, setNewName,
    templateName, setTemplateName,
    editingName, setEditingName,
    editNameValue, setEditNameValue,
    fileInputRef,
    profiles, templates,
    profile, config,
    handleCreateProfile,
    handleDuplicateProfile,
    handleRenameProfile,
    handleSaveAsTemplate,
    handleLoadTemplate,
    handleExportConfig,
    handleImportConfig,
    handleDeleteProfile,
    handleDeleteTemplate,
    handleResetConfig,
    activateProfile,
  };
}

