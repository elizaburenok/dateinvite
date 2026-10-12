import type { GuestPlace } from '@invite/shared';
import { PhotoFrame } from './PhotoFrame.js';
import { SelectedPlaceHeading } from './SelectedPlaceHeading.js';
import backCircleUrl from '../assets/back-circle.svg';

interface SelectedPlaceProps {
  place: GuestPlace;
  sending: boolean;
  onBack(): void;
}

export function SelectedPlace({ place, sending, onBack }: SelectedPlaceProps) {
  return (
    <section className="selected-place" aria-label={place.name}>
      <button type="button" className="selected-place__back" onClick={onBack}
        disabled={sending} aria-label="Вернуться ко всем местам">
        <img src={backCircleUrl} width="44" height="44" alt="" aria-hidden="true" />
      </button>
      <SelectedPlaceHeading name={place.name} address={place.address || place.district} />
      <div className="selected-place__card">
        <div className="selected-place__photo">
          <PhotoFrame key={place.id} photos={place.photos.slice(0, 1)} alt={place.name}
            seed={place.id} category={place.category} />
        </div>
        {place.note && (
          <div className="selected-place__caption">
            <h2>Note</h2>
            <p>{place.note}</p>
          </div>
        )}
      </div>
    </section>
  );
}
