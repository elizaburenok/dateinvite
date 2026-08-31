import type { GuestPlace } from '@invite/shared';
import { PhotoFrame } from './PhotoFrame.js';
import { WaxSeal } from './WaxSeal.js';

interface PlaceCardProps {
  place: GuestPlace;
  selected: boolean;
  /** Просмотр без выбора: конверт уже отвечен или истёк. */
  readOnly: boolean;
  onSelect(id: string): void;
}

/**
 * Иерархия ровно по §11: фото → название + район → пометка хоста.
 * Категория, рейтинг и ссылка на карты — вторичны и уезжают в подвал карточки.
 */
export function PlaceCard({ place, selected, readOnly, onSelect }: PlaceCardProps) {
  const meta = [place.category, place.rating ? `★ ${place.rating.toFixed(1)}` : null]
    .filter(Boolean)
    .join(' · ');

  const body = (
    <>
      <PhotoFrame
        src={place.photo_url}
        alt={place.name}
        seed={place.id}
        category={place.category}
      />

      <div className="card__body">
        <h2 className="card__name">{place.name}</h2>
        {place.district && <p className="card__district">{place.district}</p>}
        {place.note && <p className="card__note">{place.note}</p>}

        {(meta || place.maps_url) && (
          <div className="card__foot">
            {meta && <span className="meta">{meta}</span>}
            {place.maps_url && (
              <a
                className="card__maps"
                href={place.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                // Клик по ссылке не должен заодно выбирать место.
                onClick={(event) => event.stopPropagation()}
              >
                На карте
              </a>
            )}
          </div>
        )}
      </div>

      <span className={`card__seal${selected ? ' card__seal--on' : ''}`}>
        <WaxSeal size={38} checked={selected} />
      </span>
    </>
  );

  if (readOnly) {
    return <article className={`card${selected ? ' card--chosen' : ''}`}>{body}</article>;
  }

  return (
    <button
      type="button"
      className={`card card--pickable${selected ? ' card--chosen' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(place.id)}
    >
      {body}
    </button>
  );
}
