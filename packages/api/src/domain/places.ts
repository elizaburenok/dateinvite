import type {
  EnrichmentStatus,
  Place,
  PlaceCandidate,
  PlaceFilters,
  PlaceSource,
  PlaceWithCandidates,
  LibraryFacets,
} from '@invite/shared';
import type { Db } from '../db/index.js';
import { nowIso, uuid } from '../lib/ids.js';

export interface PlaceRow {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  district: string | null;
  category: string | null;
  /** JSON-массив путей — см. миграцию 002. */
  photos: string;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
  maps_url: string | null;
  rating: number | null;
  hours: string | null;
  note: string | null;
  tags: string;
  source: PlaceSource;
  enrichment_status: EnrichmentStatus;
  source_ref: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface CandidateRow {
  id: string;
  place_id: string;
  position: number;
  name: string;
  address: string;
  district: string | null;
  category: string | null;
  lat: number | null;
  lng: number | null;
  maps_url: string | null;
}

export interface NewPlace {
  owner_id: string;
  name: string;
  address?: string;
  district?: string | null;
  category?: string | null;
  photos?: string[];
  lat?: number | null;
  lng?: number | null;
  maps_url?: string | null;
  rating?: number | null;
  hours?: string | null;
  note?: string | null;
  tags?: string[];
  source: PlaceSource;
  enrichment_status: EnrichmentStatus;
  source_ref?: string | null;
}

export interface NewCandidate {
  name: string;
  address?: string;
  district?: string | null;
  category?: string | null;
  lat?: number | null;
  lng?: number | null;
  maps_url?: string | null;
}

/** И tags, и photos лежат в БД одинаково — JSON-массивом строк. */
function parseStringArray(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

export function rowToPlace(row: PlaceRow): Place {
  const photos = parseStringArray(row.photos);
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    district: row.district,
    category: row.category,
    photos,
    // Обложка выводится из массива, а не читается из колонки: колонка photo_url
    // остаётся только ради старых строк и записи назад, источник правды — photos.
    photo_url: photos[0] ?? null,
    lat: row.lat,
    lng: row.lng,
    maps_url: row.maps_url,
    rating: row.rating,
    hours: row.hours,
    note: row.note,
    tags: parseStringArray(row.tags),
    source: row.source,
    enrichment_status: row.enrichment_status,
    created_at: row.created_at,
  };
}

export function rowToCandidate(row: CandidateRow): PlaceCandidate {
  return {
    id: row.id,
    place_id: row.place_id,
    name: row.name,
    address: row.address,
    district: row.district,
    category: row.category,
    lat: row.lat,
    lng: row.lng,
    maps_url: row.maps_url,
  };
}

export function insertPlace(db: Db, input: NewPlace, candidates: NewCandidate[] = []): PlaceRow {
  const row: PlaceRow = {
    id: uuid(),
    owner_id: input.owner_id,
    name: input.name,
    address: input.address ?? '',
    district: input.district ?? null,
    category: input.category ?? null,
    photos: JSON.stringify(input.photos ?? []),
    photo_url: input.photos?.[0] ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    maps_url: input.maps_url ?? null,
    rating: input.rating ?? null,
    hours: input.hours ?? null,
    note: input.note ?? null,
    tags: JSON.stringify(input.tags ?? []),
    source: input.source,
    enrichment_status: input.enrichment_status,
    source_ref: input.source_ref ?? null,
    created_at: nowIso(),
    deleted_at: null,
  };

  const insertRow = db.prepare(
    `INSERT INTO places (id, owner_id, name, address, district, category, photos, photo_url,
                         lat, lng, maps_url, rating, hours, note, tags, source,
                         enrichment_status, source_ref, created_at, deleted_at)
     VALUES (@id, @owner_id, @name, @address, @district, @category, @photos, @photo_url,
             @lat, @lng, @maps_url, @rating, @hours, @note, @tags, @source,
             @enrichment_status, @source_ref, @created_at, @deleted_at)`,
  );
  const insertCandidate = db.prepare(
    `INSERT INTO place_candidates (id, place_id, position, name, address, district, category,
                                   lat, lng, maps_url)
     VALUES (@id, @place_id, @position, @name, @address, @district, @category,
             @lat, @lng, @maps_url)`,
  );

  db.transaction(() => {
    insertRow.run(row);
    candidates.forEach((candidate, index) => {
      insertCandidate.run({
        id: uuid(),
        place_id: row.id,
        position: index,
        name: candidate.name,
        address: candidate.address ?? '',
        district: candidate.district ?? null,
        category: candidate.category ?? null,
        lat: candidate.lat ?? null,
        lng: candidate.lng ?? null,
        maps_url: candidate.maps_url ?? null,
      });
    });
  })();

  return row;
}

export function getPlaceRow(db: Db, ownerId: string, placeId: string): PlaceRow | undefined {
  return db
    .prepare<[string, string], PlaceRow>(
      'SELECT * FROM places WHERE id = ? AND owner_id = ? AND deleted_at IS NULL',
    )
    .get(placeId, ownerId);
}

function candidatesFor(db: Db, placeIds: string[]): Map<string, PlaceCandidate[]> {
  const byPlace = new Map<string, PlaceCandidate[]>();
  if (placeIds.length === 0) return byPlace;
  const placeholders = placeIds.map(() => '?').join(',');
  const rows = db
    .prepare<string[], CandidateRow>(
      `SELECT * FROM place_candidates WHERE place_id IN (${placeholders}) ORDER BY position`,
    )
    .all(...placeIds);
  for (const row of rows) {
    const list = byPlace.get(row.place_id) ?? [];
    list.push(rowToCandidate(row));
    byPlace.set(row.place_id, list);
  }
  return byPlace;
}

export function listPlaces(db: Db, ownerId: string, filters: PlaceFilters = {}): PlaceWithCandidates[] {
  const where: string[] = ['owner_id = ?', 'deleted_at IS NULL'];
  const params: unknown[] = [ownerId];

  if (filters.district) {
    where.push('district = ?');
    params.push(filters.district);
  }
  if (filters.category) {
    where.push('category = ?');
    params.push(filters.category);
  }
  if (filters.status) {
    where.push('enrichment_status = ?');
    params.push(filters.status);
  }
  if (filters.q) {
    where.push('lower_utf8(name) LIKE ?');
    params.push(`%${filters.q.toLowerCase()}%`);
  }
  if (filters.tag) {
    // tags — JSON-массив; json_each разворачивает его в строки, EXISTS даёт точное совпадение
    // вместо LIKE, который спутал бы «кофе» и «кофейня».
    where.push('EXISTS (SELECT 1 FROM json_each(places.tags) WHERE json_each.value = ?)');
    params.push(filters.tag);
  }

  const rows = db
    .prepare<unknown[], PlaceRow>(
      // rowid как второй ключ: несколько мест, добавленных в одну миллисекунду,
      // иначе возвращались бы в непредсказуемом порядке.
      `SELECT * FROM places WHERE ${where.join(' AND ')} ORDER BY created_at DESC, rowid DESC`,
    )
    .all(...params);

  const candidates = candidatesFor(
    db,
    rows.filter((r) => r.enrichment_status === 'needs_confirmation').map((r) => r.id),
  );

  return rows.map((row) => ({
    ...rowToPlace(row),
    candidates: candidates.get(row.id) ?? [],
  }));
}

/** Фасеты считаются по всей библиотеке, а не по текущей выборке — иначе фильтр себя же и схлопнет. */
export function getFacets(db: Db, ownerId: string): LibraryFacets {
  const districts = db
    .prepare<[string], { value: string }>(
      `SELECT DISTINCT district AS value FROM places
       WHERE owner_id = ? AND deleted_at IS NULL AND district IS NOT NULL AND district <> ''
       ORDER BY value`,
    )
    .all(ownerId)
    .map((r) => r.value);

  const categories = db
    .prepare<[string], { value: string }>(
      `SELECT DISTINCT category AS value FROM places
       WHERE owner_id = ? AND deleted_at IS NULL AND category IS NOT NULL AND category <> ''
       ORDER BY value`,
    )
    .all(ownerId)
    .map((r) => r.value);

  const tags = db
    .prepare<[string], { value: string }>(
      `SELECT DISTINCT json_each.value AS value FROM places, json_each(places.tags)
       WHERE owner_id = ? AND deleted_at IS NULL
       ORDER BY value`,
    )
    .all(ownerId)
    .map((r) => r.value);

  const pending = db
    .prepare<[string], { count: number }>(
      `SELECT COUNT(*) AS count FROM places
       WHERE owner_id = ? AND deleted_at IS NULL AND enrichment_status = 'needs_confirmation'`,
    )
    .get(ownerId);

  return {
    districts,
    categories,
    tags,
    needs_confirmation_count: pending?.count ?? 0,
  };
}

export interface PlacePatch {
  note?: string | null;
  tags?: string[];
  name?: string;
  address?: string;
  district?: string | null;
  category?: string | null;
  photos?: string[];
  enrichment_status?: EnrichmentStatus;
  lat?: number | null;
  lng?: number | null;
  maps_url?: string | null;
}

export function updatePlace(db: Db, ownerId: string, placeId: string, patch: PlacePatch): PlaceRow | undefined {
  const current = getPlaceRow(db, ownerId, placeId);
  if (!current) return undefined;

  const next: PlaceRow = {
    ...current,
    ...(patch.note !== undefined ? { note: patch.note } : {}),
    ...(patch.tags !== undefined ? { tags: JSON.stringify(patch.tags) } : {}),
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.address !== undefined ? { address: patch.address } : {}),
    ...(patch.district !== undefined ? { district: patch.district } : {}),
    ...(patch.category !== undefined ? { category: patch.category } : {}),
    ...(patch.photos !== undefined
      ? { photos: JSON.stringify(patch.photos), photo_url: patch.photos[0] ?? null }
      : {}),
    ...(patch.enrichment_status !== undefined ? { enrichment_status: patch.enrichment_status } : {}),
    ...(patch.lat !== undefined ? { lat: patch.lat } : {}),
    ...(patch.lng !== undefined ? { lng: patch.lng } : {}),
    ...(patch.maps_url !== undefined ? { maps_url: patch.maps_url } : {}),
  };

