/**
 * Character Forge - The creative heart of TavernStudio.
 * 
 * Combines library browsing, character display, and editing into one
 * spectacular experience. When users land here, they should feel like creators.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCharacterForgeStore } from '../store/characterForgeStore';
import { CharacterGalleryHeader } from '../components/character-forge/CharacterGalleryHeader';
import { CharacterGalleryGrid } from '../components/character-forge/CharacterGalleryGrid';
import { CharacterDetailPanel } from '../components/character-forge/CharacterDetailPanel';
import { CharacterEditor } from '../components/character-forge/CharacterEditor';
import { ToastContainer } from '../components/ui/toast';

const DEFAULT_GALLERY_WIDTH = 384; // matches prior lg:w-96
const GALLERY_MIN_WIDTH = 260;
const GALLERY_HARD_MAX_WIDTH = 860;
const DETAIL_MIN_WIDTH = 360;

export function CharacterForge() {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const layoutRef = useRef<HTMLDivElement>(null);

  const selectedCardId = useCharacterForgeStore((s) => s.selectedCardId);
  const mode = useCharacterForgeStore((s) => s.mode);
  const selectCard = useCharacterForgeStore((s) => s.selectCard);
  const setMode = useCharacterForgeStore((s) => s.setMode);
  const enterEditMode = useCharacterForgeStore((s) => s.enterEditMode);
  const isGalleryFullscreen = useCharacterForgeStore((s) => s.isGalleryFullscreen);
  const setGalleryFullscreen = useCharacterForgeStore((s) => s.setGalleryFullscreen);

  const isAutoGalleryPrimary = mode === 'view' && selectedCardId === null;
  const effectiveGalleryFullscreen = isGalleryFullscreen || isAutoGalleryPrimary;
  
  // Sync URL params to store state
  useEffect(() => {
    const isEditRoute = location.pathname.endsWith('/edit');
    
    if (id) {
      if (selectedCardId !== id) {
        selectCard(id);
      }
      if (isEditRoute && mode !== 'edit') {
        setMode('edit');
      } else if (!isEditRoute && mode === 'edit') {
        setMode('view');
      }

      // If you land on a specific character (deep-link), gallery-fullscreen makes no sense.
      if (isGalleryFullscreen) setGalleryFullscreen(false);
    } else {
      if (selectedCardId !== null) {
        selectCard(null);
      }
    }
  }, [id, location.pathname, selectedCardId, mode, selectCard, setMode, isGalleryFullscreen, setGalleryFullscreen]);

  // Navigate when store state changes (for programmatic navigation)
  const handleSelectCard = (cardId: string | null) => {
    if (cardId) {
      // Clicking a character should undo fullscreen browsing.
      if (isGalleryFullscreen) setGalleryFullscreen(false);
      navigate(`/forge/${cardId}`);
    } else {
      navigate('/forge');
    }
  };
  
  const handleEditCard = (cardId: string) => {
    if (isGalleryFullscreen) setGalleryFullscreen(false);
    enterEditMode(cardId);
    navigate(`/forge/${cardId}/edit`);
  };
  
  const handleExitEdit = useCallback(() => {
    if (selectedCardId) {
      navigate(`/forge/${selectedCardId}`);
    } else {
      navigate('/forge');
    }
  }, [navigate, selectedCardId]);
  
  const handleCreateNew = () => {
    if (isGalleryFullscreen) setGalleryFullscreen(false);
    setMode('create');
  };

  const handleCloseCreate = useCallback(() => {
    setMode('view');
  }, [setMode]);

  const handleSavedCreate = useCallback(
    (newId: string) => {
      // After first save, stay in the editor (edit route) so users can keep saving.
      enterEditMode(newId);
      navigate(`/forge/${newId}/edit`);
    },
    [enterEditMode, navigate]
  );

  const handleSavedNoop = useCallback(() => {}, []);

  return (
    <div className="forge-page flex h-screen flex-col overflow-hidden bg-zinc-950">
      {/* Atmospheric background */}
      <div 
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 80, 200, 0.15), transparent),
            radial-gradient(ellipse 60% 40% at 80% 100%, rgba(80, 120, 200, 0.1), transparent),
            linear-gradient(to bottom, #09090b, #0c0c10)
          `,
        }}
      />
      
      {/* Main content */}
      <div ref={layoutRef} className="relative z-10 flex h-full min-w-0">
        <ForgeGalleryPanel
          layoutRef={layoutRef}
          effectiveGalleryFullscreen={effectiveGalleryFullscreen}
          selectedCardId={selectedCardId}
          onCreateNew={handleCreateNew}
          onSelect={handleSelectCard}
          onEdit={handleEditCard}
        />
        
        {/* Right Panel: Detail or Editor */}
        {!effectiveGalleryFullscreen && (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {mode === 'create' ? (
            <CharacterEditor
              cardId={null}
              onClose={handleCloseCreate}
              onSaved={handleSavedCreate}
            />
          ) : mode === 'edit' && selectedCardId ? (
            <CharacterEditor
              cardId={selectedCardId}
              onClose={handleExitEdit}
              // Saving should not exit editing; keep the user in-place.
              onSaved={handleSavedNoop}
            />
          ) : selectedCardId ? (
            <CharacterDetailPanel
              cardId={selectedCardId}
              onEdit={() => handleEditCard(selectedCardId)}
              onClose={() => handleSelectCard(null)}
            />
          ) : null}
        </div>
        )}
      </div>
      
      <ToastContainer />
    </div>
  );
}

function ForgeGalleryPanel({
  layoutRef,
  effectiveGalleryFullscreen,
  selectedCardId,
  onCreateNew,
  onSelect,
  onEdit,
}: {
  layoutRef: React.RefObject<HTMLDivElement | null>;
  effectiveGalleryFullscreen: boolean;
  selectedCardId: string | null;
  onCreateNew: () => void;
  onSelect: (id: string | null) => void;
  onEdit: (id: string) => void;
}) {
  const galleryPanelRef = useRef<HTMLDivElement>(null);
  const resizePointerIdRef = useRef<number | null>(null);
  const resizeWidthRef = useRef<number>(DEFAULT_GALLERY_WIDTH);
  const resizeRafRef = useRef<number | null>(null);
  const resizeListenersRef = useRef<{
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
    cancel: (e: PointerEvent) => void;
  } | null>(null);

  const gallerySidebarWidth = useCharacterForgeStore((s) => s.gallerySidebarWidth);
  const setGallerySidebarWidth = useCharacterForgeStore((s) => s.setGallerySidebarWidth);

  const clampGalleryWidth = useCallback(
    (nextWidth: number) => {
      const rect = layoutRef.current?.getBoundingClientRect();
      const dynamicMax = rect ? Math.floor(rect.width - DETAIL_MIN_WIDTH) : GALLERY_HARD_MAX_WIDTH;
      const maxWidth = Math.max(GALLERY_MIN_WIDTH, Math.min(GALLERY_HARD_MAX_WIDTH, dynamicMax));
      return Math.min(maxWidth, Math.max(GALLERY_MIN_WIDTH, Math.floor(nextWidth)));
    },
    [layoutRef]
  );

  useEffect(() => {
    const panel = galleryPanelRef.current;
    if (!panel) return;
    if (effectiveGalleryFullscreen) {
      panel.style.width = '';
      return;
    }
    // Keep the inline width in sync with persisted value (e.g. after a refresh).
    panel.style.width = `${gallerySidebarWidth}px`;
  }, [effectiveGalleryFullscreen, gallerySidebarWidth]);

  // If we ever leave the page mid-drag, don't strand the browser in "no-select + col-resize".
  useEffect(() => {
    return () => {
      resizePointerIdRef.current = null;
      if (resizeRafRef.current != null) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
      if (resizeListenersRef.current) {
        window.removeEventListener('pointermove', resizeListenersRef.current.move);
        window.removeEventListener('pointerup', resizeListenersRef.current.up);
        window.removeEventListener('pointercancel', resizeListenersRef.current.cancel);
        resizeListenersRef.current = null;
      }
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, []);

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (effectiveGalleryFullscreen) return;
      resizePointerIdRef.current = e.pointerId;
      e.preventDefault();
      e.stopPropagation();

      // Capture pointer so we keep receiving move/up even if the cursor leaves the handle.
      e.currentTarget.setPointerCapture(e.pointerId);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      const applyWidth = (next: number) => {
        const panel = galleryPanelRef.current;
        if (!panel) return;
        panel.style.width = `${next}px`;
      };

      const onMove = (ev: PointerEvent) => {
        if (resizePointerIdRef.current == null) return;
        if (ev.pointerId !== resizePointerIdRef.current) return;
        const rect = layoutRef.current?.getBoundingClientRect();
        if (!rect) return;
        const next = clampGalleryWidth(ev.clientX - rect.left);
        resizeWidthRef.current = next;
        if (resizeRafRef.current != null) return;
        resizeRafRef.current = requestAnimationFrame(() => {
          resizeRafRef.current = null;
          applyWidth(resizeWidthRef.current);
        });
      };

      const commit = (ev: PointerEvent) => {
        if (resizePointerIdRef.current == null) return;
        if (ev.pointerId !== resizePointerIdRef.current) return;

        resizePointerIdRef.current = null;

        if (resizeRafRef.current != null) {
          cancelAnimationFrame(resizeRafRef.current);
          resizeRafRef.current = null;
        }

        if (resizeListenersRef.current) {
          window.removeEventListener('pointermove', resizeListenersRef.current.move);
          window.removeEventListener('pointerup', resizeListenersRef.current.up);
          window.removeEventListener('pointercancel', resizeListenersRef.current.cancel);
          resizeListenersRef.current = null;
        }

        document.body.style.userSelect = '';
        document.body.style.cursor = '';

        const finalWidth = clampGalleryWidth(resizeWidthRef.current);
        applyWidth(finalWidth);
        setGallerySidebarWidth(finalWidth);
      };

      resizeListenersRef.current = {
        move: onMove,
        up: commit,
        cancel: commit,
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', commit);
      window.addEventListener('pointercancel', commit);
    },
    [clampGalleryWidth, effectiveGalleryFullscreen, layoutRef, setGallerySidebarWidth]
  );

  return (
    <div
      ref={galleryPanelRef}
      className={
        effectiveGalleryFullscreen
          ? 'relative flex flex-1 flex-col bg-zinc-950/80 backdrop-blur-sm'
          : 'relative flex shrink-0 flex-col border-r border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm'
      }
      style={effectiveGalleryFullscreen ? undefined : { width: gallerySidebarWidth }}
    >
      <CharacterGalleryHeader onCreateNew={onCreateNew} />
      <CharacterGalleryGrid selectedId={selectedCardId} onSelect={onSelect} onEdit={onEdit} />

      {!effectiveGalleryFullscreen && (
        <div
          className="group absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none"
          onDoubleClick={() => setGallerySidebarWidth(clampGalleryWidth(DEFAULT_GALLERY_WIDTH))}
          onPointerDown={handleResizePointerDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize gallery sidebar"
          tabIndex={0}
        >
          <div className="absolute right-0 top-0 h-full w-px bg-zinc-800/60 group-hover:bg-violet-500/40" />
        </div>
      )}
    </div>
  );
}
