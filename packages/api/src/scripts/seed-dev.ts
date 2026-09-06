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

// Названия, адреса, районы и категории — по-английски: ровно так их кладёт
// в базу резолвер, и таким должен выглядеть локальный прогон.
const seed = [
  {
    name: 'Cooperative Chorny',
    name_ru: 'Кооператив «Чёрный»',
    address: '5 bldg 1 Lyalin Lane, Moscow',
    address_ru: 'Лялин переулок, 5 с1, Москва',
    district: 'Baumanka',
    district_ru: 'Бауманка',
    category: 'Coffee shop',
    note: 'тут сырники топ и тихо по утрам',
    lat: 55.7600217,
    lng: 37.6518326,
    rating: 4.7,
    tags: ['утро', 'работа'],
    photos: [],
  },
  {
    name: 'Profsoyuz',
    name_ru: 'Профсоюз',
    address: '27 Sushchevskaya Street, Moscow',
    address_ru: 'Сущёвская улица, 27, Москва',
    district: 'Tverskoy',
    district_ru: 'Тверской',
    category: 'Bar',
    note: 'если захочется шумно и до поздна',
    lat: 55.7823593,
    lng: 37.6004424,
    rating: 4.5,
    tags: ['вечер'],
    photos: [],
  },
  {
    name: 'Coffeemania',
    name_ru: 'Кофемания',
    address: '2 bldg 2 Bolshaya Polyanka Street, Moscow',
    address_ru: 'улица Большая Полянка, 2 с2, Москва',
    district: 'Yakimanka',
    district_ru: 'Якиманка',
    category: 'Restaurant',
    note: 'сюда, если нужен нормальный завтрак, а не только кофе',
    lat: 55.7417631,
    lng: 37.6157368,
    rating: 4.6,
    tags: ['завтрак'],
    photos: [],
  },
  {
    name: 'Mart',
    name_ru: 'Март',
    address: '25 bldg 2 Petrovka Street, Moscow',
    address_ru: 'улица Петровка, 25 с2, Москва',
    district: 'Tverskoy',
    district_ru: 'Тверской',
    category: 'Bar',
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
    name: 'Coffee shop from the post',
    name_ru: 'кофейня из поста',
    source: 'telegram',
    enrichment_status: 'needs_confirmation',
  },
  [
    {
      name: 'Skuratov Coffee',
      address: '32 Bolshaya Dmitrovka Street, Moscow',
      address_ru: 'Большая Дмитровка, 32, Москва',
      district: 'Tverskoy',
      district_ru: 'Тверской',
      category: 'Coffee shop',
    },
    {
      name: 'Cofix',
      address: '13 Myasnitskaya Street, Moscow',
      address_ru: 'Мясницкая, 13, Москва',
      district: 'Basmanny',
      district_ru: 'Басманный',
      category: 'Coffee shop',
    },
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
