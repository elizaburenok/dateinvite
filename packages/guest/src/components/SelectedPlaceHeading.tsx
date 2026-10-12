import { useId, useLayoutEffect, useRef, useState } from 'react';

/** Live text with the wheel's gradient outline, sized for the detail screen. */
export function SelectedPlaceHeading({ name, address }: { name: string; address: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const gradientId = useId();
  const [lines, setLines] = useState<string[]>([]);

  useLayoutEffect(() => {
    let disposed = false;
    const measure = () => {
      if (disposed || !ref.current) return;
      const ctx = document.createElement('canvas').getContext('2d');
      if (!ctx) return;
      const style = getComputedStyle(ref.current);
      ctx.font = `500 28px ${style.fontFamily}`;
      ctx.letterSpacing = '-0.56px';
      const wrap = (text: string, width: number) => {
        const rows: string[] = [];
        let row = '';
        for (const word of text.trim().split(/\s+/)) {
          const next = row ? `${row} ${word}` : word;
          if (row && ctx.measureText(next).width > width) {
            rows.push(row);
            row = '';
          }
          // Keep unbroken names within the available width, too.
          for (const char of (row ? ` ${word}` : word)) {
            if (row && ctx.measureText(row + char).width > width) {
              rows.push(row);
              row = '';
            }
            row += char;
          }
        }
        if (row) rows.push(row);
        return rows;
      };
      setLines([...wrap(name, 180), ...(address ? wrap(address, 175) : [])]);
    };
    measure();
    void document.fonts.ready.then(measure);
    document.fonts.addEventListener('loadingdone', measure);
    return () => {
      disposed = true;
      document.fonts.removeEventListener('loadingdone', measure);
    };
  }, [name, address]);

  const height = Math.max(1, lines.length) * 28 + 32;
  return (
    <div ref={ref} className="selected-place__heading">
      <h1 className="visually-hidden">{name}</h1>
      {address && <p className="visually-hidden">{address}</p>}
      <svg width="220" height={height} viewBox={`0 0 220 ${height}`} aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="27.885%" stopColor="#fced99" />
            <stop offset="63.462%" stopColor="#ffd7b0" />
            <stop offset="100%" stopColor="#f9b1b3" />
          </linearGradient>
        </defs>
        <g fill="none" stroke={`url(#${gradientId})`} strokeWidth="16" strokeLinejoin="round" opacity="0.23">
          {lines.map((line, i) => <text key={i} x="110" y={39 + i * 28}>{line}</text>)}
        </g>
        <g fill="#4e4e4e">
          {lines.map((line, i) => <text key={i} x="110" y={39 + i * 28}>{line}</text>)}
        </g>
      </svg>
    </div>
  );
}
