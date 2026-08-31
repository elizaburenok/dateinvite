import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { openDb, type Db } from '../db/index.js';
import { buildDataCheckString, signInitData } from '../auth/initData.js';
import { insertPlace, type NewCandidate, type NewPlace } from '../domain/places.js';
import { upsertUser } from '../domain/users.js';
import type { Notifier } from '../notify.js';

export const TEST_BOT_TOKEN = '111:TEST';
export const PUBLIC_BASE_URL = 'https://invite.test';

export function initDataFor(telegramId: number, firstName = 'Хост'): string {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: telegramId, first_name: firstName }),
  });
  params.set('hash', signInitData(buildDataCheckString(params), TEST_BOT_TOKEN));
  return params.toString();
}

export function authHeader(telegramId = 42): Record<string, string> {
  return { authorization: `tma ${initDataFor(telegramId)}` };
}

export interface RecordedNotification {
  kind: 'opened' | 'answered';
  envelopeId: string;
  chosenPlaceName?: string;
  guestMessage?: string | null;
}

export function recordingNotifier(): { notifier: Notifier; sent: RecordedNotification[] } {
  const sent: RecordedNotification[] = [];
  return {
    sent,
    notifier: {
      async envelopeOpened(_host, envelope) {
        sent.push({ kind: 'opened', envelopeId: envelope.id });
      },
      async envelopeAnswered(_host, envelope, chosenPlace, guestMessage) {
        sent.push({
          kind: 'answered',
          envelopeId: envelope.id,
          chosenPlaceName: chosenPlace.name,
          guestMessage,
        });
      },
    },
  };
}

export interface TestContext {
  app: FastifyInstance;
  db: Db;
  sent: RecordedNotification[];
  close(): Promise<void>;
}

export async function makeTestContext(): Promise<TestContext> {
  const db = openDb(':memory:');
  const { notifier, sent } = recordingNotifier();
  const app = await buildApp({
    db,
    botToken: TEST_BOT_TOKEN,
    publicBaseUrl: PUBLIC_BASE_URL,
    envelopeTtlDays: 14,
    mediaDir: '/nonexistent-media-dir',
    notifier,
  });
  return {
    app,
    db,
    sent,
    async close() {
      await app.close();
      db.close();
    },
  };
}

/** Кладёт места прямо в БД: тесты конверта не должны зависеть от резолвера. */
export function seedPlaces(
  db: Db,
  telegramId: number,
  count: number,
  overrides: Partial<NewPlace> = {},
  candidates: NewCandidate[] = [],
): string[] {
  const user = upsertUser(db, { id: telegramId, first_name: 'Хост' });
  return Array.from({ length: count }, (_, index) =>
    insertPlace(
      db,
      {
        owner_id: user.id,
        name: `Место ${index + 1}`,
        address: `Улица ${index + 1}`,
        district: index % 2 === 0 ? 'Патриаршие' : 'Басманный',
        category: index % 2 === 0 ? 'Кофейня' : 'Бар',
        note: `почему сюда ${index + 1}`,
        photo_url: `/media/place-${index + 1}.jpg`,
        lat: 55.76 + index / 1000,
        lng: 37.59 + index / 1000,
        maps_url: `https://yandex.ru/maps/org/place-${index + 1}/`,
        tags: index === 0 ? ['утро'] : [],
        source: 'manual',
        enrichment_status: 'resolved',
        ...overrides,
      },
      candidates,
    ).id,
  );
}
