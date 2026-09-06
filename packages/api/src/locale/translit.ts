/**
 * Детерминированный слой английского: транслитерация и словари географических слов.
 *
 * Он нужен по двум причинам. Во-первых, адрес из OSM приходит разобранным на части
 * (улица, дом, город), и собрать его по-английски правильнее структурно, чем отдавать
 * строку на перевод: «Лялин переулок, 5» — это «5 Lyalin Lane», а не «Lyalin Alley 5».
 * Во-вторых, это запасной вариант, когда переводчик недоступен: место без английского
 * названия хуже места с транслитом, но место, сохранённое кириллицей вопреки правилу,
 * хуже обоих.
 */

/** Транслитерация BGN/PCGN — тот вариант, которым русские имена пишут в загранпаспортах и на картах. */
const LETTERS: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export function hasCyrillic(value: string | null | undefined): boolean {
  return typeof value === 'string' && /[Ѐ-ӿ]/.test(value);
}

/**
 * «Щукин» → «Shchukin». Регистр сохраняется только у первой буквы замены:
 * «Щ» должно давать «Shch», а не «SHCH», — иначе название кричит.
 */
export function transliterate(value: string): string {
  let out = '';
  for (const char of value) {
    const lower = char.toLowerCase();
    const mapped = LETTERS[lower];
    if (mapped === undefined) {
      out += char;
      continue;
    }
    out += char === lower ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1);
  }
  return out;
}

/** Тип улицы по-английски. Ключи — и полные слова, и сокращения из постов. */
const STREET_TYPES: Record<string, string> = {
  улица: 'Street', ул: 'Street', улице: 'Street',
  переулок: 'Lane', пер: 'Lane',
  проспект: 'Avenue', просп: 'Avenue', 'пр-т': 'Avenue', пр: 'Avenue',
  набережная: 'Embankment', наб: 'Embankment',
  бульвар: 'Boulevard', 'б-р': 'Boulevard', бул: 'Boulevard',
  шоссе: 'Highway', ш: 'Highway',
  площадь: 'Square', пл: 'Square',
  проезд: 'Drive',
  аллея: 'Alley',
  линия: 'Line',
  тупик: 'Close',
  тракт: 'Road',
  дорога: 'Road',
};

/**
 * Города, у которых есть общепринятое английское имя. Транслит дал бы
 * «Moskva» и «Sankt-Peterburg» — формально верно, но гостю читать это неприятно.
 */
const CITIES: Record<string, string> = {
  'москва': 'Moscow',
  'санкт-петербург': 'Saint Petersburg',
  'нижний новгород': 'Nizhny Novgorod',
  'екатеринбург': 'Yekaterinburg',
  'казань': 'Kazan',
  'новосибирск': 'Novosibirsk',
  'сочи': 'Sochi',
  'калининград': 'Kaliningrad',
  'ростов-на-дону': 'Rostov-on-Don',
  'нижний тагил': 'Nizhny Tagil',
  'тбилиси': 'Tbilisi',
  'ереван': 'Yerevan',
  'белград': 'Belgrade',
  'стамбул': 'Istanbul',
};

export function cityToEnglish(city: string): string {
  const known = CITIES[city.toLowerCase().trim()];
  return known ?? transliterate(city);
}

function normalizeTypeWord(word: string): string | null {
  const key = word.toLowerCase().replace(/\.$/, '');
  return STREET_TYPES[key] ?? null;
}

/**
 * «Лялин переулок» → «Lyalin Lane», «улица Рубинштейна» → «Rubinshteyna Street».
 * Тип улицы в английском адресе всегда идёт последним, где бы он ни стоял в оригинале.
 */
export function streetToEnglish(road: string): string {
  const words = road.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';

  const typeIndex = words.findIndex((word) => normalizeTypeWord(word) !== null);
  if (typeIndex === -1) return transliterate(road.trim());

  const type = normalizeTypeWord(words[typeIndex]!)!;
  const rest = words.filter((_, index) => index !== typeIndex).map(transliterate).join(' ');
  return rest ? `${rest} ${type}` : type;
}

/**
 * Номер дома: «5с1» → «5 bldg 1», «7А» → «7A». Русские «строение» и «корпус»
 * латиницей нечитаемы, а выбрасывать их нельзя — это разные здания.
 */
export function houseToEnglish(house: string): string {
  const value = house.trim();
  const parts = /^(\d+)\s*(стр|строение|с|к|корп|корпус|лит|литера)\.?\s*(\d+|[а-яА-Я])$/u.exec(value);
  if (parts) {
    const [, number, marker, suffix] = parts;
    const word = /^(лит|литера)$/u.test(marker!.toLowerCase()) ? 'lit' : 'bldg';
    return `${number} ${word} ${transliterate(suffix!)}`;
  }
  return transliterate(value);
}

export interface AddressParts {
  road?: string | null;
  house?: string | null;
  city?: string | null;
}

/**
 * Английский адрес из разобранных частей: номер дома впереди улицы.
 * Возвращает null, когда собирать не из чего, — пустая строка в карточке
 * честнее выдуманной.
 */
export function addressToEnglish(parts: AddressParts): string | null {
  const street = parts.road ? streetToEnglish(parts.road) : '';
  const house = parts.house ? houseToEnglish(parts.house) : '';
  const line = [house, street].filter(Boolean).join(' ');
  const city = parts.city ? cityToEnglish(parts.city) : '';
  const all = [line || null, city || null].filter(Boolean);
  return all.length > 0 ? all.join(', ') : null;
}

/**
 * Запасной перевод адреса, когда частей нет — только строка из поста
 * («Малая Зеленина, 4»). Разбираем по запятым и складываем теми же правилами.
 */
export function rawAddressToEnglish(raw: string): string {
  const chunks = raw.split(',').map((chunk) => chunk.trim()).filter(Boolean);
  if (chunks.length === 0) return '';

  const house = chunks.find((chunk) => /^\d/.test(chunk));
  const street = chunks.find((chunk) => chunk !== house && hasCyrillic(chunk));
  const rest = chunks.filter((chunk) => chunk !== house && chunk !== street);

  const line = [house ? houseToEnglish(house) : '', street ? streetToEnglish(street) : '']
    .filter(Boolean)
    .join(' ');
  return [line || null, ...rest.map(cityToEnglish)].filter(Boolean).join(', ');
}
