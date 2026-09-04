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
  host_note: 'Выбирай, куда поедем в субботу',
  expires_at: null,
  answer: null,
  places: [
    {
      id: 'demo-1',
      name: 'Кооператив Чёрный',
      address: 'Большая Никитская, 12',
      district: 'Патриаршие',
      category: 'Кофейня',
      photos: [photo('1.jpg'), photo('2.jpg'), photo('3.jpg')],
      photo_url: photo('1.jpg'),
      note: 'Я вспомнила, что ты хотела в это место',
      lat: 55.764,
      lng: 37.593,
      maps_url: 'https://yandex.ru/maps/',
      rating: 4.7,
    },
    {
      id: 'demo-2',
      name: 'Библиотека им. Достоевского',
      address: 'Чистопрудный бульвар, 23',
      district: 'Чистые пруды',
      category: 'Библиотека',
      photos: [photo('2.jpg'), photo('4.jpg')],
      photo_url: photo('2.jpg'),
      note: 'Если захочется тишины и книжек. На втором этаже почти никогда никого.',
      lat: 55.769,
      lng: 37.638,
      maps_url: 'https://yandex.ru/maps/',
      rating: 4.9,
    },
    {
      id: 'demo-3',
      name: 'Депо',
      address: 'Лесная, 20с3',
      district: 'Лесная',
      category: 'Фудмолл',
      photos: [photo('3.jpg')],
      photo_url: photo('3.jpg'),
      note: 'Шумно, зато выбрать можно что угодно и не спорить.',
      lat: 55.782,
      lng: 37.588,
      maps_url: 'https://yandex.ru/maps/',
      rating: 4.4,
    },
    {
      id: 'demo-4',
      name: 'Сад имени Баумана',
      address: 'Старая Басманная, 15',
      district: 'Басманный',
      category: 'Парк',
      photos: [],
      photo_url: null,
      note: 'На случай, если будет солнце.',
      lat: 55.766,
      lng: 37.657,
      maps_url: 'https://yandex.ru/maps/',
      rating: null,
    },
  ],
};

/** Демо-режим — только по явному `?demo` в адресе, случайно в него не попасть. */
export function isDemo(search = window.location.search): boolean {
  return new URLSearchParams(search).has('demo');
}
