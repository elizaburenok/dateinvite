/**
 * Наполняет локальную БД одним конвертом, чтобы можно было посмотреть
 * гость-страницу и Mini App живьём. Только для разработки.
 */
import { config } from '../config.js';
import { openDb } from '../db/index.js';
import { insertPlace } from '../domain/places.js';
import { upsertUser } from '../domain/users.js';
import { createEnvelope, inviteUrl } from '../domain/envelopes.js';

const db = openDb(config.dbPath);
const host = upsertUser(db, { id: 424242, first_name: 'Элиза', username: 'eliza' });
db.prepare('UPDATE users SET city = ? WHERE id = ?').run('Москва', host.id);

const seed = [
  {
    name: 'Кооператив «Чёрный»',
    address: 'Лялин переулок, 5 с1, Москва',
    district: 'Бауманка',
    category: 'Кофейня',
    note: 'тут сырники топ и тихо по утрам',
    lat: 55.7600217,
    lng: 37.6518326,
    rating: 4.7,
    tags: ['утро', 'работа'],
    photos: [],
  },
  {
    name: 'Профсоюз',
    address: 'Сущёвская улица, 27, Москва',
    district: 'Тверской',
    category: 'Бар',
    note: 'если захочется шумно и до поздна',
    lat: 55.7823593,
    lng: 37.6004424,
    rating: 4.5,
    tags: ['вечер'],
    photos: [],
  },
  {
    name: 'Кофемания',
    address: 'улица Большая Полянка, 2 с2, Москва',
    district: 'Якиманка',
    category: 'Ресторан',
    note: 'сюда, если нужен нормальный завтрак, а не только кофе',
    lat: 55.7417631,
    lng: 37.6157368,
    rating: 4.6,
    tags: ['завтрак'],
    photos: [],
  },
  {
    name: 'Март',
    address: 'улица Петровка, 25 с2, Москва',
    district: 'Тверской',
    category: 'Бар',
    note: 'вино и разговоры, столик лучше занять пораньше',
    lat: 55.7657,
    lng: 37.6161,
    rating: 4.8,
    tags: ['вечер'],
    photos: [],
  },
];

const placeIds = seed.map(
  (place) =>
    insertPlace(db, {
      owner_id: host.id,
      ...place,
      maps_url: `https://yandex.ru/maps/?ll=${place.lng},${place.lat}&z=17&text=${encodeURIComponent(place.name)}`,
      source: 'manual',
      enrichment_status: 'resolved',
    }).id,
);

// Одно место — с неподтверждёнными кандидатами, чтобы был виден инбокс Mini App.
insertPlace(
  db,
  {
    owner_id: host.id,
    name: 'кофейня из поста',
    source: 'telegram',
    enrichment_status: 'needs_confirmation',
  },
  [
    { name: 'Skuratov Coffee', address: 'Большая Дмитровка, 32, Москва', district: 'Тверской', category: 'Кофейня' },
    { name: 'Cofix', address: 'Мясницкая, 13, Москва', district: 'Басманный', category: 'Кофейня' },
  ],
);

const envelope = createEnvelope(db, {
  ownerId: host.id,
  placeIds: placeIds.slice(0, 4),
  hostNote: 'Выбирай, куда поедем в субботу ✨',
  ttlDays: config.envelopeTtlDays,
});

console.log('Конверт готов:', inviteUrl(config.publicBaseUrl, envelope.token));
console.log('Токен:', envelope.token);
db.close();
