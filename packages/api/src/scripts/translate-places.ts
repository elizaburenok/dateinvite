/**
 * Перевод уже сохранённых мест на английский.
 *
 * Миграция 003 добавляет колонки, но переводить в SQL нечего: перевод — это
 * сетевой вызов. Скрипт проходит по местам, где английского ещё нет, и
 * переводит их тем же слоем, что и новые: OSM-подсказок здесь уже нет,
 * значит работает Claude, а без ключа — транслитерация.
 *
 * Идемпотентен: строку, у которой заполнен *_ru, второй раз не трогает.
 * Запуск: npm run translate:places -w @invite/api [-- --dry]
 */
import { config } from '../config.js';
import { openDb } from '../db/index.js';
import { createLocale } from '../locale/index.js';
import { hasCyrillic } from '../locale/translit.js';

interface Row {
  id: string;
  name: string;
  address: string;
  district: string | null;
  name_ru: string | null;
  address_ru: string | null;
  district_ru: string | null;
  city: string | null;
}

async function main(): Promise<void> {
  const dry = process.argv.includes('--dry');
  const db = openDb(config.dbPath);
  const locale = createLocale({
    db,
    apiKey: config.anthropicApiKey,
    model: config.translationModel,
    onError: (error) => console.error('  переводчик не ответил, беру транслит:', error),
  });

  if (!config.anthropicApiKey) {
    console.warn('ANTHROPIC_API_KEY не задан — будет транслитерация, а не перевод.');
  }

  // Берём город владельца: он помогает отличить общепринятое английское имя
  // от случайного совпадения названий в другом городе.
  const rows = db
    .prepare<[], Row>(
      `SELECT p.id, p.name, p.address, p.district, p.name_ru, p.address_ru, p.district_ru, u.city
       FROM places p JOIN users u ON u.id = p.owner_id
       WHERE p.deleted_at IS NULL
       ORDER BY p.created_at`,
    )
    .all();

  const pending = rows.filter(
    (row) =>
      (hasCyrillic(row.name) && !row.name_ru) ||
      (hasCyrillic(row.address) && !row.address_ru) ||
      (hasCyrillic(row.district) && !row.district_ru),
  );

  console.log(`мест всего: ${rows.length}, к переводу: ${pending.length}`);

  const update = db.prepare(
    `UPDATE places SET name = ?, address = ?, district = ?,
                       name_ru = ?, address_ru = ?, district_ru = ?
     WHERE id = ?`,
  );

  for (const row of pending) {
    const english = await locale.place({
      name: row.name,
      address: row.address,
      district: row.district,
      city: row.city,
    });
    console.log(`${row.name} → ${english.name}${english.address ? ` · ${english.address}` : ''}`);
    if (!dry) {
      update.run(
        english.name,
        english.address,
        english.district,
        english.name_ru,
        english.address_ru,
        english.district_ru,
        row.id,
      );
    }
  }

  // Кандидаты живут до подтверждения и могли остаться русскими у мест,
  // которые хост ещё не разобрал. Их переводим тем же проходом.
  const candidates = db
    .prepare<[], Row>(
      `SELECT c.id, c.name, c.address, c.district, c.name_ru, c.address_ru, c.district_ru, u.city
       FROM place_candidates c
       JOIN places p ON p.id = c.place_id AND p.deleted_at IS NULL
       JOIN users u ON u.id = p.owner_id
       ORDER BY c.position`,
    )
    .all()
    .filter(
      (row) =>
        (hasCyrillic(row.name) && !row.name_ru) ||
        (hasCyrillic(row.address) && !row.address_ru) ||
        (hasCyrillic(row.district) && !row.district_ru),
    );

  console.log(`кандидатов к переводу: ${candidates.length}`);

  const updateCandidate = db.prepare(
    `UPDATE place_candidates SET name = ?, address = ?, district = ?,
                                 name_ru = ?, address_ru = ?, district_ru = ?
     WHERE id = ?`,
  );

  for (const row of candidates) {
    const english = await locale.place({
      name: row.name,
      address: row.address,
      district: row.district,
      city: row.city,
    });
    if (!dry) {
      updateCandidate.run(
        english.name,
        english.address,
        english.district,
        english.name_ru,
        english.address_ru,
        english.district_ru,
        row.id,
      );
    }
  }

  db.close();
  console.log(dry ? 'сухой прогон: в базу ничего не записано' : 'готово');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
