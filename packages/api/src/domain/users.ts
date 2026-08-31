import type { Db } from '../db/index.js';
import { nowIso, uuid } from '../lib/ids.js';
import type { TelegramUser } from '../auth/initData.js';

export interface UserRow {
  id: string;
  telegram_id: number;
  first_name: string | null;
  username: string | null;
  city: string | null;
  created_at: string;
}

/** Идентичность хоста — это Telegram-аккаунт (§2), отдельной регистрации нет. */
export function upsertUser(
  db: Db,
  tgUser: Pick<TelegramUser, 'id' | 'first_name' | 'username'>,
): UserRow {
  const existing = db
    .prepare<[number], UserRow>('SELECT * FROM users WHERE telegram_id = ?')
    .get(tgUser.id);

  if (existing) {
    const first = tgUser.first_name ?? existing.first_name;
    const username = tgUser.username ?? existing.username;
    if (first !== existing.first_name || username !== existing.username) {
      db.prepare('UPDATE users SET first_name = ?, username = ? WHERE id = ?').run(
        first,
        username,
        existing.id,
      );
      return { ...existing, first_name: first, username };
    }
    return existing;
  }

  const row: UserRow = {
    id: uuid(),
    telegram_id: tgUser.id,
    first_name: tgUser.first_name ?? null,
    username: tgUser.username ?? null,
    city: null,
    created_at: nowIso(),
  };
  db.prepare(
    `INSERT INTO users (id, telegram_id, first_name, username, city, created_at)
     VALUES (@id, @telegram_id, @first_name, @username, @city, @created_at)`,
  ).run(row);
  return row;
}

export function getUserById(db: Db, id: string): UserRow | undefined {
  return db.prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?').get(id);
}

export function setUserCity(db: Db, id: string, city: string | null): void {
  db.prepare('UPDATE users SET city = ? WHERE id = ?').run(city, id);
}
