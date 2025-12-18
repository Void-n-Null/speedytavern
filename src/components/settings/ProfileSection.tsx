import { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  RotateCcw, 
  Upload, 
  FileDown, 
  Pencil, 
  Copy, 
  ChevronDown,
  Layout,
  History,
  Check,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { Card } from './GroupRenderer';
import { useProfileSectionState } from './useProfileSectionState';
import { cn } from '../../lib/utils';

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

  // Local UI states to replace modals
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [profileTempName, setProfileTempName] = useState('');
  const [templateTempName, setTemplateTempName] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  // Sync profileTempName with profile name for inline editing
  useEffect(() => {
    if (profile && !isCreatingProfile) {
      setProfileTempName(profile.name);
    }
  }, [profile, isCreatingProfile]);

  const onCommitRename = () => {
    if (!profile || !profileTempName.trim() || profileTempName === profile.name) {
      if (profile) setProfileTempName(profile.name);
      return;
    }
    handleRenameProfile(profile.id, profileTempName.trim());
  };

  const onCommitCreateProfile = () => {
    if (!profileTempName.trim()) {
      setIsCreatingProfile(false);
      if (profile) setProfileTempName(profile.name);
      return;
    }
    handleCreateProfile(profileTempName.trim());
    setIsCreatingProfile(false);
  };

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
    <div className="space-y-6">
      {/* Active Profile Header / Creation Zone */}
      <Card className="p-0 overflow-hidden border-zinc-700/50 bg-zinc-900/60 transition-all">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded transition-colors",
                isCreatingProfile 
                  ? "text-emerald-400 bg-emerald-400/10" 
                  : "text-violet-400 bg-violet-400/10"
              )}>
                {isCreatingProfile ? 'New Profile' : 'Active Profile'}
              </span>
            </div>
            
            <input
              ref={titleInputRef}
              type="text"
              value={profileTempName}
              onChange={(e) => setProfileTempName(e.target.value)}
              onBlur={() => {
                if (isCreatingProfile) onCommitCreateProfile();
                else onCommitRename();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (isCreatingProfile) onCommitCreateProfile();
                  else onCommitRename();
                  titleInputRef.current?.blur();
                }
                if (e.key === 'Escape') {
                  setIsCreatingProfile(false);
                  if (profile) setProfileTempName(profile.name);
                  titleInputRef.current?.blur();
                }
              }}
              placeholder={isCreatingProfile ? "Enter profile name..." : "Profile name"}
              className={cn(
                "w-full bg-transparent border-none p-0 text-xl font-bold tracking-tight focus:ring-0 focus:outline-none placeholder:text-zinc-700 transition-colors",
                isCreatingProfile ? "text-emerald-400" : "text-zinc-100"
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            {!isCreatingProfile ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-zinc-800/50 border-zinc-700 gap-2">
                      Switch <ChevronDown className="h-4 w-4 text-zinc-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Saved Profiles</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {profiles?.map((p) => (
                      <DropdownMenuItem 
                        key={p.id} 
                        onClick={() => activateProfile.mutate(p.id)}
                        className={cn(
                          "flex items-center justify-between gap-2",
                          p.id === profile?.id && "bg-zinc-800 text-violet-400 font-medium"
                        )}
                      >
                        {p.name}
                        {p.id === profile?.id && <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => {
                        setIsCreatingProfile(true);
                        setProfileTempName('');
                        setTimeout(() => titleInputRef.current?.focus(), 0);
                      }} 
                      className="text-emerald-400 focus:text-emerald-400"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Create New
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="h-8 w-px bg-zinc-800 mx-1 hidden sm:block" />

                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => titleInputRef.current?.focus()}
                    title="Rename profile"
                    className="h-9 w-9 p-0 text-zinc-400 hover:text-zinc-100 shrink-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleDuplicateProfile}
                    title="Duplicate profile"
                    className="h-9 w-9 p-0 text-zinc-400 hover:text-zinc-100 shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleDeleteProfile}
                    disabled={!profiles || profiles.length <= 1}
                    title="Delete profile"
                    className="h-9 w-9 p-0 text-zinc-400 hover:text-red-400 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1">
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shrink-0"
                  onClick={onCommitCreateProfile}
                >
                  <Check className="h-4 w-4" /> Save Profile
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setIsCreatingProfile(false);
                    if (profile) setProfileTempName(profile.name);
                  }}
                  className="text-zinc-500 hover:text-zinc-300 shrink-0"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Template Gallery */}
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

      {/* Utility Bar */}
      <div className="pt-4 border-t border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleExportConfig}
              className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors group"
            >
              <div className="h-7 w-7 rounded bg-zinc-800/50 flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
                <FileDown className="h-3.5 w-3.5" />
              </div>
              Export Config
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors group"
            >
              <div className="h-7 w-7 rounded bg-zinc-800/50 flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
                <Upload className="h-3.5 w-3.5" />
              </div>
              Import Config
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportConfig}
              className="hidden"
            />
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleResetConfig}
            className="h-8 text-xs text-zinc-500 hover:text-red-400 gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset to Default
          </Button>
        </div>
      </div>
    </div>
  );
}
