import { useMemo, useState } from 'react';
import type { PlaceWithCandidates, PlacesResponse } from '@invite/shared';
import { FilterMenu } from '../components/FilterMenu.js';
import { PlaceThumb } from '../components/PlaceThumb.js';

interface LibraryProps {
  data: PlacesResponse;
  selection: string[];
  composing: boolean;
  onOpenPlace(place: PlaceWithCandidates): void;
  onPickPlace(place: PlaceWithCandidates): void;
  onAddPlace(): void;
  onPhotoStyle(): void;
}

export function Library({ data, selection, composing, onOpenPlace, onPickPlace, onAddPlace, onPhotoStyle }: LibraryProps) {
  const [district, setDistrict] = useState<string>();
  const [category, setCategory] = useState<string>();
  const [search, setSearch] = useState('');
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return data.places.filter((place) => {
      if (district && place.district !== district) return false;
      if (category && place.category !== category) return false;
      if (needle && !place.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [data.places, district, category, search]);

  return (
    <div className="screen library">
      <header className="library__head">
        <h1 className="library__title">Locations</h1>
        {!composing && (
          <div className="library__tools">
          <button type="button" className="library__photo-style" onClick={onPhotoStyle}>Стиль фото</button>
          <button type="button" className="library__add" aria-label="Добавить место вручную"
            title="Добавить место вручную" onClick={onAddPlace}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
          </div>
        )}
      </header>
      <div className="filters">
        <input className="field" type="search" aria-label="Поиск по названию" placeholder="Поиск по названию"
          value={search} onChange={(event) => setSearch(event.target.value)} />
        <div className="filter-row">
          <FilterMenu label="Район" options={data.facets.districts} value={district} onChange={setDistrict} />
          <FilterMenu label="Категории" options={data.facets.categories} value={category} onChange={setCategory} />
        </div>
      </div>
      {visible.length === 0 && <p className="empty">{data.places.length === 0
        ? 'Пока ничего нет. Перешлите боту пост про место или пришлите ссылку с Карт.'
        : 'Под эти фильтры ничего не подошло.'}</p>}
      <ul className="place-grid">
        {visible.map((place) => {
          const index = selection.indexOf(place.id);
          const picked = index >= 0;
          const resolved = place.enrichment_status === 'resolved';
          return (
            <li key={place.id} className={`place-card${picked ? ' place-card--picked' : ''}`}>
              <div className={`place-card__visual${composing ? ' place-card__visual--composing' : ''}`}>
              <button type="button" className="place-card__photo" aria-label={`Открыть ${place.name}`} onClick={() => onOpenPlace(place)}>
                <PlaceThumb src={place.photo_url} name={place.name} seed={place.id} size="lg" />
              </button>
                {composing && (
                  <button type="button" className={`place-card__pick${picked ? ' place-card__pick--on' : ''}`}
                    disabled={!resolved} aria-label={resolved ? `${picked ? 'Изменить заметку' : 'Добавить в конверт'} — ${place.name}` : `Сначала подтвердите ${place.name}`}
                    aria-pressed={picked} onClick={() => onPickPlace(place)}>
                    {picked ? <span>{index + 1}</span> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>}
                  </button>
                )}
              </div>
              <div className="place-card__bottom">
                <button type="button" className="place-card__identity" onClick={() => onOpenPlace(place)}>
                  <span className="place-card__name">{place.name}</span>
                  <span className="place-card__address">{place.address || place.district || 'без адреса'}</span>
                </button>

              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
