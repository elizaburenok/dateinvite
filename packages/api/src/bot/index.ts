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

export function toResolverInput(message: Message, city: string | null): ResolverInput {
  return {
    text: message.text ?? message.caption ?? null,
    urls: extractUrls(message),
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

function libraryKeyboard(miniAppUrl: string): InlineKeyboard {
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

  bot.on('message', async (ctx) => {
    const user = currentUser(ctx);
    if (!user) return;

    const message = ctx.message;
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
    stored.forEach((candidate, index) => {
      keyboard.text(`${index + 1}. ${candidate.name}`, `pick:${place.id}:${index}`).row();
    });
    keyboard.text('Ничего не подошло', `drop:${place.id}`);

    const body =
      stored.length > 0
        ? [
            'Похоже, речь про одно из этих мест. Какое?',
            '',
            ...stored.map((c, i) => escapeHtml(candidateLine(i, c.name, c.address))),
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
  });

  bot.callbackQuery(/^pick:([^:]+):(\d+)$/, async (ctx) => {
    const user = currentUser(ctx);
    const placeId = ctx.match[1]!;
    const index = Number(ctx.match[2]);
    if (!user) return;

    const candidates = listCandidates(deps.db, placeId);
    const candidate = candidates[index];
    if (!candidate) {
      await ctx.answerCallbackQuery({ text: 'Этот вариант уже неактуален' });
      return;
    }

    const confirmed = confirmCandidate(deps.db, user.id, placeId, candidate.id);
    if (!confirmed) {
      await ctx.answerCallbackQuery({ text: 'Место не найдено' });
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
