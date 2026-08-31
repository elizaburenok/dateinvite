import {
  ENVELOPE_MAX_PLACES,
  ENVELOPE_MIN_PLACES,
  type EnvelopeStatus,
  type GuestPlace,
  type InviteResponse,
} from '@invite/shared';
import type { Db } from '../db/index.js';
import { envelopeToken, nowIso, uuid } from '../lib/ids.js';
import { badRequest, gone, notFound } from './errors.js';
import { rowToPlace, type PlaceRow } from './places.js';

export interface EnvelopeRow {
  id: string;
  token: string;
  owner_id: string;
  host_note: string | null;
  status: EnvelopeStatus;
  created_at: string;
  sent_at: string | null;
  opened_at: string | null;
  answered_at: string | null;
  expires_at: string | null;
}

export interface AnswerRow {
  envelope_id: string;
  chosen_place_id: string;
  guest_message: string | null;
  answered_at: string;
}

/**
 * Статус, каким его видит мир. В таблице лежит только «достигнутая» стадия,
 * а протухание — функция от времени, поэтому вычисляем на чтении, а не по крону.
 * Отвеченный конверт не протухает: ответ уже случился, прятать его бессмысленно.
 */
export function effectiveStatus(row: EnvelopeRow, now = new Date()): EnvelopeStatus {
  if (row.status === 'answered') return 'answered';
  if (row.expires_at && new Date(row.expires_at).getTime() <= now.getTime()) return 'expired';
  return row.status;
}

export function inviteUrl(publicBaseUrl: string, token: string): string {
  return `${publicBaseUrl}/i/${token}`;
}

export interface CreateEnvelopeInput {
  ownerId: string;
  placeIds: string[];
  hostNote: string | null;
  ttlDays: number;
}

export function createEnvelope(db: Db, input: CreateEnvelopeInput): EnvelopeRow {
  const unique = [...new Set(input.placeIds)];
  if (unique.length !== input.placeIds.length) {
    throw badRequest('duplicate_places', 'В конверте не может быть одного и того же места дважды');
  }
  // Дублируем проверку схемы намеренно: лимит 3–5 обязан держаться на уровне API,
  // даже если конверт создаётся не из Mini App (приёмочный критерий §12).
  if (unique.length < ENVELOPE_MIN_PLACES || unique.length > ENVELOPE_MAX_PLACES) {
    throw badRequest(
      'invalid_place_count',
      `В конверте должно быть от ${ENVELOPE_MIN_PLACES} до ${ENVELOPE_MAX_PLACES} мест, получено ${unique.length}`,
    );
  }

  const placeholders = unique.map(() => '?').join(',');
  const rows = db
    .prepare<string[], PlaceRow>(
      `SELECT * FROM places
       WHERE id IN (${placeholders}) AND owner_id = ? AND deleted_at IS NULL`,
    )
    .all(...unique, input.ownerId);

  if (rows.length !== unique.length) {
    throw badRequest('unknown_place', 'Некоторые места не найдены в вашей библиотеке');
  }
  const unconfirmed = rows.find((r) => r.enrichment_status !== 'resolved');
  if (unconfirmed) {
    throw badRequest(
      'unconfirmed_place',
      `Место «${unconfirmed.name}» ещё не подтверждено — подтвердите его перед отправкой`,
    );
  }

  const now = nowIso();
  const envelope: EnvelopeRow = {
    id: uuid(),
    token: envelopeToken(),
    owner_id: input.ownerId,
    host_note: input.hostNote,
    // Ссылка генерируется сразу, значит конверт сразу переходит draft → sent (§5).
    status: 'sent',
    created_at: now,
    sent_at: now,
    opened_at: null,
    answered_at: null,
    expires_at:
      input.ttlDays > 0
        ? new Date(Date.now() + input.ttlDays * 24 * 60 * 60 * 1000).toISOString()
        : null,
  };

  const insertEnvelope = db.prepare(
    `INSERT INTO envelopes (id, token, owner_id, host_note, status, created_at, sent_at,
                            opened_at, answered_at, expires_at)
     VALUES (@id, @token, @owner_id, @host_note, @status, @created_at, @sent_at,
             @opened_at, @answered_at, @expires_at)`,
  );
  const insertLink = db.prepare(
    'INSERT INTO envelope_places (envelope_id, place_id, position) VALUES (?, ?, ?)',
  );

  db.transaction(() => {
    insertEnvelope.run(envelope);
    // Порядок берём из запроса хоста, а не из порядка строк в БД.
    unique.forEach((placeId, index) => insertLink.run(envelope.id, placeId, index));
  })();

  return envelope;
}

export function getEnvelopeByToken(db: Db, token: string): EnvelopeRow | undefined {
  return db.prepare<[string], EnvelopeRow>('SELECT * FROM envelopes WHERE token = ?').get(token);
}

