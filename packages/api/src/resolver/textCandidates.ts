/**
 * Извлечение названий мест из свободного текста поста — ветка §7 «только текст».
 *
 * Здесь намеренно нет LLM: эвристика ничего не выдумывает, а всё, что она нашла,
 * уходит хосту на подтверждение (§3). Даже уверенная догадка не становится
 * `resolved` сама по себе, поэтому цена ошибки — лишний вариант в списке.
 *
 * Модуль подключён через интерфейс NameExtractor: LLM-реализацию можно добавить
 * рядом, не трогая остальной резолвер.
 */

export interface NameHint {
  text: string;
  /** Чем выше, тем раньше кандидат окажется в списке у хоста. */
  weight: number;
}

export interface NameExtractor {
  extract(text: string): NameHint[];
}

const CATEGORY_MARKERS = [
  'кофейня',
  'кофейни',
  'кофейню',
  'бар',
  'бары',
  'ресторан',
  'рестораны',
  'кафе',
  'пекарня',
  'винотека',
  'винный бар',
  'булочная',
  'бистро',
  'чайная',
  'музей',
  'галерея',
  'книжный',
  'клуб',
];

/** Слова, которые сами по себе названием не бывают: чистим ложные срабатывания. */
const STOP_WORDS = new Set([
  'москва',
  'питер',
  'спб',
  'россия',
  'сегодня',
  'вчера',
  'завтра',
  'кстати',
  'вообще',
  'если',
  'когда',
  'очень',
  'здесь',
  'потом',
]);

function clean(raw: string): string {
  return raw
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[@#]\S+/g, ' ')
    // Эмодзи и прочие пиктограммы только мешают разбору.
    .replace(/[\p{Extended_Pictographic}️]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(value: string): string {
  return value.replace(/[«»"„“”'`]/g, '').replace(/\s+/g, ' ').trim();
}

function isPlausible(value: string): boolean {
  const normalized = normalize(value);
  if (normalized.length < 3 || normalized.length > 60) return false;
  if (STOP_WORDS.has(normalized.toLowerCase())) return false;
  return /[\p{L}]/u.test(normalized);
}

/** Кавычки — самый честный сигнал: человек сам обозначил границы названия. */
function fromQuotes(text: string): NameHint[] {
  const hints: NameHint[] = [];
  const patterns = [/«([^»]{2,60})»/gu, /"([^"]{2,60})"/gu, /„([^“”]{2,60})[“”]/gu];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[1];
      if (value && isPlausible(value)) hints.push({ text: normalize(value), weight: 100 });
    }
  }
  return hints;
}

/** «кофейня Кооператив Чёрный» — маркер категории и следом название. */
function fromMarkers(text: string): NameHint[] {
  const hints: NameHint[] = [];
  for (const marker of CATEGORY_MARKERS) {
    const pattern = new RegExp(
      `${marker}\\s+((?:[\\p{Lu}][\\p{L}\\p{N}'’-]*|[A-Za-z][A-Za-z0-9'’-]*)(?:\\s+[\\p{L}\\p{N}'’-]+){0,3})`,
      'giu',
    );
    for (const match of text.matchAll(pattern)) {
      const value = match[1];
      if (value && isPlausible(value)) hints.push({ text: normalize(value), weight: 70 });
    }
  }
  return hints;
}

/** Цепочки слов с заглавной буквы — самый шумный сигнал, поэтому вес ниже всех. */
function fromCapitalized(text: string): NameHint[] {
  const hints: NameHint[] = [];
  const pattern = /(?:^|[.!?;:,\s])((?:[\p{Lu}][\p{Ll}\p{N}'’-]{1,}\s*){1,4})/gu;
  for (const match of text.matchAll(pattern)) {
    const value = match[1]?.trim();
    if (!value || !isPlausible(value)) continue;
    const words = value.split(/\s+/);
    // Одиночное слово с заглавной чаще всего — начало предложения, а не название.
    hints.push({ text: normalize(value), weight: words.length > 1 ? 40 : 20 });
  }
  return hints;
}

export const heuristicExtractor: NameExtractor = {
  extract(raw: string): NameHint[] {
    const text = clean(raw);
    if (!text) return [];

    const all = [...fromQuotes(text), ...fromMarkers(text), ...fromCapitalized(text)];

    // Один и тот же текст мог прийти из нескольких эвристик — оставляем лучший вес.
    const best = new Map<string, NameHint>();
    for (const hint of all) {
      const key = hint.text.toLowerCase();
      const existing = best.get(key);
      if (!existing || existing.weight < hint.weight) best.set(key, hint);
    }

    return [...best.values()].sort((a, b) => b.weight - a.weight);
  },
};
