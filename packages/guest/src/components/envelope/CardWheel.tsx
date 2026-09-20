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
 * Стопка: на сколько пикселей вглубь отстоит каждая следующая карточка, пока
 * барабан не раскрылся.
 *
 * Без этого смещения карточки при spread = 0 строго компланарны — один и тот же
 * rotateX(0) translateZ(R), — и внутри preserve-3d движку нечем их разделить:
 * z-index там не работает, сортировка идёт по геометрии. Плоскости конфликтуют, а
 * расходясь, проходят сквозь друг друга — оттого и казалось, что карточки растут
 * одна из другой. Прежде это глушили прозрачностью (соседи выезжали призраками),
 * но пересечение от этого не исчезало, только становилось полупрозрачным.
 *
 * Число не на глаз, а из прогона геометрии. Считаем, где плоскость соседа
 * пересекает плоскость передней карточки, и смотрим, попадает ли эта линия в
 * тело соседа. Критичен ближайший сосед (дальние расходятся быстрее), и самый
 * тесный момент у него — около spread ≈ 0.6. Запас там по STACK_Z:
 *
 *   26px → −3px (всё ещё режутся)   34px → +7px
 *   30px → +3px (впритык)           38px → +11px
 *
 * Берём 38: одиннадцати пикселей хватает, чтобы порог пережил и субпиксельную
 * разницу движков, и небольшую правку RADIUS / STEP / GROW. Платим перспективным
 * сжатием стопки — 1.7% на первом соседе, 4.9% на третьем; в стопке это и
 * читается как стопка, а к середине хода смещение уже наполовину разошлось.
 *
 * Если поедут RADIUS / STEP / GROW — прогнать заново, а не подкручивать на глаз.
 */
const STACK_Z = 38;

/** Пикселей нативного скролла на одну карточку (мобильный ввод). */
const PX = 150;
/** Дальше этого нажатие уже не клик, а протяжка (px). */
const CLICK_SLOP = 8;
/** Пауза бездействия перед доводкой до детента (мс). */
const IDLE_MS = 120;

/**
 * Резинка на краях барабана: докуда он вообще уходит за крайнюю карточку.
 *
 * Полшага — меньше, чем нужно передней карточке, чтобы дойти до отсечки
 * (CULL / STEP ≈ 2.5 карточки). И в этом весь смысл числа: край обязан
 * чувствоваться, но экран при этом не имеет права опустеть.
 *
 * Прежде хода за краем не ограничивало ничто — там лишь гасился шаг (delta
 * * 0.35). На мыши разницы не видно, а вот инерция трекпада приносит одним
 * жестом несколько тысяч пикселей: 0.35·ΔY/PX складывалось в 7–14 карточек за
 * последней, все грани уходили за отсечку, и барабан пропадал с экрана целиком.
 * Вместе со свёрнутой шапкой (--hero → 0) это читалось так, будто страница
 * растянулась и налилась пустотой, — хотя документ ровно с экран и не
 * прокручивается вовсе.
 */
const MAX_OVER = 0.5;

/**
 * Докуда копится сырой (недеформированный) ход за краем.
 *
 * Резинка — функция от полного хода за краем, и без этого потолка длинная
 * инерция намотала бы десяток карточек «долга»: чтобы тронуться обратно, ровно
 * столько же пришлось бы отматывать пальцем впустую. Двух карточек хватает,
 * чтобы резинка дошла до своего предела (0.5·2/(2+0.5) = 0.4 из 0.5), а разворот
 * жеста подхватывался сразу.
 */
const RAW_OVER = 2;

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

/**
 * Резинка: сколько из хода за краем (over ≥ 0) барабан отдаёт движением.
 *
 * В нуле наклон единичный — первые пиксели за краем идут один в один, и стык с
 * обычным ходом не чувствуется; дальше отдача тает, а на бесконечности упирается
 * в max. Насыщение здесь и есть лекарство: гасить шаг постоянным множителем
 * мало — сколько ни гаси, длинный жест всё равно уносит барабан сколь угодно
 * далеко.
 */
