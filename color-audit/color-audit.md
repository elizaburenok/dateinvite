# Invite — аудит цветов

13 октября 2026

Статический аудит текущих файлов рабочей копии. Частота = число уникальных строк/свойств с заданием цвета в подключённых исходниках, не просмотры экранов. Подключённость по графу импортов; CSS-селекторы могут быть неактивны. Растровые изображения и цвета пользовательских фотографий не разложены на пиксели. Сгенерированные сборки исключены.

Охват: 136 исходных файлов; CSS, TS/TSX, SVG, Canvas, фильтры и HTML. Учтены текущие несохранённые в Git изменения. Частота — статические места в исходниках, не экранная аналитика. Подключённость не гарантирует видимость правила: наследование, каскад, display и opacity могут менять результат.
Включены тени, маски, прозрачность, значения тёмной темы и переопределения. Фото, PNG/WebP и пользовательские цвета представлены как внешние / динамические источники, без попиксельного анализа. Округление SVG-матриц — до 8-bit RGB; исходные значения сохранены в JSON.

## 00 / Что проверить первым

Результаты аудита текущей рабочей копии · 13 октября 2026

### Почти одинаковые графитовые

#434343 — SVG стрелки назад; #424343 — текст ответа. ΔE76 = 0,45. Кандидаты на общий нейтральный токен.

### Близкие тёмные поверхности

#262828 и #282A2A: ΔE76 = 0,95. #121313 и #171818: ΔE76 = 2,35. Проверить, нужны ли отдельные уровни поверхности.

### Три токена без обращений

--c-table, --c-sage-wash и --c-card-bevel объявлены, но чтение через var() / token() в подключённых исходниках не найдено. Это кандидаты на проверку и удаление, не доказательство по runtime.

### Тёмная тема частично перекрыта

app.css импортируется после theme-dark.css. 12 значений общих переменных из тёмной темы заменяются локальной палитрой Mini App. Остальные dark-токены продолжают зависеть от prefers-color-scheme.

### Одинаковый акцент в трёх ролях

В Mini App --c-seal, --c-seal-deep и --c-status-opened имеют #FCED99. Семантические имена можно сохранить как алиасы одного базового цвета.

### Редкий цвет может быть нужным

#B3261E встречается в одном правиле ошибки .note__error. #A53B8E — цвет точек гостевого фото; #F72C9E — эффект растворения. Редкость сама по себе не причина удалять цвет.

### Видимость отличается от наличия в CSS

cycle.css подключён, но .cycle больше не создаётся. wheel-caption.css скрывает .photo__scrim и .wheel__shade; --card-edge-w: 0px гасит край карточки. Градиенты и цвета сохранены в реестре с этими пометками.

## 01 / Общие токены · 1/2

Каждое объявление — отдельная строка. N обращений относится к имени переменной во всём подключённом коде.

### --c-paper — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#f6f1e8
Роль: Фон / заливка
Прямых var()/token(): 2 · алиасов: 0
Объявление: shared/styles/tokens.css:17 · :root
Примеры: miniapp/styles/app.css:251 .sheet
shared/styles/base.css:21 body

### --c-table — БЕЗ ОБРАЩЕНИЙ

#f3f3f3
Роль: Фон / заливка
Прямых var()/token(): 0 · алиасов: 0
Объявление: shared/styles/tokens.css:19 · :root

### --c-surface — ИСПОЛЬЗУЕТСЯ

#fffdf8
Роль: Фон / заливка · Обводка
Прямых var()/token(): 13 · алиасов: 0
Объявление: shared/styles/tokens.css:20 · :root
Примеры: guest/styles/invite.css:149 .seal__mark
guest/styles/invite.css:857 .photo__dot--on
guest/styles/invite.css:1044 .dev-reset

### --c-surface-sunk — ИСПОЛЬЗУЕТСЯ

#efe8dc
Роль: Фон / заливка · Обводка
Прямых var()/token(): 5 · алиасов: 0
Объявление: shared/styles/tokens.css:21 · :root
Примеры: guest/styles/invite.css:753 .photo
guest/styles/invite.css:1045 .dev-reset
miniapp/styles/app.css:211 .thumb

### --c-ink — ИСПОЛЬЗУЕТСЯ

#211c16
Роль: Текст · Фон / заливка · Обводка
Прямых var()/token(): 7 · алиасов: 0
Объявление: shared/styles/tokens.css:22 · :root
Примеры: guest/styles/invite.css:351 .hero__back
guest/styles/invite.css:1058 .dev-reset:hover
miniapp/styles/app.css:42 .boot--error

### --c-ink-soft — ИСПОЛЬЗУЕТСЯ

#6f6558
Роль: Текст
Прямых var()/token(): 25 · алиасов: 0
Объявление: shared/styles/tokens.css:23 · :root
Примеры: guest/styles/invite.css:991 .notice__text, .done__text
guest/styles/invite.css:1043 .dev-reset
guest/styles/note.css:222 .place-note__label

### --c-ink-faint — ИСПОЛЬЗУЕТСЯ

#a1968a
Роль: Текст · Фон / заливка
Прямых var()/token(): 8 · алиасов: 2
Объявление: shared/styles/tokens.css:24 · :root
Примеры: guest/styles/invite.css:996 .notice--quiet .seal__blob
guest/styles/invite.css:1022 .attribution
guest/styles/note.css:489 .note__field::placeholder

### --c-answer — ИСПОЛЬЗУЕТСЯ

#424343
Роль: Текст · Фон / заливка
Прямых var()/token(): 6 · алиасов: 0
Объявление: shared/styles/tokens.css:29 · :root
Примеры: guest/styles/note.css:233 .place-note__text
guest/styles/note.css:417 .note__field
guest/styles/note.css:419 .note__field

### --c-hairline — ИСПОЛЬЗУЕТСЯ

#e2d9ca
Роль: Обводка · Фон / заливка
Прямых var()/token(): 15 · алиасов: 0
Объявление: shared/styles/tokens.css:30 · :root
Примеры: miniapp/styles/app.css:110 .chip
miniapp/styles/app.css:140 .row
miniapp/styles/app.css:192 .pick

### --c-seal — ИСПОЛЬЗУЕТСЯ

#c4452a
Роль: Фон / заливка · Обводка · Текст · Декор / токен
Прямых var()/token(): 21 · алиасов: 0
Объявление: shared/styles/tokens.css:33 · :root
Примеры: guest/styles/invite.css:145 .seal__blob
miniapp/styles/app.css:60 .addplace
miniapp/styles/app.css:64 .addplace

### --c-seal-deep — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#a2371f
Роль: Фон / заливка
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/tokens.css:34 · :root
Примеры: shared/styles/base.css:104 .btn--primary:hover:not(:disabled)

### --c-seal-wash — ИСПОЛЬЗУЕТСЯ

#f6e4de
Роль: Фон / заливка
Прямых var()/token(): 6 · алиасов: 0
Объявление: shared/styles/tokens.css:35 · :root
Примеры: miniapp/styles/app.css:69 .addplace:active:not(:disabled)
miniapp/styles/app.css:118 .chip--on
miniapp/styles/app.css:147 .row--picked

### --c-sage — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#5f6f52
Роль: Текст
Прямых var()/token(): 1 · алиасов: 1
Объявление: shared/styles/tokens.css:36 · :root
Примеры: miniapp/styles/app.css:677 .envelope__answer

### --c-sage-wash — БЕЗ ОБРАЩЕНИЙ

#e6ebe0
Роль: Декор / токен
Прямых var()/token(): 0 · алиасов: 0
Объявление: shared/styles/tokens.css:37 · :root

### --c-frame — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#fff4ba
Роль: Фон / заливка
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/tokens.css:42 · :root
Примеры: guest/styles/invite.css:508 .card

### --c-frame-ink — ИСПОЛЬЗУЕТСЯ

#fff5c0
Роль: Текст · Фон / заливка
Прямых var()/token(): 3 · алиасов: 0
Объявление: shared/styles/tokens.css:43 · :root
Примеры: guest/styles/invite.css:689 .card__name
guest/styles/invite.css:706 .card__address
guest/styles/invite.css:728 .card__note

### --c-note-ink — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#837e65
Роль: Текст
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/tokens.css:46 · :root
Примеры: guest/styles/invite.css:736 .card__note

### --c-status-sent — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

var(--c-ink-faint)
Роль: Текст
Прямых var()/token(): 2 · алиасов: 0
Объявление: shared/styles/tokens.css:49 · :root
Примеры: miniapp/styles/app.css:702 .status--sent
miniapp/styles/app.css:706 .status--draft

## 01 / Общие токены · 2/2

Каждое объявление — отдельная строка. N обращений относится к имени переменной во всём подключённом коде.

### --c-status-opened — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#b5842f
Роль: Текст
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/tokens.css:50 · :root
Примеры: miniapp/styles/app.css:703 .status--opened

### --c-status-answered — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

var(--c-sage)
Роль: Текст
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/tokens.css:51 · :root
Примеры: miniapp/styles/app.css:704 .status--answered

### --c-status-expired — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

var(--c-ink-faint)
Роль: Текст
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/tokens.css:52 · :root
Примеры: miniapp/styles/app.css:705 .status--expired

### --c-card-edge — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

rgba(63, 46, 26, 0.24)
Роль: Тень / свечение
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/tokens.css:116 · :root
Примеры: guest/styles/invite.css:549 .card::before

### --c-card-bevel — БЕЗ ОБРАЩЕНИЙ

rgba(255, 251, 242, 0.6)
Роль: Обводка
Прямых var()/token(): 0 · алиасов: 0
Объявление: shared/styles/tokens.css:119 · :root

### --sh-card — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

0 4px 12px rgba(63, 46, 26, 0.13), 0 26px 54px rgba(63, 46, 26, 0.2)
Роль: Тень / свечение
Прямых var()/token(): 2 · алиасов: 0
Объявление: shared/styles/tokens.css:127 · :root
Примеры: guest/styles/invite.css:348 .hero__back
guest/styles/invite.css:517 .card

### --sh-lift — ИСПОЛЬЗУЕТСЯ

0 8px 20px rgba(63, 46, 26, 0.18), 0 40px 80px rgba(63, 46, 26, 0.28)
Роль: Тень / свечение
Прямых var()/token(): 5 · алиасов: 0
Объявление: shared/styles/tokens.css:128 · :root
Примеры: guest/styles/invite.css:558 .card--pickable:hover
miniapp/styles/app.css:434 .fab
miniapp/styles/app.css:454 .composed

### --sh-chosen — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

0 5.5px 11px 5.5px rgba(58, 96, 90, 0.2), 0 9px 21px rgba(63, 46, 26, 0.07), 0 2.5px 3.5px rgba(63, 46, 26, 0.05), 0 9px 28px rgba(63, 46, 26, 0.07), 0 1px 2.5px rgba(63, 46, 26, 0.06)
Роль: Тень / свечение
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/tokens.css:142 · :root
Примеры: guest/styles/invite.css:580 .card--chosen

### --env-face — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#e0d7c9
Роль: Фон / заливка
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/tokens.css:195 · :root
Примеры: guest/styles/envelope.css:210 .env-face

### --env-fold — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#e2dbcd
Роль: Фон / заливка
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/tokens.css:196 · :root
Примеры: guest/styles/envelope.css:219 .env-fold

### --env-flap-face — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#e5ddd0
Роль: Фон / заливка
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/tokens.css:197 · :root
Примеры: guest/styles/envelope.css:214 .env-flap-face

### --env-face-reverse — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#d6ccbb
Роль: Фон / заливка
Прямых var()/token(): 0 · алиасов: 2
Объявление: shared/styles/tokens.css:198 · :root

### --env-edge — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#d3c9b8
Роль: Обводка
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/tokens.css:199 · :root
Примеры: guest/styles/envelope.css:229 .env-edge

### --env-stitch — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#eefdff
Роль: Обводка
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/tokens.css:200 · :root
Примеры: guest/styles/envelope.css:235 .env-stitch

### --sh-env — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

0 4px 9px rgba(144, 121, 86, 0.14)
Роль: Декор / токен
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/tokens.css:203 · :root
Примеры: guest/styles/envelope.css:174 .envelope__back

### --sh-flap — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

0 8px 5px rgba(104, 133, 138, 0.11)
Роль: Декор / токен
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/tokens.css:204 · :root
Примеры: guest/styles/envelope.css:189 .envelope__flap

### --c-card-shade — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

rgba(74, 96, 104, 0.62)
Роль: Фон / заливка
Прямых var()/token(): 2 · алиасов: 0
Объявление: shared/styles/tokens.css:251 · :root
Примеры: guest/styles/cycle.css:148 .cycle__card::after
guest/styles/wheel.css:594 .wheel__shade

## 01 / Тёмная тема · 1/2

Каждое объявление — отдельная строка. N обращений относится к имени переменной во всём подключённом коде.

### --c-paper — ПЕРЕКРЫТО app.css

#17130f
Роль: Фон / заливка
Прямых var()/token(): 2 · алиасов: 0
Объявление: shared/styles/theme-dark.css:11 · :root · @media (prefers-color-scheme: dark)
Примеры: miniapp/styles/app.css:251 .sheet
shared/styles/base.css:21 body

### --c-table — ПЕРЕКРЫТО app.css

#15120e
Роль: Фон / заливка
Прямых var()/token(): 0 · алиасов: 0
Объявление: shared/styles/theme-dark.css:12 · :root · @media (prefers-color-scheme: dark)

### --c-surface — ПЕРЕКРЫТО app.css

#221c17
Роль: Фон / заливка · Обводка
Прямых var()/token(): 13 · алиасов: 0
Объявление: shared/styles/theme-dark.css:13 · :root · @media (prefers-color-scheme: dark)
Примеры: guest/styles/invite.css:149 .seal__mark
guest/styles/invite.css:857 .photo__dot--on
guest/styles/invite.css:1044 .dev-reset

### --c-surface-sunk — ПЕРЕКРЫТО app.css

#2c251e
Роль: Фон / заливка · Обводка
Прямых var()/token(): 5 · алиасов: 0
Объявление: shared/styles/theme-dark.css:14 · :root · @media (prefers-color-scheme: dark)
Примеры: guest/styles/invite.css:753 .photo
guest/styles/invite.css:1045 .dev-reset
miniapp/styles/app.css:211 .thumb

### --c-ink — ПЕРЕКРЫТО app.css

#f3ece1
Роль: Текст · Фон / заливка · Обводка
Прямых var()/token(): 7 · алиасов: 0
Объявление: shared/styles/theme-dark.css:15 · :root · @media (prefers-color-scheme: dark)
Примеры: guest/styles/invite.css:351 .hero__back
guest/styles/invite.css:1058 .dev-reset:hover
miniapp/styles/app.css:42 .boot--error

### --c-ink-soft — ПЕРЕКРЫТО app.css

#b3a696
Роль: Текст
Прямых var()/token(): 25 · алиасов: 0
Объявление: shared/styles/theme-dark.css:16 · :root · @media (prefers-color-scheme: dark)
Примеры: guest/styles/invite.css:991 .notice__text, .done__text
guest/styles/invite.css:1043 .dev-reset
guest/styles/note.css:222 .place-note__label

### --c-ink-faint — ПЕРЕКРЫТО app.css

#7d7266
Роль: Текст · Фон / заливка
Прямых var()/token(): 8 · алиасов: 2
Объявление: shared/styles/theme-dark.css:17 · :root · @media (prefers-color-scheme: dark)
Примеры: guest/styles/invite.css:996 .notice--quiet .seal__blob
guest/styles/invite.css:1022 .attribution
guest/styles/note.css:489 .note__field::placeholder

### --c-hairline — ПЕРЕКРЫТО app.css

