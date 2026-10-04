import type { GuestPlace } from '@invite/shared';
import { PhotoFrame } from './PhotoFrame.js';
import letsGoUrl from '../assets/lets-go.svg';
import backCircleUrl from '../assets/back-circle.svg';

interface SelectedPlaceProps {
  place: GuestPlace;
  composing: boolean;
  onCompose(): void;
  onBack(): void;
}

export function SelectedPlace({ place, composing, onCompose, onBack }: SelectedPlaceProps) {
  const address = place.address || place.district;
  return (
    <section className="selected-place" data-composing={composing || undefined} aria-label={place.name}>
      <button type="button" className="selected-place__back" onClick={onBack}
        aria-label="Вернуться ко всем местам">
        <img src={backCircleUrl} width="44" height="44" alt="" aria-hidden="true" />
      </button>
      <p className="selected-place__text">
        <span className="selected-place__identity">
          <span className="selected-place__name">{place.name}</span>
          {address && <span className="selected-place__address">{address}</span>}
        </span>{place.note && <span className="selected-place__note">{place.note}</span>}
      </p>

      <div className="selected-place__actions">
      {!composing && (
        <button
          type="button"
          className="selected-place__go"
          aria-label={`Let’s go — ${place.name}`}
          aria-controls="guest-message"
          aria-expanded={false}
          onClick={onCompose}
        >
          <PhotoFrame
            key={place.id}
            photos={place.photos.slice(0, 1)}
            alt=""
            seed={place.id}
            category={place.category}
          />
          <img className="selected-place__go-label" src={letsGoUrl} alt="" aria-hidden="true" />
        </button>
      )}
      </div>
    </section>
  );
}
