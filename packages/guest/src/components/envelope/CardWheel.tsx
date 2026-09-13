import { useCallback, useEffect, useRef } from 'react';
import type { GuestPlace } from '@invite/shared';
import { PlaceCard } from '../PlaceCard.js';
import { usePrefersReducedMotion } from './usePrefersReducedMotion.js';
import type { EnvelopeState } from './Envelope.js';

interface CardWheelProps {
  places: GuestPlace[];
  selected: string | null;
  readOnly: boolean;
  state: EnvelopeState;
  onSelect(id: string): void;
}

/* ========================================================================== *
 * Числа барабана — вариант «Колесо», подобранный на стенде
 * (packages/guest/prototypes/drum). Здесь они уже не ползунки, а константы:
 * стенд был затем, чтобы их выбрать, а выбор — вот этот.
 * ========================================================================== */

/** Градусов на карточку. Меньше 360/n — между гранями просвет, барабан читается
 *  колесом, а не гранёной призмой. */
const STEP = 30;
/** Радиус цилиндра в высотах карточки: на нём соседи расходятся с просветом. */
const RADIUS = 2.45;
/** Перспектива сцены (px). Больше — слабее ракурс, барабан площе и спокойнее. */
const PERSP = 2200;
/** За этим углом карточку не рисуем: она уже отвернулась от зрителя. */
const CULL = 76;
/** Сила затемнения уходящей в глубину грани. */
const SHADE = 0.42;
/** Притяжение центра: у детента барабан идёт медленнее, чем между карточками. */
const WARP = 0.81;
/** Насколько центральная карточка крупнее (доля роста в самом центре). */
const GROW = 0.17;

/**
 * За сколько карточек хода шапка сворачивается до конца. Меньше единицы —
 * заголовок уходит ещё на первом обороте барабана: как только его тронули,
 * верх экрана отдаётся карточкам, а не надписи, которую уже прочитали.
 */
const HERO_SPAN = 0.9;

/**
 * Раздача: сколько идёт раскрытие стопки в барабан.
 *
 * Чуть длиннее такта дымки кучки (--dur-fog 560ms): к её концу перед глазами
 * уже стоит чёткая передняя карта — стопка, — и с этого кадра барабан неспешно
 * распускает соседей веером. Короче — раскрытие смотрится резким; сильно
 * длиннее — стопка висит и тянет. 1.1s держит его плавным, но не вялым.
 */
const DEAL_MS = 1100;

/**
 * Раздача проявляет соседей по мере того, как они расходятся из стопки, а не
 * выкидывает их сразу наложенными на переднюю карту (оттого и казалось, что
 * карточки растут друг из друга). Центральная — верх стопки — видна всегда;
 * сосед подхватывается тем позже, чем он дальше от центра, и к моменту, когда
 * проявился, уже отошёл, а не лезет поверх передней.
 *
 * DEAL_STAGGER — на сколько раздачи откладывается старт проявления каждой
 * карты вглубь; DEAL_RAMP — за какую долю раздачи карта доходит до полной
 * непрозрачности. Подобраны так, чтобы все успели проявиться заметно раньше
 * конца хода — дальше идёт только доводка позы, без запоздалых вспышек.
 */
const DEAL_STAGGER = 0.14;
const DEAL_RAMP = 0.6;

/** Пикселей нативного скролла на одну карточку (мобильный ввод). */
const PX = 150;
/** Мёртвая зона десктопного скраба: дрожь курсора — не жест (px). */
const DEAD_PX = 6;
/** Дальше этого нажатие уже не клик, а протяжка (px). */
const CLICK_SLOP = 8;
/** Пауза бездействия перед доводкой до детента (мс). */
const IDLE_MS = 120;

/** Пружина доводки: частота (жёсткость) и затухание. Затухание чуть ниже
 *  критического — барабан садится на детент с едва заметной отдачей. */
