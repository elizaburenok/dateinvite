/** Та же логика заглушки, что и на гость-странице: цвет выводится из места. */
function hueOf(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  return hash;
}

interface PlaceThumbProps {
  src: string | null;
  name: string;
  seed: string;
  size?: 'sm' | 'lg';
}

export function PlaceThumb({ src, name, seed, size = 'sm' }: PlaceThumbProps) {
  const className = `thumb thumb--${size}`;
  if (src) {
    return <img className={className} src={src} alt="" loading="lazy" aria-hidden="true" />;
  }
  return (
    <div
      className={`${className} thumb--empty`}
      style={{ '--placeholder-hue': hueOf(seed) } as React.CSSProperties}
      aria-hidden="true"
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
