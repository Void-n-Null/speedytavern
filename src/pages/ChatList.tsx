/**
 * ChatList - The landing page for TavernStudio.
 * 
 * Displays all existing chats and provides the ability to create new ones.
 * Uses the profile's design configuration for consistent theming.
 */

import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MessageSquarePlus,
  MessageSquare,
  Search,
  Trash2,
  MoreVertical,
  Users,
  Clock,
  User,
} from 'lucide-react';
import { AppToolbar } from '../components/AppToolbar';
import { SettingsModal } from '../components/settings/SettingsModal';
import { NewChatDialog } from '../components/chat/NewChatDialog';
import { useChatList, useDeleteChat } from '../hooks/queries/chats';
import { useCharacterCards, getAvatarUrlVersioned } from '../hooks/queries/useCharacterCards';
import { usePageBackgroundConfig, useTypographyConfig } from '../hooks/queries/useProfiles';
import { useCustomFontLoader } from '../hooks/queries/useFonts';
import { showToast } from '../components/ui/toast';
import { ToastContainer } from '../components/ui/toast';
import { cn } from '../lib/utils';
import type { ChatMeta } from '../api/chats';

export function ChatList() {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: chats, isLoading, error } = useChatList();
  const { data: characters } = useCharacterCards();
  const deleteChat = useDeleteChat();
  
  // Theme from profile
  const pageBackground = usePageBackgroundConfig();
  const typography = useTypographyConfig();
  useCustomFontLoader(typography.customFontId, typography.fontFamily);

  // Build background style based on config
  const bgStyle: React.CSSProperties = pageBackground.type === 'color'
    ? { backgroundColor: pageBackground.color }
    : pageBackground.type === 'image' && pageBackground.imageUrl
    ? {
        backgroundColor: '#000',
        backgroundImage: `linear-gradient(rgba(0,0,0,${1 - pageBackground.opacity / 100}), rgba(0,0,0,${1 - pageBackground.opacity / 100})), url(${pageBackground.imageUrl})`,
        backgroundSize: pageBackground.size,
        backgroundPosition: pageBackground.position,
        backgroundRepeat: pageBackground.repeat,
        backgroundAttachment: 'fixed',
      }
    : {};

  // Filter chats by search
  const filteredChats = useMemo(() => {
    if (!chats) return [];
    if (!searchQuery.trim()) return chats;
    
    const q = searchQuery.toLowerCase();
    return chats.filter((chat) =>
      chat.name.toLowerCase().includes(q)
    );
  }, [chats, searchQuery]);

  // Get character info for displaying avatars
  const getCharacterInfo = (characterIds: string[]) => {
    if (!characters) return [];
    return characterIds
      .map((id) => characters.find((c) => c.id === id))
      .filter((c) => c != null);
  };

  const handleDeleteChat = async (chatId: string, chatName: string) => {
    if (!confirm(`Delete "${chatName}"? This cannot be undone.`)) return;
    
    try {
      await deleteChat.mutateAsync(chatId);
      showToast({ message: `Deleted "${chatName}"`, type: 'success' });
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : 'Failed to delete chat',
        type: 'error',
      });
    }
  };

  const handleChatClick = (chatId: string) => {
    navigate(`/chats/${chatId}`);
  };

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="chat-list-page flex h-screen flex-col overflow-hidden" style={bgStyle}>
      <AppToolbar onOpenSettings={() => setShowSettings(true)} />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Page header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl">
                Your Chats
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                {chats?.length ?? 0} conversation{(chats?.length ?? 0) !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setShowNewChat(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 hover:shadow-violet-500/30"
            >
              <MessageSquarePlus className="h-4 w-4" />
              New Chat
            </button>
          </div>

          {/* Search bar */}
          {chats && chats.length > 0 && (
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-3 pl-11 pr-4 text-sm text-zinc-200 placeholder-zinc-500 backdrop-blur-sm focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
              />
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-sm text-zinc-500">Loading chats...</div>
            </div>
          ) : error ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2">
              <div className="text-sm text-red-400">Failed to load chats</div>
              <div className="text-xs text-zinc-500">Please try refreshing the page</div>
            </div>
          ) : !chats || chats.length === 0 ? (
            <EmptyState onCreateNew={() => setShowNewChat(true)} />
          ) : filteredChats.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
              No chats match "{searchQuery}"
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredChats.map((chat, index) => (
                <ChatCard
                  key={chat.id}
                  chat={chat}
                  characterInfos={getCharacterInfo(chat.character_ids)}
                  formatRelativeTime={formatRelativeTime}
                  onClick={() => handleChatClick(chat.id)}
                  onDelete={() => handleDeleteChat(chat.id, chat.name)}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <SettingsModal open={showSettings} onOpenChange={setShowSettings} />
      <NewChatDialog open={showNewChat} onOpenChange={setShowNewChat} />
      <ToastContainer />
    </div>
  );
}

interface EmptyStateProps {
  onCreateNew: () => void;
}

function EmptyState({ onCreateNew }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-8 py-16 text-center">
      <div className="mb-4 rounded-full bg-zinc-800/50 p-4">
        <MessageSquare className="h-8 w-8 text-zinc-600" />
      </div>
      <h2 className="text-lg font-semibold text-zinc-300">No chats yet</h2>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        Start your adventure by creating a new chat with one of your characters
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onCreateNew}
          className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Create First Chat
        </button>
        <Link
          to="/forge"
          className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
        >
          <Users className="h-4 w-4" />
          Character Forge
        </Link>
      </div>
    </div>
  );
}

