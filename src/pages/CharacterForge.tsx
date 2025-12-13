/**
 * Character Forge - The creative heart of TavernStudio.
 * 
 * Combines library browsing, character display, and editing into one
 * spectacular experience. When users land here, they should feel like creators.
 */

import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCharacterForgeStore } from '../store/characterForgeStore';
import { CharacterGalleryHeader } from '../components/character-forge/CharacterGalleryHeader';
import { CharacterGalleryGrid } from '../components/character-forge/CharacterGalleryGrid';
import { CharacterDetailPanel } from '../components/character-forge/CharacterDetailPanel';
import { CharacterEditor } from '../components/character-forge/CharacterEditor';
import { ToastContainer } from '../components/ui/toast';

export function CharacterForge() {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const {
    selectedCardId,
    mode,
    selectCard,
    setMode,
    enterEditMode,
  } = useCharacterForgeStore();
  
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
    } else {
      if (selectedCardId !== null) {
        selectCard(null);
      }
    }
  }, [id, location.pathname, selectedCardId, mode, selectCard, setMode]);
  
  // Navigate when store state changes (for programmatic navigation)
  const handleSelectCard = (cardId: string | null) => {
    if (cardId) {
      navigate(`/forge/${cardId}`);
    } else {
      navigate('/forge');
    }
  };
  
  const handleEditCard = (cardId: string) => {
    enterEditMode(cardId);
    navigate(`/forge/${cardId}/edit`);
  };
  
  const handleExitEdit = () => {
    if (selectedCardId) {
      navigate(`/forge/${selectedCardId}`);
    } else {
      navigate('/forge');
    }
  };
  
  const handleCreateNew = () => {
    setMode('create');
  };

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
      <div className="relative z-10 flex h-full">
        {/* Left Panel: Gallery */}
        <div className="flex w-80 flex-col border-r border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm lg:w-96">
          <CharacterGalleryHeader onCreateNew={handleCreateNew} />
          <CharacterGalleryGrid
            selectedId={selectedCardId}
            onSelect={handleSelectCard}
            onEdit={handleEditCard}
          />
        </div>
        
        {/* Right Panel: Detail or Editor */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {mode === 'create' ? (
            <CharacterEditor
              cardId={null}
              onClose={() => setMode('view')}
              onSaved={(newId) => {
                // After first save, stay in the editor (edit route) so users can keep saving.
                enterEditMode(newId);
                navigate(`/forge/${newId}/edit`);
              }}
            />
          ) : mode === 'edit' && selectedCardId ? (
            <CharacterEditor
              cardId={selectedCardId}
              onClose={handleExitEdit}
              // Saving should not exit editing; keep the user in-place.
              onSaved={() => {}}
            />
          ) : selectedCardId ? (
            <CharacterDetailPanel
              cardId={selectedCardId}
              onEdit={() => handleEditCard(selectedCardId)}
              onClose={() => handleSelectCard(null)}
            />
          ) : (
            <EmptyState onCreateNew={handleCreateNew} />
          )}
        </div>
      </div>
      
      <ToastContainer />
    </div>
  );
}

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div 
        className="mb-6 text-8xl opacity-20"
        style={{ 
          fontFamily: '"Instrument Serif", Georgia, serif',
          background: 'linear-gradient(135deg, #a78bfa 0%, #60a5fa 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        ⚔
      </div>
      <h2 
        className="mb-3 text-3xl font-bold tracking-tight text-zinc-100"
        style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}
      >
        The Forge Awaits
      </h2>
      <p className="mb-8 max-w-md text-sm leading-relaxed text-zinc-500">
        Select a character from your collection to view their details, 
        or forge a new creation from scratch.
      </p>
      <button
        onClick={onCreateNew}
        className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30"
      >
        <span className="relative z-10">Create New Character</span>
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
      </button>
    </div>
  );
}

