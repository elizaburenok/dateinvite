import type { Bot } from 'grammy';
import type { Notifier } from '../notify.js';
import { escapeHtml } from './format.js';

/**
 * Единственное место, где домен встречается с Telegram.
 * Ошибки отправки не должны ронять запрос гостя, поэтому все они гасятся здесь.
 */
export function createTelegramNotifier(bot: Bot, publicBaseUrl: string): Notifier {
  async function send(chatId: number, text: string): Promise<void> {
    try {
      await bot.api.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });
    } catch {
      // Хост мог заблокировать бота — это не повод ломать ответ гостю.
    }
  }

  return {
    async envelopeOpened(host, envelope) {
      const note = envelope.host_note ? ` «${escapeHtml(envelope.host_note)}»` : '';
      await send(
        host.telegram_id,
        `👀 Ваше приглашение${note} открыли.\n<a href="${publicBaseUrl}/i/${envelope.token}">Посмотреть конверт</a>`,
      );
    },

    async envelopeAnswered(host, envelope, chosenPlace, guestMessage) {
      const lines = [
        '💌 На ваше приглашение ответили!',
        '',
        `Выбрали: <b>${escapeHtml(chosenPlace.name)}</b>`,
      ];
      const meta = [chosenPlace.category, chosenPlace.district].filter(Boolean).join(' · ');
      if (meta) lines.push(escapeHtml(meta));
      if (chosenPlace.address) lines.push(escapeHtml(chosenPlace.address));
      if (guestMessage) lines.push('', `Сообщение: <i>${escapeHtml(guestMessage)}</i>`);
      if (chosenPlace.maps_url) {
        lines.push('', `<a href="${escapeHtml(chosenPlace.maps_url)}">Открыть в Картах</a>`);
      }
      void envelope;
      await send(host.telegram_id, lines.join('\n'));
    },
  };
}
