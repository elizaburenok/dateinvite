import { useEffect, useState, type RefObject } from 'react';

/**
 * Прогресс раскрытия стопки: 0 — карточки сложены колодой, 1 — разложены списком.
 *
 * Дистанция раскрытия равна тому, на сколько стопка вырастает. Это не подгонка,
 * а единственное значение, при котором ничего не убегает от скролла: карточка
 * уезжает вниз ровно настолько, насколько страница уехала вверх, и все
 * карточки приближаются к читателю, а не удирают от него. Заодно высота
 * страницы остаётся постоянной — разбег внизу тает ровно с той же скоростью,
 * с какой растёт стопка, и скролл не дёргается от переобсчёта.
 *
 * Значение кладём в CSS-переменную, а не в состояние React: перерисовывать дерево
 * на каждый кадр скролла ради трансформа незачем.
 */
export function useStackProgress(ref: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Пока конверт не раскрылся, стопка обязана быть колодой: прогресс ноль.
    // Случай «человек просил не анимировать» разбирает CSS-медиазапрос,
    // он же выключает и колоду, и обрезку.
    if (!enabled) {
      el.style.setProperty('--stack-progress', '0');
      return;
    }

    let idleTimer = 0;

    const measure = () => {
      // innerHeight бывает нулём (свёрнутая панель, фоновая вкладка) — на нуле
      // вся шкала вырождается и стопка рвётся в раскрытую с первого пикселя.
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (vh === 0) return;
      const styles = getComputedStyle(el);
      const stack = parseFloat(styles.getPropertyValue('--deck-h-stack'));
      const open = parseFloat(styles.getPropertyValue('--deck-h-open'));
      if (!Number.isFinite(stack) || !Number.isFinite(open)) return;

      const topInDocument = el.getBoundingClientRect().top + window.scrollY;
      // Раскрытие начинается, когда верх стопки поднялся к четверти экрана,
      // но не раньше самого верха страницы: колода обязана быть колодой,
      // пока человек ничего не прокрутил.
      const start = Math.max(0, topInDocument - vh * 0.25);
      /*
       * Ход раскрытия не может быть длиннее того, что реально прокручивается.
       * Высота страницы при раскрытии постоянна — разбег внизу тает ровно на
       * столько, на сколько выросла стопка, — поэтому прокрутить можно лишь
       * «высота документа минус экран». Это всегда меньше полного хода на целый
       * экран, и без поправки прогресс упирается в потолок вроде 0.67: нижняя
       * часть каждой карточки остаётся срезанной навсегда, а срезано там как раз
       * название с адресом. Документ по высоте не меняется, так что и поправка
       * от кадра к кадру не плавает.
       */
      const room = document.documentElement.scrollHeight - vh - start;
      const distance = Math.max(1, Math.min(Math.max(vh * 0.4, open - stack), room));
      const progress = Math.min(1, Math.max(0, (window.scrollY - start) / distance));
      el.style.setProperty('--stack-progress', progress.toFixed(4));

      // Пока идёт скролл, у карточек не должно быть переходов — иначе стопка
      // тянется за пальцем с задержкой. Как только скролл затих, переходы
      // возвращаются, и ховер снова анимируется.
      el.dataset.scrolling = '';
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => delete el.dataset.scrolling, 120);
    };

    // Считаем синхронно, без requestAnimationFrame. Кадры не выдаются, когда
    // вкладка в фоне или свёрнута, — и флаг «кадр уже заказан» в такой момент
    // залипает навсегда, а вместе с ним и прогресс. Работы тут на одно чтение
    // геометрии одного элемента, коалесцировать нечего.
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);

    return () => {
      window.clearTimeout(idleTimer);
      delete el.dataset.scrolling;
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [ref, enabled]);
}

/**
 * Карточки лежат друг на друге абсолютно, поэтому их естественные высоты нужно
 * померить: у места с тремя строками заметки карточка выше, чем у места без неё,
 * и раскладывать их фиксированным шагом — значит получить дыры и наезды.
 */
export function useDeckMetrics(ref: RefObject<HTMLElement | null>, count: number): void {
  useEffect(() => {
    const deck = ref.current;
    if (!deck) return;

    const items = () => Array.from(deck.querySelectorAll<HTMLElement>('.deck__item'));

    let idleTimer = 0;

    const measure = () => {
      const cards = items();
      if (cards.length === 0) return;

      const styles = getComputedStyle(deck);
      const gap = parseFloat(styles.getPropertyValue('--deck-gap')) || 0;
      const step = parseFloat(styles.getPropertyValue('--deck-step')) || 0;
      const spine = parseFloat(styles.getPropertyValue('--deck-spine')) || 0;

      let offset = 0;
      for (const card of cards) {
        const height = card.offsetHeight;
        // Полная высота нужна не для раскладки, а для обрезки: в колоде от карточки
        // видно только корешок, и обрезать её надо ровно на разницу.
        card.style.setProperty('--card-h', `${height}px`);
        card.style.setProperty('--open-y', `${offset}px`);
        offset += height + gap;
      }

      const openHeight = Math.max(0, offset - gap);
      const stackHeight = spine + step * (cards.length - 1);
      deck.style.setProperty('--deck-h-open', `${openHeight}px`);
      deck.style.setProperty('--deck-h-stack', `${stackHeight}px`);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(deck);
    items().forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [ref, count]);
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** Пользователь просил не анимировать — стопки нет, сразу читаемый список. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED_MOTION).matches);

  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION);
    const sync = () => setReduced(query.matches);
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return reduced;
}
