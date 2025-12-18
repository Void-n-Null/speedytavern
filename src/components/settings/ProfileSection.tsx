import { useProfileSectionState } from './useProfileSectionState';
import { ProfileHeader } from './profiles/ProfileHeader';
import { TemplateGallery } from './profiles/TemplateGallery';
import { UtilityBar } from './profiles/UtilityBar';

export function ProfileSection() {
  const {
    fileInputRef,
    profiles, templates,
    profile,
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
  } = useProfileSectionState();

  return (
    <div className="space-y-6">
      <ProfileHeader 
        profiles={profiles}
        profile={profile}
        handleCreateProfile={handleCreateProfile}
        handleDuplicateProfile={handleDuplicateProfile}
        handleRenameProfile={handleRenameProfile}
        handleDeleteProfile={handleDeleteProfile}
        activateProfile={activateProfile}
      />

      <TemplateGallery 
        templates={templates}
        handleLoadTemplate={handleLoadTemplate}
        handleDeleteTemplate={handleDeleteTemplate}
        handleSaveAsTemplate={handleSaveAsTemplate}
      />

      <UtilityBar 
        handleExportConfig={handleExportConfig}
        handleImportConfig={handleImportConfig}
        handleResetConfig={handleResetConfig}
        fileInputRef={fileInputRef}
      />
    </div>
  );
}
