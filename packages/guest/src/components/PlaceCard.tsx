import type { GuestPlace } from '@invite/shared';
import { PhotoFrame } from './PhotoFrame.js';

interface PlaceCardProps {
  place: GuestPlace;
  selected: boolean;
  /** Просмотр без выбора: конверт уже отвечен или истёк. */
  readOnly: boolean;
  onSelect(id: string): void;
}

/**
 * Карточка-афиша по макету: фотография во всю плоскость, жёлтая кромка, а весь
 * текст лежит поверх кадра. Название с адресом — в левом нижнем углу, реплика
 * хоста — в правом верхнем, по диагонали от них; между ними градиент, который
 * затемняет ровно те два угла, где стоит текст.
 *
 * Категория, рейтинг и ссылка на карты с карточки ушли: место выбирают по кадру
 * и по тому, что о нём сказал хост, а звёздочки — это уже справочник. Адрес
 * написан на самом кадре, и отдельной ссылки на карты на гостевой странице нет.
 *
 * Печати поверх кадра больше нет: выбранная карточка вырастает, наклоняется и
 * получает свою тень — этого хватает, а штамп закрывал ровно тот кадр, ради
 * которого место и выбирают. Для скринридера выбор остаётся в aria-pressed и в
 * подписи кнопки-подложки.
 *
 * Выбор живёт в кнопке-подложке, а не в обёртке всей карточки: внутри есть свои
 * интерактивные элементы (листание фото), а кнопку в кнопку вкладывать нельзя.
 * Подложка лежит ниже них по z-index, поэтому клик по точке до выбора не доходит.
 */
export function PlaceCard({ place, selected, readOnly, onSelect }: PlaceCardProps) {
  // У мест, заведённых до появления адреса в гостевом ответе, он пустой —
  // тогда вторую строку держит район, лишь бы она не пропала вовсе.
  const where = place.address || place.district;

  return (
    <article
      className={`card${readOnly ? '' : ' card--pickable'}${selected ? ' card--chosen' : ''}`}
    >
      <PhotoFrame
        photos={place.photos}
        alt={place.name}
        seed={place.id}
        category={place.category}
      />

      {/* Заметка хоста временно снята с карточки — её новую подачу собираем
          отдельно. Сам текст (place.note) остаётся в данных ответа. */}

      <div className="card__body">
        <h2 className="card__name">{place.name}</h2>
        {where && <p className="card__address">{where}</p>}
      </div>

      {!readOnly && (
        <button
          type="button"
          className="card__pick"
          aria-pressed={selected}
          onClick={() => onSelect(place.id)}
        >
          <span className="visually-hidden">
            {selected ? `${place.name} — выбрано` : `Выбрать ${place.name}`}
          </span>
        </button>
      )}
    </article>
  );
}
