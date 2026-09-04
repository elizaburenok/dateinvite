import { useRef } from 'react';
import type { GuestPlace } from '@invite/shared';
import { PlaceCard } from '../PlaceCard.js';
import { useDeckMetrics, useStackProgress } from './useStackProgress.js';
import type { EnvelopeState } from './Envelope.js';

interface CardStackProps {
  places: GuestPlace[];
  selected: string | null;
  readOnly: boolean;
  state: EnvelopeState;
  onSelect(id: string): void;
}

/**
 * Стопка карточек: сложенная колода, которая расслаивается в список по скроллу.
 *
 * Карточки лежат абсолютно друг на друге, поэтому здесь два вложенных слоя
 * трансформов. Внешний (`deck__item`) отвечает за место карточки в стопке и ходит
 * за скроллом без transition — иначе список отставал бы от пальца. Внутренний
 * (`deck__card`) отвечает за выезд из конверта и как раз анимируется по таймеру.
 */
export function CardStack({ places, selected, readOnly, state, onSelect }: CardStackProps) {
  const deckRef = useRef<HTMLDivElement>(null);
  const dealt = state === 'dealing' || state === 'open';

  useDeckMetrics(deckRef, places.length);
  useStackProgress(deckRef, state === 'open');

  return (
    <div className="deck" ref={deckRef} data-dealt={dealt || undefined}>
      {places.map((place, index) => (
        <div
          key={place.id}
          className="deck__item"
          style={
            {
              '--i': index,
              // Ненулевой наклон только у нижних карт: верхняя лежит ровно,
              // иначе стопка читается не колодой, а рассыпанной пачкой.
              '--tilt': `${index === 0 ? 0 : (index % 2 === 0 ? 1 : -1) * (1 + index * 0.35)}deg`,
              // Порядок колоды: верхняя карточка выше всех. Через переменную,
              // а не через zIndex напрямую, — инлайн-стиль перебил бы ховер.
              '--z': places.length - index,
            } as React.CSSProperties
          }
        >
          <div className="deck__card">
            <PlaceCard
              place={place}
              selected={selected === place.id}
              readOnly={readOnly}
              onSelect={onSelect}
            />
            {/* В сложенной колоде от карточки видно только фотополосу, а по одной
                фотографии место не узнать. Подпись живёт поверх неё и гаснет,
                как только карточка раскрылась и показала своё название сама. */}
            <div className="deck__spine" aria-hidden="true">
              <span className="deck__spine-name">{place.name}</span>
              {(place.address || place.district) && (
                <span className="deck__spine-meta">{place.address || place.district}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
