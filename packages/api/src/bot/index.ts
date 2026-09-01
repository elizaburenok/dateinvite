import { Bot, InlineKeyboard, type Context } from 'grammy';
import type { Message } from 'grammy/types';
import type { Db } from '../db/index.js';
import {
  confirmCandidate,
  getPlaceRow,
  insertPlace,
  listCandidates,
  softDeletePlace,
  updatePlace,
  type PlaceRow,
} from '../domain/places.js';
import { upsertUser, type UserRow } from '../domain/users.js';
import { resolvePlace, type ResolverInput } from '../resolver/index.js';
import type { NominatimClient } from '../resolver/nominatim.js';
import type { PhotoStore } from '../resolver/photos.js';
import { candidateLine, escapeHtml, placeCard } from './format.js';

export interface BotDeps {
  db: Db;
  token: string;
  nominatim: NominatimClient;
  photoStore: PhotoStore;
  miniAppUrl: string;
}

/** Telegram отдаёт размеры по возрастанию — берём самый крупный. */
export function largestPhotoId(message: Message): string | null {
  const sizes = message.photo;
  if (!sizes || sizes.length === 0) return null;
  return sizes[sizes.length - 1]?.file_id ?? null;
}

export function extractUrls(message: Message): string[] {
  const text = message.text ?? message.caption ?? '';
  const entities = message.entities ?? message.caption_entities ?? [];
  const urls: string[] = [];

  for (const entity of entities) {
    if (entity.type === 'url') {
      urls.push(text.slice(entity.offset, entity.offset + entity.length));
    } else if (entity.type === 'text_link' && entity.url) {
      urls.push(entity.url);
    }
  }

  // Пересланный пост мог прийти без entities — тогда выцепляем ссылки регуляркой.
  if (urls.length === 0) {
    for (const match of text.matchAll(/https?:\/\/\S+/g)) urls.push(match[0]);
  }

  // Границы сущности иногда прихватывают пробел или перевод строки,
  // а new URL() на такой строке падает — обрезаем до того, как это случится.
  return urls.map((url) => url.trim()).filter(Boolean);
}

/**
 * Текст, который человек сам обернул в ссылку, почти всегда и есть название места:
 * «завтраки в [Баски & Монегаски]». Сигнал не слабее кавычек, и раньше он терялся —
 * резолвер брал первое слово с заглавной и получал «Красота» вместо названия.
 */
