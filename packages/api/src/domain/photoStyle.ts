import { DEFAULT_HALFTONE, halftoneSettingsSchema, type HalftoneSettings } from '@invite/shared';
import type { Db } from '../db/index.js';

export function getPhotoStyle(db: Db, ownerId: string): HalftoneSettings {
  const row = db.prepare<[string], { settings: string }>('SELECT settings FROM photo_styles WHERE owner_id = ?').get(ownerId);
  return row ? halftoneSettingsSchema.parse(JSON.parse(row.settings)) : { ...DEFAULT_HALFTONE };
}

export function savePhotoStyle(db: Db, ownerId: string, settings: HalftoneSettings): void {
  db.prepare('INSERT INTO photo_styles (owner_id, settings) VALUES (?, ?) ON CONFLICT(owner_id) DO UPDATE SET settings = excluded.settings')
    .run(ownerId, JSON.stringify(settings));
}
