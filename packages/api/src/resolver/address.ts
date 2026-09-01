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

export function extractAddress(text: string | null | undefined): ExtractedAddress | null {
  if (!text) return null;

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

  return null;
}
