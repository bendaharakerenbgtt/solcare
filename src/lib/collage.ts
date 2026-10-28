// Client-side photo processing: resize + compress 4 photos and compose a 2x2 collage.
// Runs entirely in the browser (canvas). No upload happens here.

export const COLLAGE_TILE = 800; // px per tile -> 1600x1600 collage
export const MAX_INPUT_BYTES = 20 * 1024 * 1024;
export const ACCEPTED_INPUT = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export function validateInputFile(f: File): string | null {
  if (!f.type.startsWith('image/')) return `${f.name}: bukan file gambar.`;
  if (f.size > MAX_INPUT_BYTES) return `${f.name}: ukuran melebihi 20 MB.`;
  return null;
}

async function loadImage(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    } catch {
      /* fall through */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawCover(ctx: CanvasRenderingContext2D, img: ImageBitmap | HTMLImageElement, x: number, y: number, size: number) {
  const w = 'naturalWidth' in img ? img.naturalWidth : img.width;
  const h = 'naturalHeight' in img ? img.naturalHeight : img.height;
  const scale = Math.max(size / w, size / h);
  const sw = size / scale;
  const sh = size / scale;
  ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh, x, y, size, size);
}

export interface CollageOptions {
  labels: string[];
  caption: string;
  footer: string;
  quality?: number;
}

export async function buildCollage(files: File[], opts: CollageOptions): Promise<{ blob: Blob; width: number; height: number }> {
  if (files.length !== 4) throw new Error('Pilih tepat 4 foto.');
  const size = COLLAGE_TILE;
  const gap = 8;
  const header = opts.caption ? 64 : 0;
  const footerH = 40;
  const W = size * 2 + gap * 3;
  const H = size * 2 + gap * 3 + header + footerH;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser tidak mendukung canvas.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  if (header) {
    ctx.fillStyle = '#001b3a';
    ctx.fillRect(0, 0, W, header);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 30px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.caption, 24, header / 2);
  }

  for (let i = 0; i < 4; i++) {
    const img = await loadImage(files[i]);
    const x = gap + (i % 2) * (size + gap);
    const y = header + gap + Math.floor(i / 2) * (size + gap);
    drawCover(ctx, img, x, y, size);
    if ('close' in img) img.close();
    const label = opts.labels[i]?.trim();
    if (label) {
      ctx.font = '600 26px system-ui, sans-serif';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x + 12, y + 12, tw + 24, 42);
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + 24, y + 33);
    }
  }

  ctx.fillStyle = '#475569';
  ctx.font = '20px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.footer, 24, H - footerH / 2);

  let quality = opts.quality ?? 0.82;
  let blob: Blob | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
    if (blob && blob.size <= 1.5 * 1024 * 1024) break;
    quality -= 0.12;
  }
  if (!blob) throw new Error('Gagal membuat kolase.');
  return { blob, width: W, height: H };
}