const SNAP_FREQ = 12;
const SNAP_DAMP = 0.9;
/** Дробление кадра для пружины: на длинном кадре явный шаг расходится. */
const SUB_MS = 1000 / 240;
/** Не частим щелчками отдачи чаще, чем раз в столько мс. */
const TICK_GAP = 40;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/*
 * Притяжение центра — варп позиции. Барабан крутят ровно (скролл линеен), а
 * рисуем по искажённой позиции: у детента скорость мала, между карточками
 * велика. Оттого центральная карточка будто вязнет, а соседняя проскакивает.
 * Целые сохраняем нетронутыми — на них стоят детент и снап; дробную тянем по
 * smootherstep (наклон ноль на концах, полтора в середине), силу — долей WARP.
 */
function warpPos(p: number): number {
  const base = Math.floor(p);
  const f = p - base;
  const s = f * f * f * (f * (f * 6 - 15) + 10);
  return base + (f + (s - f) * WARP);
}

/**
 * Кривая раздачи — smootherstep: наклон ноль на обоих концах.
 *
 * Соседи на раздаче не выскакивают наложенными на переднюю, а проявляются по
 * мере расхождения (DEAL_STAGGER / DEAL_RAMP), и передняя карта на экране есть
 * с самого начала — мёртвого такта, из-за которого прежде выбирали ease-out,
 * больше нет. Значит кривой можно вернуть мягкость на обоих концах: барабан
 * трогается без рывка (карты выходят из стопки плавно, а не прыгают) и садится
 * без удара. Ровно то «разъезжались плавно», что и просили.
 */
function easeDeal(k: number): number {
  return k * k * k * (k * (k * 6 - 15) + 10);
}

/**
 * Колесо мест: 3D-цилиндр вместо стопки-колоды.
 *
 * Карточки стоят на поверхности барабана, повёрнутого вокруг горизонтальной оси:
 * центральная — лицом к зрителю и чуть крупнее, соседи уходят вверх и вниз в
 * глубину, темнея по косинусу угла. Крутят барабан руками — свайпом (мобильный
 * нативный скроллер со снапом) или колесом мыши / протяжкой (десктоп), — он
 * доводится до ближайшего детента с вибро-отдачей, тап по центральной карточке
 * выбирает место.
 *
 * Всё положение — одно число `pos` (дробный индекс карточки в центре). Из него
 * paint() каждый кадр пишет карточкам трансформы, минуя состояние React.
 */
