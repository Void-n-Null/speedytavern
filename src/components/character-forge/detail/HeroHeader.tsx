import { useState } from 'react';
import { Copy, Download, Pencil, User, X } from 'lucide-react';
import { Button } from '../../ui/button';

export type HeroHeaderProps = {
  data: {
    name: string;
    specLabel: string;
    hasPng: boolean;
    avatarUrl: string | null;
    creator: string;
    characterVersion: string;
    tags: string[];
  };
  onEdit: () => void;
  onClose: () => void;
  onCopyJson: () => void;
  onExportJson: () => void;
  onExportPng: () => void;
};

export function HeroHeader({
  data,
  onEdit,
  onClose,
  onCopyJson,
  onExportJson,
  onExportPng,
}: HeroHeaderProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="shrink-0 border-b border-zinc-800/50 bg-zinc-950/80 px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-zinc-800 shadow-lg">
            {data.hasPng && data.avatarUrl && !imgError ? (
              <img
                src={data.avatarUrl}
                alt={data.name}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-600">
                <User className="h-6 w-6" />
              </div>
            )}
          </div>

          <div>
            <div className="text-xl font-bold text-zinc-100">{data.name}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[11px]">
                {data.specLabel}
              </span>
              {data.creator && (
                <span className="rounded bg-zinc-900/60 px-2 py-0.5">by {data.creator}</span>
              )}
              {data.characterVersion && (
                <span className="rounded bg-zinc-900/60 px-2 py-0.5">v{data.characterVersion}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onCopyJson}>
            <Copy className="h-4 w-4" />
            Copy
          </Button>
          <Button size="sm" variant="outline" onClick={onExportJson}>
            <Download className="h-4 w-4" />
            JSON
          </Button>
          {data.hasPng && (
            <Button size="sm" variant="outline" onClick={onExportPng}>
              <Download className="h-4 w-4" />
              PNG
            </Button>
          )}
          <Button
            size="sm"
            onClick={onEdit}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <button
            onClick={onClose}
            className="ml-1 rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {data.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-medium text-violet-200"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