  db.prepare(
    `UPDATE places SET name = @name, address = @address, district = @district, category = @category,
                       photos = @photos, photo_url = @photo_url, lat = @lat, lng = @lng,
                       maps_url = @maps_url, note = @note, tags = @tags,
                       enrichment_status = @enrichment_status
     WHERE id = @id`,
  ).run(next);

  return next;
}

/**
 * Подтверждение кандидата (§3, §8): данные кандидата переезжают в место,
 * статус становится resolved, остальные кандидаты выбрасываются.
 */
export function confirmCandidate(
  db: Db,
  ownerId: string,
  placeId: string,
  candidateId: string,
): PlaceRow | undefined {
  const place = getPlaceRow(db, ownerId, placeId);
  if (!place) return undefined;

  const candidate = db
    .prepare<[string, string], CandidateRow>(
      'SELECT * FROM place_candidates WHERE id = ? AND place_id = ?',
    )
    .get(candidateId, placeId);
  if (!candidate) return undefined;

  return db.transaction(() => {
    const updated = updatePlace(db, ownerId, placeId, {
      name: candidate.name,
      address: candidate.address,
      district: candidate.district,
      category: candidate.category,
      lat: candidate.lat,
      lng: candidate.lng,
      maps_url: candidate.maps_url,
      enrichment_status: 'resolved',
    });
    db.prepare('DELETE FROM place_candidates WHERE place_id = ?').run(placeId);
    return updated;
  })();
}

/**
 * Кандидаты только живого места. JOIN здесь не формальность: строки могли
 * пережить своё место (например, если базу правили в обход внешних ключей —
 * SQLite включает их не по умолчанию). Без проверки бот показывал бы варианты
 * для места, которого больше нет.
 */
export function listCandidates(db: Db, placeId: string): PlaceCandidate[] {
  return db
    .prepare<[string], CandidateRow>(
      `SELECT c.* FROM place_candidates c
       JOIN places p ON p.id = c.place_id AND p.deleted_at IS NULL
       WHERE c.place_id = ?
       ORDER BY c.position`,
    )
    .all(placeId)
    .map(rowToCandidate);
}

/**
 * Мягкое удаление: место исчезает из библиотеки, но уже отправленные конверты
 * продолжают его показывать — снапшот не должен рассыпаться задним числом (§3).
 */
export function softDeletePlace(db: Db, ownerId: string, placeId: string): boolean {
  const result = db
    .prepare('UPDATE places SET deleted_at = ? WHERE id = ? AND owner_id = ? AND deleted_at IS NULL')
    .run(nowIso(), placeId, ownerId);
  return result.changes > 0;
}
