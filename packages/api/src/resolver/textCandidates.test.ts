import { describe, expect, it } from 'vitest';
import { heuristicExtractor } from './textCandidates.js';

const names = (text: string) => heuristicExtractor.extract(text).map((h) => h.text);

describe('извлечение названий из текста поста (§7)', () => {
  it('кавычки дают самый высокий приоритет', () => {
    const hints = heuristicExtractor.extract(
      'Зашли вчера в кофейню «Кооператив Чёрный» на Лялином, очень тихо по утрам',
    );
    expect(hints[0]).toMatchObject({ text: 'Кооператив Чёрный', weight: 100 });
  });

  it('слоган в кавычках не выдаёт себя за название', () => {
    // «ugly but good» — девиз заведения. С весом кавычек он глушил все остальные
    // подсказки, и бот шёл искать на карте слоган.
    const hints = heuristicExtractor.extract(
      'Место с дерзким характером и слоганом «ugly but good» с акцентом на еду',
    );
    const slogan = hints.find((h) => h.text === 'ugly but good');
    expect(slogan?.weight).toBeLessThan(100);
  });

  it('название из двух строчных слов кавычки не понижают', () => {
    const hints = heuristicExtractor.extract('новое место — «gaby bistro» на Карповке');
    expect(hints[0]).toMatchObject({ text: 'gaby bistro', weight: 100 });
  });

  it('находит название после маркера категории', () => {
    expect(names('обожаю бар Профсоюз на Покровке')).toContain('Профсоюз');
  });

  it('находит латиницу', () => {
    expect(names('новое место — кофейня Skuratov Coffee, рядом с метро')).toContain(
      'Skuratov Coffee',
    );
  });

  it('чистит ссылки, хештеги и эмодзи', () => {
    const hints = names('Смотри https://t.me/post #кофе ☕️ кафе «Март» открылось');
    expect(hints).toContain('Март');
    expect(hints.some((n) => n.includes('http'))).toBe(false);
    expect(hints.some((n) => n.includes('#'))).toBe(false);
  });

  it('одиночное слово с заглавной весит меньше составного названия', () => {
    const hints = heuristicExtractor.extract('Сегодня открылась кофейня Март на Солянке');
    const solo = hints.find((h) => h.text === 'Сегодня');
    const named = hints.find((h) => h.text === 'Март');
    expect(named!.weight).toBeGreaterThan(solo?.weight ?? 0);
  });

  it('отбрасывает города и служебные слова', () => {
    expect(names('Москва сегодня прекрасна')).not.toContain('Москва');
  });

  it('на тексте без единой зацепки возвращает пусто, а не выдумывает', () => {
    expect(names('очень вкусно и недорого, всем советую')).toEqual([]);
    expect(names('')).toEqual([]);
  });

  it('не повторяет одно название дважды', () => {
    const hints = names('кофейня «Март», та самая Март на Солянке');
    expect(hints.filter((n) => n.toLowerCase() === 'март')).toHaveLength(1);
  });
});
