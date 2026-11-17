/**
 * ★ ГЛАВНЫЙ ФАЙЛ ДЛЯ РЕДАКТИРОВАНИЯ
 *
 * Здесь: тексты приглашения, список мест и флаги вариантов механики/стиля.
 * Варианты можно переключать прямо в URL, не трогая код:
 *   ?skin=stitch|retro
 *   ?open=pocket|four        (A — карман / B — на 4 стороны)
 *   ?cards=tucked|center     (1 — тук в конверте / 2 — стопка по центру)
 *   ?to=Имя&from=Имя
 * Пример: http://localhost:5173/?skin=stitch&open=four&cards=center
 */

export const VARIANTS = {
  skin: ['stitch', 'retro'],
  open: ['pocket', 'four'],
  cards: ['tucked', 'center'],
};

/** Значения по умолчанию (если в URL ничего не передано). */
export const defaults = {
  skin: 'stitch',
  open: 'pocket',
  cards: 'tucked',
};

/** Идентификатор приглашения — по нему localStorage помнит выбор. */
export const inviteId = 'dinner-2026-08';

/** Первая карточка колоды — не место, а приглашение. */
export const invitation = {
  kind: 'invitation',
  eyebrow: 'приглашение',
  title: 'Ужин с тобой',
  lines: [
    'Хочу украсть у тебя один вечер.',
    'Выбери место — остальное я беру на себя.',
  ],
  hint: 'листай дальше →',
};

/** Места. До 5 штук. */
export const places = [
  {
    id: 'terrace',
    name: 'Терраса на крыше',
    tag: 'вид на город',
    note: 'Закат, лёгкое вино и совсем немного ветра.',
    motif: 'flower',
  },
  {
    id: 'ramen',
    name: 'Маленькая раменная',
    tag: 'тепло и шумно',
    note: 'Пар из пиалы и запотевшие окна.',
    motif: 'bowl',
  },
  {
    id: 'trattoria',
    name: 'Траттория у дома',
    tag: 'по-домашнему',
    note: 'Паста, свечка в бутылке и долгие разговоры.',
    motif: 'heart',
  },
  {
    id: 'picnic',
    name: 'Пикник в парке',
    tag: 'на воздухе',
    note: 'Плед в клетку, термос и никакой спешки.',
    motif: 'leaf',
  },
  {
    id: 'secret',
    name: 'Сюрприз',
    tag: 'доверься мне',
    note: 'Ты не знаешь куда. Я знаю, что тебе понравится.',
    motif: 'star',
  },
];

/** Тексты интерфейса. */
export const copy = {
  sealedHint: 'нажми, чтобы открыть',
  // Имя пишем без предлога — иначе пришлось бы угадывать падеж («для Лиза»)
  sealedFor: (name) => name || 'для тебя',
  swipeHintDesktop: 'тяни карточку в сторону',
  swipeHintTouch: 'свайпни карточку',
  pullHint: 'потяни вверх, чтобы рассмотреть',
  choose: 'Выбираю это место',
  confirmTitle: 'Отправляем этот ответ?',
  confirmYes: 'Да, отправить',
  confirmNo: 'Ещё подумаю',
  sending: 'запечатываем…',
  doneTitle: 'Жду встречи',
  doneNote: (place) => `Значит, ${place}.`,
  errorSoft: 'Ответ сохранён. Отправить не удалось — но я его увижу.',
  alreadyNote: 'Место уже выбрано.',
};
