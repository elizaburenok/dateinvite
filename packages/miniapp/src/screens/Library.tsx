import { useMemo, useState } from 'react';
import type { PlaceWithCandidates, PlacesResponse } from '@invite/shared';
import { Chips } from '../components/Chips.js';
import { PlaceThumb } from '../components/PlaceThumb.js';

interface LibraryProps {
  data: PlacesResponse;
  selection: string[];
  composing: boolean;
  onOpenPlace(place: PlaceWithCandidates): void;
  onToggleSelect(id: string): void;
}

type Tab = 'all' | 'inbox';

/**
 * Дом библиотеки (§10.1). Фасеты считаются на сервере по всей библиотеке,
 * а фильтрация внутри вкладки — на клиенте: мест у одного человека немного,
 * и лишний круг до сервера на каждый чип только тормозил бы.
 */
export function Library({
  data,
  selection,
  composing,
  onOpenPlace,
  onToggleSelect,
}: LibraryProps) {
  const [tab, setTab] = useState<Tab>('all');
  const [district, setDistrict] = useState<string>();
  const [category, setCategory] = useState<string>();
  const [tag, setTag] = useState<string>();
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return data.places.filter((place) => {
      if (tab === 'inbox' && place.enrichment_status === 'resolved') return false;
      if (tab === 'all' && place.enrichment_status !== 'resolved') return false;
      if (district && place.district !== district) return false;
      if (category && place.category !== category) return false;
      if (tag && !place.tags.includes(tag)) return false;
      if (needle && !place.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [data.places, tab, district, category, tag, search]);

  const pending = data.facets.needs_confirmation_count;

  return (
    <div className="screen">
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'all'}
          className={`tab${tab === 'all' ? ' tab--on' : ''}`}
          onClick={() => setTab('all')}
        >
          Библиотека
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'inbox'}
          className={`tab${tab === 'inbox' ? ' tab--on' : ''}`}
          onClick={() => setTab('inbox')}
        >
          На подтверждение
          {pending > 0 && <span className="tab__badge">{pending}</span>}
        </button>
      </div>

      {tab === 'all' && (
        <div className="filters">
          <input
            className="field"
            type="search"
            placeholder="Поиск по названию"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Chips
            options={data.facets.districts}
            value={district}
            emptyLabel="Все районы"
            onChange={setDistrict}
          />
          <Chips
            options={data.facets.categories}
            value={category}
            emptyLabel="Все категории"
            onChange={setCategory}
          />
          <Chips options={data.facets.tags} value={tag} emptyLabel="Все теги" onChange={setTag} />
        </div>
      )}

      {visible.length === 0 && (
        <p className="empty">
          {tab === 'inbox'
            ? 'Пусто — всё подтверждено.'
            : data.places.length === 0
              ? 'Пока ничего нет. Перешлите боту пост про место или пришлите ссылку с Карт.'
              : 'Под эти фильтры ничего не подошло.'}
        </p>
      )}

      <ul className="list">
        {visible.map((place) => {
          const index = selection.indexOf(place.id);
          const picked = index >= 0;
          return (
            <li key={place.id}>
              <div className={`row${picked ? ' row--picked' : ''}`}>
                <button type="button" className="row__main" onClick={() => onOpenPlace(place)}>
                  <PlaceThumb src={place.photo_url} name={place.name} seed={place.id} />
                  <span className="row__text">
                    <span className="row__name">{place.name}</span>
                    <span className="row__meta">
                      {[place.district, place.category].filter(Boolean).join(' · ') ||
                        place.address ||
                        'без адреса'}
                    </span>
                    {place.enrichment_status === 'needs_confirmation' && (
                      <span className="row__flag">
                        {place.candidates.length > 0
                          ? `${place.candidates.length} варианта на выбор`
                          : 'нужно дописать название'}
                      </span>
                    )}
                    {place.enrichment_status === 'failed' && (
                      <span className="row__flag">не распозналось, поправьте вручную</span>
                    )}
                  </span>
                </button>

                {composing && place.enrichment_status === 'resolved' && (
                  <button
                    type="button"
                    className={`pick${picked ? ' pick--on' : ''}`}
                    aria-label={picked ? 'Убрать из конверта' : 'Добавить в конверт'}
                    aria-pressed={picked}
                    onClick={() => onToggleSelect(place.id)}
                  >
                    {picked ? index + 1 : '+'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
