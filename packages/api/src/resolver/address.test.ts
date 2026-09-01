import { describe, expect, it } from 'vitest';
import { extractAddress } from './address.js';

describe('извлечение адреса из текста поста', () => {
  it('«Провиантская ул., 3/6» — как в живом посте', () => {
    expect(extractAddress('нарядные завтраки в Баски & Монегаски, Провиантская ул., 3/6')).toEqual({
      raw: 'Провиантская ул., 3/6',
      // Дробь — угловой дом, геокодеру достаточно первой части.
      query: 'Провиантская улица, 3',
    });
  });

  it('обратный порядок: «улица Рубинштейна, 15»', () => {
    expect(extractAddress('бар на улица Рубинштейна, 15')?.query).toBe('Рубинштейна улица, 15');
  });

  it('корпус остаётся: «5с1» — это строение 1, геокодер его понимает', () => {
    expect(extractAddress('кофейня, Лялин переулок, 5с1')?.query).toBe('Лялин переулок, 5с1');
  });

  it('сокращения раскрываются', () => {
    expect(extractAddress('Невский просп., 28')?.query).toBe('Невский проспект, 28');
    expect(extractAddress('Кутузовская наб., 12')?.query).toBe('Кутузовская набережная, 12');
  });

  it('без адреса возвращает null, а не выдумывает', () => {
    expect(extractAddress('очень вкусные завтраки, всем советую')).toBeNull();
    expect(extractAddress('')).toBeNull();
    expect(extractAddress(null)).toBeNull();
  });
});
