import { describe, expect, it } from 'vitest';
import {
  addressToEnglish,
  cityToEnglish,
  hasCyrillic,
  houseToEnglish,
  rawAddressToEnglish,
  streetToEnglish,
  transliterate,
} from './translit.js';

describe('транслитерация', () => {
  it('пишет русские имена так, как принято на картах', () => {
    expect(transliterate('Щукин')).toBe('Shchukin');
    expect(transliterate('Бергамот')).toBe('Bergamot');
    expect(transliterate('Хохловский')).toBe('Khokhlovskiy');
  });

  it('не кричит заглавными на многобуквенных заменах', () => {
    expect(transliterate('Щ')).toBe('Shch');
  });

  it('латиницу не трогает', () => {
    expect(hasCyrillic('Skuratov Coffee')).toBe(false);
    expect(transliterate('Cofix 2')).toBe('Cofix 2');
  });
});

describe('адрес по-английски', () => {
  it('ставит номер дома перед улицей и переводит тип улицы', () => {
    expect(addressToEnglish({ road: 'Лялин переулок', house: '5', city: 'Москва' })).toBe(
      '5 Lyalin Lane, Moscow',
    );
  });

  it('выносит тип улицы в конец, где бы он ни стоял в оригинале', () => {
    expect(streetToEnglish('улица Рубинштейна')).toBe('Rubinshteyna Street');
    expect(streetToEnglish('Малая Зеленина улица')).toBe('Malaya Zelenina Street');
  });

  it('у городов берёт общепринятое английское имя, а не транслит', () => {
    expect(cityToEnglish('Санкт-Петербург')).toBe('Saint Petersburg');
    expect(cityToEnglish('Тверь')).toBe('Tver');
  });

  it('строение и корпус остаются различимыми', () => {
    expect(houseToEnglish('5с1')).toBe('5 bldg 1');
    expect(houseToEnglish('7А')).toBe('7A');
  });

  it('собирать не из чего — возвращает null, а не выдуманную строку', () => {
    expect(addressToEnglish({ road: null, house: null, city: null })).toBeNull();
  });

  it('адрес из поста разбирает по запятым', () => {
    expect(rawAddressToEnglish('Малая Зеленина, 4')).toBe('4 Malaya Zelenina');
    expect(rawAddressToEnglish('Провиантская улица, 3, Нижний Новгород')).toBe(
      '3 Proviantskaya Street, Nizhny Novgorod',
    );
  });
});