#383027
Роль: Обводка · Фон / заливка
Прямых var()/token(): 15 · алиасов: 0
Объявление: shared/styles/theme-dark.css:18 · :root · @media (prefers-color-scheme: dark)
Примеры: miniapp/styles/app.css:110 .chip
miniapp/styles/app.css:140 .row
miniapp/styles/app.css:192 .pick

### --c-seal — ПЕРЕКРЫТО app.css

#e0705a
Роль: Фон / заливка · Обводка · Текст · Декор / токен
Прямых var()/token(): 21 · алиасов: 0
Объявление: shared/styles/theme-dark.css:20 · :root · @media (prefers-color-scheme: dark)
Примеры: guest/styles/invite.css:145 .seal__blob
miniapp/styles/app.css:60 .addplace
miniapp/styles/app.css:64 .addplace

### --c-seal-deep — ПЕРЕКРЫТО app.css

#f08a75
Роль: Фон / заливка
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/theme-dark.css:21 · :root · @media (prefers-color-scheme: dark)
Примеры: shared/styles/base.css:104 .btn--primary:hover:not(:disabled)

### --c-seal-wash — ПЕРЕКРЫТО app.css

#3a221c
Роль: Фон / заливка
Прямых var()/token(): 6 · алиасов: 0
Объявление: shared/styles/theme-dark.css:22 · :root · @media (prefers-color-scheme: dark)
Примеры: miniapp/styles/app.css:69 .addplace:active:not(:disabled)
miniapp/styles/app.css:118 .chip--on
miniapp/styles/app.css:147 .row--picked

### --c-sage — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#9db289
Роль: Текст
Прямых var()/token(): 1 · алиасов: 1
Объявление: shared/styles/theme-dark.css:23 · :root · @media (prefers-color-scheme: dark)
Примеры: miniapp/styles/app.css:677 .envelope__answer

### --c-sage-wash — БЕЗ ОБРАЩЕНИЙ

#232b1e
Роль: Декор / токен
Прямых var()/token(): 0 · алиасов: 0
Объявление: shared/styles/theme-dark.css:24 · :root · @media (prefers-color-scheme: dark)

### --c-status-opened — ПЕРЕКРЫТО app.css

#d9a94e
Роль: Текст
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/theme-dark.css:26 · :root · @media (prefers-color-scheme: dark)
Примеры: miniapp/styles/app.css:703 .status--opened

### --sh-card — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.35)
Роль: Тень / свечение
Прямых var()/token(): 2 · алиасов: 0
Объявление: shared/styles/theme-dark.css:28 · :root · @media (prefers-color-scheme: dark)
Примеры: guest/styles/invite.css:348 .hero__back
guest/styles/invite.css:517 .card

### --sh-lift — ИСПОЛЬЗУЕТСЯ

0 2px 6px rgba(0, 0, 0, 0.45), 0 16px 40px rgba(0, 0, 0, 0.5)
Роль: Тень / свечение
Прямых var()/token(): 5 · алиасов: 0
Объявление: shared/styles/theme-dark.css:29 · :root · @media (prefers-color-scheme: dark)
Примеры: guest/styles/invite.css:558 .card--pickable:hover
miniapp/styles/app.css:434 .fab
miniapp/styles/app.css:454 .composed

### --env-face — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#2a231c
Роль: Фон / заливка
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/theme-dark.css:31 · :root · @media (prefers-color-scheme: dark)
Примеры: guest/styles/envelope.css:210 .env-face

### --env-fold — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#302820
Роль: Фон / заливка
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/theme-dark.css:32 · :root · @media (prefers-color-scheme: dark)
Примеры: guest/styles/envelope.css:219 .env-fold

## 01 / Тёмная тема · 2/2

Каждое объявление — отдельная строка. N обращений относится к имени переменной во всём подключённом коде.

### --env-flap-face — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#342c22
Роль: Фон / заливка
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/theme-dark.css:33 · :root · @media (prefers-color-scheme: dark)
Примеры: guest/styles/envelope.css:214 .env-flap-face

### --env-face-reverse — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#201a14
Роль: Фон / заливка
Прямых var()/token(): 0 · алиасов: 2
Объявление: shared/styles/theme-dark.css:34 · :root · @media (prefers-color-scheme: dark)

### --env-edge — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#453a2c
Роль: Обводка
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/theme-dark.css:35 · :root · @media (prefers-color-scheme: dark)
Примеры: guest/styles/envelope.css:229 .env-edge

### --env-stitch — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#4a3f31
Роль: Обводка
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/theme-dark.css:36 · :root · @media (prefers-color-scheme: dark)
Примеры: guest/styles/envelope.css:235 .env-stitch

### --sh-env — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

0 4px 9px rgba(0, 0, 0, 0.5)
Роль: Декор / токен
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/theme-dark.css:37 · :root · @media (prefers-color-scheme: dark)
Примеры: guest/styles/envelope.css:174 .envelope__back

### --sh-flap — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

0 8px 5px rgba(0, 0, 0, 0.4)
Роль: Декор / токен
Прямых var()/token(): 1 · алиасов: 0
Объявление: shared/styles/theme-dark.css:38 · :root · @media (prefers-color-scheme: dark)
Примеры: guest/styles/envelope.css:189 .envelope__flap

## 01 / Mini App · локальные значения

Каждое объявление — отдельная строка. N обращений относится к имени переменной во всём подключённом коде.

### --c-paper — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#121313
Роль: Фон / заливка
Прямых var()/token(): 2 · алиасов: 0
Объявление: miniapp/styles/app.css:5 · :root
Примеры: miniapp/styles/app.css:251 .sheet
shared/styles/base.css:21 body

### --c-table — БЕЗ ОБРАЩЕНИЙ

#121313
Роль: Фон / заливка
Прямых var()/token(): 0 · алиасов: 0
Объявление: miniapp/styles/app.css:6 · :root

### --c-surface — ИСПОЛЬЗУЕТСЯ

#050505
Роль: Фон / заливка · Обводка
Прямых var()/token(): 13 · алиасов: 0
Объявление: miniapp/styles/app.css:7 · :root
Примеры: guest/styles/invite.css:149 .seal__mark
guest/styles/invite.css:857 .photo__dot--on
guest/styles/invite.css:1044 .dev-reset

### --c-surface-sunk — ИСПОЛЬЗУЕТСЯ

#050505
Роль: Фон / заливка · Обводка
Прямых var()/token(): 5 · алиасов: 0
Объявление: miniapp/styles/app.css:8 · :root
Примеры: guest/styles/invite.css:753 .photo
guest/styles/invite.css:1045 .dev-reset
miniapp/styles/app.css:211 .thumb

### --c-ink — ИСПОЛЬЗУЕТСЯ

#f3ece1
Роль: Текст · Фон / заливка · Обводка
Прямых var()/token(): 7 · алиасов: 0
Объявление: miniapp/styles/app.css:9 · :root
Примеры: guest/styles/invite.css:351 .hero__back
guest/styles/invite.css:1058 .dev-reset:hover
miniapp/styles/app.css:42 .boot--error

### --c-ink-soft — ИСПОЛЬЗУЕТСЯ

#b3a696
Роль: Текст
Прямых var()/token(): 25 · алиасов: 0
Объявление: miniapp/styles/app.css:10 · :root
Примеры: guest/styles/invite.css:991 .notice__text, .done__text
guest/styles/invite.css:1043 .dev-reset
guest/styles/note.css:222 .place-note__label

### --c-ink-faint — ИСПОЛЬЗУЕТСЯ

#7d7266
Роль: Текст · Фон / заливка
Прямых var()/token(): 8 · алиасов: 2
Объявление: miniapp/styles/app.css:11 · :root
Примеры: guest/styles/invite.css:996 .notice--quiet .seal__blob
guest/styles/invite.css:1022 .attribution
guest/styles/note.css:489 .note__field::placeholder

### --c-hairline — ИСПОЛЬЗУЕТСЯ

#282a2a
Роль: Обводка · Фон / заливка
Прямых var()/token(): 15 · алиасов: 0
Объявление: miniapp/styles/app.css:12 · :root
Примеры: miniapp/styles/app.css:110 .chip
miniapp/styles/app.css:140 .row
miniapp/styles/app.css:192 .pick

### --c-seal — ИСПОЛЬЗУЕТСЯ

#FCED99
Роль: Фон / заливка · Обводка · Текст · Декор / токен
Прямых var()/token(): 21 · алиасов: 0
Объявление: miniapp/styles/app.css:13 · :root
Примеры: guest/styles/invite.css:145 .seal__blob
miniapp/styles/app.css:60 .addplace
miniapp/styles/app.css:64 .addplace

### --c-seal-deep — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#FCED99
Роль: Фон / заливка
Прямых var()/token(): 1 · алиасов: 0
Объявление: miniapp/styles/app.css:14 · :root
Примеры: shared/styles/base.css:104 .btn--primary:hover:not(:disabled)

### --c-seal-wash — ИСПОЛЬЗУЕТСЯ

