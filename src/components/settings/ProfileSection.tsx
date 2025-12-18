import { Plus, Trash2, RotateCcw, Upload, Save, FileDown, Check, X, Pencil, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from '../ui/toast';
import { Card } from './GroupRenderer';
import { ControlRow } from './controls';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useProfileSectionState } from './useProfileSectionState';

export function ProfileSection() {
  const isMobile = useIsMobile();
  const {
    newName, setNewName,
    templateName, setTemplateName,
    editingName, setEditingName,
    editNameValue, setEditNameValue,
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
            <ControlRow label="Load Template" description="Apply a saved template" isMobile={isMobile}>
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
