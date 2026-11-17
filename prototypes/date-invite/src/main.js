import './styles.css';

import {
  VARIANTS,
  defaults,
  inviteId,
  invitation,
  places,
  copy,
} from './config.js';
import { STATES, createMachine } from './state.js';
import { renderEnvelope } from './envelope.js';
import { createDeck } from './deck.js';
import { readAnswer, saveAnswer, sendAnswer } from './notify.js';
import { parseDraft, draftId } from './draft.js';

const scene = document.getElementById('scene');
const params = new URLSearchParams(location.search);
const draft = parseDraft(params.get('draft'));

/** Вариант из URL, если он валиден, иначе — дефолт. */
function variant(key) {
  const value = params.get(key);
  return VARIANTS[key].includes(value) ? value : defaults[key];
}

const skin = draft?.skin ?? variant('skin');
const openMode = draft?.open ?? variant('open');
const cardsMode = draft?.cards ?? variant('cards');
const toName = draft?.to ?? params.get('to')?.trim() ?? '';
const fromName = draft?.from ?? params.get('from')?.trim() ?? '';
const currentId = draft ? draftId(draft) : inviteId;

scene.dataset.skin = skin;
scene.dataset.open = openMode;
scene.dataset.cards = cardsMode;

const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const items = draft ? [draft.invitation, ...draft.places] : [invitation, ...places.slice(0, 5)];

// --- Сборка сцены ---------------------------------------------------------

const stage = document.createElement('div');
stage.className = 'stage';

const envelope = renderEnvelope({ skin, toName });
const machine = createMachine(scene, STATES.SEALED);

const deck = createDeck({
  items,
  mode: cardsMode,
  onChoose: (item) => askConfirm(item),
});

// Порядок важен: задник → карточки → карман → клапаны → печать
stage.append(
  envelope.back,
  deck.el,
  envelope.front,
  envelope.flaps,
  envelope.sealLayer,
  deck.dots
);

const final = document.createElement('div');
final.className = 'final';
final.innerHTML = `
  <h2 class="final__title">${escapeHtml(copy.doneTitle)}</h2>
  <p class="final__note"></p>
`;
stage.appendChild(final);

const caption = document.createElement('div');
caption.className = 'caption';
caption.innerHTML = `
  <span class="caption__hint"></span>
  <span class="caption__error" hidden></span>
`;

const confirm = document.createElement('div');
confirm.className = 'confirm';
confirm.innerHTML = `
  <div class="confirm__box" role="dialog" aria-modal="true" aria-label="${escapeHtml(
    copy.confirmTitle
  )}">
    <p class="confirm__title">${escapeHtml(copy.confirmTitle)}</p>
    <p class="confirm__place"></p>
    <div class="confirm__actions">
      <button class="card__choose" type="button" data-act="yes">${escapeHtml(
        copy.confirmYes
      )}</button>
      <button class="btn-ghost" type="button" data-act="no">${escapeHtml(
        copy.confirmNo
      )}</button>
    </div>
  </div>
`;

scene.append(stage, caption, confirm, buildSwitcher());

const hintEl = caption.querySelector('.caption__hint');
const errorEl = caption.querySelector('.caption__error');
const finalNote = final.querySelector('.final__note');
const confirmPlace = confirm.querySelector('.confirm__place');

// --- Подписи по состояниям ------------------------------------------------

function updateCaption() {
  const map = {
    [STATES.SEALED]: copy.sealedHint,
    [STATES.OPENING]: '',
    [STATES.BROWSING]:
      cardsMode === 'tucked' && !canHover
        ? copy.pullHint
        : canHover
        ? copy.swipeHintDesktop
        : copy.swipeHintTouch,
    [STATES.CONFIRMING]: '',
    [STATES.SENDING]: copy.sending,
    [STATES.DONE]: '',
  };
  hintEl.textContent = map[machine.current] ?? '';
}

machine.onChange(updateCaption);
updateCaption();

// --- Открытие конверта ----------------------------------------------------

function openEnvelope() {
  if (!machine.can(STATES.OPENING)) return;
  machine.go(STATES.OPENING);
  window.setTimeout(() => {
    machine.go(STATES.BROWSING);
    // Курсор мог уже стоять над колодой, пока она была неинтерактивна
    deck.refreshHover();
  }, 700);
}

