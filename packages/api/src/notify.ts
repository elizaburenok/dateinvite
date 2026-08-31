import type { EnvelopeRow } from './domain/envelopes.js';
import type { PlaceRow } from './domain/places.js';
import type { UserRow } from './domain/users.js';

/**
 * Домен не знает про Telegram: он лишь сообщает, что случилось.
 * Реальная отправка живёт в bot/notifier.ts, в тестах подставляется заглушка.
 */
export interface Notifier {
  envelopeOpened(host: UserRow, envelope: EnvelopeRow): Promise<void>;
  envelopeAnswered(
    host: UserRow,
    envelope: EnvelopeRow,
    chosenPlace: PlaceRow,
    guestMessage: string | null,
  ): Promise<void>;
}

export const noopNotifier: Notifier = {
  async envelopeOpened() {},
  async envelopeAnswered() {},
};
