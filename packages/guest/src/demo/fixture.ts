import type { InviteResponse } from '@invite/shared';

/**
 * Фикстура для дизайн-прототипа: страница-конверт целиком строится из ответа
 * `GET /invite/{token}` (§12), поэтому её можно кормить и статикой — бэкенд
 * для примерки экрана не нужен.
 *
 * Фото лежат в `public/demo/`. Путь собирается через BASE_URL: страница живёт
 * под префиксом /i/, и абсолютный `/demo/1.jpg` до неё бы не дотянулся.
 * Если файлов там нет, карточка не ломается — PhotoFrame рисует заглушку по хешу id.
 */
const photo = (name: string) => `${import.meta.env.BASE_URL}demo/${name}`;

export const DEMO_INVITE: InviteResponse = {
  token: 'demo',
  status: 'opened',
  host_note: 'Pick where we go on Saturday',
  expires_at: null,
  answer: null,
  places: [
    {
      id: 'demo-1',
      name: 'Cooperative Chorny',
      address: '12 Bolshaya Nikitskaya',
      district: 'Patriarshiye',
      category: 'Coffee shop',
      photos: [photo('1.jpg'), photo('2.jpg'), photo('3.jpg')],
      photo_url: photo('1.jpg'),
      note: 'I remembered you wanted to go here',
      lat: 55.764,
      lng: 37.593,
      maps_url: 'https://yandex.ru/maps/',
      rating: 4.7,
    },
    {
      id: 'demo-2',
      name: 'Dostoevsky Library',
      address: '23 Chistoprudny Boulevard',
      district: 'Chistye Prudy',
      category: 'Library',
      photos: [photo('2.jpg'), photo('4.jpg')],
      photo_url: photo('2.jpg'),
      note: 'For when you want quiet and books. The second floor is almost always empty.',
      lat: 55.769,
      lng: 37.638,
      maps_url: 'https://yandex.ru/maps/',
      rating: 4.9,
    },
    {
      id: 'demo-3',
      name: 'Depo',
      address: '20 bldg 3 Lesnaya Street',
      district: 'Lesnaya',
      category: 'Food hall',
      photos: [photo('3.jpg')],
      photo_url: photo('3.jpg'),
      note: 'Loud, but you can pick anything and not argue about it.',
      lat: 55.782,
      lng: 37.588,
      maps_url: 'https://yandex.ru/maps/',
      rating: 4.4,
    },
    {
      id: 'demo-4',
      name: 'Bauman Garden',
      address: '15 Staraya Basmannaya Street',
      district: 'Basmanny',
      category: 'Park',
      photos: [],
      photo_url: null,
      note: 'In case the sun comes out.',
      lat: 55.766,
      lng: 37.657,
      maps_url: 'https://yandex.ru/maps/',
      rating: null,
    },
  ],
};

/**
 * Демо-режим — по явному `?demo` в адресе (случайно не попасть) либо по
 * сборочному флагу VITE_FORCE_DEMO: он поднимает отдельный дев-сервер, где
 * карточки открываются всегда, без реальной ссылки приглашения.
 */
export function isDemo(search = window.location.search): boolean {
  if (import.meta.env.VITE_FORCE_DEMO) return true;
  return new URLSearchParams(search).has('demo');
}
