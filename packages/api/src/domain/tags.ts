import type { Db } from '../db/index.js';

export function listTags(db: Db, ownerId: string): string[] {
  return db.prepare<[string], { name: string }>(
    'SELECT name FROM tags WHERE owner_id = ? ORDER BY normalized_name',
  ).all(ownerId).map((tag) => tag.name);
}

/** Reuse the first spelling, including for Unicode tags, and remember unused tags. */
export function rememberTags(db: Db, ownerId: string, tags: string[]): string[] {
  const insert = db.prepare('INSERT OR IGNORE INTO tags (owner_id, normalized_name, name) VALUES (?, ?, ?)');
  const find = db.prepare<[string, string], { name: string }>(
    'SELECT name FROM tags WHERE owner_id = ? AND normalized_name = ?',
  );
  return [...new Set(tags.map((tag) => {
    const name = tag.trim();
    if (!name) return '';
    const key = name.toLowerCase();
    insert.run(ownerId, key, name);
    return find.get(ownerId, key)!.name;
  }).filter(Boolean))];
}
