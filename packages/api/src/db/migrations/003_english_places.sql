-- Библиотека и конверт показываются по-английски, хотя исходники — русские посты.
--
-- Английское значение живёт в основных колонках (name, address, district): всё,
-- что их читает — бот, мини-апп, страница-конверт, — не должно знать о переводе.
-- Оригинал переезжает в *_ru и остаётся навсегда: он источник для повторного
-- перевода другим движком и единственный способ понять, что именно было в посте.
-- NULL в *_ru означает «эту строку ещё не переводили».

ALTER TABLE places ADD COLUMN name_ru     TEXT;
ALTER TABLE places ADD COLUMN address_ru  TEXT;
ALTER TABLE places ADD COLUMN district_ru TEXT;

ALTER TABLE place_candidates ADD COLUMN name_ru     TEXT;
ALTER TABLE place_candidates ADD COLUMN address_ru  TEXT;
ALTER TABLE place_candidates ADD COLUMN district_ru TEXT;

-- Кеш перевода. Одна и та же улица приезжает из десятков постов, а перевод
-- строки — сетевой вызов с оплатой за токены. Ключ — пара (вид, исходник):
-- «Пекарня» как название заведения и как категория переводятся по-разному.
CREATE TABLE translations (
  kind       TEXT NOT NULL,
  source     TEXT NOT NULL,
  result     TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (kind, source)
);

-- Категории мы генерируем сами из типов OSM (resolver/categories.ts), поэтому
-- их не переводят, а просто заменяют на новые значения словаря. Пройтись
-- нужно и по уже сохранённым местам: иначе фасеты в библиотеке разъедутся
-- на русские и английские названия одного и того же.
UPDATE places SET category = CASE category
  WHEN 'Кофейня'             THEN 'Coffee shop'
  WHEN 'Бар'                 THEN 'Bar'
  WHEN 'Винный бар'          THEN 'Wine bar'
  WHEN 'Ресторан'            THEN 'Restaurant'
  WHEN 'Быстрая еда'         THEN 'Fast food'
  WHEN 'Фудкорт'             THEN 'Food court'
  WHEN 'Мороженое'           THEN 'Ice cream'
  WHEN 'Пекарня'             THEN 'Bakery'
  WHEN 'Кондитерская'        THEN 'Patisserie'
  WHEN 'Гастрономия'         THEN 'Deli'
  WHEN 'Книжный'             THEN 'Bookshop'
  WHEN 'Клуб'                THEN 'Nightclub'
  WHEN 'Театр'               THEN 'Theatre'
  WHEN 'Кино'                THEN 'Cinema'
  WHEN 'Музей'               THEN 'Museum'
  WHEN 'Галерея'             THEN 'Gallery'
  WHEN 'Арт-объект'          THEN 'Artwork'
  WHEN 'Достопримечательность' THEN 'Attraction'
  WHEN 'Смотровая'           THEN 'Viewpoint'
  WHEN 'Парк'                THEN 'Park'
  WHEN 'Сад'                 THEN 'Garden'
  WHEN 'Пляж'                THEN 'Beach'
  WHEN 'Библиотека'          THEN 'Library'
  WHEN 'Рынок'               THEN 'Market'
  WHEN 'Отель'               THEN 'Hotel'
  WHEN 'Хостел'              THEN 'Hostel'
  WHEN 'Спа'                 THEN 'Spa'
  WHEN 'Баня'                THEN 'Banya'
  WHEN 'Бассейн'             THEN 'Swimming pool'
  WHEN 'Спортзал'            THEN 'Gym'
  WHEN 'Скалодром'           THEN 'Climbing gym'
  WHEN 'Досуг'               THEN 'Leisure'
  WHEN 'Историческое место'  THEN 'Historic site'
  ELSE category
END
WHERE category IS NOT NULL;

UPDATE place_candidates SET category = CASE category
  WHEN 'Кофейня'             THEN 'Coffee shop'
  WHEN 'Бар'                 THEN 'Bar'
  WHEN 'Винный бар'          THEN 'Wine bar'
  WHEN 'Ресторан'            THEN 'Restaurant'
  WHEN 'Быстрая еда'         THEN 'Fast food'
  WHEN 'Фудкорт'             THEN 'Food court'
  WHEN 'Мороженое'           THEN 'Ice cream'
  WHEN 'Пекарня'             THEN 'Bakery'
  WHEN 'Кондитерская'        THEN 'Patisserie'
  WHEN 'Гастрономия'         THEN 'Deli'
  WHEN 'Книжный'             THEN 'Bookshop'
  WHEN 'Клуб'                THEN 'Nightclub'
  WHEN 'Театр'               THEN 'Theatre'
  WHEN 'Кино'                THEN 'Cinema'
  WHEN 'Музей'               THEN 'Museum'
  WHEN 'Галерея'             THEN 'Gallery'
  WHEN 'Арт-объект'          THEN 'Artwork'
  WHEN 'Достопримечательность' THEN 'Attraction'
  WHEN 'Смотровая'           THEN 'Viewpoint'
  WHEN 'Парк'                THEN 'Park'
  WHEN 'Сад'                 THEN 'Garden'
  WHEN 'Пляж'                THEN 'Beach'
  WHEN 'Библиотека'          THEN 'Library'
  WHEN 'Рынок'               THEN 'Market'
  WHEN 'Отель'               THEN 'Hotel'
  WHEN 'Хостел'              THEN 'Hostel'
  WHEN 'Спа'                 THEN 'Spa'
  WHEN 'Баня'                THEN 'Banya'
  WHEN 'Бассейн'             THEN 'Swimming pool'
  WHEN 'Спортзал'            THEN 'Gym'
  WHEN 'Скалодром'           THEN 'Climbing gym'
  WHEN 'Досуг'               THEN 'Leisure'
  WHEN 'Историческое место'  THEN 'Historic site'
  ELSE category
END
WHERE category IS NOT NULL;
