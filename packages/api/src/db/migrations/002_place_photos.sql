-- У места может быть несколько фотографий: из одного поста их приходит пачка,
-- и карточка в конверте показывает не только обложку.
--
-- Хранение — JSON-массивом строк, как уже сделано у tags в 001: отдельная таблица
-- ради 1–5 путей не окупается, а порядок в массиве и есть порядок показа.
-- photo_url остаётся как обложка (photos[0]) — на него завязаны тумбы миниаппа.

ALTER TABLE places ADD COLUMN photos TEXT NOT NULL DEFAULT '[]';

UPDATE places SET photos = json_array(photo_url) WHERE photo_url IS NOT NULL;