export function CardWheel({ places, selected, readOnly, state, onSelect }: CardWheelProps) {
  const count = places.length;
  const dealt = state === 'dealing' || state === 'open';
  const reducedMotion = usePrefersReducedMotion();

  const sceneRef = useRef<HTMLDivElement>(null);
  const drumRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Array<HTMLDivElement | null>>([]);

  const pos = useRef(0);
  const vel = useRef(0);
  /**
   * Раскрытие барабана: 0 — карточки стоят стопкой (все на угле 0, одна поверх
   * другой на переднем плане), 1 — развёрнуты в полный цилиндр. Именно им идёт
   * раздача: контейнер при этом не прыгает, двигается сама геометрия.
   */
  const spread = useRef(0);
  const spreadRaf = useRef(0);
  const raf = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const snapping = useRef(false);
  // Явная цель доводки (клавиатура); null — доводим до ближайшего детента.
  const snapTarget = useRef<number | null>(null);
  const lastFrame = useRef(0);
  const lastDetent = useRef(0);
  const lastTick = useRef(0);
  const audio = useRef<AudioContext | null>(null);

  const focused = selected !== null && places.some((place) => place.id === selected);
  // Ввод активен, только когда карточки розданы и место ещё не выбрано.
  const live = dealt && !reducedMotion && count > 1 && !focused;
  const limit = Math.max(0, count - 1);

  /* --- Отдача на детенте --------------------------------------------------- */

  const click = useCallback(() => {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      if (!audio.current) audio.current = new AC();
      const ctx = audio.current;
      if (ctx.state === 'suspended') void ctx.resume();
      // Короткий щелчок: всплеск шума, срезанный по низу и погашенный за 6 мс.
      const sr = ctx.sampleRate;
      const len = Math.floor(sr * 0.006);
      const buf = ctx.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const k = 1 - i / len;
        d[i] = (Math.random() * 2 - 1) * k * k;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800;
      const g = ctx.createGain();
      g.gain.value = 0.22;
      src.connect(hp).connect(g).connect(ctx.destination);
      src.start();
    } catch {
      /* звук — не то, ради чего стоит падать */
    }
  }, []);

  const detent = useCallback(() => {
    const d = Math.round(pos.current);
    if (d === lastDetent.current) return;
    lastDetent.current = d;
    const now = performance.now();
    if (now - lastTick.current < TICK_GAP) return;
    lastTick.current = now;
    // Вибро есть на Android; на iOS Vibration API нет — там остаётся щелчок.
    if (typeof navigator.vibrate === 'function') navigator.vibrate(8);
    click();
  }, [click]);

  const syncScroller = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const want = Math.round(pos.current * PX);
    if (Math.abs(scroller.scrollTop - want) > 1) scroller.scrollTop = want;
  }, []);

  /* --- Отрисовка ---------------------------------------------------------- */

  const paint = useCallback(() => {
    const drum = drumRef.current;
    if (!drum) return;
    const h = drum.offsetHeight || 1;
    const R = RADIUS * h;
    const wp = warpPos(pos.current);

    /*
     * Шапка над барабаном. Ведёт её одно число --hero: 1 в покое (барабан стоит
     * под заголовком, как в макете), 0 когда его свернули. Считаем из позиции
     * барабана — от того же жеста, что крутит карточки: отдельной прокрутки у
     * шапки нет, она убирается ровно тем движением, которым листают.
     *
     * Пишем на .page, а не на саму сцену: заголовок барабану не потомок, а брат,
     * и общий предок у них — страница.
     */
    const page = sceneRef.current?.closest<HTMLElement>('.page');
    if (page) {
      const hero = clamp(1 - pos.current / HERO_SPAN, 0, 1);
      page.style.setProperty('--hero', hero.toFixed(4));
    }

    // Раскрытие отдаём и в CSS: высота сцены растёт тем же числом, что и угол,
    // поэтому стопка и барабан приходят в свои размеры одним движением.
    const k = spread.current;
    sceneRef.current?.style.setProperty('--spread', k.toFixed(4));

    // Барабан отодвинут назад на свой радиус: передняя грань встаёт ровно в
    // плоскость экрана и рисуется в натуральный размер, а перспектива её не
    // раздувает за края. Радиус после этого меняет только глубину барабана.
    drum.style.transform = `translateZ(${(-R).toFixed(2)}px)`;

    let front = 0;
    let best = Infinity;

    itemsRef.current.forEach((el, i) => {
      if (!el) return;
      /*
       * Расстояние до центра в карточках — оно же порядок перекрытия и признак
       * передней. Считаем его отдельно от угла намеренно: на раздаче угол у всех
       * ноль (карточки лежат стопкой), и по нему ни верхнюю не отличить, ни
       * порядок не выстроить, — а по индексу всё определено на любом раскрытии.
       */
      const dist = Math.abs(wp - i);
      const deg = (wp - i) * STEP * spread.current;
      const abs = Math.abs(deg);

      if (abs > CULL) {
        el.style.visibility = 'hidden';
        el.removeAttribute('data-front');
        return;
      }
      el.style.visibility = 'visible';

      // Рост центральной: near — близость к центру по косинусу (1 в центре, 0 в
      // шаге). scale стоит последним в списке трансформов (первым в локальной
      // системе): карточка растёт в своей плоскости, и лишь потом её выносит R.
      const near = Math.max(0, Math.cos((deg / STEP) * (Math.PI / 2)));
      const scale = 1 + GROW * near;
      el.style.transform = `rotateX(${deg.toFixed(3)}deg) translateZ(${R.toFixed(
        2,
      )}px) scale(${scale.toFixed(4)})`;
      el.style.zIndex = String(Math.round(300 - dist * 10));

      // Затемнение в глубину — из косинуса угла: грань отворачивается от света.
      const cos = Math.cos((deg * Math.PI) / 180);
      const shade = el.querySelector<HTMLElement>('.wheel__shade');
      if (shade) shade.style.opacity = clamp(SHADE * (1 - cos), 0, 0.92).toFixed(3);

      // У самой отсечки гасим прозрачностью, иначе карточка пропала бы щелчком.
      const edge = Math.min(1, (CULL - abs) / 12);
      // Проявление соседей на раздаче: пока барабан раскрывается (spread<1),
      // центральная видна всегда, соседи подхватываются по мере расхождения
      // (см. DEAL_STAGGER / DEAL_RAMP). На покое (spread≈1) множитель — единица.
      let deal = 1;
      if (spread.current < 0.999 && dist >= 0.5) {
        const start = (dist - 0.5) * DEAL_STAGGER;
        const t = clamp((spread.current - start) / DEAL_RAMP, 0, 1);
        // t·t — мягкое проявление: пока сосед расходится и его накренённый край
        // ещё лезет на переднюю карту, он призрачен и читается тенью движения, а
        // не второй картинкой поверх; плотнеет он уже придя почти на своё место.
        deal = t * t;
      }
      el.style.opacity = (edge * deal).toFixed(3);

      if (abs < best) {
        best = abs;
        front = i;
      }
    });

    itemsRef.current.forEach((el, i) => {
      if (!el) return;
      if (i === front && best < STEP / 2 + 0.001) el.setAttribute('data-front', '');
      else el.removeAttribute('data-front');
    });

    detent();
  }, [detent]);

  /* --- Пружина доводки до детента ------------------------------------------ */

  const runFrame = useCallback(
    (now: number) => {
      raf.current = 0;
      const dt = Math.min(now - (lastFrame.current || now), 64);
      lastFrame.current = now;

      if (snapping.current) {
        const target =
          snapTarget.current !== null ? snapTarget.current : clamp(Math.round(pos.current), 0, limit);
        const k = SNAP_FREQ * SNAP_FREQ;
        const c = 2 * SNAP_DAMP * SNAP_FREQ;
        let rest = dt;
        while (rest > 0) {
          const s = Math.min(rest, SUB_MS) / 1000;
          rest -= SUB_MS;
          vel.current += (-k * (pos.current - target) - c * vel.current) * s;
          pos.current += vel.current * s;
        }
        // Защёлка: пружина подходит к цели асимптотически и сама не придёт.
        if (Math.abs(pos.current - target) < 0.001 && Math.abs(vel.current) < 0.01) {
          pos.current = target;
          vel.current = 0;
          snapping.current = false;
          snapTarget.current = null;
          syncScroller();
        }
        paint();
      }

      if (snapping.current) raf.current = requestAnimationFrame(runFrame);
      else lastFrame.current = 0;
    },
    [limit, paint, syncScroller],
  );

  const startSnap = useCallback(() => {
    snapTarget.current = null;
    snapping.current = true;
    if (!raf.current) raf.current = requestAnimationFrame(runFrame);
  }, [runFrame]);

  const scheduleSnap = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(startSnap, IDLE_MS);
  }, [startSnap]);

  const springTo = useCallback(
    (target: number) => {
      snapTarget.current = clamp(target, 0, limit);
      snapping.current = true;
      if (!raf.current) raf.current = requestAnimationFrame(runFrame);
    },
    [limit, runFrame],
  );

  /* --- Сдвиг барабана (с резинкой на краях) -------------------------------- */

  const move = useCallback(
    (delta: number) => {
      const next = pos.current + delta;
      const lo = 0;
      const hi = limit;
      if (next < lo)
        pos.current = pos.current < lo ? pos.current + delta * 0.35 : lo + (next - lo) * 0.35;
      else if (next > hi)
        pos.current = pos.current > hi ? pos.current + delta * 0.35 : hi + (next - hi) * 0.35;
      else pos.current = next;
      vel.current = 0;
      snapping.current = false;
      snapTarget.current = null;
      paint();
      scheduleSnap();
    },
    [limit, paint, scheduleSnap],
  );

  /* --- Выбор: тап по центральной карточке ---------------------------------- */

  const pick = useCallback(() => {
    const raw = clamp(Math.round(pos.current), 0, limit);
    const place = places[raw];
    if (place) onSelect(place.id);
  }, [limit, onSelect, places]);

  /* --- Первая раскладка и реакция на раздачу ------------------------------- */

  useEffect(() => {
    paint();
  }, [count, dealt, reducedMotion, paint]);

  /* --- Раздача: раскрытие стопки в барабан --------------------------------- */

  /*
   * Стопка → цилиндр одним числом `spread` (0 — все карточки на угле 0, одна над
   * другой; 1 — полный барабан). Оно ведёт и угол карточек (в paint), и высоту
   * сцены. Идёт тем же тактом, что рост кучки (--dur-grow в pile.css == DEAL_MS):
   * карточки встают в барабан ровно тем движением, которым кучка дорастает до
   * полного размера, — иначе на экране шли бы двое разных по длительности часов
   * одного события.
   */
  useEffect(() => {
    cancelAnimationFrame(spreadRaf.current);

    // Барабан ещё не роздан — карточки лежат стопкой, ждут раздачи.
    if (!dealt) {
      spread.current = 0;
      paint();
      return;
    }

    // Без анимации барабана нет вовсе (см. wheel.css) — раскрываем разом.
    if (reducedMotion) {
      spread.current = 1;
      paint();
      return;
    }

    const start = performance.now();
    const from = spread.current;
    const frame = (now: number) => {
      const k = clamp((now - start) / DEAL_MS, 0, 1);
      spread.current = from + (1 - from) * easeDeal(k);
      paint();
      if (k < 1) spreadRaf.current = requestAnimationFrame(frame);
    };
    spreadRaf.current = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(spreadRaf.current);
  }, [dealt, reducedMotion, paint]);

  // Выбор извне (или снятие): доводим барабан к выбранной карточке и красим.
  useEffect(() => {
    const idx = places.findIndex((p) => p.id === selected);
    itemsRef.current.forEach((el, i) => {
      if (!el) return;
      if (i === idx) el.setAttribute('data-chosen', '');
      else el.removeAttribute('data-chosen');
    });
    if (idx >= 0 && !reducedMotion) {
      pos.current = idx;
      paint();
      syncScroller();
    }
  }, [selected, places, reducedMotion, paint, syncScroller]);

  /* --- Десктопный ввод: колесо мыши и протяжка ----------------------------- */

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !live) return;

    let down = false;
    let moved = 0;
    let lastY = 0;
    let engaged = false;
    let deadAcc = 0;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? scene.clientHeight : 1;
      move((e.deltaY * unit) / PX);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // тач ведёт нативный скроллер
      down = true;
      moved = 0;
      lastY = e.clientY;
      engaged = false;
      deadAcc = 0;
      scene.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const dy = e.clientY - (lastY || e.clientY);
      lastY = e.clientY;
      if (!dy) return;
      if (down) {
        moved += Math.abs(dy);
        if (moved < CLICK_SLOP) return;
        move(-dy / PX);
        return;
      }
      if (!engaged) {
        deadAcc += Math.abs(dy);
        if (deadAcc < DEAD_PX) return;
        engaged = true;
      }
      move(-dy / PX);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const wasClick = moved < CLICK_SLOP;
      down = false;
      try {
        scene.releasePointerCapture(e.pointerId);
      } catch {
        /* капчур мог не встать — не страшно */
      }
      if (wasClick) pick();
      else scheduleSnap();
    };
    const onLeave = () => {
      engaged = false;
      deadAcc = 0;
      scheduleSnap();
    };

    scene.addEventListener('wheel', onWheel, { passive: false });
    scene.addEventListener('pointerdown', onDown);
    scene.addEventListener('pointermove', onMove);
    scene.addEventListener('pointerup', onUp);
    scene.addEventListener('pointerleave', onLeave);
    return () => {
      scene.removeEventListener('wheel', onWheel);
      scene.removeEventListener('pointerdown', onDown);
      scene.removeEventListener('pointermove', onMove);
      scene.removeEventListener('pointerup', onUp);
      scene.removeEventListener('pointerleave', onLeave);
    };
  }, [live, move, pick, scheduleSnap]);

  /* --- Мобильный ввод: нативный скроллер со снапом -------------------------- */

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !live) return;

    let tapY = 0;
    let tapT = 0;

    const onScroll = () => {
      pos.current = scroller.scrollTop / PX;
      snapping.current = false;
      vel.current = 0;
      paint();
    };
    const onDown = (e: PointerEvent) => {
      tapY = e.clientY;
      tapT = performance.now();
    };
    const onUp = (e: PointerEvent) => {
      if (Math.abs(e.clientY - tapY) < CLICK_SLOP && performance.now() - tapT < 400) pick();
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    scroller.addEventListener('pointerdown', onDown);
    scroller.addEventListener('pointerup', onUp);
    scroller.scrollTop = Math.round(pos.current * PX);
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('pointerdown', onDown);
      scroller.removeEventListener('pointerup', onUp);
    };
  }, [live, paint, pick]);

  /* --- Клавиатура ---------------------------------------------------------- */

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !live) return;
    const onKey = (e: KeyboardEvent) => {
      const at = Math.round(pos.current);
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        springTo(Math.min(limit, at + 1));
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        springTo(Math.max(0, at - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        springTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        springTo(limit);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pick();
      }
    };
    scene.addEventListener('keydown', onKey);
    return () => scene.removeEventListener('keydown', onKey);
  }, [live, limit, pick, springTo]);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      clearTimeout(idleTimer.current);
    },
    [],
  );

  return (
    <div
      className="wheel"
      ref={sceneRef}
      data-dealt={dealt || undefined}
      data-focus={focused || undefined}
      tabIndex={live ? 0 : -1}
      aria-label="Барабан с местами"
      style={{ '--n': Math.max(1, count), '--persp': `${PERSP}px` } as React.CSSProperties}
    >
      {/* Невидимая лента со снап-точками для мобильного ввода: угол считается из
          scrollTop. Инерция, резинка и снап при этом нативные. */}
      <div className="wheel__scroller" ref={scrollerRef} aria-hidden="true">
        <div className="wheel__track">
          {places.map((place) => (
            <div className="wheel__snap" key={place.id} style={{ height: `${PX}px` }} />
          ))}
          <div className="wheel__tail" />
        </div>
      </div>

      <div className="wheel__drum" ref={drumRef}>
        {places.map((place, index) => (
          <div
            className="wheel__item"
            key={place.id}
            data-chosen={selected === place.id || undefined}
            ref={(el) => {
              itemsRef.current[index] = el;
            }}
            style={{ '--i': index } as React.CSSProperties}
          >
            <div className="wheel__card">
              <PlaceCard
                place={place}
                selected={selected === place.id}
                readOnly={readOnly}
                onSelect={onSelect}
              />
              {/* Затемнение уходящей в глубину грани — opacity пишет paint(). */}
              <div className="wheel__shade" aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
