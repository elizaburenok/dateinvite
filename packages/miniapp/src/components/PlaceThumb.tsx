/** The placeholder color is derived from the place, as on the guest page. */
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
  const previewSrc = src ?? (import.meta.env.DEV ? demoPhotos[hueOf(seed) % demoPhotos.length] : null);
  if (previewSrc) {
    return <img className={className} src={previewSrc} alt="" loading="lazy" aria-hidden="true" />;
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
import terracePhoto from '../assets/place-previews/moscow-terrace.png';
import cafePhoto from '../assets/places-feed/preview-first.jpg';
import restaurantPhoto from '../assets/places-feed/preview-second.png';

const demoPhotos = [terracePhoto, cafePhoto, restaurantPhoto];
