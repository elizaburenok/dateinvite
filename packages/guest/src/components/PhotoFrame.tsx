import { useState } from 'react';

interface PhotoFrameProps {
  photos: string[];
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
 * Фото — верх иерархии карточки (§11). Их может быть несколько: пост о месте редко
 * состоит из одного кадра, а выбирать, куда поехать, по одной картинке неудобно.
 * Листание живёт внутри рамки и не задевает выбор места.
 *
 * Если фото нет вовсе — тянуть картинки с Яндекс.Карт нам нельзя, поэтому вместо
 * серой дыры спокойная заливка, выведенная из самого места: она хотя бы не врёт.
 *
 * Поверх кадра лежит затемняющий слой: весь текст карточки набран по фотографии,
 * а она приходит из поста и может оказаться какой угодно светлой. Слой есть и у
 * заглушки — там текст точно так же лежит поверх заливки.
 */
export function PhotoFrame({ photos, alt, seed, category }: PhotoFrameProps) {
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    const hue = hueOf(seed);
    return (
      <div
        className="photo photo--empty"
        style={{ '--placeholder-hue': hue } as React.CSSProperties}
        role="img"
        aria-label={`${alt}, фото нет`}
      >
        <span className="photo__glyph" aria-hidden="true">
          {category ?? 'Место'}
        </span>
        <div className="photo__scrim" aria-hidden="true" />
      </div>
    );
  }

  const current = Math.min(index, photos.length - 1);

  return (
    <div className="photo">
      {photos.map((src, i) => (
        <img
          key={src}
          className={`photo__img${i === current ? ' photo__img--on' : ''}`}
          src={src}
          alt={i === 0 ? alt : ''}
          aria-hidden={i === current ? undefined : true}
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding="async"
        />
      ))}

      <div className="photo__scrim" aria-hidden="true" />

      {photos.length > 1 && (
        <div className="photo__dots">
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              className={`photo__dot${i === current ? ' photo__dot--on' : ''}`}
              aria-label={`Фото ${i + 1} из ${photos.length}`}
              aria-current={i === current}
              // Карточка целиком — кнопка выбора места, поэтому листание
              // обязано остановить всплытие, иначе выберет заодно и место.
              onClick={(event) => {
                event.stopPropagation();
                setIndex(i);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
