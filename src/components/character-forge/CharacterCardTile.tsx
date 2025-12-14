/**
 * CharacterCardTile - Individual character card in the gallery.
 * 
 * Styled like a collectible card with dramatic hover effects.
 */

import { useState } from 'react';
import { Pencil, Trash2, Copy, MoreVertical, User } from 'lucide-react';
import type { CharacterCardRecordMeta } from '../../types/characterCard';
import { getAvatarUrlVersioned } from '../../hooks/queries/useCharacterCards';
import { cn } from '../../lib/utils';

interface CharacterCardTileProps {
  card: CharacterCardRecordMeta;
  isSelected: boolean;
  viewMode: 'grid' | 'list';
  index: number;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function CharacterCardTile({
  card,
  isSelected,
  viewMode,
  index,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
}: CharacterCardTileProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);
  
  const specLabel = card.spec 
    ? card.spec.replace('chara_card_', '').toUpperCase() 
    : 'V1';

  const creatorLabel = typeof card.creator === 'string' && card.creator.trim().length > 0 ? card.creator.trim() : null;
  const tokenLabel = typeof card.token_count === 'number' ? `${card.token_count.toLocaleString()} tok` : null;

  if (viewMode === 'list') {
    return (
      <div
        onClick={onSelect}
        className={cn(
          'group flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-all',
          isSelected
            ? 'border-violet-500/50 bg-violet-500/10'
            : 'border-transparent hover:border-zinc-700 hover:bg-zinc-800/50'
        )}
        style={{
          animationDelay: `${index * 30}ms`,
          animation: 'fadeSlideIn 0.3s ease-out both',
        }}
      >
        {/* Avatar */}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
          {card.has_png && !imgError ? (
            <img
              src={getAvatarUrlVersioned(card.id, card.png_sha256)}
              alt={card.name}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-600">
              <User className="h-5 w-5" />
            </div>
          )}
        </div>
        
        {/* Name & spec */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-zinc-200">{card.name}</div>
          <div className="truncate text-xs text-zinc-500">
            {specLabel}
            {creatorLabel ? ` • ${creatorLabel}` : ''}
            {tokenLabel ? ` • ${tokenLabel}` : ''}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"
            title="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded p-1.5 text-zinc-500 hover:bg-red-900/50 hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Grid view - collectible card style
  return (
    <div
      onClick={onSelect}
      className={cn(
        'card-tile group relative cursor-pointer overflow-hidden rounded-xl border transition-all duration-200',
        isSelected
          ? 'border-violet-500/70 ring-2 ring-violet-500/30'
          : 'border-zinc-800/80 hover:border-zinc-700 hover:shadow-xl hover:shadow-violet-500/5'
      )}
      style={{
        animationDelay: `${index * 40}ms`,
        animation: 'fadeSlideIn 0.4s ease-out both',
        background: 'linear-gradient(135deg, rgba(30,30,35,1) 0%, rgba(20,20,25,1) 100%)',
      }}
    >
      {/* Card glow effect on hover */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.15), transparent 70%)',
        }}
      />
      
      {/* Avatar area */}
      <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900">
        {card.has_png && !imgError ? (
          <img
            src={getAvatarUrlVersioned(card.id, card.png_sha256)}
            alt={card.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-900">
            <User className="h-16 w-16 text-zinc-700" />
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent" />
        
        {/* Spec badge */}
        <div className="absolute right-2 top-2 rounded bg-zinc-950/70 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 backdrop-blur-sm">
          {specLabel}
        </div>
        
        {/* Quick actions overlay */}
        <div className="absolute inset-x-0 top-0 flex justify-end gap-1 p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="rounded-lg bg-zinc-950/70 p-1.5 text-zinc-300 backdrop-blur-sm hover:bg-zinc-900 hover:text-zinc-100"
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
                      onEdit();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDuplicate();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Duplicate
                  </button>
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
      </div>
      
      {/* Card info */}
      <div className="relative p-3">
        <div className="truncate text-sm font-semibold text-zinc-100">{card.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500">
          <span>{new Date(card.updated_at).toLocaleDateString()}</span>
          {creatorLabel && (
            <span className="truncate">{creatorLabel}</span>
          )}
          {tokenLabel && (
            <span>{tokenLabel}</span>
          )}
        </div>
      </div>
    </div>
  );
}

