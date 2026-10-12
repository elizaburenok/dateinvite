import { renderHalftone, type HalftoneSettings } from '@invite/shared';

self.onmessage = (event: MessageEvent<{ pixels: Uint8ClampedArray; width: number; height: number; settings: HalftoneSettings; scale: number }>) => {
  try {
    const { pixels, width, height, settings, scale } = event.data;
    const result = renderHalftone(pixels, width, height, settings, scale);
    self.postMessage({ pixels: result, width, height }, { transfer: [result.buffer] });
  } catch {
    self.postMessage({ error: 'Не удалось обработать изображение' });
  }
};
