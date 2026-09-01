// Проверка резолвера на реальных текстах постов и живом Nominatim.
import { openDb } from '../db/index.js';
import { NominatimClient } from '../resolver/nominatim.js';
import { resolvePlace, type ResolverInput } from '../resolver/index.js';

const db = openDb(':memory:');
const nominatim = new NominatimClient({
  db,
  baseUrl: 'https://nominatim.openstreetmap.org',
  userAgent: process.env.NOMINATIM_USER_AGENT ?? 'invite-app-smoke/0.1 (see .env)',
  minIntervalMs: 1200,
});

const city = process.env.SMOKE_CITY || null;

const cases: Array<[string, ResolverInput]> = [
  [
    'Бергамот — адрес без слова «улица»',
    {
      text:
        'Ужин для особого случая — «Бергамот», Малая Зеленина, 4 🧑‍🍳\n\n' +
        'Зимой рассказывали про открытие ресторана, а летом вернулись, чтобы обновить впечатления.',
      // Ссылками обёрнуты и название, и отсылка к другому посту.
      nameHints: ['Бергамот', 'открытие ресторана'],
      city,
    },
  ],
  [
    'Баски & Монегаски — адрес со словом «ул.»',
    {
      text: 'Красота дня — нарядные завтраки в Баски & Монегаски, Провиантская ул., 3/6 🐞',
      nameHints: ['Баски & Монегаски'],
      city,
    },
  ],
];

for (const [label, input] of cases) {
  const result = await resolvePlace(input, { nominatim });
  console.log(`\n=== ${label} ===`);
  if (result.status === 'needs_confirmation') {
    for (const c of result.candidates) {
      console.log(` → ${c.name} | ${c.address} | ${c.district ?? '—'}`);
    }
    if (result.candidates.length === 0) console.log(' → (кандидатов нет)');
  } else {
    console.log(' ', JSON.stringify(result).slice(0, 200));
  }
}
db.close();
