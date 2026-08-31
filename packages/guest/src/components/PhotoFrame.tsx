interface PhotoFrameProps {
  src: string | null;
  alt: string;
  /** Из чего лепить заглушку, когда фото нет. */
  seed: string;
  category: string | null;
}

/** Стабильный хеш строки: одно и то же место всегда получает один и тот же оттенок. */
function hueOf(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}

/**
 * Фото — верх иерархии карточки (§11). Но у поста фото может и не быть,
 * а тянуть картинки с Яндекс.Карт нам нельзя. Поэтому вместо серой дыры —
 * спокойная заливка, выведенная из самого места: она хотя бы не врёт.
 */
export function PhotoFrame({ src, alt, seed, category }: PhotoFrameProps) {
  if (src) {
    return (
      <div className="photo">
        <img className="photo__img" src={src} alt={alt} loading="lazy" decoding="async" />
      </div>
    );
  }

  const hue = hueOf(seed);
  return (
    <div
      className="photo photo--empty"
      style={{ '--placeholder-hue': hue } as React.CSSProperties}
      role="img"
      aria-label={category ? `${alt}, фото нет` : `${alt}, фото нет`}
    >
      <span className="photo__glyph" aria-hidden="true">
        {category ?? 'Место'}
      </span>
    </div>
  );
}
