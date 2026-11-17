import { describe, expect, it } from 'vitest';
import type { PlaceWithCandidates } from '@invite/shared';
import { envelopeNotes, filterPlaces, togglePlace } from './places.js';

const place = (id: string, patch: Partial<PlaceWithCandidates> = {}): PlaceWithCandidates => ({
  id, name: 'Кофейня', address: '', district: 'Центр', category: 'Coffee shop',
  tags: ['Утро'], note: 'Библиотечная заметка', source: 'manual', enrichment_status: 'resolved',
  photos: [], photo_url: null, lat: null, lng: null, maps_url: null,
  rating: null, hours: null, created_at: '', candidates: [], ...patch,
});

describe('выбор мест', () => {
  it('сохраняет порядок выбора и позволяет снять выбор при полном конверте', () => {
    const full = ['a', 'b', 'c', 'd', 'e'];
    expect(togglePlace(full, place('f'))).toEqual(full);
    expect(togglePlace(full, place('b'))).toEqual(['a', 'c', 'd', 'e']);
    expect(togglePlace(['b'], place('a'))).toEqual(['b', 'a']);
    expect(full).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('не добавляет неподтверждённое место', () => {
    expect(togglePlace([], place('a', { enrichment_status: 'needs_confirmation' }))).toEqual([]);
  });
});

describe('поиск и фильтры', () => {
  const places = [place('a'), place('b', { name: 'Парк', category: 'Park', district: 'Север', tags: ['Прогулка'] }),
    place('c', { enrichment_status: 'needs_confirmation' })];

  it('сочетает фасеты и ищет кириллицу независимо от регистра', () => {
    expect(filterPlaces(places, { q: '  КОФЕ  ', district: 'Центр', category: 'Coffee shop', tag: 'УТРО', pending: true }).map((p) => p.id)).toEqual(['c']);
    expect(filterPlaces(places, { district: 'Север', category: 'Coffee shop' })).toEqual([]);
  });

  it('сравнивает теги целиком и сохраняет порядок и исходный список', () => {
    expect(filterPlaces(places, { tag: 'Утр' })).toEqual([]);
    expect(filterPlaces(places, {})).toEqual(places);
    expect(places.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('заметки конверта', () => {
  it('наследует заметку, сохраняет явную очистку и игнорирует снятые с выбора места', () => {
    const places = [place('a'), place('b'), place('c', { note: null }), place('d')];
    expect(envelopeNotes(places, { b: '', d: '  Только в этом конверте  ', removed: 'Лишняя заметка' })).toEqual({
      a: 'Библиотечная заметка', b: null, c: null, d: 'Только в этом конверте',
    });
    expect(places[1]?.note).toBe('Библиотечная заметка');
  });
});
