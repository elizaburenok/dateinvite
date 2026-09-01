import { describe, expect, it } from 'vitest';
import type { Message } from 'grammy/types';
import {
  extractLinkTitles,
  extractUrls,
  largestPhotoId,
  mergeAlbum,
  toResolverInput,
} from './index.js';

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

describe('склейка альбома (§9)', () => {
  /** Форма ровно как у живого поста: подпись у первого, остальные — голые фото. */
  function album(): Message[] {
    return [
      message({
        message_id: 10,
        media_group_id: '14305992680114002',
        caption: 'Красота дня — нарядные завтраки в Баски & Монегаски, Провиантская ул., 3/6',
        caption_entities: [
          { type: 'text_link', offset: 36, length: 17, url: 'https://yandex.ru/maps/-/CDbAbC' },
        ],
        photo: [{ file_id: 'p1-small', file_unique_id: 'a', width: 320, height: 213 }],
      }),
      ...Array.from({ length: 8 }, (_, i) =>
        message({
          message_id: 11 + i,
          media_group_id: '14305992680114002',
          photo: [
            { file_id: `p${i + 2}-small`, file_unique_id: `s${i}`, width: 320, height: 213 },
            { file_id: `p${i + 2}-big`, file_unique_id: `b${i}`, width: 1280, height: 853 },
          ],
        }),
      ),
    ];
  }

  it('девять сообщений превращаются в одно — иначе восемь ответов «не понял»', () => {
    const merged = mergeAlbum(album());
    expect(merged.caption).toContain('Баски & Монегаски');
    expect(extractUrls(merged)).toEqual(['https://yandex.ru/maps/-/CDbAbC']);
  });

  it('берёт самое крупное фото альбома, даже если оно не там, где подпись', () => {
    const merged = mergeAlbum(album());
    // У сообщения с подписью фото мелкое, крупное лежит в соседних.
    expect(largestPhotoId(merged)).toBe('p2-big');
  });

  it('не теряет геометку, если она пришла отдельным сообщением пачки', () => {
    const merged = mergeAlbum([
      message({ media_group_id: 'g', caption: 'кофейня', photo: [{ file_id: 'x', file_unique_id: 'x', width: 90, height: 60 }] }),
      message({ media_group_id: 'g', location: { latitude: 55.76, longitude: 37.65 } }),
    ]);
    expect(merged.location).toEqual({ latitude: 55.76, longitude: 37.65 });
  });

  it('альбом совсем без подписи не выдумывает текст', () => {
    const merged = mergeAlbum([
      message({ media_group_id: 'g', photo: [{ file_id: 'a', file_unique_id: 'a', width: 90, height: 60 }] }),
      message({ media_group_id: 'g', photo: [{ file_id: 'b', file_unique_id: 'b', width: 800, height: 600 }] }),
    ]);
    expect(merged.caption).toBeUndefined();
    expect(largestPhotoId(merged)).toBe('b');
  });
});

describe('название из текста ссылки', () => {
  it('берёт то, что человек сам обернул в ссылку', () => {
    // Смещение считаем из самой строки: Telegram меряет его в кодовых единицах
    // UTF-16, ровно как String.prototype.indexOf, а руками тут легко промахнуться.
    const caption = 'Красота дня — нарядные завтраки в Баски & Монегаски, Провиантская ул., 3/6';
    const title = 'Баски & Монегаски';
    const titles = extractLinkTitles(
      message({
        caption,
        caption_entities: [
          {
            type: 'text_link',
            offset: caption.indexOf(title),
            length: title.length,
            url: 'https://t.me/baski',
          },
        ],
      }),
    );
    expect(titles).toEqual([title]);
  });

  it('отсеивает ссылку-фразу: «открытие ресторана» — это не место', () => {
    const caption = 'Зимой рассказывали про открытие ресторана, а летом вернулись';
    const phrase = 'открытие ресторана';
    expect(
      extractLinkTitles(
        message({
          caption,
          caption_entities: [
            {
              type: 'text_link',
              offset: caption.indexOf(phrase),
              length: phrase.length,
              url: 'https://t.me/doing_spb/1',
            },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it('игнорирует обычные ссылки — там подписи нет', () => {
    expect(
      extractLinkTitles(
        message({
          text: 'смотри https://yandex.ru/maps/-/A',
          entities: [{ type: 'url', offset: 7, length: 25 }],
        }),
      ),
    ).toEqual([]);
  });

  it('доезжает до резолвера через toResolverInput', () => {
    const input = toResolverInput(
      message({
        caption: 'завтраки в Баски & Монегаски',
        caption_entities: [
          { type: 'text_link', offset: 'завтраки в '.length, length: 17, url: 'https://t.me/b' },
        ],
      }),
      'Москва',
    );
    expect(input.nameHints).toEqual(['Баски & Монегаски']);
  });
});