color-mix(in srgb, #FCED99 12%, #121313)
Роль: Фон / заливка
Прямых var()/token(): 6 · алиасов: 0
Объявление: miniapp/styles/app.css:15 · :root
Примеры: miniapp/styles/app.css:69 .addplace:active:not(:disabled)
miniapp/styles/app.css:118 .chip--on
miniapp/styles/app.css:147 .row--picked

### --c-status-opened — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#FCED99
Роль: Текст
Прямых var()/token(): 1 · алиасов: 0
Объявление: miniapp/styles/app.css:16 · :root
Примеры: miniapp/styles/app.css:703 .status--opened

## 01 / Гостевая страница · локальные значения · 1/2

Каждое объявление — отдельная строка. N обращений относится к имени переменной во всём подключённом коде.

### --env-face — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

var(--env-face-reverse)
Роль: Фон / заливка
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/envelope.css:171 · .envelope__back
Примеры: guest/styles/envelope.css:210 .env-face

### --env-flap-face — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

var(--env-face-reverse)
Роль: Фон / заливка
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/envelope.css:203 · .envelope:not([data-state='sealed']) .envelope__flap
Примеры: guest/styles/envelope.css:214 .env-flap-face

### --intro-paper — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#fdfdde
Роль: Фон / заливка
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/invitation-intro.css:2 · .invitation-intro
Примеры: guest/styles/invitation-intro.css:8 .invitation-intro

### --intro-ink — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#4e4e4e
Роль: Текст
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/invitation-intro.css:3 · .invitation-intro
Примеры: guest/styles/invitation-intro.css:9 .invitation-intro

### --c-tap-shadow — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

rgba(80, 60, 0, 0.35)
Роль: Декор / токен
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/pile.css:85 · :root
Примеры: guest/styles/pile.css:439 .pile__glyph

### --note-pressed-edge — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#f2f2c3
Роль: Обводка
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/selected-place.css:207 · .page[data-picking] .note[data-pressed-style='warm']
Примеры: guest/styles/selected-place.css:189 .page[data-picking] .note::before

### --note-pressed-halo — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

0 0 0 3px rgb(242 242 195 / 55%)
Роль: Тень / свечение
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/selected-place.css:208 · .page[data-picking] .note[data-pressed-style='warm']
Примеры: guest/styles/selected-place.css:197 .page[data-picking] .note:focus-within

### --note-pressed-shadow — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

0 8px 22px rgb(95 78 58 / 15%)
Роль: Тень / свечение
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/selected-place.css:209 · .page[data-picking] .note[data-pressed-style='warm']
Примеры: guest/styles/selected-place.css:197 .page[data-picking] .note:focus-within

### --note-pressed-edge — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

rgb(214 139 159 / 68%)
Роль: Обводка
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/selected-place.css:213 · .page[data-picking] .note[data-pressed-style='rose']
Примеры: guest/styles/selected-place.css:189 .page[data-picking] .note::before

### --note-pressed-halo — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

0 0 0 3px rgb(232 161 181 / 22%)
Роль: Тень / свечение
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/selected-place.css:214 · .page[data-picking] .note[data-pressed-style='rose']
Примеры: guest/styles/selected-place.css:197 .page[data-picking] .note:focus-within

### --note-pressed-shadow — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

0 8px 22px rgb(149 86 111 / 17%)
Роль: Тень / свечение
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/selected-place.css:215 · .page[data-picking] .note[data-pressed-style='rose']
Примеры: guest/styles/selected-place.css:197 .page[data-picking] .note:focus-within

### --note-pressed-edge — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

rgb(77 82 81 / 56%)
Роль: Обводка
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/selected-place.css:219 · .page[data-picking] .note[data-pressed-style='ink']
Примеры: guest/styles/selected-place.css:189 .page[data-picking] .note::before

### --note-pressed-halo — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

0 0 0 3px rgb(83 91 88 / 12%)
Роль: Тень / свечение
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/selected-place.css:220 · .page[data-picking] .note[data-pressed-style='ink']
Примеры: guest/styles/selected-place.css:197 .page[data-picking] .note:focus-within

### --note-pressed-shadow — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

0 8px 22px rgb(50 56 53 / 18%)
Роль: Тень / свечение
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/selected-place.css:221 · .page[data-picking] .note[data-pressed-style='ink']
Примеры: guest/styles/selected-place.css:197 .page[data-picking] .note:focus-within

### --c-wallpaper — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#e8f4d8
Роль: Фон / заливка
Прямых var()/token(): 2 · алиасов: 1
Объявление: guest/styles/wallpaper.css:24 · :root
Примеры: guest/styles/wallpaper.css:40 body
guest/styles/wallpaper.css:92 body::before, .invite-cover

### --c-wallpaper-glow — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

rgba(255, 255, 255, 0.62)
Роль: Фон / заливка
Прямых var()/token(): 2 · алиасов: 0
Объявление: guest/styles/wallpaper.css:30 · :root
Примеры: guest/styles/wallpaper.css:92 body::before, .invite-cover
guest/styles/wallpaper.css:92 body::before, .invite-cover

### --c-table — БЕЗ ОБРАЩЕНИЙ

var(--c-wallpaper)
Роль: Фон / заливка
Прямых var()/token(): 0 · алиасов: 0
Объявление: guest/styles/wallpaper.css:33 · :root

### --c-surface-sunk — ИСПОЛЬЗУЕТСЯ

#e6efdc
Роль: Фон / заливка · Обводка
Прямых var()/token(): 5 · алиасов: 0
Объявление: guest/styles/wallpaper.css:36 · :root
Примеры: guest/styles/invite.css:753 .photo
guest/styles/invite.css:1045 .dev-reset
miniapp/styles/app.css:211 .thumb

## 01 / Гостевая страница · локальные значения · 2/2

Каждое объявление — отдельная строка. N обращений относится к имени переменной во всём подключённом коде.

### --wheel-caption-fill — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

#4e4e4e
Роль: Текст
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/wheel-caption.css:6 · .wheel
Примеры: guest/components/envelope/WheelCaption.tsx:114 color

### --wsh-near — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

rgba(63, 46, 26, 0)
Роль: Фон / заливка
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/wheel.css:521 · .wheel__item:not([data-front]):not([data-chosen]) .wheel__card
Примеры: guest/styles/wheel.css:489 .wheel__card::after

### --wsh-near — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

rgba(63, 46, 26, 0.18)
Роль: Фон / заливка
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/wheel.css:542 · .wheel__item[data-front] .wheel__card:has(.card--pickable:not(.card--chosen):hover)
Примеры: guest/styles/wheel.css:489 .wheel__card::after

### --wsh-far — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

rgba(58, 96, 90, 0.22)
Роль: Фон / заливка
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/wheel.css:561 · .wheel__card:has(.card--chosen)
Примеры: guest/styles/wheel.css:453 .wheel__card::before

### --wsh-near — МАЛО ПРЯМЫХ ОБРАЩЕНИЙ

rgba(63, 46, 26, 0.1)
Роль: Фон / заливка
Прямых var()/token(): 1 · алиасов: 0
Объявление: guest/styles/wheel.css:564 · .wheel__card:has(.card--chosen)
Примеры: guest/styles/wheel.css:489 .wheel__card::after

## 02 / Непрозрачные цвета · 1/5

Все фиксированные непрозрачные значения из подключённых исходников; определения старых тем также включены.

### #000000

Роль: Фон / заливка · Маска
Литералов / объявлений: 10 · мест применения с учётом var(): 10
Именованный токен: нет
guest/assets/Tap.svg:2 mask → fill
guest/assets/result.svg:2 mask → fill
guest/assets/start.svg:2 mask → fill
guest/styles/cycle.css:115 .cycle__item[data-out] → -webkit-mask-image
guest/styles/cycle.css:120 .cycle__item[data-out] → mask-image
Ещё 5 записей — полный индекс в inventory.json

### #050505

Роль: Фон / заливка · Обводка
Литералов / объявлений: 2 · мест применения с учётом var(): 18
Токены: --c-surface, --c-surface-sunk
miniapp/styles/app.css:7 :root → --c-surface
miniapp/styles/app.css:8 :root → --c-surface-sunk

### #15120E — ТОЛЬКО ОБЪЯВЛЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 0
Токены: --c-table
shared/styles/theme-dark.css:12 :root → --c-table

### #121313

Роль: Текст · Фон / заливка · Декор / токен
Литералов / объявлений: 5 · мест применения с учётом var(): 10
Токены: --c-paper, --c-table, --c-seal-wash
miniapp/styles/app.css:20 .btn--primary → color
miniapp/styles/app.css:202 .pick--on → color
miniapp/styles/app.css:5 :root → --c-paper
miniapp/styles/app.css:6 :root → --c-table
miniapp/styles/app.css:15 :root → --c-seal-wash

### #17130F

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 2
Токены: --c-paper
shared/styles/theme-dark.css:11 :root → --c-paper

### #171818 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1301 .library .filters > .field, .filter-menu__trigger, .library__add → background

### #201A14 — ТОЛЬКО ОБЪЯВЛЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 0
Токены: --env-face-reverse
shared/styles/theme-dark.css:34 :root → --env-face-reverse

### #211C16

Роль: Текст · Фон / заливка · Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 7
Токены: --c-ink
shared/styles/tokens.css:22 :root → --c-ink

### #221C17

Роль: Фон / заливка · Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 13
Токены: --c-surface
shared/styles/theme-dark.css:13 :root → --c-surface

### #2A231C — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --env-face
shared/styles/theme-dark.css:31 :root → --env-face

### #800080 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Техническая карта смещения
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/components/LensFilter.tsx:56 stop → stop-color

### #2C251E

Роль: Фон / заливка · Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 5
Токены: --c-surface-sunk
shared/styles/theme-dark.css:14 :root → --c-surface-sunk

### #3A221C

Роль: Декор / токен · Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 6
Токены: --c-seal-wash
shared/styles/theme-dark.css:22 :root → --c-seal-wash

### #262828 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1302 .library .filters > .field, .filter-menu__trigger, .library__add → border

### #232B1E — ТОЛЬКО ОБЪЯВЛЕНИЯ

Роль: Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 0
Токены: --c-sage-wash
shared/styles/theme-dark.css:24 :root → --c-sage-wash

### #302820 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --env-fold
shared/styles/theme-dark.css:32 :root → --env-fold

### #282A2A

Роль: Декор / токен · Обводка · Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 15
Токены: --c-hairline
miniapp/styles/app.css:12 :root → --c-hairline

### #342C22 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --env-flap-face
shared/styles/theme-dark.css:33 :root → --env-flap-face

### #383027

Роль: Декор / токен · Обводка · Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 15
Токены: --c-hairline
shared/styles/theme-dark.css:18 :root → --c-hairline

### #323C49

Роль: Фон / заливка · Обводка
Литералов / объявлений: 54 · мест применения с учётом var(): 54
Именованный токен: нет
guest/assets/result.svg:31 path → fill
guest/assets/result.svg:32 path → fill
guest/assets/result.svg:33 path → fill
guest/assets/result.svg:34 path → fill
guest/assets/result.svg:35 path → fill
Ещё 49 записей — полный индекс в inventory.json

## 02 / Непрозрачные цвета · 2/5

Все фиксированные непрозрачные значения из подключённых исходников; определения старых тем также включены.

### #453A2C — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --env-edge
shared/styles/theme-dark.css:35 :root → --env-edge

### #3B3E3E — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1314 .filter-menu__trigger:hover, .library__add:hover → border-color

### #4A3F31 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --env-stitch
shared/styles/theme-dark.css:36 :root → --env-stitch

### #424343

Роль: Текст · Фон / заливка
Литералов / объявлений: 4 · мест применения с учётом var(): 9
Токены: --c-answer
guest/styles/invite.css:270 .hero__title → color
guest/styles/invite.css:310 .invite-intro → color
guest/styles/invite.css:1087 .page-invitation → color
shared/styles/tokens.css:29 :root → --c-answer

### #3E4634 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:308 .go → color

### #434343 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/assets/back-circle.svg:5 path → fill

### #B3261E — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:535 .note__error → color

### #424548 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/photo-editor.css:1 .photo-editor → color

### #454949

Роль: Фон / заливка · Текст · Обводка
Литералов / объявлений: 5 · мест применения с учётом var(): 5
Именованный токен: нет
guest/assets/selected-send.svg:3 path → fill
guest/styles/selected-place.css:31 .selected-place → color
guest/styles/selected-place.css:322 .page[data-picking] .note__send:focus-visible, .selected-place__back:focus-visible → outline
miniapp/styles/app.css:883 .home → color
miniapp/styles/app.css:999 .home__library-copy → color

### #A2371F — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен · Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --c-seal-deep
shared/styles/tokens.css:34 :root → --c-seal-deep

### #4E4E4E

Роль: Фон / заливка · Текст
Литералов / объявлений: 9 · мест применения с учётом var(): 9
Токены: --intro-ink, --wheel-caption-fill
guest/components/SelectedPlaceHeading.tsx:66 → fill
guest/styles/selected-place.css:242 .note-pressed-demo button → color
guest/styles/selected-place.css:276 .page[data-picking] .note__field, .page[data-picking] .note__ghost → color
miniapp/assets/home/create-envelope-title.svg:7 path → fill
miniapp/assets/places-feed/close-cross.svg:3 path → fill
Ещё 4 записей — полный индекс в inventory.json

### #A53B8E — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
api/domain/guestPhotoStyle.ts:11 → dotColor

### #55585C

Роль: Фон / заливка · Декор / токен · Текст · Обводка
Литералов / объявлений: 6 · мест применения с учётом var(): 6
Именованный токен: нет
miniapp/styles/photo-editor.css:15 .photo-editor__modes button[aria-pressed="true"] → background
miniapp/styles/photo-editor.css:19 .photo-editor input[type="range"] → accent-color
miniapp/styles/photo-editor.css:23 .photo-editor__toggle input → accent-color
miniapp/styles/photo-editor.css:27 .photo-editor .btn--ghost → color
miniapp/styles/photo-editor.css:28 .photo-editor button:focus-visible, .photo-editor input:focus-visible → outline
Ещё 1 записей — полный индекс в inventory.json

### #496455 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/photo-editor.css:26 .photo-editor__notice → color

### #C4452A

Роль: Декор / токен · Фон / заливка · Обводка · Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 21
Токены: --c-seal
shared/styles/tokens.css:33 :root → --c-seal

### #F72C9E — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/components/PinkDissolve.tsx:79 → fillStyle

### #008080 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Техническая карта смещения
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/components/LensFilter.tsx:50 stop → stop-color

### #6F6558

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 25
Токены: --c-ink-soft
shared/styles/tokens.css:23 :root → --c-ink-soft

### #64696D — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/photo-editor.css:6 .photo-editor__preview p → color

### #5F6F52 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен · Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --c-sage
shared/styles/tokens.css:36 :root → --c-sage

## 02 / Непрозрачные цвета · 3/5

Все фиксированные непрозрачные значения из подключённых исходников; определения старых тем также включены.

### #686C70

Роль: Текст
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
miniapp/styles/photo-editor.css:7 .photo-editor__caption → color
miniapp/styles/photo-editor.css:30 .library__photo-style → color

### #7D7266

Роль: Текст · Фон / заливка
Литералов / объявлений: 2 · мест применения с учётом var(): 8
Токены: --c-ink-faint
miniapp/styles/app.css:11 :root → --c-ink-faint
shared/styles/theme-dark.css:17 :root → --c-ink-faint

### #74797D — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/photo-editor.css:18 .photo-editor__slider output → color

### #777A80 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1313 .library .filters > .field::placeholder → color

### #837E65 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --c-note-ink
shared/styles/tokens.css:46 :root → --c-note-ink

### #808080

Роль: Техническая карта смещения
Литералов / объявлений: 5 · мест применения с учётом var(): 5
Именованный токен: нет
guest/components/LensFilter.tsx:50 stop → stop-color
guest/components/LensFilter.tsx:53 stop → stop-color
guest/components/LensFilter.tsx:56 stop → stop-color
guest/components/LensFilter.tsx:59 stop → stop-color
guest/components/LensFilter.tsx:62 rect → fill

### #E0705A

Роль: Декор / токен · Фон / заливка · Обводка · Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 21
Токены: --c-seal
shared/styles/theme-dark.css:20 :root → --c-seal

### #B5842F — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен · Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --c-status-opened
shared/styles/tokens.css:50 :root → --c-status-opened

### #A1968A

Роль: Текст · Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 8
Токены: --c-ink-faint
shared/styles/tokens.css:24 :root → --c-ink-faint

### #FF8080 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Техническая карта смещения
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/components/LensFilter.tsx:53 stop → stop-color

### #EA82B5

Роль: Фон / заливка · Обводка
Литералов / объявлений: 6 · мест применения с учётом var(): 6
Именованный токен: нет
miniapp/styles/app.css:1038 .home__library-back → background
miniapp/styles/app.css:1065 .home__library-front → background
miniapp/styles/app.css:1095 .home :focus-visible → outline-color
miniapp/styles/app.css:1200 .places-feed__place--picked::after → border
miniapp/styles/app.css:1215 .places-feed__number → background
Ещё 1 записей — полный индекс в inventory.json

### #F08A75 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен · Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --c-seal-deep
shared/styles/theme-dark.css:21 :root → --c-seal-deep

### #B3A696

Роль: Текст
Литералов / объявлений: 2 · мест применения с учётом var(): 25
Токены: --c-ink-soft
miniapp/styles/app.css:10 :root → --c-ink-soft
shared/styles/theme-dark.css:16 :root → --c-ink-soft

### #9DB289 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен · Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --c-sage
shared/styles/theme-dark.css:23 :root → --c-sage

### #EE96C4

Роль: Фон / заливка
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/invitation-intro.css:41 .invitation-intro__card → background
guest/styles/invitation-intro.css:88 .invitation-intro__surface → background

### #D9A94E — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен · Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --c-status-opened
shared/styles/theme-dark.css:26 :root → --c-status-opened

### #F9B1B3

Роль: Стоп градиента
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/components/SelectedPlaceHeading.tsx:60 → stopColor
miniapp/assets/home/create-envelope-title.svg:24 stop → stop-color

### #C5C8CF — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1305 .library .filters > .field, .filter-menu__trigger, .library__add → color

### #D3C9B8 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --env-edge
shared/styles/tokens.css:199 :root → --env-edge

### #D6CCBB — ТОЛЬКО ОБЪЯВЛЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 0
Токены: --env-face-reverse
shared/styles/tokens.css:198 :root → --env-face-reverse

## 02 / Непрозрачные цвета · 4/5

Все фиксированные непрозрачные значения из подключённых исходников; определения старых тем также включены.

### #DAD1A1

Роль: Тень / свечение · Декор / токен
Литералов / объявлений: 3 · мест применения с учётом var(): 3
Именованный токен: нет
guest/components/envelope/WheelCaption.tsx:93 → shadowColor
guest/styles/selected-place.css:51 .selected-place__heading svg → filter
miniapp/styles/app.css:1055 .home__library-stack-title → text-shadow

### #CDD1D4 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/photo-editor.css:21 .photo-editor input[type="color"] → border

### #E0D7C9 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --env-face
shared/styles/tokens.css:195 :root → --env-face

### #D9D9D9

Роль: Фон / заливка
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
miniapp/styles/app.css:1183 .places-feed__place → background
miniapp/styles/app.css:1194 .places-feed__place .thumb, .places-feed__placeholder → background

### #E2D9CA

Роль: Декор / токен · Обводка · Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 15
Токены: --c-hairline
shared/styles/tokens.css:30 :root → --c-hairline

### #80FF80 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Техническая карта смещения
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/components/LensFilter.tsx:59 stop → stop-color

### #E2DBCD — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --env-fold
shared/styles/tokens.css:196 :root → --env-fold

### #FFD7B0

Роль: Стоп градиента
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/components/SelectedPlaceHeading.tsx:59 → stopColor
miniapp/assets/home/create-envelope-title.svg:23 stop → stop-color

### #E5DDD0 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --env-flap-face
shared/styles/tokens.css:197 :root → --env-flap-face

### #E8DDCA — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:248 .note-pressed-demo button[aria-pressed='true'] → background

### #E2E5E8

Роль: Фон / заливка · Декор / токен
Литералов / объявлений: 4 · мест применения с учётом var(): 4
Именованный токен: нет
api/domain/guestPhotoStyle.ts:10 → paperColor
miniapp/styles/photo-editor.css:4 .photo-editor__preview → background
miniapp/styles/photo-editor.css:13 .photo-editor__modes → background
shared/halftone.ts:9 → photo-render-default

### #F6E4DE

Роль: Декор / токен · Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 6
Токены: --c-seal-wash
shared/styles/tokens.css:35 :root → --c-seal-wash

### #EFE8DC

Роль: Фон / заливка · Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 5
Токены: --c-surface-sunk
shared/styles/tokens.css:21 :root → --c-surface-sunk

### #E6EBE0 — ТОЛЬКО ОБЪЯВЛЕНИЯ

Роль: Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 0
Токены: --c-sage-wash
shared/styles/tokens.css:37 :root → --c-sage-wash

### #FCED99

Роль: Фон / заливка · Стоп градиента · Обводка · Декор / токен · Текст
Литералов / объявлений: 10 · мест применения с учётом var(): 35
Токены: --c-seal, --c-seal-deep, --c-seal-wash, --c-status-opened
guest/assets/Tap.svg:6 path → fill
guest/components/SelectedPlaceHeading.tsx:58 → stopColor
guest/styles/selected-place.css:189 .page[data-picking] .note::before → border
miniapp/assets/home/create-envelope-title.svg:22 stop → stop-color
miniapp/styles/app.css:1424 .compose-deck__card → background
Ещё 5 записей — полный индекс в inventory.json

### #E6EFDC

Роль: Фон / заливка · Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 5
Токены: --c-surface-sunk
guest/styles/wallpaper.css:36 :root → --c-surface-sunk

### #EEEED8 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1151 .places-feed__window → box-shadow

### #F3ECE1

Роль: Текст · Фон / заливка · Обводка
Литералов / объявлений: 2 · мест применения с учётом var(): 7
Токены: --c-ink
miniapp/styles/app.css:9 :root → --c-ink
shared/styles/theme-dark.css:15 :root → --c-ink

### #F2F2C3 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --note-pressed-edge
guest/styles/selected-place.css:207 .page[data-picking] .note[data-pressed-style='warm'] → --note-pressed-edge

### #E8F4D8

Роль: Декор / токен · Фон / заливка
Литералов / объявлений: 2 · мест применения с учётом var(): 3
Токены: --c-wallpaper
guest/index.html:8 → content
guest/styles/wallpaper.css:24 :root → --c-wallpaper

## 02 / Непрозрачные цвета · 5/5

Все фиксированные непрозрачные значения из подключённых исходников; определения старых тем также включены.

### #F2F2D9

Роль: Тень / свечение
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
miniapp/assets/places-feed/close-halo.svg:17 SVG filter → shadow-color
miniapp/styles/app.css:975 .home__library → box-shadow

### #F6F1E8

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 2
Токены: --c-paper
shared/styles/tokens.css:17 :root → --c-paper

### #F4F4DA — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:167 .page[data-picking] .note → background

### #FFF4BA — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен · Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --c-frame
shared/styles/tokens.css:42 :root → --c-frame

### #F3F3F3 — ТОЛЬКО ОБЪЯВЛЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 0
Токены: --c-table
shared/styles/tokens.css:19 :root → --c-table

### #FFF5C0

Роль: Текст · Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 3
Токены: --c-frame-ink
shared/styles/tokens.css:43 :root → --c-frame-ink

### #F4F5F5 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/photo-editor.css:1 .photo-editor → background

### #EEFDFF — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --env-stitch
shared/styles/tokens.css:200 :root → --env-stitch

### #FDFDDE

Роль: Фон / заливка
Литералов / объявлений: 4 · мест применения с учётом var(): 4
Токены: --intro-paper
miniapp/styles/app.css:866 body:has(.home) → background
miniapp/styles/app.css:882 .home → background
miniapp/styles/app.css:1104 .places-feed → background
guest/styles/invitation-intro.css:2 .invitation-intro → --intro-paper

### #FFFDF8

Роль: Текст · Фон / заливка · Обводка
Литералов / объявлений: 3 · мест применения с учётом var(): 15
Токены: --c-surface
miniapp/styles/app.css:837 .place-card__pick → color
shared/styles/base.css:100 .btn--primary → color
shared/styles/tokens.css:20 :root → --c-surface

### #FFFFFF

Роль: Фон / заливка · Текст
Литералов / объявлений: 7 · мест применения с учётом var(): 7
Именованный токен: нет
guest/assets/Tap.svg:3 rect → fill
guest/assets/result.svg:3 rect → fill
guest/assets/start.svg:3 rect → fill
miniapp/assets/home/create-envelope-title.svg:4 rect → fill
miniapp/styles/app.css:1049 .home__library-stack-title → color
Ещё 2 записей — полный индекс в inventory.json

## 03 / Цвет + прозрачность · 1/6

Alpha входит в идентичность цвета. Каждый образец показан на светлой и тёмной подложке. Это исходная краска, без opacity родительского элемента.

### #000000 / 0% — ПРОЗРАЧНЫЙ СТОП / МАСКА

Роль: Тень / свечение · Маска · Фон / заливка · Обводка · Декор / токен
Литералов / объявлений: 19 · мест применения с учётом var(): 19
Именованный токен: нет
guest/components/envelope/WheelCaption.tsx:99 → shadowColor
guest/styles/cycle.css:115 .cycle__item[data-out] → -webkit-mask-image
guest/styles/cycle.css:120 .cycle__item[data-out] → mask-image
guest/styles/cycle.css:208 .cycle__item[data-haze] .cycle__card → -webkit-mask-image
guest/styles/cycle.css:213 .cycle__item[data-haze] .cycle__card → mask-image
Ещё 14 записей — полный индекс в inventory.json

### #000000 / 6% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:842 .place-card__pick:hover:not(:disabled) → background

### #000000 / 12%

Роль: Тень / свечение
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/invite.css:1047 .dev-reset → box-shadow
miniapp/styles/app.css:1304 .library .filters > .field, .filter-menu__trigger, .library__add → box-shadow

### #000000 / 16%

Роль: Фон / заливка
Литералов / объявлений: 3 · мест применения с учётом var(): 3
Именованный токен: нет
guest/styles/invite.css:814 .photo__scrim → background
miniapp/styles/app.css:558 .scrim--soft → background
miniapp/styles/app.css:1380 .place-card__visual--composing::after → background

### #000000 / 19% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:833 .photo__scrim → box-shadow

### #000000 / 20%

Роль: Тень / свечение · Фон / заливка
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/invite.css:882 .photo__glyph → text-shadow
miniapp/styles/app.css:1075 .home__library-front::after → background

### #000000 / 22% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:814 .photo__scrim → background

### #000000 / 23% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Маска текста
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/components/envelope/WheelCaption.tsx:78 → strokeStyle

### #000000 / 24% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1425 .compose-deck__card → box-shadow

### #000000 / 28% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:553 .scrim → background

### #000000 / 30% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:841 .place-card__pick svg → filter

### #000000 / 35%

Роль: Тень / свечение
Литералов / объявлений: 2 · мест применения с учётом var(): 3
Токены: --sh-card
guest/styles/invite.css:852 .photo__dot → box-shadow
shared/styles/theme-dark.css:28 :root → --sh-card

### #000000 / 38% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:814 .photo__scrim → background

### #000000 / 40%

Роль: Фон / заливка · Тень / свечение · Декор / токен
Литералов / объявлений: 4 · мест применения с учётом var(): 5
Токены: --sh-card, --sh-flap
guest/styles/invite.css:814 .photo__scrim → background
miniapp/styles/app.css:839 .place-card__pick → text-shadow
shared/styles/theme-dark.css:28 :root → --sh-card
shared/styles/theme-dark.css:38 :root → --sh-flap

### #000000 / 42% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:814 .photo__scrim → background

### #000000 / 45%

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 5
Токены: --sh-lift
shared/styles/theme-dark.css:29 :root → --sh-lift

### #000000 / 50%

Роль: Фон / заливка · Тень / свечение · Декор / токен
Литералов / объявлений: 3 · мест применения с учётом var(): 7
Токены: --sh-lift, --sh-env
miniapp/styles/app.css:1364 .filter-menu__panel::backdrop → background
shared/styles/theme-dark.css:29 :root → --sh-lift
shared/styles/theme-dark.css:37 :root → --sh-env

### #000000 / 65% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/pile.css:487 .pile__invitation img → filter

### #14100A / 38% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:549 .card::before → box-shadow

### #2F282D / 36% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:79 .selected-place__photo::after → box-shadow

## 03 / Цвет + прозрачность · 2/6

Alpha входит в идентичность цвета. Каждый образец показан на светлой и тёмной подложке. Это исходная краска, без opacity родительского элемента.

### #3F2E1A / 0% — ПРОЗРАЧНЫЙ СТОП / МАСКА

Роль: Фон / заливка · Тень / свечение
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Токены: --wsh-near
guest/styles/wheel.css:453 .wheel__card::before → background
guest/styles/wheel.css:521 .wheel__item:not([data-front]):not([data-chosen]) .wheel__card → --wsh-near

### #3F2E1A / 5%

Роль: Тень / свечение
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Токены: --sh-chosen
guest/styles/note.css:87 .note → box-shadow
shared/styles/tokens.css:142 :root → --sh-chosen

### #3F2E1A / 6%

Роль: Тень / свечение
Литералов / объявлений: 3 · мест применения с учётом var(): 3
Токены: --sh-chosen
guest/styles/note.css:87 .note → box-shadow
guest/styles/note.css:199 .place-note → box-shadow
shared/styles/tokens.css:142 :root → --sh-chosen

### #3F2E1A / 7% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --sh-chosen
shared/styles/tokens.css:142 :root → --sh-chosen

### #3F2E1A / 8% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:300 .go → box-shadow

### #3F2E1A / 10% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение · Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --wsh-near
guest/styles/wheel.css:564 .wheel__card:has(.card--chosen) → --wsh-near

### #3F2E1A / 13%

Роль: Фон / заливка · Тень / свечение
Литералов / объявлений: 2 · мест применения с учётом var(): 3
Токены: --sh-card
guest/styles/wheel.css:489 .wheel__card::after → background
shared/styles/tokens.css:127 :root → --sh-card

### #3F2E1A / 18%

Роль: Тень / свечение · Фон / заливка
Литералов / объявлений: 2 · мест применения с учётом var(): 6
Токены: --wsh-near, --sh-lift
guest/styles/wheel.css:542 .wheel__item[data-front] .wheel__card:has(.card--pickable:not(.card--chosen):hover) → --wsh-near
shared/styles/tokens.css:128 :root → --sh-lift

### #3F2E1A / 20%

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 2
Токены: --sh-card
shared/styles/tokens.css:127 :root → --sh-card

### #3F2E1A / 24% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка · Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --c-card-edge
shared/styles/tokens.css:116 :root → --c-card-edge

### #3F2E1A / 25% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:213 .hero__seal → filter

### #3F2E1A / 28%

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 5
Токены: --sh-lift
shared/styles/tokens.css:128 :root → --sh-lift

### #3F2E1A / 35% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/envelope.css:265 .envelope__seal → filter

### #3F2E1A / 50% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/wheel.css:453 .wheel__card::before → background

### #323835 / 18% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --note-pressed-shadow
guest/styles/selected-place.css:221 .page[data-picking] .note[data-pressed-style='ink'] → --note-pressed-shadow

### #4A3828 / 13% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:235 .note-pressed-demo → box-shadow

### #503C00 / 35% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение · Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --c-tap-shadow
guest/styles/pile.css:85 :root → --c-tap-shadow

### #3D3D3B / 28% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:814 .photo__scrim → background

### #4E4E4E / 65% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invitation-intro.css:72 .invitation-intro__hint → color

### #5F4E3A / 15% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --note-pressed-shadow
guest/styles/selected-place.css:209 .page[data-picking] .note[data-pressed-style='warm'] → --note-pressed-shadow

## 03 / Цвет + прозрачность · 3/6

Alpha входит в идентичность цвета. Каждый образец показан на светлой и тёмной подложке. Это исходная краска, без opacity родительского элемента.

### #535147 / 10% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1066 .home__library-front → box-shadow

### #4D5251 / 56% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --note-pressed-edge
guest/styles/selected-place.css:219 .page[data-picking] .note[data-pressed-style='ink'] → --note-pressed-edge

### #605242 / 13% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:232 .note-pressed-demo → border

### #3A605A / 20% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --sh-chosen
shared/styles/tokens.css:142 :root → --sh-chosen

### #3A605A / 22% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение · Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --wsh-far
guest/styles/wheel.css:561 .wheel__card:has(.card--chosen) → --wsh-far

### #535B58 / 12% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --note-pressed-halo
guest/styles/selected-place.css:220 .page[data-picking] .note[data-pressed-style='ink'] → --note-pressed-halo

### #4A6068 / 62%

Роль: Декор / токен · Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 2
Токены: --c-card-shade
shared/styles/tokens.css:251 :root → --c-card-shade

### #6E5A43 / 18% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:249 .note-pressed-demo button[aria-pressed='true'] → box-shadow

### #95566F / 17% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --note-pressed-shadow
guest/styles/selected-place.css:215 .page[data-picking] .note[data-pressed-style='rose'] → --note-pressed-shadow

### #786C56 / 7% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:61 .note → background

### #786C56 / 9% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:361 .note:focus-within → background

### #7D764E / 58%

Роль: Обводка
Литералов / объявлений: 4 · мест применения с учётом var(): 4
Именованный токен: нет
guest/styles/invite.css:690 .card__name → -webkit-text-stroke
guest/styles/invite.css:691 .card__name → text-stroke
guest/styles/invite.css:707 .card__address → -webkit-text-stroke
guest/styles/invite.css:708 .card__address → text-stroke

### #787774 / 18% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:790 .place-card__identity → filter

### #E6549A / 41% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invitation-intro.css:39 .invitation-intro__card → border

### #907956 / 14% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение · Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --sh-env
shared/styles/tokens.css:203 :root → --sh-env

### #68858A / 11% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение · Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --sh-flap
shared/styles/tokens.css:204 :root → --sh-flap

### #68858A / 14% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/envelope.css:204 .envelope:not([data-state='sealed']) .envelope__flap → filter

### #9B77C0 / 20% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:755 .place-card__photo::after → background

### #D68B9F / 68% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --note-pressed-edge
guest/styles/selected-place.css:213 .page[data-picking] .note[data-pressed-style='rose'] → --note-pressed-edge

### #BB9AD5 / 45% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:748 .place-card__photo::before → background

## 03 / Цвет + прозрачность · 4/6

Alpha входит в идентичность цвета. Каждый образец показан на светлой и тёмной подложке. Это исходная краска, без opacity родительского элемента.

### #B5B19B / 10%

Роль: Тень / свечение
Литералов / объявлений: 4 · мест применения с учётом var(): 4
Именованный токен: нет
guest/styles/selected-place.css:69 .selected-place__photo → box-shadow
miniapp/styles/app.css:907 .home__create-image → box-shadow
miniapp/styles/app.css:1039 .home__library-back → box-shadow
miniapp/styles/app.css:1066 .home__library-front → box-shadow

### #B5B19B / 15% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:954 .home__create:hover .home__create-image, .home__create:focus-visible .home__create-image → box-shadow

### #B5B19B / 40% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:954 .home__create:hover .home__create-image, .home__create:focus-visible .home__create-image → box-shadow

### #B5B19B / 45%

Роль: Тень / свечение
Литералов / объявлений: 3 · мест применения с учётом var(): 3
Именованный токен: нет
guest/styles/selected-place.css:69 .selected-place__photo → box-shadow
miniapp/styles/app.css:907 .home__create-image → box-shadow
miniapp/styles/app.css:1039 .home__library-back → box-shadow

### #E8A1B5 / 22% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --note-pressed-halo
guest/styles/selected-place.css:214 .page[data-picking] .note[data-pressed-style='rose'] → --note-pressed-halo

### #95C0B7 / 16% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:755 .place-card__photo::after → background

### #F9B1B3 / 23% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Стоп градиента
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/components/envelope/WheelCaption.tsx:109 → stop-color

### #D4CBA0 / 45%

Роль: Тень / свечение
Литералов / объявлений: 3 · мест применения с учётом var(): 3
Именованный токен: нет
miniapp/assets/places-feed/close-halo.svg:12 SVG filter → shadow-color
miniapp/styles/app.css:975 .home__library → box-shadow
miniapp/styles/app.css:1151 .places-feed__window → box-shadow

### #DAD1A1 / 50% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/assets/home/create-envelope-title.svg:17 SVG filter → shadow-color

### #B0DBC9 / 15% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:748 .place-card__photo::before → background

### #DBD8C7 / 45% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:107 .selected-place__caption → box-shadow

### #FFD7B0 / 23% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Стоп градиента
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/components/envelope/WheelCaption.tsx:108 → stop-color

### #E1DFCF / 48% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1247 .places-feed__action, .places-feed__library-action → text-shadow

### #EBE2E2 / 25% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:549 .card::before → box-shadow

### #E8E8CA / 10%

Роль: Тень / свечение
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/selected-place.css:170 .page[data-picking] .note → box-shadow
guest/styles/selected-place.css:197 .page[data-picking] .note:focus-within → box-shadow

### #E8E8CA / 24%

Роль: Тень / свечение
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/selected-place.css:170 .page[data-picking] .note → box-shadow
guest/styles/selected-place.css:197 .page[data-picking] .note:focus-within → box-shadow

### #FCED99 / 6% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1425 .compose-deck__card → box-shadow

### #FCED99 / 19% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:755 .place-card__photo::after → background

### #FCED99 / 23% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Стоп градиента
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/components/envelope/WheelCaption.tsx:107 → stop-color

### #FCED99 / 55% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:748 .place-card__photo::before → background

## 03 / Цвет + прозрачность · 5/6

Alpha входит в идентичность цвета. Каждый образец показан на светлой и тёмной подложке. Это исходная краска, без opacity родительского элемента.

### #D9F0E4 / 0% — 1 МЕСТО ПРИМЕНЕНИЯ · ПРОЗРАЧНЫЙ СТОП / МАСКА

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/pile.css:326 .pile__fog → background

### #D9F0E4 / 55% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/pile.css:326 .pile__fog → background

### #EEEDED / 25% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:79 .selected-place__photo::after → box-shadow

### #F2F2C3 / 55% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Токены: --note-pressed-halo
guest/styles/selected-place.css:208 .page[data-picking] .note[data-pressed-style='warm'] → --note-pressed-halo

### #FFF5C0 / 12% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:928 .home__create-image::after → border

### #FFF5C0 / 24% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:65 .selected-place__photo → border

### #FFF5C0 / 38%

Роль: Обводка · Фон / заливка
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
miniapp/styles/app.css:1029 .home__library-back, .home__library-front → border
miniapp/styles/app.css:1168 .places-feed__grid → background

### #F5F5E0 / 51% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/assets/places-feed/close-halo.svg:3 circle → fill

### #FFF9D6 / 45% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:61 .note → background

### #FFF9D6 / 55%

Роль: Фон / заливка
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/note.css:297 .go → background
guest/styles/note.css:361 .note:focus-within → background

### #FFF9D6 / 68% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:346 .go:hover → background

### #F9FAED / 40%

Роль: Фон / заливка
Литералов / объявлений: 3 · мест применения с учётом var(): 3
Именованный токен: нет
guest/styles/selected-place.css:116 .selected-place__caption::before → background
miniapp/styles/app.css:974 .home__library → background
miniapp/styles/app.css:1150 .places-feed__window → background

### #EFFFE0 / 95% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/pile.css:326 .pile__fog → background

### #FDFBEF / 76%

Роль: Обводка
Литералов / объявлений: 4 · мест применения с учётом var(): 4
Именованный токен: нет
guest/styles/selected-place.css:105 .selected-place__caption → border
miniapp/assets/places-feed/close-halo.svg:4 circle → stroke
miniapp/styles/app.css:972 .home__library → border
miniapp/styles/app.css:1148 .places-feed__window → border

### #FFFBF2 / 60% — ТОЛЬКО ОБЪЯВЛЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 0
Токены: --c-card-bevel
shared/styles/tokens.css:119 :root → --c-card-bevel

### #FFFCEB / 92% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:234 .note-pressed-demo → background

### #FFFDF8 / 50% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:851 .photo__dot → background

### #FFFDF8 / 92%

Роль: Текст
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/invite.css:881 .photo__glyph → color
miniapp/styles/app.css:231 .thumb--empty → color

### #FFFFFF / 0% — 1 МЕСТО ПРИМЕНЕНИЯ · ПРОЗРАЧНЫЙ СТОП / МАСКА

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:814 .photo__scrim → background

### #FFFFFF / 2% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:628 .card::after → background

## 03 / Цвет + прозрачность · 6/6

Alpha входит в идентичность цвета. Каждый образец показан на светлой и тёмной подложке. Это исходная краска, без opacity родительского элемента.

### #FFFFFF / 6% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:822 .place-category → border

### #FFFFFF / 10% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:821 .place-category → background

### #FFFFFF / 19% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:61 .note → background

### #FFFFFF / 20%

Роль: Фон / заливка
Литералов / объявлений: 3 · мест применения с учётом var(): 3
Именованный токен: нет
guest/assets/back-circle.svg:3 circle → fill
guest/styles/invite.css:628 .card::after → background
miniapp/styles/app.css:1273 .library__add → background

### #FFFFFF / 24%

Роль: Фон / заливка
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/note.css:196 .place-note → background
guest/styles/note.css:361 .note:focus-within → background

### #FFFFFF / 25%

Роль: Тень / свечение
Литералов / объявлений: 8 · мест применения с учётом var(): 8
Именованный токен: нет
guest/styles/invitation-intro.css:10 .invitation-intro → box-shadow
guest/styles/selected-place.css:7 .page[data-picking] → box-shadow
guest/styles/selected-place.css:127 .selected-place__caption::after → box-shadow
guest/styles/wallpaper.css:125 body:has(.page[data-browsing])::before → box-shadow
miniapp/assets/places-feed/close-halo.svg:24 SVG filter → shadow-color
Ещё 3 записей — полный индекс в inventory.json

### #FFFFFF / 26%

Роль: Фон / заливка
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/invite.css:628 .card::after → background
guest/styles/note.css:61 .note → background

### #FFFFFF / 28% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:87 .note → box-shadow

### #FFFFFF / 32% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:361 .note:focus-within → background

### #FFFFFF / 35%

Роль: Фон / заливка · Тень / свечение
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/invite.css:345 .hero__back → background
guest/styles/note.css:300 .go → box-shadow

### #FFFFFF / 39% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:61 .note → background

### #FFFFFF / 45% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:199 .place-note → box-shadow

### #FFFFFF / 47%

Роль: Тень / свечение
Литералов / объявлений: 3 · мест применения с учётом var(): 3
Именованный токен: нет
guest/styles/invitation-intro.css:10 .invitation-intro → box-shadow
guest/styles/selected-place.css:7 .page[data-picking] → box-shadow
guest/styles/wallpaper.css:125 body:has(.page[data-browsing])::before → box-shadow

### #FFFFFF / 48% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:361 .note:focus-within → background

### #FFFFFF / 50%

Роль: Тень / свечение
Литералов / объявлений: 3 · мест применения с учётом var(): 3
Именованный токен: нет
guest/styles/invite.css:348 .hero__back → box-shadow
guest/styles/invite.css:635 .card::after → box-shadow
guest/styles/note.css:87 .note → box-shadow

### #FFFFFF / 55% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:366 .hero__back:hover → background

### #FFFFFF / 61% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:61 .note → background

### #FFFFFF / 62%

Роль: Обводка · Фон / заливка
Литералов / объявлений: 3 · мест применения с учётом var(): 3
Токены: --c-wallpaper-glow
guest/styles/pile.css:269 .pile__haze → outline
guest/styles/wheel.css:381 .wheel .card::before → outline
guest/styles/wallpaper.css:30 :root → --c-wallpaper-glow

### #FFFFFF / 72% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:361 .note:focus-within → background

### #FFFFFF / 75% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:635 .card::after → box-shadow

## 04 / Градиенты интерфейса · 1/3

Каждая уникальная формула сохранена полностью. Превью показывает цветовой переход; точную геометрию, относительные размеры и stop-позиции задаёт формула.

### SVG · l — Техническая карта смещения

Техническая карта для SVG displacement, не цвет интерфейса.
<linearGradient id="l" x1="0" y1="0" x2="1" y2="0"> <stop offset="0" stop-color="#008080"/><stop offset="1" stop-color="#808080"/> </linearGradient>
guest/components/LensFilter.tsx:49 → SVG gradient

### SVG · r — Техническая карта смещения

Техническая карта для SVG displacement, не цвет интерфейса.
<linearGradient id="r" x1="0" y1="0" x2="1" y2="0"> <stop offset="0" stop-color="#808080"/><stop offset="1" stop-color="#ff8080"/> </linearGradient>
guest/components/LensFilter.tsx:52 → SVG gradient

### SVG · t — Техническая карта смещения

Техническая карта для SVG displacement, не цвет интерфейса.
<linearGradient id="t" x1="0" y1="0" x2="0" y2="1"> <stop offset="0" stop-color="#800080"/><stop offset="1" stop-color="#808080"/> </linearGradient>
guest/components/LensFilter.tsx:55 → SVG gradient

### SVG · b — Техническая карта смещения

Техническая карта для SVG displacement, не цвет интерфейса.
<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"> <stop offset="0" stop-color="#808080"/><stop offset="1" stop-color="#80ff80"/> </linearGradient>
guest/components/LensFilter.tsx:58 → SVG gradient

### SVG · dynamic-id — Градиент SVG

Краска обводки применяется с opacity 0.23; образец ниже показывает сами стопы.
<linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0"> <stop offset="27.885%" stopColor="#fced99" /> <stop offset="63.462%" stopColor="#ffd7b0" /> <stop offset="100%" stopColor="#f9b1b3" /> </linearGradient>
guest/components/SelectedPlaceHeading.tsx:57 → SVG gradient

### Canvas · WheelCaption — Обводка текста


const gradient = ctx.createLinearGradient(0, height, width, 0); gradient.addColorStop(0.27885, 'rgb(252 237 153 / 23%)'); gradient.addColorStop(0.63462, 'rgb(255 215 176 / 23%)'); gradient.addColorStop(1, 'rgb(249 177 179 / 23%)'); ctx.strokeStyle = gradient;
guest/components/envelope/WheelCaption.tsx:106 → strokeStyle

### CSS · .cycle__item[data-out] — Маска

Архивная раскладка: .cycle отсутствует в текущей разметке.
linear-gradient( to bottom, transparent calc(var(--out-y) - var(--cycle-fade)), #000 var(--out-y) )
guest/styles/cycle.css:115 → -webkit-mask-image
guest/styles/cycle.css:120 → mask-image

### CSS · .cycle__item[data-haze] .cycle__card — Маска

Архивная раскладка: .cycle отсутствует в текущей разметке.
linear-gradient( to bottom, #000 calc(var(--haze-y) - var(--cycle-haze) * var(--cycle-peek)), transparent var(--haze-y) )
guest/styles/cycle.css:208 → -webkit-mask-image
guest/styles/cycle.css:213 → mask-image

### CSS · .card::after — Фон / заливка


linear-gradient( var(--glass-angle), rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0.02) 45%, rgba(255, 255, 255, 0.2) )
guest/styles/invite.css:628 → background

### CSS · .card::after — Маска


linear-gradient(#000 0 0)
guest/styles/invite.css:638 → -webkit-mask
guest/styles/invite.css:641 → mask

### CSS · .photo__scrim — Фон / заливка

Скрыт для .wheel правилом wheel-caption.css.
radial-gradient( ellipse at top right, rgba(0, 0, 0, 0.38) 0%, rgba(0, 0, 0, 0.16) 30%, rgba(0, 0, 0, 0) 65% )
guest/styles/invite.css:814 → background

### CSS · .photo__scrim — Фон / заливка

Скрыт для .wheel правилом wheel-caption.css.
linear-gradient( 57.33deg, rgba(0, 0, 0, 0.4) 0.9%, rgba(255, 255, 255, 0) 49.86%, rgba(61, 61, 59, 0.28) 84.24% )
guest/styles/invite.css:814 → background

## 04 / Градиенты интерфейса · 2/3

Каждая уникальная формула сохранена полностью. Превью показывает цветовой переход; точную геометрию, относительные размеры и stop-позиции задаёт формула.

### CSS · .photo__scrim — Фон / заливка

Скрыт для .wheel правилом wheel-caption.css.
linear-gradient( to top, rgba(0, 0, 0, 0.42) 0%, rgba(0, 0, 0, 0.22) 24%, rgba(0, 0, 0, 0) 52% )
guest/styles/invite.css:814 → background

### CSS · .photo--empty — Фон / заливка


radial-gradient( 120% 100% at 30% 0%, hsl(var(--placeholder-hue) 42% 78% / 0.85), transparent 70% )
guest/styles/invite.css:864 → background

### CSS · .photo--empty — Фон / заливка


linear-gradient( 160deg, hsl(calc(var(--placeholder-hue) + 40) 34% 72%), hsl(var(--placeholder-hue) 30% 60%) )
guest/styles/invite.css:864 → background
miniapp/styles/app.css:232 → background

### CSS · .note — Фон / заливка


linear-gradient( 180deg, rgba(255, 255, 255, 0.61) 0%, rgba(255, 255, 255, 0.19) 26%, rgba(120, 108, 86, 0.07) 55%, rgba(255, 255, 255, 0.26) 88%, rgba(255, 255, 255, 0.39) 100% )
guest/styles/note.css:61 → background

### CSS · .note:focus-within — Фон / заливка


linear-gradient( 180deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.24) 26%, rgba(120, 108, 86, 0.09) 55%, rgba(255, 255, 255, 0.32) 88%, rgba(255, 255, 255, 0.48) 100% )
guest/styles/note.css:361 → background

### CSS · .pile__fog — Фон / заливка


radial-gradient( 50% 50% at 50% 50%, rgba(239, 255, 224, 0.95) 0%, rgba(217, 240, 228, 0.55) 44%, rgba(217, 240, 228, 0) 70% )
guest/styles/pile.css:326 → background

### CSS · body::before,
.invite-cover — Фон / заливка


linear-gradient(180deg, var(--c-wallpaper), transparent var(--top-fix))
guest/styles/wallpaper.css:92 → background

### CSS · body::before,
.invite-cover — Фон / заливка


linear-gradient(90deg, var(--c-wallpaper-glow), transparent var(--edge-fix))
guest/styles/wallpaper.css:92 → background

### CSS · body::before,
.invite-cover — Фон / заливка


linear-gradient(270deg, var(--c-wallpaper-glow), transparent var(--edge-fix))
guest/styles/wallpaper.css:92 → background

### CSS · .wheel__card::before — Фон / заливка


radial-gradient(closest-side, rgba(63, 46, 26, 0.5), rgba(63, 46, 26, 0))
guest/styles/wheel.css:453 → background

### SVG · paint0_linear_814_655 — Градиент SVG

Краска обводки применяется с opacity 0.23; образец ниже показывает сами стопы.
<linearGradient id="paint0_linear_814_655" x1="97.1851" y1="136.702" x2="165.44" y2="-9.73784" gradientUnits="userSpaceOnUse"> <stop offset="0.278846" stop-color="#FCED99"/> <stop offset="0.634615" stop-color="#FFD7B0"/> <stop offset="1" stop-color="#F9B1B3"/> </linearGradient>
miniapp/assets/home/create-envelope-title.svg:21 → SVG gradient

### CSS · .place-card__photo::before — Фон / заливка


linear-gradient(140deg, rgba(252, 237, 153, .55), rgba(176, 219, 201, .15) 45%, rgba(187, 154, 213, .45))
miniapp/styles/app.css:748 → background

## 04 / Градиенты интерфейса · 3/3

Каждая уникальная формула сохранена полностью. Превью показывает цветовой переход; точную геометрию, относительные размеры и stop-позиции задаёт формула.

### CSS · .place-card__photo::after — Фон / заливка


linear-gradient(110deg, rgba(252, 237, 153, .19), rgba(149, 192, 183, .16), rgba(155, 119, 192, .2))
miniapp/styles/app.css:755 → background

## 04b / Динамические цвета и настройки

Эти значения нельзя заменить одним HEX без потери поведения.

### --placeholder-hue

0–359° = hash(seed) % 360. Используется в HSL-заглушках фотографий. hue = hue * 31 + код символа, по модулю 360.
miniapp/components/PlaceThumb.tsx:2; guest/components/PhotoFrame.tsx:14
Пример цвета стопа hsl(H 30% 60%) при H=30 / 150 / 270.

### --note-fill / --note-focus-fill

Fallback-переменные без объявлений в подключённом коде.
--note-fill → rgba(255,249,214,0.45), note.css:61
--note-focus-fill → rgba(255,249,214,0.55), note.css:361
Роль: заливка поля заметки, обычное состояние / фокус.

### --c-seal-wash · вычисляемый цвет

color-mix(in srgb, #FCED99 12%, #121313)
Результат sRGB: rgb(46.08 45.16 35.08) ≈ #2E2D23.
miniapp/styles/app.css:15 · фон выбранных элементов.

### PinkDissolve · alpha меняется во времени

rgba(255, 246, 251, progress³ × 0.88)
Белёсая розовая дымка, alpha от 0 до 88%. Базовый цвет эффекта #F72C9E.
guest/components/PinkDissolve.tsx:74,79

### currentColor / inherit

Наследуемый цвет текста, обводки и иконок. Не самостоятельный HEX.
Значение берётся из color соответствующего элемента / предка. Обращения сохранены в полном реестре.

### Настройки фото

paperColor: #E2E5E8; dotColor по умолчанию: #55585C.
Гостевой профиль: dotColor #A53B8E.
PhotoEditor разрешает пользователю произвольный цвет — множество значений не ограничено палитрой.
shared/src/halftone.ts:9–10; api/src/domain/guestPhotoStyle.ts:10–11.

### Параметры геометрии градиентов

--glass-angle: 55deg; --top-fix и --edge-fix зависят от размеров viewport. Маски .cycle используют --out-y / --haze-y / --cycle-fade / --cycle-haze / --cycle-peek. Это параметры перехода и маски, не самостоятельные цвета.

## 05 / Близкие оттенки · 1/4

Все пары непрозрачных исходных значений с ΔE76 < 5, CIELAB D65. Меньше число — ближе. Прозрачные значения исключены: их вид зависит от фона. Пары включают старые определения тем.

### #434343 ↔ #424343 — ΔE76 = 0.45

#434343 · guest/assets/back-circle.svg:5
#424343 · guest/styles/invite.css:270; guest/styles/invite.css:310; guest/styles/invite.css:1087

### #F4F5F5 ↔ #F3F3F3 — ΔE76 = 0.71

#F4F5F5 · miniapp/styles/photo-editor.css:1
#F3F3F3 · shared/styles/tokens.css:19

### #17130F ↔ #15120E — ΔE76 = 0.77

#17130F · shared/styles/theme-dark.css:11
#15120E · shared/styles/theme-dark.css:12

### #F4F4DA ↔ #F2F2D9 — ΔE76 = 0.83

#F4F4DA · guest/styles/selected-place.css:167
#F2F2D9 · miniapp/assets/places-feed/close-halo.svg:17; miniapp/styles/app.css:975

### #E2D9CA ↔ #E0D7C9 — ΔE76 = 0.85

#E2D9CA · shared/styles/tokens.css:30
#E0D7C9 · shared/styles/tokens.css:195

### #211C16 ↔ #221C17 — ΔE76 = 0.88

#211C16 · shared/styles/tokens.css:22
#221C17 · shared/styles/theme-dark.css:13

### #262828 ↔ #282A2A — ΔE76 = 0.95

#262828 · miniapp/styles/app.css:1302
#282A2A · miniapp/styles/app.css:12

### #2C251E ↔ #2A231C — ΔE76 = 0.96

#2C251E · shared/styles/theme-dark.css:14
#2A231C · shared/styles/theme-dark.css:31

### #E2DBCD ↔ #E5DDD0 — ΔE76 = 1.03

#E2DBCD · shared/styles/tokens.css:196
#E5DDD0 · shared/styles/tokens.css:197

### #211C16 ↔ #201A14 — ΔE76 = 1.04

#211C16 · shared/styles/tokens.css:22
#201A14 · shared/styles/theme-dark.css:34

### #D6CCBB ↔ #D3C9B8 — ΔE76 = 1.08

#D6CCBB · shared/styles/tokens.css:198
#D3C9B8 · shared/styles/tokens.css:199

### #E2D9CA ↔ #E2DBCD — ΔE76 = 1.09

#E2D9CA · shared/styles/tokens.css:30
#E2DBCD · shared/styles/tokens.css:196

### #221C17 ↔ #201A14 — ΔE76 = 1.21

#221C17 · shared/styles/theme-dark.css:13
#201A14 · shared/styles/theme-dark.css:34

### #64696D ↔ #686C70 — ΔE76 = 1.36

#64696D · miniapp/styles/photo-editor.css:6
#686C70 · miniapp/styles/photo-editor.css:7; miniapp/styles/photo-editor.css:30

### #000000 ↔ #050505 — ΔE76 = 1.37

#000000 · guest/assets/Tap.svg:2; guest/assets/result.svg:2; guest/assets/start.svg:2
#050505 · miniapp/styles/app.css:7; miniapp/styles/app.css:8

### #E0D7C9 ↔ #E2DBCD — ΔE76 = 1.47

#E0D7C9 · shared/styles/tokens.css:195
#E2DBCD · shared/styles/tokens.css:196

### #EFE8DC ↔ #F3ECE1 — ΔE76 = 1.52

#EFE8DC · shared/styles/tokens.css:21
#F3ECE1 · miniapp/styles/app.css:9; shared/styles/theme-dark.css:15

### #777A80 ↔ #74797D — ΔE76 = 1.55

#777A80 · miniapp/styles/app.css:1313
#74797D · miniapp/styles/photo-editor.css:18

### #2C251E ↔ #302820 — ΔE76 = 1.72

#2C251E · shared/styles/theme-dark.css:14
#302820 · shared/styles/theme-dark.css:32

### #E2D9CA ↔ #E5DDD0 — ΔE76 = 1.79

#E2D9CA · shared/styles/tokens.css:30
#E5DDD0 · shared/styles/tokens.css:197

### #F2F2D9 ↔ #EEEED8 — ΔE76 = 2

#F2F2D9 · miniapp/assets/places-feed/close-halo.svg:17; miniapp/styles/app.css:975
#EEEED8 · miniapp/styles/app.css:1151

### #383027 ↔ #342C22 — ΔE76 = 2.02

#383027 · shared/styles/theme-dark.css:18
#342C22 · shared/styles/theme-dark.css:33

### #F6F1E8 ↔ #F3ECE1 — ΔE76 = 2.08

#F6F1E8 · shared/styles/tokens.css:17
#F3ECE1 · miniapp/styles/app.css:9; shared/styles/theme-dark.css:15

### #E0D7C9 ↔ #E5DDD0 — ΔE76 = 2.18

#E0D7C9 · shared/styles/tokens.css:195
#E5DDD0 · shared/styles/tokens.css:197

## 05 / Близкие оттенки · 2/4

Все пары непрозрачных исходных значений с ΔE76 < 5, CIELAB D65. Меньше число — ближе. Прозрачные значения исключены: их вид зависит от фона. Пары включают старые определения тем.

### #302820 ↔ #342C22 — ΔE76 = 2.22

#302820 · shared/styles/theme-dark.css:32
#342C22 · shared/styles/theme-dark.css:33

### #453A2C ↔ #4A3F31 — ΔE76 = 2.22

#453A2C · shared/styles/theme-dark.css:35
#4A3F31 · shared/styles/theme-dark.css:36

### #424343 ↔ #424548 — ΔE76 = 2.24

#424343 · guest/styles/invite.css:270; guest/styles/invite.css:310; guest/styles/invite.css:1087
#424548 · miniapp/styles/photo-editor.css:1

### #121313 ↔ #171818 — ΔE76 = 2.35

#121313 · miniapp/styles/app.css:20; miniapp/styles/app.css:202; miniapp/styles/app.css:5
#171818 · miniapp/styles/app.css:1301

### #434343 ↔ #424548 — ΔE76 = 2.4

#434343 · guest/assets/back-circle.svg:5
#424548 · miniapp/styles/photo-editor.css:1

### #454949 ↔ #424548 — ΔE76 = 2.53

#454949 · guest/assets/selected-send.svg:3; guest/styles/selected-place.css:31; guest/styles/selected-place.css:322
#424548 · miniapp/styles/photo-editor.css:1

### #424343 ↔ #3B3E3E — ΔE76 = 2.55

#424343 · guest/styles/invite.css:270; guest/styles/invite.css:310; guest/styles/invite.css:1087
#3B3E3E · miniapp/styles/app.css:1314

### #2A231C ↔ #302820 — ΔE76 = 2.59

#2A231C · shared/styles/theme-dark.css:31
#302820 · shared/styles/theme-dark.css:32

### #FFF5C0 ↔ #FFF4BA — ΔE76 = 2.6

#FFF5C0 · shared/styles/tokens.css:43
#FFF4BA · shared/styles/tokens.css:42

### #E8DDCA ↔ #E2D9CA — ΔE76 = 2.64

#E8DDCA · guest/styles/selected-place.css:248
#E2D9CA · shared/styles/tokens.css:30

### #454949 ↔ #424343 — ΔE76 = 2.68

#454949 · guest/assets/selected-send.svg:3; guest/styles/selected-place.css:31; guest/styles/selected-place.css:322
#424343 · guest/styles/invite.css:270; guest/styles/invite.css:310; guest/styles/invite.css:1087

### #FFFFFF ↔ #FFFDF8 — ΔE76 = 2.71

#FFFFFF · guest/assets/Tap.svg:3; guest/assets/result.svg:3; guest/assets/start.svg:3
#FFFDF8 · miniapp/styles/app.css:837; shared/styles/base.css:100; shared/styles/tokens.css:20

### #121313 ↔ #15120E — ΔE76 = 2.8

#121313 · miniapp/styles/app.css:20; miniapp/styles/app.css:202; miniapp/styles/app.css:5
#15120E · shared/styles/theme-dark.css:12

### #434343 ↔ #3B3E3E — ΔE76 = 2.82

#434343 · guest/assets/back-circle.svg:5
#3B3E3E · miniapp/styles/app.css:1314

### #F4F4DA ↔ #EEEED8 — ΔE76 = 2.82

#F4F4DA · guest/styles/selected-place.css:167
#EEEED8 · miniapp/styles/app.css:1151

### #434343 ↔ #454949 — ΔE76 = 2.84

#434343 · guest/assets/back-circle.svg:5
#454949 · guest/assets/selected-send.svg:3; guest/styles/selected-place.css:31; guest/styles/selected-place.css:322

### #454949 ↔ #4E4E4E — ΔE76 = 3.05

#454949 · guest/assets/selected-send.svg:3; guest/styles/selected-place.css:31; guest/styles/selected-place.css:322
#4E4E4E · guest/components/SelectedPlaceHeading.tsx:66; guest/styles/selected-place.css:242; guest/styles/selected-place.css:276

### #E8DDCA ↔ #E2DBCD — ΔE76 = 3.14

#E8DDCA · guest/styles/selected-place.css:248
#E2DBCD · shared/styles/tokens.css:196

### #121313 ↔ #17130F — ΔE76 = 3.26

#121313 · miniapp/styles/app.css:20; miniapp/styles/app.css:202; miniapp/styles/app.css:5
#17130F · shared/styles/theme-dark.css:11

### #E8DDCA ↔ #E5DDD0 — ΔE76 = 3.33

#E8DDCA · guest/styles/selected-place.css:248
#E5DDD0 · shared/styles/tokens.css:197

### #E8DDCA ↔ #E0D7C9 — ΔE76 = 3.44

#E8DDCA · guest/styles/selected-place.css:248
#E0D7C9 · shared/styles/tokens.css:195

### #F6F1E8 ↔ #EFE8DC — ΔE76 = 3.53

#F6F1E8 · shared/styles/tokens.css:17
#EFE8DC · shared/styles/tokens.css:21

### #FFFFFF ↔ #F4F5F5 — ΔE76 = 3.55

#FFFFFF · guest/assets/Tap.svg:3; guest/assets/result.svg:3; guest/assets/start.svg:3
#F4F5F5 · miniapp/styles/photo-editor.css:1

### #EEEED8 ↔ #E6EFDC — ΔE76 = 3.61

#EEEED8 · miniapp/styles/app.css:1151
#E6EFDC · guest/styles/wallpaper.css:36

## 05 / Близкие оттенки · 3/4

Все пары непрозрачных исходных значений с ΔE76 < 5, CIELAB D65. Меньше число — ближе. Прозрачные значения исключены: их вид зависит от фона. Пары включают старые определения тем.

### #3B3E3E ↔ #424548 — ΔE76 = 3.73

#3B3E3E · miniapp/styles/app.css:1314
#424548 · miniapp/styles/photo-editor.css:1

### #383027 ↔ #302820 — ΔE76 = 3.73

#383027 · shared/styles/theme-dark.css:18
#302820 · shared/styles/theme-dark.css:32

### #D9D9D9 ↔ #CDD1D4 — ΔE76 = 3.74

#D9D9D9 · miniapp/styles/app.css:1183; miniapp/styles/app.css:1194
#CDD1D4 · miniapp/styles/photo-editor.css:21

### #C5C8CF ↔ #CDD1D4 — ΔE76 = 3.75

#C5C8CF · miniapp/styles/app.css:1305
#CDD1D4 · miniapp/styles/photo-editor.css:21

### #221C17 ↔ #2A231C — ΔE76 = 3.75

#221C17 · shared/styles/theme-dark.css:13
#2A231C · shared/styles/theme-dark.css:31

### #171818 ↔ #15120E — ΔE76 = 3.79

#171818 · miniapp/styles/app.css:1301
#15120E · shared/styles/theme-dark.css:12

### #211C16 ↔ #2A231C — ΔE76 = 3.81

#211C16 · shared/styles/tokens.css:22
#2A231C · shared/styles/theme-dark.css:31

### #171818 ↔ #17130F — ΔE76 = 3.85

#171818 · miniapp/styles/app.css:1301
#17130F · shared/styles/theme-dark.css:11

### #F4F4DA ↔ #FDFDDE — ΔE76 = 3.88

#F4F4DA · guest/styles/selected-place.css:167
#FDFDDE · miniapp/styles/app.css:866; miniapp/styles/app.css:882; miniapp/styles/app.css:1104

### #2C251E ↔ #342C22 — ΔE76 = 3.88

#2C251E · shared/styles/theme-dark.css:14
#342C22 · shared/styles/theme-dark.css:33

### #EFE8DC ↔ #E5DDD0 — ΔE76 = 3.89

#EFE8DC · shared/styles/tokens.css:21
#E5DDD0 · shared/styles/tokens.css:197

### #FFFDF8 ↔ #F4F5F5 — ΔE76 = 3.97

#FFFDF8 · miniapp/styles/app.css:837; shared/styles/base.css:100; shared/styles/tokens.css:20
#F4F5F5 · miniapp/styles/photo-editor.css:1

### #FFFFFF ↔ #F3F3F3 — ΔE76 = 4.16

#FFFFFF · guest/assets/Tap.svg:3; guest/assets/result.svg:3; guest/assets/start.svg:3
#F3F3F3 · shared/styles/tokens.css:19

### #E0D7C9 ↔ #D6CCBB — ΔE76 = 4.28

#E0D7C9 · shared/styles/tokens.css:195
#D6CCBB · shared/styles/tokens.css:198

### #808080 ↔ #74797D — ΔE76 = 4.29

#808080 · guest/components/LensFilter.tsx:50; guest/components/LensFilter.tsx:53; guest/components/LensFilter.tsx:56
#74797D · miniapp/styles/photo-editor.css:18

### #FFFDF8 ↔ #F3F3F3 — ΔE76 = 4.37

#FFFDF8 · miniapp/styles/app.css:837; shared/styles/base.css:100; shared/styles/tokens.css:20
#F3F3F3 · shared/styles/tokens.css:19

### #EFE8DC ↔ #E6EBE0 — ΔE76 = 4.38

#EFE8DC · shared/styles/tokens.css:21
#E6EBE0 · shared/styles/tokens.css:37

### #17130F ↔ #201A14 — ΔE76 = 4.39

#17130F · shared/styles/theme-dark.css:11
#201A14 · shared/styles/theme-dark.css:34

### #808080 ↔ #777A80 — ΔE76 = 4.4

#808080 · guest/components/LensFilter.tsx:50; guest/components/LensFilter.tsx:53; guest/components/LensFilter.tsx:56
#777A80 · miniapp/styles/app.css:1313

### #121313 ↔ #050505 — ΔE76 = 4.44

#121313 · miniapp/styles/app.css:20; miniapp/styles/app.css:202; miniapp/styles/app.css:5
#050505 · miniapp/styles/app.css:7; miniapp/styles/app.css:8

### #E6EFDC ↔ #E6EBE0 — ΔE76 = 4.45

#E6EFDC · guest/styles/wallpaper.css:36
#E6EBE0 · shared/styles/tokens.css:37

### #E2E5E8 ↔ #D9D9D9 — ΔE76 = 4.5

#E2E5E8 · api/domain/guestPhotoStyle.ts:10; miniapp/styles/photo-editor.css:4; miniapp/styles/photo-editor.css:13
#D9D9D9 · miniapp/styles/app.css:1183; miniapp/styles/app.css:1194

### #F3ECE1 ↔ #E6EBE0 — ΔE76 = 4.51

#F3ECE1 · miniapp/styles/app.css:9; shared/styles/theme-dark.css:15
#E6EBE0 · shared/styles/tokens.css:37

### #2A231C ↔ #201A14 — ΔE76 = 4.57

#2A231C · shared/styles/theme-dark.css:31
#201A14 · shared/styles/theme-dark.css:34

## 05 / Близкие оттенки · 4/4

Все пары непрозрачных исходных значений с ΔE76 < 5, CIELAB D65. Меньше число — ближе. Прозрачные значения исключены: их вид зависит от фона. Пары включают старые определения тем.

### #E8F4D8 ↔ #F4F4DA — ΔE76 = 4.58

#E8F4D8 · guest/index.html:8; guest/styles/wallpaper.css:24
#F4F4DA · guest/styles/selected-place.css:167

### #E8F4D8 ↔ #F2F2D9 — ΔE76 = 4.63

#E8F4D8 · guest/index.html:8; guest/styles/wallpaper.css:24
#F2F2D9 · miniapp/assets/places-feed/close-halo.svg:17; miniapp/styles/app.css:975

### #221C17 ↔ #2C251E — ΔE76 = 4.64

#221C17 · shared/styles/theme-dark.css:13
#2C251E · shared/styles/theme-dark.css:14

### #F6F1E8 ↔ #FFFDF8 — ΔE76 = 4.66

#F6F1E8 · shared/styles/tokens.css:17
#FFFDF8 · miniapp/styles/app.css:837; shared/styles/base.css:100; shared/styles/tokens.css:20

### #4E4E4E ↔ #424548 — ΔE76 = 4.67

#4E4E4E · guest/components/SelectedPlaceHeading.tsx:66; guest/styles/selected-place.css:242; guest/styles/selected-place.css:276
#424548 · miniapp/styles/photo-editor.css:1

### #FDFDDE ↔ #F2F2D9 — ΔE76 = 4.71

#FDFDDE · miniapp/styles/app.css:866; miniapp/styles/app.css:882; miniapp/styles/app.css:1104
#F2F2D9 · miniapp/assets/places-feed/close-halo.svg:17; miniapp/styles/app.css:975

### #2A231C ↔ #342C22 — ΔE76 = 4.71

#2A231C · shared/styles/theme-dark.css:31
#342C22 · shared/styles/theme-dark.css:33

### #211C16 ↔ #2C251E — ΔE76 = 4.72

#211C16 · shared/styles/tokens.css:22
#2C251E · shared/styles/theme-dark.css:14

### #F6F1E8 ↔ #E6EBE0 — ΔE76 = 4.73

#F6F1E8 · shared/styles/tokens.css:17
#E6EBE0 · shared/styles/tokens.css:37

### #F2F2D9 ↔ #E6EFDC — ΔE76 = 4.73

#F2F2D9 · miniapp/assets/places-feed/close-halo.svg:17; miniapp/styles/app.css:975
#E6EFDC · guest/styles/wallpaper.css:36

### #454949 ↔ #3B3E3E — ΔE76 = 4.75

#454949 · guest/assets/selected-send.svg:3; guest/styles/selected-place.css:31; guest/styles/selected-place.css:322
#3B3E3E · miniapp/styles/app.css:1314

### #434343 ↔ #4E4E4E — ΔE76 = 4.76

#434343 · guest/assets/back-circle.svg:5
#4E4E4E · guest/components/SelectedPlaceHeading.tsx:66; guest/styles/selected-place.css:242; guest/styles/selected-place.css:276

### #EFE8DC ↔ #E2DBCD — ΔE76 = 4.76

#EFE8DC · shared/styles/tokens.css:21
#E2DBCD · shared/styles/tokens.css:196

### #E2D9CA ↔ #D6CCBB — ΔE76 = 4.77

#E2D9CA · shared/styles/tokens.css:30
#D6CCBB · shared/styles/tokens.css:198

### #424343 ↔ #4E4E4E — ΔE76 = 4.87

#424343 · guest/styles/invite.css:270; guest/styles/invite.css:310; guest/styles/invite.css:1087
#4E4E4E · guest/components/SelectedPlaceHeading.tsx:66; guest/styles/selected-place.css:242; guest/styles/selected-place.css:276

### #E8F4D8 ↔ #E6EFDC — ΔE76 = 4.89

#E8F4D8 · guest/index.html:8; guest/styles/wallpaper.css:24
#E6EFDC · guest/styles/wallpaper.css:36

### #4E4E4E ↔ #55585C — ΔE76 = 4.92

#4E4E4E · guest/components/SelectedPlaceHeading.tsx:66; guest/styles/selected-place.css:242; guest/styles/selected-place.css:276
#55585C · miniapp/styles/photo-editor.css:15; miniapp/styles/photo-editor.css:19; miniapp/styles/photo-editor.css:23

### #F6F1E8 ↔ #F3F3F3 — ΔE76 = 4.96

#F6F1E8 · shared/styles/tokens.css:17
#F3F3F3 · shared/styles/tokens.css:19

### #050505 ↔ #15120E — ΔE76 = 4.97

#050505 · miniapp/styles/app.css:7; miniapp/styles/app.css:8
#15120E · shared/styles/theme-dark.css:12

## 05b / Редкие значения · 1/5

Не более двух мест задания литерала, без собственного токена. Все остальные редкие варианты помечены также в полном списке палитры.

### #A53B8E — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
api/domain/guestPhotoStyle.ts:11 → dotColor

### #EBE2E2 / 25% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:549 .card::before → box-shadow

### #14100A / 38% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:549 .card::before → box-shadow

### #FFFFFF / 26%

Роль: Фон / заливка
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/invite.css:628 .card::after → background
guest/styles/note.css:61 .note → background

### #FFFFFF / 2% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:628 .card::after → background

### #FFFFFF / 75% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:635 .card::after → box-shadow

### #FFFFFF / 45% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:199 .place-note → box-shadow

### #FFFFFF / 55% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:366 .hero__back:hover → background

### #434343 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/assets/back-circle.svg:5 path → fill

### #787774 / 18% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:790 .place-card__identity → filter

### #F72C9E — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/components/PinkDissolve.tsx:79 → fillStyle

### #FFD7B0

Роль: Стоп градиента
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/components/SelectedPlaceHeading.tsx:59 → stopColor
miniapp/assets/home/create-envelope-title.svg:23 stop → stop-color

### #F9B1B3

Роль: Стоп градиента
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/components/SelectedPlaceHeading.tsx:60 → stopColor
miniapp/assets/home/create-envelope-title.svg:24 stop → stop-color

### #000000 / 23% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Маска текста
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/components/envelope/WheelCaption.tsx:78 → strokeStyle

### #FCED99 / 23% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Стоп градиента
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/components/envelope/WheelCaption.tsx:107 → stop-color

### #FFD7B0 / 23% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Стоп градиента
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/components/envelope/WheelCaption.tsx:108 → stop-color

### #F9B1B3 / 23% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Стоп градиента
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/components/envelope/WheelCaption.tsx:109 → stop-color

### #68858A / 14% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/envelope.css:204 .envelope:not([data-state='sealed']) .envelope__flap → filter

### #3F2E1A / 35% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/envelope.css:265 .envelope__seal → filter

### #E6549A / 41% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invitation-intro.css:39 .invitation-intro__card → border

### #EE96C4

Роль: Фон / заливка
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/invitation-intro.css:41 .invitation-intro__card → background
guest/styles/invitation-intro.css:88 .invitation-intro__surface → background

### #4E4E4E / 65% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invitation-intro.css:72 .invitation-intro__hint → color

## 05b / Редкие значения · 2/5

Не более двух мест задания литерала, без собственного токена. Все остальные редкие варианты помечены также в полном списке палитры.

### #3F2E1A / 25% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:213 .hero__seal → filter

### #FFFFFF / 35%

Роль: Фон / заливка · Тень / свечение
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/invite.css:345 .hero__back → background
guest/styles/note.css:300 .go → box-shadow

### #000000 / 38% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:814 .photo__scrim → background

### #FFFFFF / 0% — 1 МЕСТО ПРИМЕНЕНИЯ · ПРОЗРАЧНЫЙ СТОП / МАСКА

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:814 .photo__scrim → background

### #3D3D3B / 28% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:814 .photo__scrim → background

### #000000 / 42% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:814 .photo__scrim → background

### #000000 / 22% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:814 .photo__scrim → background

### #000000 / 19% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:833 .photo__scrim → box-shadow

### #FFFDF8 / 50% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/invite.css:851 .photo__dot → background

### #FFFDF8 / 92%

Роль: Текст
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/invite.css:881 .photo__glyph → color
miniapp/styles/app.css:231 .thumb--empty → color

### #000000 / 20%

Роль: Тень / свечение · Фон / заливка
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/invite.css:882 .photo__glyph → text-shadow
miniapp/styles/app.css:1075 .home__library-front::after → background

### #000000 / 12%

Роль: Тень / свечение
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/invite.css:1047 .dev-reset → box-shadow
miniapp/styles/app.css:1304 .library .filters > .field, .filter-menu__trigger, .library__add → box-shadow

### #FFF9D6 / 45% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:61 .note → background

### #FFFFFF / 61% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:61 .note → background

### #FFFFFF / 19% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:61 .note → background

### #786C56 / 7% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:61 .note → background

### #FFFFFF / 39% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:61 .note → background

### #FFFFFF / 28% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:87 .note → box-shadow

### #FFFFFF / 24%

Роль: Фон / заливка
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/note.css:196 .place-note → background
guest/styles/note.css:361 .note:focus-within → background

### #FFF9D6 / 55%

Роль: Фон / заливка
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/note.css:297 .go → background
guest/styles/note.css:361 .note:focus-within → background

### #3F2E1A / 8% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:300 .go → box-shadow

### #3E4634 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:308 .go → color

## 05b / Редкие значения · 3/5

Не более двух мест задания литерала, без собственного токена. Все остальные редкие варианты помечены также в полном списке палитры.

### #FFF9D6 / 68% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:346 .go:hover → background

### #FFFFFF / 72% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:361 .note:focus-within → background

### #786C56 / 9% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:361 .note:focus-within → background

### #FFFFFF / 32% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:361 .note:focus-within → background

### #FFFFFF / 48% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:361 .note:focus-within → background

### #B3261E — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/note.css:535 .note__error → color

### #EFFFE0 / 95% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/pile.css:326 .pile__fog → background

### #D9F0E4 / 55% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/pile.css:326 .pile__fog → background

### #D9F0E4 / 0% — 1 МЕСТО ПРИМЕНЕНИЯ · ПРОЗРАЧНЫЙ СТОП / МАСКА

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/pile.css:326 .pile__fog → background

### #000000 / 65% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/pile.css:487 .pile__invitation img → filter

### #FFF5C0 / 24% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:65 .selected-place__photo → border

### #EEEDED / 25% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:79 .selected-place__photo::after → box-shadow

### #2F282D / 36% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:79 .selected-place__photo::after → box-shadow

### #DBD8C7 / 45% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:107 .selected-place__caption → box-shadow

### #F4F4DA — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:167 .page[data-picking] .note → background

### #E8E8CA / 24%

Роль: Тень / свечение
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/selected-place.css:170 .page[data-picking] .note → box-shadow
guest/styles/selected-place.css:197 .page[data-picking] .note:focus-within → box-shadow

### #E8E8CA / 10%

Роль: Тень / свечение
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
guest/styles/selected-place.css:170 .page[data-picking] .note → box-shadow
guest/styles/selected-place.css:197 .page[data-picking] .note:focus-within → box-shadow

### #605242 / 13% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:232 .note-pressed-demo → border

### #FFFCEB / 92% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:234 .note-pressed-demo → background

### #4A3828 / 13% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:235 .note-pressed-demo → box-shadow

### #E8DDCA — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:248 .note-pressed-demo button[aria-pressed='true'] → background

### #6E5A43 / 18% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/selected-place.css:249 .note-pressed-demo button[aria-pressed='true'] → box-shadow

## 05b / Редкие значения · 4/5

Не более двух мест задания литерала, без собственного токена. Все остальные редкие варианты помечены также в полном списке палитры.

### #3F2E1A / 50% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
guest/styles/wheel.css:453 .wheel__card::before → background

### #DAD1A1 / 50% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/assets/home/create-envelope-title.svg:17 SVG filter → shadow-color

### #F5F5E0 / 51% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/assets/places-feed/close-halo.svg:3 circle → fill

### #F2F2D9

Роль: Тень / свечение
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
miniapp/assets/places-feed/close-halo.svg:17 SVG filter → shadow-color
miniapp/styles/app.css:975 .home__library → box-shadow

### #000000 / 28% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:553 .scrim → background

### #FCED99 / 55% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:748 .place-card__photo::before → background

### #B0DBC9 / 15% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:748 .place-card__photo::before → background

### #BB9AD5 / 45% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:748 .place-card__photo::before → background

### #FCED99 / 19% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:755 .place-card__photo::after → background

### #95C0B7 / 16% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:755 .place-card__photo::after → background

### #9B77C0 / 20% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:755 .place-card__photo::after → background

### #FFFFFF / 10% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:821 .place-category → background

### #FFFFFF / 6% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:822 .place-category → border

### #000000 / 30% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Декор / токен
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:841 .place-card__pick svg → filter

### #000000 / 6% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:842 .place-card__pick:hover:not(:disabled) → background

### #FFF5C0 / 12% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:928 .home__create-image::after → border

### #B5B19B / 15% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:954 .home__create:hover .home__create-image, .home__create:focus-visible .home__create-image → box-shadow

### #B5B19B / 40% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:954 .home__create:hover .home__create-image, .home__create:focus-visible .home__create-image → box-shadow

### #FFF5C0 / 38%

Роль: Обводка · Фон / заливка
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
miniapp/styles/app.css:1029 .home__library-back, .home__library-front → border
miniapp/styles/app.css:1168 .places-feed__grid → background

### #535147 / 10% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1066 .home__library-front → box-shadow

### #EEEED8 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1151 .places-feed__window → box-shadow

### #D9D9D9

Роль: Фон / заливка
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
miniapp/styles/app.css:1183 .places-feed__place → background
miniapp/styles/app.css:1194 .places-feed__place .thumb, .places-feed__placeholder → background

## 05b / Редкие значения · 5/5

Не более двух мест задания литерала, без собственного токена. Все остальные редкие варианты помечены также в полном списке палитры.

### #E1DFCF / 48% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1247 .places-feed__action, .places-feed__library-action → text-shadow

### #171818 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1301 .library .filters > .field, .filter-menu__trigger, .library__add → background

### #262828 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1302 .library .filters > .field, .filter-menu__trigger, .library__add → border

### #C5C8CF — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1305 .library .filters > .field, .filter-menu__trigger, .library__add → color

### #777A80 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1313 .library .filters > .field::placeholder → color

### #3B3E3E — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1314 .filter-menu__trigger:hover, .library__add:hover → border-color

### #000000 / 24% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1425 .compose-deck__card → box-shadow

### #FCED99 / 6% — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Тень / свечение
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/app.css:1425 .compose-deck__card → box-shadow

### #F4F5F5 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Фон / заливка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/photo-editor.css:1 .photo-editor → background

### #424548 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/photo-editor.css:1 .photo-editor → color

### #64696D — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/photo-editor.css:6 .photo-editor__preview p → color

### #686C70

Роль: Текст
Литералов / объявлений: 2 · мест применения с учётом var(): 2
Именованный токен: нет
miniapp/styles/photo-editor.css:7 .photo-editor__caption → color
miniapp/styles/photo-editor.css:30 .library__photo-style → color

### #74797D — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/photo-editor.css:18 .photo-editor__slider output → color

### #CDD1D4 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Обводка
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/photo-editor.css:21 .photo-editor input[type="color"] → border

### #496455 — 1 МЕСТО ПРИМЕНЕНИЯ

Роль: Текст
Литералов / объявлений: 1 · мест применения с учётом var(): 1
Именованный токен: нет
miniapp/styles/photo-editor.css:26 .photo-editor__notice → color

## 06 / Дополнительные значения · 1/4

Только в прототипах или ресурсах вне основного графа импортов. Эти цвета не входят в 211 значений подключённой палитры.

### #14100A / 62%

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/drum/index.html:280 .card__grad → background

### #14100A / 0% — ПРОЗРАЧНЫЙ СТОП / МАСКА

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/drum/index.html:280 .card__grad → background
guest/prototypes/note/index.html:176 .card__scrim → background

### #FFFDF8 / 80%

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/drum/index.html:406 .hud span → background
guest/prototypes/drum/index.html:436 .hint → background

### #3F2E1A / 12%

Роль: Тень / свечение
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/drum/index.html:564 .panel → box-shadow

### rgba(63, 46, 26, ${a(g('sunk'))})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1108 → literal

### rgba(255, 255, 255, ${a(g('hl1'))})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1109 → literal

### rgba(255, 255, 255, ${a(g('hl2'))})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1110 → literal

### rgba(63, 46, 26, ${sh1})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1111 → literal

### rgba(63, 46, 26, ${sh2})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1112 → literal

### rgba(120, 108, 86, ${e(.16)})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1121 → literal

### rgba(120, 108, 86, ${e(.05)})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1122 → literal

### rgba(255, 255, 255, ${e(.34)})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1123 → literal

### rgba(255, 255, 255, ${e(.8)})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1125 → literal

### rgba(255, 255, 255, ${e(.6)})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1127 → literal

### rgba(255, 255, 255, ${e(.15)})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1128 → literal

### rgba(120, 108, 86, ${e(.06)})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1129 → literal

### rgba(255, 255, 255, ${e(.3)})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1130 → literal
guest/prototypes/note/index.html:1134 → literal

### rgba(255, 255, 255, ${e(.72)})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1131 → literal

### rgba(255, 255, 255, ${e(.22)})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1132 → literal

### rgba(120, 108, 86, ${e(.08)})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1133 → literal

## 06 / Дополнительные значения · 2/4

Только в прототипах или ресурсах вне основного графа импортов. Эти цвета не входят в 211 значений подключённой палитры.

### rgba(255, 255, 255, ${e(.46)})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1135 → literal

### rgba(${fillrgb}, ${a(g('fill'))})

Роль: Декор / токен
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1148 → literal

### #6F6558 / 28%

Роль: Декор / токен · Обводка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:1180 → literal
guest/prototypes/note/index.html:420 .note.v-c .note__input → border-bottom

### #ECEFF1

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:71 body → background

### #141E0F / 10%

Роль: Тень / свечение
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:105 .scene → box-shadow

### #141E0F / 16%

Роль: Тень / свечение
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:105 .scene → box-shadow

### #14100A / 35%

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:176 .card__scrim → background

### #8D9B7E

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:182 .card--nophoto → background

### #5D6B56

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:182 .card--nophoto → background

### #3F4A3C

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:182 .card--nophoto → background

### rgba(255, 255, 255, var(--n-fill))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:269 .note → background
guest/prototypes/note/index.html:404 .note.v-b → background
guest/prototypes/note/index.html:426 .note.v-d → background

### rgba(255, 255, 255, calc(0.72 * var(--n-edge)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:269 .note → background

### rgba(255, 255, 255, calc(0.22 * var(--n-edge)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:269 .note → background

### rgba(120, 108, 86, calc(0.08 * var(--n-edge)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:269 .note → background

### rgba(255, 255, 255, calc(0.3 * var(--n-edge)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:269 .note → background
guest/prototypes/note/index.html:443 .note.v-f → background

### rgba(255, 255, 255, calc(0.46 * var(--n-edge)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:269 .note → background

### rgba(63, 46, 26, var(--n-sunk))

Роль: Тень / свечение
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:287 .note → box-shadow

### rgba(255, 255, 255, var(--n-hl1))

Роль: Тень / свечение
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:287 .note → box-shadow

### rgba(255, 255, 255, var(--n-hl2))

Роль: Тень / свечение
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:287 .note → box-shadow

### rgba(63, 46, 26, var(--n-sh1a))

Роль: Тень / свечение
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:287 .note → box-shadow

## 06 / Дополнительные значения · 3/4

Только в прототипах или ресурсах вне основного графа импортов. Эти цвета не входят в 211 значений подключённой палитры.

### rgba(63, 46, 26, var(--n-sh2a))

Роль: Тень / свечение
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:287 .note → box-shadow

### rgba(255, 255, 255, calc(var(--n-fill) + var(--n-focus-step, 0.15)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:305 .note.is-focus, .note:focus-within → background

### rgba(255, 255, 255, calc(0.85 * var(--n-edge)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:305 .note.is-focus, .note:focus-within → background

### rgba(255, 255, 255, calc(0.28 * var(--n-edge)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:305 .note.is-focus, .note:focus-within → background

### rgba(120, 108, 86, calc(0.1 * var(--n-edge)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:305 .note.is-focus, .note:focus-within → background

### rgba(255, 255, 255, calc(0.38 * var(--n-edge)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:305 .note.is-focus, .note:focus-within → background

### rgba(255, 255, 255, calc(0.56 * var(--n-edge)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:305 .note.is-focus, .note:focus-within → background

### rgba(255, 255, 255, calc(0.8 * var(--n-edge)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:404 .note.v-b → background

### rgba(120, 108, 86, calc(0.16 * var(--n-edge)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:426 .note.v-d → background

### rgba(120, 108, 86, calc(0.05 * var(--n-edge)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:426 .note.v-d → background

### rgba(255, 255, 255, calc(0.34 * var(--n-edge)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:426 .note.v-d → background

### rgba(206, 226, 184, var(--n-fill))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:443 .note.v-f → background

### rgba(255, 255, 255, calc(0.6 * var(--n-edge)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:443 .note.v-f → background

### rgba(255, 255, 255, calc(0.15 * var(--n-edge)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:443 .note.v-f → background

### rgba(120, 108, 86, calc(0.06 * var(--n-edge)))

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:443 .note.v-f → background

### #141E0F / 6%

Роль: Тень / свечение
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:512 .panel → box-shadow

### #141E0F / 8%

Роль: Тень / свечение
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:512 .panel → box-shadow

### #E6E3DD

Роль: Обводка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:556 .variant → border
guest/prototypes/note/index.html:625 .seg button → border

### #FAF9F7

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:565 .variant:hover → background

### #F1F5EC

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:569 .variant[aria-pressed='true'] → background
guest/prototypes/note/index.html:635 .seg button[aria-pressed='true'] → background

## 06 / Дополнительные значения · 4/4

Только в прототипах или ресурсах вне основного графа импортов. Эти цвета не входят в 211 значений подключённой палитры.

### #1F2420

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:642 .css → background

### #DFE7D8

Роль: Текст
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/note/index.html:643 .css → color

### #FFEB8D

Роль: Фон / заливка · Обводка
Мест задания в приложении: 0
Именованный токен: нет
guest/assets/Stamp.svg:2 path → fill
guest/assets/Stamp.svg:3 path → fill
guest/assets/Stamp.svg:4 path → fill
guest/assets/Stamp.svg:5 line → stroke
guest/assets/Stamp.svg:6 line → stroke
Ещё 7 записей — полный индекс в inventory.json

### #4F5549 / 14%

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
guest/assets/lets-go.svg:7 path → fill

### #D4CBA0 / 45.1%

Роль: Тень / свечение
Мест задания в приложении: 0
Именованный токен: нет
miniapp/feed-preview.html:12 .feed-preview__selection → box-shadow

### #DBD9CC / 30%

Роль: Фон / заливка
Мест задания в приложении: 0
Именованный токен: нет
miniapp/assets/category.svg:3 circle → fill
miniapp/assets/category.svg:4 circle → fill
miniapp/assets/category.svg:5 circle → fill
miniapp/assets/category.svg:6 circle → fill

### #3F2E1A / 16%

Роль: Тень / свечение
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/drum/index.html:65 :root → --sh-card-soft

### #3F2E1A / 22%

Роль: Тень / свечение
Мест задания в приложении: 0
Именованный токен: нет
guest/prototypes/drum/index.html:65 :root → --sh-card-soft

## 06b / Переменные прототипов · 1/2

Все цветовые объявления вне основного графа. Сгенерированные сборки исключены.

### --c-paper

#f6f1e8
guest/prototypes/drum/index.html:21 · :root
Роль: Фон / заливка

### --c-surface

#fffdf8
guest/prototypes/drum/index.html:22 · :root
Роль: Фон / заливка · Обводка

### --c-surface-sunk

#efe8dc
guest/prototypes/drum/index.html:23 · :root
Роль: Фон / заливка · Обводка

### --c-ink

#211c16
guest/prototypes/drum/index.html:24 · :root
Роль: Текст · Фон / заливка · Обводка

### --c-ink-soft

#6f6558
guest/prototypes/drum/index.html:25 · :root
Роль: Текст

### --c-ink-faint

#a1968a
guest/prototypes/drum/index.html:26 · :root
Роль: Текст · Фон / заливка

### --c-hairline

#e2d9ca
guest/prototypes/drum/index.html:27 · :root
Роль: Обводка · Фон / заливка

### --c-seal

#c4452a
guest/prototypes/drum/index.html:28 · :root
Роль: Фон / заливка · Обводка · Текст · Декор / токен

### --c-sage

#5f6f52
guest/prototypes/drum/index.html:29 · :root
Роль: Текст

### --c-frame-ink

#fff5c0
guest/prototypes/drum/index.html:30 · :root
Роль: Текст · Фон / заливка

### --sh-card

0 1px 2px rgba(63, 46, 26, 0.06), 0 8px 24px rgba(63, 46, 26, 0.07)
guest/prototypes/drum/index.html:40 · :root
Роль: Тень / свечение

### --sh-lift

0 8px 20px rgba(63, 46, 26, 0.18), 0 40px 80px rgba(63, 46, 26, 0.28)
guest/prototypes/drum/index.html:43 · :root
Роль: Тень / свечение

### --sh-chosen

0 5.5px 11px 5.5px rgba(58, 96, 90, 0.2), 0 1px 2px rgba(63, 46, 26, 0.06), 0 8px 24px rgba(63, 46, 26, 0.07), 0 16px 40px rgba(63, 46, 26, 0.1)
guest/prototypes/drum/index.html:44 · :root
Роль: Тень / свечение

### --c-card-shade

rgba(74, 96, 104, 0.62)
guest/prototypes/drum/index.html:46 · :root
Роль: Фон / заливка

### --c-card-edge

rgba(63, 46, 26, 0.24)
guest/prototypes/drum/index.html:50 · :root
Роль: Тень / свечение

### --sh-card-soft

0 6px 16px rgba(63, 46, 26, 0.16), 0 30px 60px rgba(63, 46, 26, 0.22)
guest/prototypes/drum/index.html:65 · :root
Роль: Тень / свечение

### --c-ink

#211c16
guest/prototypes/note/index.html:36 · :root
Роль: Текст · Фон / заливка · Обводка

### --c-ink-soft

#6f6558
guest/prototypes/note/index.html:37 · :root
Роль: Текст

## 06b / Переменные прототипов · 2/2

Все цветовые объявления вне основного графа. Сгенерированные сборки исключены.

### --c-ink-faint

#a1968a
guest/prototypes/note/index.html:38 · :root
Роль: Текст · Фон / заливка

### --c-answer

#424343
guest/prototypes/note/index.html:39 · :root
Роль: Текст · Фон / заливка

### --c-frame-ink

#fff5c0
guest/prototypes/note/index.html:40 · :root
Роль: Текст · Фон / заливка

### --c-wallpaper

#e8f4d8
guest/prototypes/note/index.html:41 · :root
Роль: Фон / заливка

### --c-surface-sunk

#e6efdc
guest/prototypes/note/index.html:42 · :root
Роль: Фон / заливка · Обводка

### --sh-card

0 4px 12px rgba(63, 46, 26, 0.13), 0 26px 54px rgba(63, 46, 26, 0.2)
guest/prototypes/note/index.html:52 · :root
Роль: Тень / свечение

## 06c / Градиенты прототипов

Формулы приведены для полноты; они не означают наличие этих состояний в действующем приложении.

### CSS · .card__grad — Фон / заливка


linear-gradient(15deg, rgba(20, 16, 10, 0.62) 0%, rgba(20, 16, 10, 0) 52%)
guest/prototypes/drum/index.html:280 → background

### CSS · .card__glass — Фон / заливка


linear-gradient(var(--glass-angle), rgba(255,255,255,0.26), rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.2))
guest/prototypes/drum/index.html:322 → background

### CSS · .card__glass — Маска


linear-gradient(#000 0 0)
guest/prototypes/drum/index.html:324 → -webkit-mask
guest/prototypes/drum/index.html:325 → mask

### CSS · .card__scrim — Фон / заливка


linear-gradient(180deg, rgba(20, 16, 10, 0) 45%, rgba(20, 16, 10, 0.35) 100%)
guest/prototypes/note/index.html:176 → background

### CSS · .card--nophoto — Фон / заливка


linear-gradient(140deg, #8d9b7e, #5d6b56 60%, #3f4a3c)
guest/prototypes/note/index.html:182 → background

### CSS · .note — Фон / заливка


linear-gradient( 180deg, rgba(255, 255, 255, calc(0.72 * var(--n-edge))) 0%, rgba(255, 255, 255, calc(0.22 * var(--n-edge))) 26%, rgba(120, 108, 86, calc(0.08 * var(--n-edge))) 55%, rgba(255, 255, 255, calc(0.3 * var(--n-edge))) 88%, rgba(255, 255, 255, calc(0.46 * var(--n-edge))) 100% )
guest/prototypes/note/index.html:269 → background

### CSS · .note.is-focus,
.note:focus-within — Фон / заливка


linear-gradient( 180deg, rgba(255, 255, 255, calc(0.85 * var(--n-edge))) 0%, rgba(255, 255, 255, calc(0.28 * var(--n-edge))) 26%, rgba(120, 108, 86, calc(0.1 * var(--n-edge))) 55%, rgba(255, 255, 255, calc(0.38 * var(--n-edge))) 88%, rgba(255, 255, 255, calc(0.56 * var(--n-edge))) 100% )
guest/prototypes/note/index.html:305 → background

### CSS · .note.v-b — Фон / заливка


linear-gradient( 180deg, rgba(255, 255, 255, calc(0.8 * var(--n-edge))), rgba(255, 255, 255, calc(0.8 * var(--n-edge))) )
guest/prototypes/note/index.html:404 → background

### CSS · .note.v-d — Фон / заливка


linear-gradient( 180deg, rgba(120, 108, 86, calc(0.16 * var(--n-edge))) 0%, rgba(120, 108, 86, calc(0.05 * var(--n-edge))) 40%, rgba(255, 255, 255, calc(0.34 * var(--n-edge))) 100% )
guest/prototypes/note/index.html:426 → background

### CSS · .note.v-f — Фон / заливка


linear-gradient( 180deg, rgba(255, 255, 255, calc(0.6 * var(--n-edge))) 0%, rgba(255, 255, 255, calc(0.15 * var(--n-edge))) 30%, rgba(120, 108, 86, calc(0.06 * var(--n-edge))) 60%, rgba(255, 255, 255, calc(0.3 * var(--n-edge))) 100% )
guest/prototypes/note/index.html:443 → background
