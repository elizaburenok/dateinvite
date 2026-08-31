// Разовая живая проверка резолвера: настоящий Nominatim, настоящие ссылки.
import { openDb } from '../db/index.js';
import { NominatimClient } from '../resolver/nominatim.js';
import { resolvePlace } from '../resolver/index.js';

const db = openDb(':memory:');
const nominatim = new NominatimClient({
  db,
  baseUrl: 'https://nominatim.openstreetmap.org',
  // Контакт берём из окружения: в публичном репозитории почте не место,
  // а Nominatim без содержательного User-Agent запросы блокирует.
  userAgent: process.env.NOMINATIM_USER_AGENT ?? 'invite-app-smoke/0.1 (see .env)',
  minIntervalMs: 1200,
});

const cases: Array<[string, Parameters<typeof resolvePlace>[0]]> = [
  [
    'Ссылка Яндекс.Карт с координатами',
    { urls: ['https://yandex.ru/maps/213/moscow/?ll=37.651832%2C55.760021&z=18'] },
  ],
  ['Геометка из Telegram', { location: { lat: 55.7423, lng: 37.6156 } }],
  [
    'Текстовый пост без гео',
    { text: 'Сходили в бар «Профсоюз» на Покровке, отличный вечер', city: 'Москва' },
  ],
  ['Текст без зацепок', { text: 'было очень вкусно, всем советую' }],
];

for (const [label, input] of cases) {
  const result = await resolvePlace(input, { nominatim });
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(result, null, 2));
}
