import { describe, expect, it } from 'vitest';
import type { Message } from 'grammy/types';
import { extractUrls, largestPhotoId, toResolverInput } from './index.js';

/** Минимальный каркас сообщения: тестам важны только разбираемые поля. */
function message(patch: Partial<Message>): Message {
  return {
    message_id: 1,
    date: 0,
    chat: { id: 1, type: 'private', first_name: 'Хост' },
    ...patch,
  } as Message;
}

describe('извлечение ссылок из сообщения (§9)', () => {
  it('берёт ссылку из entities обычного текста', () => {
    const urls = extractUrls(
      message({
        text: 'смотри https://yandex.ru/maps/-/CDb1IL3Z вот тут',
        entities: [{ type: 'url', offset: 7, length: 33 }],
      }),
    );
    expect(urls).toEqual(['https://yandex.ru/maps/-/CDb1IL3Z']);
  });

  it('разворачивает скрытую ссылку text_link, а не подпись', () => {
    const urls = extractUrls(
      message({
        text: 'тут отличный кофе',
        entities: [{ type: 'text_link', offset: 0, length: 3, url: 'https://yandex.ru/maps/org/x/1/' }],
      }),
    );
    expect(urls).toEqual(['https://yandex.ru/maps/org/x/1/']);
  });

  it('читает подпись к фото — у пересланного поста текст лежит в caption', () => {
    const urls = extractUrls(
      message({
        caption: 'кофейня https://yandex.ru/maps/-/ABC',
        caption_entities: [{ type: 'url', offset: 8, length: 28 }],
      }),
    );
    expect(urls).toEqual(['https://yandex.ru/maps/-/ABC']);
  });

  it('находит ссылку регуляркой, когда пост пришёл без entities', () => {
    const urls = extractUrls(message({ text: 'вот https://yandex.ru/maps/-/CDb1IL3Z' }));
    expect(urls).toEqual(['https://yandex.ru/maps/-/CDb1IL3Z']);
  });

  it('обрезает пробел, если границы сущности прихватили лишнее', () => {
    const urls = extractUrls(
      message({
        text: 'смотри https://yandex.ru/maps/-/CDb1IL3Z вот тут',
        // На единицу шире настоящей ссылки — так бывает на пересланных постах.
        entities: [{ type: 'url', offset: 7, length: 34 }],
      }),
    );
    expect(urls).toEqual(['https://yandex.ru/maps/-/CDb1IL3Z']);
  });

  it('на сообщении без ссылок возвращает пусто', () => {
    expect(extractUrls(message({ text: 'просто текст' }))).toEqual([]);
    expect(extractUrls(message({}))).toEqual([]);
  });
});

describe('сборка входа резолвера из сообщения (§7)', () => {
  it('геометка превращается в координаты', () => {
    const input = toResolverInput(
      message({ location: { latitude: 55.76, longitude: 37.65 } }),
      'Москва',
    );
    expect(input.location).toEqual({ lat: 55.76, lng: 37.65 });
    expect(input.city).toBe('Москва');
  });

  it('venue отдаёт название и адрес отдельно от координат', () => {
    const input = toResolverInput(
      message({
        venue: {
          title: 'Кооператив Чёрный',
          address: 'Лялин пер., 5с1',
          location: { latitude: 55.76, longitude: 37.65 },
        },
      }),
      null,
    );
    expect(input.venue).toEqual({
      title: 'Кооператив Чёрный',
      address: 'Лялин пер., 5с1',
      lat: 55.76,
      lng: 37.65,
    });
  });

  it('текст поста доезжает до резолвера и из text, и из caption', () => {
    expect(toResolverInput(message({ text: 'бар «Март»' }), null).text).toBe('бар «Март»');
    expect(toResolverInput(message({ caption: 'бар «Март»' }), null).text).toBe('бар «Март»');
  });

  it('source_ref хранит исходную ссылку, а без неё — id сообщения', () => {
    const withLink = toResolverInput(message({ text: 'https://yandex.ru/maps/-/A' }), null);
    expect(withLink.sourceRef).toBe('https://yandex.ru/maps/-/A');

    const withoutLink = toResolverInput(message({ message_id: 77, text: 'бар «Март»' }), null);
    expect(withoutLink.sourceRef).toBe('tg:77');
  });
});

describe('выбор фото из поста', () => {
  it('берёт самый крупный размер — Telegram отдаёт их по возрастанию', () => {
    const id = largestPhotoId(
      message({
        photo: [
          { file_id: 'small', file_unique_id: 's', width: 90, height: 60 },
          { file_id: 'big', file_unique_id: 'b', width: 1280, height: 853 },
        ],
      }),
    );
    expect(id).toBe('big');
  });

  it('без фото возвращает null, а не падает', () => {
    expect(largestPhotoId(message({ text: 'без фото' }))).toBeNull();
  });
});