export function extractLinkTitles(message: Message): string[] {
  const text = message.text ?? message.caption ?? '';
  const entities = message.entities ?? message.caption_entities ?? [];
  return entities
    .filter((entity) => entity.type === 'text_link')
    .map((entity) => text.slice(entity.offset, entity.offset + entity.length).trim())
    .filter((title) => title.length >= 3 && title.length <= 60)
    // Ссылкой оборачивают не только названия: «Зимой рассказывали про
    // открытие ресторана» — это отсылка к другому посту, а не место.
    // Название почти всегда начинается с заглавной или с латиницы.
    .filter((title) => /^[«"']?[\p{Lu}A-Z]/u.test(title));
}

export function toResolverInput(message: Message, city: string | null): ResolverInput {
  return {
    text: message.text ?? message.caption ?? null,
    urls: extractUrls(message),
    nameHints: extractLinkTitles(message),
    location: message.location
      ? { lat: message.location.latitude, lng: message.location.longitude }
      : null,
    venue: message.venue
      ? {
          title: message.venue.title,
          address: message.venue.address,
          lat: message.venue.location.latitude,
          lng: message.venue.location.longitude,
        }
      : null,
    city,
    sourceRef: extractUrls(message)[0] ?? `tg:${message.message_id}`,
  };
}

/**
 * Альбом Telegram приезжает не одним сообщением, а пачкой отдельных, с общим
 * media_group_id: подпись есть только у одного, остальные — голые фото.
 * Без склейки пост из девяти снимков вызвал бы восемь ответов «не понял»
 * и мусор в библиотеке.
 */
export function mergeAlbum(messages: Message[]): Message {
  const withCaption = messages.find((m) => (m.caption ?? m.text ?? '').trim().length > 0);
  const base = withCaption ?? messages[0]!;

  // Фото берём лучшее по всему альбому: подпись и самый крупный снимок
  // запросто оказываются в разных сообщениях пачки.
  const bestPhoto = messages
    .flatMap((m) => m.photo ?? [])
    .reduce<Message['photo'] extends undefined ? never : NonNullable<Message['photo']>[number] | null>(
      (best, size) => (!best || size.width * size.height > best.width * best.height ? size : best),
      null,
    );

  return {
    ...base,
    ...(bestPhoto ? { photo: [bestPhoto] } : {}),
    location: base.location ?? messages.find((m) => m.location)?.location,
    venue: base.venue ?? messages.find((m) => m.venue)?.venue,
  } as Message;
}

/**
 * Telegram отклоняет кнопку Mini App с http-адресом, а вместе с кнопкой —
 * и всё сообщение. Локально это означало, что бот молча не отвечал ничего.
 * Без https просто не рисуем кнопку: ответ важнее украшения.
 */
function libraryKeyboard(miniAppUrl: string): InlineKeyboard | undefined {
  if (!miniAppUrl.startsWith('https://')) return undefined;
  return new InlineKeyboard().webApp('Открыть библиотеку', miniAppUrl);
}

export function createBot(deps: BotDeps): Bot {
  const bot = new Bot(deps.token);

  const currentUser = (ctx: Context): UserRow | null => {
    const from = ctx.from;
    if (!from) return null;
    return upsertUser(deps.db, {
      id: from.id,
      first_name: from.first_name,
      username: from.username,
    });
  };

  bot.command('start', async (ctx) => {
    currentUser(ctx);
    await ctx.reply(
      [
        'Привет! Я собираю ваши места и превращаю их в приглашения.',
        '',
        '• Перешлите мне пост про место или пришлите ссылку с Яндекс.Карт — я сохраню его в библиотеку.',
        '• Можно просто отправить геометку.',
        '• Когда мест наберётся, соберите конверт на 3–5 мест и отправьте другу одной ссылкой.',
      ].join('\n'),
      { reply_markup: libraryKeyboard(deps.miniAppUrl) },
    );
  });

  bot.command('library', async (ctx) => {
    currentUser(ctx);
    await ctx.reply('Библиотека и сборка конвертов — здесь:', {
      reply_markup: libraryKeyboard(deps.miniAppUrl),
    });
  });

  bot.command('city', async (ctx) => {
    const user = currentUser(ctx);
    if (!user) return;
    const city = ctx.match?.trim();
    if (!city) {
      await ctx.reply(
        user.city
          ? `Сейчас ищу места в городе: ${user.city}. Сменить — /city Санкт-Петербург`
          : 'Укажите город, чтобы я точнее искал места: /city Москва',
      );
      return;
    }
    deps.db.prepare('UPDATE users SET city = ? WHERE id = ?').run(city, user.id);
    await ctx.reply(`Запомнил: ищу места в городе ${city}.`);
  });

  /**
   * Сообщения одного альбома приходят порознь и с небольшим разбросом по времени.
   * Копим их и обрабатываем пачку целиком, когда поток затих.
   */
  const albums = new Map<string, { messages: Message[]; ctx: Context; timer: NodeJS.Timeout }>();
  const ALBUM_WINDOW_MS = 2000;

  bot.on('message', async (ctx) => {
    const user = currentUser(ctx);
    if (!user) return;

    const groupId = ctx.message.media_group_id;
    if (groupId) {
      const pending = albums.get(groupId) ?? { messages: [], ctx, timer: setTimeout(() => {}, 0) };
      clearTimeout(pending.timer);
      pending.messages.push(ctx.message);
      // Отвечать будем в контексте того сообщения, где нашлась подпись.
      if ((ctx.message.caption ?? '').trim()) pending.ctx = ctx;
      pending.timer = setTimeout(() => {
        albums.delete(groupId);
        void capture(pending.ctx, mergeAlbum(pending.messages)).catch((error) =>
          console.error('[bot] альбом не обработался', error),
        );
      }, ALBUM_WINDOW_MS);
      albums.set(groupId, pending);
      return;
    }

    await capture(ctx, ctx.message);
  });

  async function capture(ctx: Context, message: Message): Promise<void> {
    const user = currentUser(ctx);
    if (!user || !ctx.chat) return;

    const input = toResolverInput(message, user.city);

    const hasSignal =
      Boolean(input.location) ||
      Boolean(input.venue) ||
      (input.urls?.length ?? 0) > 0 ||
      Boolean(input.text?.trim());

    if (!hasSignal) {
      await ctx.reply('Пришлите пост, ссылку с Карт или геометку — и я сохраню место.');
      return;
    }

    const thinking = await ctx.reply('Ищу место…');

    let result;
    try {
      result = await resolvePlace(input, { nominatim: deps.nominatim });
    } catch (error) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        thinking.message_id,
        'Не получилось разобрать это место — сервис карт не ответил. Попробуйте ещё раз или добавьте место вручную в библиотеке.',
      );
      return;
    }

    if (result.status === 'failed') {
      // Молчаливая ошибка недопустима (§3): честно говорим, что не вышло.
      await ctx.api.editMessageText(
        ctx.chat.id,
        thinking.message_id,
        `Не понял, о каком месте речь. ${escapeHtml(result.reason)}.\nМожно добавить место руками в библиотеке.`,
        { parse_mode: 'HTML', reply_markup: libraryKeyboard(deps.miniAppUrl) },
      );
      return;
    }

    const draft = result.status === 'resolved' ? result.place : result.draft;
    const candidates = result.status === 'needs_confirmation' ? result.candidates : [];

    // Фото из поста кешируем у себя: оригинал могут удалить (§3, §14.4).
    let photoUrl: string | null = null;
    const fileId = largestPhotoId(message);
    if (fileId) {
      try {
        const file = await ctx.api.getFile(fileId);
        if (file.file_path) {
          photoUrl = await deps.photoStore.saveFromUrl(
            `https://api.telegram.org/file/bot${deps.token}/${file.file_path}`,
            file.file_path,
          );
        }
      } catch {
        // Место без фото полезнее, чем отсутствие места.
      }
    }

    const place = insertPlace(
      deps.db,
      {
        owner_id: user.id,
        name: draft.name,
        address: draft.address,
        district: draft.district,
        category: draft.category,
        lat: draft.lat,
        lng: draft.lng,
        maps_url: draft.maps_url,
        photo_url: photoUrl,
        source: draft.source,
        enrichment_status: result.status,
        source_ref: input.sourceRef ?? null,
      },
      candidates.map((candidate) => ({
        name: candidate.name,
        address: candidate.address,
        district: candidate.district,
        category: candidate.category,
        lat: candidate.lat,
        lng: candidate.lng,
        maps_url: candidate.maps_url,
      })),
    );

    if (result.status === 'resolved') {
      await ctx.api.editMessageText(
        ctx.chat.id,
        thinking.message_id,
        `✅ Сохранил в библиотеку.\n\n${placeCard(place)}`,
        { parse_mode: 'HTML', reply_markup: libraryKeyboard(deps.miniAppUrl) },
      );
      return;
    }

    // Нечёткое распознавание: показываем 1–3 варианта и ждём человека (§3, §7).
    const stored = listCandidates(deps.db, place.id);
    const keyboard = new InlineKeyboard();
    if (stored.length === 1) {
      keyboard.text('Сохранить', `pick:${place.id}:0`).row();
    } else {
      stored.forEach((candidate, index) => {
        keyboard.text(`${index + 1}. ${candidate.name}`, `pick:${place.id}:${index}`).row();
      });
    }
    keyboard.text('Ничего не подошло', `drop:${place.id}`);

    // Одна и та же улица есть в разных городах. Пока хост не сказал свой,
    // варианты будут разъезжаться по стране — подсказываем это прямо здесь.
    const cityHint = user.city
      ? []
      : ['', 'Подскажите свой город командой /city — так я буду реже путать города.'];

    const single = stored.length === 1 ? stored[0]! : null;

    const body =
      single
        ? [
            // Одна строка с номером «1.» выглядела бы как выбор без выбора.
            'Нашёл вот это. Сохранить?',
            '',
            `<b>${escapeHtml(single.name)}</b>`,
            escapeHtml([single.address, single.district].filter(Boolean).join(' · ')),
            ...cityHint,
          ].join('\n')
        : stored.length > 0
          ? [
              'Похоже, речь про одно из этих мест. Какое?',
              '',
              ...stored.map((c, i) => escapeHtml(candidateLine(i, c.name, c.address))),
              ...cityHint,
            ].join('\n')
        : [
            'Сохранил точку, но названия не нашлось.',
            '',
            placeCard(place),
            '',
            'Откройте библиотеку и допишите название.',
          ].join('\n');

    await ctx.api.editMessageText(ctx.chat.id, thinking.message_id, body, {
      parse_mode: 'HTML',
      reply_markup: stored.length > 0 ? keyboard : libraryKeyboard(deps.miniAppUrl),
    });
  }

  bot.callbackQuery(/^pick:([^:]+):(\d+)$/, async (ctx) => {
    const user = currentUser(ctx);
    const placeId = ctx.match[1]!;
    const index = Number(ctx.match[2]);
    if (!user) return;

    // Сообщение могло пролежать в чате дольше, чем место в библиотеке:
    // его успели удалить или подтвердить с другого устройства. Тогда честно
    // говорим, что делать, и гасим кнопки, чтобы не жать по ним впустую.
    const place = getPlaceRow(deps.db, user.id, placeId);
    const candidates = place ? listCandidates(deps.db, placeId) : [];
    const candidate = candidates[index];

    if (!place || !candidate) {
      await ctx.answerCallbackQuery({
        text: 'Это сообщение устарело — перешлите пост ещё раз',
        show_alert: true,
      });
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
      return;
    }

    const confirmed = confirmCandidate(deps.db, user.id, placeId, candidate.id);
    if (!confirmed) {
      await ctx.answerCallbackQuery({
        text: 'Это сообщение устарело — перешлите пост ещё раз',
        show_alert: true,
      });
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
      return;
    }

    await ctx.answerCallbackQuery({ text: 'Сохранил' });
    await ctx.editMessageText(`✅ Сохранил в библиотеку.\n\n${placeCard(confirmed)}`, {
      parse_mode: 'HTML',
      reply_markup: libraryKeyboard(deps.miniAppUrl),
    });
  });

  bot.callbackQuery(/^drop:(.+)$/, async (ctx) => {
    const user = currentUser(ctx);
    const placeId = ctx.match[1]!;
    if (!user) return;

    const place: PlaceRow | undefined = getPlaceRow(deps.db, user.id, placeId);
    if (place) {
      // Точка с координатой ещё пригодится — оставляем её как failed для ручной правки.
      if (place.lat != null && place.lng != null) {
        updatePlace(deps.db, user.id, placeId, { enrichment_status: 'failed' });
        deps.db.prepare('DELETE FROM place_candidates WHERE place_id = ?').run(placeId);
      } else {
        softDeletePlace(deps.db, user.id, placeId);
      }
    }

    await ctx.answerCallbackQuery({ text: 'Убрал' });
    await ctx.editMessageText(
      'Хорошо, не сохраняю. Можно добавить место вручную в библиотеке.',
      { reply_markup: libraryKeyboard(deps.miniAppUrl) },
    );
  });

  bot.catch((error) => {
    console.error('[bot] необработанная ошибка', error);
  });

  return bot;
}

export async function configureBotCommands(bot: Bot, miniAppUrl: string): Promise<void> {
  await bot.api.setMyCommands([
    { command: 'library', description: 'Открыть библиотеку мест' },
    { command: 'city', description: 'Указать город для поиска' },
    { command: 'start', description: 'Как это работает' },
  ]);
  await bot.api.setChatMenuButton({
    menu_button: { type: 'web_app', text: 'Библиотека', web_app: { url: miniAppUrl } },
  });
}
