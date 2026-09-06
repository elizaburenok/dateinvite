import type { Db } from '../db/index.js';
import { nowIso } from '../lib/ids.js';
import { translateWithClaude, type TranslationKind, type TranslationRequest } from './claude.js';
import { hasCyrillic, rawAddressToEnglish, transliterate } from './translit.js';

/**
 * Единственная дверь, через которую русское название места становится английским.
 *
 * Порядок источников фиксирован и важен:
 *   1. Готовый английский — тег name:en из OSM или адрес, собранный из разобранных частей.
 *      Это разметка живых людей и структура, а не догадка, поэтому идёт первой.
 *   2. Кеш переводов в базе — одна и та же улица приезжает из десятков постов.
 *   3. Claude — описательные названия он переводит, имена собственные транслитерирует.
 *   4. Транслит — когда ключа или сети нет. Хуже перевода, но лучше кириллицы,
 *      которая нарушала бы само правило «сохранённые места по-английски».
 *
 * Перевод происходит при сохранении места. Показ гостю никуда не ходит (§3).
 */

export interface PlaceLocaleInput {
  name: string;
  address: string;
  district: string | null;
  /** Английское название из OSM (name:en), если мапперы его проставили. */
  nameEn?: string | null;
  /** Английский адрес, собранный из разобранных частей ответа Nominatim. */
  addressEn?: string | null;
  city?: string | null;
}

export interface LocalizedPlace {
  name: string;
  address: string;
  district: string | null;
  /** Как было в источнике. null — строку не переводили (она и так латиницей или пуста). */
  name_ru: string | null;
  address_ru: string | null;
  district_ru: string | null;
}

export interface Locale {
  place(input: PlaceLocaleInput): Promise<LocalizedPlace>;
}

/** Перевод выключен: место сохраняется как есть. Так работают тесты резолвера. */
export const passthroughLocale: Locale = {
  place: async (input) => ({
    name: input.name,
    address: input.address,
    district: input.district,
    name_ru: null,
    address_ru: null,
    district_ru: null,
  }),
};

function fallback(kind: TranslationKind, source: string): string {
  return kind === 'address' ? rawAddressToEnglish(source) : transliterate(source);
}

export interface LocaleOptions {
  db: Db;
  /** Без ключа переводчик не зовётся — остаётся кеш и транслит. */
  apiKey?: string;
  model?: string;
  /** Подмена для тестов: та же сигнатура, что у translateWithClaude. */
  translate?: typeof translateWithClaude;
  /** Куда жаловаться, если переводчик упал. Место всё равно сохранится. */
  onError?: (error: unknown) => void;
}

export function createLocale(options: LocaleOptions): Locale {
  const { db } = options;

  const readCache = db.prepare<[string, string], { result: string }>(
    'SELECT result FROM translations WHERE kind = ? AND source = ?',
  );
  const writeCache = db.prepare(
    `INSERT INTO translations (kind, source, result, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(kind, source) DO UPDATE SET result = excluded.result, created_at = excluded.created_at`,
  );

  /**
   * Переводит несколько строк за раз. Возвращает готовый английский на каждую —
   * пустых мест не остаётся: что не перевелось, транслитерируется.
   */
  async function translateAll(requests: TranslationRequest[]): Promise<string[]> {
    const results: string[] = new Array(requests.length);
    const pending: { position: number; request: TranslationRequest }[] = [];

    requests.forEach((request, position) => {
      const cached = readCache.get(request.kind, request.source);
      if (cached) {
        results[position] = cached.result;
        return;
      }
      pending.push({ position, request });
    });

    if (pending.length > 0 && options.apiKey) {
      try {
        const translate = options.translate ?? translateWithClaude;
        const translated = await translate(
          pending.map((item) => item.request),
          { apiKey: options.apiKey, model: options.model },
        );
        translated.forEach((english, index) => {
          if (!english) return;
          const { position, request } = pending[index]!;
          results[position] = english;
          // В кеш попадает только настоящий перевод. Транслит-заглушку сюда класть
          // нельзя: одна сетевая ошибка навсегда закрепила бы худший вариант.
          writeCache.run(request.kind, request.source, english, nowIso());
        });
      } catch (error) {
        options.onError?.(error);
      }
    }

    return requests.map(
      (request, position) => results[position] ?? fallback(request.kind, request.source),
    );
  }

  return {
    async place(input) {
      const requests: TranslationRequest[] = [];
      const slots: TranslationKind[] = [];

      const needsWork = (value: string | null, ready: string | null | undefined): boolean =>
        Boolean(value && hasCyrillic(value) && !ready);

      if (needsWork(input.name, input.nameEn)) {
        requests.push({ kind: 'name', source: input.name, city: input.city });
        slots.push('name');
      }
      if (needsWork(input.address, input.addressEn)) {
        requests.push({ kind: 'address', source: input.address, city: input.city });
        slots.push('address');
      }
      if (needsWork(input.district, null)) {
        requests.push({ kind: 'district', source: input.district!, city: input.city });
        slots.push('district');
      }

      const translated = await translateAll(requests);
      const byKind = new Map<TranslationKind, string>();
      slots.forEach((kind, index) => byKind.set(kind, translated[index]!));

      const pick = (
        value: string | null,
        kind: TranslationKind,
        ready: string | null | undefined,
      ): { en: string | null; ru: string | null } => {
        if (!value) return { en: value, ru: null };
        if (!hasCyrillic(value)) return { en: value, ru: null };
        const english = ready?.trim() || byKind.get(kind) || fallback(kind, value);
        return { en: english, ru: value };
      };

      const name = pick(input.name, 'name', input.nameEn);
      const address = pick(input.address, 'address', input.addressEn);
      const district = pick(input.district, 'district', null);

      return {
        name: name.en ?? '',
        address: address.en ?? '',
        district: district.en,
        name_ru: name.ru,
        address_ru: address.ru,
        district_ru: district.ru,
      };
    },
  };
}