interface ChatCardProps {
  chat: ChatMeta;
  characterInfos: Array<{ id: string; name: string; has_png?: boolean; png_sha256?: string }>;
  formatRelativeTime: (timestamp: number) => string;
  onClick: () => void;
  onDelete: () => void;
  index: number;
}

function ChatCard({
  chat,
  characterInfos,
  formatRelativeTime,
  onClick,
  onDelete,
  index,
}: ChatCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-sm transition-all duration-200',
        'hover:border-zinc-700 hover:bg-zinc-900/80 hover:shadow-lg hover:shadow-black/20'
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        animation: 'fadeSlideIn 0.3s ease-out both',
      }}
    >
      <div className="flex items-start gap-4">
        {/* Character avatars stack */}
        <div className="relative flex shrink-0">
          {characterInfos.length === 0 ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
              <User className="h-6 w-6 text-zinc-600" />
            </div>
          ) : characterInfos.length === 1 ? (
            <CharacterAvatar character={characterInfos[0]} size={48} />
          ) : (
            <div className="flex -space-x-3">
              {characterInfos.slice(0, 3).map((char, i) => (
                <CharacterAvatar
                  key={char.id}
                  character={char}
                  size={36}
                  className={cn(
                    'ring-2 ring-zinc-900',
                    i === 0 && 'z-30',
                    i === 1 && 'z-20',
                    i === 2 && 'z-10'
                  )}
                />
              ))}
              {characterInfos.length > 3 && (
                <div className="z-0 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-300 ring-2 ring-zinc-900">
                  +{characterInfos.length - 3}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-base font-medium text-zinc-100">
              {chat.name}
            </h3>
            <div className="flex shrink-0 items-center gap-2 text-xs text-zinc-500">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(chat.updated_at)}
            </div>
          </div>
          
          {/* Character names */}
          {characterInfos.length > 0 && (
            <p className="mt-1 truncate text-sm text-zinc-500">
              {characterInfos.map((c) => c.name).join(', ')}
            </p>
          )}
          
          {/* Tags */}
          {chat.tags && chat.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chat.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
                >
                  {tag}
                </span>
              ))}
              {chat.tags.length > 3 && (
                <span className="text-xs text-zinc-500">
                  +{chat.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions menu */}
        <div className="relative shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-32 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onDelete();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-400 hover:bg-red-900/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

interface CharacterAvatarProps {
  character: { id: string; name: string; has_png?: boolean; png_sha256?: string };
  size: number;
  className?: string;
}

function CharacterAvatar({ character, size, className }: CharacterAvatarProps) {
  const [imgError, setImgError] = useState(false);

  if (!character.has_png || imgError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-zinc-800',
          className
        )}
        style={{ width: size, height: size }}
      >
        <User className="text-zinc-600" style={{ width: size * 0.5, height: size * 0.5 }} />
      </div>
    );
  }

  return (
    <img
      src={getAvatarUrlVersioned(character.id, character.png_sha256)}
      alt={character.name}
      className={cn('rounded-full object-cover', className)}
      style={{ width: size, height: size }}
      onError={() => setImgError(true)}
    />
  );
}