envelope.seal.addEventListener('click', openEnvelope);
// По закрытому конверту можно кликнуть куда угодно — не только по печати
stage.addEventListener('click', () => {
  if (machine.is(STATES.SEALED)) openEnvelope();
});

// --- Подтверждение и отправка --------------------------------------------

let pending = null;

function askConfirm(item) {
  if (!machine.can(STATES.CONFIRMING)) return;
  pending = item;
  confirmPlace.textContent = item.name;
  machine.go(STATES.CONFIRMING);
  confirm.querySelector('[data-act="yes"]').focus();
}

confirm.addEventListener('click', (event) => {
  const act = event.target.closest('[data-act]')?.dataset.act;
  if (act === 'no') {
    pending = null;
    machine.go(STATES.BROWSING);
  } else if (act === 'yes' && pending) {
    submit(pending);
  }
});

async function submit(item) {
  machine.go(STATES.SENDING);

  const answer = {
    inviteId: currentId,
    placeId: item.id,
    placeName: item.name,
    placeNote: item.note,
    to: toName,
    from: fromName,
    ts: new Date().toISOString(),
  };

  saveAnswer(answer, currentId);
  showFinal(item.name);

  const result = await sendAnswer(answer);

  // Конверт «запечатывается» независимо от сети — ответ уже сохранён.
  window.setTimeout(() => machine.go(STATES.DONE), 500);

  if (!result.ok) {
    errorEl.hidden = false;
    errorEl.textContent = copy.errorSoft;
  }
}

function showFinal(placeName) {
  finalNote.textContent = copy.doneNote(placeName);
}

// --- Восстановление ответа из localStorage --------------------------------

const saved = readAnswer(currentId);
if (saved?.placeName) {
  showFinal(saved.placeName);
  machine.go(STATES.DONE, true);
  hintEl.textContent = copy.alreadyNote;
}

// --- Клавиатура -----------------------------------------------------------

window.addEventListener('keydown', (event) => {
  if (machine.is(STATES.SEALED) && (event.key === 'Enter' || event.key === ' ')) {
    if (document.activeElement === document.body) {
      event.preventDefault();
      openEnvelope();
    }
    return;
  }

  if (machine.is(STATES.BROWSING)) deck.onKeyDown(event);

  if (machine.is(STATES.CONFIRMING) && event.key === 'Escape') {
    pending = null;
    machine.go(STATES.BROWSING);
  }
});

// --- Служебный переключатель вариантов -----------------------------------

function buildSwitcher() {
  const box = document.createElement('div');
  box.className = 'switcher';

  const rows = [
    { key: 'skin', label: 'стиль', current: skin, titles: { stitch: 'вышивка', retro: 'ретро' } },
    {
      key: 'open',
      label: 'конверт',
      current: openMode,
      titles: { pocket: 'карман', four: '4 стороны' },
    },
    {
      key: 'cards',
      label: 'карточки',
      current: cardsMode,
      titles: { tucked: 'в конверте', center: 'по центру' },
    },
  ];

  // На узких экранах панель свёрнута, чтобы не перекрывать конверт
  box.dataset.open = window.innerWidth >= 700 ? 'true' : 'false';

  box.innerHTML =
    `<button class="switcher__toggle" type="button" data-act="toggle">варианты</button>
    <div class="switcher__body">` +
    rows
      .map(
        (row) => `
    <div class="switcher__row">
      <span class="switcher__label">${row.label}</span>
      ${VARIANTS[row.key]
        .map(
          (value) =>
            `<button class="switcher__btn" type="button" data-key="${row.key}" data-value="${value}" data-on="${
              value === row.current
            }">${row.titles[value]}</button>`
        )
        .join('')}
    </div>`
      )
      .join('') +
    `<div class="switcher__row">
      <span class="switcher__label">ответ</span>
      <button class="switcher__btn" type="button" data-act="reset">сбросить</button>
    </div>
    </div>`;

  box.addEventListener('click', (event) => {
    const btn = event.target.closest('button');
    if (!btn) return;

    if (btn.dataset.act === 'toggle') {
      box.dataset.open = box.dataset.open === 'true' ? 'false' : 'true';
      return;
    }

    if (btn.dataset.act === 'reset') {
      try {
        localStorage.removeItem(`date-invite:${currentId}`);
      } catch {
        /* ignore */
      }
      location.reload();
      return;
    }

    const next = new URLSearchParams(location.search);
    next.set(btn.dataset.key, btn.dataset.value);
    location.search = next.toString();
  });

  return box;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
