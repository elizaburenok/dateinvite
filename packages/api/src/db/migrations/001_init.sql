-- Схема по §4 ТЗ. Всё, что показывается гостю, лежит здесь снапшотом:
-- страница-конверт никогда не ходит во внешние источники (§3).

CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  telegram_id INTEGER NOT NULL UNIQUE,
  first_name  TEXT,
  username    TEXT,
  -- Город хоста: подсказка для поиска кандидатов по текстовому посту (§7).
  city        TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE places (
  id                TEXT PRIMARY KEY,
  owner_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  address           TEXT NOT NULL DEFAULT '',
  district          TEXT,
  category          TEXT,
  photo_url         TEXT,
  lat               REAL,
  lng               REAL,
  maps_url          TEXT,
  rating            REAL,
  hours             TEXT,
  note              TEXT,
  tags              TEXT NOT NULL DEFAULT '[]',   -- JSON-массив строк
  source            TEXT NOT NULL CHECK (source IN ('telegram', 'yandex', 'manual')),
  enrichment_status TEXT NOT NULL
                    CHECK (enrichment_status IN ('resolved', 'needs_confirmation', 'failed')),
  -- Исходная ссылка или id поста: только для отладки, гостю не отдаётся.
  source_ref        TEXT,
  created_at        TEXT NOT NULL,
  -- Мягкое удаление: уже отправленный конверт не должен разваливаться
  -- из-за того, что хост прибрался в библиотеке (§3, снапшот).
  deleted_at        TEXT
);

CREATE INDEX idx_places_owner ON places (owner_id, deleted_at);
CREATE INDEX idx_places_status ON places (owner_id, enrichment_status);

-- Кандидаты для нечёткого распознавания (§7). Живут, пока хост не подтвердил один.
CREATE TABLE place_candidates (
  id       TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name     TEXT NOT NULL,
  address  TEXT NOT NULL DEFAULT '',
  district TEXT,
  category TEXT,
  lat      REAL,
  lng      REAL,
  maps_url TEXT
);

CREATE INDEX idx_candidates_place ON place_candidates (place_id, position);

CREATE TABLE envelopes (
  id          TEXT PRIMARY KEY,
  token       TEXT NOT NULL UNIQUE,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  host_note   TEXT,
  status      TEXT NOT NULL
              CHECK (status IN ('draft', 'sent', 'opened', 'answered', 'expired')),
  created_at  TEXT NOT NULL,
  sent_at     TEXT,
  opened_at   TEXT,
  answered_at TEXT,
  expires_at  TEXT
);

CREATE INDEX idx_envelopes_owner ON envelopes (owner_id, created_at DESC);

-- Порядок мест в конверте задаёт хост, поэтому position, а не просто множество.
CREATE TABLE envelope_places (
  envelope_id TEXT NOT NULL REFERENCES envelopes(id) ON DELETE CASCADE,
  place_id    TEXT NOT NULL REFERENCES places(id),
  position    INTEGER NOT NULL,
  PRIMARY KEY (envelope_id, position)
);

CREATE INDEX idx_envelope_places_place ON envelope_places (place_id);

-- Первичный ключ по envelope_id — идемпотентность ответа на уровне БД (§8):
-- повторный POST физически не может создать вторую строку.
CREATE TABLE answers (
  envelope_id    TEXT PRIMARY KEY REFERENCES envelopes(id) ON DELETE CASCADE,
  chosen_place_id TEXT NOT NULL REFERENCES places(id),
  guest_message  TEXT,
  answered_at    TEXT NOT NULL
);

-- Кеш ответов Nominatim: политика использования OSM прямо требует кешировать
-- и не долбить сервис повторными одинаковыми запросами.
CREATE TABLE geo_cache (
  key        TEXT PRIMARY KEY,
  payload    TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
