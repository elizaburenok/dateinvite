/**
 * Колода карточек — ключевая механика.
 *
 * Общее для всех вариантов: листание свайпом/перетаскиванием (Pointer Events,
 * одинаково мышью и пальцем).
 *   - вариант 'tucked'  — карточки в кармане, торчат верхушки; hover/тап вытягивает,
 *                         drag вверх — вытянуть полностью;
 *   - вариант 'center'  — карточки лежат раскрытыми по центру.
 *
 * Первая карточка колоды — приглашение (текст), дальше карточки-места.
 */

import { motifSvg } from './motifs.js';
import { copy } from './config.js';

const SWIPE_DISTANCE = 64; // px — порог переключения карточки
const PULL_DISTANCE = 44; // px — порог «вытянуть вверх»
const AXIS_LOCK = 8; // px — после этого смещения фиксируем ось
const FLY_MS = 380;

export function createDeck({ items, mode, onChoose }) {
  const el = document.createElement('div');
  el.className = 'deck';

  const total = items.length;
  let activeIndex = 0;
  let animating = false;
  let hoverPull = false; // вытянуто курсором (desktop)
  let lockedPull = false; // вытянуто тапом/клавиатурой
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const cards = items.map((item, index) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.index = String(index);
    card.tabIndex = -1;
    card.innerHTML = cardMarkup(item);
    el.appendChild(card);

    const chooseBtn = card.querySelector('.card__choose');
    if (chooseBtn) {
      chooseBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        onChoose(item);
      });
    }

    return card;
  });

  // Индикатор позиции
  const dots = document.createElement('div');
  dots.className = 'dots';
  dots.setAttribute('role', 'presentation');
  items.forEach(() => {
    const dot = document.createElement('span');
    dot.className = 'dot';
    dots.appendChild(dot);
  });

  /** Разложить стопку: каждой карточке — её позиция относительно активной. */
  function layout() {
    // Флаг на колоде: когда активную вытянули, остальные уходят глубже,
    // иначе их текст просвечивает из-под поднятой карточки.
    el.dataset.pulled = hoverPull || lockedPull ? 'true' : 'false';

    cards.forEach((card, index) => {
      const pos = (index - activeIndex + total) % total;
      card.dataset.pos = String(pos);
      card.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');

      const isPulled = pos === 0 && (hoverPull || lockedPull);
      if (mode === 'tucked') {
        card.dataset.pulled = isPulled ? 'true' : 'false';
      }

      // Управление доступно только на активной (и вытянутой в tucked) карточке
      const btn = card.querySelector('.card__choose');
      if (btn) {
        const reachable = pos === 0 && (mode !== 'tucked' || isPulled);
        btn.tabIndex = reachable ? 0 : -1;
      }
    });

    [...dots.children].forEach((dot, index) => {
      dot.dataset.active = index === activeIndex ? 'true' : 'false';
    });
  }

  function activeCard() {
    return cards[activeIndex];
  }

  /** Переключить карточку: dir = 1 вперёд, -1 назад. */
  function advance(dir) {
    if (animating || total < 2) return;
    const card = activeCard();
    animating = true;

    // Карточка улетает в сторону…
    card.dataset.flying = 'true';
    card.style.transform = `translate3d(${dir > 0 ? -130 : 130}%, -8%, 0) rotate(${
      dir > 0 ? -16 : 16
    }deg)`;

    window.setTimeout(() => {
      // …и бесшумно возвращается в конец стопки
      activeIndex = (activeIndex + dir + total) % total;
      // hoverPull не сбрасываем: курсор всё ещё над колодой и pointerenter
      // повторно не выстрелит — иначе новая карточка «упала» бы в карман.
      lockedPull = false;

      card.style.transition = 'none';
      card.style.transform = '';
      delete card.dataset.flying;
      layout();

      // Снимаем блокировку сразу: requestAnimationFrame не выполняется в
      // скрытой вкладке, и колода залипала бы навсегда после свайпа.
      animating = false;
      window.setTimeout(() => {
        card.style.transition = '';
      }, 30);
    }, FLY_MS);
  }

  function setPulled(value) {
    lockedPull = value;
    layout();
  }

  // --- Перетаскивание (Pointer Events: мышь и палец одинаково) -------------

  let drag = null;

  function onPointerDown(event) {
    if (animating) return;
    const card = event.target.closest('.card');
    if (!card || card !== activeCard()) return;
    // Кнопку не перехватываем — пусть отрабатывает клик
    if (event.target.closest('.card__choose')) return;

    drag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      axis: null,
      card,
      moved: false,
    };

    try {
      card.setPointerCapture(event.pointerId);
    } catch {
      // указатель мог уже быть отпущен — перетаскивание всё равно отработает
    }
    card.dataset.dragging = 'true';
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.id) return;

    drag.dx = event.clientX - drag.startX;
    drag.dy = event.clientY - drag.startY;

    if (!drag.axis) {
      const absX = Math.abs(drag.dx);
      const absY = Math.abs(drag.dy);
      if (Math.max(absX, absY) < AXIS_LOCK) return;
      drag.axis = absX > absY ? 'x' : 'y';
      drag.moved = true;
    }

    if (drag.axis === 'x') {
      const rotate = drag.dx / 22;
      drag.card.style.transform = `translate3d(${drag.dx}px, ${
        -Math.abs(drag.dx) * 0.06
      }px, 0) rotate(${rotate}deg)`;
    } else if (mode === 'tucked') {
      // Тянем вверх — карточка выезжает из кармана
      const up = Math.min(0, drag.dy);
      drag.card.style.transform = `translate3d(0, calc(var(--lift) + ${up}px), 0)`;
    }
  }

  function onPointerUp(event) {
    if (!drag || event.pointerId !== drag.id) return;

    const { dx, dy, axis, card, moved } = drag;
    card.dataset.dragging = 'false';
    delete card.dataset.dragging;
    card.style.transform = '';
    drag = null;

    if (axis === 'x' && Math.abs(dx) >= SWIPE_DISTANCE) {
      advance(dx < 0 ? 1 : -1);
      return;
    }

    if (axis === 'y' && mode === 'tucked' && dy <= -PULL_DISTANCE) {
      setPulled(true);
      return;
    }

    // Тап без перетаскивания — вытянуть/задвинуть (важно для тач-устройств)
    if (!moved && mode === 'tucked') {
      setPulled(!lockedPull);
    }
  }

  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);

  // --- Hover-выдвижение (только там, где есть настоящий курсор) -----------
  //
  // Считаем hover по координатам курсора, а не через pointerenter на колоде:
  // до открытия конверта у колоды pointer-events: none, поэтому enter уже не
  // выстрелит, если курсор к этому моменту стоит на месте.

  let lastPointer = null;

  function syncHover() {
    if (!canHover || mode !== 'tucked' || !lastPointer) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return;

    const inside =
      lastPointer.x >= rect.left &&
      lastPointer.x <= rect.right &&
      lastPointer.y >= rect.top &&
      lastPointer.y <= rect.bottom;

    if (inside !== hoverPull) {
      hoverPull = inside;
      layout();
    }
  }

  if (canHover && mode === 'tucked') {
    window.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      lastPointer = { x: event.clientX, y: event.clientY };
      syncHover();
    });
  }

  // --- Клавиатура ---------------------------------------------------------

  function onKeyDown(event) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      advance(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      advance(1);
    } else if (event.key === 'ArrowUp' && mode === 'tucked') {
      event.preventDefault();
      setPulled(true);
    } else if (event.key === 'ArrowDown' && mode === 'tucked') {
      event.preventDefault();
      setPulled(false);
    }
  }

  layout();

  return {
    el,
    dots,
    layout,
    advance,
    onKeyDown,
    /** Перепроверить hover — например, сразу после открытия конверта. */
    refreshHover: syncHover,
    get activeItem() {
      return items[activeIndex];
    },
    /** Убрать обработчики (на будущее, если понадобится пересборка сцены). */
    destroy() {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    },
  };
}

function cardMarkup(item) {
  if (item.kind === 'invitation') {
    return `
      <span class="card__eyebrow">${escapeHtml(item.eyebrow)}</span>
      <div class="card__body">
        <h2 class="card__title">${escapeHtml(item.title)}</h2>
        ${item.lines
          .map((line) => `<p class="card__note">${escapeHtml(line)}</p>`)
          .join('')}
      </div>
      <div class="card__foot">
        <span class="card__hint">${escapeHtml(item.hint)}</span>
      </div>
      <span class="card__scallop"></span>
    `;
  }

  return `
    <span class="card__eyebrow">${escapeHtml(item.tag)}</span>
    <div class="card__body">
      ${motifSvg(item.motif)}
      <h2 class="card__title">${escapeHtml(item.name)}</h2>
      <p class="card__note">${escapeHtml(item.note)}</p>
    </div>
    <div class="card__foot">
      <button class="card__choose" type="button">${escapeHtml(copy.choose)}</button>
    </div>
    <span class="card__scallop"></span>
  `;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
