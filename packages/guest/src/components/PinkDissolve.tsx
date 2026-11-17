import { useEffect, useRef } from 'react';

/** A photographic halftone assembled from independently timed pink dots. */
export function PinkDissolve() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const card = canvas?.closest('.card');
    const photo = canvas?.parentElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !card || !photo || !context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let progress = 0;
    let target = 0;
    let frame = 0;
    let previousTime = 0;
    let delays: number[] = [];
    let tones: number[] = [];
    const cellSize = 5;

    function samplePhoto() {
      if (!photo || !width || !height) return;
      const columns = Math.ceil(width / cellSize);
      const rows = Math.ceil(height / cellSize);
      const image = photo.querySelector<HTMLImageElement>('.photo__img--on');
      tones = Array(columns * rows).fill(0.5);
      if (!image?.complete || !image.naturalWidth) return;

      const sample = document.createElement('canvas');
      sample.width = columns;
      sample.height = rows;
      const sampleContext = sample.getContext('2d', { willReadFrequently: true });
      if (!sampleContext) return;
      const fit = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const drawnWidth = image.naturalWidth * fit;
      const drawnHeight = image.naturalHeight * fit;
      sampleContext.drawImage(
        image,
        (width - drawnWidth) * columns / (2 * width),
        (height - drawnHeight) * rows / (2 * height),
        drawnWidth * columns / width,
        drawnHeight * rows / height,
      );
      try {
        const pixels = sampleContext.getImageData(0, 0, columns, rows).data;
        tones = tones.map((_, index) => {
          const offset = index * 4;
          return ((pixels[offset] ?? 0) * 0.2126 + (pixels[offset + 1] ?? 0) * 0.7152 + (pixels[offset + 2] ?? 0) * 0.0722) / 255;
        });
      } catch {
        // External photos may disallow pixel reads; the dotted texture still
        // appears over the photograph with a neutral dot size.
      }
    }

    function shuffleDots() {
      const columns = Math.ceil(width / cellSize);
      const rows = Math.ceil(height / cellSize);
      delays = Array.from({ length: columns * rows }, () => Math.random() * 0.55);
      samplePhoto();
    }

    function draw() {
      if (!context || !canvas) return;
      context.clearRect(0, 0, width, height);
      if (progress <= 0) return;

      // The pale paper arrives after the first dots. At full hover the photo
      // is represented chiefly by dot sizes instead of a flat pink wash.
      context.fillStyle = `rgba(255, 246, 251, ${Math.pow(progress, 3) * 0.88})`;
      context.fillRect(0, 0, width, height);

      const columns = Math.ceil(width / cellSize);
      const rows = Math.ceil(height / cellSize);
      context.fillStyle = '#f72c9e';
      context.beginPath();
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const x = column * cellSize;
          const y = row * cellSize;
          const index = row * columns + column;
          const delay = delays[index] ?? 0;
          const phase = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
          if (!phase) continue;
          const darkness = 1 - (tones[index] ?? 0.5);
          const radius = (0.65 + darkness * 1.6) * phase;
          const centerX = x + cellSize * 0.5;
          const centerY = y + cellSize * 0.5;
          context.moveTo(centerX + radius, centerY);
          context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        }
      }
      context.fill();
    }

    function resize() {
      if (!canvas || !photo || !context) return;
      // Layout pixels, not transformed screen bounds: wheel faces are scaled
      // and tilted in 3D, while the canvas is painted in the photo's own space.
      width = photo.clientWidth;
      height = photo.clientHeight;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      shuffleDots();
      draw();
    }

    function tick(time: number) {
      const delta = previousTime ? Math.min(time - previousTime, 40) : 16;
      previousTime = time;
      progress = Math.max(0, Math.min(1, progress + (target ? 1 : -1) * delta / 620));
      draw();
      if (progress !== target) frame = requestAnimationFrame(tick);
      else { frame = 0; previousTime = 0; }
    }

    function setTarget(next: number) {
      target = next;
      if (reducedMotion.matches) {
        progress = target;
        draw();
        return;
      }
      if (next === 1 && progress === 0) shuffleDots();
      if (!frame) frame = requestAnimationFrame(tick);
    }

    const onEnter = () => setTarget(1);
    const onLeave = () => setTarget(0);
    const observer = new ResizeObserver(resize);
    observer.observe(photo);
    photo.addEventListener('load', resize, true);
    resize();
    card.addEventListener('pointerenter', onEnter);
    card.addEventListener('pointerleave', onLeave);
    return () => {
      observer.disconnect();
      photo.removeEventListener('load', resize, true);
      card.removeEventListener('pointerenter', onEnter);
      card.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} className="photo__pink-dissolve" aria-hidden="true" />;
}
