import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type Db = Database.Database;

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/**
 * Применяет ещё не применённые .sql-файлы по порядку имён.
 * Каждая миграция — в транзакции, запись в schema_migrations в той же транзакции,
 * чтобы падение на середине не оставило наполовину применённое состояние.
 */
export function migrate(db: Db): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);

  const applied = new Set(
    db.prepare<[], { name: string }>('SELECT name FROM schema_migrations').all().map((r) => r.name),
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const record = db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)');

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      record.run(file, new Date().toISOString());
    })();
  }
}

/**
 * Встроенный LOWER() в SQLite опускает регистр только у ASCII: «Место» остаётся «Место»,
 * и поиск по русскому названию в другом регистре не находил бы ничего.
 * Отдаём приведение регистра движку JS, который знает Unicode.
 */
export function registerFunctions(db: Db): void {
  db.function('lower_utf8', { deterministic: true }, (value: unknown) =>
    typeof value === 'string' ? value.toLowerCase() : value === null ? null : String(value).toLowerCase(),
  );
}

export function openDb(dbPath: string): Db {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  registerFunctions(db);
  migrate(db);
  return db;
}