function band(over: number, max: number): number {
  return (max * over) / (over + max);
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
 * Соседи на раздаче не выскакивают наложенными на переднюю: они стоят за ней в
 * стопке (STACK_Z) и выезжают из-за неё, а передняя карта на экране есть с
 * самого начала — мёртвого такта, из-за которого прежде выбирали ease-out,
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
 * нативный скроллер со снапом) или прокруткой двумя пальцами / колесом мыши
 * (десктоп), — он доводится до ближайшего детента с вибро-отдачей, тап по
 * центральной карточке выбирает место.
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
  /**
   * Сырой ход барабана — тот, что накрутили руками, без резинки. В пределах
   * [0, limit] он совпадает с pos; за краем расходится с ним (см. move) и копит
   * ровно то, что надо отмотать назад, чтобы вернуться к последней карточке.
   *
   * Живёт отдельной ссылкой, а не считается из pos: резинка необратима на
   * потолке (у разных сырых ходов один и тот же pos), и восстановить по
   * показанной позиции, сколько её натянули, уже нельзя.
   */
  const rawPos = useRef(0);
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
  // Ввод активен, только когда раздача доиграла и место ещё не выбрано. Именно
  // open, а не dealt: на dealt барабан можно было схватить недораздатым, и pos
  // поехал бы одновременно со spread, утащив за собой --hero и посадку барабана.
  const live = state === 'open' && !reducedMotion && count > 1 && !focused;
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
      // Разведение по глубине: на раздаче карточки лежат стопкой (каждая
      // следующая чуть дальше от зрителя), к полному раскрытию смещение сходит в
      // ноль и барабан становится честным цилиндром. Считаем от dist, а не от
      // индекса: на нуле остаётся та карточка, что сейчас впереди, — она и
      // рисуется в натуральную величину.
      const z = R - STACK_Z * (1 - spread.current) * dist;
      el.style.transform = `rotateX(${deg.toFixed(3)}deg) translateZ(${z.toFixed(
        2,
      )}px) scale(${scale.toFixed(4)})`;
      el.style.zIndex = String(Math.round(300 - dist * 10));

      // Затемнение в глубину — из косинуса угла: грань отворачивается от света.
      const cos = Math.cos((deg * Math.PI) / 180);
      const shade = el.querySelector<HTMLElement>('.wheel__shade');
      if (shade) shade.style.opacity = clamp(SHADE * (1 - cos), 0, 0.92).toFixed(3);

      // У самой отсечки гасим прозрачностью, иначе карточка пропала бы щелчком.
      // Больше прозрачность ни за что не отвечает: соседей на раздаче прячет не
      // она, а передняя карточка, за которой они стоят (см. STACK_Z).
      const edge = Math.min(1, (CULL - abs) / 12);
      el.style.opacity = edge.toFixed(3);

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
        // Пружина ведёт барабан к цели внутри пределов — значит натяжения
        // резинки больше нет, и сырой ход обязан идти с позицией вровень.
        // Иначе тик колеса посреди доводки продолжил бы копить с края.
        rawPos.current = pos.current;
        // Защёлка: пружина подходит к цели асимптотически и сама не придёт.
        if (Math.abs(pos.current - target) < 0.001 && Math.abs(vel.current) < 0.01) {
          pos.current = target;
          rawPos.current = target;
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
      // Копим ход как есть — и обрезаем накопление у самого края (RAW_OVER),
      // чтобы разворот жеста подхватывался сразу, а не отматывал набранное.
      rawPos.current = clamp(rawPos.current + delta, -RAW_OVER, limit + RAW_OVER);
      const r = rawPos.current;
      // Показываем ход через резинку: внутри пределов один в один, за краем —
      // с насыщением, и дальше MAX_OVER барабан не уходит ни при каком жесте.
      pos.current =
        r < 0 ? -band(-r, MAX_OVER) : r > limit ? limit + band(r - limit, MAX_OVER) : r;
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

  /** Индекс грани под точкой нажатия — по DOM-цели события. Барабан настоящий:
   *  грани лежат отдельными узлами, и движок попадает по ним честно, с учётом
   *  их ракурса и перекрытий. Гадать по геометрии не нужно. */
  const hitIndex = useCallback((target: EventTarget | null): number => {
    if (!(target instanceof Element)) return -1;
    const item = target.closest<HTMLElement>('.wheel__item');
    if (!item) return -1;
    return itemsRef.current.indexOf(item as HTMLDivElement);
  }, []);

  /**
   * Клик по грани барабана.
   *
   * Выбирает только переднюю карточку — ту, что стоит в центре и крупнее прочих.
   * Клик по любой другой грани не выбирает место, а доворачивает барабан к ней:
   * карточка приезжает в центр, и следующий клик её уже выбирает. Так снимается
   * прежняя неожиданность — раньше нажатие по нижней карточке молча выбирало
   * центральную, потому что выбор всегда шёл по позиции барабана, а не по тому,
   * куда попали. Теперь нажатие всегда отвечает той карточке, по которой попали:
   * либо выбором (она в центре), либо доворотом (она приезжает туда).
   */
  const pickAt = useCallback(
    (index: number) => {
      if (index < 0) return; // мимо карточек — по фону сцены
      const front = clamp(Math.round(pos.current), 0, limit);
      if (index !== front) {
        springTo(index);
        return;
      }
      const place = places[index];
      if (place) onSelect(place.id);
    },
    [limit, onSelect, places, springTo],
  );

  /* --- Первая раскладка и реакция на раздачу ------------------------------- */

  useEffect(() => {
    paint();
  }, [count, dealt, reducedMotion, paint]);

  /* --- Раздача: раскрытие стопки в барабан --------------------------------- */

  /*
   * Стопка → цилиндр одним числом `spread` (0 — все карточки на угле 0, одна над
   * другой; 1 — полный барабан). Оно ведёт и угол карточек (в paint), и высоту
   * сцены барабан больше не ведёт: его посадка держится на --hero, а высоту
   * сцены раздача не трогает вовсе (разбор в .wheel__drum, wheel.css).
   *
   * Такт умышленно длиннее роста кучки (DEAL_MS 1100 против --dur-grow 900):
   * кучка к своему концу уже стоит чёткой картой, а барабан продолжает доводить
   * позу соседей. Состояние open при этом приходит на 1520ms, то есть раньше
   * конца движения, — в ветке колеса это ничего не включает, но закладываться на
   * совпадение этих часов нельзя.
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
      rawPos.current = idx;
      paint();
      syncScroller();
    }
  }, [selected, places, reducedMotion, paint, syncScroller]);

  /* --- Десктопный ввод: прокрутка и протяжка -------------------------------- */

  /*
   * Барабан крутят только заявленным жестом: прокруткой двумя пальцами по
   * тачпаду, колесом мыши или протяжкой с зажатой кнопкой. Просто провести
   * курсором над сценой — не жест.
   *
   * Прежде движение курсора само по себе крутило барабан (был «скраб» с мёртвой
   * зоной в несколько пикселей). На стенде это читалось живо, но в руках выходит
   * иначе: курсор над этой частью экрана бывает и мимоходом — по пути к карточке,
   * при попытке прицелиться, — и барабан уезжал из-под прицела ровно в тот
   * момент, когда в него целятся. Управление без нажатия и без жеста нечем и
   * отменить: единственный способ ничего не сдвинуть — убрать курсор со сцены.
   * Поэтому ховер теперь не двигает ничего, а все три оставшихся входа —
   * намеренные.
   */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !live) return;

    let down = false;
    let moved = 0;
    let lastY = 0;
    // Грань, на которой сомкнулось нажатие. Берём её на pointerdown, а не на
    // pointerup: сцена забирает указатель себе (setPointerCapture), и дальше все
    // события приходят уже от неё — на подъёме по цели карточку не опознать.
    let hit = -1;

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
      hit = hitIndex(e.target);
      scene.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!down || e.pointerType === 'touch') return;
      const dy = e.clientY - lastY;
      lastY = e.clientY;
      if (!dy) return;
      moved += Math.abs(dy);
      if (moved < CLICK_SLOP) return;
      move(-dy / PX);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !down) return;
      const wasClick = moved < CLICK_SLOP;
      down = false;
      try {
        scene.releasePointerCapture(e.pointerId);
      } catch {
        /* капчур мог не встать — не страшно */
      }
      if (wasClick) pickAt(hit);
      else scheduleSnap();
    };

    scene.addEventListener('wheel', onWheel, { passive: false });
    scene.addEventListener('pointerdown', onDown);
    scene.addEventListener('pointermove', onMove);
    scene.addEventListener('pointerup', onUp);
    return () => {
      scene.removeEventListener('wheel', onWheel);
      scene.removeEventListener('pointerdown', onDown);
      scene.removeEventListener('pointermove', onMove);
      scene.removeEventListener('pointerup', onUp);
    };
  }, [live, move, hitIndex, pickAt, scheduleSnap]);

  /* --- Мобильный ввод: нативный скроллер со снапом -------------------------- */

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !live) return;

    let tapY = 0;
    let tapT = 0;

    const onScroll = () => {
      // Позицию здесь ведёт нативный скроллер, и за край он не пускает сам:
      // своя резинка есть у него. Своей нам тут не нужно — но сырой ход держим
      // вровень, чтобы колесо мыши на гибридном устройстве продолжило с того же
      // места, куда барабан довёл палец.
      pos.current = scroller.scrollTop / PX;
      rawPos.current = pos.current;
      snapping.current = false;
      vel.current = 0;
      paint();
    };
    const onDown = (e: PointerEvent) => {
      tapY = e.clientY;
      tapT = performance.now();
    };
    const onUp = (e: PointerEvent) => {
      if (Math.abs(e.clientY - tapY) >= CLICK_SLOP || performance.now() - tapT >= 400) return;
      /*
       * Тап отвечает той карточке, в которую попал палец, — как и клик на
       * десктопе. Цель события тут не спросить: лента ввода лежит поверх всего
       * барабана и собой же и оказывается целью любого тапа. Поэтому берём весь
       * столбик узлов под точкой (elementsFromPoint отдаёт и то, что лежит под
       * лентой) и ищем в нём ближайшую грань.
       */
      const item = document
        .elementsFromPoint(e.clientX, e.clientY)
        .find((el) => el.classList.contains('wheel__item'));
      pickAt(item ? itemsRef.current.indexOf(item as HTMLDivElement) : -1);
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
  }, [live, paint, pickAt]);

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
          {/* Хвост в «экран минус шаг»: ход ленты — ровно limit·PX (см. wheel.css). */}
          <div className="wheel__tail" style={{ height: `calc(100% - ${PX}px)` }} />
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
