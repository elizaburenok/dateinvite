// Проверка резолвера на реальном тексте поста и живом Nominatim.
import { openDb } from '../db/index.js';
import { NominatimClient } from '../resolver/nominatim.js';
import { resolvePlace } from '../resolver/index.js';

const db = openDb(':memory:');
const nominatim = new NominatimClient({
  db,
  baseUrl: 'https://nominatim.openstreetmap.org',
  userAgent: process.env.NOMINATIM_USER_AGENT ?? 'invite-app-smoke/0.1 (see .env)',
  minIntervalMs: 1200,
});

const result = await resolvePlace(
  {
    text:
      'Красота дня — нарядные завтраки в Баски & Монегаски, Провиантская ул., 3/6 🐞\n' +
      'действительно есть ощущение, что ты вышел на завтрак, а не просто поел где-то с утра.',
    nameHints: ['Баски & Монегаски'],
    city: process.env.SMOKE_CITY || null,
  },
  { nominatim },
);

console.log(JSON.stringify(result, null, 2));
db.close();
