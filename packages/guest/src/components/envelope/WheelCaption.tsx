import { useLayoutEffect, useRef } from 'react';

/** Composite the outline and glyphs before the wheel applies perspective;
 * separate SVG layers can intersect in mobile 3D compositors. */
export function WheelCaption({ name, visible }: { name: string; visible: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    if (!visible) return;
    let disposed = false;
    const draw = () => {
      const canvas = canvasRef.current;
      if (disposed || !canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const style = getComputedStyle(canvas);
      const token = (name: string) => style.getPropertyValue(name).trim();
      const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      // Preserve the established line breaks while rendering captions at 32px.
      ctx.font = `${style.fontWeight} 44px ${style.fontFamily}`;
      ctx.letterSpacing = '-0.88px';
      ctx.textAlign = 'left';
      const padding = 24;
      const slotWidth = canvas.parentElement?.parentElement?.clientWidth ?? 0;
      if (slotWidth <= 0) return;
      // Wrap rather than scaling all titles down to fit the longest name.
      const maxWidth = Math.max(44, slotWidth - 32);
      const lines: string[] = [];
      let line = '';
      for (const word of name.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width <= maxWidth) { line = next; continue; }
        if (line) lines.push(line);
        line = '';
        for (const character of Array.from(word)) {
          if (line && ctx.measureText(line + character).width > maxWidth) {
            lines.push(line);
            line = '';
          }
          line += character;
        }
      }
      if (line) lines.push(line);
      if (!lines.length) lines.push('');
      ctx.font = font;
      ctx.letterSpacing = style.letterSpacing;
      const metrics = lines.map((text) => ctx.measureText(text));
      const ascent = Math.max(...metrics.map((m) => m.actualBoundingBoxAscent));
      const descent = Math.max(...metrics.map((m) => m.actualBoundingBoxDescent));
      const width = Math.ceil(Math.max(...metrics.map((m) => Math.max(m.width, m.actualBoundingBoxRight) + Math.max(0, m.actualBoundingBoxLeft))) + padding * 2);
      // Keep the established caption size and spacing.
      const lineHeight = 30;
      const height = Math.ceil(ascent + descent + (lines.length - 1) * lineHeight + padding * 2);
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.ceil(width * ratio);
      canvas.height = Math.ceil(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(ratio, ratio);
      ctx.font = font;
      ctx.letterSpacing = style.letterSpacing;
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';

      // Build the shadow from the complete outside contour. Its source is drawn
      // off-canvas: erasing a black source in-place leaves a dark antialias seam.
      const silhouette = document.createElement('canvas');
      silhouette.width = canvas.width;
      silhouette.height = canvas.height;
      const mask = silhouette.getContext('2d');
      if (!mask) return;
      mask.scale(ratio, ratio);
      mask.font = font;
      mask.letterSpacing = style.letterSpacing;
      mask.textAlign = 'center';
      mask.lineJoin = 'round';
      mask.lineWidth = 16;
      mask.strokeStyle = 'rgb(0 0 0 / 23%)';
      lines.forEach((text, i) => {
        const y = padding + ascent + i * lineHeight;
        mask.strokeText(text, width / 2, y);
        mask.fillText(text, width / 2, y);
      });
      // The exported Figma filter saturates SourceAlpha by 127 before blur
      // and subtraction. Reuse that mask so the edge cannot form a dark seam.
      const hardAlpha = mask.getImageData(0, 0, silhouette.width, silhouette.height);
      for (let i = 3; i < hardAlpha.data.length; i += 4) {
        hardAlpha.data[i] = Math.min(255, hardAlpha.data[i]! * 127);
      }
      mask.putImageData(hardAlpha, 0, 0);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.shadowColor = '#dad1a1';
      ctx.shadowBlur = 8.0101 * ratio;
      const shadowSourceOffset = canvas.width + 48 * ratio;
      ctx.shadowOffsetX = shadowSourceOffset;
      ctx.shadowOffsetY = 0.6387 * ratio;
      ctx.drawImage(silhouette, -shadowSourceOffset, 0);
      ctx.shadowColor = 'transparent';
      // Match Figma's showShadowBehindNode=false without painting the source.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(silhouette, 0, 0);
      ctx.restore();

      // Figma draws an 8px outside gradient stroke at 23% opacity.
      const gradient = ctx.createLinearGradient(0, height, width, 0);
      gradient.addColorStop(0.27885, 'rgb(252 237 153 / 23%)');
      gradient.addColorStop(0.63462, 'rgb(255 215 176 / 23%)');
      gradient.addColorStop(1, 'rgb(249 177 179 / 23%)');
      ctx.strokeStyle = gradient;
      // Canvas centres strokes: 16px gives an 8px outside outline.
      ctx.lineWidth = 16;
      lines.forEach((text, i) => ctx.strokeText(text, width / 2, padding + ascent + i * lineHeight));
      ctx.fillStyle = token('--wheel-caption-fill');
      lines.forEach((text, i) => ctx.fillText(text, width / 2, padding + ascent + i * lineHeight));
    };
    draw();
    void document.fonts.ready.then(draw);
    document.fonts.addEventListener('loadingdone', draw);
    const observer = new ResizeObserver(draw);
    const slot = canvasRef.current?.parentElement?.parentElement;
    if (slot) observer.observe(slot);
    return () => {
      disposed = true;
      document.fonts.removeEventListener('loadingdone', draw);
      observer.disconnect();
    };
  }, [name, visible]);

  return (
    <h2 className="wheel__caption">
      <span className="visually-hidden">{name}</span>
      <canvas ref={canvasRef} aria-hidden="true" />
    </h2>
  );
}