export function getEnvelopeById(db: Db, id: string): EnvelopeRow | undefined {
  return db.prepare<[string], EnvelopeRow>('SELECT * FROM envelopes WHERE id = ?').get(id);
}

/**
 * Места конверта. Специально без фильтра deleted_at: конверт — снапшот,
 * он не должен худеть от того, что хост прибрался в библиотеке (§3).
 */
export function envelopePlaceRows(db: Db, envelopeId: string): PlaceRow[] {
  return db
    .prepare<[string], PlaceRow>(
      `SELECT p.* FROM envelope_places ep
       JOIN places p ON p.id = ep.place_id
       WHERE ep.envelope_id = ?
       ORDER BY ep.position`,
    )
    .all(envelopeId);
}

export function getAnswer(db: Db, envelopeId: string): AnswerRow | undefined {
  return db
    .prepare<[string], AnswerRow>('SELECT * FROM answers WHERE envelope_id = ?')
    .get(envelopeId);
}

/**
 * Первое успешное открытие страницы переводит sent → opened (§5).
 * Возвращает true только на самом переходе — по нему шлётся пуш «посмотрел» (§14.3).
 */
export function markOpened(db: Db, envelope: EnvelopeRow): boolean {
  if (envelope.status !== 'sent') return false;
  const openedAt = nowIso();
  const result = db
    .prepare("UPDATE envelopes SET status = 'opened', opened_at = ? WHERE id = ? AND status = 'sent'")
    .run(openedAt, envelope.id);
  if (result.changes === 0) return false;
  envelope.status = 'opened';
  envelope.opened_at = openedAt;
  return true;
}

export interface RecordAnswerResult {
  answer: AnswerRow;
  /** false — повторный POST по уже отвеченному конверту; дубль не создан (§8). */
  created: boolean;
}

export function recordAnswer(
  db: Db,
  envelope: EnvelopeRow,
  chosenPlaceId: string,
  message: string | null,
): RecordAnswerResult {
  const existing = getAnswer(db, envelope.id);
  // Идемпотентность: повторный ответ возвращает уже записанный, ничего не переписывая.
  if (existing) return { answer: existing, created: false };

  if (effectiveStatus(envelope) === 'expired') {
    throw gone('envelope_expired', 'Срок действия приглашения истёк');
  }

  const belongs = db
    .prepare<[string, string], { count: number }>(
      'SELECT COUNT(*) AS count FROM envelope_places WHERE envelope_id = ? AND place_id = ?',
    )
    .get(envelope.id, chosenPlaceId);
  if (!belongs || belongs.count === 0) {
    throw badRequest('unknown_place', 'Выбранного места нет в этом приглашении');
  }

  const answer: AnswerRow = {
    envelope_id: envelope.id,
    chosen_place_id: chosenPlaceId,
    guest_message: message,
    answered_at: nowIso(),
  };

  db.transaction(() => {
    db.prepare(
      `INSERT INTO answers (envelope_id, chosen_place_id, guest_message, answered_at)
       VALUES (@envelope_id, @chosen_place_id, @guest_message, @answered_at)`,
    ).run(answer);
    db.prepare("UPDATE envelopes SET status = 'answered', answered_at = ? WHERE id = ?").run(
      answer.answered_at,
      envelope.id,
    );
  })();

  envelope.status = 'answered';
  envelope.answered_at = answer.answered_at;
  return { answer, created: true };
}

export function requireEnvelopeByToken(db: Db, token: string): EnvelopeRow {
  const envelope = getEnvelopeByToken(db, token);
  if (!envelope) throw notFound('Приглашение не найдено');
  return envelope;
}

/** Тело ответа `GET /invite/{token}` — собирается только из снапшота в БД (§8, §12). */
export function toInviteResponse(
  envelope: EnvelopeRow,
  places: PlaceRow[],
  answer: AnswerRow | undefined,
  toPublicUrl: (photoUrl: string | null) => string | null,
): InviteResponse {
  const guestPlaces: GuestPlace[] = places.map((row) => {
    const place = rowToPlace(row);
    return {
      id: place.id,
      name: place.name,
      district: place.district,
      category: place.category,
      photo_url: toPublicUrl(place.photo_url),
      note: place.note,
      lat: place.lat,
      lng: place.lng,
      maps_url: place.maps_url,
      rating: place.rating,
    };
  });

  return {
    token: envelope.token,
    status: effectiveStatus(envelope),
    host_note: envelope.host_note,
    expires_at: envelope.expires_at,
    places: guestPlaces,
    answer: answer
      ? {
          chosen_place_id: answer.chosen_place_id,
          message: answer.guest_message,
          answered_at: answer.answered_at,
        }
      : null,
  };
}

export function listEnvelopeRows(db: Db, ownerId: string): EnvelopeRow[] {
  return db
    .prepare<[string], EnvelopeRow>(
      'SELECT * FROM envelopes WHERE owner_id = ? ORDER BY created_at DESC',
    )
    .all(ownerId);
}
