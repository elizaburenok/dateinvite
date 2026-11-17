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
import type { PostAnalyzer } from '../resolver/postAnalyzer.js';
import type { PhotoStore } from '../resolver/photos.js';
import { getPhotoStyle } from '../domain/photoStyle.js';
import type { Locale } from '../locale/index.js';
import { candidateLine, escapeHtml, placeCard } from './format.js';

export interface BotDeps {
  db: Db;
  token: string;
  nominatim: NominatimClient;
  photoStore: PhotoStore;
  miniAppUrl: string;
  /** Перевод places на английский при сохранении. Без него место ляжет как есть. */
  locale?: Locale;
  /** LLM-разбор поста для ветки «только текст» без адреса. Без него — эвристика. */
  analyzer?: PostAnalyzer;
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
 * Текст, который человек сам обернул в ссылку, почти всегда и есть название places:
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
    // Отсекаем по строчной кириллице: с неё начинается фраза, но не название.
    // Латиница со строчной — сплошь и рядом название: «gaby bistro», «bolt».
    .filter((title) => /^[«"']?(?:[\p{Lu}]|[A-Za-z])/u.test(title));
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
 * и всё сообщение целиком. Без https кнопку не рисуем: ответ важнее украшения.
 */
function libraryKeyboard(miniAppUrl: string): InlineKeyboard | undefined {
  if (!miniAppUrl.startsWith('https://')) return undefined;
  return new InlineKeyboard().webApp('Open library', miniAppUrl);
}

/**
 * Приглашение открыть библиотеку. Когда кнопки нет, текст обязан меняться:
 * фраза «библиотека — здесь:» без кнопки обрывается в никуда и выглядит
 * поломкой, хотя на деле приложение просто запущено без https.
 */
function libraryInvite(miniAppUrl: string): { text: string; keyboard?: InlineKeyboard } {
  const keyboard = libraryKeyboard(miniAppUrl);
  if (keyboard) return { text: 'Open your library and create envelopes here:', keyboard };
  return {
    text:
      'Telegram shows the library button only with HTTPS, ' +
      `and the app is currently running at ${escapeHtml(miniAppUrl)}.\n\n` +
      'For now, open the library at this address in your browser. ' +
      'The button will appear here when the app is hosted over HTTPS.',
  };
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
        'Hi! I collect your favorite places and turn them into invitations.',
        '',
        '• Forward me a post about a place or send a Yandex Maps link. I’ll save it to your library.',
        '• You can also send a location pin.',
        '• Once you have a few places, create an envelope with 3–5 places and send one link to a friend.',
      ].join('\n'),
      { reply_markup: libraryKeyboard(deps.miniAppUrl) },
    );
  });

  bot.command('library', async (ctx) => {
    currentUser(ctx);
    const invite = libraryInvite(deps.miniAppUrl);
    await ctx.reply(invite.text, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      reply_markup: invite.keyboard,
    });
  });

  bot.command('city', async (ctx) => {
    const user = currentUser(ctx);
    if (!user) return;
    const city = ctx.match?.trim();
    if (!city) {
      await ctx.reply(
        user.city
          ? `I’m searching for places in ${user.city}. To change it: /city London`
          : 'Set your city for more accurate place search: /city London',
      );
      return;
    }
    deps.db.prepare('UPDATE users SET city = ? WHERE id = ?').run(city, user.id);
    await ctx.reply(`Got it. I’ll search for places in ${city}.`);
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
      await ctx.reply('Send a post, a Maps link, or a location pin, and I’ll save the place.');
      return;
    }

    const thinking = await ctx.reply('Looking for the place…');

    let result;
    try {
      result = await resolvePlace(input, {
        nominatim: deps.nominatim,
        locale: deps.locale,
        analyzer: deps.analyzer,
        onAnalyzerError: (error) => console.error('[bot] LLM-разбор поста не удался', error),
      });
    } catch (error) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        thinking.message_id,
        'I couldn’t identify this place because the maps service did not respond. Try again or add it manually in the library.',
      );
      return;
    }

    if (result.status === 'failed') {
      // Молчаливая ошибка недопустима (§3): честно говорим, что не вышло.
      await ctx.api.editMessageText(
        ctx.chat.id,
        thinking.message_id,
        `I couldn’t tell which place you mean. ${escapeHtml(result.reason)}.\nYou can add the place manually in the library.`,
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
            getPhotoStyle(deps.db, user.id),
          );
        }
      } catch {
        // Place без фото полезнее, чем отсутствие places.
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
        name_ru: draft.name_ru,
        address_ru: draft.address_ru,
        district_ru: draft.district_ru,
        lat: draft.lat,
        lng: draft.lng,
        maps_url: draft.maps_url,
        // Медиагруппа из Telegram приходит отдельными апдейтами и пока не собирается —
        // из одного сообщения берём одно фото, но модель уже держит массив.
        photos: photoUrl ? [photoUrl] : [],
        source: draft.source,
        enrichment_status: result.status,
        source_ref: input.sourceRef ?? null,
      },
      candidates.map((candidate) => ({
        name: candidate.name,
        address: candidate.address,
        district: candidate.district,
        category: candidate.category,
        name_ru: candidate.name_ru,
        address_ru: candidate.address_ru,
        district_ru: candidate.district_ru,
        lat: candidate.lat,
        lng: candidate.lng,
        maps_url: candidate.maps_url,
      })),
    );

    if (result.status === 'resolved') {
      await ctx.api.editMessageText(
        ctx.chat.id,
        thinking.message_id,
        `✅ Saved to your library.\n\n${placeCard(place)}`,
        { parse_mode: 'HTML', reply_markup: libraryKeyboard(deps.miniAppUrl) },
      );
      return;
    }

    // Нечёткое распознавание: показываем 1–3 варианта и ждём человека (§3, §7).
    const stored = listCandidates(deps.db, place.id);
    const keyboard = new InlineKeyboard();
    if (stored.length === 1) {
      keyboard.text('Save', `pick:${place.id}:0`).row();
    } else {
      stored.forEach((candidate, index) => {
        keyboard.text(`${index + 1}. ${candidate.name}`, `pick:${place.id}:${index}`).row();
      });
    }
    keyboard.text('None of these', `drop:${place.id}`);

    // Одна и та же улица есть в разных городах. Пока хост не сказал свой,
    // варианты будут разъезжаться по стране — подсказываем это прямо здесь.
    const cityHint = user.city
      ? []
      : ['', 'Tell me your city with /city so I can find more accurate matches.'];

    const single = stored.length === 1 ? stored[0]! : null;

    const body =
      single
        ? [
            // Одна строка с номером «1.» выглядела бы как выбор без выбора.
            'I found this place. Save it?',
            '',
            `<b>${escapeHtml(single.name)}</b>`,
            escapeHtml([single.address, single.district].filter(Boolean).join(' · ')),
            ...cityHint,
          ].join('\n')
        : stored.length > 0
          ? [
              'It looks like one of these places. Which one?',
              '',
              ...stored.map((c, i) => escapeHtml(candidateLine(i, c.name, c.address))),
              ...cityHint,
            ].join('\n')
        : [
            'I saved the location but could not find its name.',
            '',
            placeCard(place),
            '',
            'Open the library and add a name.',
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
        text: 'This message has expired. Forward the post again.',
        show_alert: true,
      });
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
      return;
    }

    const confirmed = confirmCandidate(deps.db, user.id, placeId, candidate.id);
    if (!confirmed) {
      await ctx.answerCallbackQuery({
        text: 'This message has expired. Forward the post again.',
        show_alert: true,
      });
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
      return;
    }

    await ctx.answerCallbackQuery({ text: 'Saved' });
    await ctx.editMessageText(`✅ Saved to your library.\n\n${placeCard(confirmed)}`, {
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

    await ctx.answerCallbackQuery({ text: 'Removed' });
    await ctx.editMessageText(
      'Okay, I won’t save it. You can add the place manually in the library.',
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
    { command: 'library', description: 'Open place library' },
    { command: 'city', description: 'Set search city' },
    { command: 'start', description: 'How it works' },
  ]);
  await bot.api.setChatMenuButton({
    menu_button: { type: 'web_app', text: 'Library', web_app: { url: miniAppUrl } },
  });
}
