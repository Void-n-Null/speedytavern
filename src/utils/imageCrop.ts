export type CropPixels = { x: number; y: number; width: number; height: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    // We only ever feed this with object URLs or same-origin URLs.
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Failed to export canvas'));
        else resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

export async function cropImageToBlob(opts: {
  imageSrc: string;
  crop: CropPixels;
  outputWidth?: number; // if omitted, uses crop width
  mimeType?: string; // default image/png
  quality?: number; // used for lossy formats only
}): Promise<Blob> {
  const { imageSrc, crop, outputWidth, mimeType = 'image/png', quality } = opts;
  const img = await loadImage(imageSrc);

  const outW = Math.max(1, Math.round(outputWidth ?? crop.width));
  const outH = Math.max(1, Math.round(outW * (crop.height / crop.width)));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Draw selected crop region into the output canvas
  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outW,
    outH
  );

  return await canvasToBlob(canvas, mimeType, quality);
}






