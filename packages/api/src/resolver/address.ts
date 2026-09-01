/**
 * Вытаскивает адрес из текста поста.
 *
 * Нужен потому, что OSM знает далеко не все заведения — особенно новые. Название
 * может не найтись вовсе, а вот улица с домом есть всегда. Тогда место сохраняется
 * с именем, которое человек написал сам, и координатами по адресу.
 */

const STREET_WORDS =
  'ул\\.|улица|улице|ул|пер\\.|переулок|просп\\.|проспект|пр-т|пр\\.|наб\\.|набережная|бульвар|б-р|шоссе|ш\\.|площадь|пл\\.|линия|аллея|проезд';

/** Дом: 3, 3/6, 5с1, 12к2, 7А. */
const HOUSE = '\\d+[/\\-]?\\d*\\s?(?:[а-яА-Я]\\d*)?';

const PATTERNS: RegExp[] = [
  // «Провиантская ул., 3/6», «Лялин переулок, 5с1»
  new RegExp(
    `([\\p{Lu}][\\p{L}-]+(?:\\s+[\\p{Ll}\\p{L}-]+)?)\\s+(${STREET_WORDS})\\.?,?\\s*(${HOUSE})`,
    'u',
  ),
  // «улица Рубинштейна, 15», «проспект Мира 5»
  new RegExp(
    `(${STREET_WORDS})\\s+([\\p{Lu}][\\p{L}-]+(?:\\s+[\\p{L}-]+)?)\\.?,?\\s*(${HOUSE})`,
    'u',
  ),
];

export interface ExtractedAddress {
  /** Строка для геокодера: «Провиантская улица, 3». */
  query: string;
  /** Как было написано в посте — попадёт в карточку, если геокодер промолчит. */
  raw: string;
}

function normalizeStreetWord(word: string): string {
  const w = word.toLowerCase().replace(/\.$/, '');
  if (['ул', 'улица', 'улице'].includes(w)) return 'улица';
  if (['пер', 'переулок'].includes(w)) return 'переулок';
  if (['просп', 'проспект', 'пр-т', 'пр'].includes(w)) return 'проспект';
  if (['наб', 'набережная'].includes(w)) return 'набережная';
  if (['б-р', 'бульвар'].includes(w)) return 'бульвар';
  if (['ш', 'шоссе'].includes(w)) return 'шоссе';
  if (['пл', 'площадь'].includes(w)) return 'площадь';
  return w;
}

/**
 * Улица без слова «улица»: «Малая Зеленина, 4», «Рубинштейна, 15».
 * Так пишут постоянно, и без этого шаблона адрес терялся целиком.
 *
 * Шаблон заведомо более жадный, поэтому ищем его только в первой строке —
 * там, где в постах про места и стоит адрес. В теле длинного текста
 * «Меню, 2» или «Зимой, 5» дали бы ложное срабатывание.
 */
const BARE_STREET = new RegExp(
  `([\\p{Lu}][\\p{Ll}-]+(?:\\s+[\\p{Lu}][\\p{Ll}-]+){0,2}),\\s*(${HOUSE})(?![\\d.,]*\\s*(?:₽|руб|%))`,
  'u',
);

/** Слова, которые адресом быть не могут, даже если стоят перед числом. */
const NOT_A_STREET = new Set(['меню', 'зимой', 'летом', 'весной', 'осенью', 'цена', 'счёт', 'чек']);

export function extractAddress(
  text: string | null | undefined,
  options: { exclude?: string[] } = {},
): ExtractedAddress | null {
  if (!text) return null;

  const exclude = new Set((options.exclude ?? []).map((value) => value.toLowerCase().trim()));

  // Первый шаблон — «Название улица дом», второй — «улица Название дом».
  const first = PATTERNS[0]!.exec(text);
  if (first) {
    const [raw, name, word, house] = first;
    // Номер дома вида 3/6 — это чаще всего угловой дом; геокодеру хватает первой части.
    const houseNumber = house!.split(/[/\-]/)[0]!.trim();
    return {
      raw: raw.trim(),
      query: `${name} ${normalizeStreetWord(word!)}, ${houseNumber}`,
    };
  }

  const second = PATTERNS[1]!.exec(text);
  if (second) {
    const [raw, word, name, house] = second;
    const houseNumber = house!.split(/[/\-]/)[0]!.trim();
    return {
      raw: raw.trim(),
      query: `${name} ${normalizeStreetWord(word!)}, ${houseNumber}`,
    };
  }

  const lead = text.split('\n')[0] ?? '';
  const bare = BARE_STREET.exec(lead);
  if (bare) {
    const [raw, name, house] = bare;
    const candidate = name!.trim();
    // Название места, стоящее перед номером, — не адрес: «Бергамот, 4».
    if (!exclude.has(candidate.toLowerCase()) && !NOT_A_STREET.has(candidate.toLowerCase())) {
      const houseNumber = house!.split(/[/\-]/)[0]!.trim();
      return { raw: raw.trim(), query: `${candidate}, ${houseNumber}` };
    }
  }

  return null;
}
