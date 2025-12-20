import { useMemo, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Slider } from '../../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { cropImageToBlob } from '../../../utils/imageCrop';

type AspectPreset = { id: 'square' | 'portrait' | 'landscape'; label: string; value: number };
const ASPECTS: AspectPreset[] = [
  { id: 'square', label: 'Square', value: 1 },
  { id: 'portrait', label: 'Portrait', value: 3 / 4 },
  { id: 'landscape', label: 'Landscape', value: 4 / 3 },
];

const OUTPUT_WIDTHS = [256, 512, 768, 1024] as const;

interface AvatarCropDialogProps {
  open: boolean;
  imageUrl: string;
  fileName: string;
  onCancel: () => void;
  onUseOriginal: () => void;
  onApply: (file: File) => void | Promise<void>;
}

export function AvatarCropDialog({
  open,
  imageUrl,
  fileName,
  onCancel,
  onUseOriginal,
  onApply,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectId, setAspectId] = useState<AspectPreset['id']>('square');
  const [outputWidth, setOutputWidth] = useState<(typeof OUTPUT_WIDTHS)[number]>(512);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const aspect = useMemo(() => ASPECTS.find((a) => a.id === aspectId)?.value ?? 1, [aspectId]);

  const applyCrop = async () => {
    if (!croppedAreaPixels) return;
    setIsWorking(true);
    try {
      const blob = await cropImageToBlob({
        imageSrc: imageUrl,
        crop: {
          x: croppedAreaPixels.x,
          y: croppedAreaPixels.y,
          width: croppedAreaPixels.width,
          height: croppedAreaPixels.height,
        },
        outputWidth,
        mimeType: 'image/png',
      });
      const out = new File([blob], fileName.replace(/\.\w+$/, '') + '.png', { type: 'image/png' });
      await Promise.resolve(onApply(out));
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="p-0">
        <DialogHeader>
          <DialogTitle>Crop Avatar</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
          <div className="relative h-[420px] w-full overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-950">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              objectFit="horizontal-cover"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <div className="text-xs font-medium text-zinc-300">Zoom</div>
              <div className="mt-2">
                <Slider
                  value={[zoom]}
                  min={1}
                  max={4}
                  step={0.02}
                  onValueChange={(v) => setZoom(v[0] ?? 1)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <div className="text-xs font-medium text-zinc-300">Aspect</div>
                <div className="mt-2 flex gap-2">
                  {ASPECTS.map((a) => (
                    <Button
                      key={a.id}
                      size="sm"
                      variant={aspectId === a.id ? 'default' : 'outline'}
                      onClick={() => setAspectId(a.id)}
                      disabled={isWorking}
                      className={aspectId === a.id ? 'bg-violet-600 text-white' : ''}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-zinc-300">Output width</div>
                <div className="mt-2">
                  <Select
                    value={String(outputWidth)}
                    onValueChange={(v) => setOutputWidth(Number(v) as any)}
                    disabled={isWorking}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTPUT_WIDTHS.map((w) => (
                        <SelectItem key={w} value={String(w)}>
                          {w}px
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-zinc-800/50 bg-zinc-950/60">
          <Button variant="outline" onClick={onCancel} disabled={isWorking}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onUseOriginal} disabled={isWorking}>
            Use original
          </Button>
          <Button onClick={applyCrop} disabled={isWorking || !croppedAreaPixels} className="bg-violet-600 text-white">
            {isWorking ? 'Working…' : 'Apply crop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}






