import { MAX_PHOTO_PIXELS, type HalftoneSettings } from '@invite/shared';

export async function loadPhoto(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = src;
  await image.decode();
  if (image.naturalWidth * image.naturalHeight > MAX_PHOTO_PIXELS) throw new Error('Выберите фото до 40 мегапикселей');
  return image;
}

export function processPhoto(image: HTMLImageElement, settings: HalftoneSettings, preview: boolean, signal?: AbortSignal): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const scale = preview ? Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight)) : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('Браузер не поддерживает обработку фото')); return; }
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const worker = new Worker(new URL('./halftone.worker.ts', import.meta.url), { type: 'module' });
    const cleanup = () => { worker.terminate(); signal?.removeEventListener('abort', abort); };
    const abort = () => { cleanup(); reject(new DOMException('Отменено', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    worker.onmessage = (event: MessageEvent<{ pixels: Uint8ClampedArray<ArrayBuffer>; error?: string }>) => {
      cleanup();
      if (event.data.error) { reject(new Error(event.data.error)); return; }
      ctx.putImageData(new ImageData(event.data.pixels, canvas.width, canvas.height), 0, 0);
      resolve(canvas);
    };
    worker.onerror = () => { cleanup(); reject(new Error('Не удалось обработать фото')); };
    worker.postMessage({ pixels: data.data, width: canvas.width, height: canvas.height, settings, scale }, [data.data.buffer]);
  });
}

export function canvasPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Не удалось создать PNG')), 'image/png'));
}
