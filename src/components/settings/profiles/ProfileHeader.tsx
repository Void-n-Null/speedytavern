import { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Pencil, 
  Copy, 
  ChevronDown,
  Check
} from 'lucide-react';
import { Button } from '../../ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../../ui/dropdown-menu';
import { Card } from '../GroupRenderer';
import { cn } from '../../../lib/utils';
import type { Profile, ProfileMeta } from '../../../types/profile';

interface ProfileHeaderProps {
  profiles: ProfileMeta[] | undefined;
  profile: Profile | null;
  handleCreateProfile: (name: string) => void;
  handleDuplicateProfile: () => void;
  handleRenameProfile: (id: string, name: string) => void;
  handleDeleteProfile: () => void;
  activateProfile: { mutate: (id: string) => void };
}

export function ProfileHeader({
  profiles,
  profile,
  handleCreateProfile,
  handleDuplicateProfile,
  handleRenameProfile,
  handleDeleteProfile,
  activateProfile,
}: ProfileHeaderProps) {
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [profileTempName, setProfileTempName] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

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

  return (
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
  );
}

